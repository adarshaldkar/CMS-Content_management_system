# Redis Architecture & High-Concurrency Integration Plan

Implement the Production-Frozen v3.2 Redis architecture for The Gazette CMS, introducing low-latency response caching, single-flight request coalescing, dual-layer multi-node mesh signaling, fencing locks, and mutation idempotency.

## User Review Required

> [!IMPORTANT]
> - A new `redis:7-alpine` service will be added to `docker-compose.yml` on port `6379`.
> - All cache operations are **fail-open** (gracefully bypassing to PostgreSQL / MongoDB if Redis is offline).
> - Critical distributed operations (Database Switching) are **fail-closed** to prevent split-brain state desynchronization.
> - Public caches store strictly sanitized editorial payloads without user-specific engagement tokens to prevent cache poisoning.

---

## Proposed Changes

### Infrastructure & Configuration

#### [MODIFY] [docker-compose.yml](file:///c:/Users/shrut/Desktop/CMS%20Project/docker-compose.yml)
- Add `redis:7-alpine` service with volume persistence, health checks, and password authentication.

#### [MODIFY] [server/.env.example](file:///c:/Users/shrut/Desktop/CMS%20Project/server/.env.example)
- Add `REDIS_HOST=localhost`, `REDIS_PORT=6379`, `REDIS_PASSWORD=cms_dev_password`, and `REDIS_DB=0`.

#### [MODIFY] [server/package.json](file:///c:/Users/shrut/Desktop/CMS%20Project/server/package.json)
- Add `ioredis` and `@types/ioredis` dependencies.

#### [MODIFY] [server/src/config/app-config.module.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/config/app-config.module.ts)
- Add Redis configuration schema validation via Zod.

---

### Core Redis Module & Services

#### [NEW] [server/src/redis/redis.module.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/redis/redis.module.ts)
- Global NestJS dynamic module providing `RedisService` and connection lifecycle management.

#### [NEW] [server/src/redis/redis.service.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/redis/redis.service.ts)
- Main Redis interface featuring:
  - Resilient `ioredis` client pool with retry backoff and circuit-breaker status.
  - Dedicated Pub/Sub subscriber client.
  - Version-tagged L2 cache envelope (`entityVersion`, `activeEngine`, `cachedAt`, `payload`).
  - SWR (Stale-While-Revalidate) with hard staleness ceilings (> 300s).
  - Single-Flight process-local Promise coalescing.
  - Fencing token generation and atomic lock release via Lua.
  - User-bound idempotency keys with stuck-`PENDING` lease recovery (30s timeout).

#### [NEW] [server/src/redis/redis-cache.interceptor.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/redis/redis-cache.interceptor.ts)
- NestJS route-level caching interceptor with search query cardinality bounds and public cache sanitization.

#### [NEW] [server/src/redis/idempotency.guard.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/redis/idempotency.guard.ts)
- Mutation guard checking `Idempotency-Key` headers on POST/PATCH endpoints.

---

### Database Mesh & Controller Integrations

#### [MODIFY] [server/src/database/database-switcher.service.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/database/database-switcher.service.ts)
- Integrate Redis Pub/Sub: broadcast `cms:channel:mesh_switch` on switch mutations.
- Subscribe to mesh switch events on boot with 30s background state reconciliation.
- Enforce fencing token locks during switch transactions.

#### [MODIFY] [server/src/modules/articles/articles.controller.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/articles/articles.controller.ts)
- Attach `RedisCacheInterceptor` to `GET /articles/slug/:slug` and `GET /articles`.
- Add deterministic cache invalidation on status change and updates.

#### [MODIFY] [server/src/modules/categories/categories.controller.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/categories/categories.controller.ts)
- Attach `RedisCacheInterceptor` to `GET /categories` with 600s TTL.

---

## Verification Plan

### Automated Unit & Regression Tests
- Add `server/src/redis/redis.service.spec.ts` testing:
  - Cache set/get/del and version-aware rejection.
  - Single-flight request coalescing (verifying only 1 DB call on concurrent misses).
  - Fencing token generation and lock release.
  - Idempotency key tracking and stuck-`PENDING` timeout recovery.
  - Fail-open behavior when Redis connection throws.
- Run `npx jest --silent` across all test suites.

### Integration & Concurrency Verification
- Start Redis container via `docker compose up -d redis`.
- Validate sub-millisecond cache hits on `GET /api/articles/slug/:slug`.
- Test multi-node switch signaling via Redis Pub/Sub.
- Validate build integrity: `npm run build` on both client and server.
