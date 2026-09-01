import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { EnvConfig } from '../../config/env.schema';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly config: ConfigService<EnvConfig, true>,
    private readonly redisService: RedisService,
  ) {}

  getStatus() {
    return {
      status: 'ok',
      phase: 'foundation',
      timestamp: new Date().toISOString(),
      environment: this.config.get('NODE_ENV', { infer: true }) || 'development',
      activeDatabase:
        (process.env.ACTIVE_DATABASE as any) ||
        this.config.get('ACTIVE_DATABASE', { infer: true }) ||
        'postgres',
      redisStatus: this.redisService.isHealthy() ? 'healthy' : 'degraded',
    };
  }

  async getRedisStats() {
    const isHealthy = this.redisService.isHealthy();
    const client = this.redisService.getClient();
    let pingLatencyMs = 0;
    let keysCount = 0;
    let memoryUsed = '0 KB';
    let uptimeSeconds = 0;

    if (isHealthy && client) {
      const start = Date.now();
      await client.ping().catch(() => {});
      pingLatencyMs = Math.max(1, Date.now() - start);

      try {
        const keys = await client.keys('cms:v1:cache:*');
        keysCount = keys.length;
        const memInfo = await client.info('memory');
        const match = memInfo.match(/used_memory_human:(.*)/);
        if (match) {
          memoryUsed = match[1].trim();
        }
        const serverInfo = await client.info('server');
        const uptimeMatch = serverInfo.match(/uptime_in_seconds:(.*)/);
        if (uptimeMatch) {
          uptimeSeconds = parseInt(uptimeMatch[1].trim(), 10);
        }
      } catch {}
    }

    return {
      status: isHealthy ? 'healthy' : 'degraded',
      host: 'localhost',
      port: 6379,
      pingLatencyMs,
      cachedKeysCount: keysCount,
      memoryUsed,
      uptimeSeconds,
      evictionPolicy: 'volatile-lru (512MB)',
      pubSubChannels: ['cms:channel:mesh_switch'],
      timestamp: new Date().toISOString(),
    };
  }

  async purgeRedisCache() {
    const client = this.redisService.getClient();
    let purged = 0;
    if (client && this.redisService.isHealthy()) {
      try {
        const keys = await client.keys('cms:v1:cache:*');
        if (keys.length > 0) {
          await client.del(...keys);
          purged = keys.length;
        }
      } catch {}
    }
    return {
      success: true,
      purgedKeys: purged,
      timestamp: new Date().toISOString(),
    };
  }
}
