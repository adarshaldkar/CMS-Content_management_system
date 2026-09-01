# The Gazette — Deep Codebase Analysis Report
**Date:** 24 Aug 2026 | **Analyst:** Senior Engineering Review (Antigravity)

---

## 1. Architecture Overview

```
┌──────────────────────────────────────────────────────────────────┐
│  Client (Vite + React 18 + TypeScript)   :5173                  │
│  React Router v6 → Pages → Tanstack Query → apiClient           │
│  Zustand Auth Store ← axios interceptor (401 auto-refresh)       │
├──────────────────────────────────────────────────────────────────┤
│  Server (NestJS + TypeScript)                            :3000   │
│  main.ts: Helmet CSP, CORS, ValidationPipe, ThrottlerGuard       │
│  GlobalExceptionFilter → JwtAuthGuard → CsrfGuard → Perms Guard │
│  11 Modules: auth, articles, categories, users, comments,        │
│   likes, bookmarks, follows, media, audit, health                │
│  Repository Proxy → 6 DB Delegates                               │
├──────────────────────────────────────────────────────────────────┤
│  PostgreSQL:5432 | MongoDB:27017 | MariaDB:3307                  │
│  MySQL:3308 | CockroachDB:26257 | ClickHouse:8123                │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. OWASP Top 10 (2021) Compliance Audit

### A01 — Broken Access Control ✅ STRONG
| Check | Implementation | Status |
|---|---|---|
| Route-level auth | `JwtAuthGuard` on all non-`@Public()` routes | ✅ |
| Permission-based | `PermissionsGuard` + `RequirePermissions()` decorator | ✅ |
| Ownership checks | `OwnershipHelper.verifyOwnership()` on articles, media | ✅ |
| Role hierarchy | `ROLE_PERMISSIONS` map — SUPER_ADMIN > ADMIN > EDITOR > AUTHOR | ✅ |
| Admin frontend route | `AdminRoute.tsx` checks `hasRole(['super_admin','admin','editor'])` | ✅ |
| Authors can't self-publish | `validateTransition()` blocks `DRAFT → PUBLISHED` without editor/admin | ✅ |

---

### A02 — Cryptographic Failures ✅ OUTSTANDING
| Check | Implementation | Status |
|---|---|---|
| Password hashing | **Argon2id** with 19 MiB memory cost, t=2, p=1 | ✅ |
| JWT signing | HS256 with `issuer + audience` claim verification | ✅ |
| JWT in cookies | `HttpOnly: true`, `SameSite: strict`, `__Host-` prefix in prod | ✅ |
| Token hash storage | Refresh tokens stored as SHA-256 hash in DB (never plaintext) | ✅ |
| Atomic token rotation | Reuse detection + entire family revocation on reuse | ✅ |

---

### A03 — Injection ✅ VERY STRONG
| Check | Implementation | Status |
|---|---|---|
| SQL injection (all DBs) | 100% parameterized `$1,$2..` / `?` — zero string concatenation | ✅ |
| XSS/HTML injection | `sanitize-html` — allowlist tags, `rel=noopener noreferrer` enforced | ✅ |
| Input validation | `ValidationPipe` with `whitelist: true`, `forbidNonWhitelisted: true` | ✅ |
| Mass assignment | Whitelist mode strips undeclared DTO properties | ✅ |
| SVG/active content | Magic number validator blocks SVG/XML at binary level | ✅ |

---

### A04 — Insecure Design ✅ GOOD
| Check | Implementation | Status |
|---|---|---|
| Editorial workflow state machine | 7 states with enforced transition rules | ✅ |
| Optimistic concurrency | `expectedVersion` checks prevent lost-update race conditions | ✅ |
| Immutable revision history | Every save creates a new snapshot | ✅ |
| Constant-time auth | `dummyVerifyPassword()` prevents user enumeration timing attacks | ✅ |

---

### A05 — Security Misconfiguration ✅ STRONG
| Check | Implementation | Status |
|---|---|---|
| Helmet CSP | `defaultSrc: self`, `frameAncestors: none`, `objectSrc: none` | ✅ |
| CORS allowlist | Strict origin — `CLIENT_URL` + localhost variants only | ✅ |
| Swagger disabled in prod | `if (nodeEnv !== 'production')` guard | ✅ |
| Stack trace suppression | GlobalExceptionFilter sanitizes error names — no DB leaks | ✅ |
| Error correlation IDs | `ERR-YYYYMMDD-XXXXXX` — trackable without leaking internals | ✅ |

---

### A06 — Vulnerable & Outdated Components ⚠ UNVERIFIED
> `npm audit` has not been run. **Action required before any production deployment.**
> argon2, helmet, sanitize-html, jsonwebtoken — known secure versions exist but pinning unverified.

---

### A07 — Identification & Authentication Failures ✅ STRONG (with 1 gap)
| Check | Implementation | Status |
|---|---|---|
| Refresh token rotation | Atomic swap with reuse detection | ✅ |
| Session revocation on password change | `revokeAllUserSessions()` called | ✅ |
| Rate limiting on auth | ThrottlerModule on `auth-sensitive` | ⚠ |

> **⚠ CRITICAL GAP:** ThrottlerModule sets `limit: 1000` per 60s on auth routes.
> This allows 1,000 login attempts per minute — brute force is effectively unconstrained.
> **Must be changed to `limit: 10` for auth-sensitive.**

---

### A08 — Software & Data Integrity ✅ STRONG
| Check | Implementation | Status |
|---|---|---|
| File upload magic number check | `validateImageBuffer()` — binary signature verification | ✅ |
| MIME spoofing blocked | Detected MIME from bytes, not from client `Content-Type` header | ✅ |
| Randomized file names | `crypto.randomUUID()` prevents path traversal | ✅ |
| 5 MB size limit | Enforced in `FileInterceptor` AND service layer | ✅ |

---

### A09 — Security Logging & Monitoring ✅ STRONG
All critical security events are logged to AuditLog with IP + UserAgent:
`LOGIN_SUCCESS`, `LOGIN_FAILURE`, `REGISTER_SUCCESS`, `LOGOUT`, `LOGOUT_ALL_SESSIONS`,
`REFRESH_TOKEN_REUSE (HIGH_SEVERITY_ALERT)`, `ACCESS_DENIED`, `ARTICLE_*`, `PASSWORD_CHANGED`, `PROFILE_UPDATED`

> **⚠ Gap:** No alerting/webhook on `REFRESH_TOKEN_REUSE`. In production, these should trigger an immediate security notification.

---

### A10 — SSRF ✅ ADEQUATE
No server-side external URL fetching from user input detected.

---

## 3. Feature Completeness Matrix

### Backend (11 Modules — All Implemented)
| Feature | Status | Frontend Connected |
|---|---|---|
| Auth (register/login/logout/refresh/change-password) | ✅ | ✅ |
| JWT + atomic refresh token rotation | ✅ | ✅ auto-refresh in `client.ts` |
| Articles CRUD + editorial workflow | ✅ | ✅ Editor + Admin Review |
| Optimistic concurrency + revision history | ✅ | ✅ |
| Article content HTML sanitization | ✅ | ✅ |
| Reading time calculation | ✅ | ✅ ArticleReaderPage |
| Editorial filter engine (categorySlugs, tagSlugs, sortBy, fromDate, toDate, search) | ✅ | ✅ SearchPage |
| Dynamic Admin taxonomy (categories from DB) | ✅ | ✅ EditorialTopicNav |
| Categories CRUD | ✅ | ✅ TaxonomyManagerPage |
| User management (role + status) | ✅ | ✅ UserManagementPage |
| Comments (CRUD + moderation + hide) | ✅ | ✅ ArticleReaderPage + ModerationPage |
| Bookmarks | ✅ | ✅ UserLibraryPage |
| Likes | ✅ | ✅ ArticleReaderPage |
| Follows (user + category) | ✅ | ✅ ForYouFeedPage |
| Media upload (magic-number validated) | ✅ | ✅ ArticleEditorPage |
| Audit log + explorer | ✅ | ✅ AuditLogExplorerPage |
| Health check + DB status | ✅ | ✅ DatabaseSwitcherPage |
| 6-DB Repository Proxy (runtime switchable) | ✅ | ✅ via API |
| Scheduled publish worker | ✅ | ✅ Admin |

### Frontend (24 Pages — All Connected)
| Section | Pages | Status |
|---|---|---|
| Public Editorial | HomePage, ArticleReaderPage, CategoryArchivePage, TagArchivePage, SearchPage, ForYouFeedPage | ✅ |
| Auth | Login, Register, ForgotPassword, ResetPassword | ✅ |
| User Workspace | Dashboard, Stories, Library, Profile, Settings, Onboarding | ✅ |
| Admin Suite | EditorialReview, UserManagement, TaxonomyManager, MediaLibrary, CommentsModeration, AuditLogExplorer, DatabaseSwitcher | ✅ |

---

## 4. Backend–Frontend Connectivity

| Layer | Implementation | Status |
|---|---|---|
| API Base URL | `/api` proxy via Vite dev server | ✅ |
| CSRF header | `X-Requested-With: XMLHttpRequest` sent on all requests | ✅ |
| Cookie auth | `withCredentials: true` on axios client | ✅ |
| 401 auto-refresh | Interceptor retries with token refresh + queue | ✅ |
| Auth hydration on load | `checkAuth()` calls `GET /api/auth/me` on app mount | ✅ |
| Role-based routing | `AdminRoute` checks roles, `ProtectedRoute` checks auth | ✅ |

---

## 5. Issues & Recommended Fixes

### 🔴 Critical
| # | Issue | Location | Fix |
|---|---|---|---|
| 1 | ThrottlerModule allows 1000 login attempts/min | `app.module.ts` | Change `auth-sensitive` → `limit: 10` |

### 🟡 Medium
| # | Issue | Location | Fix |
|---|---|---|---|
| 2 | Duplicate `sort` + `sortBy` fields in `ArticleQueryFilters` | `article.model.ts` | Remove `sort?` field, standardize on `sortBy` everywhere |
| 3 | `authorName` missing from client `Article` type | `types/article.types.ts` | Add `authorName?: string` field |
| 4 | No password complexity policy (only length 8) | `auth.dto.ts` | Add `@Matches` for uppercase + number requirement |
| 5 | `npm audit` not run | root | Run before any production deployment |
| 6 | No rate limit on `GET /api/articles` (crawl risk) | `articles.controller.ts` | Add `@Throttle()` on list endpoint |

### 🟢 Low
| # | Issue | Fix |
|---|---|---|
| 7 | `CategoryNav.tsx` uses hardcoded static categories | Fetch from `/api/categories` like `EditorialTopicNav` |
| 8 | `MediaService` logs media upload with `ARTICLE_CREATED` audit type | Create dedicated `MEDIA_UPLOADED` audit event type |
| 9 | `EditorialTopicNav` re-fetches categories on every mount | Add `staleTime: 5 * 60 * 1000` to React Query |
| 10 | `CategoryArchivePage` uses `(article as any).author?.name` cast | Use `authorName` field from API |

---

## 6. Security Score

| OWASP | Status | Score |
|---|---|---|
| A01 Access Control | ✅ Strong | 9/10 |
| A02 Cryptographic | ✅ Outstanding | 10/10 |
| A03 Injection | ✅ Very Strong | 10/10 |
| A04 Insecure Design | ✅ Good | 8/10 |
| A05 Misconfiguration | ✅ Strong | 9/10 |
| A06 Components | ⚠ Unverified | 6/10 |
| A07 Auth Failures | ✅ Strong (rate limit gap) | 7/10 |
| A08 Data Integrity | ✅ Strong | 9/10 |
| A09 Logging | ✅ Strong | 9/10 |
| A10 SSRF | ✅ Adequate | 9/10 |

**Overall: 8.6/10** — Production-grade with the rate-limit fix and npm audit applied.
