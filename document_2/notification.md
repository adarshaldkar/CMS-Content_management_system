# Hardened v3.0 In-App Notifications Engine & Social Feedback Architecture

**Document Status**: Production-Frozen Architecture & Distributed Systems Blueprint  
**System Milestone**: Phase 6 Enterprise Social, Real-Time Signaling & Editorial Feedback Loop  
**Target Scale**: 2,000+ Concurrent Readers, Multi-Replica NestJS Mesh, Real-Time SSE/WebSocket Delivery  
**Author**: Senior Distributed Systems & Product Architecture Review  

---

## Table of Contents

1. [Executive Summary & Core Architectural Tenets](#1-executive-summary--core-architectural-tenets)
2. [End-to-End Notification Topology & Durability Split](#2-end-to-end-notification-topology--durability-split)
3. [Expanded Notification Event Taxonomy](#3-expanded-notification-event-taxonomy)
4. [User Notification Preferences & Multi-Channel Routing](#4-user-notification-preferences--multi-channel-routing)
5. [Web Push API & VAPID Subscription Architecture](#5-web-push-api--vapid-subscription-architecture)
6. [Transactional Outbox & BullMQ Async Processing](#6-transactional-outbox--bullmq-async-processing)
7. [Concurrency-Safe Grouping & Atomic Upsert Engine](#7-concurrency-safe-grouping--atomic-upsert-engine)
8. [Actor Privacy, Account Deletion & Snapshot Preservation](#8-actor-privacy-account-deletion--snapshot-preservation)
9. [Delivery Status & Channel Observability](#9-delivery-status--channel-observability)
10. [Redis Acceleration, Deduplication & Real-Time SSE Delivery](#10-redis-acceleration-deduplication--real-time-sse-delivery)
11. [Multi-Database Schema Specifications](#11-multi-database-schema-specifications)
12. [Cursor-Based API Contracts](#12-cursor-based-api-contracts)
13. [Frontend Notification Center UI/UX Specification](#13-frontend-notification-center-uiux-specification)
14. [Data Retention, Archival & Admin Governance](#14-data-retention-archival--admin-governance)
15. [Step-by-Step Implementation Roadmap](#15-step-by-step-implementation-roadmap)

---

## 1. Executive Summary & Core Architectural Tenets

The Gazette Notification System operates as a high-throughput, event-driven subsystem designed to bridge readers, authors, and editorial desks in real time.

### Core Architectural Principles

1. **Non-Blocking Domain Operations**: Article state transitions, comment submissions, likes, and follows must never block on notification generation. All notification creation executes asynchronously via transactional outbox events and BullMQ background workers.
2. **Clear Durability & Delivery Split**:
   - **PostgreSQL / MongoDB**: Durable source of truth for all notifications, preferences, and push subscriptions.
   - **BullMQ**: Reliable processing, retry scheduling, and dead-letter queue isolation.
   - **Redis**: Ephemeral coordination layer (deduplication leases, atomic unread counters, and cluster Pub/Sub signaling).
   - **Server-Sent Events (SSE) / Web Push**: Real-time browser delivery transports.
3. **Multi-Channel Granular Preference Filtering**: Every notification is evaluated against the recipient's explicit preferences (In-App, Email, Browser Push) before persistence or transmission.
4. **Concurrency-Safe Atomic Grouping**: High-velocity social signals (likes, reposts) are aggregated via atomic database upserts (`ON CONFLICT` / `findOneAndUpdate`) to eliminate race conditions and inbox fatigue.
5. **Actor Anonymization & Snapshot Safety**: Actor display names and avatars are captured at event creation time. If an actor deletes their account, historical inbox entries remain intact with snapshot data or graceful anonymization.
6. **Delivery Observability**: Tracks delivery state (`PENDING`, `SENT`, `FAILED`, `PARTIAL`) and per-channel delivery timestamps.

---

## 2. End-to-End Notification Topology & Durability Split

```
[ Domain Operation: e.g. Article Approved / Comment Posted / Author Followed ]
                                      │
                                      ▼
                        [ Domain Event / Outbox Record ]
                                      │
                                      ▼
                          [ BullMQ Notification Queue ]
                         (isolated: `cms-notifications`)
                                      │
                                      ▼
                         [ Notification Worker ]
                                      │
               ┌──────────────────────┴──────────────────────┐
               ▼                                             ▼
  [ 1. Check User Preferences ]                 [ 2. Redis Deduplication Lease ]
  (In-App / Email / Push toggles)               (`dedup:notif:<eventHash>:<userId>`)
               │                                             │
               └──────────────────────┬──────────────────────┘
                                      ▼
                   [ 3. Concurrency-Safe Grouping ]
                 (Atomic SQL Upsert / Mongo findAndModify)
                                      │
               ┌──────────────────────┼──────────────────────┐
               ▼                      ▼                      ▼
    [ PostgreSQL / MongoDB ]  [ Redis Unread Counter ]  [ Redis Pub/Sub Signal ]
   (Durable inbox storage)    (`notif:unread:<userId>`) (`cms:channel:notif:<userId>`)
               │                      │                      │
               │                      │                      ▼
               │                      │          [ Connected NestJS Replicas ]
               │                      │          (Server-Sent Events / SSE Stream)
               │                      │                      │
               ▼                      ▼                      ▼
  [ REST / Cursor Inbox ]     [ Badge Counter ]      [ Real-Time In-App Alert ]
  (Sliding Drawer Client)    (Header Bell: "3")      (Instant Browser Drawer Drop)
```

---

## 3. Expanded Notification Event Taxonomy

The system supports 11 granular notification event types covering the full spectrum of editorial, social, and platform interactions:

```typescript
export enum NotificationType {
  // Editorial & Publishing Lifecycle
  ARTICLE_PUBLISHED = 'ARTICLE_PUBLISHED',       // Manuscript approved and live on site
  ARTICLE_FEEDBACK = 'ARTICLE_FEEDBACK',         // Editor requested revisions / added notes
  ARTICLE_REJECTED = 'ARTICLE_REJECTED',         // Manuscript rejected with editorial reason
  ARTICLE_SCHEDULED = 'ARTICLE_SCHEDULED',       // Story queued for future release

  // Social & Community Engagement
  ARTICLE_LIKED = 'ARTICLE_LIKED',               // Reader liked an article
  ARTICLE_REPOSTED = 'ARTICLE_REPOSTED',         // Reader reposted an article to their library
  COMMENT_RECEIVED = 'COMMENT_RECEIVED',         // New top-level comment on author's article
  COMMENT_REPLY = 'COMMENT_REPLY',               // Reply in an existing comment thread
  COMMENT_LIKED = 'COMMENT_LIKED',               // Reader upvoted/liked a comment
  NEW_FOLLOWER = 'NEW_FOLLOWER',                 // User followed an author profile
  USER_MENTIONED = 'USER_MENTIONED',             // User tagged via @handle in article or comment

  // System & Governance
  SYSTEM_ANNOUNCEMENT = 'SYSTEM_ANNOUNCEMENT',   // Administrative or platform bulletin
}
```

---

## 4. User Notification Preferences & Multi-Channel Routing

Every user has an explicit notification preferences record controlling delivery across three distinct channels: **In-App**, **Email**, and **Browser Push**.

### Preferences Data Model
```typescript
export interface NotificationPreferences {
  userId: string;
  channels: {
    inApp: boolean;
    email: boolean;
    browserPush: boolean;
  };
  events: {
    onArticlePublished: boolean;
    onArticleFeedback: boolean;
    onArticleLiked: boolean;
    onArticleReposted: boolean;
    onCommentReceived: boolean;
    onCommentReply: boolean;
    onCommentLiked: boolean;
    onNewFollower: boolean;
    onUserMentioned: boolean;
    onSystemAnnouncement: boolean;
  };
  digestFrequency: 'instant' | 'daily_digest' | 'weekly_digest';
  quietHours: {
    enabled: boolean;
    startUtc?: string; // e.g. "22:00"
    endUtc?: string;   // e.g. "07:00"
  };
  updatedAt: string;
}
```

---

## 5. Web Push API & VAPID Subscription Architecture

Browser Web Push is strictly **opt-in** and requires explicit user consent in modern browsers.

### Architecture & Standards
- **Protocol**: W3C Push API / RFC 8291 Web Push Encryption.
- **Key Exchange**: VAPID (Voluntary Application Server Identification) key pair.
  - `VAPID_PUBLIC_KEY`: Shared with browser client to generate subscription.
  - `VAPID_PRIVATE_KEY`: Kept securely in backend environment.
  - `VAPID_SUBJECT`: `mailto:admin@thegazette.com`.

### Push Subscription Data Model
```typescript
export interface PushSubscriptionRecord {
  id: string;
  userId: string;
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  isActive: boolean;
  createdAt: string;
}
```

---

## 6. Transactional Outbox & BullMQ Async Processing

To guarantee that notifications are never lost if an unexpected process crash occurs immediately after an article update or comment insertion, all events follow the **Transactional Outbox Pattern**.

### Outbox Flow
1. **Mutation Transaction**: The primary business service (e.g. `CommentsService`) inserts the comment and simultaneously writes an outbox record into `cms_notification_outbox` within the same database transaction.
2. **BullMQ Dispatch**: An outbox poller or post-commit hook enqueues a job into the isolated BullMQ queue `cms-notifications`.
3. **Worker Processing**: The worker handles:
   - Recipient resolution (fetching author ID from article ID).
   - Self-notification suppression (ignoring events where `actorId === recipientId`).
   - Preference verification.
   - Redis deduplication verification.
   - Persistence and live signaling.
4. **Dead-Letter Queue (DLQ)**: Failed notification deliveries retry 3 times with exponential backoff (1s, 5s, 30s) before routing to `cms-notifications-dlq` for operator inspection.

---

## 7. Concurrency-Safe Grouping & Atomic Upsert Engine

When high-frequency events occur (such as 100 readers liking an article simultaneously), concurrent worker threads must not insert duplicate rows.

### Concurrency-Safe Grouping Mechanism
- **Group Key**: Formatted as `group:<recipientId>:<eventType>:<resourceId>:<dateWindow>` (e.g. `group:usr-1:ARTICLE_LIKED:art-99:20260902`).
- **PostgreSQL Atomic Upsert**:
  ```sql
  -- Partial unique index guaranteeing exactly one active unread notification per group
  CREATE UNIQUE INDEX idx_notifications_active_group 
  ON cms_notifications (user_id, group_key) 
  WHERE is_read = FALSE AND group_key IS NOT NULL;

  -- Atomic upsert
  INSERT INTO cms_notifications (
      user_id, actor_id, actor_name, actor_avatar, actor_count, 
      actors_summary, group_key, type, title, message, resource_type, 
      resource_id, resource_slug, is_read, created_at, updated_at
  ) VALUES (
      $1, $2, $3, $4, 1, 
      $5::jsonb, $6, $7, $8, $9, $10, 
      $11, $12, FALSE, NOW(), NOW()
  )
  ON CONFLICT (user_id, group_key) WHERE is_read = FALSE AND group_key IS NOT NULL
  DO UPDATE SET
      actor_count = cms_notifications.actor_count + 1,
      actor_name = EXCLUDED.actor_name,
      actors_summary = jsonb_insert(
          cms_notifications.actors_summary, '{0}', 
          jsonb_build_object('id', EXCLUDED.actor_id, 'name', EXCLUDED.actor_name), true
      ),
      message = EXCLUDED.message,
      updated_at = NOW();
  ```

- **MongoDB Atomic Upsert**:
  ```typescript
  await this.notificationModel.findOneAndUpdate(
    { userId, groupKey, isRead: false },
    {
      $inc: { actorCount: 1 },
      $set: { message, actorName, updatedAt: new Date() },
      $push: { actorsSummary: { $each: [{ id: actorId, name: actorName }], $position: 0, $slice: 5 } },
      $setOnInsert: { userId, actorId, type, title, resourceType, resourceId, resourceSlug, isRead: false, createdAt: new Date() }
    },
    { upsert: true, new: true }
  );
  ```

---

## 8. Actor Privacy, Account Deletion & Snapshot Preservation

1. **Immutable Historical Snapshot**:
   - `actor_name` and `actor_avatar` are captured at the time of event generation.
2. **Account Deletion / Suspension**:
   - In PostgreSQL, foreign key `actor_id` references `users(id) ON DELETE SET NULL`.
   - If an actor deletes their profile, existing notification rows remain fully readable with their snapshot text.
   - If user explicitly invokes Right to be Forgotten (GDPR), an anonymization job rewrites the snapshot to *"A former reader"*.

---

## 9. Delivery Status & Channel Observability

Every notification tracks its multi-channel delivery lifecycle:

```typescript
export enum DeliveryStatus {
  PENDING = 'PENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  PARTIAL = 'PARTIAL',
}

export interface NotificationDeliveryAudit {
  deliveryStatus: DeliveryStatus;
  inAppDeliveredAt?: string | null;
  emailDeliveredAt?: string | null;
  pushDeliveredAt?: string | null;
  deliveryErrors?: Array<{
    channel: 'inApp' | 'email' | 'browserPush';
    error: string;
    timestamp: string;
  }>;
}
```

---

## 10. Redis Acceleration, Deduplication & Real-Time SSE Delivery

Redis provides sub-millisecond coordination across cluster nodes:

### 1. Robust Deduplication
```
Key Pattern: dedup:notif:<recipientId>:<eventType>:<resourceId>:<actorId>
TTL: 86400 seconds (24 Hours)
```
- Set using `SET key "1" NX EX 86400`.
- If key exists, the worker safely skips processing without database write.

### 2. Fast Unread Counter with Authoritative Reconciliation
```
Key Pattern: notif:unread:<userId>
Type: String (Integer Counter)
TTL: 604800 seconds (7 Days)
```
- **On New Notification**: `INCR notif:unread:<userId>`
- **On Single Read**: `DECR notif:unread:<userId>` (guarded with `Math.max(0, val)`)
- **On Mark All Read**: `SET notif:unread:<userId> 0`
- **Reconciliation Policy**: If the key is missing in Redis, execute `SELECT COUNT(*) FROM cms_notifications WHERE user_id = $1 AND is_read = false`, populate Redis with a 7-day TTL, and return the database count.

### 3. Real-Time Server-Sent Events (SSE) Stream
- **Client Route**: `GET /api/notifications/stream`
- **Server Mechanics**: Client opens persistent HTTP connection. NestJS SSE controller listens to Redis Pub/Sub channel `cms:channel:notifications:<userId>`.
- **Payload Broadcast**:
```json
{
  "event": "NOTIFICATION_RECEIVED",
  "data": {
    "notification": {
      "id": "notif-uuid",
      "type": "ARTICLE_PUBLISHED",
      "title": "Story Published",
      "message": "Your manuscript 'Scaling Redis' is live.",
      "resourceSlug": "scaling-redis",
      "createdAt": "2026-09-02T00:00:00.000Z"
    },
    "unreadCount": 4
  }
}
```

---

## 11. Multi-Database Schema Specifications

### PostgreSQL Table Definition (`cms_notifications`)
```sql
CREATE TABLE IF NOT EXISTS cms_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
    actor_name VARCHAR(255) NOT NULL,
    actor_avatar TEXT,
    actor_count INT NOT NULL DEFAULT 1,
    actors_summary JSONB DEFAULT '[]'::jsonb,
    group_key VARCHAR(255),
    type VARCHAR(64) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    resource_type VARCHAR(64) NOT NULL,
    resource_id UUID NOT NULL,
    resource_slug VARCHAR(255),
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    read_at TIMESTAMPTZ,
    delivery_status VARCHAR(32) NOT NULL DEFAULT 'SENT',
    in_app_delivered_at TIMESTAMPTZ DEFAULT NOW(),
    email_delivered_at TIMESTAMPTZ,
    push_delivered_at TIMESTAMPTZ,
    delivery_errors JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Compound index for user inbox & unread badge
CREATE INDEX IF NOT EXISTS idx_notifications_user_inbox 
ON cms_notifications (user_id, is_read, created_at DESC);

-- Unique constraint for active unread grouped notifications
CREATE UNIQUE INDEX IF NOT EXISTS idx_notifications_active_group 
ON cms_notifications (user_id, group_key) 
WHERE is_read = FALSE AND group_key IS NOT NULL;
```

### PostgreSQL Push Subscriptions Table (`cms_push_subscriptions`)
```sql
CREATE TABLE IF NOT EXISTS cms_push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_user_push_endpoint UNIQUE (user_id, endpoint)
);
```

### MongoDB Notification Document Schema (`notifications`)
```typescript
@Schema({ collection: 'notifications', timestamps: true })
export class NotificationDocument extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  actorId?: string;

  @Prop({ required: true })
  actorName: string;

  @Prop()
  actorAvatar?: string;

  @Prop({ default: 1 })
  actorCount: number;

  @Prop({ type: Array, default: [] })
  actorsSummary: Array<{ id: string; name: string; avatar?: string }>;

  @Prop({ index: true })
  groupKey?: string;

  @Prop({ required: true, enum: NotificationType })
  type: string;

  @Prop({ required: true })
  title: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true })
  resourceType: string;

  @Prop({ required: true })
  resourceId: string;

  @Prop()
  resourceSlug?: string;

  @Prop({ default: false, index: true })
  isRead: boolean;

  @Prop()
  readAt?: Date;

  @Prop({ default: 'SENT' })
  deliveryStatus: string;

  @Prop({ default: Date.now })
  inAppDeliveredAt: Date;

  @Prop()
  emailDeliveredAt?: Date;

  @Prop()
  pushDeliveredAt?: Date;

  @Prop({ type: Array, default: [] })
  deliveryErrors: Array<{ channel: string; error: string; timestamp: string }>;
}

export const NotificationSchema = SchemaFactory.createForClass(NotificationDocument);
NotificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
NotificationSchema.index({ userId: 1, groupKey: 1, isRead: 1 }, { unique: true, partialFilterExpression: { isRead: false, groupKey: { $exists: true } } });
```

---

## 12. Cursor-Based API Contracts

All endpoints enforce user authorization and use deterministic cursor pagination (`created_at` timestamp / UUID):

### 1. `GET /api/notifications`
- **Query Parameters**:
  - `cursor` (string, ISO timestamp or item ID for forward pagination)
  - `limit` (number, default: `20`, max: `50`)
  - `unreadOnly` (boolean, optional)
- **Response**:
```json
{
  "items": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "type": "ARTICLE_LIKED",
      "actorCount": 14,
      "title": "Story Engagement",
      "message": "Sarah Chen, Eleanor Vance, and 12 others liked your story 'Scaling Distributed Redis'.",
      "resourceType": "article",
      "resourceId": "art-99",
      "resourceSlug": "scaling-distributed-redis",
      "isRead": false,
      "readAt": null,
      "deliveryStatus": "SENT",
      "createdAt": "2026-09-02T00:15:00.000Z"
    }
  ],
  "nextCursor": "2026-09-02T00:15:00.000Z_123e4567",
  "hasMore": true,
  "unreadCount": 3
}
```

### 2. `GET /api/notifications/unread-count`
- **Response**: `{ "unreadCount": 3 }` (Serviced from Redis in `< 1ms`).

### 3. `PATCH /api/notifications/:id/read`
- **Response**: `{ "id": "123e4567", "isRead": true, "readAt": "2026-09-02T00:20:00.000Z" }`.

### 4. `POST /api/notifications/mark-all-read`
- **Response**: `{ "success": true, "markedCount": 3 }`.

### 5. `GET /api/notifications/preferences` & `PATCH /api/notifications/preferences`
- **Summary**: Retrieve and update user notification delivery toggles.

### 6. `POST /api/notifications/push-subscription`
- **Summary**: Register or update browser Web Push subscription (`endpoint`, `p256dh`, `auth`).

### 7. `GET /api/notifications/stream`
- **Summary**: Server-Sent Events stream for instant in-app alerts.

---

## 13. Frontend Notification Center UI/UX Specification

### 1. Public & Site Header Integration
- **Bell Button**: Integrated into `PublicHeader.tsx` and `SiteHeader.tsx` beside the user avatar profile.
- **Unread Badge**: Pill counter in crimson (`bg-accent-crimson text-white`) displaying exact unread count (e.g., `3` or `99+`).
- **Live Stream**: Establishes `EventSource('/api/notifications/stream')` on mount. Reconnects automatically with exponential backoff on network disconnects.

### 2. Notification Center Sliding Drawer
- **Drawer Architecture**: Right-anchored sliding modal overlay with newspaper styling and smooth 250ms CSS slide animation.
- **Tabs**: `All Dispatches` vs `Unread Only`.
- **Item Interactions**:
  - **Clicking an Item**: Marks that specific notification as read, transitions visual state, and navigates directly to the target story or comment thread.
  - **Visible-Only Read Policy**: Opening the drawer does **not** automatically clear unread states; items remain unread until clicked or explicitly dismissed via "Mark all as read".
- **Batch Actions**: "Mark all as read" button with instant local cache optimistic update.
- **Empty State**: Journalistic placeholder reading *"All caught up. No unread dispatches at the desk."*

---

## 14. Data Retention, Archival & Admin Governance

### Retention Schedule
- **Unread Notifications**: Retained indefinitely (up to 365 days max).
- **Read Notifications**: Auto-purged after 90 days via daily maintenance cron.
- **System Announcements**: Retained for 365 days.

### Admin Governance Tools (Admin Panel)
1. **System Announcement Broadcast**: Admin UI to compose and dispatch platform announcements to all active readers and authors.
2. **Notification Queue Monitor**: Direct integration with the BullMQ Admin telemetry dashboard to inspect active jobs, delayed retries, and dead-letter queue failures.

---

## 15. Step-by-Step Implementation Roadmap

```
[ PHASE 1: Domain & Repositories ]
  ├── 1.1: Define NotificationType, NotificationItem, NotificationPreferences, DeliveryStatus in models.ts
  ├── 1.2: PostgreSQL schema migration (cms_notifications, cms_notification_preferences, cms_push_subscriptions)
  ├── 1.3: MongoDB Mongoose schemas (NotificationSchema, NotificationPreferencesSchema, PushSubscriptionSchema)
  └── 1.4: Repositories (PostgresNotificationRepository, MongoNotificationRepository)

[ PHASE 2: Backend Notifications Module ]
  ├── 2.1: NotificationsService (preference checks, Redis dedup, unread counter, atomic grouping)
  ├── 2.2: NotificationsController (REST endpoints for list, count, read, preferences, push subscriptions)
  ├── 2.3: NotificationsSseController (GET /notifications/stream Server-Sent Events)
  └── 2.4: Unit & regression test suites (notifications.service.spec.ts)

[ PHASE 3: Domain Event Triggers ]
  ├── 3.1: Hook WorkflowService on article approval, revision request, publication
  ├── 3.2: Hook CommentsService on top-level comments and threaded replies
  ├── 3.3: Hook LikesService on article likes (with atomic grouping)
  └── 3.4: Hook FollowsService on new author followers

[ PHASE 4: Frontend Notification Center UI ]
  ├── 4.1: NotificationDrawer component with filter tabs, cursor pagination, mark read
  ├── 4.2: Header Bell button in PublicHeader & SiteHeader with live unread badge
  ├── 4.3: User Notification Preferences modal in Profile settings
  └── 4.4: Live browser verification & end-to-end event flow testing
```

---

*Specification frozen under `notification.md` and synced to `document_2/notification.md`.*
