# RBAC Permission Matrix
## CMS-Driven Editorial Content Platform

> **Authority:** Architecture + security — defines who may do what.  
> **Enforcement:** Backend guards only. Frontend visibility is UX, not security.  
> **Related:** `ARCHITECTURE.md` · `SECURITY-AND-CMS.md`

---

## 1. Roles

| Role | Code | Description |
|------|------|-------------|
| Super Admin | `SUPER_ADMIN` | Full system access including database switching and security config |
| Admin | `ADMIN` | User management, CMS oversight, settings per assigned permissions |
| Editor | `EDITOR` | Review, edit, approve, publish, and archive content |
| Author | `AUTHOR` | Create and manage own content; submit for review |
| User | `USER` | Public features: profile, bookmarks, comments, likes |

Roles are configurable containers. **Permissions** are the atomic unit enforced by guards.

---

## 2. Permission Naming Convention

```text
<resource>.<action>[.<scope>]
```

Examples: `article.update.own`, `article.publish`, `database.switch`

Scopes:

- **own** — resource owned by authenticated user (`authorId === user.id`)
- **any** — any resource of that type (requires elevated role)

---

## 3. Full Permission Matrix

Legend: ✅ allowed · ❌ denied · 🔒 own only

### Users & Access

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `user.read.any` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.create` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.update.any` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.deactivate.any` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `user.delete.any` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `user.read.own` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `user.update.own` | ✅ | ✅ | ✅ | ✅ | ✅ |

### Roles & Permissions

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `role.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `role.assign` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `permission.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `permission.assign` | ✅ | ❌ | ❌ | ❌ | ❌ |

### Articles / CMS Content

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `article.read.published` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `article.read.any` | ✅ | ✅ | ✅ | 🔒 | ❌ |
| `article.create` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `article.update.own` | ✅ | ✅ | ✅ | 🔒 | ❌ |
| `article.update.any` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.delete.own` | ✅ | ✅ | ❌ | 🔒 | ❌ |
| `article.delete.any` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `article.submit_review` | ✅ | ✅ | ✅ | 🔒 | ❌ |
| `article.approve` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.reject` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.publish` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.unpublish` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.schedule` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.archive` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `article.restore` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Pages

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `page.read.published` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `page.read.any` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `page.create` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `page.update.any` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `page.publish` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `page.delete.any` | ✅ | ✅ | ❌ | ❌ | ❌ |

### Taxonomy

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `category.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `category.manage` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `tag.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `tag.manage` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Media

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `media.read` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `media.upload` | ✅ | ✅ | ✅ | ✅ | ❌ |
| `media.delete.own` | ✅ | ✅ | ✅ | 🔒 | ❌ |
| `media.delete.any` | ✅ | ✅ | ✅ | ❌ | ❌ |

### Comments

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `comment.read` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comment.create` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comment.update.own` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `comment.moderate` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `comment.delete.any` | ✅ | ✅ | ✅ | ❌ | ❌ |

### System & Admin

| Permission | SUPER_ADMIN | ADMIN | EDITOR | AUTHOR | USER |
|------------|:-----------:|:-----:|:------:|:------:|:----:|
| `admin.dashboard.view` | ✅ | ✅ | ✅ | ❌ | ❌ |
| `audit.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `database.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `database.switch` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `settings.read` | ✅ | ✅ | ❌ | ❌ | ❌ |
| `settings.update` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `security.read` | ✅ | ❌ | ❌ | ❌ | ❌ |
| `security.update` | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 4. Workflow State Transitions (Server-Enforced)

Client-sent `status` fields are **never trusted**. Backend validates transition + permission.

| From | To | Required Permission |
|------|-----|---------------------|
| — | `draft` | `article.create` |
| `draft` | `pending_review` | `article.submit_review` + own |
| `pending_review` | `approved` | `article.approve` |
| `pending_review` | `rejected` | `article.reject` |
| `rejected` | `draft` | `article.update.own` |
| `rejected` | `pending_review` | `article.submit_review` + own |
| `approved` | `published` | `article.publish` |
| `approved` | `scheduled` | `article.schedule` |
| `scheduled` | `published` | `article.publish` (system job or editor) |
| `published` | `archived` | `article.archive` |
| `archived` | `draft` | `article.restore` |

**Blocked always:** Author sending `status: published` or `status: approved` without permission → `403` + audit log entry.

---

## 5. Object-Level Authorization Rules

Every mutating request on a resource ID must pass:

```text
1. Authenticated?
2. Has required permission for action?
3. If scope = own → resource.authorId === req.user.id?
4. If workflow transition → valid state machine transition?
5. Allow or deny (fail closed on uncertainty)
```

### Examples

```text
PATCH /api/cms/content/1003  (Author A)
  → article.update.own
  → article 1003.authorId must equal Author A's id

GET /api/admin/users  (User role)
  → requires user.read.any
  → 403 Forbidden

POST /api/admin/database/switch  (Admin, not Super Admin)
  → requires database.switch
  → 403 Forbidden
```

---

## 6. Default Role → Permission Mapping (Seed)

```typescript
SUPER_ADMIN → all permissions
ADMIN       → all except database.switch, permission.assign, settings.update, security.*
EDITOR      → content read/write/publish/moderate, taxonomy, media, admin.dashboard.view
AUTHOR      → article.*.own, article.create, article.submit_review, media.upload/read, comment.*
USER        → user.read.own, user.update.own, article.read.published, comment.create/read/update.own
```

---

## 7. Security Tests (A01) — Required

| Test | Expected |
|------|----------|
| User → `GET /api/admin/users` | 403 |
| Author A → `PATCH /api/cms/content/:authorB_articleId` | 403 |
| Author → `{ status: "published" }` on own draft | 403 |
| Admin → `POST /api/admin/database/switch` | 403 |
| Super Admin → `POST /api/admin/database/switch` | 200 (if target healthy) |
| Tamper `role` in JWT payload without valid signature | 401 |
| Tamper `role` in request body on profile update | Ignored; server uses DB role |

---

## 8. Implementation Notes (NestJS)

```text
@RequirePermission('article.update.own')
@CheckOwnership('article', 'authorId')
@ValidateWorkflowTransition()
```

- Permissions loaded from DB at login; cached in session context
- Role changes take effect on next token refresh (max 15 min) or immediate if session revoked
- Deny by default: routes without explicit permission decorator are not public unless marked `@Public()`
