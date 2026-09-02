# BullMQ Distributed Queues & Dead-Letter Queue (DLQ) Implementation Report

**Platform**: The Gazette Editorial Platform  
**Subsystem**: Asynchronous Distributed Processing & Queue Governance  
**Status**: Production Ready & Verified (16/16 Test Suites, 103/103 Unit Tests Passing)  

---

## 1. Architectural Architecture Overview

BullMQ has been integrated as the primary distributed queue layer for The Gazette platform, replacing in-process timers and synchronous outbox operations with durable Redis-backed streams and job state machines.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             The Gazette Platform                            │
│                                                                             │
│  [Editor / Author Desk]          [Admin DLQ Operations Console]             │
│            │                                    │                           │
│  Schedule Article Dispatch            Inspect, Retry & Purge Jobs           │
│            │                                    │                           │
│            ▼                                    ▼                           │
│   WorkflowService                      JobsAdminService & Controller        │
│            │                                    │                           │
│            └──────────────┐      ┌──────────────┘                           │
│                           ▼      ▼                                          │
│             ┌─────────────────────────────────────────┐                     │
│             │          BullQueueModule (Global)       │                     │
│             │   Redis Connection (Prefix: bull:cms:)   │                     │
│             └─────────────────────────────────────────┘                     │
│                                  │                                          │
│         ┌────────────────────────┼────────────────────────┐                 │
│         ▼                        ▼                        ▼                 │
│   scheduled-publishing   notification-outbox    mesh-reconciliation        │
│   (PublisherWorker)     (Push & Stream Outbox)  (Secondary DB Replays)     │
│         │                        │                        │                 │
│         ▼                        ▼                        ▼                 │
│   Atomic State Update    SSE & Web Push Stream  Multi-Engine Replay Buffer  │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Implemented Queues & Worker Isolation

| Queue Name | Concurrency | Retry Attempts | Backoff Strategy | DLQ Retention |
| :--- | :--- | :--- | :--- | :--- |
| `scheduled-publishing` | 5 workers | 3 attempts | Exponential (5s initial delay) | Permanent (`removeOnFail: false`) |
| `notification-outbox` | 10 workers | 5 attempts | Exponential (2s initial delay) | Permanent (`removeOnFail: false`) |
| `mesh-reconciliation` | 2 workers | 10 attempts | Exponential (10s initial delay) | Permanent (`removeOnFail: false`) |
| `analytics-rollup` | 1 worker | 3 attempts | Fixed (30s delay) | Permanent (`removeOnFail: false`) |

---

## 3. Worker Idempotency & Crash Recovery Invariants

1. **Version Fencing Token**:
   - Every scheduled publishing job receives `{ articleId, version }` in its payload.
   - When processed, `PublisherWorker` checks current DB status and version. If the article was already published or if version was incremented by an edit, the worker returns a clean No-Op without error.
2. **Crash & Stalled Recovery**:
   - Configured with `lockDuration: 30000`, `stalledInterval: 30000`, and `maxStalledCount: 2`.
   - On worker process crash, BullMQ automatically detects stalled jobs after 30 seconds and reassigns them to healthy workers.
3. **Startup Bootstrap Reconciliation**:
   - On server bootstrap (`onModuleInit`), `PublisherWorker` scans for any overdue `SCHEDULED` articles in the database and promotes them immediately or schedules upcoming releases into BullMQ.

---

## 4. Admin DLQ Governance & Security Redaction

- **Security Redaction**: `JobsAdminService` automatically masks sensitive fields matching `/password|token|secret|authorization|cookie|apiKey|private/i` with `"[REDACTED]"`.
- **Path Sanitization**: Error stack traces have local server absolute drive paths stripped down to clean relative paths (e.g. `server/src/database/...`).
- **Telemetry & Metrics**: Exposes `oldestWaitingJobAgeMs`, `throughputPerMinute`, `dlqSize`, and worker counts per queue.
- **DLQ Operations**: Single-job retry, bulk retry all failed jobs (`POST /api/admin/queues/:name/retry-all-failed`), permanent delete, pause/resume, and clean.

---

## 5. Test Suite Verification

- **Total Test Suites**: 16 passed, 16 total
- **Total Tests**: 103 passed, 103 total (100%)
- **Test Specs**:
  - `src/modules/jobs/jobs-admin.service.spec.ts`: 10/10 passed
  - `src/modules/articles/publisher.worker.spec.ts`: 4/4 passed
  - `src/modules/articles/workflow.service.spec.ts`: 9/9 passed
  - All repository, security guard, CSRF, JWT, and mesh test suites green.
