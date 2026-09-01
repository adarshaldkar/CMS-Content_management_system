# The Gazette CMS — Full Codebase Analysis
**Date:** 24 Aug 2026 | **Analyst:** Antigravity (Senior Engineering Review)
**Scope:** Every file in `/server/src/` + `/client/src/` + scripts + docs examined line-by-line

---

## 1. Complete File Inventory

### ROOT LEVEL
| File | Size | Status |
|---|---|---|
| `.env.example` | 946B | ✅ Exists |
| `docker-compose.yml` | 3.1KB | ✅ All 6 DBs defined |
| `package.json` | 991B | ✅ Workspace root |
| `README.md` | 1.4KB | ✅ Exists |
| `.prettierrc` | 135B | ✅ Formatting config |

### SERVER — Configuration
| File | Status | Issues |
|---|---|---|
| `server/src/main.ts` | ✅ | Helmet, CORS, ValidationPipe, GlobalExceptionFilter all applied |
| `server/src/app.module.ts` | ⚠️ BUG | ThrottlerModule — all 3 zones set to `limit: 1000` (should be `10` for auth) |
| `server/src/config/app-config.module.ts` | ✅ | Validates env on startup |
| `server/src/config/env.schema.ts` | ✅ | Zod schema for all required env vars |

### SERVER — Domain Models (`server/src/domain/`)
| File | Status | Issues |
|---|---|---|
| `models.ts` (barrel) | ✅ | All models re-exported |
| `article.model.ts` | ⚠️ BUG | `ArticleQueryFilters` has BOTH `sort?` and `sortBy?` fields — duplicate/conflicting |
| `user.model.ts` | ✅ | UserRole enum correct |
| `permissions.model.ts` | ✅ | All 30+ permissions defined with RBAC matrix |
| `audit.model.ts` | ⚠️ BUG | `AuditEventType` missing `MEDIA_UPLOADED` — media uploads logged as `ARTICLE_CREATED` |
| `taxonomy.model.ts` | ✅ | Category + Tag types correct |
| `social.model.ts` | ✅ | Bookmark, Like, Follow, FollowTargetType all present |
| `comment.model.ts` | ✅ | Comment model minimal but sufficient |
| `media.model.ts` | ✅ | Media type correct |
| `session.model.ts` | ✅ | Session model correct |
| `common.model.ts` | ✅ | PaginatedResult generic correct |
| `index.ts` | ✅ | Re-exports domain barrel |

### SERVER — Authentication Module (`server/src/modules/auth/`)
| File | Status | Issues |
|---|---|---|
| `auth.controller.ts` | 🔴 CRITICAL | `POST /auth/forgot-password` and `POST /auth/reset-password` **MISSING** — frontend calls these but backend has NO endpoints |
| `auth.service.ts` | ✅ | Argon2id, JWT, refresh rotation, constant-time checks |
| `auth.module.ts` | ✅ | All providers registered |
| `dto/auth.dto.ts` | ⚠️ | `RegisterDto` only has `@MinLength(8)` — no complexity rules; `ResetPasswordPage` zod schema requires 10+ chars + symbols but backend DTO doesn't exist |

### SERVER — Articles Module (`server/src/modules/articles/`)
| File | Status | Issues |
|---|---|---|
| `articles.controller.ts` | ⚠️ | Has BOTH `sort` and `sortBy` query params — maps `sort=popular` → `most_liked` which is good, but creates ambiguity |
| `article.service.ts` | ✅ | Thin service delegating to repo |
| `workflow.service.ts` | ✅ | 7-state machine, sanitize-html applied |
| `publisher.worker.ts` | ✅ | Scheduled publish job (cron) |
| `articles.module.ts` | ✅ | All providers wired correctly |

### SERVER — Categories Module
| File | Status |
|---|---|
| `categories.controller.ts` | ✅ GET (public), POST/PATCH/DELETE (admin-gated) |
| `categories.service.ts` | ✅ |
| `categories.module.ts` | ✅ |

### SERVER — Comments Module
| File | Status | Issues |
|---|---|---|
| `comments.controller.ts` | ✅ | All CRUD + moderation endpoints present |
| `comments.service.ts` | ✅ | Sanitization on comment body |
| `comments.module.ts` | ✅ |

