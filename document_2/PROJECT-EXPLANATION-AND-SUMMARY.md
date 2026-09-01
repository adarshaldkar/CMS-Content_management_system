# Comprehensive Project Guide & Detailed Architecture Breakdown
## Secure CMS-Driven Content Platform

---

### Executive Summary

This document provides an exhaustive, structured explanation of the entire system architecture, features, security requirements, and development principles defined across `docs/MASTER-SPEC.md`, `docs/PROJECT.md`, and `docs/SECURITY-AND-CMS.md`.

---

## 1. Project Vision & Identity

### What This Project IS:
A **production-quality, security-conscious, extensible, CMS-driven editorial publishing platform** built with modern web technologies, strict architectural separation of concerns, dual-database capabilities, and defense-in-depth security matching **OWASP Top 10:2025**.

> **Note:** We target production-quality architecture — not full enterprise HA/DR/compliance unless explicitly scoped later.

### What This Project is NOT:
- **NOT** a clone of Medium, WordPress, or NDTV.
- **NOT** a generic AI-generated SaaS dashboard with purple/blue gradients and floating glass cards.
- **NOT** an installation of third-party CMS software (like Plone, Decap, or Strapi) — it is **our own custom-built CMS engine** informed by their best architectural patterns.

---

## 2. Technology Stack & Directory Structure

> **Locked decisions:** See `docs/ARCHITECTURE.md`. Do not substitute alternatives during implementation.

### Frontend Stack (Locked)
- **Framework:** React 18+ with TypeScript (strict mode)
- **Build:** Vite
- **Styling:** Tailwind CSS + CSS variables (`docs/DESIGN-SYSTEM.md`)
- **Routing:** React Router v6
- **Server state:** TanStack Query v5
- **Client state:** Zustand
- **Forms:** React Hook Form + Zod
- **Rich text:** TipTap (sanitized WYSIWYG)
- **HTTP:** Axios with interceptors
- **Icons:** Lucide React (sparingly)

### Backend Stack (Locked)
- **Runtime:** Node.js LTS + TypeScript
- **Framework:** NestJS (guards, modules, DI)
- **PostgreSQL:** `pg` pool + parameterized SQL + `node-pg-migrate`
- **MongoDB:** Mongoose with strict schemas
- **Password hashing:** Argon2id
- **Validation:** Zod (`nestjs-zod`)
- **Security:** helmet, CORS, rate-limit, sanitize-html, multer
- **Logging:** Pino with correlation IDs
- **API docs:** OpenAPI/Swagger (`@nestjs/swagger`)
- **Testing:** Jest · Supertest · Playwright
- **CI:** GitHub Actions

### Authentication (Locked)
- **httpOnly Secure cookies** — not localStorage
- Short-lived access JWT (15 min) + rotated refresh token (7 days)
- CSRF: SameSite=Strict + custom header on mutating requests
- Full spec: `docs/ARCHITECTURE.md` §2

### Infrastructure & Monorepo Layout
```text
CMS Project/
├── client/                     # React + TypeScript + Tailwind CSS (Vite)
│   ├── src/
│   │   ├── api/                # HTTP clients & endpoints (no server secrets)
│   │   ├── components/         # Reusable UI components (editorial & admin)
│   │   ├── pages/              # Public, User Portal, Admin Portal
│   │   ├── hooks/              # Custom React hooks
│   │   └── types/              # Client-side domain types
├── server/                     # NestJS / Express Backend API
│   ├── middleware/             # Rate limiters, request ID, error handler
│   ├── guards/                 # RBAC, ownership, permission guards
│   ├── modules/
│   │   ├── auth/               # Registration, login, password reset
│   │   ├── cms/                # Content types, workflow engine, publishing
│   │   ├── media/              # Secure file uploads, metadata management
│   │   ├── admin/              # User admin, audit viewer, database switch
│   │   └── audit/              # Security event logging
│   ├── repositories/           # Repository Pattern implementations
│   │   ├── postgres/           # PostgreSQL implementations
│   │   └── mongo/              # MongoDB implementations
│   ├── adapters/               # Future external CMS adapters
│   └── utils/                  # Sanitization, crypto, safe file handling
├── tests/
│   └── security/               # Automated OWASP A01-A10 test suites
├── docker-compose.yml          # PostgreSQL & MongoDB local containers
└── docs/                       # Specifications & threat models
```

