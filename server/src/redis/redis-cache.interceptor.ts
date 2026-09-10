import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, lastValueFrom, map } from 'rxjs';
import { RedisService } from './redis.service';

export const REDIS_CACHE_KEY_METADATA = 'redis_cache_key';
export const REDIS_CACHE_TTL_METADATA = 'redis_cache_ttl';
export const REDIS_CACHE_SWR_METADATA = 'redis_cache_swr';

/**
 * Decorator to configure route-level Redis caching.
 * @param ttlSeconds Cache TTL in seconds (default 60s)
 * @param keyPrefix Optional key prefix (defaults to route path)
 * @param swrSeconds Optional stale-while-revalidate window; beyond TTL but within
 *        this window stale entries are served and refreshed in the background.
 */
export const Cacheable = (ttlSeconds = 60, keyPrefix?: string, swrSeconds = 0) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(REDIS_CACHE_TTL_METADATA, ttlSeconds)(target, key, descriptor);
    if (keyPrefix) {
      SetMetadata(REDIS_CACHE_KEY_METADATA, keyPrefix)(target, key, descriptor);
    }
    SetMetadata(REDIS_CACHE_SWR_METADATA, swrSeconds)(target, key, descriptor);
    return descriptor;
  };
};

interface CacheFetchResult {
  fromCache: boolean;
  stale?: boolean;
  payload: unknown;
}

@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  private readonly logger = new Logger(RedisCacheInterceptor.name);

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const http = context.switchToHttp();
    const req = http.getRequest();
    const res = http.getResponse();

    // Only cache GET requests
    if (req.method !== 'GET') {
      return next.handle();
    }

    const ttl =
      this.reflector.get<number>(REDIS_CACHE_TTL_METADATA, context.getHandler()) || 60;
    const swrSeconds =
      this.reflector.get<number>(REDIS_CACHE_SWR_METADATA, context.getHandler()) || 0;
    const customPrefix = this.reflector.get<string>(
      REDIS_CACHE_KEY_METADATA,
      context.getHandler(),
    );

    const cacheKey = this.buildCacheKey(req, customPrefix);
    if (!cacheKey) {
      res.setHeader?.('X-Cache', 'BYPASS');
      return next.handle();
    }

    // R2: single-flight coalesces the FULL fetch (cache read + origin call), so a
    // cache stampede collapses into a single downstream query.
    const run = this.redisService.coalesce<CacheFetchResult>(cacheKey, async () => {
      const envelope = await this.redisService.getCached<any>(cacheKey);

      if (envelope && envelope.payload !== undefined) {
        // R4: version-aware invalidation. If the entry's generation counter does
        // not match the current one, a mutation invalidated this resource after
        // the copy was cached (possibly a racy re-cache). Treat as a miss.
        const currentGeneration = await this.redisService.getGeneration(cacheKey);
        if (
          typeof envelope.generation === 'number' &&
          envelope.generation !== currentGeneration
        ) {
          this.logger.debug(`Cache key ${cacheKey} failed generation validation. Refetching.`);
        } else {
          const ageMs = envelope.cachedAt
            ? Date.now() - new Date(envelope.cachedAt).getTime()
            : 0;

          // R3: stale-while-revalidate — serve stale within the SWR window and
          // refresh in the background so the origin is hit at most once per key.
          if (swrSeconds > 0 && ageMs > ttl * 1000 && ageMs <= swrSeconds * 1000) {
            this.revalidateAsync(cacheKey, next, ttl);
            return { fromCache: true, stale: true, payload: envelope.payload };
          }

          if (ageMs <= ttl * 1000 || swrSeconds === 0) {
            return { fromCache: true, stale: false, payload: envelope.payload };
          }
        }
      }

      // MISS (or invalidated): fetch fresh from the origin.
      const payload = await this.fetchAndCache(cacheKey, next, ttl);
      return { fromCache: false, payload };
    });

    return from(run).pipe(
      map((result) => {
        res.setHeader?.(
          'X-Cache',
          result.fromCache ? (result.stale ? 'STALE' : 'HIT') : 'MISS',
        );
        return result.payload;
      }),
    );
  }

  private async fetchAndCache(
    cacheKey: string,
    next: CallHandler,
    ttl: number,
  ): Promise<unknown> {
    const responseBody = await lastValueFrom(next.handle());
    if (responseBody !== undefined && responseBody !== null) {
      const generation = await this.redisService.getGeneration(cacheKey);
      this.redisService
        .setCached(cacheKey, responseBody, ttl, { generation })
        .catch((err: Error) => {
          this.logger.warn(`Failed to cache response for ${cacheKey}: ${err.message}`);
        });
    }
    return responseBody;
  }

  private revalidateAsync(cacheKey: string, next: CallHandler, ttl: number): void {
    // Coalesce background revalidations per key to avoid N refreshes for N stale reads.
    this.redisService
      .coalesce(`swr:${cacheKey}`, () => this.fetchAndCache(cacheKey, next, ttl))
      .catch((err: Error) => {
        this.logger.warn(`Background SWR revalidation failed for ${cacheKey}: ${err.message}`);
      });
  }

  /**
   * Generates a normalized, cardinality-bounded cache key.
   */
  private buildCacheKey(req: any, customPrefix?: string): string | null {
    const path: string = req.route?.path || req.path || req.url.split('?')[0];

    // Check cardinality & pathological search queries
    const query = req.query || {};
    const queryKeys = Object.keys(query).sort();

    // Bound query parameter lengths to 64 chars
    const serializedParams: string[] = [];
    for (const k of queryKeys) {
      const val = String(query[k]);
      if (val.length > 64 || /[<>{}\\]/.test(val)) {
        // Pathological query: bypass cache to prevent key explosion & pollution
        return null;
      }
      serializedParams.push(`${encodeURIComponent(k)}=${encodeURIComponent(val)}`);
    }

    // Match path params (e.g. :slug)
    const params = req.params || {};
    let resolvedPath = path;
    for (const [paramKey, paramVal] of Object.entries(params)) {
      resolvedPath = resolvedPath.replace(`:${paramKey}`, String(paramVal));
    }

    const prefix = customPrefix || resolvedPath.replace(/^\/api\//, '').replace(/\//g, ':');
    const queryString = serializedParams.length > 0 ? `?${serializedParams.join('&')}` : '';

    return `cms:v1:cache:${prefix}${queryString}`;
  }
}