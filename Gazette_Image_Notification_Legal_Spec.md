# The Gazette — Feature Specification

## Scope
Production-oriented specification for three feature areas:
1. Image Intelligence & Media Optimization
2. Notification Center + Admin-to-User Messaging
3. Account + Legal + Privacy + Recovery

---

# 1. Image Intelligence & Media Optimization

## Objective
Build a reliable media pipeline that securely validates editorial images, preserves the original master, generates optimized delivery variants, stores image metadata, and performs expensive transformations asynchronously.

## Architecture

```text
Client Upload
    ↓
Upload / Security Gate
    ↓
Magic-byte + File Validation
    ↓
Temporary Disk / Stream
    ↓
Media Record = PROCESSING
    ↓
BullMQ Image Processing Job
    ↓
Image Worker
    ├── Image Inspection
    ├── Policy Evaluation
    ├── Sharp Processing
    ├── Variant Generation
    └── Object Storage
    ↓
Media Record = READY
    ↓
CDN Delivery
```

The original image is the permanent editorial master. Optimized variants are derived assets.

## Upload Requirements
- Support large production uploads without loading the complete file into Node memory.
- Maximum upload size may be 100 MB.
- Do not use `file.buffer` for 100 MB uploads.
- Prefer temporary disk/stream handling initially.
- Keep a future path open for direct-to-object-storage uploads.
- Validate declared MIME type and actual file signature.
- Reject spoofed extensions and mismatched magic bytes.
- Reject malicious/unsupported SVG content.
- Protect against resource exhaustion.
- Enforce a configurable megapixel limit; 40 MP can be the initial ceiling.
- Store upload metadata and processing state.

## Image Variants

| Variant | Max long edge |
|---|---:|
| Thumbnail | 320 px |
| Card | 800 px |
| Article | 1600 px |
| Hero | 2400 px |

These are maximum dimensions, not guarantees that every source will be resized to exactly that width.

## Optimization
Use Sharp for deterministic processing:
- WebP conversion
- Resize
- Quality-controlled compression
- Metadata extraction
- Orientation handling
- Transparency preservation
- Limited sharpening where appropriate

Lanczos resizing/sharpening is classical image processing, not AI super-resolution. It cannot recreate genuinely missing detail.

AI super-resolution should remain a future, separately evaluated worker.

## Image Policy
Do not judge quality only by file size. Consider:
- Bytes
- Width/height
- Megapixels
- Format
- Alpha/transparency
- Orientation
- Usage
- Existing quality
- Processing constraints

Recommended usage profiles:
`HERO`, `ARTICLE`, `CARD`, `THUMBNAIL`, `EDITORIAL`, `AVATAR`, `COVER`.

## Processing States

```text
UPLOADED
VALIDATING
PROCESSING
READY
FAILED
```

The API may return `PROCESSING` while the worker runs.

Frontend must provide upload/processing/ready/failure states. SSE can signal completion; polling is a fallback.

## Media Metadata

```text
id
originalFilename
mimeType
fileSize
width
height
aspectRatio
usageProfile
processingStatus
storageKey
cdnUrl
variant metadata
optimizerVersion
createdAt
updatedAt
```

Each variant should retain its storage key, dimensions, size, MIME type, and optimizer version.

## Storage
Use object storage/CDN for production media. Databases store metadata/references, not large media bytes. Development may use local storage.

## Reliability
Image processing must run through bounded BullMQ workers.

```text
HTTP request
   ↓
Create media record
   ↓
Enqueue job
   ↓
Return PROCESSING
```

Worker:

```text
Inspect → Policy → Transform → Upload → Metadata → READY
```

Jobs must be retryable, idempotent, observable, and concurrency-bounded. Storage failure must never incorrectly produce `READY`.

## Security Tests
- Invalid magic bytes
- MIME spoofing
- Corrupt images
- Oversized bytes
- Oversized dimensions
- Excessive megapixels
- Malicious SVG
- Unsupported formats
- EXIF/orientation edge cases
- Transparency
- Worker failure/retry
- Duplicate job execution
- Object-storage failure

Avoid unrestricted `dangerouslySetInnerHTML`.