### SERVER — Users Module
| File | Status | Issues |
|---|---|---|
| `users.controller.ts` | ⚠️ | Missing `GET /users/:id` (get single user profile by ID) — `UserProfilePage` fetches `/users/${userId}/stats` which routes through `follows.controller.ts`, but no dedicated user profile endpoint |
| `users.service.ts` | ✅ |
| `users.module.ts` | ✅ |

### SERVER — Likes Module
| File | Status |
|---|---|
| `likes.controller.ts` | ✅ `POST /articles/:articleId/like` + `GET /articles/:articleId/likes/count` |
| `likes.service.ts` | ✅ |

### SERVER — Bookmarks Module
| File | Status |
|---|---|
| `bookmarks.controller.ts` | ✅ `GET /me/bookmarks`, `POST /articles/:id/bookmark` |
| `bookmarks.service.ts` | ✅ |

### SERVER — Follows Module
| File | Status |
|---|---|
| `follows.controller.ts` | ✅ User follow/unfollow, category follow, `GET /users/:userId/stats`, `GET /users/:userId/following` |
| `follows.service.ts` | ✅ |

### SERVER — Media Module
| File | Status |
|---|---|
| `media.controller.ts` | ✅ Upload + list + delete |
| `media.service.ts` | ⚠️ `AuditEventType.ARTICLE_CREATED` used for media uploads (wrong type) |

### SERVER — Audit Module
| File | Status | Issues |
|---|---|---|
| `audit.controller.ts` | ✅ `GET /audit` admin-only | Missing page/filter params (only `limit` supported) |
| `audit.service.ts` | ✅ |

### SERVER — Health Module
| File | Status |
|---|---|
| `health.controller.ts` | ✅ `GET /health` public |
| `health.service.ts` | ✅ |

### SERVER — Database Layer (`server/src/database/`)
| File | Status |
|---|---|
| `database.module.ts` | ✅ All 5 DBs (pg, mongo, maria, mysql, cockroach) + ClickHouse wired |
| `postgres.service.ts` | ✅ |
| `mariadb.service.ts` | ✅ |
| `mysql.service.ts` | ✅ |
| `cockroach.service.ts` | ✅ |
| `clickhouse.service.ts` | ✅ |
| `multi-database-mesh.service.ts` | ✅ |
| `database-switcher.service.ts` | ✅ |
| `database-switcher.controller.ts` | ✅ `GET /database/status`, `POST /database/switch` |

### SERVER — Repositories (`server/src/repositories/`)
| Layer | Repos Present | Issues |
|---|---|---|
| Interfaces | 10 interfaces | ✅ All 10 domain entities covered |
| PostgreSQL | 10 repos (article, category, user, session, audit, revision, media, bookmark, like, follow) | ✅ |
| MongoDB | 7 repos (article, category, user, session, audit, revision, media) | ⚠️ **Missing:** mongo-bookmark, mongo-like, mongo-follow, mongo-comment repos |
| MariaDB | 10 repos | ✅ |
| MySQL | 10 repos | ✅ |
| CockroachDB | 10 repos | ✅ |
| ClickHouse | 3 repos (article, user, audit-log) | ✅ (limited by design for analytics) |
| Seamless (coordinator) | 5 repos (article, category, user, media, revision) | ⚠️ No seamless-bookmark/follow/like — hardcoded to PostgreSQL in providers |

**Note:** `bookmarkRepositoryProvider`, `likeRepositoryProvider`, and `followRepositoryProvider` are hardcoded to PostgreSQL only — they don't switch when DB changes. This is intentional (social graph stays in Postgres) but should be documented.

### SERVER — Common Utilities (`server/src/common/`)
| File | Status |
|---|---|
| `guards/csrf.guard.ts` | ✅ Checks `X-Requested-With: XMLHttpRequest` |
| `guards/jwt-auth.guard.ts` | ✅ Handles `@Public()` skip correctly |
| `guards/permissions.guard.ts` | ✅ SUPER_ADMIN bypass, permission array check |
| `guards/ownership.guard.ts` | ✅ `OwnershipHelper.verifyOwnership()` |
| `filters/global-exception.filter.ts` | ✅ Strips DB names, adds correlation ID |
| `decorators/security.decorators.ts` | ✅ `@Public()`, `@CurrentUser()`, `@RequirePermissions()` |
| `utils/cookie.util.ts` | ✅ `HttpOnly`, `SameSite: strict` |
| `utils/password.util.ts` | ✅ Argon2id + `dummyVerifyPassword()` |
| `utils/sanitizer.util.ts` | ✅ `sanitize-html` allowlist |
| `utils/image-validator.util.ts` | ✅ Binary magic-number validation |
| `utils/regex-escape.util.ts` | ✅ Search query escaping |

