# Technical Architecture & Locked Technology Stack
## CMS-Driven Editorial Content Platform

---

## ⚠️ Policy: Final Technology Decisions

> **The following technology decisions are FINAL. Do not replace, introduce, or substitute technologies during implementation without explicit project approval.**

No ambiguous "Option A or Option B". All choices below are locked for frontend, backend, database, auth, security, testing, and infrastructure.

**Source of truth for:** stack · auth · DB switch concurrency · error contract · NestJS module layout

---

## 1. Complete Locked Stack

### Frontend (Locked)

| Layer | Final Choice | Why |
|-------|--------------|-----|
| Framework | **React 18+ with TypeScript (strict mode)** | Component architecture + end-to-end type safety |
| Build | **Vite** | Fast dev/build |
| Styling | **Tailwind CSS + CSS variables** | Custom editorial design tokens (`DESIGN-SYSTEM.md`) |
| Routing | **React Router v6** | Public / User / Admin route separation |
| Server state | **TanStack Query v5** | API cache, loading/error, mutations, refetch |
| Client state | **Zustand** | Auth session info + UI state only — **not** API data |
| Forms | **React Hook Form** | Complex CMS/admin forms |
| Validation | **Zod** | Shared type-safe schemas (client + server) |
| Rich text editor | **TipTap** | Structured CMS WYSIWYG (ProseMirror-based) |
| HTTP client | **Axios** | Interceptors, credentials, centralized API layer |
| Icons | **Lucide React** | Restrained, consistent icon set |

**Not used:** Lexical, fetch-only client, React Context for global state, default shadcn look without customization.

### Backend (Locked)

| Layer | Final Choice | Why |
|-------|--------------|-----|
| Runtime | **Node.js LTS** | Stable server runtime |
| Language | **TypeScript (strict)** | End-to-end type safety |
| Framework | **NestJS** | Modules, DI, guards, pipes, interceptors — fits RBAC/CMS complexity |
| API style | **REST** | Clear resource endpoints |
| API docs | **OpenAPI / Swagger** (`@nestjs/swagger`) | Documented API contract; disabled or protected in production |
| PostgreSQL access | **`pg` (connection pool)** | Explicit parameterized SQL control |
| MongoDB access | **Mongoose** | Typed schemas, validation |
| Password hashing | **Argon2id** | Strong adaptive hashing |
| Validation | **Zod via `nestjs-zod`** | Single schema source for DTOs and types |
| HTML sanitization | **`sanitize-html`** | CMS XSS protection |
| Security headers | **`helmet`** | CSP, HSTS, frame protection, etc. |
| CORS | **`@nestjs/config` + explicit allowlist** | No wildcard with credentials |
| Rate limiting | **`@nestjs/throttler`** | Login, register, reset, admin, upload |
| File uploads | **`multer` + validation** | MIME, extension, size, safe filenames |
| Logging | **Pino (`nestjs-pino`)** | Structured JSON logs, correlation IDs, secret redaction |
| Migrations (Postgres) | **`node-pg-migrate`** | Versioned SQL migrations |

**Not used:** Express as primary framework, Prisma, Knex, bcrypt (Argon2id only), Winston, localStorage for auth tokens.

### Database & Abstraction (Locked)

| Layer | Final Choice |
|-------|--------------|
| Primary relational DB | **PostgreSQL** |
| Secondary document DB | **MongoDB** |
| Abstraction | **Repository interfaces** per entity |
| Implementations | `Postgres*Repository` + `Mongo*Repository` |
| Active DB config | Server-side runtime flag; admin switch via API |
| Data rule | Independent datasets — **no auto-migration on switch** |

### Auth & Security (Locked)

