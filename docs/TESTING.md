# Testing Specification
## Functional + Security Test Requirements

> **Authority:** Quality and security acceptance — app is incomplete until these pass.  
> **Related:** `SECURITY-AND-CMS.md` · `RBAC-PERMISSIONS.md` · `ARCHITECTURE.md`

---

## 1. Testing Philosophy

```text
Build secure code → Test as attacker → Verify block + safe error + audit log
```

Do **not** build deliberately vulnerable endpoints for demonstration.

Test environments only for injection payloads. Never leave SQLi/XSS holes in production code paths.

---

## 2. Test Layers

| Layer | Tool | Scope |
|-------|------|-------|
| Unit | **Jest** | Services, validators, workflow state machine, sanitizers |
| Integration | **Supertest** + test DB | API routes, repositories, auth flow |
| Security | **`tests/security/` (Jest + Supertest)** | OWASP A01–A10 |
| E2E | **Playwright** | Register → login → CMS workflow → public read |
| CI | **GitHub Actions** | lint, Jest, Supertest, `npm audit`, secret scan |

---

## 3. OWASP Security Test Checklist

### A01 — Broken Access Control

- [ ] User cannot access `GET /api/admin/users` (403)
- [ ] Author A cannot `PATCH` Author B's article by ID change (403)
- [ ] Editor cannot access `database.switch` (403)
- [ ] Non-admin cannot access audit logs (403)
- [ ] IDOR on media, categories, comments tested
- [ ] Vertical escalation: User → admin routes blocked
- [ ] Horizontal escalation: Author A → Author B blocked

### A02 — Security Misconfiguration

- [ ] `GET /.env` → 404/403, no file content
- [ ] `GET /debug`, `/test`, `/admin/debug` → not exposed in production
- [ ] Response includes CSP, HSTS, X-Content-Type-Options, Referrer-Policy
- [ ] CORS rejects unauthorized origins
- [ ] No directory listing on static assets
- [ ] Production build has no exposed source maps with secrets

### A03 — Supply Chain

- [ ] `npm audit` runs in CI; policy enforced for critical/high
- [ ] `package-lock.json` committed
- [ ] Secret scan (gitleaks) passes on PR
- [ ] No untrusted CDN scripts without SRI
- [ ] Dependency list documented with justification

### A04 — Cryptographic Failures

- [ ] Client bundle contains no `DATABASE_URL`, `JWT_SECRET`, API keys
- [ ] DevTools Network: no password hashes in API responses
- [ ] Passwords stored as Argon2id hashes only
- [ ] Reset tokens are crypto-random, expiring, single-use
- [ ] Production served over HTTPS

### A05 — Injection

- [ ] SQL: parameterized queries only (code review + integration tests)
- [ ] SQLi payloads on search, login, filters → no data leak (test env)
- [ ] NoSQL: `{ "email": { "$ne": null } }` on login → rejected
- [ ] Stored XSS: `<script>alert(1)</script>` in article → sanitized/stripped
- [ ] Reflected XSS in search query → escaped
- [ ] Comment, bio, category description XSS tested

### A06 — Insecure Design

- [ ] Threat model document exists and reviewed
- [ ] Author cannot publish via API body tampering
- [ ] DB switch with target down → current DB remains active
- [ ] DB switch logged in audit trail

### A07 — Authentication Failures

- [ ] 10+ rapid login attempts → 429 rate limit
- [ ] Invalid credentials → generic error (no user enumeration)
- [ ] Logout → refresh token revoked; old token rejected
- [ ] Expired access token → 401; refresh flow works
- [ ] Reset token reuse → rejected
- [ ] Session cookies: HttpOnly, Secure, SameSite

### A08 — Data Integrity

- [ ] Upload `.exe`, `.php`, MIME-mismatch file → rejected
- [ ] Client `role: admin` in profile body → ignored
- [ ] Client `status: published` without permission → 403
- [ ] Uploaded files stored with UUID names; not executed

### A09 — Logging

- [ ] Login success/failure logged
- [ ] DB switch logged (from, to, result, actor) — no credentials
- [ ] Authorization failure logged
- [ ] Rate limit events logged
- [ ] Logs contain no passwords, tokens, or secrets
- [ ] Admin audit UI searchable by actor, action, date

### A10 — Exception Handling

- [ ] DB connection error → generic message + `referenceId`; no stack trace
- [ ] Invalid UUID/id → 404/400 safe message
- [ ] `referenceId` correlates to server log entry
- [ ] Permission check error → deny (fail closed)
- [ ] Failed DB switch → no corrupt/half-switched state

---

## 4. Functional Test Checklist

### Authentication

- [ ] Register with valid data → account created
- [ ] Register with invalid email → 422
- [ ] Login → httpOnly cookies set
- [ ] Protected route without auth → 401
- [ ] Password reset flow end-to-end

### Public Website

- [ ] Homepage loads featured, latest, categories
- [ ] Article page renders sanitized content
- [ ] Category and tag pages paginate
- [ ] Search returns server-side results
- [ ] Only published articles visible publicly

### User CMS

- [ ] Author creates draft
- [ ] Author submits for review → status `pending_review`
- [ ] Author cannot publish own article
- [ ] Author edits rejected article and resubmits

### Admin / Editor

- [ ] Editor approves and publishes article
- [ ] Editor rejects with feedback
- [ ] Admin manages users and roles
- [ ] Super Admin switches database (with healthy target)

### CRUD

- [ ] Categories, tags, media CRUD with validation
- [ ] Soft delete preserves record with `deletedAt`
- [ ] Dependent delete prevented (category with articles)

### Database Abstraction

- [ ] Postgres active → CRUD hits PostgreSQL
- [ ] Mongo active → CRUD hits MongoDB
- [ ] Data in Postgres unchanged after switch to Mongo
- [ ] Repository returns consistent domain model shape

### Database Switch Concurrency

- [ ] In-flight reads complete during switch
- [ ] Write mutex < 150ms; no split-brain writes
- [ ] Failed healthcheck → no pointer swap
- [ ] Buffered writes processed on new DB after swap

---

## 5. Browser-Side Security Manual Check

Perform before release:

1. **View Source** — no secrets in HTML
2. **DevTools → Sources** — no `JWT_SECRET`, DB URLs in bundles
3. **DevTools → Network** — no password hashes; cookies HttpOnly
4. **DevTools → Application** — no sensitive data in localStorage
5. **Modify request** — tamper IDs, roles, status → backend blocks

---

## 6. Running Tests (Planned)

```bash
# Unit + integration
npm run test

# Security suite
npm run test:security

# Dependency audit
npm audit --audit-level=high

# E2E (when configured)
npm run test:e2e
```

---

## 7. Acceptance Gate

Application is **not complete** until:

1. All OWASP checklist items above have at least one automated or documented manual test
2. All functional checklist items pass
3. `RBAC-PERMISSIONS.md` matrix verified by integration tests
4. Security test results recorded in `docs/security/TEST-RESULTS.md` (created at QA time)
