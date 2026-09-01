# Phase 5–6 Master Implementation Plan
## EditorialHub — Full Product Realization Roadmap

> **Document purpose:** Executable, ordered, testable plan to bring all 16 combined feature groups to production readiness.
> **Approach:** Security-first (fix blockers before features), then backend-first (contracts before UI), then frontend wiring.
> **Status:** ACTIVE IMPLEMENTATION

---

# 0. EXECUTIVE SUMMARY

| Phase | Focus | # Tasks | Priority | Est. Build |
|:--|:--|:--|:--|:--|
| **Phase 0** | Fix 4 Critical Security Blockers | 4 | 🔴 CRITICAL | 1 session |
| **Phase 1** | Patch Existing Known Issues | 7 | 🟠 HIGH | 1 session |
| **Phase 2** | Comments Module (Full) | 8 | 🟡 MEDIUM | 1 session |
| **Phase 3** | Reader Community Backend (Bookmarks/Lists/Highlights/History/Follows) | 24 | 🟡 MEDIUM | 2-3 sessions |
| **Phase 4** | Personalized Feed + Topic Onboarding APIs | 7 | 🟡 MEDIUM | 1 session |
| **Phase 5** | CMS Enhancements (Readiness/Canonical/Social/Rev-Compare) | 7 | 🟡 MEDIUM | 1 session |
| **Phase 6** | Analytics + Engagement Counters (Views/Likes/Saves) | 8 | 🟡 MEDIUM | 1 session |
| **Phase 7** | Admin Aggregate Dashboard + Roles CRUD + Hints | 6 | 🟢 LOW | 1 session |
| **Phase 8** | Series/Collections + Content Relationships | 7 | 🟢 LOW | 1-2 sessions |
| **Phase 9** | Build + Tests | 1 | 🔴 CRITICAL | gate |

---

# 1. PHASE 0 — CRITICAL SECURITY BLOCKERS
**Do NOT ship features until these 4 are closed.**

### 0.1 Enable Global ValidationPipe (OWASP A03 input validation)
- **File:** `server/src/main.ts`
- **Add:** `app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))`
- **Add DTO decorators** to `auth.dto.ts` (`@IsEmail()`, `@IsString()`, `@MinLength(8)`, etc.)
- **Install:** `class-validator`, `class-transformer`
- **Test:** Submit missing `email` → 400 (not 500)

### 0.2 Install + Wire @nestjs/throttler (OWASP A07 brute force)
- **Install:** `@nestjs/throttler`
- **File:** `server/src/app.module.ts` → import `ThrottlerModule.forRoot([{ ttl: 60000, limit: 10 }])`
- **Guards:** Apply `@Throttle({ default: { limit: 5, ttl: 60000 } })` on:
  - `POST /auth/register`
  - `POST /auth/login`
  - `POST /auth/forgot-password`
  - `POST /auth/refresh`
  - `POST /auth/reset-password`
- **Global default:** 10 req/minute per IP for all other routes
- **Test:** Rapid login → 429 Too Many Requests

### 0.3 Fix MongoDB ReDoS Vulnerability (OWASP A05 NoSQL Injection)
- **File:** `server/src/repositories/mongo/mongo-article.repository.ts` lines 73-78
- **Implement** `escapeRegex(value)` helper: `value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')`
- **Apply to ALL Mongo repositories** that accept string search input: categories, media, audit
- **Test:** Search for `"(a+)+"` → no 10s hang, returns results or empty safely

### 0.4 Runtime DB Switch — Fix DI Rebinding (ARCHITECTURE GAP)
- **Design pattern:** Introduce `RepositoryProxy<T>` that wraps active/peer and exposes `setActive(dbName)` method
- **Replace FactoryProvider** in `repository.providers.ts` — instead of returning Seamless* at bootstrap, return a Proxy that delegates to internal state settable via `DatabaseSwitcherService`
- **In `switchDatabase()`** — after healthcheck, call `proxy.setActive(target)` instead of just env
- **Add seamless wrappers to Session/Audit repos** too (currently direct selection)
- **Test:** Switch POST → MongoDB, hit GET /articles → returns Mongo articles, not Postgres
- **Remove fake `sanitizedEvents`** from `getStatus()` — wire real recent audit events (last 2, filtered)

---

# 2. PHASE 1 — PATCH EXISTING KNOWN ISSUES

### 1.1 Category Soft-Delete: Default status='active' filter
- **All Category Repo read methods:** add `WHERE status = 'active'` / `{ status: { $ne: 'inactive' } }` to `findById`, `findBySlug`, `findMany` unless caller explicitly passes `status:'inactive'`
- Same for Mongo Category repo
- **Test:** Soft-delete category then list → not present; query with explicit status='inactive' → present

