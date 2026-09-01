# Security & CMS Architecture Specification

> **Document purpose:** CMS architecture (our own CMS + reference research + adapter layer) and OWASP Top 10:2025 security implementation, testing, and acceptance criteria.  
> **Related docs:** `PROJECT.md` · `MASTER-SPEC.md`  
> **Reference:** https://owasp.org/Top10/

---

## Part 1 — Core Security Principle

### Never Trust the Frontend

```text
Browser
  ↓
ATTACKER CONTROLS EVERYTHING HERE
  ↓
Frontend
  ↓
HTTP Request
  ↓
================ SECURITY BOUNDARY ================
  ↓
Backend
  ↓
Authentication
  ↓
Authorization
  ↓
Validation
  ↓
Business Rules
  ↓
Database
```

Anything coming from the browser is **untrusted input**.

An attacker can change:

- HTML, JavaScript, hidden fields
- Request body, query parameters
- Headers and cookies they control
- IDs, roles, status values sent by the client
- Pagination, filters, API URLs
- Uploaded files

**Frontend hiding a button is NOT security.**

The senior-developer test:

> Can the attacker make the backend do something they aren't authorized to do?

### Browser-Side Security Check

`Ctrl + U` and DevTools show **public client-side resources only**.

They do **not** directly expose PostgreSQL passwords, MongoDB passwords, JWT secrets, server `.env`, backend source, or private encryption keys — **unless we accidentally send those to the browser.**

Security testing must include:

```text
Ctrl + U
DevTools → Sources
DevTools → Network
DevTools → Application
Modify requests / cookies / localStorage
Call APIs directly (curl, Postman, Burp)
```

Then ask: **Did the backend block unauthorized actions?**

### Expected Secure Flow

```text
ATTACKER ACTION
      ↓
BACKEND DETECTS / VALIDATES
      ↓
REQUEST BLOCKED
      ↓
SAFE ERROR (+ referenceId)
      ↓
SECURITY EVENT LOGGED
```

Do **not** build a deliberately vulnerable application. Build secure code and test adversarially.

---

## Part 2 — Security Architecture

```text
                    INTERNET
                       │
                       ▼
                 HTTPS / TLS
                       │
                       ▼
                 FRONTEND
                       │
             ⚠️ UNTRUSTED ZONE
                       │
                       ▼
                 API (NestJS/Express)
                       │
              ┌────────┴────────┐
              ▼                 ▼
       Rate Limiting       Security Headers (helmet)
              │
              ▼
        Authentication
              │
              ▼
        Authorization (RBAC + object-level)
              │
              ▼
        Input Validation (Zod)
              │
              ▼
       Business Rules
              │
       ┌──────┴──────┐
       ▼             ▼
 PostgreSQL        MongoDB
       │             │
       └──────┬──────┘
              ▼
        Audit Logging
              │
              ▼
   Global Error Handler (safe client / detailed server)
```

Every layer maps to OWASP A01–A10 with **implementation + test + documentation**.

---

## Part 3 — CMS Architecture

### Important Distinction

We are **NOT** installing Plone, OpenCms, Decap CMS, Concrete CMS, ProcessWire, or WordPress.

- **Primary CMS = our own**, built into this platform
- Reference CMS platforms inform **architecture and product design**
- An **integration/adapter layer** allows future external CMS connections

### CMS Reference Research

| Reference | URL | What We Study & Apply |
|-----------|-----|----------------------|
| Plone | https://plone.org/ | Security, permissions, roles, workflow, content types, versioning, publishing, REST API |
| OpenCms | https://www.opencms.org/en | Enterprise CMS, PostgreSQL support, content schemas, publishing, REST/API |
| Decap CMS | https://decapcms.org/ | Content collections, structured content, editor experience, draft/review/publish, preview |
| Concrete CMS | https://www.concretecms.org/ | Visual editing, page blocks, WYSIWYG, media, page management, permissions |
| ProcessWire | https://processwire.com/ | Flexible content fields, custom content types, API, roles, permissions, content modeling |
| WordPress | https://wordpress.com/ | Posts, pages, media, categories, tags, users, roles, publishing — mental model only |

**Do NOT copy** their source code, branding, or UI.

### Our CMS Architecture

