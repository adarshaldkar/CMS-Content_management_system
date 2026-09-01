# Phase 4: CMS Engine & Publishing Workflow Implementation Plan (Hardened)

## 1. Executive Summary

Phase 4 establishes the core editorial engine of the CMS platform. It bridges our Phase 3 security architecture (Argon2id, HttpOnly cookies, RBAC capability tokens, ownership checks, and audit logging) with an enterprise editorial workflow, immutable article revisions, server-side content sanitization, optimistic concurrency control, secure media asset pipeline, and a rich-text editing experience powered by TipTap.

---

## 2. Architecture & Components

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   PHASE 4: CMS ENGINE ARCHITECTURE                     │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│   ┌─────────────────────┐      ┌─────────────────────┐                 │
│   │   TipTap WYSIWYG    │      │    Media Library    │                 │
│   │   (React + Vite)    │      │    (Asset Picker)   │                 │
│   └──────────┬──────────┘      └──────────┬──────────┘                 │
│              │                            │                            │
│              ▼                            ▼                            │
│   ┌──────────────────────────────────────────────────┐                 │
│   │               NestJS REST API                    │                 │
│   │                                                  │                 │
│   │  • ArticlesController & WorkflowController       │                 │
│   │  • Server-Side Sanitizer (sanitize-html)         │                 │
│   │  • Optimistic Concurrency Guard (Version Check)  │                 │
│   │  • MediaController (Magic Number & MIME check)   │                 │
│   │  • Scheduled Publishing Worker (Cron/Interval)   │                 │
│   │  • Protected by Phase 3 Guards:                  │                 │
│   │    JwtAuthGuard ──► CsrfGuard ──► Permissions    │                 │
│   └──────────────────────────┬───────────────────────┘                 │
│                              │                                         │
│                              ▼                                         │
│   ┌──────────────────────────────────────────────────┐                 │
│   │           Publishing State Machine               │                 │
│   │                                                  │                 │
│   │   DRAFT ──► PENDING_REVIEW ──► APPROVED/REJECTED │                 │
│   │                │                      │          │                 │
│   │                ▼                      ▼          │                 │
│   │            PUBLISHED ◄──────────── SCHEDULED     │                 │
│   │                │                                 │                 │
│   │                ▼                                 │                 │
│   │            ARCHIVED                              │                 │
│   └──────────────────────────┬───────────────────────┘                 │
│                              │                                         │
│                              ▼                                         │
│   ┌──────────────────────────────────────────────────┐                 │
│   │       Dual Database Repositories                 │                 │
│   │       (PostgreSQL 16 ↔ MongoDB 7)                │                 │
│   │                                                  │                 │
│   │  • Articles Table & Revisions Table (Immutable)  │                 │
│   │  • Media Metadata Store (Files on Disk Storage)  │                 │
│   └──────────────────────────────────────────────────┘                 │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Breakdown

### A. Publishing Workflow State Machine & Revisions (`server/src/modules/articles/`)

#### 1. Valid Transition Matrix
| Current State | Target State | Required Capability | Who Can Perform | Invariants Checked |
|:---|:---|:---|:---|:---|
| `DRAFT` | `PENDING_REVIEW` | `article.submit_review` | Author / Editor | Title, slug, content must not be empty. Snapshot created. |
| `PENDING_REVIEW` | `APPROVED` | `article.approve` | Editor / Admin | Requires reviewer identity. |
| `PENDING_REVIEW` | `REJECTED` | `article.reject` | Editor / Admin | Requires structured review feedback note. |
| `REJECTED` | `DRAFT` | `article.update.own` | Author | Allows author to edit and re-submit. |
| `APPROVED` | `PUBLISHED` | `article.publish` | Editor / Admin | Sets `publishedAt = now()`. |
| `APPROVED` | `SCHEDULED` | `article.schedule` | Editor / Admin | Requires valid future `scheduledAt` date. |
| `SCHEDULED` | `PUBLISHED` | System / Auto | Publishing Worker | Auto-promotes when `now() >= scheduledAt`. |
| `PUBLISHED` | `ARCHIVED` | `article.archive` | Editor / Admin | Soft archival, unlists from public feeds. |
| `ARCHIVED` | `DRAFT` | `article.restore` | Editor / Admin | Restores archived article back to draft. |

