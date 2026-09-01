# Documentation Index

> **Read this first.** Assigns authority to each document so developers and AI agents do not invent architecture.

---

## Document Authority

```text
                    docs/README.md  (you are here)
                            │
         ┌──────────────────┼──────────────────┐
         │                  │                  │
    PROJECT.md      SECURITY-AND-CMS.md   ARCHITECTURE.md
    (what to build)  (security + CMS)     (locked tech decisions)
         │                  │                  │
         └────────┬─────────┴─────────┬────────┘
                  │                   │
           DESIGN-SYSTEM.md    RBAC-PERMISSIONS.md
           (visual tokens)     (permission matrix)
                  │                   │
                  └─────────┬─────────┘
                            │
              PROJECT-EXPLANATION-AND-SUMMARY.md
                   (onboarding / orientation)
                            │
                     MASTER-SPEC.md
                   (unified reference copy)
                            │
                       TESTING.md
                  (functional + security QA)
```

---

## Which Document to Use When

| Question | Source of truth |
|----------|-----------------|
| What features and screens must exist? | **`PROJECT.md`** |
| How must security and CMS work? | **`SECURITY-AND-CMS.md`** |
| What tech stack and auth are locked? | **`ARCHITECTURE.md`** |
| What fonts, colors, spacing? | **`DESIGN-SYSTEM.md`** |
| Who can publish, switch DB, manage users? | **`RBAC-PERMISSIONS.md`** |
| How do I understand the whole system quickly? | **`PROJECT-EXPLANATION-AND-SUMMARY.md`** |
| I need one file with everything | **`MASTER-SPEC.md`** |
| What tests must pass before release? | **`TESTING.md`** |

---

## Rule for AI Coding Agents

> **Do not invent architecture. Implement this specification.**

1. Locked decisions live in **`ARCHITECTURE.md`** — NestJS, TipTap, Zustand, Axios, pg, Mongoose, Argon2id, Pino, Jest, Supertest, Playwright. **No substitutions.**
2. Permissions live in **`RBAC-PERMISSIONS.md`** — enforce on backend.
3. Visual rules live in **`DESIGN-SYSTEM.md`** — extract principles from references, do not clone Harvard/NDTV/Medium literally.
4. Security tests in **`TESTING.md`** are acceptance criteria.

---

## Development Order (Corrected)

Security architecture is **foundational**, not a late hardening phase.

```text
 1. Architecture + monorepo skeleton
 2. Database schema + domain models
 3. Auth + RBAC + security foundation (helmet, rate limit, error handler, audit log)
 4. Repository abstraction layer
 5. PostgreSQL implementation
 6. MongoDB implementation
 7. Public website
 8. CMS + workflow
 9. Admin panel
10. Database switching (with concurrency mutex)
11. Security test suite (OWASP A01–A10)
12. UI polish + responsive + accessibility
```

---

## File List

| File | Lines (approx.) | Role |
|------|-----------------|------|
| `PROJECT.md` | ~700 | Product requirements, UI, API, features |
| `SECURITY-AND-CMS.md` | ~620 | OWASP, trust boundary, CMS engine, adapters |
| `PROJECT-EXPLANATION-AND-SUMMARY.md` | ~320 | Developer onboarding and system explanation |
| `MASTER-SPEC.md` | ~530 | Combined unified reference |
| `ARCHITECTURE.md` | ~120 | Locked stack, auth cookies, DB switch concurrency |
| `DESIGN-SYSTEM.md` | ~140 | Typography, colors, layout, components |
| `RBAC-PERMISSIONS.md` | ~200 | Full permission matrix + workflow gates |
| `TESTING.md` | ~180 | Functional + security checklists |
