# The Gazette — Master Architecture Map

> **Document type:** Master architecture / boundary contract
> **Project:** Gazette — Full-Stack Editorial Publication Platform
> **Repository:** `adarshaldkar/CMS-Content_management_system`
> **Branch reviewed:** `main`
> **Review date:** 2026-09-17
> **Status:** Architecture baseline / freeze candidate
>
> This document separates **verified repository structure**, **implemented architectural building blocks**, and **planned/unfinished capabilities**. It must not be used to claim that a feature is production-complete merely because a specification exists.

---

## 0. Status vocabulary

- **BUILT** — corresponding source/module/page exists in the repository and is wired into the application where applicable.
- **PARTIAL** — building blocks exist, but one or more resilience, correctness, security, operational, or completeness requirements remain.
- **PLANNED** — architecture/specification exists, but production implementation is not yet verified.
- **VERIFY** — repository evidence exists, but the exact implementation depth still requires targeted source review or runtime validation.

**Important:** BUILT means "code exists" here; it does **not** mean "production-complete".

---

# 1. Product identity

## 1.1 Product definition

The Gazette is a **publication operating system** rather than a basic CRUD CMS. It combines:

1. Public editorial publication
2. Author/editor writing studio
3. Editorial workflow and revision governance
4. Reader engagement/social features
5. Media and document ingestion
6. Notifications and real-time updates
7. Analytics and reading intelligence
8. Administration/governance
9. Multi-database persistence mesh
10. Background processing and operational tooling
11. Security, audit, reliability, and recovery controls
12. Automated end-to-end and platform testing

## 1.2 Primary personas

| Persona | Primary surface | Main responsibilities |
|---|---|---|
| Reader | Public Site | Discover, read, like, bookmark, comment, follow, share |
| Author | Editorial Studio | Create, edit, autosave, recover, submit stories |
| Editor | Editorial Governance | Review, annotate, edit, approve, schedule, publish |
| Admin / SuperAdmin | Control Plane | Users, taxonomy, media, jobs, audit, DB mesh, governance |

---

# 2. System topology

```text
                                    THE GAZETTE
                                         |
             +---------------------------+----------------------------+
             |                           |                            |
             v                           v                            v
       PUBLICATION SITE          EDITORIAL STUDIO              ADMIN CONTROL PLANE
       Reader experience         Author / Editor workspace      Governance / Operations
             |                           |                            |
             +---------------------------+----------------------------+
                                         |
                                         v
                                  NestJS HTTP API
                                         |
                    +--------------------+--------------------+
                    |                    |                    |
                    v                    v                    v
                  Redis               BullMQ                 SSE
             cache / signals        background jobs       live browser events
                    |                    |
                    +--------------------+
                             |
                             v
                     Repository / Domain layer
                             |
                +------------+------------+----------------+
                |            |            |                |
                v            v            v                v
            PostgreSQL    MongoDB      MariaDB/MySQL   CockroachDB
              core       documents       failover       distributed
                |                                                
                +--------------------+---------------------------+
                                     |
                                     v
                                 ClickHouse
                                   analytics

                       Object / media storage + CDN
```

### Architectural principle

The API is the transactional/control plane. Heavy parsing, OCR, video conversion, newsletter batches, and other expensive workloads belong behind queues/workers. Large binary media must not be replicated as database rows across all six engines.

---

# 3. Frontend architecture

## 3.1 Stack

- React 19
- TypeScript
- Vite
- React Router
- TanStack Query
- Zustand
- Zod
- React Hook Form (where applicable)
- TipTap/ProseMirror-based editorial architecture
- Motion as the primary motion system
- Driver.js for guided onboarding
- NumberFlow for selected numeric transitions

## 3.2 High-level client structure

```text
client/src/
├── api/
├── assets/
├── components/
│   ├── analytics/
│   ├── articles/
│   ├── canvas/
│   ├── common/
│   ├── editor/
│   ├── layout/
│   ├── media/
│   ├── notifications/
│   └── ui/
├── hooks/
├── lib/
├── pages/
├── providers/
├── routes/
├── services/
├── stores/
├── types/
└── utils/
```