### 1.2 Replace custom regex sanitizer with sanitize-html library
- **Library:** Already specified in ARCHITECTURE.md. Install if missing.
- **File:** `sanitizer.util.ts`
- **Keep** the same public API (`sanitizeArticleContent(rawHtml): string`)
- **Keep** the same tag/attr allowlist + `javascript:` block + external link rel=noopener behavior
- **Deprecate** hand-written regex parsing
- **Test:** Existing sanitizer.spec.ts assertions pass unchanged

### 1.3 DB Switch Endpoint Permission Fix
- **Wrong:** `RequirePermissions(Permission.USER_UPDATE_ROLE)`
- **Right:** Introduce new capability `Permission.DATABASE_SWITCH`
- **Add to RBAC matrix** (`domain/permissions.model.ts` or wherever permissions enum lives)
- Assign only to `SUPER_ADMIN` (and optionally `ADMIN` if desired)

### 1.4 passwordHash Domain Model Consistency
- **Stop casting** `(user as any).passwordHash || (user as any).password_hash`
- Standardize ALL user models (domain interface, Postgres return column aliasing, Mongo schema field) to **`passwordHash`**
- In Postgres repo `toDomain`: alias `password_hash AS passwordHash` in SELECT or rename column in ensureSchema
- **Add `select: true`** for passwordHash on Mongo user schema (undo any `select:false` silent stripping that breaks `verifyPassword`)
- **Test:** Login flow removes all `as any` casts; TypeScript compiles

### 1.5 totalPages Consistency (0/1 for empty sets)
- Mongo repos: `Math.ceil(total/limit) || 1` (match Postgres)
- Postgres repos: same → audit all PaginatedResult returns → || 1
- Frontend expects 1 = "page 1 of 1" not "page 1 of 0"

### 1.6 PublisherWorker → @nestjs/schedule
- Optional clean-up: use `@Cron('* * * * *')` decorator from `@nestjs/schedule` instead of raw `setInterval`
- Adds graceful shutdown + DI integration

### 1.7 Auto DDL → node-pg-migrate plan (documentation)
- Document gap: DDL in ensureSchema is convenient for dev but can't track schema history
- Add TODO comment: plan Phase 10 migrations

---

# 3. PHASE 2 — COMMENTS MODULE

**New Module:** `server/src/modules/comments/`
**Backend endpoints:**
- `GET  /api/articles/:slug/comments?page&limit`      → List with pagination + author avatar (public if published)
- `POST /api/articles/:slug/comments`                → Create (auth, sanitized body, rate limit)
- `PATCH /api/comments/:id`                          → Edit OWN only (capability: comment.update.own)
- `DELETE /api/comments/:id`                         → Delete OWN or admin (comment.delete.own / comment.delete.any)
- `POST /api/comments/:id/hide`                      → Moderator (comment.moderate)
- `POST /api/comments/:id/report`                    → Report content (auth users)

**Domain Model: Comment**
```
id | articleId | parentId (reply) | authorId | body (sanitized)
status: visible | hidden | removed | reported
moderationNote? | createdAt | updatedAt | deletedAt
```
- **Body sanitization:** Stricter allowlist than articles (`p, strong, em, a[href], code`)
- **New permissions:** `COMMENT_CREATE`, `COMMENT_UPDATE_OWN`, `COMMENT_DELETE_OWN`, `COMMENT_DELETE_ANY`, `COMMENT_MODERATE`, `COMMENT_REPORT`
- **Two DB repo pairs + seamless wrapper** (PostgresComments + MongoComments + SeamlessComments)
- **Repository provider registration + module wiring in app.module**

---

# 4. PHASE 3 — READER COMMUNITY BACKEND

## 4.1 Bookmarks (`saved_articles`)
- Endpoints:
  - `POST /api/articles/:slug/bookmark` (toggle)
  - `DELETE /api/articles/:slug/bookmark`
  - `GET /api/me/bookmarks?page&limit` → user's saved articles, newest first
- Model: `userId + articleId` unique composite, `createdAt`, `folder?`

## 4.2 Reading Lists (Collections created by user)
- Endpoints:
  - `GET    /api/me/lists`
  - `POST   /api/me/lists` → Create (name, description, isPublic: bool)
  - `PATCH  /api/me/lists/:id` → rename/delete/make public
  - `DELETE /api/me/lists/:id`
  - `POST   /api/me/lists/:listId/articles/:articleId` → add
  - `DELETE /api/me/lists/:listId/articles/:articleId` → remove
  - `GET    /api/lists/:publicId` (public only) → shareable
