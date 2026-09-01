import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, from, of } from 'rxjs';
import { switchMap, tap } from 'rxjs/operators';
import { RedisService } from './redis.service';

export const REDIS_CACHE_KEY_METADATA = 'redis_cache_key';
export const REDIS_CACHE_TTL_METADATA = 'redis_cache_ttl';

/**
 * Decorator to configure route-level Redis caching.
 * @param ttlSeconds Cache TTL in seconds (default 60s)
 * @param keyPrefix Optional key prefix (defaults to route path)
 */
export const Cacheable = (ttlSeconds = 60, keyPrefix?: string) => {
  return (target: any, key: string, descriptor: PropertyDescriptor) => {
    SetMetadata(REDIS_CACHE_TTL_METADATA, ttlSeconds)(target, key, descriptor);
    if (keyPrefix) {
      SetMetadata(REDIS_CACHE_KEY_METADATA, keyPrefix)(target, key, descriptor);
    }
    return descriptor;
  };
};

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
    const customPrefix = this.reflector.get<string>(
      REDIS_CACHE_KEY_METADATA,
      context.getHandler(),
    );

    const cacheKey = this.buildCacheKey(req, customPrefix);
    if (!cacheKey) {
      res.setHeader?.('X-Cache', 'BYPASS');
      return next.handle();
    }

    return from(
      this.redisService.coalesce(cacheKey, async () => {
        // 1. Try to read from Redis
        const cached = await this.redisService.getCached<any>(cacheKey);
        if (cached && cached.payload !== undefined) {
          return { fromCache: true, payload: cached.payload };
        }
        return { fromCache: false, payload: null };
      }),
    ).pipe(
      switchMap((result) => {
        if (result.fromCache) {
          res.setHeader?.('X-Cache', 'HIT');
          return of(result.payload);
        }

        res.setHeader?.('X-Cache', 'MISS');
        return next.handle().pipe(
          tap((responseBody) => {
            if (responseBody !== undefined && responseBody !== null) {
              this.redisService
                .setCached(cacheKey, responseBody, ttl)
                .catch((err) => {
                  this.logger.warn(`Failed to cache response for ${cacheKey}: ${err.message}`);
                });
            }
          }),
        );
      }),
    );
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