## 3.3 Route inventory currently present

### Public

- `/`
- `/articles/:slug`
- `/category/:slug`
- `/tags/:slug`
- `/search`
- `/feed`
- `/newsletter/verify/:token`
- `/newsletter/preferences/:token`

### Public-only authentication

- `/login`
- `/register`
- `/forgot-password`
- `/reset-password`

### Onboarding

- `/onboarding`

### Editorial Studio

- `/editor`
- `/editor/:id`
- `/write`
- `/write/:id`

### User/Author workspace

- `/dashboard`
- `/stories`
- `/workspace`
- `/library`
- `/history`
- `/network`
- `/profile`
- `/settings`
- `/user`
- `/user/*`

### Admin

- `/admin`
- `/admin/overview`
- `/admin/dashboard`
- `/admin/panel`
- `/admin/review`
- `/admin/slots`
- `/admin/users`
- `/admin/categories`
- `/admin/tags`
- `/admin/media`
- `/admin/comments`
- `/admin/audit`
- `/admin/database`
- `/admin/jobs`
- `/admin/newsletter`
- `/admin/*`

### Error / fallback

- `*` → dedicated 404 page

---

# 4. Editorial Studio map

## 4.1 Current editor component surface

The repository contains dedicated editor components for:

- Editorial ribbon
- Slash command palette
- Context menu
- Floating selection toolbar
- Media picker
- Rich external embeds
- Unified video workflow
- Video upload
- Document import
- Document map/outline drawer
- Table builder
- Editorial patterns
- Story templates
- Image resizing
- Revision history
- Revision diff
- Pre-publish checklist
- Workflow action bar
- Unsaved changes handling

## 4.2 Editor command architecture

```text
                 Unified Gazette Command Registry
                              |
          +-------------------+-------------------+
          |                   |                   |
        Ribbon             Slash               Ctrl/Cmd+K
          |                   |                   |
          +-------------------+-------------------+
                              |
                      shared command definitions
                              |
                    permissions + context + state
```

No feature should implement the same editorial command three or four times for separate surfaces.

## 4.3 Editorial ribbon

### TEXT
- Paragraph
- H1/H2/H3
- Caption
- Blockquote
- Pull quote

### FORMAT
- Inline formatting
- Semantic highlight
- Alignment
- Lists
- Clear formatting

### INSERT
- Hyperlink
- Table
- Divider
- Footnote
- Citation

### MEDIA
- Media library
- Hosted video
- External video
- Audio
- Document ingestion

### EDITORIAL
- Editorial note
- Correction
- Warning
- Fact box
- Timeline
- Citation
- Related stories

### REVIEW
- Revision history
- Diff
- Workflow transition
- Private editorial notes

### VIEW
- Inspector
- Outline
- Focus mode
- Stats

---

# 5. Editorial document model

## 5.1 Gazette semantic nodes

The internal semantic model should remain Gazette-native, including concepts such as:

- paragraph
- heading
- pullQuote
- callout
- correction
- sourceNote
- divider
- relatedStories
- other approved editorial blocks

External systems such as Gutenberg, TinaCMS, or Payload may inspire adapters or import/export formats, but they must not become a second internal editor model.

## 5.2 Publishing lifecycle

```text
DRAFT
  |
  v
IN_REVIEW
  |
  v
APPROVED
  |
  v
SCHEDULED
  |
  v
PUBLISHED
```

Actual workflow transitions remain permission-controlled and must be validated server-side.

## 5.3 Revision model

```text
Draft state
    |
    +--> Revision N
    |
    +--> Revision N+1
    |
    +--> Revision N+2
             |
             v
       Diff / Restore
             |
             v
       New revision
```

Rollback must not destroy revision history.

---

# 6. Draft resilience / editorial data protection

## 6.1 Persistence layers