## Editorial Quality
Preserve the original master. Do not automatically apply aggressive contrast normalization or transformations that may change editorial intent.

## Acceptance Checklist
- [ ] Original master preserved
- [ ] Large uploads do not require a 100 MB Node memory buffer
- [ ] Actual file type validated
- [ ] 40 MP limit configurable
- [ ] Processing asynchronous
- [ ] Worker retries safe/idempotent
- [ ] Hero/article/card/thumbnail variants generated
- [ ] WebP optimization verified
- [ ] Width/height/aspect ratio stored
- [ ] Processing state visible
- [ ] Failure cannot produce false READY
- [ ] Original remains recoverable
- [ ] Security matrix passes
- [ ] CDN/object storage verified
- [ ] Frontend reserves dimensions to minimize CLS

---

# 2. Notification Center + Admin-to-User Messaging

## Objective
Create a unified Gazette Inbox where users receive system notifications, admin announcements, and direct messages.

The UI can be unified, but the backend concepts must remain separate.

## Three Concepts

### Notifications
System-generated events:
- Article approved/rejected
- Comment activity
- Mentions
- Security alerts
- Password changes
- New-login alerts
- Publishing status changes

### Admin Broadcasts
Admin-to-many communication.

Audience types:
```text
ALL_USERS
ROLE:READER
ROLE:AUTHOR
ROLE:EDITOR
SPECIFIC_USERS
```

### Direct Messages
Persistent conversation-based messaging such as:
```text
Admin ↔ Author
Admin ↔ Reader
Editor ↔ Author
```

## Architecture

```text
                         ┌── Notifications
                         │
REST API ────────────────┼── Admin Broadcasts
                         │
                         └── Direct Messages
                                  ↓
                              Database
                                  ↓
                              BullMQ
                                  ↓
                              Redis
                                  ↓
                               SSE
                                  ↓
                         Gazette Inbox
```

**Database = source of truth.** Realtime transport only accelerates delivery. Offline users retrieve persisted data through REST.

## WebSocket Decision
Do not introduce WebSocket for V1.

Use existing SSE for:
- Notification arrival
- Announcement signals
- New-message signals
- Inbox count changes

Use REST for:
- Fetching
- Sending
- Pagination
- Editing/deleting where permitted
- Marking read
- Searching

WebSocket can be considered later for true bidirectional features:
- Typing indicators
- Presence
- Advanced live chat events
- Advanced read receipts/reactions

## REST Examples

```text
GET    /notifications
POST   /notifications/:id/read
POST   /notifications/read-all

GET    /conversations
GET    /conversations/:id/messages
POST   /conversations/:id/messages

POST   /admin/broadcasts
GET    /admin/broadcasts
POST   /admin/broadcasts/:id/send
```

Route names should follow existing NestJS conventions.

## SSE Events

```text
notification.created
announcement.created
message.created
message.updated
inbox.count.changed
```

SSE events are signals; they are not the authoritative message store.

## Data Models

### Conversation
```text
id
type
createdBy
createdAt
updatedAt
status
```

### ConversationParticipant
```text
id
conversationId
userId
role
joinedAt
lastReadMessageId
lastReadAt
```

### Message
```text
id
conversationId
senderId
messageType
body
createdAt
updatedAt
deletedAt
replyToMessageId
status
```

Initial message types:
`TEXT`, `ANNOUNCEMENT`, `SYSTEM`, `EDITORIAL`, `WARNING`

Optional action:
```text
{
  label,
  url
}
```

Attachments should later use media IDs/object-storage references, not binary message rows.

### Broadcast
```text
id
createdBy
title
body
audienceType
audienceDefinition
status
createdAt
scheduledAt
sentAt
```

## Broadcast Processing

Never synchronously loop through thousands of users in the admin HTTP request.

```text
Admin POST
   ↓
Create Broadcast
   ↓
Return 201
   ↓
BullMQ Job
   ↓
Resolve Audience
   ↓
Create Delivery / Notification Records
   ↓
Redis Signaling
   ↓
SSE
```

This makes large broadcasts retryable and keeps the request path short.