---

### CLIENT — Entry Points
| File | Status | Issues |
|---|---|---|
| `main.tsx` | ✅ Wraps App in QueryProvider + StrictMode | |
| `App.tsx` | ✅ All 24 routes registered | 2 stub routes: `/network` → `UserDashboardPage`, `/history` → `UserLibraryPage` |
| `index.css` | ✅ CSS variables, editorial design tokens |
| `providers/QueryProvider.tsx` | ✅ Proper staleTime, gcTime, retry logic |

### CLIENT — API Layer (`client/src/api/`)
| File | Status | Issues |
|---|---|---|
| `client.ts` | ✅ `withCredentials`, `X-Requested-With`, auto-refresh 401 interceptor | |
| `articles.api.ts` | ⚠️ | `ArticleFilters` type only has `categoryId` — **missing** `categorySlugs`, `tagSlugs`, `sortBy`, `fromDate`. Pages use `apiClient.get` directly instead of this helper |
| `auth.api.ts` | ✅ All auth endpoints | Has `forgotPassword` and `resetPassword` methods but **backend has no matching routes** |
| `media.api.ts` | ✅ Upload helper |

### CLIENT — Type System (`client/src/types/`)
| File | Status | Issues |
|---|---|---|
| `index.ts` (barrel) | ✅ | |
| `article.types.ts` | ✅ | All fields present including `authorName`, `categorySlug`, `tagIds`, `scheduledAt`, etc. |
| `auth.types.ts` | ⚠️ | `UserRole` type has BOTH uppercase AND lowercase variants — fragile; backend uses uppercase enum |
| `taxonomy.types.ts` | ✅ | |
| `social.types.ts` | ⚠️ | `Comment` interface has `content` field but backend returns `body` field — **field name mismatch** |
| `common.types.ts` | ⚠️ | `ActiveDatabase` type is `'postgres' | 'mongodb'` only — **missing** `'mariadb' | 'mysql' | 'cockroach' | 'clickhouse'` |
| `media.types.ts` | ✅ | |
| `audit.types.ts` | ⚠️ | Has both `actorId` and `userId` (aliases) and both `result` and `status` (aliases) — reflects backend inconsistency |

### CLIENT — Stores (`client/src/stores/`)
| File | Status | Issues |
|---|---|---|
| `authStore.ts` | ✅ | Zustand store, `checkAuth()` on mount, `hasRole()`, `hasPermission()` |
| `ui.store.ts` | ✅ | UI state |

### CLIENT — Route Guards (`client/src/routes/`)
| File | Status |
|---|---|
| `ProtectedRoute.tsx` | ✅ Redirects to `/login` with `from` state |
| `AdminRoute.tsx` | ✅ Checks `hasRole(['super_admin','admin','editor'])` |
| `PublicOnlyRoute.tsx` | ✅ Redirects logged-in users to `/dashboard` |

### CLIENT — Layout Components (`client/src/components/layout/`)
| File | Status | Issues |
|---|---|---|
| `PublicLayout.tsx` | ✅ PublicHeader + CategoryNav + Outlet + PublicFooter |
| `PublicHeader.tsx` | ✅ Search routes to `/search?q=...`, links correct |
| `CategoryNav.tsx` | 🔴 BUG | **HARDCODED categories** — 8 static categories. Does NOT fetch from `GET /categories` API. Disconnected from Admin taxonomy |
| `AdminLayout.tsx` | ✅ Sidebar nav to all 7 admin pages |
| `UserLayout.tsx` | ✅ Sidebar nav to user workspace pages |
| `PublicFooter.tsx` | ✅ |
| `SiteHeader.tsx` | 🔴 ORPHAN | **Never imported in `App.tsx` or any routed page.** Only imported in `UserPanelPage.tsx` (an orphan page). Dead code |
| `BrandLogo.tsx` | ✅ Used in auth pages |

### CLIENT — Article Components (`client/src/components/articles/`)
| File | Status |
|---|---|
| `EditorialTopicNav.tsx` | ✅ Fetches from `GET /categories` — LIVE, admin-managed |
| `EditorialFilterBar.tsx` | ✅ All sort/filter options correct |