- Model: `lists { id, ownerId, name, description, isPublic, createdAt }` + `list_items { listId, articleId, addedBy, addedAt, orderIndex }`

## 4.3 Highlights
- Endpoints:
  - `GET    /api/articles/:slug/highlights` → **public user highlights? No** private to owner only (unless shareable link opt-in)
  - `POST   /api/articles/:slug/highlights`
  - `PATCH  /api/highlights/:id` → edit note
  - `DELETE /api/highlights/:id`
  - `GET    /api/me/highlights?articleId?&page&limit` → library page
- Model: `id, articleId, userId, startPath (CSS selector/offset), endPath, selectedText, note?, color, createdAt`

## 4.4 Reading History
- Beacon endpoint (POST — fire-and-forget from client scroll/visibility):
  - `POST /api/articles/:slug/read-progress` → body `{ percentComplete, secondsOnPage }` (auth-only, privacy-conscious)
- Query:
  - `GET /api/me/reading-history?page&limit` → sorted by last read desc
  - `DELETE /api/me/reading-history/:articleId` → remove
  - `DELETE /api/me/reading-history` → clear all
- Model: `userId + articleId` upsert with `lastReadAt, percentComplete, totalSeconds, readCount`
- Privacy: NEVER expose other users' history; default visibility = owner-only (no public follower feed of reads)

## 4.5 Follows
### 4.5.1 Follow Authors (User ↔ User)
- `POST   /api/users/:userId/follow`
- `DELETE /api/users/:userId/follow`
- `GET    /api/users/:userId/followers?page&limit`
- `GET    /api/users/:userId/following?page&limit` → returns Writers | Topics toggle
- Model: `follows { followerId, targetType: 'user'|'category', targetId, createdAt }`
- Composite unique index on `(followerId, targetType, targetId)`

### 4.5.2 Follow Topics/Categories
- `POST   /api/categories/:slug/follow`
- `DELETE /api/categories/:slug/follow`
- `GET    /api/categories/:slug/followers?page&limit`
- `GET    /api/me/following/topics` → feed use

### 4.5.3 Profile Counters
On `GET /api/users/:id` (public profile), return:
```
publishedCount (articles w/ status=published)
followersCount
followingCount
```

---

# 5. PHASE 4 — PERSONALIZED FEED + TOPIC ONBOARDING APIS

## 5.1 Feed Endpoint
- `GET /api/me/feed?variant=for_you|following|latest&page&limit`
- Ranking logic (deterministic per spec — no ML):
  - `for_you`: priority = `(Followed Authors: 50) + (Followed Topics: 40) + (preferredTopics hit: 30) + (Recent: 20) + (Trending wordCount + views: 10)`. Simple score sort.
  - `following`: articles from followed authors ONLY, sorted date DESC
  - `latest`: all published, date desc
- Always filter: `status=published` published status enforced server-side (security: never leak drafts/REVIEW in feed)

## 5.2 Topic Onboarding APIs
- `GET /api/topics?grouped=true` → returns grouped by "Technology, Programming, Design…" structure with story counts + author counts + new-this-week counts
- `POST /api/onboarding/choose-topics` → body `{ topicSlugs: string[] }` → writes to `user.preferredTopics[]`
- Validates each topic exists, `min 3`
- Audit: `TOPIC_ONBOARDING_COMPLETE`

## 5.3 Topic Stats Aggregation Helper
Helper returns for a category id/slug:
```
{ articlesCount: n, authorsCount: n, newThisWeek: n }
```
Used by homepage topic cards + hover tooltip info + feed weighting.

---

# 6. PHASE 5 — CMS ENHANCEMENTS

## 6.1 Publishing Readiness Endpoint
- `GET /api/articles/:id/readiness` → returns
  ```
  {
    checks: { title, slug, category, coverImage, seoTitle, seoDescription, content, author },
    missing: string[],
    wordCount,
    readingTimeMinutes,
    isReadyForReview: boolean (every check true)
  }
  ```
- Server-validates each field's actual persisted value (not client trust)

## 6.2 Add Canonical URL + Social Image fields
- Article model → `canonicalUrl?`, `socialImage?` (both repos + domain DTOs)
- SEO completeness check in 6.1 incorporates both

## 6.3 Revision Comparison Endpoint
- `GET /api/articles/:id/revisions/:revA/compare/:revB` → returns unified diff or per-field side-by-side: `{ titleA, titleB, contentDiffHTML, descriptionA, descriptionB, authorA, authorB, versionA, versionB }`
- Use a diff helper (`diff` npm package) for content producing sanitized HTML or patch format