## UI

Suggested Gazette Inbox:

```text
All
Notifications
Announcements
Messages
```

The interface should retain The Gazette's editorial design language rather than becoming a generic SaaS chat dashboard.

## Message Composition
V1:
- Plain text
- Announcement title
- Optional action link
- Character limits
- Send confirmation
- Draft protection where appropriate

Do not permit unrestricted HTML. Sanitize controlled rich content if introduced later.

## Permissions
Server-side authorization is mandatory.

Example:
```text
Super Admin → Broadcast + Direct Message + Moderation
Editor       → Only explicitly granted capabilities
Author       → Only permitted messaging actions
Reader       → Receive messages
```

## Rate Limiting
Protect:
- Message sending
- Broadcast creation/sending
- Conversation creation
- Message search
- Notification operations

Broadcast sending should have stronger limits and confirmation.

## Audit Events

```text
BROADCAST_CREATED
BROADCAST_SENT
DIRECT_MESSAGE_SENT
MESSAGE_DELETED
CONVERSATION_CREATED
```

## Reliability
Support:
- Idempotent broadcast jobs
- Retryable delivery signals
- Redis failure without message loss
- SSE reconnect
- Duplicate-event tolerance
- Queue dead-letter handling
- Notification preference enforcement
- Offline recovery through REST

## V1 Exclusions
Do not add initially:
- Typing indicators
- Presence
- Per-message read receipts
- Reactions
- Voice/video calls
- WebSocket infrastructure

## Acceptance Checklist
- [ ] Notification Center implemented
- [ ] System notifications separate from chat
- [ ] Broadcasts separate from direct messages
- [ ] Messages persisted
- [ ] REST authoritative
- [ ] SSE realtime signals working
- [ ] Offline recovery works
- [ ] Broadcasts use BullMQ
- [ ] Permissions enforced server-side
- [ ] Message content controlled/sanitized
- [ ] Rate limiting implemented
- [ ] Admin actions audited
- [ ] Redis failure does not lose persisted messages
- [ ] Duplicate events tolerated
- [ ] 2,000-user broadcast tested
- [ ] 500+ SSE connections regression-tested
- [ ] WebSocket not added without a concrete requirement

---

# 3. Account + Legal + Privacy + Recovery

## Objective
Complete the Gazette account lifecycle, legal-policy system, privacy controls, consent management, recovery flows, and security controls.

These must be backend-backed systems, not frontend-only pages or checkboxes.

## Authentication & Account

Existing:
- Login
- Register
- Forgot Password
- Reset Password
- Logout

Complete with:
- Email verification
- Google Sign-In
- Logout all devices
- Remember this device
- Active sessions/devices
- Change password
- Account deactivation
- Account deletion
- Re-authentication for sensitive actions

## Email Verification
- Expiring verification token
- Single-use token
- Safe/idempotent repeated verification
- Rate-limited resend
- Audit verification event

## Password Recovery

```text
Forgot Password
      ↓
Rate-Limited Request
      ↓
Generic Response
      ↓
Email Reset Link
      ↓
Single-Use Expiring Token
      ↓
Password Reset
      ↓
Appropriate Session Revocation
      ↓
Password Changed Alert
```

Forgot-password responses must prevent account enumeration.

## Password Security
Use the Gazette native authentication architecture with **Argon2id**.

Never expose password hashes, reset tokens, or authentication secrets.

## Session Management

Recommended session fields:
```text
id
userId
createdAt
lastSeenAt
expiresAt
revokedAt
device information
login context
```

Users can:
- View active sessions
- Revoke a session
- Logout all other devices
- Logout all devices

Revocation must be enforced server-side.

## Remember This Device
Use secure persistent session/token handling:
- Secure cookies
- HttpOnly where appropriate
- SameSite policy
- Rotation
- Revocation
- Expiration

## Re-authentication
Require recent authentication for sensitive actions such as:
- Change password
- Change email
- Delete account
- Export sensitive account data
- Security-sensitive settings

Backend enforcement is mandatory.

## Google Sign-In
Google identity should be linked to the existing Gazette user.

```text
User
 ├── Password Credential
 └── Google Identity
```