```text
1. TipTap/in-memory state
2. IndexedDB local recovery
3. Server draft persistence
4. Immutable revision history
```

Local persistence must be debounced rather than writing on every keystroke.

## 6.2 Recovery scenarios that must be covered

- Browser refresh
- Browser crash
- Back navigation
- Route navigation with unsaved changes
- Tab close
- Network loss while typing
- API 500 during save
- Save succeeded but response was lost
- Server draft newer than local draft
- Local draft newer than server draft
- Two open tabs
- Concurrent editor update
- `409 Conflict`
- Published article editing without mutating live revision

## 6.3 Concurrency rule

BroadcastChannel may be used for local-tab signalling. It is **not** the authoritative lock.

Server-side document versioning remains authoritative.

---

# 7. Backend module catalog — 17 modules

The current root Nest module imports the following domain modules. Module existence and application wiring are verified; the status below deliberately distinguishes source existence from production completeness.

| # | Module | Role | Status |
|---:|---|---|---|
| 1 | Articles | Article CRUD, editorial state, revisions/workflow | BUILT / PARTIAL |
| 2 | Audit | Governance/audit trail | BUILT / PARTIAL |
| 3 | Auth | Registration, login, refresh, logout, profile, password flows | BUILT |
| 4 | Bookmarks | Reader bookmarks | BUILT |
| 5 | Categories | Taxonomy/category discovery | BUILT |
| 6 | Comments | Comments/threading/moderation surface | BUILT / PARTIAL |
| 7 | Documents | Document import/processing pipeline | BUILT / PARTIAL |
| 8 | Embeds | External embed metadata/processing | BUILT / PARTIAL |
| 9 | Follows | Follow relationships | BUILT |
| 10 | Health | Service/health endpoints | BUILT |
| 11 | Jobs | Background job administration/visibility | BUILT / PARTIAL |
| 12 | Likes | Article likes | BUILT |
| 13 | Media | Media library/upload/media metadata | BUILT / PARTIAL |
| 14 | Newsletter | Subscription/verification/preferences/dispatch | BUILT / PARTIAL |
| 15 | Notifications | In-app/event notification system | BUILT / PARTIAL |
| 16 | Publishing Slots | Scheduling/publishing windows | BUILT / PARTIAL |
| 17 | Users | User management and role/status administration | BUILT |

### Database control plane (additional to the 17 domain modules)

The database subsystem is separate from the 17 business modules and contains:

- DatabaseModule
- DatabaseSwitcherController
- DatabaseSwitcherService
- MultiDatabaseMeshService
- RepositoryRegistryService
- six database services

---

# 8. Verified endpoint contract snapshot

> This section is a baseline, not a claim that every endpoint in the repository has already been exhaustively extracted. The listed routes below are directly verified from controller source reviewed for this map.

## 8.1 Articles

Base: `/api/articles`

- `GET /articles`
  - Public article listing/filtering
  - pagination
  - search
  - author/category/tag filters
  - content type
  - trending/latest/popular/most-read/most-discussed/most-liked sorting
  - date range filtering
- `GET /articles/slug/:slug`
  - Published article by slug
- `GET /articles/id/:id`
  - Editorial article by ID
- `POST /articles`
  - Create draft
- `PATCH /articles/:id`
  - Update article with optimistic concurrency semantics
- `POST /articles/:id/transition`
  - Editorial workflow transition
- `GET /articles/:id/revisions`
  - Immutable revision history
- `POST /articles/:id/revisions/:revisionId/restore`
  - Restore previous revision into a new article state

## 8.2 Authentication

Base: `/api/auth`

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `POST /auth/logout-all`
- `GET /auth/me`
- `PATCH /auth/me`
- `PATCH /auth/change-password`
- `POST /auth/forgot-password`
- `POST /auth/reset-password`

Security characteristics verified in controller:

- CSRF guard
- JWT for authenticated routes
- throttling on sensitive auth routes
- cookie-based auth handling
- anti-enumeration behavior for forgot-password response

