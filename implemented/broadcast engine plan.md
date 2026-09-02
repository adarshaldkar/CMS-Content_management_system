# Enterprise Double Opt-In Newsletter & Broadcast Dispatch Engine

Enterprise-grade subscription, verification, bounce suppression, preference center, and broadcast campaign management engine powered by isolated BullMQ workers, SHA-256 token hashing at rest, and full campaign lifecycle tracking.

## Key Architectural Enhancements (Approved Design)

1. **SHA-256 Token Hashing at Rest**:
   - High-entropy cryptographic tokens generated via `crypto.randomBytes(32).toString('hex')`.
   - Stored in database strictly as `crypto.createHash('sha256').update(rawToken).digest('hex')`.
   - Raw tokens are only transmitted in email activation and unsubscribe links.
2. **Dedicated BullMQ Queue (`newsletter-broadcast`)**:
   - Completely isolated from `notification-outbox` to prevent bulk campaign blasts from delaying urgent editorial and user notifications.
3. **Full Campaign Lifecycle & Idempotency**:
   - Campaign States: `DRAFT` &rarr; `SCHEDULED` &rarr; `SENDING` &rarr; `SENT` (or `PARTIALLY_FAILED` / `CANCELLED`).
   - Idempotent Job Keys: `job:broadcast:${campaignId}:${batchIndex}:${subscriberId}` to eliminate double-send risks.
4. **Subscriber Suppression & Webhook Delivery Tracking**:
   - Statuses: `PENDING_VERIFICATION`, `ACTIVE`, `UNSUBSCRIBED`, `BOUNCED`, `COMPLAINED`.
   - Suppression filter: Broadcasts query exclusively `status = 'ACTIVE'`.
   - Inbound webhook endpoint `POST /api/newsletter/webhook/events` for bounce and complaint processing.
5. **Preference & Granular Unsubscribe Center**:
   - Allows users to unsubscribe from all, adjust preferred topics, or change digest frequency (`daily` / `weekly` / `instant`).

---

## Proposed Changes

### 1. Domain Models & Repositories (`server/src/`)

#### [NEW] [newsletter.model.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/domain/newsletter.model.ts)
- `SubscriberStatus`: `PENDING_VERIFICATION`, `ACTIVE`, `UNSUBSCRIBED`, `BOUNCED`, `COMPLAINED`.
- `CampaignStatus`: `DRAFT`, `SCHEDULED`, `SENDING`, `SENT`, `PARTIALLY_FAILED`, `FAILED`, `CANCELLED`.
- `DigestFrequency`: `INSTANT`, `DAILY`, `WEEKLY`.
- `NewsletterSubscriber`: `id`, `email`, `status`, `topics`, `frequency`, `verificationTokenHash`, `verificationTokenExpiresAt`, `unsubscribeTokenHash`, `bounceCount`, `verifiedAt`, `unsubscribedAt`, `lastBouncedAt`, `createdAt`, `updatedAt`.
- `NewsletterBroadcast`: `id`, `subject`, `previewText`, `contentHtml`, `targetTopics`, `status`, `totalRecipients`, `deliveredCount`, `failedCount`, `scheduledAt`, `sentAt`, `authorId`, `createdAt`, `updatedAt`.

#### [NEW] [newsletter.repository.interface.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/interfaces/newsletter.repository.interface.ts)
- `INewsletterRepository` interface for subscriber CRUD, token hash lookup, suppression queries, campaign state transitions, and metrics.

#### [NEW] [postgres-newsletter.repository.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/postgres/postgres-newsletter.repository.ts)
- DDL tables: `newsletter_subscribers` and `newsletter_campaigns`.
- Indexed on `email`, `verification_token_hash`, `unsubscribe_token_hash`, `status`.

#### [NEW] [newsletter.schema.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/mongo/newsletter.schema.ts) & [mongo-newsletter.repository.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/mongo/mongo-newsletter.repository.ts)
- MongoDB schemas and Mongoose repository implementation.

#### [MODIFY] [bull-queue.constants.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/bull/bull-queue.constants.ts) & [bull-queue.module.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/bull/bull-queue.module.ts)
- Add `QUEUE_NAMES.NEWSLETTER_BROADCAST = 'newsletter-broadcast'`.
- Register isolated BullMQ queue with concurrency 5, exponential retry backoff, and DLQ retention.

---

### 2. BullMQ Worker & Newsletter Service (`server/src/modules/newsletter/`)

