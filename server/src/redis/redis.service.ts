import { Injectable, Logger, OnApplicationShutdown, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis, { RedisOptions } from 'ioredis';

export interface CacheEnvelope<T> {
  entityVersion?: number;
  activeEngine?: string;
  generation?: number;
  cachedAt: string;
  payload: T;
}

export interface FencingLockResult {
  lockId: string;
  fencingToken: number;
}

@Injectable()
export class RedisService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(RedisService.name);
  private client: Redis | null = null;
  private subscriberClient: Redis | null = null;
  private isAvailable = false;

  // Single-flight in-memory promise map for request coalescing
  private readonly inFlightPromises = new Map<string, Promise<unknown>>();

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD', '');
    const db = this.configService.get<number>('REDIS_DB', 0);

    const isTls = host.includes('upstash.io') || this.configService.get<string>('REDIS_TLS') === 'true';

    const redisOptions: RedisOptions = {
      host,
      port,
      password: password || undefined,
      db,
      tls: isTls ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => {
        if (times > 5) {
          this.logger.warn(`Redis retry limit reached (${times} attempts). Degrading to fail-open mode.`);
          return null; // Stop retrying; fail-open
        }
        return Math.min(times * 200, 2000);
      },
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        if (err.message.includes(targetError)) {
          return true;
        }
        return false;
      },
    };

    try {
      this.client = new Redis(redisOptions);
      this.subscriberClient = new Redis({ ...redisOptions, lazyConnect: true });

      this.client.on('connect', () => {
        this.isAvailable = true;
        this.logger.log(`Redis connected successfully to ${host}:${port} [DB ${db}]`);
      });

      this.client.on('error', (err) => {
        this.isAvailable = false;
        this.logger.warn(`Redis client error: ${err.message}. Operating in degraded fail-open mode.`);
      });

      this.subscriberClient.on('error', (err) => {
        this.logger.warn(`Redis subscriber client error: ${err.message}`);
      });

      await this.client.connect().catch((err) => {
        this.logger.warn(`Redis initial connection failed: ${err.message}. App will run in degraded mode.`);
      });

      await this.subscriberClient.connect().catch((err) => {
        this.logger.warn(`Redis subscriber initial connection failed: ${err.message}`);
      });
    } catch (err: any) {
      this.isAvailable = false;
      this.logger.warn(`Failed to initialize RedisModule: ${err.message}. Continuing with cache fail-open.`);
    }
  }

  async onApplicationShutdown(): Promise<void> {
    if (this.client) {
      await this.client.quit().catch(() => {});
    }
    if (this.subscriberClient) {
      await this.subscriberClient.quit().catch(() => {});
    }
  }

  isHealthy(): boolean {
    return this.isAvailable && this.client?.status === 'ready';
  }

  getClient(): Redis | null {
    return this.client;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     1. Version-Aware L2 Response Caching
  ────────────────────────────────────────────────────────────────────────── */

  async getCached<T>(key: string): Promise<CacheEnvelope<T> | null> {
    if (!this.isHealthy() || !this.client) return null;

    try {
      const data = await this.client.get(key);
      if (!data) return null;

      const envelope = JSON.parse(data) as CacheEnvelope<T>;

      // Hard staleness ceiling check: If cached older than 300 seconds, discard
      if (envelope.cachedAt) {
        const ageMs = Date.now() - new Date(envelope.cachedAt).getTime();
        if (ageMs > 300 * 1000) {
          this.logger.debug(`Cached key ${key} exceeded hard staleness window (${ageMs}ms). Discarding.`);
          return null;
        }
      }

      return envelope;
    } catch (err: any) {
      this.logger.warn(`Redis getCached error for key ${key}: ${err.message}`);
      return null; // Fail-open
    }
  }

  async setCached<T>(
    key: string,
    payload: T,
    ttlSeconds: number,
    metadata?: { entityVersion?: number; activeEngine?: string; generation?: number },
  ): Promise<void> {
    if (!this.isHealthy() || !this.client) return;

    try {
      const envelope: CacheEnvelope<T> = {
        entityVersion: metadata?.entityVersion,
        activeEngine: metadata?.activeEngine,
        generation: metadata?.generation,
        cachedAt: new Date().toISOString(),
        payload,
      };

      await this.client.set(key, JSON.stringify(envelope), 'EX', ttlSeconds);
    } catch (err: any) {
      this.logger.warn(`Redis setCached error for key ${key}: ${err.message}`);
    }
  }

  /** Derives the generation counter key for a cache key, ignoring any query string. */
  private generationKeyFor(cacheKey: string): string {
    const base = cacheKey.split('?')[0].replace(/^cms:v1:cache:/, '');
    return `cms:v1:gen:${base}`;
  }

  /**
   * Returns the current generation counter for a cache key. Read side of
   * version-aware invalidation: an envelope whose `generation` differs is stale.
   */
  async getGeneration(cacheKey: string): Promise<number> {
    if (!this.isHealthy() || !this.client) return 0;
    try {
      const raw = await this.client.get(this.generationKeyFor(cacheKey));
      const n = parseInt(raw || '0', 10);
      return Number.isFinite(n) && n > 0 ? n : 0;
    } catch (err: any) {
      this.logger.warn(`Redis getGeneration error for key ${cacheKey}: ${err.message}`);
      return 0;
    }
  }

  /**
   * Bumps the generation counters for the given cache keys. Called when entries
   * are invalidated so that any concurrently re-cached stale copy is discarded.
   */
  private async bumpGenerations(...cacheKeys: string[]): Promise<void> {
    if (!this.isHealthy() || !this.client || cacheKeys.length === 0) return;
    try {
      const uniqueKeys = [...new Set(cacheKeys.map((k) => this.generationKeyFor(k)))];
      for (const genKey of uniqueKeys) {
        await this.client.incr(genKey);
      }
    } catch (err: any) {
      this.logger.warn(`Redis bumpGenerations error: ${err.message}`);
    }
  }

  async delCached(...keys: string[]): Promise<void> {
    if (!this.isHealthy() || !this.client || keys.length === 0) return;

    try {
      await this.client.del(...keys);
      await this.bumpGenerations(...keys);
    } catch (err: any) {
      this.logger.warn(`Redis delCached error: ${err.message}`);
    }
  }

  /**
   * Deletes every key matching a glob pattern using a non-blocking SCAN.
   * `DEL` does not support wildcards, so a cursor-based scan is required to
   * reliably invalidate namespaced cache entries (e.g. all paginated lists).
   * Generation counters for the matched keys are bumped afterwards.
   */
  async delByPattern(pattern: string): Promise<number> {
    if (!this.isHealthy() || !this.client) return 0;

    let deleted = 0;
    const matched: string[] = [];
    let cursor = '0';
    try {
      do {
        const [nextCursor, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        cursor = nextCursor;
        if (keys.length > 0) {
          matched.push(...keys);
          deleted += await this.client.del(...keys);
        }
      } while (cursor !== '0');

      if (matched.length > 0) {
        await this.bumpGenerations(...matched);
      }
    } catch (err: any) {
      this.logger.warn(`Redis delByPattern error (${pattern}): ${err.message}`);
    }
    return deleted;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     2. Process-Local Single-Flight Request Coalescing
  ────────────────────────────────────────────────────────────────────────── */

  async coalesce<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    const existingPromise = this.inFlightPromises.get(key);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }

    const promise = (async () => {
      try {
        return await fetcher();
      } finally {
        this.inFlightPromises.delete(key);
      }
    })();

    this.inFlightPromises.set(key, promise);
    return promise;
  }

  /* ──────────────────────────────────────────────────────────────────────────
     3. Distributed Mutex with Fencing Tokens
  ────────────────────────────────────────────────────────────────────────── */

  async acquireFencingLock(resource: string, ttlMs: number): Promise<FencingLockResult | null> {
    if (!this.isHealthy() || !this.client) return null;

    const lockId = `lock-owner-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const lockKey = `lock:${resource}`;
    const seqKey = `fencing_seq:${resource}`;

    try {
      const acquired = await this.client.set(lockKey, lockId, 'PX', ttlMs, 'NX');
      if (!acquired) {
        return null;
      }

      const fencingToken = await this.client.incr(seqKey);
      return { lockId, fencingToken };
    } catch (err: any) {
      this.logger.warn(`acquireFencingLock failed: ${err.message}`);
      return null;
    }
  }

  async releaseFencingLock(resource: string, lockId: string): Promise<boolean> {
    if (!this.isHealthy() || !this.client) return false;

    const lockKey = `lock:${resource}`;
    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await this.client.eval(luaScript, 1, lockKey, lockId);
      return result === 1;
    } catch (err: any) {
      this.logger.warn(`releaseFencingLock failed: ${err.message}`);
      return false;
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     4. Dual-Layer Pub/Sub Signaling
  ────────────────────────────────────────────────────────────────────────── */

  async publish(channel: string, message: unknown): Promise<number> {
    if (!this.isHealthy() || !this.client) return 0;

    try {
      const payload = typeof message === 'string' ? message : JSON.stringify(message);
      return await this.client.publish(channel, payload);
    } catch (err: any) {
      this.logger.warn(`Redis publish failed on channel ${channel}: ${err.message}`);
      return 0;
    }
  }

  async subscribe(channel: string, callback: (message: string) => void): Promise<() => void> {
    if (!this.subscriberClient) return () => {};

    try {
      await this.subscriberClient.subscribe(channel);
      const listener = (chan: string, msg: string) => {
        if (chan === channel) {
          callback(msg);
        }
      };
      this.subscriberClient.on('message', listener);
      return () => {
        this.subscriberClient?.off('message', listener);
        this.subscriberClient?.unsubscribe(channel).catch(() => {});
      };
    } catch (err: any) {
      this.logger.warn(`Redis subscribe failed on channel ${channel}: ${err.message}`);
      return () => {};
    }
  }

  /* ──────────────────────────────────────────────────────────────────────────
     5. User-Bound Mutation Idempotency
  ────────────────────────────────────────────────────────────────────────── */

  async checkAndSetIdempotency(
    userId: string,
    operation: string,
    clientKey: string,
    inFlightTtlSeconds = 30,
  ): Promise<{ status: 'ACQUIRED' | 'PENDING' | 'COMPLETED'; result?: any }> {
    if (!this.isHealthy() || !this.client) {
      // Fail-closed: with Redis unavailable we cannot prove this request is a
      // duplicate AND we cannot deduplicate concurrent writes. Reject with
      // PENDING so the caller aborts instead of risking duplicate mutations.
      this.logger.warn('Idempotency unavailable (Redis down). Failing closed to prevent duplicate writes.');
      return { status: 'PENDING' };
    }

    const compositeKey = `idempotency:${userId}:${operation}:${clientKey}`;

    try {
      const existing = await this.client.get(compositeKey);
      if (existing) {
        if (existing === 'PENDING') {
          return { status: 'PENDING' };
        }
        return { status: 'COMPLETED', result: JSON.parse(existing) };
      }

      // Set PENDING with short timeout to prevent deadlock on crashes
      const acquired = await this.client.set(compositeKey, 'PENDING', 'EX', inFlightTtlSeconds, 'NX');
      if (!acquired) {
        return { status: 'PENDING' };
      }

      return { status: 'ACQUIRED' };
    } catch (err: any) {
      this.logger.warn(`Idempotency check failed, failing closed: ${err.message}`);
      return { status: 'PENDING' };
    }
  }

  async saveIdempotencyResult(
    userId: string,
    operation: string,
    clientKey: string,
    result: any,
    retentionSeconds = 86400,
  ): Promise<void> {
    if (!this.isHealthy() || !this.client) return;

    const compositeKey = `idempotency:${userId}:${operation}:${clientKey}`;
    try {
      await this.client.set(compositeKey, JSON.stringify(result), 'EX', retentionSeconds);
    } catch (err: any) {
      this.logger.warn(`saveIdempotencyResult failed: ${err.message}`);
    }
  }
}