### CLIENT — Editor Components (`client/src/components/editor/`)
| File | Status |
|---|---|
| `RichTextEditor.tsx` | ✅ |
| `WorkflowActionBar.tsx` | ✅ All 7 states covered |
| `MediaPickerModal.tsx` | ✅ Calls `GET /media` |
| `RevisionHistoryModal.tsx` | ✅ Calls `GET /articles/:id/revisions` |

### CLIENT — Pages (PUBLIC)
| Page | Route | API Calls | Status | Issues |
|---|---|---|---|---|
| `HomePage.tsx` | `/` | `GET /articles?status=published` | ✅ | |
| `ArticleReaderPage.tsx` | `/articles/:slug` | `GET /articles/slug/:slug`, `GET /articles/:id/likes/count`, `GET /articles/:id/comments`, `POST /articles/:id/like`, `POST /articles/:id/bookmark` | ✅ | |
| `CategoryArchivePage.tsx` | `/category/:slug` | `GET /articles?categorySlugs=:slug` | ⚠️ | Uses `(article as any).author?.name` cast — should use `article.authorName` |
| `TagArchivePage.tsx` | `/tags/:slug` | `GET /articles?status=published` | 🔴 BUG | **Does NOT filter by tag slug** — fetches all published articles and ignores the `slug` param. Missing `tagSlugs: slug` in query |
| `SearchPage.tsx` | `/search` | `GET /articles` with full filter params | ✅ | |
| `ForYouFeedPage.tsx` | `/feed` | `GET /articles`, `GET /users/:id/stats`, `GET /users/:id/following`, `POST /users/:id/follow` | ✅ | Has hardcoded `CAT_LABELS` record — not fetched from API |

### CLIENT — Pages (AUTH)
| Page | Route | Status | Issues |
|---|---|---|---|
| `LoginPage.tsx` | `/login` | ✅ | Uses `authApi.login()` → `POST /auth/login` |
| `RegisterPage.tsx` | `/register` | ✅ | Uses `authApi.register()` → `POST /auth/register` |
| `ForgotPasswordPage.tsx` | `/forgot-password` | 🔴 CRITICAL | Calls `authApi.forgotPassword()` → `POST /auth/forgot-password` — **backend endpoint MISSING** |
| `ResetPasswordPage.tsx` | `/reset-password` | 🔴 CRITICAL | Calls `authApi.resetPassword()` → `POST /auth/reset-password` — **backend endpoint MISSING** |

### CLIENT — Pages (USER WORKSPACE)
| Page | Route | API Calls | Status |
|---|---|---|---|
| `UserDashboardPage.tsx` | `/dashboard` | `GET /articles?limit=50` | ✅ |
| `StoriesManagerPage.tsx` | `/stories` | `GET /articles`, `DELETE /articles/:id` | ✅ |
| `UserLibraryPage.tsx` | `/library` | `GET /me/bookmarks`, `DELETE /articles/:id/bookmark` | ✅ |
| `UserProfilePage.tsx` | `/profile` | `GET /users/:id/stats`, `PATCH /auth/me`, `PATCH /auth/change-password` | ✅ |
| `UserSettingsPage.tsx` | `/settings` | `PATCH /auth/me`, `PATCH /auth/change-password` | ✅ |
| `ArticleEditorPage.tsx` | `/editor/:id` | `GET /articles/id/:id`, `POST /articles`, `PATCH /articles/:id`, `POST /articles/:id/transition`, `GET /articles/:id/revisions`, `GET /media` | ✅ |
| `OnboardingPage.tsx` | `/onboarding` | `PATCH /auth/me` (preferredTopics) | ✅ |

### CLIENT — Pages (ADMIN)
| Page | Route | API Calls | Status | Issues |
|---|---|---|---|---|
| `EditorialReviewPage.tsx` | `/admin/review` | `GET /articles?status=pending_review`, `POST /articles/:id/transition` | ✅ | |
| `UserManagementPage.tsx` | `/admin/users` | `GET /users`, `PATCH /users/:id/role`, `PATCH /users/:id/status` | ✅ | |
| `TaxonomyManagerPage.tsx` | `/admin/categories` | `GET /categories`, `POST /categories`, `PATCH /categories/:id`, `DELETE /categories/:id` | ⚠️ | Fetches `Category[]` directly but backend returns `PaginatedResult<Category>` — may break on large datasets |
| `MediaLibraryPage.tsx` | `/admin/media` | `GET /media`, `POST /media/upload`, `DELETE /media/:id` | ✅ | |
| `CommentsModerationPage.tsx` | `/admin/comments` | **HARDCODED MOCK DATA** | 🔴 BUG | Returns static mock array — NOT connected to `GET /articles/:id/comments` or any comments API |
| `AuditLogExplorerPage.tsx` | `/admin/audit` | `GET /audit?limit=100` | ✅ | |
| `DatabaseSwitcherPage.tsx` | `/admin/database` | `GET /database/status`, `POST /database/switch` | ✅ | |

