import { Global, Module } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisCacheInterceptor } from './redis-cache.interceptor';
import { IdempotencyGuard } from './idempotency.guard';

@Global()
@Module({
  providers: [RedisService, RedisCacheInterceptor, IdempotencyGuard],
  exports: [RedisService, RedisCacheInterceptor, IdempotencyGuard],
})
export class RedisModule {}
