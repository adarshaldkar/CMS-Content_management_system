# Linkage Analysis

Audit of every file, folder, and asset in the CMS workspace — what exists, what was linked, and how the persistence mesh is wired end-to-end. No files were deleted.

## Summary

| Check | Result |
| --- | --- |
| Relative imports resolving | 264/264 source files |
| Server typecheck (`tsc --noEmit`) | PASS (exit 0) |
| Client typecheck (`tsc -b --noEmit`) | PASS (exit 0) |
| Port | Uniform `3001` everywhere (schema, `.env`, CSRF guard, test scripts, Vite proxy) |
| Orphan UI pages | `/workspace` + `/admin/panel` routed in `App.tsx` with layout nav links |
| Orphan assets | `hero.png`, `react.svg`, `vite.svg`, `icons.svg` sprite all consumed |
| Social feature repos | 5 Postgres + 5 Mongo + 5 seamless coordinators across 6 engines |

## Port unification (3000 → 3001)

- `server/src/config/env.schema.ts` — `PORT` default changed to `3001`.
- `server/.env.example` — `PORT=3001`.
- `server/src/common/guards/csrf.guard.ts` — allowlist updated to `http://localhost:3001` and `http://127.0.0.1:3001`.
- `test/step1-foundation-test.mjs`, `test/step2-workspace-test.mjs`, `test/step3-public-reader-test.mjs`, `test/step4-admin-governance-test.mjs`, `test/database-switch-test.mjs` — all `BASE_URL` values updated to `http://localhost:3001/api`.
- Vite dev proxy (`client/vite.config.ts`) already forwarded `/api` and `/uploads` to `3001`, so browser ↔ API now agree.

## Orphan UI pages linked

- `client/src/pages/legacy/AdminPanelPage.tsx` — imported into `App.tsx`, routed at `/admin/panel` under a separate `AdminRoute` (sibling of `AdminLayout`, avoiding double chrome).
- `client/src/pages/legacy/UserPanelPage.tsx` — imported into `App.tsx`, routed at `/workspace` under `ProtectedRoute` (sibling of `UserLayout`).
- `client/src/components/layout/AdminLayout.tsx` — added "Control Panel" nav entry (`LayoutDashboard` icon) → `/admin/panel`.
- `client/src/components/layout/UserLayout.tsx` — added "Legacy Workspace" nav entry (`Edit3` icon) → `/workspace` (replaced stale "Stories & Drafts" label).

## Orphan assets linked

- `client/src/assets/hero.png` → imported as `heroMasthead` in `HomePage.tsx`; used as hero fallback image (`absolute inset-0 object-cover opacity-30 grayscale`) with serif headline overlay when an article has no cover image.
- `client/src/assets/icons.svg` → symbol-sprite references (`#github-icon`, `#bluesky-icon`, `#x-icon`, `#discord-icon`) rendered as `SOCIAL_LINKS` icon buttons in `PublicFooter.tsx`.
- `client/src/assets/react.svg` + `vite.svg` → imported and shown as tech badges in the footer.

## Persistence mesh — end to end

Stack: PostgreSQL (primary), MongoDB, MariaDB, MySQL, CockroachDB, ClickHouse.

### Repositories created (this pass)

Mongo schemas + repositories in `server/src/repositories/mongo/`:

- `bookmark.schema.ts` + `mongo-bookmark.repository.ts`
- `comment.schema.ts` + `mongo-comment.repository.ts`
- `follow.schema.ts` + `mongo-follow.repository.ts`
- `like.schema.ts` + `mongo-like.repository.ts`
- `publishing-slot.schema.ts` + `mongo-publishing-slot.repository.ts` (includes `AuthorSlotAssignmentSchemaClass`; uses `@InjectConnection` to populate article/user counts)

Seamless coordinators in `server/src/repositories/seamless/`:

- `seamless-comment.repository.ts`, `seamless-bookmark.repository.ts`, `seamless-like.repository.ts`, `seamless-follow.repository.ts`, `seamless-publishing-slot.repository.ts`

Each coordinator follows the existing pattern: `activeRepo`/`peerRepo` select on `process.env.ACTIVE_DATABASE`; `replicateToAll()` writes to the peer plus MariaDB/MySQL/Cockroach pools (ClickHouse is analytics-only and intentionally excluded from transactional replication).

### Wiring

- `server/src/repositories/repository.providers.ts` — added `commentRepositoryProvider`; rewrote `bookmarkRepositoryProvider`, `likeRepositoryProvider`, `followRepositoryProvider`, `publishingSlotRepositoryProvider` as ACTIVE_DATABASE-aware factories injecting all engine services + both repos; extended `ALL_DATABASE_REPOSITORIES` with the 5 Mongo repos.
- `server/src/database/database-switcher.service.ts` — now consumes `ALL_DATABASE_REPOSITORIES`; `DatabaseHealthStatus` gains `registeredRepositories` (total + per-engine coverage) and is returned by `GET /database/status`.
- `client/src/pages/admin/DatabaseSwitcherPage.tsx` — added a "Repository Implementations" telemetry tile rendering the live count from the status payload.
- `server/src/repositories/repository-proxy.ts` — `AnyRepository` union extended with `ICommentRepository`, `IBookmarkRepository`, `ILikeRepository`, `IFollowRepository`, `IPublishingSlotRepository`; method dispatch matrix extended for all five.
- `server/src/modules/{comments,bookmarks,likes,follows,publishing-slots}/*.module.ts` — now register Mongo schemas via `MongooseModule.forFeature`, provide Postgres + Mongo repos and the seamless factory provider, and export it.

### Runtime DDL additions

`cms_publishing_slots` and `cms_author_slot_assignments` tables added to the live `ensureSchema()` DDL of:

- `server/src/database/mariadb.service.ts`
- `server/src/database/mysql.service.ts`
- `server/src/database/cockroach.service.ts`

### Dead code discovered

- `MARIADB_SCHEMAS`, `MYSQL_SCHEMAS`, `COCKROACH_SCHEMAS` constants in `server/src/repositories/{mariadb,mysql,cockroach}.schema.ts` are unreferenced; the real DDL lives in the database services (the source of truth).
- `ALL_DATABASE_REPOSITORIES` was unused — now consumed by the switcher status.
- Sync to SQL engines is best-effort by design: insert failures are caught and warn-logged, never fatal.

## Verification tooling

- `server/scripts/check-links.mjs` — standalone import resolver: scans every `.ts/.tsx` under `server/src` and `client/src`, resolves all relative/local imports (with `.ts/.tsx/.js`/`index` fallbacks), and fails on any missing module. Result: all 264 files resolve.

## How to verify

```powershell
# Linkage scan (repo root)
node server/scripts/check-links.mjs

# Server typecheck
cd server; npx tsc --noEmit -p tsconfig.json

# Client typecheck
cd client; npx tsc -b --noEmit

# Mesh status (server running)
Invoke-RestMethod http://localhost:3001/api/database/status
```