### CLIENT — Orphan / Dead Pages
| Page | Status |
|---|---|
| `AdminPanelPage.tsx` | 🔴 ORPHAN — **NOT imported** in `App.tsx`. Never accessible. Was the old admin panel before the new admin suite. |
| `UserPanelPage.tsx` | 🔴 ORPHAN — **NOT imported** in `App.tsx`. Never accessible. Old user panel. |
| `SiteHeader.tsx` (`PublicLayout` export) | 🔴 ORPHAN — `UserPanelPage.tsx` imports it but `UserPanelPage.tsx` is itself never routed. |

### CLIENT — Scripts (`scripts/`)
| File | Status |
|---|---|
| `seed-admin.mjs` | ✅ Utility: seeds super_admin user |
| `seed-categories.mjs` | ✅ Utility: seeds initial categories |
| `seed-msn-channels.mjs` | ⚠️ Old MSN seed — may add unwanted categories |
| `replicate-6-database-mesh.mjs` | ✅ Syncs all 6 DBs |
| `cleanup-duplicate-categories.mjs` | ✅ Removes duplicates |
| `promote-admin.mjs` | ✅ Promotes user to admin by email |
| `check-mongo.mjs` | ✅ Mongo health check |
| `sync-pg-to-mongo.mjs` | ✅ One-way PG → Mongo sync |
| `update-article-categories.mjs` | ✅ Bulk category reassignment |

---

## 2. Critical Issues (Fix Immediately)

### 🔴 Issue 1: `ForgotPassword` and `ResetPassword` — Backend Endpoints MISSING

**Frontend:** `ForgotPasswordPage.tsx` calls `POST /auth/forgot-password`, `ResetPasswordPage.tsx` calls `POST /auth/reset-password`

**Backend:** `auth.controller.ts` has NO such routes. These will always 404.

**Fix:** Add these two endpoints to `auth.controller.ts`:
```typescript
@Public()
@Post('forgot-password')
@HttpCode(HttpStatus.OK)
async forgotPassword(@Body() body: { email: string }): Promise<{ message: string }> {
  await this.authService.forgotPassword(body.email);
  return { message: 'If an account exists, a reset link has been sent.' };
}

@Public()
@Post('reset-password')
@HttpCode(HttpStatus.OK)
async resetPassword(@Body() body: { token: string; newPassword: string }): Promise<{ message: string }> {
  await this.authService.resetPassword(body.token, body.newPassword);
  return { message: 'Password reset successful. Please log in.' };
}
```
Plus add `forgotPassword()` and `resetPassword()` to `auth.service.ts`.

---

### 🔴 Issue 2: `TagArchivePage` Does NOT Filter by Tag

**File:** `client/src/pages/TagArchivePage.tsx` line 15-18

```tsx
// CURRENT BUG — ignores `slug` param completely
const { data } = await apiClient.get<PaginatedResult<Article>>('/articles', {
  params: { status: 'published', limit: 20 },
});
```

**Fix:** Pass `tagSlugs: slug` to the query params:
```tsx
params: { status: 'published', tagSlugs: slug, limit: 20 }
```

---

### 🔴 Issue 3: `CommentsModerationPage` Uses Hardcoded Mock Data

**File:** `client/src/pages/admin/CommentsModerationPage.tsx` lines 18-37

The query function returns a **static array** instead of calling any API. This page is completely disconnected from the backend comments system.

**Fix:** Replace with real API call to `/articles/:id/comments` or a new admin `GET /admin/comments` endpoint.

---

### 🔴 Issue 4: `CategoryNav` Uses Hardcoded Static Categories

**File:** `client/src/components/layout/CategoryNav.tsx`