## 8.3 Users

Base: `/api/users`

- `GET /users`
  - pagination/search/role filter
- `PATCH /users/:id/role`
- `PATCH /users/:id/status`

Admin/high-assurance permissions are applied.

## 8.4 Other endpoint families

The repository contains dedicated controllers for:

- Audit
- Likes
- Health
- Embeds
- Bookmarks
- Media
- Comments
- Follows
- Categories
- Jobs/Admin Queues
- Database switching

Their exact method-level contracts should be extracted into the next revision of this map rather than inferred from module names.

---

# 9. Database mesh

## 9.1 Engines

| Engine | Intended architectural role | Current map status |
|---|---|---|
| PostgreSQL | Primary relational/application core | BUILT / PRIMARY INTENT |
| MongoDB | Document/content-oriented storage | BUILT |
| MariaDB | Secondary/failover relational engine | BUILT / PARTIAL |
| MySQL | Secondary/failover relational engine | BUILT / PARTIAL |
| CockroachDB | Distributed relational/failover engine | BUILT / PARTIAL |
| ClickHouse | Analytical/OLAP workloads | BUILT / PARTIAL |

## 9.2 Critical boundary rule

**The authoritative owner of every entity must be explicit.**

Do not allow an entity to have six equal write authorities simply because six drivers exist.

Recommended logical model:

```text
                    Authoritative write store
                              |
                           Outbox
                              |
                 +------------+------------+
                 |                         |
          secondary projection       analytics projection
```

The exact authoritative engine for each entity must be frozen before declaring the mesh production-complete.

## 9.3 Current mesh capabilities

The inspected mesh service contains concepts for:

- active engine selection
- multi-engine writes
- cascading reads
- JIT sync into active storage
- health/status reporting
- secondary schema initialization

## 9.4 Known unfinished architecture area

The mesh still requires hardening around:

- lazy connection establishment
- isolated circuit breakers per secondary engine
- bounded connection/retry policies
- outbox-driven asynchronous replication
- replay/reconciliation
- conflict resolution
- replication lag visibility
- failure budgets
- per-engine backpressure

The application must not wait on slow secondary databases for ordinary user-facing writes unless the specific operation is intentionally configured as strongly synchronous.

---

# 10. Redis + BullMQ topology

```text
HTTP API
  |
  +--> Redis cache/signalling
  |
  +--> BullMQ enqueue
             |
             +--> Document import / PDF processing
             +--> OCR
             +--> Video processing / FFmpeg
             +--> Newsletter batches
             +--> Notification processing
             +--> Other heavy background jobs
```

## 10.1 Queue rules

Every asynchronous job should define:

- job name
- payload schema
- idempotency key
- retry policy
- exponential/backoff behavior where appropriate
- max attempts
- timeout
- concurrency limit
- dead-letter handling
- cleanup policy
- progress metadata
- structured error state
- operator-visible status

## 10.2 API/worker separation

The target production topology is:

```text
API process
  - HTTP
  - auth
  - CRUD
  - publishing control
  - SSE
  - lightweight request logic

Worker process
  - PDF/OCR
  - FFmpeg
  - heavy image processing
  - newsletter batches
  - background imports
  - retryable asynchronous tasks
```

The repository already contains BullMQ infrastructure and job/document/media modules; the final split must be verified at process/bootstrap level before claiming that heavy work is isolated from API startup.

---

# 11. Media architecture

## 11.1 Unified media model

Supported media concepts:

- image
- hosted video
- external video
- audio
- document
- safe external embed

## 11.2 Hosted video flow

```text
Upload
  |
  v
Magic-byte validation
  |
  v
Security scan
  |
  v
Object storage
  |
  v
BullMQ
  |
  v
FFmpeg / derivatives
  |
  v
Poster + metadata + captions
  |
  v
CDN / range streaming
```

## 11.3 External video flow

```text
URL
 |
v
Provider allowlist
 |
v
Canonicalization
 |
v
Provider adapter / metadata
 |
v
Safe responsive embed
```