Account-linking must prevent duplicate identities and accidental account takeover.

---

# 3.1 Versioned Legal Policy System

Policy types:

```text
TERMS
PRIVACY
COOKIES
COMMUNITY
CONTENT
COPYRIGHT
ACCEPTABLE_USE
```

Policy:

```text
id
type
version
title
content
status
publishedAt
effectiveAt
```

PolicyAcceptance:

```text
id
userId
policyId
version
acceptedAt
ipAddress
userAgent
```

The backend records the accepted policy version. A frontend checkbox alone is insufficient.

## Policy Versioning

```text
v1.0
 ↓
v1.1
 ↓
v2.0
```

The system must retain historical versions as required by the final legal/retention policy and determine whether a newer acceptance is required.

## Legal Pages
Create actual pages for:
- Terms & Conditions
- Privacy Policy
- Cookie Policy
- Community Guidelines
- Content/Publishing Policy
- Copyright/DMCA Policy
- Acceptable Use Policy

Link them from the footer, registration, and relevant forms.

**Final contractual wording must be reviewed by the client/legal advisor.**

---

# 3.2 Registration Consent

Registration should include explicit controls:

```text
[ ] I agree to the Terms & Conditions
[ ] I acknowledge the Privacy Policy
```

The backend records the policy versions accepted.

---

# 3.3 Cookie Consent

Separate:

```text
Necessary
Optional / Analytics
Optional / Functional
Optional / Marketing
```

Necessary authentication/security cookies are required for core functionality.

Optional analytics must not start merely because a page loaded.

Banner:
```text
Accept All
Reject Optional
Manage Preferences
```

Users must be able to change/withdraw optional consent later.

---

# 3.4 Privacy Settings

Recommended:

```text
Privacy
├── Cookie Preferences
├── Data Export
├── Account Deletion
├── Content Controls
└── Privacy Preferences
```

Final controls should follow legal/product requirements.

---

# 3.5 Data Export

Use an asynchronous export workflow:

```text
Request Export
      ↓
Authorization / Re-authentication
      ↓
Create Export Job
      ↓
BullMQ
      ↓
Collect Permitted Data
      ↓
Generate Export
      ↓
Secure Temporary Storage
      ↓
Temporary Download
      ↓
Expiry / Cleanup
```

Exports must be access-controlled, temporary, non-guessable, and automatically cleaned up.

---

# 3.6 Account Deletion

Define treatment for:

```text
User profile
Articles
Drafts
Revisions
Comments
Messages
Notifications
Bookmarks
Media
Analytics
Audit records
Policy acceptances
```

Each category should be classified as:

```text
DELETE
ANONYMIZE
RETAIN
DETACH
```

The final choice must follow product/legal requirements.

Deletion should require:
1. Authentication
2. Re-authentication where appropriate
3. Explicit confirmation
4. Server-side workflow
5. Appropriate audit record
6. Related-data cleanup/anonymization
7. Session revocation

Do not automatically destroy records that must legally/operationally be retained.

---

# 3.7 Account Deactivation

Deactivation is different from deletion.

Define behavior for:
- Login
- Existing sessions
- Published content
- Drafts
- Comments
- Messages
- Notifications

The inactive state must be enforced by the backend.

---

# 3.8 Security Alerts

Integrate account security with the Gazette Inbox.

Events:

```text
LOGIN_SUCCESS
LOGIN_FAILED
LOGOUT
LOGOUT_ALL
PASSWORD_CHANGED
PASSWORD_RESET_REQUESTED
PASSWORD_RESET_COMPLETED
EMAIL_VERIFIED
EMAIL_CHANGED
SESSION_REVOKED
ACCOUNT_DEACTIVATED
ACCOUNT_DELETED
POLICY_ACCEPTED
CONSENT_CHANGED
```

User-facing examples:
- New login detected
- Password changed
- Session revoked
- Email address changed

Security audit logs and user-facing notifications are related but distinct.

---

# 3.9 Suspicious Login Handling

Support detection of suspicious conditions using configurable signals such as:
- Unusual login context
- Repeated failed attempts
- Rapid login attempts
- Session anomalies