---

## 3. Core Security Principle: "Never Trust the Frontend"

The foundational axiom of this entire platform is:
> **The browser is an untrusted client environment fully controlled by the attacker.**

### The Threat Reality
An attacker can manipulate:
- Any JavaScript code, HTML element, hidden input, or DOM state.
- Any HTTP request body, URL path, query parameter, header, cookie, or token.
- Object IDs (IDOR), role flags (`role: "admin"`), and publishing status (`status: "published"`).

### Golden Security Rules:
1. **Frontend Hiding is NOT Security:** Hiding a "Delete" button or "Admin" tab in React does not secure the API.
2. **Server-Side Enforcement:** Every single HTTP request must pass through:
   `Authentication` → `Role/Permission Check` → `Object Ownership Validation` → `Input Schema Validation` → `Business Workflow Rules` → `Database Operation`.
3. **Zero Secret Leakage:** Database connection strings, server `.env` variables, private keys, and password hashes must **never** enter frontend bundles, API responses, or error traces.
4. **Safe Error Handling:** In production, clients only receive generic error messages accompanied by a unique `referenceId` (e.g., `ERR-9081`), while full stack traces and contextual errors are logged internally.

---

## 4. Application Architecture & The Three Portals

The application is structured into three clearly distinguished portals:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        CMS CONTENT PLATFORM                            │
├───────────────────────┬───────────────────────┬────────────────────────┤
│    PUBLIC WEBSITE     │   USER PANEL & CMS    │      ADMIN PANEL       │
├───────────────────────┼───────────────────────┼────────────────────────┤
│ • Editorial Homepage  │ • User Registration   │ • User & Role Mgmt     │
│ • Category Feeds      │ • Profile & Bio Mgmt  │ • Editorial Workflow   │
│ • Article Reader View │ • Article Authoring   │ • Category / Tag Admin │
│ • Tag & Author Pages  │ • WYSIWYG & Media     │ • Media Library        │
│ • Server-Side Search  │ • Draft / Submit Flow │ • Audit Logs Viewer    │
│ • Bookmarks / Likes   │ • Status Tracking     │ • Database Switcher    │
│ • Comments Section    │ • Bookmarks / Reading │ • System Settings      │
└───────────────────────┴───────────────────────┴────────────────────────┘
```

### A. Public Editorial Website
- **Aesthetic:** Clean, high-readability editorial presentation. Study Harvard Gazette, NDTV, EUHost, Allo17, ColorMag, and Medium for **principles only** — extract editorial hierarchy, spacing, and readability. **Do not reproduce any reference literally.** All visuals come from `docs/DESIGN-SYSTEM.md` tokens and layout rules.
- **Structure:** Dynamic Header & Nav → Featured Editorial Hero → Latest Stories Grid/List → Category Row Sections → Trending/Popular Stories → Newsletter CTA → Footer.
- **Article Reading View:** Clean typography, breadcrumbs, reading time estimator, author bio, social sharing, tags, related articles, and comments.

### B. User Panel + User CMS
- **Target Audience:** Registered members and content authors.
- **Capabilities:**
  - Authenticate (Register, Login, Password Reset).
  - Manage personal profile (name, bio, avatar).
  - Create and edit articles using TipTap rich text editor.
  - Manage SEO meta tags (title, description, slug, canonical).
  - Save drafts, upload media, and submit articles for editorial review.
  - Track article lifecycle statuses (`Draft`, `Pending Review`, `Approved`, `Published`, `Rejected`, `Archived`).
  - View bookmarked articles and comment history.

### C. Admin Panel
- **Target Audience:** Editors, Administrators, and Super Administrators.
- **Capabilities:**
  - Operational metrics dashboard (active users, pending reviews, article volume by state).
  - User & Role Management (RBAC assignments, user activation/deactivation).
  - Editorial Workflow queue (Review submitted articles, Approve, Reject with feedback, Publish, Schedule, Archive).
  - Taxonomy management (Categories with hierarchy & SEO, Tags with usage metrics).
  - Central Media Library with upload filters and asset management.
  - Comprehensive Audit Log Viewer (filter by actor, action, date, status).
  - **Dynamic Database Switcher** (PostgreSQL ↔ MongoDB).

---

## 5. Custom CMS Engine & Workflow Architecture

### Inspiration vs. Custom Engine
We do **not** install third-party monolithic CMS software. Instead, we implement our own lightweight, highly tailored CMS engine applying proven concepts from industry leaders:
- **Plone:** Multi-state workflow engine, granular permissions, content versioning.
- **OpenCms:** Relational content modeling and database schemas.
- **Decap CMS:** Content collection schemas, structured fields, draft/review/publish workflow.
- **Concrete CMS:** Block-based rich text editing and media picker integration.
- **ProcessWire:** Clean API-first content modeling and custom field flexibility.
- **WordPress:** Mental model of posts, pages, categories, tags, and media.

### The Content Lifecycle State Machine
```text
[CREATE]
   │
   ▼
