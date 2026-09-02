# The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture

**Document Status**: Production-Frozen Specification (v2.0)  
**Date**: September 2, 2026  
**Target Systems**: NestJS Backend, BullMQ v5, Redis 7 (Isolated Queue Database), PostgreSQL / MongoDB, React Admin Governance Console  
**Audience**: Backend Engineers, Platform Architects, DevOps Engineers, System Operators  

---

## 1. Executive Summary & Architecture Rationale

In a distributed, multi-instance content management platform, long-running, scheduled, or failure-prone background tasks must not run inside ephemeral in-process timers (such as Node.js `setInterval` or `setTimeout`).

### Problems Solved by BullMQ

1. **Split-Brain & Duplicate Executions in Clustered Deployments**:
   - In a multi-replica setup (Server A + Server B behind a load balancer), using `setInterval` causes both instances to query and attempt publishing the same scheduled story simultaneously, risking duplicate audit logs and conflicting state transitions.
2. **Crash & Restart Resilience**:
   - In-memory timers lose all pending tasks if the server restarts or undergoes zero-downtime rolling deployments. BullMQ persists all scheduled, active, and failed jobs in Redis data structures (Streams, Sorted Sets, Hashes).
3. **Graceful Retries & Dead-Letter Isolation (DLQ)**:
   - Network timeouts to third-party services (Web Push endpoints, transactional email providers) or secondary database replicas must not block primary user requests. BullMQ provides deterministic exponential backoff and isolates permanently failed tasks into a Dead-Letter Queue (DLQ).
4. **Operational Governance & Diagnostics**:
   - Administrators and platform operators need complete real-time visibility into queue backlogs, failed jobs, execution latencies, sanitized error stack traces, and the ability to trigger bulk or single-job retries with a single click.

---

## 2. Queue Topology & Workload Isolation

To prevent high-volume asynchronous tasks (e.g. 5,000 notification dispatches) from starving time-critical editorial tasks (e.g. releasing a breaking news story at an exact timestamp), BullMQ workloads are partitioned across dedicated queues:

```
+-------------------------------------------------------------------------------+
|                             BULLMQ QUEUE TOPOLOGY                             |
+-------------------------------------------------------------------------------+
|                                                                               |
|  1. [scheduled-publishing] (High Priority / Low Volume)                      |
|     - Delayed jobs for scheduled articles and automated slot promotions.     |
|     - Concurrency: 5 workers | Max Retries: 3 | Backoff: Exponential (5s)     |
|                                                                               |
|  2. [notification-outbox] (Medium Priority / High Volume)                     |
|     - In-app notification creation, Web Push API calls, email dispatches.    |
|     - Concurrency: 20 workers | Max Retries: 5 | Backoff: Exponential (2s)    |
|                                                                               |
|  3. [mesh-reconciliation] (Background Priority / Medium Volume)               |
|     - Secondary write replays for MariaDB, MySQL, and CockroachDB.           |
|     - Concurrency: 10 workers | Max Retries: 10 | Backoff: Exponential (10s)  |
|                                                                               |
|  4. [analytics-rollup] (Low Priority / Periodic)                              |
|     - Periodic aggregation and rollups for ClickHouse columnar views.         |
|     - Concurrency: 2 workers | Max Retries: 3 | Backoff: Fixed (30s)          |
|                                                                               |
+-------------------------------------------------------------------------------+
```

### 2.1 Architectural Asymmetry Note (ClickHouse vs Relational Replicas)

- **Relational Secondary Replicas** (`MariaDB`, `MySQL`, `CockroachDB`):
  - Handled via `mesh-reconciliation` queue for transactional statement/mutation replay.
- **ClickHouse (Columnar Analytics Store)**:
  - Not treated as a relational replica. Raw view and interaction events stream directly through `Redis Stream` (`cms:stream:article_views`) to ClickHouse batch ingestion workers. The `analytics-rollup` queue only manages periodic rollup aggregations and trend calculation jobs.

---

## 3. Queue Details & Job Payloads

### 3.1 `scheduled-publishing` Queue

- **Purpose**: Releases manuscripts when their scheduled timestamp arrives.
- **Job Name**: `publish-scheduled-article`
- **Job ID**: `job:publish:${articleId}:${version}` (Deterministic ID prevents duplicate enqueuing)
- **Delay**: `Math.max(0, targetTime.getTime() - Date.now())`
- **Payload Schema**:
  ```typescript
  export interface ScheduledPublishJobPayload {
    articleId: string;
    version: number;
    scheduledAt: string;
    publishingSlotId?: string | null;
    enqueuedByUserId: string;
    enqueuedAt: string;
  }
  ```
- **Execution Logic**:
  1. Worker fetches the article from the authoritative database.
  2. Validates that current status is `ContentStatus.SCHEDULED` and version matches the job payload.
  3. Transitions status to `ContentStatus.PUBLISHED`, sets `publishedAt = new Date()`, and records an audit log.
  4. Dispatches an author notification via `NotificationsService`.
  5. Purges L2 cache entries (`cache:article:*`).