## 6.4 (Minor) Unscheduled workflow transition
- Add `SCHEDULED → APPROVED` transition: capability `article.schedule` (or new `article.unschedule`)
- Useful when editor accidentally scheduled wrong time → revert

## 6.5 Reviewer identity on article
- Add `reviewedById?`, `rejectedById?` fields to article model
- Populated on APPROVE/REJECT transitions (from JWT user.id)

## 6.6 Reading lists in library query
- `GET /api/me/library` → aggregate endpoint returning `{ savedCount, listCount, highlightsCount, historyEntries: 5 preview }` (for user dash summary)

## 6.7 (Minor) Minimum content length review
- Review transition check: optionally warn if content < 200 words (status 400 with override?) but keep non-blocking by default; just informational via readiness API.

---

# 7. PHASE 6 — ANALYTICS + ENGAGEMENT

## 7.1 Article Views Beacon
- `POST /api/articles/:slug/view` — increment counter (non-auth OK, dedupe per session-id to block refresh spam)
- Model: Article gets `views` and `uniqueReaders` fields (counters, both repos). Or separate `article_daily_stats` fact table.

## 7.2 Engagement Counters
- `likesCount`, `bookmarksCount`, `commentsCount`, `sharesCount` → new fields on article
- Increment triggers: comment create/delete, bookmark toggle (POST=+1, DELETE=-1)
- Views increment doesn't need auth (but dedup via IP + UA hash rotating daily or anonymous session cookie)

## 7.3 Like/Reaction Endpoint
- `POST /api/articles/:slug/like` (toggle)
- `DELETE /api/articles/:slug/like`
- Model: `likes { userId, articleId, createdAt }` unique composite

## 7.4 Share Tracking
- `POST /api/articles/:slug/share` — body `{ channel: 'twitter'|'facebook'|'linkedin'|'link'|'email' }`
- Increments `sharesCount` + audit log (no PII)

## 7.5 Author Aggregate Stats Endpoint
- `GET /api/me/stats/author` →
  ```
  {
    totalViews, totalPublished, avgReadingTime,
    mostSaved: { article },
    mostDiscussed: { article },
    topTopics: [{ slug, count }]
  }
  ```
  Computed from counters + article aggregations.

## 7.6 Reading Time Aggregate (actual measured, not computed)
- Sum of `secondsOnPage` from reading history beacon for author-owned articles

## 7.7 Reader Public Profile Endpoint
- `GET /api/users/:username/profile` → public info + published count + followers/following + public lists (filters out private fields: email, role internal, preferences, reading history)

## 7.8 Search Enhancement
- Support search filters: `category`, `tag`, `author`, `date_from`, `date_to`, `sort`, `status=published` default
- Escape all user-supplied strings before regex/ILIKE

---

# 8. PHASE 7 — ADMIN + ROLES + HINTS

## 8.1 Admin Dashboard Aggregate Endpoint
- `GET /api/admin/dashboard` → requires `admin.dashboard.read`
- Single response:
  ```
  {
    users: { total, active, newThisWeek },
    articles: { published, drafts, pendingReview, scheduled, rejected, archived },
    comments: { total, reported, hiddenToday },
    media: { total, sizeGBytesThisMonth },
    database: { active, postgres: health, mongodb: health },
    recentActivity: last 10 audit entries (sanitized)
  }
  ```

## 8.2 Roles CRUD (currently hardcoded `UserRole` enum)
- Plan: For now **leave roles enum hardcoded** (5 roles), but expose assignment API:
  - `PATCH /api/admin/users/:id/role` → set role to one of 5 values; requires `user.update.role` capability; audit `ROLE_CHANGED` event
- Capabilities stay derived per role via `ROLE_PERMISSIONS[role]` matrix (no dynamic custom roles yet — scope creep)

## 8.3 User Search + Filter Admin Endpoint
- `GET /api/admin/users?page&limit&role&query&status=active|deactivated`
- PATCH: deactivate/reactivate user → update `isActive`
- DELETE: soft delete user → audit; block from re-login (isActive=false already catches it)

## 8.4 Contextual Hints System
- Model: `User.dismissedHints: string[]` stored on user document
- Endpoint: `POST /api/me/hints/:hintId/dismiss`
- Initial hint IDs: `'save-article-read-later'`, `'follow-topic-personalize-home'`, `'create-list-organize'`, `'onboarding-choose-topics'`
- Frontend decides when to prompt; backend only tracks dismissals