[DRAFT] ◄──────────────┐
   │ (Author Submits)  │
   ▼                   │ (Author Edits & Resubmits)
[PENDING REVIEW]       │
   │                   │
   ├──► [REJECTED] ────┘
   │
   ▼ (Editor/Admin Approves)
[APPROVED]
   │
   ├──► [SCHEDULED] ──► [PUBLISHED]
   │
   ▼ (Publish)
[PUBLISHED]
   │
   ▼ (Retire)
[ARCHIVED]
```

### Server-Enforced Workflow Security
- Authors can only transition their own articles from `Draft` to `Pending Review`.
- Authors **cannot** set `status = "published"` or `status = "approved"`.
- If an author sends `{ "status": "published" }` via direct API manipulation, the backend validation middleware rejects the request with `403 Forbidden` and logs a security event.

### Future Adapter Layer
The CMS architecture includes an abstract `CMSAdapter` interface to allow seamless external integrations in the future (e.g. syncing content from external WordPress or Plone instances) without rewriting core business logic.

---

## 6. Dual Database Architecture & Fail-Safe Switching

### 1. The Repository Pattern Abstraction
Business logic services (e.g., `ArticleService`, `UserService`) interact exclusively with TypeScript repository interfaces, never with database drivers directly:

```typescript
export interface IArticleRepository {
  findById(id: string): Promise<Article | null>;
  findBySlug(slug: string): Promise<Article | null>;
  findMany(filters: ArticleQueryFilters): Promise<PaginatedResult<Article>>;
  create(data: CreateArticleDto): Promise<Article>;
  update(id: string, data: UpdateArticleDto): Promise<Article>;
  softDelete(id: string): Promise<boolean>;
  updateStatus(id: string, status: ContentStatus): Promise<Article>;
}
```

Two concrete implementations fulfill this contract:
1. `PostgresArticleRepository` (using parameterized SQL queries)
2. `MongoArticleRepository` (using typed Mongoose queries)

### 2. Common Domain Model
Regardless of whether PostgreSQL (relational rows with foreign keys) or MongoDB (BSON documents) is active, the application transforms raw data into a unified, consistent application domain model (`Article`, `User`, `Category`, `Tag`).

### 3. Independent Datasets & Zero Data Migration
- PostgreSQL and MongoDB maintain **their own independent datasets**.
- If PostgreSQL has 100 articles and MongoDB has 20 articles:
  - When PostgreSQL is active → the app reads/writes to PostgreSQL (100 articles visible).
  - When MongoDB is active → the app reads/writes to MongoDB (20 articles visible).
- Switching databases **never** automatically migrates, copies, or deletes records.

### 4. Atomic Fail-Safe Database Switching Flow

> **Concurrency:** See `docs/ARCHITECTURE.md` §3 for mutex, write buffering, and in-flight request rules during switch.
```text
Admin initiates DB switch via POST /api/admin/database/switch
                         │
                         ▼
           Verify Admin JWT + Super Admin Role
                         │
                         ▼
        Validate Target Database ∈ {'postgres', 'mongodb'}
                         │
                         ▼
     Perform Connection Healthcheck on Target Database
          (Current Database REMAINS ACTIVE throughout)
                         │
           ┌─────────────┴─────────────┐
        SUCCESS                     FAILURE
           │                           │
           ▼                           ▼
- Atomically swap active     - DO NOT switch; keep current DB active
  repository instances       - Log CRITICAL failure event to audit log
