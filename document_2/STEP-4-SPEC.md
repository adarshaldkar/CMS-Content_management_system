# STEP 4 — Admin Governance Suite & Live Database Switcher Specification

> **Phase 5 Master Blueprint — Step 4 Execution Plan**  
> **Source of Truth:** `docs/ARCHITECTURE.md` · `docs/DESIGN-SYSTEM.md` · `docs/P0.md` · `PHASE-5-FRONTEND-PRODUCT-EXPERIENCE.md`

---

## 1. Objective & Scope

**Step 4** delivers the mission-critical **Admin Governance Suite & Live Database Switcher**. It provides editorial staff and administrators with complete oversight over content moderation, user roles, taxonomy, media assets, security audit trails, and the crown jewel of the platform: the **Zero-Buffer Live Database Switcher** with atomic concurrency safety and real-time JIT continuity verification across PostgreSQL and MongoDB Atlas.

---

## 2. Hardened Architecture & Security Invariants

### 1. Database Switcher State Machine
```text
  [ IDLE ]
     │
     ▼
[ VALIDATING_TARGET ]  ──(Fail: Target DB Unhealthy)──► [ FAILED ]
     │
     ▼
[ SWITCHING (Mutex) ]  ──(Atomic Active DB Pointer Update)
     │
     ▼
[ VERIFYING_CONTINUITY ] ──(JIT Read/Write Probe Check)
     │
     ▼
[ SUCCESS ]
```

### 2. Atomic Concurrency-Safe Database Switch
* **Switch Mutex**: The switch operation acquires a critical section lock:
  1. Health check probe to target database (`PostgreSQL` or `MongoDB Atlas`).
  2. Validate repository readiness.
  3. Atomically swap the active database pointer (`DatabaseService.activeDatabase`).
  4. In-flight requests resolve cleanly on their already-acquired client connection; new requests use the newly active database.
  5. Release mutex and emit security audit event `AuditEventType.DB_SWITCH_SUCCESS`.

### 3. Strict Privilege Boundaries on Role Governance
* **Super Admin Privilege Protection**:
  * An `ADMIN` cannot promote any user to `SUPER_ADMIN` or modify a `SUPER_ADMIN` account.
  * Only a verified `SUPER_ADMIN` can assign the `SUPER_ADMIN` role.
  * Role updates execute: `Authorize` $\to$ `Validate Hierarchy` $\to$ `Update User` $\to$ `Invalidate Stale Sessions` $\to$ `Audit Log`.

### 4. Sanitized JIT Operational Events in Admin UI
* The frontend receives sanitized, human-readable operational events (e.g., `✓ User synchronized`, `✓ Article synchronized`, `✓ Taxonomy synchronized`).
* Raw server implementation internals, connection strings, and stack traces remain strictly server-side.

### 5. Media Abstraction Barrier
* The browser interacts **only** with the NestJS `/api/media` API.
* `MediaService` delegates to `IStorageProvider` (`LocalDiskStorageProvider` / `CloudinaryStorageProvider`). No direct client-to-Cloudinary coupling.

---

## 3. Admin Suite Screen Matrix

```text
                               STEP 4 ADMIN GOVERNANCE MAP
                                            │
     ┌───────────────────┬──────────────────┼──────────────────┬──────────────────┐
     ▼                   ▼                  ▼                  ▼                  ▼
1. REVIEW QUEUE     2. USER MGR        3. TAXONOMY        4. AUDIT LOGS      5. DB SWITCHER
   • Side-by-Side      • Role Hierarchy   • Category CRUD    • Event Filtering  • Multi-Phase State
     Revision Diff       Protection       • Tag Management   • Actor/Resource     (IDLE -> VALIDATE
   • Approve/Reject    • Status Toggle    • Live Article       Timestamps          -> SWITCH -> PROBE)
   • Schedule Publish  • User Search        Counters         • Export Logs      • JIT Continuity Log
```

### A. Editorial Review Queue (`/admin/review` — `EditorialReviewPage.tsx`)
* **Queue Filter Tabs**: `Pending Review` (primary badge count), `Changes Requested`, `Scheduled`, `Approved`.
* **Side-by-Side Revision Diff Viewer**:
  * Visual diff comparing the author's submitted revision snapshot (`v2`) against the previous baseline (`v1`).
  * Additions highlighted in subtle green, deletions in strikethrough rose.
* **Editorial Actions**:
  * **Approve Story**: Advances status from `pending_review` $\to$ `approved` (or direct `published`).
  * **Request Changes (Reject)**: Prompts editor for required feedback notes $\to$ sets status to `rejected` (labeled as *Changes Requested*) and notifies author.
  * **Schedule Publication**: Date & time picker to queue automated release via BullMQ/publisher worker.

### B. User & Role Management Table (`/admin/users` — `UserManagementPage.tsx`)
* **User Directory Table**: Avatar, Name, Email, Role badge, Status pill (`Active` / `Suspended`), Preferred Topics, Created Date.
* **Strict Role Promotion / Demotion**:
  * `ADMIN` can assign `EDITOR`, `AUTHOR`, `USER`.
  * Only `SUPER_ADMIN` can assign `SUPER_ADMIN`.
* **Account Status Toggle**: Instantly activate/deactivate user accounts; deactivated users are blocked at `JwtAuthGuard` from all operations.
* **Search & Role Filters**: Real-time debounced search by name/email and filter by role.