## 8.5 Comment Moderation Queue
- `GET /api/admin/comments/moderation?status=reported|all&page&limit` → returns comments w/ reportCount
- Hide / remove actions

## 8.6 Audit Log Filters
- Add queryable filters to `GET /api/audit` or existing similar: `actorId, action, resource, date_from, date_to, result`

---

# 9. PHASE 8 — SERIES + RELATIONSHIPS

## 9.1 Series Entity
- `series { id, ownerId|editorId, title, slug (unique), description, coverImage, isPublished, createdAt }`
- `series_items { seriesId, articleId, orderIndex, partNumber, title? }`
- Endpoints:
  - Create/update/delete series (editor or author with series.manage capability)
  - Add article to series with order index
  - `GET /series/:slug` → public detail with parts ordered
  - `GET /series?featured=true` → discovery

## 9.2 Article Next/Prev in Series
- When `GET /articles/:slug` response → include `{ seriesPrev?, seriesNext?, seriesCurrentPart, seriesTotalParts, series }`

## 9.3 Follow Series (extend Follows targetType with 'series')
- Follow a series: updates in feed

## 9.4 Content Relationships Queries
- `GET /api/articles/:slug/related` → returns
  ```
  {
    sameCategory: Article[],
    sameTags: Article[],
    sameAuthor: Article[],
    inSeries: Article[] | null,
    referencedBy: Article[] | [] (future)
  }
  ```
- Default sizes: 6 each; excludes unpublished; dedupes across buckets

## 9.5 Series Reading Progress per User
- Continue reading tracked via reading history → "Continue: Part 3 — Secure API Design" on user dashboard

## 9.6 Author Series Management
- Author workspace → "Series" tab, create series then assign articles while editing

## 9.7 Content Relationships: previousArticleId / nextArticleId (Optional pointer links for editorial follow-up series outside formal Series)
- Optional fields on article, shown in reader UI as "Previous article / Next article" navigation.

---

# 10. PHASE 9 — BUILD GATE

- `npm run build` (root) — client + server pass TypeScript check + compile
- `npm test -w server` — all existing unit tests pass
- `npm run lint -w server` — no new violations
- Add new unit tests for:
  - Regex escape + search payload edge cases
  - ValidationPipe DTOs (empty email, short password)
  - Throttler → 429 (in integration test via supertest)
  - RepositoryProxy switch-in-memory test
  - Workflow unschedule
  - Readiness endpoint 5 configurations
  - Bookmarks toggle idempotent (double POST returns same state)
  - Follows composite unique (duplicate follow → no duplicate row, idempotent)
  - Comments sanitization → `<script>` in body → stripped

---

# 11. ACCEPTANCE CRITERIA (DOD)

For every Phase above, each feature is DONE only when:
1. ✅ Domain interface + type exist in `domain/models.ts`
2. ✅ Postgres repository (parameterized SQL, ensureSchema CREATE TABLE IF NOT EXISTS)
3. ✅ Mongo repository (schema + typed Mongoose model)
4. ✅ Seamless wrapper if entity should cross-fetch (articles, users, media, comments, lists...)
5. ✅ Factory provider registration in `repository.providers.ts`
6. ✅ NestJS module imported + exported in `app.module.ts`
7. ✅ Controller with HTTP verbs, guards `[JwtAuthGuard, CsrfGuard, PermissionsGuard]` where applicable
8. ✅ Decorated permissions on each endpoint
9. ✅ AuditService.log for state-changing writes
10. ✅ Spec file `.spec.ts` with at least happy path + 1 security negative case (IDOR / unauth / capability bypass)
11. ✅ Rate limiting applied to POSTs for content creation endpoints
12. ✅ `npm run build` passes server TypeScript

---

# 12. EXECUTION ORDER PRIORITY (Strict Dependency)

```
Phase 0 (4 security blockers)
   ↓
Phase 1 (7 known issues)
   ↓
Phase 2 (Comments Module — foundational for counters + moderation)
   ↓
Phase 3 (Community Backend: Bookmarks → Lists → Highlights → Reading History → Follows)
   ↓
Phase 4 (Feed + Onboarding — requires Follows + preferredTopics from Phase 3)
   ↓
Phase 5 (CMS Readiness + Rev-Compare — independent of community)
   ↓
Phase 6 (Analytics counters — requires Comments + Bookmarks/Likes to increment)
   ↓
Phase 7 (Admin Dashboard aggregates — uses all counter endpoints above)
   ↓
Phase 8 (Series + Relationships — "nice to have", no blocker dependencies)
   ↓
Phase 9 Build Gate — BLOCKING release check
```