```text
┌─────────────────────────────────────────────────────────┐
│  Public site / User panel / Admin panel (React + TS)    │
└──────────────────────────┬──────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────┐
│  CMS Service Layer                                      │
│  • Content types (Article, Page, Media, etc.)           │
│  • Workflow engine (Draft → Review → Publish…)          │
│  • Field definitions (ProcessWire / Decap style)        │
│  • Versioning & audit (Plone-inspired)                  │
└──────────────────────────┬──────────────────────────────┘
                           │
         ┌─────────────────┴─────────────────┐
         │                                   │
┌────────▼────────┐              ┌───────────▼───────────┐
│ Repository Layer │              │ CMS Adapter Layer      │
│ Postgres / Mongo │              │ (future integrations)  │
└─────────────────┘              └───────────┬───────────┘
                                             │
                              ┌──────────────┼──────────────┐
                              │              │              │
                         PloneAdapter   WordPressAdapter  …
                         (future)        (future)
```

### CMS Features (Our Implementation)

#### Content Model (WordPress + ProcessWire + OpenCms)

- **Content types:** Article, Page (extensible)
- **Fields:** title, slug, excerpt, body, cover, gallery, SEO, author, category, tags, schedule, status
- **Flexible field config** for admin-extensible content types

#### Workflow (Plone + Decap)

States: `draft` → `pending_review` → `approved` → `published` (+ `rejected`, `archived`, `scheduled`)

- Author submits; Editor reviews; Admin publishes
- Rejection loop: rejected → author edits → resubmit
- **Backend must reject** client-sent `{ "status": "published" }` without proper permission and workflow state

#### Editor Experience (Decap + Concrete)

- Rich text (TipTap/Lexical): headings, lists, quotes, embeds, links, images
- Media picker tied to media library
- SEO panel, slug, schedule, status in CMS form

#### Security & Permissions (Plone + ProcessWire)

- RBAC on every CMS action — server-side
- Authors: own content only
- Editors: review/publish
- Admins: full CMS + system

#### External CMS Integration (Adapter Pattern)

```typescript
interface CMSAdapter {
  fetchContent(id: string): Promise<Content>
  syncContent?(options: SyncOptions): Promise<SyncResult>
  pushContent?(content: Content): Promise<void>
}

// Future implementations:
// PloneAdapter, WordPressAdapter, OpenCmsAdapter
```

Default operation uses **our CMS**. Adapters are optional future data sources.

### CMS Security Controls

| Risk | Control |
|------|---------|
| XSS in article/comment/bio | `sanitize-html` allowlist on store and/or render |
| Workflow bypass | Server validates state transitions + role |
| IDOR on content | Object-level authorization (`authorId === req.user.id`) |
| Malicious uploads | MIME + extension + size validation; safe filenames |
| NoSQL/SQL injection in CMS queries | Parameterized SQL; typed Mongo validation |

---

## Part 4 — OWASP Top 10:2025 Implementation

The application MUST NOT merely mention OWASP compliance. Each category requires **architecture, code, configuration, testing, and documentation**.

### A01:2025 — Broken Access Control

**Roles:** Super Admin, Admin, Editor, Author, User

**Implementation:**

- Central RBAC middleware/guards on every protected route
- Object-level authorization — Author A cannot modify Author B's article by changing ID
- Admin-only: user management, roles, database switch, audit logs, system settings
- Deny by default

**Example — private resource query:**

```sql
SELECT * FROM articles WHERE id = $1 AND author_id = $2;
```

**Request flow for admin resources:**

```text
Request → Authenticate → Check role → Check permission → Check ownership → Allow/Deny
```

**Tests:**

- User → Admin API (`GET /admin/users` → 403)
- Author A → Author B's article (IDOR)
- Normal user → database switch
- Change IDs in URL/body
- Direct API calls bypassing UI
- Horizontal and vertical privilege escalation

---

### A02:2025 — Security Misconfiguration

**Implementation:**

- Production: no debug mode, stack traces, or default credentials
- Do not expose: `/.env`, `/debug`, `/test`, `/admin/debug`, directory listings, unprotected Swagger
- Security headers: CSP, HSTS, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, frame protection
- Secure cookies: HttpOnly, Secure, SameSite
- CORS allowlist — no wildcard with credentials
- Database on private network — **port obscurity alone is not security**

**Tests:**

- Probe accidental exposure paths
- Verify security headers on responses
- Confirm no credentials in client bundles

---

### A03:2025 — Software Supply Chain Failures

**Implementation:**

- Commit `package-lock.json`; pin/control dependency versions
- Minimize dependencies; review before installing (popularity, CVEs, license, maintenance)
- `npm audit` / Dependabot / SCA in CI
- Never commit: API keys, DB passwords, JWT secrets, encryption keys, cloud credentials
- Protect CI/CD secrets and GitHub Actions
- Do not blindly load third-party CDN JavaScript; use SRI where external scripts are required
- Do not execute untrusted scripts during builds