### C. Taxonomy Management (`/admin/categories` & `/admin/tags` — `TaxonomyManagerPage.tsx`)
* **Category CRUD**:
  * Create/edit category modal: Name, Slug (auto-generated with manual override), Description.
  * Live article count indicator per category.
* **Tag Management**:
  * Tag list with search, rename, and delete actions.

### D. Media Asset Library (`/admin/media` — `MediaLibraryPage.tsx`)
* **Grid & Table Views**: Cover thumbnails, original filenames, MIME formats (`image/webp`, `image/png`), dimensions, file sizes, and uploader attribution.
* **Storage Metrics Bar**: Total assets, storage footprint, and active storage provider badge (`Local Disk` or `Cloudinary CDN`).
* **Asset Operations**: Single-click URL copy, asset preview lightbox, and delete action.

### E. Reader Comments Moderation (`/admin/comments` — `CommentsModerationPage.tsx`)
* **Comments Feed**: Reader name, article title link, comment snippet, timestamp, and status.
* **Moderation Actions**: Approve, Flag as Spam, or Delete comment with automated audit log creation.

### F. Security Audit Log Explorer (`/admin/audit` — `AuditLogExplorerPage.tsx`)
* **Audit Trail Feed**: Chronological stream of immutable system security events:
  * `LOGIN_SUCCESS`, `LOGIN_FAILURE`, `ROLE_CHANGED`, `PASSWORD_CHANGED`, `PROFILE_UPDATED`, `ARTICLE_CREATED`, `ARTICLE_PUBLISHED`, `DB_SWITCH_ATTEMPT`, `DB_SWITCH_SUCCESS`.
* **Search & Filters**: Filter by Action Type, Actor ID, Target Resource, Date Range, and Result (`SUCCESS` / `FAILURE`).

### G. Live Database Switcher & JIT Console (`/admin/database` — `DatabaseSwitcherPage.tsx`)
* **Live Health & Active Database Masthead**:
  * Displays active database with pulsing emerald badge (`PostgreSQL 16` or `MongoDB Atlas 8.0`).
  * Live latency ping (ms) and connection pool status.
* **Interactive State-Driven Switch Controller**:
  * Transitions: `IDLE` $\to$ `VALIDATING_TARGET` $\to$ `SWITCHING` $\to$ `VERIFYING_CONTINUITY` $\to$ `SUCCESS`.
  * Visual verification summary showing:
    * `✓ Target connection verified`
    * `✓ Active database changed atomically`
    * `✓ Cross-database JIT continuity verified`
* **Sanitized JIT Operational Monitor**:
  * Real-time clean operational events (`✓ User synchronized`, `✓ Article synchronized`).
* **Automated One-Click Cross-Database Verification**:
  * Runs live automated continuity check in the browser: writes in active DB $\to$ switches DB $\to$ reads record $\to$ verifies zero data loss.

---

## 4. Backend Endpoints Supporting Step 4

| Method | Endpoint | Description | Auth / RBAC Guard |
|---|---|---|---|
| `GET` | `/api/articles?status=pending_review` | Get editorial review queue | `article.approve` (`EDITOR`, `ADMIN`) |
| `POST` | `/api/articles/:id/transition` | Transition status (`approved`, `published`, `rejected`) | `article.approve` / `article.publish` |
| `GET` | `/api/users` | List paginated users with filters | `user.read.all` (`ADMIN`, `SUPER_ADMIN`) |
| `PATCH` | `/api/users/:id/role` | Update user role with hierarchy checks | `user.update.role` (`SUPER_ADMIN`, `ADMIN`) |
| `PATCH` | `/api/users/:id/status` | Activate/Deactivate user | `user.update.status` (`ADMIN`) |
| `GET` | `/api/categories` | List categories | `category.read` |
| `POST` | `/api/categories` | Create category | `category.create` (`ADMIN`) |
| `PATCH` | `/api/categories/:id` | Update category | `category.update` (`ADMIN`) |
| `DELETE` | `/api/categories/:id` | Delete category | `category.delete` (`ADMIN`) |
| `GET` | `/api/audit` | Query immutable audit log trail | `audit.read` (`ADMIN`, `SUPER_ADMIN`) |
| `GET` | `/api/database/status` | Get active database health & metrics | `system.manage` (`ADMIN`, `SUPER_ADMIN`) |
| `POST` | `/api/database/switch` | Execute live database switch | `system.manage` (`SUPER_ADMIN`) |

---

## 5. Step 4 Verification & Definition of Done

* [ ] Editorial Review Queue allows editors to inspect revisions, approve manuscripts, or request changes with notes.
* [ ] User Management table supports role updates with strict hierarchy protection (`ADMIN` cannot assign `SUPER_ADMIN`).
* [ ] Account activation/deactivation locks inactive users out of all endpoints immediately.
* [ ] Taxonomy CRUD allows creating, updating, and deleting categories and tags.
* [ ] Media Library lists all uploaded assets with storage provider indicator (`Local` / `Cloudinary`).
* [ ] Comments Moderation allows approving and deleting reader comments.
* [ ] Audit Log Explorer displays filterable immutable security events.
* [ ] Live Database Switcher executes atomic switch through state machine (`IDLE` $\to$ `VALIDATING_TARGET` $\to$ `SWITCHING` $\to$ `VERIFYING_CONTINUITY` $\to$ `SUCCESS`).
* [ ] Sanitized JIT operational events displayed in the UI.
* [ ] `node test/step4-admin-governance-test.mjs` passes 100% green.