Arbitrary user-provided iframe URLs must not be trusted.

---

# 12. Document/PDF ingestion

```text
User file
   |
   v
Security gate
   |
   v
Structural inspection
   |
   v
Layout / content analysis
   |
   +--> OCR
   +--> tables
   +--> equations
   +--> links
   +--> figures/images
   +--> footnotes
   |
   v
Gazette Document IR
   |
   v
TipTap JSON
   |
   v
Preview + editorial review
```

Required outcomes:

- SUCCESS
- WARNING
- REVIEW REQUIRED
- FAILED

No silent data loss.

Important limits/controls should include resource caps, time budgets for quick inspection, and queue-backed long-running processing.

---

# 13. Reader/social subsystem

Reader-facing capabilities include:

- article reading
- category archives
- tag archives
- search
- personalized/discovery feed
- likes
- bookmarks
- comments
- follows
- sharing/reposting concepts
- reading progress
- table of contents
- reader preferences
- engagement/reading intelligence

Social operations must be permission- and abuse-controlled server-side.

---

# 14. Notifications

Target event flow:

```text
Domain event
   |
   v
Transactional outbox
   |
   v
BullMQ
   |
   v
Redis signalling
   |
   +--------> SSE browser stream
   |
   +--------> email / push where enabled
```

Required resilience:

- deduplication
- grouping
- actor snapshot
- unread counters
- preference checks
- delivery state
- reconnect behavior
- duplicate-event handling
- idempotent processing

---

# 15. Newsletter

Target workflow:

```text
Subscribe
   |
Double opt-in
   |
48h verification
   |
Verified subscriber
   |
Notification/outbox
   |
BullMQ
   |
Resend/email provider
```

Production completion requires visibility into:

- delivered
- bounced
- complained
- suppressed
- unsubscribed

---

# 16. Security architecture

## Current/verified platform controls

- Helmet
- CSP
- CORS
- cookie parser
- global input validation
- global exception filter
- JWT authentication
- CSRF guard
- permissions guard
- ownership guard
- high-assurance admin guard
- throttling/rate limiting
- secure cookie handling
- environment validation
- upload serving boundary

## Required ongoing controls

- Argon2id password hashing
- strict secret management
- admin MFA/high-assurance workflows
- SSRF protection for embeds/imports
- safe iframe/provider allowlist
- upload magic-byte and content validation
- malware scanning where required
- XSS/content sanitization
- dependency and secret scanning
- audit coverage
- deletion/export/privacy workflows
- session/device security
- CORS/CSP tightening for production origins

---

# 17. Observability

Target stack:

- OpenTelemetry
- Sentry
- structured application logs
- ClickHouse analytics/telemetry where appropriate
- health endpoints
- BullMQ job monitoring
- database mesh health
- SSE health/reconnect metrics

## Metrics that should exist

### API
- request count
- latency
- status codes
- error rate

### Database
- pool usage
- connection failures
- query latency
- replication lag
- circuit state

### Queues
- waiting
- active
- completed
- failed
- retries
- oldest waiting job

### Editorial reliability
- autosave success/failure
- draft recovery events
- conflict count
- lost-response reconciliation

### Media/import
- processing duration
- failure rate
- queue wait
- file/page counts
- OCR usage

---

# 18. Testing architecture

## 18.1 Test pyramid

```text
                 Playwright E2E
               / Golden journeys \
              /  visual / realtime \
             +----------------------+
             | API contract tests   |
             | DB adapter contracts |
             | worker/job tests     |
             +----------------------+
             | unit/domain tests    |
             +----------------------+
```

## 18.2 Playwright scope

Primary E2E golden journeys:

1. Author creates and saves a story
2. Author recovers an interrupted draft
3. Author submits story for review
4. Editor receives/reviews the story
5. Editor approves/schedules/publishes
6. Reader opens published story
7. Reader likes/bookmarks/comments
8. Author receives live notification
9. SSE reconnects after network disruption
10. Admin performs DB switch smoke test
11. Visual baseline tests
12. Mobile/public regression