**Tests:**

- CI fails on critical/high audit findings (per policy)
- Secret scanning on commits
- Dependency inventory documentation

---

### A04:2025 — Cryptographic Failures

**Important correction:** Base64 is **encoding**, not encryption. `YWRtaW46bXlwYXNzd29yZA==` decodes to `admin:mypassword` — the vulnerability is sending secrets to the browser, not Base64 itself.

**Rule:**

```text
Frontend → public information only
Backend secrets → NEVER sent to browser
```

**Implementation:**

- Passwords: **Argon2id** with unique salts — never MD5, SHA-1, plain SHA-256, Base64, or reversible encryption
- Secrets server-side only: `DATABASE_URL`, `MONGO_URI`, `JWT_SECRET`, encryption keys, private API keys
- JWT payloads are readable — store minimal claims only
- Reset/verify tokens: cryptographically secure randomness; single-use; expiry
- HTTPS/TLS in production; HSTS

**Tests:**

- View Source, DevTools Sources/Network, API responses — no secrets
- API never returns password hashes
- Production uses HTTPS

---

### A05:2025 — Injection

**Especially critical:** PostgreSQL + MongoDB + CMS rich content.

#### SQL Injection

Never:

```javascript
"SELECT * FROM users WHERE email = '" + email + "'"
```

Always use parameterized queries / prepared statements / safe ORM.

#### NoSQL Injection

Validate strict types. Reject operator objects from client:

```json
// REJECT when string expected:
{ "email": { "$ne": null } }
```

#### XSS

Sanitize rich HTML in: articles, comments, author bio, category description, profile fields.

**Tests:**

- SQLi payloads on search, login, filters, sort, pagination, slugs, CMS fields (test environment)
- NoSQLi operator injection on auth/search
- Stored and reflected XSS in CMS content

---

### A06:2025 — Insecure Design

**Threat model before implementation** for:

1. Public website
2. User system
3. CMS
4. Admin panel
5. PostgreSQL / MongoDB
6. Database switching
7. File uploads
8. Authentication
9. Content publishing

#### Database Switching — Secure Design

```text
PostgreSQL ACTIVE
       ↓
Auth + authorize admin
       ↓
Validate target database
       ↓
Test MongoDB connection (PostgreSQL still active)
       ↓
Connection successful?
       │
    ┌──┴──┐
   YES    NO
    ↓      ↓
Switch   Keep PostgreSQL active
         Log failure
         Return safe error
```

**Never:**

```text
Deactivate PostgreSQL → MongoDB fails → Application has no database
```

#### CMS Workflow — Secure Design

Frontend cannot send `{ "status": "published" }` and bypass review. Backend determines allowed transitions.

**Tests:**

- MongoDB down during switch → PostgreSQL remains active
- Author attempts direct publish → blocked
- Threat model document reviewed

---

### A07:2025 — Authentication Failures

**Implementation:**

- Secure registration, login, logout, password reset
- Rate limit: login, register, forgot-password, reset-password
- Session/token invalidation on logout
- No predictable session IDs (`10001`, `10002`, …)
- **Avoid naive account lockout** — attackers can lock legitimate users

**Better approach:**

```text
Repeated failures → Rate limiting / progressive delay → Monitoring
```

**Tests:**

- Brute force → 429
- Expired session/token → 401
- Logout → old token rejected
- Reset token: expire, single-use, no enumeration leak

---

### A08:2025 — Software or Data Integrity Failures

**Focus:** Can we trust the software/data we receive or execute?

**Note:** HTTP without HTTPS overlaps A04 (transport). A08 covers dependency integrity, upload integrity, and workflow tampering.

**Implementation:**

- Trusted, version-controlled, integrity-checked dependencies
- Upload validation: MIME, extension, size, safe filename, non-executable storage
- Workflow state changes server-validated — client cannot set `"role": "admin"` or `"status": "published"` without authorization
- Authorization from server-side DB — never trust client claims

**Tests:**

- Upload executable / MIME mismatch → rejected
- Tamper role/status in request body → rejected
- Tampered JWT role claim → rejected (verify signature + DB role)

---

### A09:2025 — Security Logging and Alerting Failures

**Implementation:**

- Audit log system with Admin UI (search/filter)
- Log: login success/failure, logout, password reset, role/permission changes, user activation/deactivation, publish/delete/approve/reject, **database switch**, authorization failures, rate-limit violations
- Include: actor, action, resource, IP, user-agent, timestamp, result, request ID
- **Never log:** passwords, JWT secrets, DB passwords, reset tokens

