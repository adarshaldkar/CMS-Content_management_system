# The Gazette CMS — Distributed Job Queues & Admin DLQ Operations Architecture

**Document Status**: Production-Frozen Specification (v1.0)  
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
   - Administrators and platform operators need complete real-time visibility into queue backlogs, failed jobs, execution latencies, error stack traces, and the ability to trigger bulk or single-job retries with a single click.

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
|     - ClickHouse view count sync and hourly engagement metric rollups.       |
|     - Concurrency: 2 workers | Max Retries: 3 | Backoff: Fixed (30s)          |
|                                                                               |
+-------------------------------------------------------------------------------+
```

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

## 4. Job State Machine & Retry Policies

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

### Retry Configuration Table

| Queue Name | Max Attempts | Backoff Type | Initial Delay | Remove on Complete | Remove on Fail |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `scheduled-publishing` | 3 | Exponential | 5,000 ms | Keep 500 | Keep (DLQ) |
| `notification-outbox` | 5 | Exponential | 2,000 ms | Keep 1,000 | Keep (DLQ) |
| `mesh-reconciliation` | 10 | Exponential | 10,000 ms | Keep 2,000 | Keep (DLQ) |
| `analytics-rollup` | 3 | Fixed | 30,000 ms | Keep 100 | Keep (DLQ) |

---

## 5. Administrative Job & DLQ Management API

All administrative queue management endpoints are protected by `JwtAuthGuard`, `CsrfGuard`, and `PermissionsGuard(Permission.SYSTEM_MAINTENANCE)`.

### 5.1 Endpoints Specification

| Method | Endpoint | Description | Request Body | Response |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/api/admin/queues` | Overview statistics for all queues | None | `QueueSummaryDto[]` |
| `GET` | `/api/admin/queues/:queueName/jobs` | Paginated list of jobs filtered by state | Query: `state, page, limit` | `PaginatedJobsDto` |
| `GET` | `/api/admin/queues/:queueName/jobs/:jobId` | Detailed diagnostic inspect for single job | None | `JobDetailDto` |
| `POST` | `/api/admin/queues/:queueName/jobs/:jobId/retry` | Re-enqueue a failed DLQ job | None | `{ success: true, jobId }` |
| `POST` | `/api/admin/queues/:queueName/retry-all-failed` | Bulk re-enqueue all failed jobs in DLQ | None | `{ success: true, count }` |
| `DELETE` | `/api/admin/queues/:queueName/jobs/:jobId` | Permanently remove job from queue | None | `{ success: true }` |
| `POST` | `/api/admin/queues/:queueName/pause` | Pause queue processing | None | `{ paused: true }` |
| `POST` | `/api/admin/queues/:queueName/resume` | Resume queue processing | None | `{ paused: false }` |
| `POST` | `/api/admin/queues/:queueName/clean` | Clean completed or old failed jobs | Body: `{ gracePeriodMs, status }` | `{ removedCount: number }` |

### 5.2 Response Schemas

#### Queue Summary (`GET /api/admin/queues`)
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
      "paused": 0
    },
    "workersCount": 2,
    "memoryUsageBytes": 1048576
  },
  {
    "queueName": "notification-outbox",
    "isPaused": false,
    "counts": {
      "active": 3,
      "waiting": 12,
      "delayed": 0,
      "failed": 2,
      "completed": 12840,
      "paused": 0
    },
    "workersCount": 4,
    "memoryUsageBytes": 4194304
  }
]
```

#### Job Details & Error Diagnostics (`GET /api/admin/queues/:queueName/jobs/:jobId`)
```json
{
  "id": "job:publish:art-991:v2",
  "name": "publish-scheduled-article",
  "data": {
    "articleId": "art-991",
    "version": 2,
    "scheduledAt": "2026-09-02T01:00:00.000Z"
  },
  "opts": {
    "attempts": 3,
    "delay": 1800000
  },
  "progress": 100,
  "attemptsMade": 2,
  "stacktrace": [
    "Error: Database connection timeout\n    at PostgresService.query (/app/database/postgres.service.ts:45)\n    at PublisherWorker.process (/app/modules/articles/publisher.worker.ts:88)"
  ],
  "failedReason": "Database connection timeout",
  "timestamp": 1788290000000,
  "processedOn": 1788291800000,
  "finishedOn": 1788291802000
}
```

---

## 6. Frontend Admin Queue & DLQ Operations Console

The operational console will be integrated into the Admin Governance area under **Background Jobs & DLQ** (`/admin/jobs`).

### 6.1 UI Components & Capabilities

1. **Queue Metric Cards (Top Bar)**:
   - Live counters for **Active**, **Waiting**, **Delayed**, **Completed**, and **Failed (DLQ)** across all 4 queues.
   - Real-time polling or SSE updates every 5 seconds.
   - Global Pause / Resume switches for emergency operational maintenance.

2. **Dead-Letter Queue (DLQ) Inspector Tab**:
   - Dedicated table displaying all jobs in `failed` state across queues.
   - Columns: `Queue`, `Job ID`, `Attempts Made`, `Failed Reason`, `Last Attempt Time`, `Actions`.
   - **One-Click Retry Button**: Re-enqueues the job with fresh attempt limits.
   - **Bulk "Retry All Failed" Action**: Recovers all failed items simultaneously.
   - **Error Stack Trace Modal**: Inspects raw stack traces and JSON payload parameters to diagnose root causes before retrying.

3. **Scheduled & Delayed Dispatches Tab**:
   - Displays all manuscripts waiting for scheduled promotion.
   - Columns: `Manuscript Title`, `Scheduled Time`, `Countdown`, `Job ID`, `Immediate Publish Action`, `Cancel Schedule Action`.

4. **Queue Cleaning & Purging Tools**:
   - Allows operators to clean jobs older than 7 days (`COMPLETED` or `FAILED`) to reclaim Redis memory.

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
- [ ] `/api/admin/queues` returns accurate counts for `active`, `delayed`, `failed`, and `completed`.
- [ ] Admin Console (`/admin/jobs`) displays live queue metrics and allows single-click and bulk DLQ retries.
- [ ] 100% green unit test suite across all services and workers.
