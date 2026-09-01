# Transparent JIT Fallback & Auto-Replication Architecture Plan

This plan introduces **Transparent On-Demand Fallback & JIT (Just-In-Time) Auto-Replication** between PostgreSQL and MongoDB. 

When the active database is switched (e.g. from PostgreSQL to MongoDB or vice-versa), any registered user or content that was created in the previous database will **seamlessly log in and function with zero buffer, zero errors, and zero need for re-registration**.

---

## User Review Required

> [!IMPORTANT]
> **Key Architecture Decisions:**
> 1. **Primary Database Authority**: All regular reads and writes continue to go to `ACTIVE_DATABASE` directly.
> 2. **Transparent JIT Replication on Miss**: When a user attempts login (`findByEmail`) or authentication token check (`findById`), if the record is missing in the active database, the system queries the peer database in the background. If found with a valid Argon2id hash, it automatically replicates the user into the active database and continues execution without error.
> 3. **Preserved Identity & IDs**: The replicated user preserves email, name, password hash, role, permissions, and active status.
> 4. **No Continuous Background Lag**: Does not require heavy continuous background syncing or dual-write overhead.

---

## Proposed Changes

### Database & Repository Layer

#### [NEW] [seamless-user.repository.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/seamless/seamless-user.repository.ts)
- Wraps the active `IUserRepository` (Postgres or Mongo) and peer `IUserRepository`.
- On `findByEmail(email)`:
  - Queries active repository.
  - If found, returns user.
  - If null, queries peer repository.
  - If found in peer repository, creates the user in the active repository (auto-replicate) and returns it.
- On `findById(id)`:
  - Queries active repository.
  - If null, queries peer repository and replicates if present.

#### [NEW] [seamless-article.repository.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/seamless/seamless-article.repository.ts)
- On `findBySlug(slug)` or `findById(id)`:
  - If not found in active repository, checks peer repository and transparently caches/replicates into the active database.

#### [MODIFY] [repository.providers.ts](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/repositories/repository.providers.ts)
- Updates `userRepositoryProvider` and `articleRepositoryProvider` factories to wrap active & peer repositories with the Seamless Proxy.

---

## Verification Plan

### Automated Tests
1. **Interactive Database Switch Verification Script**:
   - Run `test/database-switch-test.mjs`
   - Step 1: Register in PostgreSQL $\to$ Login in PostgreSQL (Success).
   - Step 2: Switch to MongoDB $\to$ Login with SAME credentials in MongoDB $\to$ **Should now SUCCEED (HTTP 200) via JIT Auto-Replication!**
   - Step 3: Switch back to PostgreSQL $\to$ Login still works with zero disruption.

2. **Automated Unit & E2E Tests**:
   - Run `npm test -w server` to ensure all 50 existing security & CMS tests pass with 100% coverage.
