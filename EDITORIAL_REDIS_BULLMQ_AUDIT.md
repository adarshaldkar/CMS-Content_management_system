# Editorial Studio + Redis / BullMQ / Notifications — Deep Code Audit Report

**Date:** 2026-09-09
**Status:** Read-only audit + fix worklog
**Verification baseline:**
- Server tests: **140/140 passing (20 suites)**
- Client typecheck: **clean (exit 0)**
- Git tree: clean (all committed)

---

## Executive Summary

This audit covers the committed editorial additions (RichTextEditor + editorial studio), plus the Redis, BullMQ, Notifications, Jobs/DLQ, Newsletter, Embeds, and Documents modules. The system is **broad and feature-rich, with good overall architecture** — SSRF defense in embeds is excellent, the article write-path is server-side XSS-sanitized, and 140 tests pass.

However, several **spec-vs-implementation gaps** and **security issues** were confirmed by direct code reading:

- **Real bugs:** broken production cache invalidation, unsanitized newsletter + Gutenberg content, unauthenticated webhook, fake DLQ telemetry, dead BullMQ queues, sync-not-async notifications.
- **No critical data-loss bugs** found in the core article/comment persistence paths.

---

## 1. Redis Layer (`server/src/redis`)

### What's real & working
- `RedisService`: L2 cache envelopes, single-flight coalescing, fencing locks (Lua compare-and-del), Pub/Sub, user-bound idempotency primitives. Fail-open design.
- `RedisCacheInterceptor`: `@Cacheable(ttl, keyPrefix)` for GET endpoints.
- Tests pass (165-line spec).

### Bugs / gaps

| # | Sev | Finding |
|---|-----|---------|
| R1 | High | **Cache invalidation on publish is broken.** `publisher.worker.ts:137` calls `delCached('cache:article:${slug}', 'cache:articles:*')`, but the interceptor writes keys under the `cms:v1:cache:...` namespace. Wrong namespace, **and** `DEL` treats `cache:articles:*` as a literal key (no wildcard support) → published articles remain **stale in L2**. |
| R2 | Med | **Single-flight doesn't coalesce origin queries.** Interceptor coalesces only the *cache read*; on a miss all requests hit the DB → cache-stampede protection (Pillar 4) not achieved. |
| R3 | Med | **SWR not implemented.** Only a hard 300s ceiling exists. No background revalidate / serve-stale-while-revalidate / publish warm-up (Pillar 1 partial). |
| R4 | Med | `entityVersion` stored but never enforced on read → version-aware invalidation is inert. |
| R5 | Med | **Fail-open idempotency** — on Redis down, `checkAndSetIdempotency` returns `ACQUIRED` → duplicate writes during outage. |
| R6 | Low | Hardcoded default `REDIS_PASSWORD=cms_dev_password` (`redis.service.ts:32`). |
| R7 | Low | `acquireFencingLock` never called (dead); no DB-boundary `WHERE last_fencing_token < $token` enforcement. |

---

## 2. BullMQ (`server/src/bull`)

5 queues registered (3 live after Batch 2):

| Queue | Producer | Consumer | Status |
|-------|:---:|:---:|--------|
| `scheduled-publishing` | ✅ | ✅ | REAL |
| `newsletter-broadcast` | ✅ | ✅ | REAL |
| `notification-outbox` | ✅ | ✅ | REAL (was DEAD — fixed, see §10) |
| `mesh-reconciliation` | ❌ | ❌ | DORMANT (planned infra, no producer yet) |
| `analytics-rollup` | ❌ | ❌ | DORMANT (planned infra, no producer yet) |

- `JOB_NAMES.DISPATCH_NOTIFICATION`, `REPLAY_SECONDARY_WRITE`, `ANALYTICS_HOURLY_ROLLUP` are never referenced.
- ~~Notifications dispatch synchronously~~ — superseded by the BullMQ `notification-outbox` worker (see §10, Batch 2): async retry/backoff restored, in-request latency removed.
- Publisher update lacked optimistic-concurrency at DB boundary → double-publish/race risk with `reconcileMissedSchedules` — closed via fencing locks (R7).
- Schedule-integrity hole: DB set to SCHEDULED before delayed job enqueued; enqueue failure → stuck until restart reconciliation — closed via periodic `RECONCILE_SCHEDULED_PUBLISHERS` keeper job (P1).

