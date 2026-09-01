# Redis Architecture & Distributed Systems Blueprint: The Gazette CMS Platform

**Document Status**: Production-Frozen Architectural Specification & Distributed Systems Blueprint (v3.2 Final Master)  
**Target Milestone**: Phase 6 Enterprise Scalability & High-Concurrency Resilience  
**Target Workload**: 2,000+ Concurrent Readers / Multi-Replica NestJS Cluster  
**Role of Redis**: Shared Low-Latency Coordination & Acceleration Layer (Explicitly NOT Source of Truth)  
**Author**: Senior Software Engineering & Distributed Systems Architecture  

---

## Table of Contents

1. [Executive Summary & 6-Database System Topology](#1-executive-summary--6-database-system-topology)
2. [Root Problem Statement: Production Bottlenecks & Distributed Failure Modes](#2-root-problem-statement-production-bottlenecks--distributed-failure-modes)
3. [The 8-Pillar Redis Architecture Blueprint](#3-the-8-pillar-redis-architecture-blueprint)
   - [Pillar 1: Version-Aware L2 Response Caching, SWR & Hard Staleness Bounds](#pillar-1-version-aware-l2-response-caching-swr--hard-staleness-bounds)
   - [Pillar 2: Dual-Layer Cluster Signaling with Periodic State Reconciliation](#pillar-2-dual-layer-cluster-signaling-with-periodic-state-reconciliation)
   - [Pillar 3: Distributed Mutex, Fencing Tokens & Switch Versioning](#pillar-3-distributed-mutex-fencing-tokens--switch-versioning)
   - [Pillar 4: Single-Flight Process-Local Request Coalescing](#pillar-4-single-flight-process-local-request-coalescing)
   - [Pillar 5: BullMQ Persistent Queues, Job Versioning & Notification Deduplication](#pillar-5-bullmq-persistent-queues-job-versioning--notification-deduplication)
   - [Pillar 6: High-Volume View Event Streaming & ClickHouse Ingestion](#pillar-6-high-volume-view-event-streaming--clickhouse-ingestion)
   - [Pillar 7: Multi-Tiered Sliding-Window Rate Limiting (Fail-Open vs. Fail-Closed)](#pillar-7-multi-tiered-sliding-window-rate-limiting-fail-open-vs-fail-closed)
   - [Pillar 8: User-Bound Mutation Idempotency & Stuck-PENDING Recovery](#pillar-8-user-bound-mutation-idempotency--stuck-pending-recovery)
4. [High Availability (HA), Replication & Disaster Recovery Topology](#4-high-availability-ha-replication--disaster-recovery-topology)
5. [Failure Modes & Graceful Degradation Matrix (Circuit Breakers)](#5-failure-modes--graceful-degradation-matrix-circuit-breakers)
6. [Security, PII Prohibition & Production Hardening Invariants](#6-security-pii-prohibition--production-hardening-invariants)
7. [Traffic Profiles, Latency Budgets & Performance SLOs](#7-traffic-profiles-latency-budgets--performance-slos)
8. [Admin Operational Governance & Queue Health Alert Thresholds](#8-admin-operational-governance--queue-health-alert-thresholds)
9. [Step-by-Step Implementation Roadmap](#9-step-by-step-implementation-roadmap)

---

## 1. Executive Summary & 6-Database System Topology

The Gazette CMS Platform operates with a **6-Database Persistence Mesh**. In this topology, **Redis is strictly defined as a low-latency acceleration and distributed coordination layer**, never as the authoritative source of truth.

### Authoritative Sources of Truth & 6-Database Roles
- **Primary OLTP Application Stores (Active Switching Targets)**: PostgreSQL & MongoDB (100% schema & feature parity for live traffic routing).
- **Secondary Replicated Stores (Mesh Backfill & Secondary Engines)**: MariaDB, MySQL, and CockroachDB (asynchronous replicated OLTP targets).
- **High-Volume Telemetry & Analytics (OLAP)**: ClickHouse (columnar store for raw pageview events, reading depth, and author metrics).
- **Authentication & User Identity**: PostgreSQL / MongoDB with live database repository verification on protected requests.
- **Media Assets**: AWS S3 / Cloudinary CDN.
- **Transactional Emails**: Resend / AWS SES.
- **Redis (Acceleration & Coordination)**: Ephemeral L2 caching, fast cluster signaling, distributed locks, idempotency verification, and durable BullMQ queues.

```
                              [ INTERNET / TRAFFIC ]
                                         │
                             [ Cloudflare CDN + WAF ]
                                         │
                               [ Load Balancer (ALB) ]
                                         │
                      ┌──────────────────┴──────────────────┐
                      ▼                                     ▼
           [ NestJS Instance A ]                 [ NestJS Instance B ]
                      │                                     │
                      └──────────────────┬──────────────────┘
                                         │
                 ┌───────────────────────┴───────────────────────┐
                 │       REDIS ACCELERATION & COORDINATION       │
                 │ ───────────────────────────────────────────── │
                 │ 1. Version-Aware L2 Cache (SWR + Poison Safe) │
                 │ 2. Single-Flight Process-Local Coalescing     │
                 │ 3. Fast Pub/Sub Signaling + Fencing Locks     │
                 │ 4. Isolated BullMQ Persistent Job Queues      │
                 │ 5. Multi-Tiered Throttling & Idempotency      │
                 └───────────────┬───────────────────────┬───────┘
                                 │                       │
                ┌────────────────┴──────────────┐        │ (View Streams)
                ▼                               ▼        ▼
     [ PRIMARY OLTP STORES ]           [ SECONDARY REPLICAS ]  [ ANALYTICS OLAP ]
    PostgreSQL / MongoDB (Active)     MariaDB, MySQL, Cockroach    ClickHouse
```

---

## 2. Root Problem Statement: Production Bottlenecks & Distributed Failure Modes

| # | Production Challenge | Without Redis (Failure Mode) | With Hardened Redis Architecture |
| :---: | :--- | :--- | :--- |
| **1** | **Connection Pool Saturation (Traffic Spike)** | 2,000 users requesting breaking news execute 2,000 complex SQL `JOIN` queries simultaneously against a 20–50 connection pool, causing 504 timeouts. | Cached in Redis RAM. 1st query hits SQL; subsequent requests return from RAM in **< 1.5ms**. SQL load reduced by 95%. |
| **2** | **Split-Brain Cluster Desynchronization** | Node A switches database to MongoDB in process memory. Node B remains on PostgreSQL. Replicas serve divergent data. | **Dual-layer sync**: Authoritative version state written to database + instant Redis Pub/Sub broadcast across all live nodes (< 2ms) + 30s background reconciliation. |
| **3** | **Distributed Lock Fencing & Lease Expiration** | A node acquires a lock with a 2s TTL, pauses for 3s (GC/network stall), lock expires, another node acquires lock -> concurrent conflicting execution. | **Fencing Tokens**: Monotonically increasing sequence version (`fencingToken`) validated at the authoritative database boundary (`WHERE switch_version < $token`). |
| **4** | **Cache Stampede (Thundering Herd)** | Cache key expires while 500 concurrent requests arrive; all 500 hit PostgreSQL simultaneously. | **Single-Flight Process-Local Coalescing**: In-flight promises are shared in memory; exactly 1 request queries SQL per process while 499 await the shared promise. |
| **5** | **View Counter Write Contention & Data Loss** | Buffering views in Redis memory with naive periodic SQL flush loses view counts if Redis restarts. | **ClickHouse Event Streaming**: Pageview events are streamed through Redis into ClickHouse and aggregated back asynchronously. |
| **6** | **Distributed Rate-Limit Bypasses** | In-memory throttlers reset per container and only track client IP, allowing attackers to rotate IPs or bypass limits via cluster load balancing. | **Multi-Tiered Sliding Window**: Composite rate-limit keys with endpoint-specific fail-open/fail-closed policies. |

---

## 3. The 8-Pillar Redis Architecture Blueprint

### Pillar 1: Version-Aware L2 Response Caching, SWR & Hard Staleness Bounds

#### A. Cache Poisoning & Privacy Invariant
Public article caches MUST NEVER store personalized engagement data.
- **Shared Public Cache (`cms:v1:cache:article:slug:<slug>`)**: Stores exclusively the public editorial payload (`title`, `body`, `authorName`, `coverImage`, `publishedAt`).
- **Personalized State (`/api/articles/:id/engagement-status`)**: Personal state (`hasLiked`, `hasBookmarked`, `isFollowingAuthor`) is fetched separately via private endpoints and is **never written to the shared cache**.

#### B. Cache Key Namespacing & Deployment Migration
Keys incorporate an explicit namespace version (`v1`) to enable zero-downtime schema migrations:
```text
cms:v1:cache:article:slug:<slug>      ──> Public Article Reader payload (TTL: 300s)
cms:v1:cache:article:id:<id>          ──> Public Article metadata summary (TTL: 300s)
cms:v1:cache:feed:home                ──> Homepage Lead & Stories strip (TTL: 60s)
cms:v1:cache:categories:active        ──> Active category taxonomy (TTL: 600s)
cms:v1:cache:user:profile:<userId>    ──> Public author profile summary (TTL: 180s)
```

#### C. Cache Key Cardinality & Search Explosion Protection
To prevent attackers from exhausting memory via arbitrary search queries:
- **Search Key Whitelisting**: Only deterministic query combinations are cached (`q`, `category`, `page`, `limit`).
- **Query Length Limits**: Search queries longer than 64 characters or containing wildcard regexes are **bypassed from cache**.
- **Query Normalization**: Query parameters are alphabetically sorted and lowercased before key generation (`cms:v1:cache:search:cat=tech:page=1:q=ai`).
- **Search TTL**: Short bounded TTL of 30 seconds with a global memory cap.

#### D. SWR Lifecycle & Hard Staleness Window
- **Fresh Window (0s – 60s)**: Cached payload is served immediately.
- **SWR Window (61s – 300s)**: Cached payload is served immediately while an asynchronous background worker triggers revalidation from the database.
- **Hard Staleness Ceiling (> 300s)**: If cache is older than 300s (e.g. background worker failed), stale serving is **prohibited**; the request executes a synchronous origin database query.
- **Publish Warm-Up**: When an article transitions to `PUBLISHED`, a BullMQ job immediately warms the article cache, homepage feed, and category cache before the first reader arrives.

---

### Pillar 2: Dual-Layer Cluster Signaling with Periodic State Reconciliation

Redis Pub/Sub is **ephemeral** (fire-and-forget). If Node C is restarting or experiences a network partition when a database switch event is published, it misses the message.

**The Dual-Layer Solution**:
1. **Authoritative State Record**: The switch mutation updates the `mesh_state_control` table in the database with an incrementing `switchVersion`.
2. **Fast Ephemeral Pub/Sub Signaling**: Redis broadcasts the event across channel `cms:channel:mesh_switch` to all connected nodes in **< 2ms**.
3. **Guaranteed Eventual Convergence (30s Reconciliation Heartbeat)**: Every NestJS node runs a lightweight background heartbeat every 30 seconds querying `mesh_state_control`. If local `currentSwitchVersion < remoteSwitchVersion`, the node reconciles immediately.

---

### Pillar 3: Distributed Mutex, Fencing Tokens & Switch Versioning

To ensure architectural clarity, the design separates the concept of **configuration state** (`switchVersion`) from **mutation execution ownership** (`fencingToken`):
- `switchVersion`: Represents the active database configuration state (e.g. `104` = PostgreSQL, `105` = MongoDB).
- `fencingToken`: Monotonically increasing sequence number guaranteeing that only the current lock holder can execute mutations.

```typescript
async executeWithFencingLock<T>(
  resource: string,
  ttlMs: number,
  task: (fencingToken: number) => Promise<T>,
): Promise<T> {
  const lockId = crypto.randomUUID();
  const acquired = await this.redis.set(`lock:${resource}`, lockId, 'PX', ttlMs, 'NX');

  if (!acquired) {
    throw new ConflictException('Another node is currently modifying this resource. Please retry.');
  }

  // Monotonically incrementing fencing token
  const fencingToken = await this.redis.incr(`fencing_seq:${resource}`);

  try {
    return await task(fencingToken);
  } finally {
    // Atomic release using owner token verification
    const releaseScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;
    await this.redis.eval(releaseScript, 1, `lock:${resource}`, lockId);
  }
}
```

#### Authoritative State Boundary Enforcement
The database switch mutation enforces the fencing token at the SQL boundary:
```sql
UPDATE mesh_state_control 
SET active_engine = $1, switch_version = switch_version + 1, last_fencing_token = $2, updated_at = now()
WHERE last_fencing_token < $2;
```
If an expired lock owner attempts an update with a stale fencing token, the SQL query updates 0 rows, rolls back, and aborts any side effects.

---

### Pillar 4: Single-Flight Process-Local Request Coalescing

In-flight promises are coalesced **process-locally per NestJS instance by design** (avoiding the unnecessary complexity of global distributed promise synchronization):

```
500 Concurrent Readers arrive at Node A for /articles/slug/breaking-news (Cache Miss)
                                │
                                ▼
               [ In-Memory Single-Flight Coalescer ]
                                │
   ┌────────────────────────────┴────────────────────────────┐
   │                                                         │
   ▼ (Request 1)                                             ▼ (Requests 2 to 500)
Queries PostgreSQL (15ms)                                 Attach to Request 1's Promise
Writes result to Redis cache                              Await resolution
Resolves Promise with JSON payload                        Receive identical JSON payload
                                                          (ZERO additional SQL queries on Node A)
```

---

### Pillar 5: BullMQ Persistent Queues, Job Versioning & Notification Deduplication

#### A. Out-of-Order Job Rejection via Entity Versioning
Background jobs carry the entity optimistic concurrency version (`entityVersion`). When a worker executes a job:
```typescript
async processArticleSync(job: Job<{ articleId: string; entityVersion: number }>) {
  const currentArticle = await this.articleRepo.findById(job.data.articleId);
  if (currentArticle && currentArticle.version > job.data.entityVersion) {
    this.logger.warn(`Discarding obsolete job v${job.data.entityVersion} (Current is v${currentArticle.version})`);
    return; // Discard stale mutation
  }
  // Proceed with processing
}
```

#### B. Notification Fan-Out Deduplication Key
To prevent follower fan-out from sending duplicate notifications on worker retries:
- **Deduplication Key**: `dedup:notif:<notificationEventId>:<recipientId>:<eventType>` (TTL: 24h).
- If the key exists in Redis, the notification dispatch is safely skipped.

---

### Pillar 6: High-Volume View Event Streaming & ClickHouse Ingestion

```
[ 2,000 Readers Read Stories ]
               │
               ▼ (POST /api/articles/:id/view)
[ NestJS Ingest Handler ]
Pushes event to Redis Stream `stream:article_views` with deterministic event ID:
`eventId = hash(userId/ip + articleId + hourBucket)`
               │
               ▼
[ Stream Consumer Group Worker (XREADGROUP) ]
Batches 1,000 view events every 5s
Executes bulk INSERT into ClickHouse `article_views_events`
               │
               ▼
[ Hourly Rollup Pipeline ]
Syncs total aggregated view counts to PostgreSQL / MongoDB read models
```

---

### Pillar 7: Multi-Tiered Sliding-Window Rate Limiting (Fail-Open vs. Fail-Closed)

Rate limiting enforces **endpoint-specific failure policies** so an attacker cannot bypass authentication limits by disrupting Redis:

```
+-----------------------------------------------------------------------------------+
|                     RATE LIMITING FAILURE POLICY BY ROUTE TIER                    |
+-----------------------------------------------------------------------------------+
| Route Category         | Endpoint Examples             | Redis Down Policy        |
+------------------------+-------------------------------+--------------------------+
| 1. Public Reads        | GET /articles, GET /categories| FAIL-OPEN (Degraded)     |
| 2. User Interactions   | POST /articles/:id/comment    | Conservative In-Memory   |
| 3. Authentication      | POST /auth/login, /register   | FAIL-CLOSED (or strict 3)|
| 4. Admin Operations    | PATCH /admin/*, DB Switch     | FAIL-CLOSED (503 Service)|
+-----------------------------------------------------------------------------------+
```

#### Trusted Reverse Proxy Client IP Extraction:
`trust proxy` is explicitly configured in Express to extract the true client IP from `X-Forwarded-For` only after verifying upstream Cloudflare / ALB IP ranges.

---

### Pillar 8: User-Bound Mutation Idempotency & Stuck-PENDING Recovery

To prevent key collisions across users and recover from server crashes during execution:

```
Client sends POST /api/articles/123/like with Idempotency-Key: "uuid-abc"
                               │
                               ▼
Composite Key: `SET idempotency:user123:article_like:uuid-abc "PENDING" NX EX 30`
                               │
            ┌──────────────────┴──────────────────┐
            ▼                                     ▼
        Acquired                              Key Exists
(First time processing)             ┌─────────────────────┴─────────────────────┐
Executes like transaction           ▼                                           ▼
Replaces value with result JSON    Status is "PENDING"                  Status is Result JSON
Sets TTL to 24 hours               (In-flight / Crash Recovery)         Returns stored 200 OK
Returns 201 Created                If >30s, PENDING expired -> retry    (0 duplicate writes)
```

---

## 4. High Availability (HA), Replication & Disaster Recovery Topology

### Production Deployment Topology
- **Managed Redis Multi-AZ (AWS ElastiCache / Redis Enterprise)** or **Redis Sentinel (3 Nodes)**:
  - 1 Primary Master (Read/Write)
  - 1 Asynchronous Standby Replica (Automatic failover in < 5 seconds)
  - 1 Sentinel Quorum Node
- **Local Development**: Single Docker container (`redis:7-alpine`).

### Disaster Recovery Drill Procedures

#### Drill 1: BullMQ Queue Recovery on Hard Restart
1. Execute `docker stop redis` while 50 delayed BullMQ jobs are queued.
2. Restart Redis (`docker start redis`).
3. Verify from AOF log that **all 50 queued jobs are restored and executed without data loss**.

#### Drill 2: Complete Cache Loss Recovery
1. Execute `FLUSHDB` on the cache database (DB 0).
2. Verify that client requests gracefully fall back to the origin database (zero 500 errors).
3. Verify that the cache repopulates organically with zero data corruption.

---

## 5. Failure Modes & Graceful Degradation Matrix (Circuit Breakers)

```
+-----------------------------------------------------------------------------------+
|                        CIRCUIT BREAKER & FAILURE POLICY MATRIX                    |
+-----------------------------------------------------------------------------------+
| Component / Dependency  | Failure Behavior    | Degradation Strategy              |
+-------------------------+---------------------+-----------------------------------+
| Redis Cache (GET)       | FAIL-OPEN           | Bypass cache; query DB directly.  |
| Redis Rate Limiting     | TIERED POLICY       | Public = Open; Auth/Admin = Closed|
| Redis DB Switch Lock    | FAIL-CLOSED         | Abort switch; return 503 error.   |
| Redis BullMQ Queue      | BOUNDED DEFER       | Critical = Fail; Non-critical =   |
|                         |                     | Bounded local buffer (max 100).   |
| ClickHouse (Analytics)  | FAIL-DEFERRED       | Buffer view events in Redis stream|
| Resend (Email Provider) | FAIL-RETRY          | BullMQ retries with backoff.      |
+-----------------------------------------------------------------------------------+
```

---

## 6. Security, PII Prohibition & Production Hardening Invariants

```
+-----------------------------------------------------------------------------------+
|                        PRODUCTION REDIS SECURITY CONFIGURATION                    |
+-----------------------------------------------------------------------------------+
| 1. Authentication        | Mandatory `requirepass` with 64-char cryptographically |
|                          | random secret injected via environment variables.      |
| 2. PII / Secret Ban      | STRICTLY PROHIBITED: Passwords, password hashes, JWTs, |
|                          | refresh tokens, and raw credit card data.              |
| 3. Command Disabling     | `rename-command FLUSHALL ""`                           |
|                          | `rename-command FLUSHDB ""`                            |
|                          | `rename-command CONFIG ""`                             |
|                          | `rename-command KEYS ""`                               |
|                          | `rename-command DEBUG ""`                              |
| 4. Memory Eviction       | Logical DB segregation with `volatile-lru` for cache.   |
| 5. Persistence Mode      | Hybrid AOF (`appendonly yes`, `appendfsync everysec`)   |
|                          | + RDB snapshots every 15 minutes.                       |
| 6. Network Isolation     | Private Docker network only; zero public port binding. |
+-----------------------------------------------------------------------------------+
```

---

## 7. Traffic Profiles, Latency Budgets & Performance SLOs

### Traffic Workload Models (2,000 Concurrent Members):
- **Profile A (Distributed Reading)**: 2,000 active users @ 1 req / 10s = **200 Requests / Second (RPS)** across the catalog.
- **Profile B (Viral Breaking Story)**: 80% of traffic (800 RPS) concentrated on 1–3 specific article IDs.

### Service Level Objectives (SLO Targets):

| Measurement Layer | Target Metric (SLO) | Measurement Method |
| :--- | :---: | :--- |
| **Redis Cache GET Latency** | **P95 < 2.0ms** | Redis internal telemetry / OpenTelemetry |
| **NestJS Cache-Hit Processing**| **P95 < 8.0ms** | NestJS execution timer interceptor |
| **End-to-End HTTP Read (Cloudflare -> Client)**| **P95 < 50.0ms** | k6 2,000-VU distributed load test |
| **HTTP 5xx Error Budget** | **0.00% under normal peak** | Automated k6 threshold check |
| **PostgreSQL Pool Utilization** | **< 10% under peak** | PostgreSQL `pg_stat_activity` probe |

---

## 8. Admin Operational Governance & Queue Health Alert Thresholds

```
+-----------------------------------------------------------------------------------+
|                       ADMIN BACKGROUND JOBS & QUEUE CONSOLE                       |
+-----------------------------------------------------------------------------------+
| Queue Name              | Active | Delayed | Completed | Failed | Action          |
+-------------------------+--------+---------+-----------+--------+-----------------+
| scheduled-publishing    |   0    |    3    |    142    |   0    | [Inspect]       |
| mesh-outbox-sync        |   2    |    0    |  1,820    |   1    | [Retry Failed]  |
| transactional-emails    |   0    |    0    |    310    |   0    | [Inspect]       |
+-----------------------------------------------------------------------------------+
```

### Operational Health Alert Thresholds (Prometheus / Sentry):
- **Redis Memory Saturation**: Trigger warning alert at **> 80% RAM utilization**.
- **Dead-Letter Queue (DLQ) Alert**: Trigger alert when **DLQ count > 5 jobs**.
- **Redis Stream Ingestion Lag**: Trigger alert when **unacknowledged stream lag > 1,000 events**.
- **Lock Contention Anomaly**: Trigger alert when **lock wait timeout rate > 2% of attempts**.
- **Cache Hit Ratio Degradation**: Trigger warning alert if **public cache hit ratio drops below 75%**.

---

## 9. Step-by-Step Implementation Roadmap

```
[ STEP 1: Infrastructure ]   ──> Add redis:7-alpine to docker-compose.yml with auth & persistence
             │
             ▼
[ STEP 2: Redis Core ]       ──> Implement RedisModule & RedisService (ioredis) with healthchecks
             │
             ▼
[ STEP 3: L2 Caching & SWR ] ──> Implement Version-Aware CacheInterceptor, single-flight & poison defense
             │
             ▼
[ STEP 4: Mesh Signaling ]   ──> Wire Dual-Layer Pub/Sub, Fencing & 30s Heartbeat in DatabaseSwitcherService
             │
             ▼
[ STEP 5: BullMQ Queues ]    ──> Migrate PublisherWorker to BullMQ with Job Versioning & Notification Dedup
             │
             ▼
[ STEP 6: Idempotency ]      ──> Implement composite IdempotencyGuard with stuck-PENDING timeout
             │
             ▼
[ STEP 7: k6 Load Test ]     ──> Execute 2,000-VU traffic profiles measuring P95/P99 latency budgets
```

---

*Architectural specification frozen under `redis_implementation.md` and `document_2/redis_implementation.md`.*