Possible responses:
- Rate limiting
- Additional verification
- Security notification
- Session revocation
- Temporary protection

Do not expose sensitive detection logic.

---

# 3.10 Audit Logging

Sensitive operations must create audit records.

Never log:
- Passwords
- Raw reset tokens
- Session secrets
- Other authentication secrets

---

# 3.11 Footer

```text
The Gazette

About
Contact
Help

Terms
Privacy
Cookies
Community Guidelines
Copyright

© 2026 The Gazette
```

All links should route to real application pages.

---

# 3.12 Error & Help Pages

Create contextual experiences for:

```text
404 Not Found
403 Access Denied
429 Too Many Requests
500 Server Error
Maintenance
Offline / Connection Lost
```

Do not expose raw backend errors as the primary user experience.

Explain what happened, what the user can do, whether retrying is appropriate, and where they can go next.

---

# 3.13 Account Settings

```text
Account Settings
│
├── Profile
│
├── Security
│   ├── Change Password
│   ├── Active Sessions
│   ├── Security Alerts
│   └── Re-authentication
│
├── Privacy
│   ├── Cookie Preferences
│   ├── Export Data
│   └── Delete Account
│
└── Notifications
    ├── Email Preferences
    ├── Browser Notifications
    └── Gazette Inbox Preferences
```

Use the Gazette editorial design system rather than generic SaaS dashboard patterns.

## Security Requirements
Verify:
- CSRF protection
- CORS restrictions
- Secure cookies
- HttpOnly cookies where applicable
- SameSite configuration
- Rate limiting
- Session rotation/revocation
- Argon2id password hashing
- Reset-token expiry/single-use
- Email-verification expiry
- Anti-enumeration
- Re-authentication
- RBAC
- Audit logging
- Secret protection
- XSS protection
- Dependency/security scanning

## Acceptance Checklist

### Authentication
- [ ] Email verification works
- [ ] Verification tokens expire and are single-use
- [ ] Password reset works with expiring single-use tokens
- [ ] Reset requests are rate-limited
- [ ] Forgot-password responses prevent enumeration
- [ ] Change password works
- [ ] Active sessions are visible
- [ ] Sessions can be revoked
- [ ] Logout all devices works
- [ ] Sensitive actions require appropriate re-authentication
- [ ] Google Sign-In links to the existing Gazette identity
- [ ] Security events create appropriate audit/notification records

### Legal
- [ ] All policy pages exist
- [ ] Policies are versioned
- [ ] Effective dates are stored
- [ ] Acceptance is recorded server-side
- [ ] Historical versions are traceable
- [ ] Registration records Terms/Privacy acceptance
- [ ] Footer links work
- [ ] Legal wording is client/legal-reviewed

### Privacy
- [ ] Cookie consent banner exists
- [ ] Accept All works
- [ ] Reject Optional works
- [ ] Manage Preferences works
- [ ] Optional analytics waits for required consent
- [ ] Consent can be changed/withdrawn
- [ ] Data export works
- [ ] Export downloads are temporary/protected
- [ ] Account deletion is protected and confirmed
- [ ] Delete/anonymize/retain rules are defined
- [ ] Notification preferences work

### Security & Recovery
- [ ] New-login alerts work where applicable
- [ ] Password-changed alerts work
- [ ] Session revocation is enforced server-side
- [ ] Deactivation is enforced
- [ ] Deletion revokes active sessions
- [ ] Sensitive operations are audited
- [ ] Secrets never appear in audit logs/API responses
- [ ] 403/404/429/500/maintenance/offline pages are user-friendly

---

# 4. Integration Between the Three Features

## Image → Editorial Content

```text
Media Library
    ↓
Image Intelligence
    ↓
Optimized Media Variants
    ↓
Editorial Studio
    ↓
Article
    ↓
Public Reader
```

The editor should reference media IDs rather than binary files.

## Account Security → Notifications

```text
Login / Password / Session Event
             ↓
       Security Event
             ↓
       Notification
             ↓
       Gazette Inbox
```

Audit logging and user-facing notifications remain distinct.