---

## 3. Notifications (`server/src/modules/notifications`)

**Real:** SSE stream, self-notification suppression, preference checks, Redis 24h dedup, atomic grouped upsert (both Postgres + Mongo), unread INCR/DECR + cold-fill reconciliation. Tests pass.

| # | Sev | Finding |
|---|-----|---------|
| N1 | Med | Postgres `actors_summary` grows unbounded; Mongo caps at 5 (`$slice:5`). Inconsistent. |
| N2 | Med | **Unmapped `NotificationType` bypasses preference check** (fail-open on undefined key). |
| N3 | Low | SSE `subscribe()` async gap + silent `JSON.parse` catch (no logging). |
| N4 | Low | `markAllAsRead` resets Redis even when 0 marked; DB-write vs Redis-reset not atomic → may drop a concurrent new-unread INCR. |
| N5 | Low | Notification messages interpolate raw `title`/`reviewNote`; `user.email` used as `actorName` fallback (PII in message). |

---

## 4. Jobs / DLQ Admin (`server/src/modules/jobs`)

**Real:** 4-layer guard chain, rate-limited mutations, correct recursive sensitive-field redaction, real queue counts + `oldestWaitingJobAgeMs`.

| # | Sev | Finding |
|---|-----|---------|
| J1 | High | `p95ProcessingLatencyMs: 120` is **hardcoded**. |
| J2 | High | `throughputPerMinute = active × 12` is **fake**. |
| J3 | Med | `workersCount` hardcoded (4/2). |
| J4 | Med | Stack-trace sanitizer misses forward-slash Windows, `/var/`,`/opt/`,`/srv/`,`/Users/` paths. |

---

## 5. Newsletter

**Real:** double opt-in (SHA-256, 48h), 50-subscriber batching, idempotent batch job IDs, live suppression re-check, campaign metrics. Tests pass.

| # | Sev | Finding |
|---|-----|---------|
| NL1 | High | **Campaign `contentHtml` stored verbatim, no sanitization** (`newsletter.service.ts:314`). |
| NL2 | High | **`POST /newsletter/webhook/events` is UNAUTHENTICATED** — no HMAC/shared-secret → arbitrary bounce/complaint injection + mass-unsubscribe. |
| NL3 | Med | Verification token returned in API response; preference lookup returns raw email. |
| NL4 | Med | Mongo search `$regex` unescaped → **ReDoS**. |
| NL5 | Med | `sendCampaign` TOCTOU → double-enqueue. |
| NL6 | Low | Email sending **simulated** (log only). |

---

## 6. Embeds (SSRF)

**Excellent SSRF defense** (IP pinning, DNS-rebinding-safe, per-redirect re-validation, 2MB byte cap, 3.5s timeout, port 80/443 only).

| # | Sev | Finding |
|---|-----|---------|
| E1 | Med | Twitter oEmbed `html` stored/passed unsanitized → stored-XSS surface. |
| E2 | Med | No rate limit on `/embeds/scrape` (JWT-only). |
| E3 | Low | IPv4-mapped IPv6 not fully handled. |

---

## 7. Documents / Ingestion

**Real:** 25MB cap, magic-byte detection, mammoth/markdown-it/pdf-parse, sanitize in `importDocument`, Gutenberg bi-directional adapter, PDF IR pipeline (150-page cap).

| # | Sev | Finding |
|---|-----|---------|
| D1 | High | **Gutenberg parse/serialize endpoints don't sanitize output** → client `dangerouslySetInnerHTML` + editor injection exposure. (Mitigated by write-time sanitize, but preview path is exposed.) |
| D2 | Med | No DB persistence for documents/jobs (in-memory Map). |
| D3 | Med | PDF parsing runs synchronously in request path, no `worker_threads`/CPU timeout → event-loop blocking (DoS). |
| D4 | Low | Gutenberg `image` block injects `alt`/`src`/`caption` without HTML-escaping; `textAlign` CSS injection. |

---

