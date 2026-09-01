# Production Readiness Checklist

## Security — must pass before production

- [x] Server-side account status checked on protected requests.
- [x] Current server-side role used for authorization.
- [x] 5xx errors redacted at the global boundary.
- [x] SQL queries parameterized in reviewed repositories.
- [x] Rich text sanitized server-side.
- [x] JWT is stored in HttpOnly/SameSite cookies.
- [x] CSRF middleware present for state-changing requests.
- [ ] Production secrets moved to a managed secret store.
- [ ] External WAF/edge protection configured.
- [ ] Turnstile enabled on selected abuse-prone endpoints.
- [ ] Upload malware scanning policy finalized if uploads expand beyond images.

## Availability / scalability

- [ ] Run k6/Artillery load tests at realistic concurrency.
- [ ] Tune PostgreSQL/MongoDB/SQL pool sizes.
- [ ] Redis distributed locking for multi-instance DB switching.
- [ ] Durable replication queue/outbox.
- [ ] Idempotency keys for replayable writes.
- [ ] Reconciliation worker for degraded database nodes.
- [ ] Graceful shutdown and worker draining tested.
- [ ] Backup + restore drill completed.
- [ ] Failure/chaos tests completed for each database.

## Six-database architecture

- [x] All six database adapters/services exist in the codebase.
- [ ] Define authoritative consistency/version policy for partial writes.
- [ ] Keep ClickHouse analytics-oriented rather than treating it as an equivalent transactional store.
- [ ] Make cross-database replication ordering/idempotency explicit.
- [ ] Add schema migration/versioning strategy for all supported engines.

## Product completeness

- [ ] Reposts.
- [ ] Notifications.
- [ ] Highlights.
- [ ] Personal lists.
- [ ] Full reading history.
- [ ] Collections/series.
- [ ] Author/content analytics.
- [ ] Reports/block/mute moderation flows.
- [ ] Publication/organization model if required.

## UI/UX

- [ ] Remove remaining generic card-grid patterns.
- [ ] Reduce decorative pills/badges.
- [ ] Apply the editorial composition system consistently to every public/user screen.
- [ ] Replace demo/test-looking content with real CMS data.