Playwright should not be the load-testing or full database-contract framework.

## 18.3 Supporting test tools

- Jest — unit/domain
- Supertest — API/integration
- Playwright — browser/E2E/visual/realtime workflows
- k6 — load/stress
- OWASP ZAP — security testing
- axe/Lighthouse — accessibility/performance
- React Doctor — client architecture/accessibility hygiene

---

# 19. Visual regression strategy

Baseline surfaces:

- Homepage
- Article reader
- Category archive
- Search
- Editorial Studio
- Review queue
- Admin dashboard
- Dark mode
- Light mode
- mobile article
- critical editorial blocks

Controls required for deterministic snapshots:

- stable fonts
- stable test data
- masked timestamps/random values
- disabled/unified animation timing
- reserved media dimensions
- controlled network state

Use thresholds by page type rather than assuming one universal diff percentage is correct.

---

# 20. Architectural boundaries — mandatory rules

## Rule 1 — Domain ownership

A business rule belongs to its domain module. Controllers must not implement persistence logic.

## Rule 2 — Repository boundary

Domain/application services depend on repository contracts, not database-specific query syntax wherever practical.

## Rule 3 — No cross-module storage shortcuts

One module must not reach into another module's database tables/collections directly.

## Rule 4 — Events over synchronous fan-out

Cross-domain side effects should prefer events/outbox/queues rather than deep synchronous service chains.

## Rule 5 — One semantic editor model

Do not add a second rich-text/block model beside the Gazette semantic document model.

## Rule 6 — Media by reference

Binary media lives in object/media storage; database rows hold metadata/references.

## Rule 7 — Workers do heavy work

OCR, FFmpeg, large document extraction, image derivatives, and bulk newsletter processing must not run inside ordinary request handlers.

## Rule 8 — Authoritative state must be explicit

Six database drivers do not imply six equally authoritative stores.

## Rule 9 — Secondary persistence must be asynchronous unless explicitly required

Ordinary user requests should not wait on slow secondary engines for best-effort replication.

## Rule 10 — Revisions are append-only history

Never destroy editorial history as a side effect of rollback.

## Rule 11 — Server versions are authoritative for concurrent edits

Local tab signalling does not replace server-side optimistic concurrency.

## Rule 12 — Authentication is server authoritative

UI role checks are for UX only; API guards enforce permissions.

## Rule 13 — Every external embed/provider is allowlisted

Never iframe arbitrary user URLs.

## Rule 14 — Every asynchronous task is idempotent

Retries must not duplicate published content, emails, notifications, media records, or analytics events.

## Rule 15 — Every destructive operation is auditable

Admin and destructive editorial operations require actor context and audit records.

## Rule 16 — No speculative dependencies

A package/service is introduced only when it solves a concrete problem in this architecture and has a removal/exit path.

---

# 21. Startup architecture — current reality

The current Nest application uses `app.listen()`, which triggers Nest application bootstrap lifecycle hooks before the server begins accepting connections.

The multi-database mesh contains an application-bootstrap hook that initializes/settles secondary schema operations. Therefore, the phrase **"secondary schema initialization is non-blocking"** must only be used if the implementation actually launches it without awaiting it from the bootstrap lifecycle.

`Promise.allSettled()` prevents rejection propagation; it does **not by itself make an awaited operation non-blocking**.

Current target:

```text
API bootstrap
   |
   +--> fast config/security initialization
   |
   +--> minimal required primary connectivity
   |
   +--> listen as soon as readiness criteria are satisfied
   |
   +--> background secondary health/schema work
```

Worker boot should be independently measured.

---

# 22. Build / compilation boundaries

Current server TypeScript configuration uses:

```json
"incremental": true,
"include": ["src/**/*"],
"exclude": [
  "node_modules",
  "dist",
  "uploads",
  "test-fixtures",
  "coverage",
  "logs",
  ".gemini"
]
```