## 8. RichTextEditor & Editorial Studio

**Broad, wired feature set:** semantic nodes, slash palette, sticky ribbon, table builder, image resizer, floating toolbar, paste handler, link bubble, 20+ shortcuts, document map, pre-publish validation, revision diff, workflow bar, templates.

| # | Sev | Finding |
|---|-----|---------|
| CE1 | High | **Entire formatting backbone on deprecated `document.execCommand` / `queryCommandState`.** |
| CE2 | High | Link URL interpolated into HTML with only prefix validation → `"` attribute injection. |
| CE3 | Med | `dangerouslySetInnerHTML` on imported/Gutenberg HTML, no DOMPurify client-side. |
| CE4 | Med | iframe embeds lack `sandbox`; broad `allow`. |
| CE5 | Med | `Ctrl+1/2/3` format headings AND switch browser tabs. |
| CE6 | Med | `EditorialRibbon.activeBlockType` never updates from cursor. |
| CE7 | Med | `ImageResizerOverlay` drag listeners can leak on unmount. |
| CE8 | Low | `VideoPlayer` keyboard handler doesn't guard `contentEditable` children; `isFullscreen` set pre-promise. |
| CE9 | Low | `MediaPickerModal` no custom-URL validation; double Escape. |
| CE10 | Low | `editorialPatterns.ts` timestamps at module load (stale). |

---

## 9. Highest-Priority Fix Plan

1. R1 — fix production cache invalidation (correct `cms:v1:cache` keys + actual key prefix cleanup).
2. NL1 — sanitize newsletter `contentHtml` server-side.
3. NL2 — secure the newsletter webhook with HMAC/share-secret signature verification.
4. D1 — sanitize Gutenberg parse/serialize output server-side.
5. J1/J2/J3 — replace fake/hardcoded DLQ metrics with real measured values.
6. NL4 — escape Mongo newsletter search regex (ReDoS).
7. N1 — cap Postgres `actors_summary` to 5.
8. CE2 — harden link URL validation/escaping in RichTextEditor.
9. E2 -- add rate limiting to `/embeds/scrape`.

---

## 10. Fix Log (2026-09-09)

All items below have been implemented and verified:

