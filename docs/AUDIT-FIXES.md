# CMS Platform — Audit Fix Pack

This archive contains a targeted hardening pass over the supplied CMS project.

## Fixed in this pack

1. **Immediate account-status and role enforcement**
   - `JwtAuthGuard` now resolves the current user from the server-side repository for protected requests.
   - Deactivated accounts are rejected immediately.
   - Current database role/permissions are used instead of trusting stale JWT role claims.

2. **JWT claim validation**
   - Requires a valid access-token type, subject and JTI.
   - Signature, HS256 algorithm, issuer, audience and expiration remain enforced.

3. **HTTP 5xx error redaction**
   - `GlobalExceptionFilter` no longer returns internal exception/database messages for server errors, including `HttpException` wrappers.
   - Detailed errors remain server-side for diagnostics.

4. **Database-switch error redaction**
   - The database switch service no longer forwards the underlying exception message to the browser.

5. **Environment example consistency**
   - MariaDB host port corrected to `3307`.
   - MySQL host port corrected to `3308`.
   - ClickHouse example password matches the Docker development setup.

6. **Test source tracking**
   - The root `.gitignore` no longer ignores test source files.
   - Added a real `server/test/setup.ts` because the existing Jest configuration referenced it.
   - Added focused regression tests for JWT status/role enforcement and 5xx error redaction.

## Verification limitation

The supplied environment did not provide Docker, and dependency installation (`npm ci`) timed out in the audit container. Therefore this archive has **not** been truthfully labelled as fully build-verified here.

Before production use, run:

```powershell
npm ci
npm test -w server
npm run build -w client
npm run build -w server
npm run lint -w server
```

Then run the project's Docker integration/DB continuity tests on a machine with Docker Desktop.

## Important remaining engineering work

This fix pack does not pretend to solve issues that require a larger architectural implementation. The following remain explicitly tracked in `PRODUCTION-READINESS-CHECKLIST.md`:

- Distributed DB switch state/locking across multiple application instances.
- Durable cross-database replication/outbox and reconciliation.
- Universal JIT continuity across every required entity and all configured engines.
- Cloudinary, Resend, Redis/BullMQ, Turnstile, Sentry and OpenTelemetry integration.
- Complete social feature surface such as reposts, notifications, highlights, lists and analytics.
- Reproducible full end-to-end test suite in the repository.
- Load/chaos testing and backup/restore drills.