#### 2. Article Revisions & Versioning (Immutable History)
* Every time an article is updated or submitted for review, an immutable snapshot is saved in `cms_article_revisions` (Postgres) or `article_revisions` (Mongo).
* **Revision Schema**:
  ```typescript
  export interface ArticleRevision {
    id: string;
    articleId: string;
    version: number;
    title: string;
    content: string;
    description: string;
    authorId: string;
    changeSummary?: string | null;
    createdAt: Date;
  }
  ```
* Allows authors and editors to inspect past versions, compare diffs, and restore previous snapshots if needed.

#### 3. Optimistic Concurrency Control
* Articles include a `version: number` column/field.
* Mutating endpoints (`PATCH /api/articles/:id`) accept `expectedVersion: number`.
* If `currentVersion !== expectedVersion`, the server aborts and returns `409 Conflict ("Article has been modified by another user. Please reload.")` preventing race condition overwrites.

#### 4. Server-Side TipTap Content Sanitization
* All incoming HTML/rich-text content is treated as untrusted input.
* Processed through `sanitize-html` with an explicit allowlist of tags:
  * Allowed Tags: `h2`, `h3`, `p`, `blockquote`, `pre`, `code`, `ul`, `ol`, `li`, `a`, `img`, `strong`, `em`, `s`, `br`.
  * Allowed Attributes: `a[href]`, `img[src|alt|title|width|height]`, `pre[class]`, `code[class]`.
  * Forbidden: All `<script>`, `<iframe>`, `onload`, `onerror`, inline JavaScript, or dangerous `javascript:` / `data:` URI schemes.

#### 5. Scheduled Publishing Worker
* A lightweight interval service running every 60 seconds.
* Queries active repository for `status === 'scheduled' AND scheduledAt <= now()`.
* Promotes articles to `PUBLISHED` atomically and emits `ARTICLE_STATUS_CHANGED` audit records.

---

### B. Secure Media Asset Pipeline (OWASP A08 Defense)

Media uploads follow a strict multi-layer validation pipeline:

```text
Upload Request (multipart/form-data)
       │
       ▼ (Multer 5 MB Limit)
MIME Type Allowlist Check (image/jpeg, image/png, image/webp, image/avif, image/gif)
       │
       ▼
Binary Magic Number File Signature Verification (inspects first 16 bytes of buffer)
       │
       ▼
Filename Randomization (UUID-based name: media-9f8a3c...webp)
       │
       ▼
Disk File Storage (/uploads/ directory with path traversal protection)
       │
       ▼
Database Metadata Persistence (PostgresMediaRepository / MongoMediaRepository)
```

* **Metadata Stored in DB**: `id`, `filename`, `originalName`, `mimeType`, `size`, `url`, `uploadedBy`, `createdAt`.
* **Binary File Stored on Disk**: Kept separate from database records to ensure optimal database performance.

---

### C. TipTap Rich-Text Editor & UI Workspaces (`client/src/components/editor/`)

1. **TipTap Core Setup**:
   * Extensions: `StarterKit`, `Image`, `Link`, `Placeholder`, `CharacterCount`, `CodeBlockLowlight`.
   * Floating & Bubble action toolbars for formatting text selections.
   * Typography matched to our design system: `Newsreader` for editorial content, `Plus Jakarta Sans` for UI chrome, `JetBrains Mono` for code snippets.
2. **Editor Controls**:
   * Heading 2 & Heading 3 buttons.
   * Bold, Italic, Strikethrough, Inline Code.
   * Blockquote and Bullet/Numbered list formatting.
   * Hyperlink insertion modal with URL validation (`http://` or `https://` only).
   * Media asset picker integration for inserting responsive images.