| Layer | Final Choice |
|-------|--------------|
| Session model | **JWT + HttpOnly Secure cookies** |
| Access token | Short-lived JWT (15 min) in `access_token` cookie |
| Refresh token | Rotating token (7 days) in `refresh_token` cookie |
| CSRF | `SameSite=Strict` + custom header on mutating requests |
| Authorization | **RBAC + object ownership** (`RBAC-PERMISSIONS.md`) |
| Audit | Dedicated audit log module + admin UI |

### Testing (Locked)

| Layer | Final Choice | Scope |
|-------|--------------|-------|
| Unit | **Jest** | Services, validators, workflow, sanitizers |
| API integration | **Supertest** | Auth, articles, CMS, admin, DB switch |
| E2E | **Playwright** | Register → login → create → review → publish → public read |
| Security | **`tests/security/` (Jest + Supertest)** | OWASP A01–A10 (`TESTING.md`) |

### Infrastructure (Locked)

| Layer | Final Choice |
|-------|--------------|
| Containers | **Docker + Docker Compose** |
| Local services | PostgreSQL + MongoDB via Compose |
| CI | **GitHub Actions** |
| CI jobs | lint, Jest, Supertest, `npm audit`, secret scan |
| Package manager | **npm** with committed `package-lock.json` |

---

## 2. Why This Stack Fits This Project

This is not a simple MERN site. It is a **database-agnostic CMS platform** with dual databases, workflow, RBAC, and admin-controlled switching.

```text
                    CMS PLATFORM
                         │
       ┌─────────────────┼─────────────────┐
       │                 │                 │
    PUBLIC            USER CMS          ADMIN
       │                 │                 │
       └─────────────────┼─────────────────┘
                         │
                     NestJS API
                         │
              ┌──────────┴──────────┐
              │                     │
         PostgreSQL             MongoDB
              │                     │
              └──────── Repository Layer
                         │
                  ArticleService
                  (does not care which DB is active)
```

### Repository Pattern (Required)

```typescript
export interface ArticleRepository {
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>>;
  create(data: CreateArticleDto): Promise<Article>;
  update(id: string, data: UpdateArticleDto): Promise<Article>;
  delete(id: string): Promise<boolean>;
  updateStatus(id: string, status: ContentStatus): Promise<Article>;
}
```

Implementations: `PostgresArticleRepository` · `MongoArticleRepository`

Business services inject `ArticleRepository` — never `pg` or Mongoose directly.

---

## 3. NestJS Module Layout (Locked)

```text
server/src/
├── main.ts
├── app.module.ts
├── common/
│   ├── guards/           # JwtAuthGuard, PermissionsGuard, OwnershipGuard
│   ├── filters/          # Global exception filter (referenceId)
│   ├── interceptors/     # Request ID, logging
│   └── pipes/            # Zod validation
├── modules/
│   ├── auth/
│   ├── users/
│   ├── articles/
│   ├── categories/
│   ├── tags/
│   ├── comments/
│   ├── cms/
│   ├── media/
│   ├── admin/
│   ├── audit/
│   └── database/         # Active DB config + switch
├── repositories/
│   ├── interfaces/
│   ├── postgres/
│   └── mongo/
└── adapters/             # CMSAdapter (future external CMS)
```

---

## 4. Frontend State Rules (Locked)

| Concern | Tool | Store |
|---------|------|-------|
| API data (articles, users, lists) | **TanStack Query** | Server cache |
| Current user session summary | **Zustand** | Client |
| UI (sidebar, modals, theme) | **Zustand** | Client |
| Form field state | **React Hook Form** | Local |

**Never** put the article database or full CMS content in Zustand.

---

## 5. Locked Authentication & Session Architecture

### HttpOnly Cookie Strategy (Not localStorage)

* **Access token:** Short-lived JWT (15 minutes)
  - Cookie: `access_token` — `HttpOnly`, `Secure`, `SameSite=Strict`
  - Inaccessible to JavaScript (XSS-resistant)
* **Refresh token:** Crypto-random, rotated (7 days)
  - Cookie: `refresh_token` — same flags, path `/auth/refresh`
  - Stored hashed in DB with device/IP metadata