**Example entries:**

```text
14:32:01 | Admin: admin@example.com | DATABASE_SWITCH | PostgreSQL → MongoDB | SUCCESS
14:35:11 | User: 8291 | UNAUTHORIZED_ADMIN_ACCESS | /api/admin/users | BLOCKED
14:37:22 | MULTIPLE_LOGIN_FAILURES | user@example.com | RATE_LIMITED
```

**Tests:**

- DB switch creates audit entry without credentials
- Repeated failed logins identifiable in logs

---

### A10:2025 — Mishandling of Exceptional Conditions

**Not just friendly messages** — fail safely in every exceptional state.

**Implementation:**

- Global exception handler
- User response: `{ "error": "Unable to process your request.", "referenceId": "ERR-9081" }`
- Server logs: full technical detail linked to referenceId
- Fail closed: uncertain auth → not authenticated; permission check error → deny
- DB switch failure → previous DB remains active
- Transaction rollback on partial publish failure where supported

**Never expose to users:**

- Stack traces, SQL/Mongo queries, connection strings, file paths, env vars, secrets

**Tests:**

- Invalid/malformed input → safe error, no internals
- MongoDB unavailable → safe response, logged detail
- Failed DB switch → app remains on previous database

---

## Part 5 — Security Testing Matrix

| OWASP | Implementation | Test |
|-------|----------------|------|
| A01 | RBAC + object authorization | Change IDs; access another user's data; admin routes as User |
| A02 | Hardened production config | Probe debug/config exposure; verify headers |
| A03 | Lockfiles + dependency scanning | `npm audit`; secret scan; dependency review |
| A04 | Argon2/bcrypt + TLS + secret isolation | Inspect source/network/storage for secrets |
| A05 | Parameterized SQL + NoSQL validation + HTML sanitization | Injection and XSS testing |
| A06 | Threat modeling + safe state transitions | Manipulate workflows; DB switch failure scenarios |
| A07 | Secure sessions + rate limiting | Credential stuffing; session expiry; reset token abuse |
| A08 | Dependency/content integrity | Tamper requests/files; workflow bypass attempts |
| A09 | Audit logs + monitoring | Generate suspicious events; verify log content |
| A10 | Global error handling | Malformed inputs; DB failures; verify no leakage |

---

## Part 6 — Security Acceptance Criteria

The application is **not complete** until:

1. All ten OWASP Top 10:2025 categories reviewed
2. Each category has concrete implementation controls
3. Each category has at least one test/check
4. Admin authorization enforced server-side
5. Database switching restricted to authorized admins
6. SQL injection protections implemented
7. NoSQL injection protections implemented
8. CMS HTML sanitized
9. Passwords use strong adaptive hashing
10. Secrets never sent to frontend
11. Production errors do not expose internal details
12. Security events logged
13. Important failures fail safely
14. Dependencies reviewed/scanned
15. File uploads validated
16. Sensitive communication uses HTTPS in production
17. Security headers configured
18. Authentication rate-limited/protected
19. Authorization tested against manipulated IDs
20. Database switching failures do not corrupt application state

---

## Part 7 — Documentation Deliverables

| File | Purpose |
|------|---------|
| `docs/THREAT-MODEL.md` | Assets, actors, trust boundaries, high-risk flows |
| `docs/SECURITY.md` | OWASP mapping → controls → code locations → tests |
| `docs/security/TESTING.md` | How to run security tests; checklist |

Admin panel must include **Audit Logs** interface for authorized administrators.

---

## Part 8 — Planned Code Structure (Security + CMS)

```text
server/
  middleware/       auth, rbac, rateLimit, requestId, errorHandler
  guards/           role, permission, ownership (NestJS)
  modules/
    auth/
    cms/            content types, workflow, editor API
    media/
    admin/          users, roles, audit, database switch
  services/         auth, audit, cms, databaseSwitch
  repositories/     PostgresArticleRepository, MongoArticleRepository
  adapters/         CMSAdapter interface (future external CMS)
  utils/            sanitize, crypto, safeFilename
  config/           helmet, cors, cookie, env validation

client/
  api/              HTTP client — no secrets
  components/cms/   editor, media picker, status badges
  pages/admin/      audit logs, database control

tests/security/
  a01-access-control.test.ts
  a05-injection.test.ts
  a07-auth.test.ts
  a10-error-handling.test.ts
```

Objective: demonstrate security was **deliberately designed, implemented, tested, and documented** — not merely claimed.