8 categories are hardcoded. Admin-created categories via `TaxonomyManagerPage` will never appear here. `EditorialTopicNav` (on SearchPage) correctly fetches from API — `CategoryNav` must do the same.

---

### 🔴 Issue 5: Orphan Pages — `AdminPanelPage`, `UserPanelPage`

Neither page is imported in `App.tsx`. They are dead code that will never be reached. They may confuse future developers.

---

## 3. Medium Issues

| # | Issue | File | Fix |
|---|---|---|---|
| 6 | `common.types.ts` `ActiveDatabase` only lists `postgres\|mongodb` | `types/common.types.ts` | Add all 6 DB types |
| 7 | `articles.api.ts` `ArticleFilters` missing `categorySlugs`, `tagSlugs`, `sortBy`, `fromDate` | `api/articles.api.ts` | Pages bypass this type and call `apiClient` directly — fix the type or remove dead type |
| 8 | `social.types.ts` Comment has `content` field but backend returns `body` field | `types/social.types.ts` | Rename to `body` or add both |
| 9 | `TaxonomyManagerPage` treats response as `Category[]` but API returns `PaginatedResult<Category>` | `admin/TaxonomyManagerPage.tsx` L27 | Fix to destructure `.items` from response |
| 10 | `audit.model.ts` missing `MEDIA_UPLOADED` event type | `domain/audit.model.ts` | Add `MEDIA_UPLOADED = 'MEDIA_UPLOADED'` |
| 11 | `auth.dto.ts` `RegisterDto` no password complexity | `dto/auth.dto.ts` | Add `@Matches` decorators |
| 12 | ThrottlerModule — all zones at `limit: 1000` | `app.module.ts` | Change `auth-sensitive` to `limit: 10` |
| 13 | MongoDB repos missing: bookmark, like, follow, comment | `repositories/mongo/` | Mongo repos for these entities don't exist — social graph hardcoded to Postgres even when DB is switched to MongoDB |

---

## 4. Low Issues

| # | Issue | Fix |
|---|---|---|
| 14 | `ForYouFeedPage` has hardcoded `CAT_LABELS` record | Fetch category names from API |
| 15 | `auth.types.ts` UserRole duplicates uppercase + lowercase variants | Standardize; use server enum casing |
| 16 | `SiteHeader.tsx` is a dead component | Remove or re-purpose |
| 17 | `article.model.ts` has both `sort?` and `sortBy?` fields | Remove `sort?`, use `sortBy` only |
| 18 | `audit.controller.ts` only supports `limit` — no date or actor filtering | Add `actorId`, `action`, `fromDate` query params |
| 19 | `AdminPanelPage` and `UserPanelPage` should be removed or properly routed | Clean up orphan files |
| 20 | `seed-msn-channels.mjs` seeds MSN-style categories — conflicts with admin taxonomy | Remove or guard with env flag |

---

## 5. Frontend ↔ Backend Linkage Summary