* **Logout:** Clear cookies + revoke refresh token in DB
* **CSRF:** `SameSite=Strict` + `X-Requested-With` or CSRF header on `POST`/`PATCH`/`DELETE`

```text
Browser ──HTTPS──► HttpOnly Cookie ──► NestJS
                                         ├── Authentication
                                         ├── Role check
                                         ├── Ownership check
                                         └── Business rules
```

Frontend auth UI ≠ authorization. Hiding "Delete User" does not secure `DELETE /api/users/:id`.

---

## 6. PostgreSQL vs MongoDB Roles

**PostgreSQL (primary relational):** Users, articles, categories, tags, comments, bookmarks, roles, permissions, audit logs, refresh tokens — ideal for relational CMS data.

**MongoDB (required second DB):** Same domain entities via repository implementations; **independent dataset**. Included because the project requires dual-DB + admin switching — not because MongoDB is automatically "better."

```text
ACTIVE DATABASE
PostgreSQL ●    ← admin selects
MongoDB    ○
Backend swaps repository implementation — data stays in each DB
```

---

## 7. Database Switching Concurrency & Mutex

When admin switches PostgreSQL ↔ MongoDB:

```text
Admin initiates switch
      ↓
Super Admin + database.switch permission
      ↓
Healthcheck target (current DB stays active)
      ↓
SUCCESS                          FAILURE
  ↓                                  ↓
Acquire write mutex (<150ms)    Keep current DB
Atomic repository pointer swap  Log failure
Release mutex + drain buffer    Safe error to admin
Log SUCCESS
```

**Rules:**
1. Reads continue on current DB until pointer swap
2. Write lock < 150ms during swap
3. Failed healthcheck → never acquire lock, never touch active DB

---

## 8. Error Handling Contract

```typescript
interface ApiErrorResponse {
  statusCode: number;
  message: string;        // Safe, generic
  error: string;          // HTTP error name
  referenceId: string;    // e.g. "ERR-2026-90412"
  timestamp: string;
}
```

- **Client:** Never receives SQL errors, connection strings, stack traces, or secrets
- **Server (Pino):** Full stack + sanitized payload + userId + referenceId

---

## 9. Security Middleware Stack (NestJS)

```text
NestJS
 ├── JwtAuthGuard + PermissionsGuard + OwnershipGuard
 ├── Zod validation pipes
 ├── @nestjs/throttler (rate limiting)
 ├── helmet (security headers)
 ├── CORS allowlist
 ├── sanitize-html (CMS HTML)
 ├── multer + file validation (media)
 ├── Audit log interceptor/service
 └── Global exception filter (fail closed)
```

Mapped to OWASP A01–A10 — see `SECURITY-AND-CMS.md` and `TESTING.md`.

---

## 10. Final Stack Summary

```text
FRONTEND
  React · TypeScript · Vite · Tailwind · React Router
  TanStack Query · Zustand · React Hook Form · Zod
  TipTap · Axios · Lucide

BACKEND
  Node.js · TypeScript · NestJS · REST · OpenAPI/Swagger
  pg · Mongoose · Repository Pattern · DB Switching

AUTH + SECURITY
  JWT · HttpOnly Cookies · Argon2id · RBAC · Ownership
  Helmet · CORS · Rate Limiting · sanitize-html · Multer · Pino · Audit Logs

TESTING
  Jest · Supertest · Playwright

INFRASTRUCTURE
  Docker · Docker Compose · GitHub Actions · npm
```

---

## 11. Monorepo Layout

```text
CMS Project/
├── client/                 # React + Vite + Tailwind
├── server/                 # NestJS
├── tests/
│   └── security/           # OWASP test suites
├── docker-compose.yml      # PostgreSQL + MongoDB
├── .github/workflows/      # CI
└── docs/                   # Specifications
```