Current Nest CLI configuration uses `deleteOutDir: false`.

This can improve incremental development speed, but production/CI builds should still use an explicit clean-build policy so stale output cannot survive between releases.

---

# 23. Documentation governance

The repository currently contains many architecture/specification documents across root, `docs/`, and other folders.

## Canonical-document rule

This master map should become the index and boundary contract. Detailed specs may remain separate, but they must point back to this map.

Recommended categories:

```text
/docs
  /architecture
  /editorial
  /security
  /testing
  /operations
  /adr
```

Historical/obsolete specs should be marked ARCHIVED rather than silently competing with current specifications.

---

# 24. Production readiness gates

Gazette should not be considered production-complete until these gates pass.

## Gate A — Core application

- API starts within measured target
- frontend build clean
- no unexplained bootstrap stalls
- graceful shutdown verified

## Gate B — Data

- authoritative DB ownership documented
- migrations/versioning verified
- backup/restore drill passed
- reconciliation tested
- six-engine contract tests passed

## Gate C — Editorial

- draft recovery tested
- concurrency conflicts tested
- revision rollback tested
- publishing transitions permission-tested
- media/document import tested

## Gate D — Security

- secret scan clean
- dependency scan clean
- ZAP baseline clean
- upload/SSRF/XSS tests pass
- admin high-assurance flows verified

## Gate E — Reliability

- BullMQ retries/DLQ verified
- SSE reconnect verified
- notification idempotency verified
- save-response-loss reconciliation verified
- worker restart behavior verified

## Gate F — UI quality

- accessibility checks pass
- Playwright golden journeys pass
- visual regression passes
- mobile/browser matrix passes
- performance budgets measured

---

# 25. Immediate architectural priorities

### P0

1. Measure actual Nest startup stages.
2. Remove awaited secondary database/schema work from the HTTP readiness path unless intentionally required.
3. Freeze authoritative ownership for each entity.
4. Introduce/verify outbox + asynchronous secondary replication.
5. Finish draft recovery and concurrency reconciliation.

### P1

1. Extract exact endpoint inventory for every controller.
2. Add repository contract tests across the six engines.
3. Separate API and worker bootstrap processes.
4. Build Playwright golden journeys.
5. Add deterministic test-data lifecycle and cleanup.

### P2

1. Full visual regression matrix.
2. Mobile/browser expansion.
3. Advanced analytics validation.
4. Deeper media/import resilience tests.
5. More advanced reconciliation and operational tooling.

---

# 26. Master mental model

```text
                         THE GAZETTE
                              |
        +---------------------+----------------------+
        |                     |                      |
        v                     v                      v
   PUBLICATION          EDITORIAL STUDIO       ADMIN CONTROL PLANE
   Reader Core          Author / Editor        Governance / Ops
        |                     |                      |
        +---------------------+----------------------+
                              |
                              v
                         NestJS API
                              |
        +----------+----------+-----------+-----------+
        |          |                      |           |
        v          v                      v           v
      Redis      BullMQ                  SSE       Auth/RBAC
        |          |                      |           |
        +----------+----------------------+-----------+
                              |
                        Repository layer
                              |
                  +-----------+-----------+
                  |           |           |
                  v           v           v
               Primary     Secondary   Analytics
               storage     engines     / ClickHouse
                  |
                  +----------------------------------+
                                                     |
                                               Object storage/CDN

       Above all of this:
       Security + Audit + Observability + Testing + Recovery
```

---

# 27. Definition of done for this architecture map

This map is considered frozen only when:

- all current controllers have been extracted into the endpoint catalog;
- each entity has an explicit authoritative data owner;
- each queue has a documented job contract;
- API and worker startup paths are separately documented;
- implemented vs partial vs planned features are reconciled against code;
- detailed specs point to this map as their parent architecture contract.

Until then, this file should be treated as the **master baseline**, not as a claim that every planned subsystem is finished.
