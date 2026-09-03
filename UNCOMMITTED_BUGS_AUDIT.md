# Uncommitted Work — Bug Audit Report

**Date:** 2026-09-02
**Scope:** All uncommitted changes (12 modified files + 31 untracked files)
**Status:** Read-only analysis — no code changes made

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Bug Inventory](#bug-inventory)
3. [Smart Video Embeds — Analysis](#1-smart-video-embeds)
4. [Document Import Pipeline — Analysis](#2-document-import-pipeline)
5. [Video Upload & Streaming — Analysis](#3-video-upload--streaming)
6. [Newsletter Broadcast Engine — Analysis](#4-newsletter-broadcast-engine)
7. [RichTextEditor Enhancements — Analysis](#5-richtexteditor-enhancements)
8. [MediaPickerModal Redesign — Analysis](#6-mediapickermodal-redesign)
9. [shadcn UI Components — Analysis](#7-shadcn-ui-components)
10. [HomePage & ArticleReaderPage Changes — Analysis](#8-homepage--articlereaderpage-changes)
11. [Design System Compliance](#9-design-system-compliance)
12. [Server Test Verification](#10-server-test-verification)

---

## Executive Summary

The uncommitted work introduces four major feature systems (smart video embeds, document import pipeline, native video upload/streaming, newsletter broadcast engine), a custom HTML5 video player, 24 shadcn/ui components ported to the editorial design system, and significant enhancements to the rich text editor and media management flows.

**Overall quality is high.** Security posture is strong — SSRF defense is thorough, all document uploads go through magic-byte validation plus XSS sanitization, and video streaming has proper path traversal prevention. The newsletter engine has correct BullMQ batch partitioning and double opt-in flow.

**7 issues identified: 2 medium, 2 low, 3 informational.** No critical security vulnerabilities. No data loss risks.

---

## Bug Inventory

| # | Severity | File | Bug | Status |
|---|----------|------|-----|--------|
| 1 | **Medium** | `client/src/components/media/VideoPlayer.tsx` | Keyboard shortcuts fire when input/textarea is focused | Open |
| 2 | **Medium** | `client/src/components/media/VideoPlayer.tsx` | Missing `onEnded` handler — play overlay doesn't reappear after video finishes | Open |
| 3 | **Low** | `client/src/components/editor/RichTextEditor.tsx` | Native video `<figure>` uses Tailwind classes inside contentEditable — fragile if rendered outside Tailwind context | Open |
| 4 | **Low** | `client/src/components/editor/DocumentImportModal.tsx` | `stripStyles` regex fails on nested quotes in style attributes | Open |
| 5 | **Info** | `server/src/modules/newsletter/newsletter-broadcast.worker.ts` | Email sending is simulated (logs only, no actual SMTP/API call) | By design |
| 6 | **Info** | `server/src/modules/media/media.service.ts` | `uploadVideo` returns stream URL overriding disk URL — `media.url` inconsistency | By design |
| 7 | **Info** | `server/src/modules/media/media.controller.ts` | Video streaming endpoint is public (no auth) — intentional for HTML5 `<video>` elements | By design |

---

## 1. Smart Video Embeds

**Files:** `server/src/modules/embeds/` (6 files, ~1,100 lines total)

### Architecture

```
POST /embeds/scrape -> EmbedsController
                      -> EmbedsService.scrapeUrl()
                        -> Redis cache check (24h success, 2min negative)
                        -> single-flight coalescing (SET NX)
                        -> detectProvider(url)
                          -> resolveYouTube() / resolveVimeo() / resolveLoom()
                          -> resolveSpotify() / resolveTwitter() / resolveOpenGraph()
                        -> SSRF validation via safeFetch()
                          -> validateUrlSyntactics() (protocol, credentials, port)
                          -> resolveSafeIp() (DNS + all-address private IP check)
                          -> safeFetch() with 2MB byte limit, 3.5s timeout, 3-hop redirect re-validation
```

### File Breakdown

| File | Lines | Purpose |
|------|-------|---------|
| `embeds.controller.ts` | 23 | Single `POST /embeds/scrape` endpoint, JwtAuthGuard only |
| `embeds.module.ts` | 12 | Imports RedisModule, registers controller + service |
| `embeds.service.ts` | 528 | Core resolver: 6 providers, Redis caching, single-flight coalescing |
| `embeds.service.spec.ts` | 148 | SSRF IP validation tests, URL syntactic tests, provider-specific tests |
| `dto/embeds.dto.ts` | 47 | `ScrapeEmbedDto` (class-validator), `EmbedMetadataResponseDto` interface |
| `utils/ssrf-validator.util.ts` | 325 | Full SSRF defense: IP validation, DNS rebinding prevention, safe HTTP client |

### Quality Assessment

| Aspect | Rating | Detail |
|--------|--------|--------|
| SSRF defense | Excellent | Full IPv4/IPv6 private range coverage, DNS rebinding prevention via pre-flight all-address check, socket IP pinning, 2MB byte counting, 3.5s timeout, 3-hop redirect re-validation, Content-Type filtering |
| YouTube resolver | Excellent | Watch URL, Shorts URL, Embed URL normalization; 11-char video ID validation; timestamp offset parsing (seconds + `HhMmSs` format) |
| Redis caching | Good | 24h success TTL, 2min negative TTL, single-flight coalescing via `SET NX EX` |
| Error handling | Good | Each resolver catches failures and falls back to `buildFallbackMetadata()` |
| URL validation | Good | `validateUrlSyntactics()` rejects file/data/javascript URIs, embedded credentials, non-standard ports |

### SSRF Defense Details (ssrf-validator.util.ts)

**`isPrivateIp(ip)`** covers:
- Loopback: `127.0.0.0/8`, `::1`, `::`
- Private Class A: `10.0.0.0/8`
- Private Class B: `172.16.0.0/12`
- Private Class C: `192.168.0.0/16`
- Link-local: `169.254.0.0/16`, `fe80::/10`
- Carrier-grade NAT: `100.64.0.0/10`
- Benchmarking: `198.18.0.0/15`
- IPv6 ULA: `fc00::/7`

**`resolveSafeIp(hostname)`** performs DNS resolution then checks ALL resolved addresses — prevents DNS rebinding where first resolution returns public IP but second returns `127.0.0.1`.

**`safeFetch(targetUrl, options)`** enforces:
- Pre-flight DNS validation with IP pinning via custom `lookup`
- Stream-based byte counting (2MB default cap)
- Strict timeout (3.5s default)
- Recursive redirect re-validation (3 hops max)
- Content-Type filtering
- User-Agent header

### Provider Resolvers

| Provider | URL Patterns Handled | Method |
|----------|---------------------|--------|
| YouTube | `watch?v=`, `youtu.be/`, `/shorts/`, `/embed/`, `youtube.com/oembed` | 11-char video ID validation, timestamp parsing (`start=`, `t=1h2m3s`) |
| Vimeo | `vimeo.com/*`, `player.vimeo.com/video/*` | oEmbed fetch |
| Loom | `loom.com/share/*`, `loom.com/embed/*` | oEmbed fetch |
| Spotify | `open.spotify.com/track/*` | Transforms to embed URL, oEmbed for metadata |
| Twitter | `twitter.com/*`, `x.com/*` | publish.twitter.com oEmbed HTML embed |
| Generic | Any other URL | OpenGraph scraper: `og:title`, `og:description`, `og:image`, favicon |

### Issues Found

**None.** The embeds module is well-implemented with defense-in-depth SSRF protection.

---

## 2. Document Import Pipeline

**Files:** `server/src/modules/documents/` (4 files, ~460 lines total)

### Architecture

```
POST /documents/import -> DocumentImportController
                        -> FileInterceptor (25 MB limit)
                        -> DocumentImportService.importDocument()
                          -> detectFormat() (extension + magic-byte dual check)
                          -> parseDocx() / parseMarkdown() / parsePlainText() / parsePdf()
                          -> sanitizeArticleContent() (XSS whitelist)
                          -> compute analytics (word count, reading time, headings, paragraphs)
                        -> Returns DocumentImportResult (no DB persistence)
```

### File Breakdown

| File | Lines | Purpose |
|------|-------|---------|
| `documents.module.ts` | 20 | Imports MediaModule, registers controller + service |
| `document-import.controller.ts` | 41 | `POST /documents/import` with triple guard (JWT + CSRF + Permissions) |
| `document-import.service.ts` | 275 | Core: format detection, 4 parsers, XSS sanitization, analytics |
| `document-import.spec.ts` | 143 | 4 test cases: markdown, plaintext, format rejection, size limit |

### Quality Assessment

| Aspect | Rating | Detail |
|--------|--------|--------|
| Format detection | Excellent | Dual validation: file extension + magic-byte signature (ZIP header for DOCX, `%PDF` header for PDF) |
| DOCX parsing | Good | `mammoth` with custom style mappings (H1->h2, H2->h3, Quotes->blockquotes). Extracts embedded images via synthetic `Multer.File` upload through `MediaService` |
| Markdown parsing | Good | `markdown-it` with HTML/linkify/typographer options |
| PDF parsing | Moderate | `pdf-parse` with heuristic: all-caps short lines become `<h2>`. Complex multi-column layouts won't work (documented with warning) |
| XSS sanitization | Good | Whitelist tags, strips `javascript:`/`vbscript:`, auto-adds `noopener noreferrer` to external links |
| Tests | Good | 4 test cases: markdown parsing, plaintext parsing, format rejection, size limit |

### Parser Details

**DOCX (mammoth):**
- Style mappings: `Heading 1` -> `h2`, `Heading 2` -> `h3`, `Heading 3` -> `h4`, `Intense Quote`/`Quote` -> `blockquote`
- Embedded images: extracted via `mammoth.images.imgElement()`, uploaded to disk through `MediaService.uploadImage()`, URLs replaced in output HTML

**Markdown (markdown-it):**
- Options: `html: true`, `linkify: true`, `typographer: true`
- Renders standard GFM: headings, bold, italic, lists, code blocks, links, images

**Plain Text:**
- Double-newline paragraph splitting
- `*`/`-` prefixed lines detected as bullet lists
- Single newlines within paragraphs converted to `<br>`

**PDF (pdf-parse):**
- Heuristic layout engine: lines shorter than 60 chars, longer than 3 chars, all-uppercase, not ending with `.` -> `<h2>` section headers
- Other lines accumulated into `<p>` paragraphs
- Warning emitted: "PDF layout extraction uses text heuristics"

### Security: XSS Sanitization (sanitizeArticleContent)

Allowed tags: `h1`, `h2`, `h3`, `h4`, `p`, `blockquote`, `pre`, `code`, `ul`, `ol`, `li`, `a`, `img`, `strong`, `em`, `s`, `br`, `hr`, `figure`, `figcaption`

Allowed attributes:
- `a`: `href`, `target`, `rel`, `title`
- `img`: `src`, `alt`, `title`, `width`, `height`, `loading`
- `code`/`pre`: `class`

Transform rules:
- `javascript:`, `vbscript:`, `data:` schemes stripped from `<a href>`
- External links auto-get `rel="noopener noreferrer"` and `target="_blank"`
- Allowed schemes: `http`, `https`, `mailto`, `tel` (anchors); `http`, `https`, `data` (images)

### Issues Found

#### Bug #4 — Low: `stripStyles` regex fragile with nested quotes

**File:** `client/src/components/editor/DocumentImportModal.tsx`
**Location:** Style-stripping logic in `handleConfirmImport`

The regex `/style="[^"]*"/gi` to strip inline `style="..."` attributes from imported HTML will break on values containing escaped or nested double quotes, e.g.:

```html
<div style="background: url(&quot;image.png&quot;)">
```

The `[^"]*` capture stops at the first `"` it encounters, which may be the inner quote rather than the closing attribute quote, causing incomplete stripping or malformed HTML.

**Impact:** Low — only affects documents with complex inline styles containing quoted strings. Most DOCX-to-HTML output from `mammoth` doesn't produce nested quotes.

**Fix approach:** Use a more robust pattern like `style="(?:[^"\\]|\\.)*"` or DOM-based attribute removal.

---

#### Info: `pdf-parse` CommonJS import

**File:** `server/src/modules/documents/document-import.service.ts:5`
**Code:** `const pdfParse = require('pdf-parse');`

CommonJS `require` in a TypeScript module. Works but fragile if the package shifts to ESM-only exports in a future version. No runtime impact currently.

---

#### Info: DOCX image extraction synthetic Multer.File

**File:** `server/src/modules/documents/document-import.service.ts:147-160`

The `fakeMulterFile` object sets `stream: null as any`. If `MediaService.uploadImage` ever accesses `file.stream`, it will crash. Current implementation doesn't use `.stream`, so no runtime bug, but fragile for future changes.

---

#### Info: No document persistence

The module is a stateless converter — parsed HTML is returned to the client and must be pasted into an article editor. No database tables, no repository layer. This is by design but worth documenting for future contributors.

---

## 3. Video Upload & Streaming

### Server-side

**Files:** `server/src/modules/media/media.service.ts` (249 lines), `media.controller.ts` (136 lines), `utils/video-validator.util.ts` (90 lines)

#### New Endpoints

| Endpoint | Auth | Limit | Purpose |
|----------|------|-------|---------|
| `POST /media/video/upload` | JWT + CSRF + `MEDIA_UPLOAD` | 100 MB | Upload video (MP4/WebM/MOV), magic-byte validation, returns media with stream URL |
| `GET /media/stream/:mediaId` | None (public) | N/A | HTTP 206 byte-range streaming for HTML5 `<video>` elements |
| `POST /media/upload` | JWT + CSRF + `MEDIA_UPLOAD` | 5 MB | Existing image upload (unchanged) |
| `GET /media` | JWT + CSRF | N/A | Added `scope` query param (`own`/`all`) |
| `DELETE /media/:id` | JWT + CSRF + `MEDIA_DELETE_OWN` | N/A | Unchanged |

#### Quality Assessment

| Aspect | Rating | Detail |
|--------|--------|--------|
| Magic byte validation | Good | MP4 (`ftyp` brand), WebM (`1A 45 DF A3` EBML header), MOV (`ftypqt` / `moov` / `mdat`) |
| HTTP 206 streaming | Good | Range header parsing, `Content-Range` response, `Accept-Ranges: bytes`, ETag, `Cache-Control: immutable` |
| Upload limits | Good | 100 MB both Multer interceptor and service-side check |
| Path traversal prevention | Good | `path.basename()` on stored filename before joining with upload directory |
| Audit logging | Good | `MEDIA_UPLOADED` event with `isVideo: true` flag and file metadata |
| Tests | Good | 9 test cases covering magic bytes (MP4, WebM, MOV, invalid, short buffer) + range parsing (standard, open-ended, tail, out-of-bounds, malformed) |

#### Video Format Detection Details (video-validator.util.ts)

```
validateVideoMagicBytes(buffer):
  1. WebM: bytes[0-3] == 0x1A 0x45 0xDF 0xA3 (EBML header magic)
  2. MP4: bytes[4-7] == "ftyp", brand[8-11] not containing "qt"
  3. MOV: bytes[4-7] == "ftyp" with brand containing "qt",
     OR bytes[4-7] in ["moov", "mdat", "wide"] (alternative atom check)
  4. Minimum buffer size: 12 bytes
```

#### HTTP Range Parser Details (video-validator.util.ts)

```
parseRangeHeader(rangeHeader, fileSize):
  - "bytes=0-1023"     -> start=0, end=1023, chunkSize=1024
  - "bytes=1048576-"   -> start=1048576, end=fileSize-1
  - "bytes=-500"       -> start=fileSize-500, end=fileSize-1 (tail range)
  - null/missing       -> returns null (full response)
  - Out of bounds      -> throws BadRequestException
  - End clamped to fileSize-1
```

#### Media Service Changes

**`uploadVideo()`** — New method:
- 100 MB hard limit (Multer + service-side)
- Magic-byte validation via `validateVideoMagicBytes()`
- Random filename: `video-{uuid}.{format}`
- Saves to disk, creates DB record
- Returns media with `url` set to `/api/media/stream/{id}` (stream URL, not disk URL)
- Audit log with `isVideo: true`

**`getMediaStreamInfo()`** — New method:
- Looks up media by ID
- Sanitizes filename via `path.basename()` (path traversal prevention)
- Checks file exists on disk
- Parses range header
- Returns file path, size, MIME type, and range info

**`listMedia()`** — Modified:
- New `forceOwn` parameter: when `true`, admins/editors see only their own uploads
- Used by `GET /media?scope=own` for the media picker

**`media.controller.ts`** — Modified:
- Guards moved from class-level to per-route (needed because `GET /stream/:mediaId` is unauthenticated)
- Added `@Headers('range')` parameter to stream endpoint

### Client-side

**Files:** `client/src/components/editor/VideoUploadModal.tsx` (354 lines), `client/src/components/media/VideoPlayer.tsx` (378 lines)

#### VideoUploadModal.tsx

Two-tab modal for uploading and inserting self-hosted video:

**Upload Tab:**
- Drag-and-drop or file input for `.mp4`/`.webm`/`.mov` (max 100 MB)
- Upload progress bar via `Progress` component
- Uploads to `POST /media/video/upload` via `apiClient.post` with `onUploadProgress` tracking
- Constructs stream URL from response

**Media Library Tab:**
- Fetches existing videos from `GET /media?limit=50`
- Filters by MIME type (`video/*`)
- Grid display of selectable video assets

**Settings Panel:**
- Width alignment buttons: standard / wide / full
- Autoplay toggle
- Loop toggle
- Optional caption input

#### VideoPlayer.tsx — Custom HTML5 Player

Full-featured player component with:

| Feature | Implementation |
|---------|---------------|
| Play/Pause | Toggle via button or Space/K key |
| Seek | Slider component + click-to-seek |
| Volume | Slider (0-100 mapped to 0-1), auto-mute at 0 |
| Mute | Toggle, restores to 0.8 if unmuting at 0 |
| Playback Speed | Dropdown: 0.75x, 1x (Normal), 1.25x, 1.5x, 2x |
| Picture-in-Picture | Browser PiP API toggle |
| Fullscreen | Container element fullscreen toggle |
| Auto-hide Controls | 3-second inactivity timer during playback |
| Keyboard Shortcuts | Space/K (play), Left/Right (seek +-5s), M (mute), F (fullscreen) |
| Title Overlay | Gradient bar with video title and "Native Stream" badge |

### Issues Found

#### Bug #1 — Medium: Keyboard shortcuts fire when input/textarea is focused

**File:** `client/src/components/media/VideoPlayer.tsx`
**Location:** `handleKeyDown` function (lines ~176-193)

The container `div` attaches `onKeyDown={handleKeyDown}` which handles `Space`/`K` (toggle play), `Arrow Left/Right` (seek), `M` (mute), `F` (fullscreen). These fire regardless of which element inside the container has focus.

**Scenario:** A user is typing in a comment `<textarea>` or any `<input>` that happens to be rendered inside or near the video player container. Pressing `Space` to type a space character will instead toggle video play/pause.

**Impact:** Medium — breaks text input interaction in any context where inputs coexist with the video player (e.g., article editor with embedded video, reader page comments below a video).

**Fix approach:** Guard the handler with a check for the active element:

```typescript
const handleKeyDown = (e: React.KeyboardEvent) => {
  const tag = (e.target as HTMLElement).tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
  // ... existing logic
};
```

---

#### Bug #2 — Medium: Missing `onEnded` handler — play overlay doesn't reappear

**File:** `client/src/components/media/VideoPlayer.tsx`
**Location:** `<video>` element event handlers (lines ~224-235)

The `<video>` element binds `onPlay`, `onPause`, `onTimeUpdate`, and `onLoadedMetadata`, but does not bind `onEnded`. When the video finishes playing:

1. The browser fires the `ended` event
2. `isPlaying` remains `true` (set by the last `onPlay`)
3. The center play-button overlay (shown when `!isPlaying`) never reappears
4. The user must seek backward manually to replay

**Impact:** Medium — poor UX for video content. Users expect the play button to reappear at the end of a video.

**Fix approach:** Add `onEnded` handler to the `<video>` element:

```typescript
onEnded={() => {
  setIsPlaying(false);
  setShowControls(true);
}}
```

---

#### Bug #3 — Low: Native video `<figure>` uses Tailwind classes in contentEditable

**File:** `client/src/components/editor/RichTextEditor.tsx`
**Location:** `handleNativeVideoInsert` function

The function builds HTML like:

```html
<figure class="relative group my-8 mx-auto max-w-3xl">
  <div class="relative aspect-video rounded-sm overflow-hidden border border-border-subtle">
    <video class="w-full h-full object-cover" ...>
  </div>
  <figcaption class="mt-2 text-xs font-sans text-ink-secondary">...</figcaption>
</figure>
```

These are Tailwind utility classes. If the article content is ever rendered in a context where Tailwind isn't compiled (e.g., email templates, RSS feeds, third-party embeds), the video will have no styling — no aspect ratio, no border, no rounded corners.

**Impact:** Low — all current rendering contexts (ArticleReaderPage, HomePage, admin pages) use Tailwind. But the stored HTML is fragile for future non-Tailwind consumers.

**Fix approach:** Use inline styles or CSS custom properties for the critical layout rules (`aspect-ratio`, `border-radius`, `max-width`), keeping Tailwind classes as progressive enhancement.

---

## 4. Newsletter Broadcast Engine

**Files:** `server/src/modules/newsletter/` (5 files, ~1,100 lines total)

### Architecture

```
POST /newsletter/subscribe -> NewsletterService.subscribe()
                              -> SHA-256 token hash (48h TTL)
                              -> BullMQ job: DISPATCH_NEWSLETTER_VERIFICATION

GET /newsletter/verify/:token -> NewsletterService.verify()
                                -> Token hash match, expiration check, subscriber activation

GET /newsletter/preferences/:token -> NewsletterService.getPreferencesByToken()

PATCH /newsletter/preferences/:token -> NewsletterService.updatePreferencesByToken()

POST /newsletter/webhook/events -> NewsletterService.handleWebhookEvent()
                                   -> Bounce/complaint processing

GET/POST /admin/newsletter/* -> Campaign + subscriber management
```

### File Breakdown

| File | Lines | Purpose |
|------|-------|---------|
| `newsletter.module.ts` | 42 | Imports DatabaseModule, BullQueueModule, AuditModule, Mongoose |
| `newsletter.controller.ts` | 120 | Public subscriber endpoints + admin campaign management |
| `newsletter.service.ts` | 419 | Core logic: subscribe, verify, campaigns, broadcast, webhooks |
| `newsletter-broadcast.worker.ts` | 119 | BullMQ worker for verification emails + broadcast batches |
| `newsletter.service.spec.ts` | 412 | Comprehensive test suite |

### Quality Assessment

| Aspect | Rating | Detail |
|--------|--------|--------|
| Double opt-in | Good | SHA-256 token hash, 48h TTL, BullMQ job for verification email |
| Campaign broadcast | Good | 50-subscriber batches, per-batch idempotency keys via `singletonKey` |
| Suppression check | Good | Worker re-checks subscriber `status === ACTIVE` before each delivery |
| Campaign metrics | Good | Tracks `deliveredCount`, `failedCount`, transitions `SENDING` -> `SENT` when complete |
| Preferences | Good | Unsubscribe-all capability via capability token, topic-based preferences |
| Webhook handler | Good | Bounce count increment, auto-suppression |
| Tests | Good | 412 lines covering subscribe, verify, preferences, campaign send, webhooks |

### Flow Details

**Subscribe Flow:**
1. User submits email + optional topics via `POST /newsletter/subscribe`
2. Service generates random token, hashes it with SHA-256
3. Stores subscriber record with `PENDING` status, `tokenHash`, `tokenExpiresAt` (48h)
4. Enqueues `DISPATCH_NEWSLETTER_VERIFICATION` job with raw token
5. Returns `{ message, subscriberId, verificationToken }`

**Verification Flow:**
1. User clicks verification link with raw token
2. Service hashes token, queries subscriber by `tokenHash`
3. Checks expiration, activates subscriber (`ACTIVE` status)
4. Returns success

**Campaign Broadcast Flow:**
1. Admin creates campaign via `POST /admin/newsletter/campaigns`
2. Admin triggers send via `POST /admin/newsletter/campaigns/:id/send`
3. Service queries all `ACTIVE` subscribers
4. Partitions into batches of 50
5. Enqueues one `DISPATCH_NEWSLETTER_BATCH` job per batch with `singletonKey` for idempotency
6. Worker processes each batch: checks subscriber status, increments delivery count
7. Worker updates campaign metrics after each batch
8. When `deliveredCount + failedCount >= totalRecipients`, campaign status -> `SENT`

### Issues Found

#### Bug #5 — Info: Email sending is simulated

**File:** `server/src/modules/newsletter/newsletter-broadcast.worker.ts`

Both `processVerificationEmail` and `processBroadcastBatch` only log messages — no actual email dispatch via SMTP, SendGrid, SES, or any email API. The delivery count metrics (`deliveredCount`, `failedCount`) reflect simulated outcomes, not real delivery status.

**Impact:** Info — this is clearly intentional for the current development phase. The BullMQ infrastructure and campaign lifecycle management are correctly implemented; only the final email transport layer is stubbed.

**Future work:** Integrate an email provider (e.g., `@nestjs-modules/mailer` with SMTP, or SendGrid/SES SDK) in the worker methods.

---

#### Info: Campaign re-run idempotency window

**File:** `server/src/modules/newsletter/newsletter.service.ts`

`sendCampaign` uses `singletonKey: BULLMQ_IDEMPOTENCY_PREFIX + campaignId` with `removeOnComplete: 500`. Old completed jobs are retained (count-based, not time-based), potentially blocking campaign re-runs for hours depending on throughput.

**Fix approach (future):** Consider `removeOnComplete: { age: 3600 }` (time-based cleanup) or explicit job removal before re-dispatch.

---

## 5. RichTextEditor Enhancements

**File:** `client/src/components/editor/RichTextEditor.tsx` (347 lines)

### Changes Made

- Added `VideoUploadModal` and `DocumentImportModal` imports and state management
- Added `handleNativeVideoInsert(videoData)` — builds `<figure><video>` HTML with width classes, autoplay/loop attributes, poster, and optional `<figcaption>`
- Added `handleDocumentImported(htmlContent, title?)` — inserts sanitized HTML via `insertHTML`
- Added toolbar buttons: Film icon (video upload), FileText icon (document import)
- Existing toolbar: H2, H3, Bold, Italic, Underline, Strikethrough, Code Block, Blockquote, Bullet/Numbered List, Link, Image, Rich Embed, Clear Formatting, Undo/Redo

### Toolbar Button Inventory

| Button | Icon | Action |
|--------|------|--------|
| H2 | N/A | Wraps selection in `<h2>` |
| H3 | N/A | Wraps selection in `<h3>` |
| Bold | N/A | `Ctrl+B` / `execCommand('bold')` |
| Italic | N/A | `Ctrl+I` / `execCommand('italic')` |
| Underline | N/A | `Ctrl+U` / `execCommand('underline')` |
| Strikethrough | N/A | `execCommand('strikeThrough')` |
| Code Block | N/A | Wraps in `<pre><code>` |
| Blockquote | N/A | Wraps in `<blockquote>` |
| Bullet List | N/A | `execCommand('insertUnorderedList')` |
| Numbered List | N/A | `execCommand('insertOrderedList')` |
| Link | N/A | Prompts URL, wraps selection in `<a>` |
| Image | N/A | Opens MediaPickerModal |
| **Video** | Film | Opens VideoUploadModal (NEW) |
| **Document Import** | FileText | Opens DocumentImportModal (NEW) |
| Rich Embed | N/A | Opens RichEmbedModal |
| Clear Formatting | N/A | `execCommand('removeFormat')` |
| Undo | N/A | `Ctrl+Z` / `execCommand('undo')` |
| Redo | N/A | `Ctrl+Shift+Z` / `execCommand('redo')` |

### Paste Handling

The editor detects pasted URLs and auto-embeds them:
1. Paste event captured
2. URL extracted from clipboard text
3. `detectEmbedInfo(url)` checks if URL is embeddable (YouTube, Vimeo, etc.)
4. If embeddable: calls `embedsApi.scrape(url)` to fetch metadata
5. Inserts rich embed HTML (iframe or card)
6. Falls back to manual metadata construction on scrape failure

### Issues Found

Bug #3 (Tailwind classes in contentEditable video HTML) is documented in the Video Upload & Streaming section above.

No other issues found. The editor integration is clean.

---

## 6. MediaPickerModal Redesign

**File:** `client/src/components/editor/MediaPickerModal.tsx` (370 lines)

### Changes Made

- Replaced `window.confirm` delete flow with inline confirmation UI (Yes/No buttons with loading spinner)
- Added `scope: 'own'` parameter to `listMediaAssets()` call
- Three tabs: Asset Library (grid), Upload New (drag-and-drop), Cloudinary/Web URL

### Tab Breakdown

**Tab 1: Asset Library**
- Fetches user's media via `listMediaAssets(1, 40, 'own')`
- Responsive grid (2/3/4 columns based on breakpoint)
- Each card shows: image thumbnail, filename, file size
- Click to select and insert
- Inline delete with two-step confirmation (Delete? Yes/No)
- Loading state during deletion

**Tab 2: Upload New File**
- Drag-and-drop area for image upload
- Accepted: PNG, JPEG, WebP, AVIF, GIF (max 5 MB)
- Calls `uploadMediaAsset()`, auto-inserts and closes on success

**Tab 3: Cloudinary/Web URL**
- URL input field with live image preview
- Error handling for broken URLs (shows "Invalid image URL" state)
- "Apply Image URL" button to insert

### Delete Flow (Before vs After)

**Before:**
```
User clicks Delete -> window.confirm("Are you sure?") -> If OK, delete
```

**After:**
```
User clicks Delete -> Inline "Delete? Yes / No" buttons appear ->
  -> User clicks "Yes" -> Loading spinner on "Deleting..." ->
  -> Success: item removed from grid
  -> User clicks "No" -> Inline UI disappears
```

### Issues Found

None. The inline confirmation with loading state is a clear UX improvement over `window.confirm`. The scoped media listing is correct.

---

## 7. shadcn UI Components

**Directory:** `client/src/components/ui/` (24 files)

### Component Inventory

| Component | Radix Primitive | Lines | Key Design Decisions |
|-----------|----------------|-------|---------------------|
| `dialog.tsx` | `@radix-ui/react-dialog` | 116 | `backdrop-blur-xs` overlay, zoom+slide animations, `font-editorial` title |
| `button.tsx` | `@radix-ui/react-slot` | 49 | `editorial` variant (`bg-zinc-900 text-white`), CVA-based |
| `tabs.tsx` | `@radix-ui/react-tabs` | 52 | `font-mono text-xs` triggers, `shadow-xs` active state |
| `scroll-area.tsx` | `@radix-ui/react-scroll-area` | 45 | `rounded-full bg-slate-300` thumb |
| `progress.tsx` | `@radix-ui/react-progress` | 25 | `bg-accent-crimson` indicator |
| `badge.tsx` | CVA | 32 | `draft`/`pending`/`published` status variants |
| `separator.tsx` | `@radix-ui/react-separator` | 23 | Minimal, `bg-border` |
| `tooltip.tsx` | `@radix-ui/react-tooltip` | 25 | `bg-slate-900` dark, `font-mono text-[11px]` |
| `popover.tsx` | `@radix-ui/react-popover` | 28 | `w-72`, `rounded-sm`, zoom+slide |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | 175 | `text-accent-crimson` check indicators, `font-mono text-[11px]` labels |
| `select.tsx` | `@radix-ui/react-select` | 148 | `h-8` trigger, `max-h-96` content |
| `checkbox.tsx` | `@radix-ui/react-checkbox` | 27 | `bg-accent-crimson` checked state |
| `label.tsx` | `@radix-ui/react-label` | 18 | `peer-disabled` support |
| `input.tsx` | native | 21 | `h-9`, `rounded-md`, `border-input` |
| `textarea.tsx` | native | 23 | `min-h-[80px]`, `rounded-xs`, `text-xs` |
| `switch.tsx` | `@radix-ui/react-switch` | 26 | `bg-accent-crimson` checked, `bg-slate-200` unchecked |
| `avatar.tsx` | `@radix-ui/react-avatar` | 47 | `rounded-full`, `font-mono font-bold` fallback |
| `alert.tsx` | CVA | 62 | `destructive`/`warning`/`success` variants |
| `alert-dialog.tsx` | `@radix-ui/react-alert-dialog` | N/A | Confirmation dialogs |
| `card.tsx` | native | N/A | Card layout container |
| `radio-group.tsx` | `@radix-ui/react-radio-group` | N/A | Radio selection |
| `skeleton.tsx` | native | N/A | Loading skeleton |
| `slider.tsx` | `@radix-ui/react-slider` | N/A | Range slider (used in VideoPlayer) |
| `table.tsx` | native | N/A | Data table layout |

### Design Token Usage

All 24 components use the project's custom Tailwind design tokens consistently:

- **Colors:** `ink-primary` (near-black), `ink-secondary` (muted gray), `accent-crimson` (red), `canvas-paper` (off-white), `border-subtle` (light border)
- **Typography:** `font-serif` (editorial headings), `font-sans` (body), `font-mono` (labels/metadata), `font-editorial` (page titles)
- **Borders:** `rounded-sm` or `rounded-xs` (2px), minimal border-radius throughout
- **Spacing:** Compact, editorial design language with tight spacing, uppercase tracking-wider labels, fine text sizes (text-[10px] to text-[13px])

### Issues Found

None. All components are standard shadcn/ui ports with consistent design token application.

---

## 8. HomePage & ArticleReaderPage Changes

### HomePage.tsx (578 lines)

**Changes:**
- Extracted `Col1Card` as a reusable component with proper `imgErr` fallback (BookOpen icon placeholder instead of broken image)
- The rest of the page structure is unchanged: hero grid, story strip, feed + sidebar, newsletter subscription

**Assessment:** Clean refactor. The `Col1Card` extraction reduces duplication and the image error handling is more graceful.

### ArticleReaderPage.tsx (649 lines)

**Changes:**
- Replaced broken-image fallback (hardcoded unsplash URL) with graceful "Cover image unavailable" placeholder using `coverImgErr` state
- Removed hardcoded `figcaption` from cover image

**Assessment:** Clean improvements. The unsplash fallback was misleading (showing unrelated images when the actual cover failed to load). The new approach is honest — shows a placeholder with descriptive text.

---

## 9. Design System Compliance

### Token Mapping

| Token | Value | Usage |
|-------|-------|-------|
| `ink-primary` | Near-black (#0f172a equivalent) | Headings, primary text |
| `ink-secondary` | Muted gray | Metadata, secondary text |
| `accent-crimson` | Red | CTAs, active states, progress bars, checkboxes, switches |
| `canvas-paper` | Off-white | Page backgrounds |
| `border-subtle` | Light border | Dividers, card borders, input borders |
| `font-serif` | Editorial serif | Article headings, card titles |
| `font-sans` | System sans-serif | Body text, paragraphs |
| `font-mono` | Monospace | Labels, metadata, badges, timestamps |
| `font-editorial` | Display serif | Page titles, dialog titles |
| `rounded-sm` | 2px radius | Cards, dialogs, dropdowns |
| `rounded-xs` | 1px radius | Tabs, badges, checkboxes |

### Compliance Score

All new components and pages follow the design system. No instances of:
- Generic Tailwind colors (e.g., `text-gray-500` instead of `text-ink-secondary`)
- Wrong font families (e.g., `font-sans` on headings)
- Large border radius (e.g., `rounded-lg`, `rounded-xl`)
- AI-generated placeholder text or lorem ipsum

---

## 10. Server Test Verification

### Test Results

```
Test Suites: 16 passed, 16 total
Tests:       103 passed, 103 total
```

### New Test Files

| File | Tests | Coverage |
|------|-------|----------|
| `media-stream.spec.ts` | 9 | Magic bytes (MP4, WebM, MOV, invalid, short buffer) + range parsing (standard, open-ended, tail, out-of-bounds, malformed) |
| `document-import.spec.ts` | 4 | Markdown parsing, plaintext parsing, format rejection, size limit |
| `newsletter.service.spec.ts` | ~15 | Subscribe, verify, preferences, campaign send, webhooks |
| `embeds.service.spec.ts` | ~10 | SSRF IP validation, URL syntactics, provider-specific resolvers |

### Typecheck

Client-side TypeScript compilation: **Clean** (exit 0, no errors)

---

## Appendix: Complete File Inventory

### Modified Tracked Files (12)

| File | Changes |
|------|---------|
| `client/package.json` | Added 14 Radix UI dependencies |
| `client/src/api/media.api.ts` | Added `scope` parameter to `listMediaAssets()` |
| `client/src/components/editor/MediaPickerModal.tsx` | Inline delete confirmation, scoped media listing |
| `client/src/components/editor/RichTextEditor.tsx` | Video upload + document import toolbar buttons + handlers |
| `client/src/pages/ArticleReaderPage.tsx` | Graceful cover image error handling |
| `client/src/pages/HomePage.tsx` | Extracted `Col1Card` component, image error fallback |
| `package-lock.json` | Dependency lock file updated |
| `server/package.json` | Added mammoth, markdown-it, pdf-parse, remark dependencies |
| `server/src/app.module.ts` | Registered DocumentsModule |
| `server/src/common/utils/sanitizer.util.ts` | Added `h1` to allowed tags |
| `server/src/modules/media/media.controller.ts` | Video upload + streaming endpoints, per-route guards |
| `server/src/modules/media/media.service.ts` | Video upload + streaming, forceOwn list filter |

### New Untracked Files (31)

| File | Purpose |
|------|---------|
| `DOCUMENT_IMPORT_PIPELINE_SPEC.md` | Feature specification |
| `NATIVE_VIDEO_STREAMING_SPEC.md` | Feature specification |
| `client/src/api/documents.api.ts` | Document import API client |
| `client/src/components/editor/DocumentImportModal.tsx` | Import modal with preview |
| `client/src/components/editor/VideoUploadModal.tsx` | Video upload modal |
| `client/src/components/media/VideoPlayer.tsx` | Custom HTML5 video player |
| `client/src/components/ui/*.tsx` (24 files) | shadcn/ui component library |
| `server/src/modules/documents/` (4 files) | Document import module |
| `server/src/modules/media/media-stream.spec.ts` | Video streaming tests |
| `server/src/modules/media/utils/video-validator.util.ts` | Magic bytes + range parser |
| `document_2/DOCUMENT_IMPORT_PIPELINE_SPEC.md` | Duplicate spec (draft?) |
| `document_2/NATIVE_VIDEO_STREAMING_SPEC.md` | Duplicate spec (draft?) |
| `implemented/upload in editor.md` | Implementation notes |