3. **Metadata & Publishing Sidebar**:
   * Slug editor (auto-generated from title, editable with unique constraint checks).
   * Category dropdown selector (populated from `/api/categories`).
   * Tag input with badge tokens.
   * Cover image selector with live preview and upload trigger.
   * SEO Title & SEO Description fields with character counters.
   * Revisions history dropdown/drawer allowing authors to view past versions.
   * Workflow action buttons dynamically rendered based on current status and user capabilities:
     * Author: `Save Draft`, `Submit for Review`.
     * Editor / Admin: `Approve`, `Reject (with note)`, `Publish Now`, `Schedule`, `Archive`.

---

## 4. Proposed File Changes

### Backend Files:
* `server/src/domain/models.ts` — Add `ArticleRevision`, `ReviewFeedback`, `WorkflowTransitionDto`, `MediaUploadDto`.
* `server/src/common/utils/sanitizer.util.ts` — Server-side HTML sanitizer using `sanitize-html`.
* `server/src/repositories/interfaces/media.repository.interface.ts` — `IMediaRepository` definition.
* `server/src/repositories/interfaces/revision.repository.interface.ts` — `IRevisionRepository` definition.
* `server/src/repositories/postgres/postgres-media.repository.ts` — Parameterized SQL media storage.
* `server/src/repositories/postgres/postgres-revision.repository.ts` — Parameterized SQL revision history.
* `server/src/repositories/mongo/media.schema.ts` & `mongo-media.repository.ts` — MongoDB media persistence.
* `server/src/repositories/mongo/revision.schema.ts` & `mongo-revision.repository.ts` — MongoDB revision history.
* `server/src/repositories/repository.providers.ts` — `mediaRepositoryProvider` & `revisionRepositoryProvider`.
* `server/src/modules/media/media.service.ts` — Magic number verification, disk storage, metadata extraction.
* `server/src/modules/media/media.controller.ts` — `POST /api/media/upload`, `GET /api/media`, `DELETE /api/media/:id`.
* `server/src/modules/articles/workflow.service.ts` — Server-side publishing state machine with revision creation and version check.
* `server/src/modules/articles/publisher.worker.ts` — Scheduled publishing background worker.
* `server/src/modules/articles/articles.controller.ts` — Workflow transition & revision history endpoints.

### Frontend Files:
* `client/src/components/editor/TipTapEditor.tsx` — Rich-text editor with bubble menu and custom toolbar.
* `client/src/components/editor/MediaPickerModal.tsx` — Visual asset library modal for uploading and selecting images.
* `client/src/components/editor/WorkflowActionBar.tsx` — Status badge and context-aware transition buttons.
* `client/src/components/editor/RevisionHistoryModal.tsx` — Drawer displaying past versions with restore triggers.
* `client/src/pages/ArticleEditorPage.tsx` — Full writing and publishing workspace for authors and editors.
* `client/src/api/articles.api.ts` & `client/src/api/media.api.ts` — Typed Axios API clients with CSRF headers.

---

## 5. Verification Plan

### Automated Test Suites:
1. **Workflow State Machine & Concurrency Tests** (`workflow.service.spec.ts`):
   * Valid transitions: `DRAFT` → `PENDING_REVIEW` → `APPROVED` → `PUBLISHED`.
   * Invalid transition: Author attempting `DRAFT` → `PUBLISHED` throws `ForbiddenException`.
   * Rejection transition: `PENDING_REVIEW` → `REJECTED` requires review note.
   * Optimistic concurrency: Stale `expectedVersion` update throws `409 Conflict`.
   * Revision creation: Each update produces an immutable revision record.
2. **Server-Side Sanitization Tests** (`sanitizer.util.spec.ts`):
   * Malicious `<script>alert(1)</script>` is completely stripped.
   * `onerror` and `onload` handlers are removed from images.
   * Allowed formatting tags (`h2`, `p`, `blockquote`, `strong`) are preserved cleanly.
3. **Media Security & Magic Number Tests** (`media.service.spec.ts`):
   * Valid PNG/JPEG buffers pass magic number verification.
   * Malicious `.exe` disguised as `.jpg` is detected and rejected with `400 Bad Request`.
   * File larger than 5 MB is rejected.

---

## 6. Execution Command Sequence
```powershell
npm test -w server
npm run lint -w server
npm run build
```