#### [NEW] [newsletter-broadcast.worker.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/newsletter/newsletter-broadcast.worker.ts)
- `@Processor(QUEUE_NAMES.NEWSLETTER_BROADCAST)` processor handling:
  - Single double opt-in verification email dispatches.
  - Chunked campaign batch deliveries with per-recipient idempotency and campaign counter rollups.

#### [NEW] [newsletter.service.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/newsletter/newsletter.service.ts)
- `subscribe(dto)`: email normalization, SHA-256 token hashing, token rotation on re-subscribe, BullMQ enqueue.
- `verify(rawToken)`: hashes token with SHA-256, verifies expiry, activates subscriber, issues durable `unsubscribeTokenHash`.
- `getPreferences(rawUnsubscribeToken)`: fetches subscriber details safely by token hash.
- `updatePreferences(rawUnsubscribeToken, dto)`: updates topics, frequency, or sets status to `UNSUBSCRIBED`.
- `handleWebhookEvent(eventDto)`: records bounces and complaints, marks status as `BOUNCED` or `COMPLAINED`.
- `createCampaign(dto, user)`, `sendCampaign(campaignId, user)`, `getCampaigns()`, `getSubscribers(query)`, `getStats()`.

#### [NEW] [newsletter.controller.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/newsletter/newsletter.controller.ts)
- Public endpoints:
  - `POST /api/newsletter/subscribe` (Throttled)
  - `GET /api/newsletter/verify/:token`
  - `GET /api/newsletter/preferences/:token`
  - `PATCH /api/newsletter/preferences/:token`
  - `POST /api/newsletter/webhook/events` (Provider webhook for bounce/complaint/delivery)
- Admin endpoints:
  - `GET /api/admin/newsletter/stats`
  - `GET /api/admin/newsletter/subscribers`
  - `GET /api/admin/newsletter/campaigns`
  - `POST /api/admin/newsletter/campaigns`
  - `POST /api/admin/newsletter/campaigns/:id/send`

#### [NEW] [newsletter.module.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/newsletter/newsletter.module.ts)
- Encapsulates worker, service, controller, and repository providers.

---

### 3. Frontend Experience (`client/src/`)

#### [NEW] [newsletter.api.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/api/newsletter.api.ts)
- Complete API client for subscriber actions, preference center, and admin campaign broadcasting.

#### [MODIFY] [HomePage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/HomePage.tsx)
- Connect sidebar newsletter form with real API mutation and verification pending banner.

#### [NEW] [NewsletterVerifyPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/newsletter/NewsletterVerifyPage.tsx)
- Celebrates activation, displays confirmed topics, and directs user to current top stories.

#### [NEW] [NewsletterPreferencesPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/newsletter/NewsletterPreferencesPage.tsx)
- Comprehensive preference center (Topic checkboxes, Digest Frequency selector, and "Unsubscribe from All" button).

#### [NEW] [NewsletterManagerPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/NewsletterManagerPage.tsx)
- Admin Campaign & Subscriber Console:
  - Metric cards: Total Subscribers, Active, Pending Verification, Bounced / Complained, Campaigns Sent.
  - Tab 1: Subscriber Directory (Search, status badges, frequency, topic pills).
  - Tab 2: Campaign Manager & Broadcast Composer (Subject, preview text, rich HTML editor, target topic filter, audience estimator, live preview, send button).
  - Tab 3: Campaign History (Delivery status, recipient counts, sent timestamps).

#### [MODIFY] [AdminLayout.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/layout/AdminLayout.tsx) & [App.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/App.tsx)
- Add **Newsletter & Campaigns** to Admin sidebar (`Mail` icon) and configure routes.

---

## Verification Plan

### Automated Tests
- `npm run test -- newsletter.service.spec.ts` (unit tests for subscribe, token hashing, rotation, verification, suppression, preference updates, and broadcast batching).
- `npm run test` (all 17+ suites, 100% green).
- `npm run build` for both backend and client.

### Manual & E2E Validation
- Test full double opt-in loop in browser:
  1. Submit email on Homepage.
  2. Verify subscriber created in DB with status `PENDING_VERIFICATION` and SHA-256 token hash.
  3. Verify via `/newsletter/verify/:token`.
  4. Test preference center at `/newsletter/preferences/:token`.
  5. Test Admin Campaign Composer and broadcast dispatch via BullMQ.