### 3.2 `notification-outbox` Queue

- **Purpose**: Processes asynchronous notifications and browser Web Push deliveries.
- **Job Name**: `dispatch-notification`
- **Job ID**: `job:notif:${recipientId}:${type}:${resourceId}:${actorId || 'system'}`
- **Payload Schema**:
  ```typescript
  export interface NotificationJobPayload {
    userId: string;
    actorId?: string | null;
    actorName: string;
    actorAvatar?: string | null;
    type: NotificationType;
    title: string;
    message: string;
    resourceType: 'article' | 'comment' | 'user' | 'system';
    resourceId: string;
    resourceSlug?: string | null;
    groupKey?: string | null;
    channels: {
      inApp: boolean;
      email: boolean;
      browserPush: boolean;
    };
  }
  ```

### 3.3 `mesh-reconciliation` Queue

- **Purpose**: Retries secondary database replication writes that timed out during the primary transaction.
- **Job Name**: `replay-secondary-write`
- **Payload Schema**:
  ```typescript
  export interface MeshReconciliationJobPayload {
    outboxId: string;
    targetEngine: 'mariadb' | 'mysql' | 'cockroach';
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    tableName: string;
    primaryKey: string;
    data: Record<string, any>;
    attemptNumber: number;
  }
  ```

---

## 4. Job State Machine, Idempotency & Worker Crash Recovery

Each job moves through the strict BullMQ lifecycle:

```
                      +-------------------+
                      |      WAITING      |
                      +---------+---------+
                                |
             (Delay specified)  |  (Worker pulls job)
        +-----------------------+-----------------------+
        |                                               |
        v                                               v
+---------------+                               +---------------+
|    DELAYED    |                               |    ACTIVE     |
+-------+-------+                               +-------+-------+
        | (Delay expires)                               |
        +-----------------------------------------------+
                                |
               +----------------+----------------+
               |                                 |
               v                                 v
       +---------------+                 +---------------+
       |   COMPLETED   |                 |    FAILED     |
       +---------------+                 +-------+-------+
                                                 |
                                (Retries left?)  |  (Max attempts reached)
                        +------------------------+------------------------+
                        |                                                 |
                        v                                                 v
                +---------------+                                 +---------------+
                | DELAYED/RETRY |                                 |  DEAD-LETTER  |
                +---------------+                                 |     (DLQ)     |
                                                                  +---------------+
```

### 4.1 Explicit Worker Idempotency Rules

Every worker processor must be completely safe to execute multiple times without unintended side effects:

```
Job Arrival
    ↓
Check Database State & Version Fencing Token
    ↓
Already in Target State? (e.g. article is already 'PUBLISHED')
    ↓
YES → Log informational notice & return immediately (No-Op)
NO  → Execute mutation within atomic transaction
```

- **Publishing Processor**: If the article's status is already `PUBLISHED` or the version has incremented past the job payload, the worker logs a no-op and exits cleanly.
- **Notification Processor**: Uses Redis deduplication key (`SET ... NX`) and DB unique grouping keys to ensure duplicate deliveries never spawn duplicate rows.
- **Mesh Reconciliation**: Uses idempotent SQL (`INSERT ... ON CONFLICT / ON DUPLICATE KEY UPDATE`) so repeated retries are safe.

### 4.2 Worker Crash & Stalled Job Recovery Semantics

When a worker Node.js process crashes unexpectedly while processing an `ACTIVE` job:
1. **Heartbeat Lease**: BullMQ workers renew a lock on the job every 15,000 ms (`lockDuration: 30000`).
2. **Stalled Detection**: BullMQ monitors active locks via `stalledInterval: 30000`. If a worker terminates without releasing the lock, the job is marked `stalled`.
3. **Automatic Reprocessing**: Stalled jobs are automatically re-enqueued to `WAITING` (up to `maxStalledCount: 2`).
4. **Safety Guarantee**: Because all processors enforce **Idempotency Rule 4.1**, re-running a stalled job will never create duplicate state mutations or corrupt data.

---

## 5. Administrative Job & DLQ Management API

All administrative queue management endpoints are protected by `JwtAuthGuard`, `CsrfGuard`, and `PermissionsGuard(Permission.SYSTEM_MAINTENANCE)`.