- Log SUCCESS in audit log   - Return safe error to Admin:
- Return 200 OK to Admin       "Target database unavailable. Switch aborted."
```

---

## 7. Comprehensive OWASP Top 10:2025 Implementation

| OWASP Category | Vulnerability Type | Concrete Technical Implementation | Verification & Testing Strategy |
|:---|:---|:---|:---|
| **A01:2025** | **Broken Access Control** | • Centralized RBAC guards (Super Admin, Admin, Editor, Author, User)<br>• Object-level ownership check (`authorId === req.user.id`)<br>• Deny-by-default route policies | • IDOR tests (Author A edits Author B's article ID)<br>• Privilege escalation tests (User calls `/admin/users`)<br>• Direct parameter tampering |
| **A02:2025** | **Security Misconfiguration** | • Production debug disabled, no stack traces leaked<br>• Hardened HTTP headers via Helmet (CSP, HSTS, X-Frame-Options, Sniff prevention)<br>• Restrictive CORS (explicit origin allowlist)<br>• Secure cookie flags (`HttpOnly`, `Secure`, `SameSite=Strict`) | • Probing sensitive routes (`/.env`, `/debug`, `/admin/debug`)<br>• Header inspection using curl/DevTools<br>• Verification of database isolation on private network |
| **A03:2025** | **Software Supply Chain Failures** | • Committed `package-lock.json` lockfiles<br>• Minimal external dependencies with security reviews<br>• Automated `npm audit` / Dependabot in CI pipeline<br>• Subresource Integrity (SRI) for any external CDN assets | • CI pipeline fails on critical/high CVEs<br>• Repository secret scanners (gitleaks) to prevent committed keys |
| **A04:2025** | **Cryptographic Failures** | • Passwords hashed with **Argon2id** or **bcrypt** with unique salts (never Base64 or MD5)<br>• Secrets kept strictly in backend `.env` (never sent to client bundles)<br>• Cryptographically secure random tokens for password resets (`crypto.randomBytes`)<br>• Mandatory HTTPS/TLS in production | • Source code inspection (ensure no secrets in client JS bundles)<br>• Verification that password hashes are never returned in user API responses<br>• DevTools Network tab auditing |
| **A05:2025** | **Injection (SQL, NoSQL, XSS)** | • **SQL:** 100% Parameterized queries / prepared statements (never string concatenation)<br>• **NoSQL:** Strict schema validation with Zod to reject operator injection (e.g. `{"$ne": null}`)<br>• **XSS:** Strict HTML sanitization via `sanitize-html` on all WYSIWYG article content, comments, and bios | • Automated SQL injection payloads on search, filter, and login endpoints<br>• NoSQL operator injection tests against authentication endpoints<br>• Stored XSS payloads (`<script>`, `<img onerror=...>`) in CMS body |
| **A06:2025** | **Insecure Design** | • Threat modeling across all 9 high-risk flows prior to implementation<br>• Server-side business logic validation (cannot bypass editorial review)<br>• Fail-safe atomic database switcher with connection healthchecks | • Direct API submission of published articles by Authors<br>• Database switch failure simulations (killing target DB container) |
| **A07:2025** | **Authentication Failures** | • Rate limiting on `/auth/login`, `/auth/register`, `/auth/forgot-password`<br>• Progressive delays after failed login attempts (avoiding naive account lockouts that cause Denial of Service)<br>• Cryptographically random session tokens with immediate invalidation on logout | • Brute-force simulation (verifying 429 Too Many Requests)<br>• Session revocation test (verifying invalidated tokens fail immediately) |
| **A08:2025** | **Software & Data Integrity Failures** | • Strict file upload validation (file size caps, extension checks, MIME-type sniffing via magic numbers)<br>• Sanitized filenames (UUID-based storage, non-executable directories)<br>• Server-side authority over roles and content states | • Attempting to upload `.php`, `.exe`, or disguised `.jpg` executables<br>• Modifying role fields in user profile update payloads |
| **A09:2025** | **Security Logging & Alerting Failures** | • Dedicated `AuditLog` module recording all sensitive actions (logins, password resets, role changes, database switches, workflow approvals)<br>• Structured metadata (actor, IP, user-agent, action, timestamp, result)<br>• Redaction of sensitive data (passwords, tokens are NEVER logged) | • Admin Audit Log UI review<br>• Verification that failed admin access attempts generate instant log entries |
| **A10:2025** | **Mishandling of Exceptional Conditions** | • Centralized global exception filter/middleware<br>• Production responses sanitized: `{ error: "Unable to process your request.", referenceId: "ERR-XXXX" }`<br>• Fail-closed paradigm: if an authorization check encounters an error, access is denied | • Triggering unhandled database errors and confirming no stack traces or queries leak to the client<br>• Verification of correlation between client `referenceId` and server logs |

---

## 8. UI/UX Design Philosophy: "Human Editorial Craft"

### Anti-AI Aesthetic Rules
To ensure the platform looks like a handcrafted, premium editorial product rather than a generic AI-generated template:
1. **NO Excessive Gradients:** Avoid purple-to-blue neon glowing backgrounds.
2. **NO Excessive Glassmorphism:** Replace blurry translucent cards with clean borders, solid neutral backgrounds, and intentional whitespace.
3. **NO Repetitive Card Grids:** Combine horizontal story strips, full-width feature spotlights, typographic lists, and split-screen layouts.
4. **NO Pill-Shaped Buttons Everywhere:** Use structured, elegant buttons with crisp typography and subtle hover states.
5. **Content-First Hierarchy:** Typography (serif editorial headings, crisp sans-serif body, generous line height) takes precedence over decorative shapes.

### Design Inspirations
- **Harvard Gazette:** Editorial seriousness, clean article typography, elegant whitespace.
- **NDTV:** High-density category structuring, trending sidebars, editorial tags.
- **EUHost & Allo17:** Modern European layout balance, subtle borders, professional palettes.
- **ColorMag:** Multi-category magazine layout and structured content blocks.
- **Medium:** Comfortable, distraction-free reading experience on single article pages only.

---

## 9. Development Roadmap & Implementation Checklist

> Security architecture is **foundational** — not a late-phase add-on.

### 12-Step Priority Execution Order
1. **Architecture skeleton:** Monorepo, Vite + React, NestJS, Docker Compose.
2. **Database schema & domain models:** Shared TypeScript types, Postgres SQL migrations, Mongo schemas.
3. **Security & auth foundation:** Argon2id, httpOnly cookies, RBAC guards (`docs/RBAC-PERMISSIONS.md`), helmet, rate limit, global error handler, audit log module.
4. **Repository abstraction:** Interfaces + factory/injection layer.
5. **PostgreSQL implementation:** Parameterized repositories.
6. **MongoDB implementation:** Mongoose repositories, same domain model.
7. **Public website:** Homepage, article reader, categories, tags, search.
8. **Custom CMS engine:** TipTap, media picker, SEO panel, workflow state machine.
9. **Admin panel:** Users, roles, workflow queue, audit viewer.
10. **Database switching:** Healthcheck, mutex, admin UI (`docs/ARCHITECTURE.md` §3).
11. **Security testing:** OWASP A01–A10 suite (`docs/TESTING.md`).
12. **UI polish:** Responsive, accessibility, performance.

---

## 10. Documentation Authority (Do Not Use One File for Everything)

| File | Authority | Use When |
|:---|:---|:---|
| `docs/README.md` | Index & agent rules | Starting point; doc hierarchy |
| `docs/PROJECT.md` | **Product requirements** | Features, screens, API, UI layout |
| `docs/SECURITY-AND-CMS.md` | **Security + CMS architecture** | OWASP, trust boundary, CMS engine, adapters |
| `docs/ARCHITECTURE.md` | **Locked technical decisions** | Stack, auth cookies, DB switch concurrency |
| `docs/DESIGN-SYSTEM.md` | **Visual system** | Typography, colors, spacing, components |
| `docs/RBAC-PERMISSIONS.md` | **Permission matrix** | Who can publish, switch DB, manage users |
| `docs/TESTING.md` | **QA acceptance** | Functional + security checklists |
| `docs/MASTER-SPEC.md` | Unified reference | Single-file overview of all specs |
| `docs/PROJECT-EXPLANATION-AND-SUMMARY.md` | **Developer onboarding** | How everything fits together (this file) |

### For AI Coding Agents

Give **all authority documents** together, or start with `docs/README.md`. Do not invent architecture — implement the specification.