```
API Route                          | Backend      | Frontend Consumer           | Status
-----------------------------------|--------------|-----------------------------|---------
GET    /health                     | ✅           | AdminPanelPage, client.ts   | ✅
POST   /auth/register              | ✅           | RegisterPage                | ✅
POST   /auth/login                 | ✅           | LoginPage                   | ✅
POST   /auth/logout                | ✅           | UserLayout, UserSettingsPage | ✅
POST   /auth/logout-all            | ✅           | UserSettingsPage            | ✅
POST   /auth/refresh               | ✅           | client.ts (auto interceptor)| ✅
GET    /auth/me                    | ✅           | authStore.checkAuth()       | ✅
PATCH  /auth/me                    | ✅           | UserProfilePage, Settings   | ✅
PATCH  /auth/change-password       | ✅           | UserSettingsPage            | ✅
POST   /auth/forgot-password       | ❌ MISSING   | ForgotPasswordPage          | 🔴
POST   /auth/reset-password        | ❌ MISSING   | ResetPasswordPage           | 🔴
GET    /articles                   | ✅           | HomePage, SearchPage, etc.  | ✅
GET    /articles/slug/:slug        | ✅           | ArticleReaderPage           | ✅
GET    /articles/id/:id            | ✅           | ArticleEditorPage           | ✅
POST   /articles                   | ✅           | ArticleEditorPage           | ✅
PATCH  /articles/:id               | ✅           | ArticleEditorPage           | ✅
POST   /articles/:id/transition    | ✅           | WorkflowActionBar, ReviewPage| ✅
GET    /articles/:id/revisions     | ✅           | RevisionHistoryModal        | ✅
POST   /articles/:id/revisions/:r/restore | ✅    | RevisionHistoryModal        | ✅
POST   /articles/:id/like          | ✅           | ArticleReaderPage           | ✅
GET    /articles/:id/likes/count   | ✅           | ArticleReaderPage           | ✅
POST   /articles/:id/bookmark      | ✅           | ArticleReaderPage           | ✅
DELETE /articles/:id/bookmark      | ✅           | UserLibraryPage             | ✅
GET    /articles/:id/comments      | ✅           | ArticleReaderPage           | ✅
POST   /articles/:id/comments      | ✅           | ArticleReaderPage           | ✅
PATCH  /comments/:id               | ✅           | ArticleReaderPage           | ✅
DELETE /comments/:id               | ✅           | ArticleReaderPage           | ✅
POST   /comments/:id/hide          | ✅           | CommentsModerationPage (not connected) | ⚠️
GET    /categories                 | ✅           | TaxonomyManager, EditorialTopicNav | ✅
POST   /categories                 | ✅           | TaxonomyManagerPage         | ✅
PATCH  /categories/:id             | ✅           | TaxonomyManagerPage         | ✅
DELETE /categories/:id             | ✅           | TaxonomyManagerPage         | ✅
GET    /users                      | ✅           | UserManagementPage          | ✅
PATCH  /users/:id/role             | ✅           | UserManagementPage          | ✅
PATCH  /users/:id/status           | ✅           | UserManagementPage          | ✅
GET    /users/:userId/stats        | ✅           | ForYouFeedPage, UserProfilePage | ✅
GET    /users/:userId/followers    | ✅           | UserProfilePage             | ✅
GET    /users/:userId/following    | ✅           | ForYouFeedPage              | ✅
POST   /users/:userId/follow       | ✅           | ForYouFeedPage              | ✅
DELETE /users/:userId/follow       | ✅           | ForYouFeedPage              | ✅
GET    /me/bookmarks               | ✅           | UserLibraryPage             | ✅
GET    /me/following/topics        | ✅           | (available, not used in UI) | ⚠️
GET    /media                      | ✅           | MediaLibraryPage, MediaPickerModal | ✅
POST   /media/upload               | ✅           | MediaLibraryPage, ArticleEditor | ✅
DELETE /media/:id                  | ✅           | MediaLibraryPage            | ✅
GET    /audit                      | ✅           | AuditLogExplorerPage        | ✅
GET    /database/status            | ✅           | DatabaseSwitcherPage        | ✅
POST   /database/switch            | ✅           | DatabaseSwitcherPage        | ✅
```

---

## 6. Priority Fix Order

```
Priority 1 — CRITICAL (breaks user flow):
  1. Add POST /auth/forgot-password endpoint to auth.controller.ts + auth.service.ts
  2. Add POST /auth/reset-password endpoint to auth.controller.ts + auth.service.ts
  3. Fix TagArchivePage — add tagSlugs filter to API call
  4. Fix CommentsModerationPage — replace mock data with real API call

Priority 2 — HIGH (user-facing inconsistency):
  5. Fix CategoryNav.tsx — fetch categories from GET /categories instead of hardcoding
  6. Fix TaxonomyManagerPage — handle PaginatedResult<Category> not raw Category[]
  7. Fix common.types.ts — add all 6 DB engine types to ActiveDatabase
  8. Fix social.types.ts — Comment.content → Comment.body

Priority 3 — MEDIUM (code quality):
  9.  Add MEDIA_UPLOADED to AuditEventType and use it in media.service.ts
  10. Remove duplicate `sort?` field from ArticleQueryFilters — keep `sortBy?` only
  11. Fix ThrottlerModule auth-sensitive limit: 1000 → 10
  12. Remove orphan files: AdminPanelPage.tsx, UserPanelPage.tsx, SiteHeader.tsx (if unused)
  13. Add MongoDB repos for bookmark, like, follow, comment (currently hardcoded to Postgres)

Priority 4 — LOW (improvement):
  14. Add password complexity to RegisterDto
  15. Add date/actor filter params to GET /audit
  16. Fetch CAT_LABELS dynamically in ForYouFeedPage
  17. Run npm audit and patch advisories
```