## Admin → Broadcast → Inbox

```text
Admin
  ↓
Create Broadcast
  ↓
BullMQ
  ↓
Notification Records
  ↓
Redis
  ↓
SSE
  ↓
User Gazette Inbox
```

## Admin → Direct Message

```text
Admin
  ↓
REST
  ↓
Conversation + Message
  ↓
Database
  ↓
SSE Signal
  ↓
User Inbox
```

If offline:

```text
User reconnects
      ↓
REST fetch
      ↓
Persisted messages appear
```

No message may depend on an active SSE connection to exist.

---

# 5. Production Testing

## Image
Test valid/invalid files, MIME spoofing, SVG attacks, corruption, large files/dimensions, 40 MP boundary, variants, worker retry/crash, storage failure, duplicate jobs, metadata, and CDN delivery.

## Notifications
Test notifications, unread counts, mark read, broadcasts, 2,000-user broadcasts, direct messages, pagination, offline recovery, SSE reconnect, Redis outage, duplicate events, queue retry, permissions, and rate limiting.

## Account / Legal
Test registration, verification, expired tokens, password recovery, reused tokens, enumeration protection, password changes, logout/all devices, session revocation, Google linking, re-authentication, deactivation/deletion, export, policy acceptance/versioning, cookie consent/withdrawal, security alerts, and contextual error pages.

---

# 6. Performance & Scalability

The Gazette's existing architecture must be preserved.

Required principles:
- Never synchronously fan out broadcasts to thousands of users.
- Never store large media bytes in application databases.
- Do not introduce WebSockets without a concrete requirement.
- Use BullMQ for expensive/background work.
- Use Redis for appropriate signaling/deduplication/queue infrastructure.
- Keep ClickHouse analytics decoupled from transactional paths.
- Keep SSE events small and coalesced.
- Paginate messages and notifications.
- Bound worker concurrency.
- Make background jobs retryable/idempotent.
- Database remains authoritative.

Local benchmark results must not be presented as universal production capacity.

---

# 7. Existing Gazette Technology Context

```text
Frontend
- React
- TypeScript
- Vite
- TanStack Query
- Zustand
- React Hook Form
- Motion

Backend
- NestJS
- Native authentication
- Argon2id
- JWT/session strategy
- BullMQ
- Redis

Data
- PostgreSQL
- MongoDB
- MariaDB
- MySQL
- CockroachDB
- ClickHouse

Infrastructure
- Cloudflare
- Object Storage / Cloudinary
- Resend
- OpenTelemetry
- Sentry
```

Dependency rule: every new dependency must solve a concrete problem and fit the existing architecture.

---

# 8. Implementation Order

```text
1. Image Intelligence / Media Optimization
       ↓
2. Account + Legal + Privacy + Recovery
       ↓
3. Gazette Inbox / Admin Messaging
       ↓
4. Integration Testing
       ↓
5. Performance Optimization
       ↓
6. Final 2,000 Reader + 500 SSE Load Test
       ↓
7. Security / Backup / DR Verification
       ↓
8. Cloud Deployment
       ↓
9. Production Verification
```

A feature is **not verified** merely because TypeScript compilation or a production build succeeds. Runtime, integration, failure-path, security, accessibility, and relevant load tests are required.

---

# 9. Final Definition of Done

All three feature areas are complete only when:
- Backend APIs exist and are authorization-protected.
- Frontend flows are implemented.
- Data models and migrations are verified.
- Background jobs are retryable/idempotent.
- Security controls are tested.
- Failure/offline behavior is tested.
- Audit events are implemented where required.
- Accessibility is verified.
- Mobile behavior is verified.
- Existing Redis/SSE architecture remains stable.
- Six-database continuity is not broken.
- Automated tests pass.
- Runtime integration tests pass.
- Relevant load tests pass.
- Documentation matches the actual implementation.
- No feature is declared production-ready from a build alone.

---

## Product Principle

The Gazette should behave like a serious publication platform, not a generic SaaS dashboard.

**Editorial quality → Data integrity → Security → Reliability → Performance → Realtime convenience → Visual effects**

Core functionality comes before decorative complexity.
