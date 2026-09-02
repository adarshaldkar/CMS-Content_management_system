# Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine

## 1. Executive Summary

The Gazette Newsletter & Broadcast subsystem provides an enterprise-grade subscription, verification, audience segmentation, and asynchronous broadcast distribution engine.

Key Highlights:
- **Double Opt-In Verification**: 48-hour expiring tokens with SHA-256 token hashing at rest.
- **Dedicated BullMQ Queue (`newsletter-broadcast`)**: Queue isolation ensuring broadcast spikes never interfere with article scheduling or notification queues.
- **Capability-Based Unsubscribe & Preferences**: RFC-8058 compliant unauthenticated preference management secured by unguessable, hashed tokens.
- **Active-Active Persistence**: Seamlessly persisted across PostgreSQL and MongoDB repository layers with automatic fallback and schema migration.
- **Admin Campaign Studio**: Real-time audience calculation, multi-category targeting, live visual preview, and batch-enqueued dispatches.

---

## 2. Architecture & Data Flow

```text
Reader Input (Homepage)
         │
         ▼
[POST /api/newsletter/subscribe]
         │
         ├── Generates raw verification token (crypto.randomBytes)
         ├── Computes SHA-256 hash -> saves in Postgres/MongoDB
         └── Adds verification job to BullMQ 'newsletter-broadcast'
                     │
                     ▼
             [NewsletterWorker]
                     │
                     └── Sends confirmation email with URL link
                                 │
                                 ▼
                     [GET /api/newsletter/verify/:token]
                                 │
                                 ├── Hashes token & matches in DB
                                 └── Sets status: 'ACTIVE', clears token
```

---

## 3. Campaign Broadcasting Flow

```text
Admin Composes Campaign (Admin Studio)
         │
         ▼
[POST /api/admin/newsletter/campaigns/:id/send]
         │
         ├── Validates author permissions ('newsletter.broadcast')
         ├── Finds ACTIVE subscribers (excluding BOUNCED / UNSUBSCRIBED)
         ├── Filters subscribers by target topic criteria
         ├── Transitions Campaign state: DRAFT -> SENDING
         └── Partitions into BullMQ chunks of 50 subscribers
                     │
                     ▼
       Job ID: job_broadcast_{campaignId}_batch_{index}
                     │
                     ▼
             [NewsletterWorker]
                     │
                     ├── Verifies suppression list before delivery
                     ├── Simulates delivery / invokes SMTP mailer
                     └── Updates campaign deliveredCount & status
```

---

## 4. Endpoints Reference

### Public Endpoints
- `POST /api/newsletter/subscribe`: Initial subscription request with optional topic selection.
- `GET /api/newsletter/verify/:token`: Validates 48h token and activates subscriber.
- `GET /api/newsletter/preferences/:token`: Retrieves subscriber preferences without requiring user login.
- `PATCH /api/newsletter/preferences/:token`: Updates topic choices, digest frequency, or unsubscribes.
- `POST /api/newsletter/webhook/events`: Ingests email bounce and spam complaint webhooks.

### Admin & Editorial Endpoints (Protected by `JwtAuthGuard`, `PermissionsGuard`)
- `GET /api/admin/newsletter/stats`: Telemetry metrics (Total, Active, Pending, Suppressed, Sent).
- `GET /api/admin/newsletter/subscribers`: Paginated subscriber directory with search and status filters.
- `GET /api/admin/newsletter/campaigns`: Campaign dispatch history.
- `POST /api/admin/newsletter/campaigns`: Creates a draft campaign.
- `POST /api/admin/newsletter/campaigns/:id/send`: Launches batch dispatch via BullMQ.
