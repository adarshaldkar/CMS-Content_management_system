# Master Specification — Secure CMS-Driven Content Platform

> **Document purpose:** Complete unified specification combining project requirements, CMS architecture, and OWASP Top 10:2025 security.  
> **Split docs:** `PROJECT.md` (features & UI) · `SECURITY-AND-CMS.md` (security & CMS depth)  
> **Tech stack:** LOCKED — see `ARCHITECTURE.md` (no substitutions without approval)

---

# Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Core Security Principle](#3-core-security-principle)
4. [Security Architecture](#4-security-architecture)
5. [UI Design Requirements](#5-ui-design-requirements)
6. [Application Structure](#6-application-structure)
7. [CMS Architecture](#7-cms-architecture)
8. [Public Website](#8-public-website)
9. [User System & User Panel](#9-user-system--user-panel)
10. [User CMS & Workflow](#10-user-cms--workflow)
11. [Admin Panel](#11-admin-panel)
12. [RBAC & Access Control](#12-rbac--access-control)
13. [CRUD, Categories, Tags, Media, Search](#13-crud-categories-tags-media-search)
14. [Database Architecture & Switching](#14-database-architecture--switching)
15. [API Design](#15-api-design)
16. [SEO, Performance, Accessibility](#16-seo-performance-accessibility)
17. [OWASP Top 10:2025 — Full Implementation](#17-owasp-top-102025--full-implementation)
18. [Security Testing & Acceptance Criteria](#18-security-testing--acceptance-criteria)
19. [Development Priority & Pre-Implementation](#19-development-priority--pre-implementation)
20. [Documentation & Code Structure](#20-documentation--code-structure)
21. [Most Important Rules](#21-most-important-rules)

---

# 1. Project Overview

Build a **production-quality, secure, CMS-driven content publishing platform**.

This is **NOT** a Medium clone, NDTV clone, WordPress clone, or generic AI-generated SaaS dashboard.

The application must be an **original professional editorial/content platform** with its own visual identity — inspired by reference sites and CMS products, but not copied from them.

### Required Components

| # | Component |
|---|-----------|
| 1 | Public Website |
| 2 | User Authentication and User Panel |
| 3 | User CMS / Content Management System (**our own CMS**) |
| 4 | Admin Panel |
| 5 | Secure Backend API |
| 6 | PostgreSQL database with SQL |
| 7 | MongoDB database |
| 8 | Database abstraction layer with admin switching |
| 9 | OWASP Top 10:2025 security (implemented, tested, documented) |
| 10 | Complete CRUD operations |
| 11 | Content publishing workflow |
| 12 | Media/content management |
| 13 | Clean, professional, human-designed UI |

---

# 2. Tech Stack (Locked)

> **Policy:** Technology decisions are final. Do not substitute without explicit approval. See `ARCHITECTURE.md`.

| Layer | Final Choice |
|-------|--------------|
| Frontend | React · TypeScript · Vite · Tailwind · React Router · TanStack Query · Zustand · React Hook Form · Zod · **TipTap** · **Axios** · Lucide |
| Backend | Node.js · TypeScript · **NestJS** · REST · OpenAPI/Swagger · **pg** · **Mongoose** · **Argon2id** · Zod · **Pino** |
| Auth | JWT + **HttpOnly cookies** (not localStorage) |
| Security | helmet · CORS · `@nestjs/throttler` · sanitize-html · multer · RBAC |
| Testing | **Jest** · **Supertest** · **Playwright** |
| Infrastructure | Docker Compose · GitHub Actions · npm |

---

# 3. Core Security Principle

```text
Browser = ATTACKER CONTROLS EVERYTHING
         ↓
Frontend (untrusted)
         ↓
HTTP Request (untrusted)
         ↓
========== SECURITY BOUNDARY ==========
         ↓
Backend: Authentication → Authorization → Validation → Business Rules → Database
```

**Never trust the frontend.** Assume the attacker controls HTML, JS, request body, query params, headers, cookies, IDs, roles, status values, filters, and uploaded files.

**Frontend hiding a button is NOT security.**

The test: *Can the attacker make the backend do something they aren't authorized to do?*

### View Source Clarification

`Ctrl + U` shows **public client resources only**. Secrets appear in the browser only if **we leak them** (bundles, API responses, localStorage, error messages). Test with DevTools Sources, Network, Application, and direct API calls.

### Secure Response Flow

```text
ATTACKER ACTION → BACKEND VALIDATES → BLOCKED → SAFE ERROR + referenceId → SECURITY EVENT LOGGED
```

Build a **secure** application. Test adversarially. Do not build deliberately vulnerable demos.

---

# 4. Security Architecture

```text
                    INTERNET
                       │
                       ▼
                  HTTPS / TLS
                       │
                       ▼
                   FRONTEND  ⚠️ UNTRUSTED ZONE
                       │
                       ▼
              API (NestJS / Express)
                       │
         ┌─────────────┼─────────────┐
         ▼             ▼             ▼
   Rate limiting   Helmet/CSP   Request ID
         │
         ▼
   Authentication → Authorization → Input Validation → Business Rules
         │
    ┌────┴────┐
    ▼         ▼
PostgreSQL  MongoDB
    └────┬────┘
         ▼
   Audit Logging → Global Error Handler
```

Every layer maps to OWASP A01–A10 with implementation, test, and documentation.

---

# 5. UI Design Requirements

### DO NOT Make the UI Look AI-Generated

Avoid: excessive rounded cards, glassmorphism, gradients, glowing backgrounds, purple/blue AI palettes, floating cards, generic shadcn layouts, pill buttons, decorative blobs, repetitive card grids.

### Design References (Inspiration Only)

| Reference | Study |
|-----------|-------|
| [Harvard Gazette](https://news.harvard.edu/gazette/) | Clean editorial hierarchy, typography, whitespace |
| [NDTV](https://www.ndtv.com/) | Content organization, categories — not cluttered UI |
| [EUHost](https://euhost.co/) | Modern professional presentation |
| [Allo17](https://allo17.fr/) | Editorial hierarchy, human-designed layouts |
| [ColorMag](https://wordpress.org/themes/colormag/preview/) | Content structure, sidebars, featured content |
| Medium (general) | Article readability only — **must NOT look like Medium** |

### Visual System

Strong typography · clear spacing · editorial grids · subtle borders · neutral palette · purposeful imagery · subtle animations only.

Prioritize **CONTENT · READABILITY · NAVIGATION · HIERARCHY · USABILITY**.

Admin UI can be denser (tables, filters, tabs) but not a generic AI dashboard.

---

# 6. Application Structure

| Area | Purpose |
|------|---------|
| **Public Website** | Homepage, articles, categories, tags, search, authors, featured/latest/trending |
| **User Panel + CMS** | Auth, profile, create/edit content, drafts, submit, bookmarks, comments |
| **Admin Panel** | Users, roles, content workflow, media, SEO, audit logs, database control |

User panel must **not** look identical to admin panel.

---

# 7. CMS Architecture

### Our Own CMS (Not External Installations)

We do **NOT** install Plone, OpenCms, Decap, Concrete CMS, ProcessWire, or WordPress. We build **our own CMS** informed by their architecture.

| Reference | URL | Patterns We Apply |
|-----------|-----|-------------------|
| Plone | https://plone.org/ | Workflow, permissions, versioning, REST API |
| OpenCms | https://www.opencms.org/en | Content schemas, PostgreSQL modeling |
| Decap CMS | https://decapcms.org/ | Collections, structured fields, draft/review/publish |
| Concrete CMS | https://www.concretecms.org/ | WYSIWYG, page blocks, media |
| ProcessWire | https://processwire.com/ | Flexible fields, content types, API |
| WordPress | https://wordpress.com/ | Posts/pages/media/categories mental model |

### Architecture

```text
React UI (Public / User / Admin)
         ↓
CMS Service Layer (content types, workflow, fields, versioning)
         ↓
Repository Layer (Postgres / Mongo)
         +
CMS Adapter Layer (PloneAdapter, WordPressAdapter — future)
```

### CMS Fields

**Basic:** title, slug, description, content, cover, author, category, tags  
**Publishing:** status, publish date, scheduled date  
**SEO:** seo title, description, canonical, social image  
**Optional:** gallery, quotes, embeds, external links

### Workflow (Server-Enforced)

```text
CREATE → DRAFT → SUBMIT → PENDING REVIEW → APPROVED → PUBLISHED
                              ↓
                          REJECTED → edit → resubmit
PUBLISHED → ARCHIVED
APPROVED → SCHEDULED → PUBLISHED (optional)
```

Client sending `{ "status": "published" }` must be **rejected** unless backend validates role and workflow state.

---

# 8. Public Website

### Homepage

Header → Navigation → Featured → Latest → Category Sections → Trending → Editorial Sections → Footer

Mix editorial layouts, horizontal rows, typography sections — not everything in cards.

### Article Page

Breadcrumb · title · excerpt · author + avatar · dates · reading time · featured image · content · tags · share · related · comments

Typography and line height are critical.

---

# 9. User System & User Panel

**Auth:** register, login, logout, password reset, profile (name, bio, email, avatar)

**Navigation:** Dashboard · Profile · My Articles · Create · Drafts · Submitted · Published · Bookmarks · Comments · Settings

**Statuses:** Draft · Pending Review · Approved · Published · Rejected · Archived

---

# 10. User CMS & Workflow

Rich text editor (TipTap/Lexical) · media picker · SEO panel · slug management.

Authors create/edit own content. Editors review. Admins manage system.

All CMS HTML sanitized. All actions authorized server-side.

---

# 11. Admin Panel

**Nav:** Dashboard · Users · Roles · Permissions · Posts · Pages · Categories · Tags · Authors · Media · Comments · Workflow · SEO · Audit Logs · Security · Database · Settings

**Dashboard:** useful metrics (users, articles by status, pending reviews, recent activity) — not decorative stats.

**Features:** tables, filters, search, bulk actions, pagination, soft delete, audit log viewer, database switch control.

---

# 12. RBAC & Access Control

| Role | Access |
|------|--------|
| SUPER ADMIN | Full system |
| ADMIN | Users, CMS, settings per permissions |
| EDITOR | Review, edit, publish |
| AUTHOR | Own content only |
| USER | Public/user features |

### Object-Level Authorization (A01)

```text
GET /api/articles/1003
  ↓
Who is requesting? What role? Allowed to access 1003?
  ↓
Author: WHERE id = $1 AND author_id = $2
Public: published only
Admin: permission check
```

Test: IDOR, horizontal escalation (Author A → B), vertical escalation (User → Admin), direct API access.

---

# 13. CRUD, Categories, Tags, Media, Search

- Full CRUD on all major entities with soft delete where appropriate
- Categories: name, slug, description, SEO, status — prevent invalid deletion
- Tags: name, slug, usage count
- Media: upload validation (MIME, extension, size), safe filenames, no execution
- Search: **server-side only** with pagination, filters, sorting

---

# 14. Database Architecture & Switching

### Repository Pattern

```text
Service Layer → ArticleRepository interface → PostgresArticleRepository | MongoArticleRepository
```

### Common Data Model

Consistent `Article`, `User`, `Category` structures regardless of active database.

### Switching Rules

- Admin-only, authenticated, authorized
- Validate target, **test connection before switch**
- On failure: **keep previous DB active**
- Log every switch
- **No auto-migration**, no data deletion
- Each DB maintains independent dataset

### Secure Switch Flow

```text
PostgreSQL ACTIVE
      ↓
Auth + authorize
      ↓
Validate target ∈ { postgres, mongodb }
      ↓
Test new DB connection (Postgres still active)
      ↓
Success → switch atomically → log SUCCESS
Failure → Postgres remains → log FAILURE → safe error
```

---

# 15. API Design

```
POST   /auth/register | /auth/login | /auth/logout | /auth/forgot-password | /auth/reset-password
GET/PATCH/DELETE  /users/:id
GET/POST/PATCH/DELETE  /articles | /articles/:slug
GET/POST/PATCH/DELETE  /cms/content
GET/POST/PATCH/DELETE  /categories | /tags
GET    /admin/database
POST   /admin/database/switch
```

All inputs validated on backend. Generic errors to clients. Detailed errors in secure server logs only.

---

# 16. SEO, Performance, Accessibility

**SEO:** meta tags, OG, sitemap, robots, clean URLs (`/articles/slug`)  
**Performance:** pagination, indexing, lazy loading, efficient queries  
**Accessibility:** semantic HTML, keyboard nav, labels, contrast, heading hierarchy  
**Responsive:** reorganize for mobile — don't just shrink desktop

---

# 17. OWASP Top 10:2025 — Full Implementation

Reference: https://owasp.org/Top10/

| ID | Category | Key Controls |
|----|----------|--------------|
| **A01** | Broken Access Control | RBAC guards, object-level auth, deny by default, IDOR tests |
| **A02** | Security Misconfiguration | No debug/.env exposure, helmet headers, secure cookies, CORS, private DB network |
| **A03** | Supply Chain Failures | Lockfiles, npm audit, minimal deps, no CDN JS without SRI, CI secret protection |
| **A04** | Cryptographic Failures | Argon2id/bcrypt, secrets server-only, HTTPS, crypto-random tokens, no Base64 passwords |
| **A05** | Injection | Parameterized SQL, Mongo type validation, sanitize-html for CMS XSS |
| **A06** | Insecure Design | Threat model, safe DB switch, server-side workflow validation |
| **A07** | Authentication Failures | Rate limiting, secure sessions, no predictable IDs, progressive delay not naive lockout |
| **A08** | Data Integrity Failures | Upload validation, trusted deps, server-side role/status authority |
| **A09** | Logging Failures | Audit logs + Admin UI, no secrets in logs, request correlation IDs |
| **A10** | Exception Handling | Global handler, referenceId, fail closed, rollback, no stack traces to users |

### A04 Note

Base64 is encoding, not encryption. Vulnerability = sending secrets to browser, not Base64 itself.

### A07 Note

Don't lock accounts after exactly N attempts — enables lockout DoS. Use rate limiting + progressive delay + monitoring.

### A08 Note

HTTP without HTTPS overlaps A04. A08 = trust in software/data (deps, uploads, workflow integrity).

### A10 Example

```json
// User sees:
{ "error": "Unable to process your request.", "referenceId": "ERR-9081" }

// Server logs: full PostgreSQL error, stack, context — no secrets
```

---

# 18. Security Testing & Acceptance Criteria

### Testing Matrix

| OWASP | Implementation | Test |
|-------|----------------|------|
| A01 | RBAC + object auth | Swap IDs; User→admin API |
| A02 | Hardened prod config | Probe /.env, /debug; verify headers |
| A03 | Lockfiles + audit | npm audit; secret scan |
| A04 | Hashing + secret isolation | Inspect bundles/network |
| A05 | SQL/NoSQL/XSS controls | Injection payloads in test env |
| A06 | Threat model + safe design | DB switch failure; workflow tampering |
| A07 | Rate limit + secure auth | Brute force; token expiry |
| A08 | Upload + integrity checks | Tamper status/role; bad uploads |
| A09 | Audit logging | Verify events; no secrets logged |
| A10 | Global error handler | Malformed input; DB down |

### Acceptance Criteria (Application Incomplete Until All Pass)

1. All ten OWASP categories reviewed with controls + tests  
2. Admin authorization server-side  
3. Database switching restricted and safe  
4. SQL + NoSQL injection protections  
5. CMS HTML sanitized  
6. Strong password hashing  
7. No secrets in frontend  
8. Safe production errors  
9. Security events logged  
10. Failures fail safely  
11. Dependencies scanned  
12. Uploads validated  
13. HTTPS in production  
14. Security headers configured  
15. Auth rate-limited  
16. IDOR tested  
17. DB switch failures don't corrupt state  

---

# 19. Development Priority & Pre-Implementation

### Priority Order

1. Application structure  
2. Authentication + security foundation (RBAC, error handler, audit log, helmet)  
3. Public website  
4. Admin panel  
5. CMS  
6. CRUD  
7. PostgreSQL  
8. MongoDB  
9. Database abstraction + switching  
10. Security hardening  
11. UI polish + responsive  

### Before Heavy Coding

Architecture · modules · DB models · repository interfaces · API map · auth/RBAC · CMS workflow · UI design system · threat model

---

# 20. Documentation & Code Structure

### Docs

| File | Content |
|------|---------|
| `docs/PROJECT.md` | Features, UI, database, API |
| `docs/SECURITY-AND-CMS.md` | CMS depth + OWASP detail |
| `docs/MASTER-SPEC.md` | This unified document |
| `docs/THREAT-MODEL.md` | To be created during implementation |
| `docs/security/TESTING.md` | Security test checklist |

### Code Structure

```text
CMS Project/
├── client/                 React + TS + Tailwind
│   ├── src/components/     Shared UI, CMS editor, admin tables
│   ├── src/pages/          Public, user panel, admin
│   └── src/api/            HTTP client (no secrets)
├── server/                 NestJS
│   ├── middleware/         auth, rbac, rateLimit, errorHandler
│   ├── guards/             role, permission, ownership
│   ├── modules/            auth, cms, media, admin, audit
│   ├── repositories/       postgres/, mongo/
│   ├── adapters/           CMSAdapter (future)
│   └── utils/              sanitize, crypto, safeFilename
├── tests/security/         OWASP test suites
├── docker-compose.yml      Postgres + Mongo
└── docs/                   Specifications
```

---

# 21. Most Important Rules

### Product

1. Original UI — not AI-generated, not cloned  
2. Real CMS — our own, reference-informed  
3. Public site = editorial; admin = functional  
4. PostgreSQL + MongoDB with repository abstraction  
5. DB switch without migration or data loss  

### Security

6. **Never trust the frontend**  
7. Backend enforces auth, authz, validation, workflow  
8. OWASP 2025: implement + test + document each category  
9. Parameterized SQL; validated Mongo queries  
10. Sanitize CMS HTML; validate uploads  
11. Secrets never in browser  
12. Safe errors + audit logs + fail closed  
13. DB switch: test first, rollback on failure  

### Engineering

14. Validate all input on backend  
15. Soft delete important data  
16. Server-side search with pagination  
17. Responsive + accessible  
18. Minimal dependencies, scanned supply chain  
19. Security testing in admin/developer documentation  
20. Functionality before decorative UI  

---

# Final Goal

```text
PUBLIC WEBSITE
    +
USER SYSTEM + USER CMS (our own)
    +
ADMIN PANEL
    +
CRUD + WORKFLOW + MEDIA
    +
POSTGRESQL + MONGODB + REPOSITORY LAYER + DB SWITCHING
    +
OWASP TOP 10:2025 (implemented, tested, documented)
    +
CLEAN ORIGINAL EDITORIAL UI
    =
PROFESSIONAL SECURE CMS-DRIVEN CONTENT PLATFORM
```

The references are inspiration. The final product is **OUR OWN platform**.