### 5.1 Endpoints Specification

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/queues` | Overview statistics & latency for all queues | None | `QueueSummaryDto[]` |
| `GET` | `/api/admin/queues/:queueName/jobs` | Paginated list of jobs filtered by state | Query: `state, page, limit` | `PaginatedJobsDto` |
| `GET` | `/api/admin/queues/:queueName/jobs/:jobId` | Sanitized diagnostic inspect for single job | None | `JobDetailDto` |
| `POST` | `/api/admin/queues/:queueName/jobs/:jobId/retry` | Re-enqueue a failed DLQ job | None | `{ success: true, jobId }` |
| `POST` | `/api/admin/queues/:queueName/retry-all-failed` | Bulk re-enqueue all failed jobs in DLQ | None | `{ success: true, count }` |
| `DELETE` | `/api/admin/queues/:queueName/jobs/:jobId` | Permanently remove job from queue | None | `{ success: true }` |
| `POST` | `/api/admin/queues/:queueName/pause` | Pause queue processing | None | `{ paused: true }` |
| `POST` | `/api/admin/queues/:queueName/resume` | Resume queue processing | None | `{ paused: false }` |
| `POST` | `/api/admin/queues/:queueName/clean` | Clean completed or old failed jobs | Body: `{ gracePeriodMs, status }` | `{ removedCount: number }` |

### 5.2 Sanitization & Sensitive Data Redaction in Admin DLQ

To prevent credential leakage or PII exposure in the Admin Console:
1. **Payload Redaction**: Before returning job payloads in `JobDetailDto`, all fields matching `/password|token|secret|authorization|cookie|email/i` are masked with `"[REDACTED]"`.
2. **Stack Trace Masking**: Absolute system paths (e.g. `/home/deploy/app/src/...` or `C:\Users\...`) are stripped to standard relative repository paths (`server/src/...`).

---

## 6. Backpressure, Depth Thresholds & Queue Observability

### 6.1 Queue Backpressure & Rate Control

When an upstream event causes a traffic spike (e.g. 20,000 notifications in 1 minute):

| Queue | Warning Depth | Critical Depth | Backpressure Action |
| :--- | :--- | :--- | :--- |
| `scheduled-publishing` | > 50 waiting | > 200 waiting | Alert Ops + Concurrency auto-scales to 10 |
| `notification-outbox` | > 2,000 waiting | > 10,000 waiting | Throttle non-critical email digests; prioritize breaking editorial alerts |
| `mesh-reconciliation` | > 500 waiting | > 2,000 waiting | Log degraded replica health warning |

### 6.2 Advanced Queue Observability Metrics

The `GET /api/admin/queues` endpoint returns complete telemetry for operational monitoring:

```json
[
  {
    "queueName": "scheduled-publishing",
    "isPaused": false,
    "counts": {
      "active": 1,
      "waiting": 0,
      "delayed": 14,
      "failed": 0,
      "completed": 342,
      "stalled": 0,
      "paused": 0
    },
    "metrics": {
      "oldestWaitingJobAgeMs": 0,
      "p95ProcessingLatencyMs": 142,
      "throughputPerMinute": 18,
      "dlqSize": 0
    },
    "workersCount": 2,
    "memoryUsageBytes": 1048576
  }
]
```

---

## 7. Implementation Plan

```
+--------------------------------------------------------------------------------+
|                           IMPLEMENTATION PHASES                                |
+--------------------------------------------------------------------------------+
|                                                                                |
|  Phase 1: Dependencies & Core BullMQ Module                                    |
|  - Install bullmq, @nestjs/bullmq, and ioredis.                                |
|  - Create BullMQModule with Redis connection factory and error hooks.          |
|  - Configure isolated Redis DB / key prefix (bull:cms:*).                      |
|                                                                                |
|  Phase 2: Scheduled Publishing Refactor                                        |
|  - Refactor WorkflowService to enqueue delayed BullMQ jobs on schedule.        |
|  - Refactor PublisherWorker into a BullMQ Processor (@Processor()).            |
|  - Handle job cancellation when scheduled manuscripts are reverted to Draft.   |
|                                                                                |
|  Phase 3: Admin Queue & DLQ Management API                                     |
|  - Create JobsAdminService and JobsAdminController.                            |
|  - Implement sensitive data redaction filter and stack trace sanitizer.        |
|  - Expose summary metrics, paginated job lists, single/bulk retries, deletes.  |
|                                                                                |
|  Phase 4: Admin Governance Frontend (Jobs & DLQ Console)                       |
|  - Build client/src/pages/admin/JobsManagerPage.tsx.                           |
|  - Add tab in AdminLayout navigation.                                          |
|  - Build queue metric counters, DLQ table, stack trace drawer, and retry tools.|
|                                                                                |
|  Phase 5: Automated Testing & Verification                                     |
|  - Unit tests for JobsAdminService and PublisherWorker processor.              |
|  - End-to-end integration test for delayed job scheduling, failure, and DLQ.   |
|                                                                                |
+--------------------------------------------------------------------------------+
```

---

## 8. Verification & Acceptance Criteria

- [ ] `bullmq` and `@nestjs/bullmq` installed and configured with Redis connection pool.
- [ ] `PublisherWorker` successfully processes delayed jobs without `setInterval`.
- [ ] Multiple server instances can run concurrently without executing duplicate publishing transitions.
- [ ] Reverting a scheduled article to Draft cleanly removes the delayed BullMQ job from Redis.
- [ ] Intentionally failed jobs are captured in the Dead-Letter Queue (DLQ).
- [ ] `/api/admin/queues` returns accurate counts for `active`, `delayed`, `failed`, `completed`, and `oldestWaitingJobAgeMs`.
- [ ] Admin Console (`/admin/jobs`) displays live queue metrics and allows single-click and bulk DLQ retries.
- [ ] 100% green unit test suite across all services and workers.