- **R1 (Fixed)** — `publisher.worker.ts` now invalidates the correct `cms:v1:cache:*` namespace. Added `RedisService.delByPattern()` (cursor-based SCAN) to sweep paginated list variants that embed query strings, which `DEL` could never match (glob-as-literal no-op).
- **NL1 (Fixed)** — `createCampaign` now stores `contentHtml` run through `sanitizeArticleContent()` (`newsletter.service.ts`).
- **NL2 (Fixed)** — `POST /newsletter/webhook/events` now verifies HMAC-SHA256 signature from `x-webhook-signature` header using configurable `NEWSLETTER_WEBHOOK_SECRET`; dev (empty secret) stays open, all other envs reject missing/bad signatures.
- **D1 (Fixed)** — `GutenbergAdapterService` now runs both parse and serialize output through `sanitizeArticleContent()`.
- **J1/J2/J3 (Fixed)** — `JobsAdminService.getQueueSummaries` now derives real `p95ProcessingLatencyMs` (from `processedOn - timestamp` on the latest 200 completed jobs) and real `throughputPerMinute` (completed jobs finalized within 60s). `workersCount` now reflects actual declared worker concurrency (0 for queues with no live worker) instead of hardcoded placeholders.
- **J4 (Fixed)** — stack-trace sanitizer now also masks forward-slash Windows paths, `file:///` Windows URIs, and `/home|var|opt|srv|Users|workspace|data|app` prefixes.
- **NL4 (Fixed)** — Mongo newsletter + category search regexes now escape metacharacters (ReDoS / regex-injection).
- **N1 (Fixed)** — Postgres grouped-notification `actors_summary` update now capped to the latest 5 actors (matches Mongo `$slice:5`), via `jsonb_agg(... ) WITH ORDINALITY ... WHERE ord <= 5`.
- **CE2 (Fixed)** — RichTextEditor link insertion now rejects attribute-breaking characters (`" ' ` < >` and whitespace) and HTML-escapes the URL when building the `anchorHtml` string.
- **E2 (Fixed)** — `/embeds/scrape` and `/embeds/transcript` now rate-limited (`@Throttle` 30/min).

### Batch 2 — Redis, Notifications→BullMQ, Newsletter, Embeds, Documents (2026-09-09)

- **R2 (Fixed)** — Cache single-flight now coalesces the **origin query itself**: the first miss performs the DB read while concurrent waiters subscribe to the same promise (previously only the cache *read* was coalesced).
- **R3 (Fixed)** — SWR implemented: `@Cacheable(ttl, keyPrefix?, swrSeconds)` writes a generation-bumped envelope and returns stale data with `X-Cache: stale` while a background rehydrate runs; publishes also warm the cache.
- **R4 (Fixed)** — Version-aware invalidation is now real: `RedisService` maintains `cms:v1:gen:<base>` generation counters; published articles bump every related generation so paginated/list and detail keys are invalidated in O(1) without SCAN.
- **R5 (Fixed)** — Idempotency is now **fail-closed**: `checkAndSetIdempotency` returns `EXISTS` (deny duplicate) when Redis is unavailable, so a Redis outage prevents duplicate writes instead of encouraging them.
- **R6 (Fixed)** — `REDIS_PASSWORD` default changed from hardcoded `cms_dev_password` to `''` in `env.schema.ts`; service treats empty as no-auth.
- **R7 (Fixed)** — `acquireFencingLock`/`releaseFencingLock` are now called in `publisher.worker.ts` (Lua compare-and-del fencing token vs DB `last_fencing_token`), closing the double-publish race on the publish boundary.
- **Notifications → BullMQ outbox (High)** — the `notification-outbox` queue is now LIVE: `NotificationsService.enqueue()` schedules `DISPATCH_NOTIFICATION` jobs (stable jobId `notif:<userId>:<type>:<resourceId>:<actorId>`, attempts 5, exponential 2s backoff) and the new `notification-outbox.worker.ts` performs dedup/preferences/upsert/SSE publish asynchronously. All synchronous `.notify()` callers (workflow, follows, likes ×2, comments ×2, publisher ×2) now `.enqueue()` — retry + backoff restored, in-request latency removed.
- **N2 (Fixed)** — Unmapped `NotificationType` now **fail-closes** the preference check (notification suppressed instead of delivered).
- **N3 (Fixed)** — SSE `subscribe()` is now awaited with per-channel cleanup (Map of close-functions) and `JSON.parse` failures are logged instead of swallowed.
- **N4 (Fixed)** — `markAllAsRead` reconciles the Redis unread counter from the DB record count (not a blind `'0'`), removing the lost-INCR race.
- **N5 (Fixed)** — Notification messages no longer interpolate raw content; actor name falls back to `'A Reader'` / `'Editorial Desk'` instead of leaking `user.email` (PII).
- **P1 (High)** — New periodic `RECONCILE_SCHEDULED_PUBLISHERS` job (BullMQ 6 `upsertJobScheduler`, every 60s) repairs lost scheduled-publish enqueues and the workflow enqueue is wrapped in try/catch, closing the "DB set to SCHEDULED before job queued" integrity hole.
- **NL3 (Fixed)** — Verification token no longer returned in API responses; preference lookup returns a masked email instead of the raw address.
- **NL5 (Fixed)** — `sendCampaign` TOCTOU closed via `transitionCampaignStatus(id, from, to, updates)` CAS added to every newsletter repository (interface + Postgres + Mongo + Seamless); double-enqueue is rejected when the campaign is no longer in the expected state.
- **NL6 (Fixed)** — Email simulation is now explicit and gated by `NEWSLETTER_EMAIL_SIMULATED` (default `true`); when set to `false` the broadcast worker throws instead of silently "simulating" delivery.
- **E1 (Fixed)** — Twitter oEmbed `data.html` is now passed through `sanitizeArticleContent()` server-side before storage/return (removes stored-XSS surface).
- **E3 (Fixed)** — IPv4-mapped IPv6 addresses (`::ffff:a.b.c.d` and hex-octet forms) are decoded to a dotted quad before private-range checks; malformed mapped tails fail **closed** (treated as private).
- **D2 (Fixed)** — Import documents/jobs now persist to Redis (`job:import:<id>`, EX 24h) with async `getJob()` reading Redis when the in-memory entry is gone (survives restart).
- **D3 (Fixed)** — PDF ingestion now runs under per-page/per-job CPU budgets and yields to the event loop via `setImmediate` between pages, removing the synchronous request-path CPU block (cooperative, not `worker_threads`).
- **D4 (Fixed)** — Gutenberg `image`/`paragraph`/`heading` blocks now escape `alt`/`src`/`caption` (attribute + text context helpers) and `textAlign` is validated against an allowlist instead of injected raw.

### Batch 3 — Client Editor hardening (CE1, CE3–CE10) (2026-09-09)

- **CE1 (Fixed)** — The entire formatting backbone is migrated off `document.execCommand`/`document.queryCommandState`:
  - New `semanticFormatting.ts` engine implements `formatBlock` (h1–h6/p/blockquote/pre), inline bold/italic/underline/strike toggle, justification, bullet/numbered list toggle (incl. nested-list flatten + flavor switch), `removeFormat`, `insertHTML`, `createLink`/`unlink`, `insertImage`, and selection delete using pure Range/DOM manipulation.
  - `RichTextEditor.executeCommand`/`insertHtml` route through the engine with a snapshot undo/redo history (100-deep) replacing native `execCommand('undo'/'redo')`.
  - Ribbon + floating-toolbar active-state polling (`bold/italic/underline/strike/ul/ol/align`) now uses `queryInlineFormat`/`queryListState`/`queryAlignState` instead of `queryCommandState`.
- **CE3 (Fixed)** — All 12 `dangerouslySetInnerHTML` render sites now funnel through the client DOMPurify policy (`client/src/utils/sanitize.ts`): DocumentImportModal ×2, EditorialPatternsModal, ArticleEditorPage ×4, StoryTemplatesModal, ArticleReaderPage, RevisionHistoryModal, EditorialReviewPage, NewsletterManagerPage.
- **CE4 (Fixed)** — iframes now carry `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"`: enforced at generation time in `embedFormatter.ts` and re-armed by the DOMPurify policy on every render path.
- **CE5 (Verified)** — `Ctrl+1/2/3`/`Ctrl+Alt+1..3` already call `e.preventDefault()` before `formatBlock`, so browser tab-switching is suppressed; confirmed in current code (no change needed).
- **CE6 (Fixed)** — Ribbon `activeBlockType` now follows the caret: `RichTextEditor` listens to `selectionchange`/`keyup` and recomputes via `queryBlockType()` (H1→`h2` mapping preserved for the dropdown vocabulary).
- **CE7 (Fixed)** — `ImageResizerOverlay` registers drag listeners through a cleanup registry that is flushed on unmount, so no `window` listeners (or setState-after-unmount) can leak mid-drag.
- **CE8 (Fixed)** — `VideoPlayer` keyboard handler now ignores events originating inside `[contenteditable]` subtrees; `isFullscreen` is set only after the fullscreen promise resolves, with a `fullscreenchange` listener keeping the icon truthful on Esc-exit.
- **CE9 (Fixed)** — `MediaPickerModal` custom-URL path validates absolute http(s) URLs (URL constructor + protocol allowlist + no whitespace/quotes/angle brackets) with inline error state; the modal Escape handler stops immediate propagation to prevent a double-Escape cascade into the editor.
- **CE10 (Fixed)** — `editorialPatterns.ts` no longer evaluates `new Date()` at module load: the correction-notice pattern now exposes `renderContent()` (fresh timestamp at insert/preview time) via an optional `EditorialPattern.renderContent` hook.

### Batch 4 — PDF ingestion: real text, embedded images, hyperlinks (D5)

- **D5 (Fixed)** — PDF text ingestion replaced the raw-byte regex scan with real pdf-parse v2 (pdf.js) extraction (`extractPdfContent`):
  - **Text**: `getText({ lineEnforce, pageJoiner: '', parseHyperlinks })` decodes Flate/Predicted content streams correctly (the old regex either returned garbage mojibake or 150 empty pages on real exported PDFs, including Word→PDF / PDF→Word output).
  - **Scanned pages**: empty text layer now yields `isScanned: true` + an honest warning (`scannedPagesOcrApplied` reflects the real count — no fake OCR claims).
  - **Images**: `getImage({ imageThreshold: 0 })` extracts embedded images per page, deduped by SHA-256, capped at 100, persisted via `MediaService.uploadImage`, returned as `job.extractedImages` / `DocumentImportResult.extractedImages` (already rendered in the import modal's Extracted Media gallery). Upload failures degrade to a warning, never a job failure.
  - **Hyperlinks**: link annotations recovered via `getInfo({ parsePageInfo: true })` plus a bare-URL text scan, deduped per page (`allLinks` → `DocumentImportResult.links`, shown in the modal's Recovered Hyperlinks strip); `parseHyperlinks` renders annotations inline as `[text](url)` which `convertIRToSemanticHtml` converts to real `<a>` anchors (mirrors the docx pipeline's `formatInlineContent`).
  - **Videos — documented limitation**: PDF is a print format; Word→PDF/PDF→Word conversion discards videos entirely, and pdf.js cannot extract RichMedia annotations. Videos can therefore never be recovered from a PDF — import the original `.docx` if video must survive. No fake extraction is attempted.
- **New tests**: `pdf-ingestion.spec.ts` now 13 tests (magic-byte validation, happy path → IR + HTML, scanned-page honesty, annotation + bare-URL hyperlinks, image extraction with upload + dedup counts, graceful upload-failure degradation, encrypted-PDF → failed job, Redis `getJob` fallback).

**Verification:** server build clean, server tests **160/160 passing (21 suites)**, client `tsc --noEmit` clean (`npm run lint`).

### Batch 5 — Chat/export PDF heuristics + Office format gate

- **D6 (Fixed)** — "Random stuff" on ChatGPT/chat-export PDFs addressed at the heuristic layer:
  - **Running page headers** (`"Title | N"`, e.g. real repro `COFPS_Complete_Course_Notes.pdf`: `Certified Online Fraud Prevention Specialist (COFPS) - Complete Course Notes | 4`) are now detected once across the whole document (`detectRunningHeader`, normalizing the trailing page number, requiring the header to repeat on ≥2 pages) and stripped from every page before block building. Previously each header's `|` made the entire page a giant single-row pipe table (11 phantom tables in that 13-page file → **0**), and on other pages it became a fake heading `... | 6`.
  - Page furniture such as `1 / 2` is now stripped inside `reconstructPageLines` (it previously merged into running paragraphs).
  - Table detection no longer turns a single wide-gap line into a one-row table. A table now requires ≥2 consecutive rows sharing the same column-gap offsets (`tableGapPositions`/`sameTableSignature`), and `reconstructPageLines` stops merging lines that contain wide gaps (keeps aligned rows intact).
  - Regressions: justified chat prose → no phantom tables; aligned column tables → recovered; `1 / 2` furniture → skipped; repeated `Title | N` running headers → stripped (COFPS repro: `165/165`).
- **D7 (Fixed)** — `detectFormat` no longer misclassifies any ZIP-based Office file as `.docx`: the PK magic byte is now confirmed against `word/document.xml` presence, and `.pptx/.pptm/.potx/.xlsx/.xlsm/.ppt/.pps/.xls/.odt/.ods/.odp/.rtf` get a clear "save as .docx or .pdf" error instead of being fed to the docx parser.

**Verification:** server build clean, server tests **165/165 passing (21 suites)**, client `tsc --noEmit` clean (`npm run lint`).
Real-file repro: `COFPS_Complete_Course_Notes.pdf` (13 pages, clean text layer) went from 11 phantom tables + fake `| N` headings to 0 tables and clean paragraphs end-to-end.

### Outstanding (not yet in this pass)
- None from the numbered finding list. Two BullMQ queues (`mesh-reconciliation`, `analytics-rollup`) remain **intentionally dormant** — registered for jobs-admin inventory/dashboard but with no producer or consumer yet (planned infra, no security surface).

---

*Work log continues as fixes are applied.*
