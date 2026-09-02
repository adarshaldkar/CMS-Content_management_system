# Implementation Plan: Smart Video, Rich Embeds & OpenGraph Scraping Engine

Implement a secure, multi-provider media ingestion, OpenGraph/oEmbed scraping, and rich embed rendering subsystem for The Gazette.

## User Review Required

> [!IMPORTANT]
> - **Anti-SSRF Gatekeeper**: All outbound requests resolve DNS first, pin the safe IP, validate redirects against the private IP blacklist (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.169.254`, `::1`), and destroy streams exceeding 2MB.
> - **Content Security Policy**: `server/src/main.ts` will allow `youtube-nocookie.com`, `player.vimeo.com`, `loom.com`, `open.spotify.com`, and `platform.twitter.com` in `frame-src`.
> - **Editorial Reproducibility**: Metadata is snapshotted into article blocks at write time so reader requests never depend on live external APIs.

---

## Proposed Changes

### Backend Subsystem (`server/src/modules/embeds/`)

#### [NEW] `embeds.dto.ts`
- `ScrapeEmbedDto` (`@IsUrl()`, `@MaxLength(2048)`).
- `EmbedMetadataResponseDto`.

#### [NEW] `ssrf-validator.util.ts`
- IP range blacklist checking function.
- DNS lookup and IP pinning fetch wrapper.
- Redirect hop validator (max 3 redirects).
- Stream chunk counter (2MB limit) and Content-Type validator (`text/html`, `application/json`).

#### [NEW] `embeds.service.ts`
- Single-flight request coalescing to prevent duplicate concurrent fetches.
- Redis caching with **24-hour TTL** for success and **2-minute negative TTL** for failures.
- Dedicated provider resolvers:
  - **YouTube**: Regex ID/start time + `https://www.youtube.com/oembed`.
  - **Vimeo**: `https://vimeo.com/api/oembed.json`.
  - **Loom**: `https://www.loom.com/v1/oembed` + direct embed builder.
  - **Spotify**: `https://open.spotify.com/oembed` + compact track/episode player builder.
  - **Twitter/X**: `https://publish.twitter.com/oembed`.
  - **Generic URLs**: OpenGraph HTML parser (`og:title`, `og:description`, `og:image`, `og:site_name`, favicon).
- `DOMPurify` / string sanitization.

#### [NEW] `embeds.controller.ts`
- `POST /api/embeds/scrape` guarded by `JwtAuthGuard`.

#### [NEW] `embeds.module.ts`
- Registered in `server/src/app.module.ts`.

#### [MODIFY] `server/src/main.ts`
- Update helmet Content Security Policy `frame-src` and `media-src`.

#### [NEW] `embeds.service.spec.ts`
- Comprehensive unit tests covering SSRF blocking, redirect re-validation, size limits, and Redis caching.

---

### Frontend Subsystem (`client/src/`)

#### [NEW] `client/src/utils/embedParser.ts`
- Fast client-side regex parser for YouTube, Vimeo, Loom, Spotify, Twitter/X.

#### [NEW] `client/src/api/embeds.api.ts`
- `embedsApi.scrape(url)` client.

#### [NEW] `client/src/components/editor/RichEmbedModal.tsx`
- Modal dialog with real-time URL detection badge, live preview, and display mode selection.

#### [MODIFY] `client/src/pages/ArticleEditorPage.tsx`
- Instant clipboard paste auto-detection (converts empty block to rich embed card).
- Display mode switcher: `[ Interactive Embed ] | [ Rich Link Card ] | [ Plain Link ]`.
- Width controls (`standard`, `wide`, `full`), editable captions, and metadata refresh button.

#### [MODIFY] `client/src/pages/ArticleReaderPage.tsx`
- Responsive 16:9 `aspect-video` iframe rendering with `youtube-nocookie.com` and `loading="lazy"`.
- Rich bookmark card rendering for generic URLs.
- Graceful offline / unavailable fallback card (`[ ↗ Open Original Source ]`).

---

## Verification Plan

### Automated Tests
- `npm test -- src/modules/embeds` in `server/` (SSRF checks, redirect re-validation, cache single-flight).
- Full test suite: `npm test` across all 18 backend test suites.
- Production builds: `npm run build` in both `server/` and `client/`.

### Manual / Browser Verification
- Use `browser_subagent` to test in the browser:
  1. Open Studio editor (`/editor`).
  2. Paste a YouTube URL (`https://www.youtube.com/watch?v=...&t=45s`) -> verify instant auto-conversion to 16:9 player block.
  3. Toggle display modes: `[ Interactive Embed ]` <-> `[ Rich Link Card ]` <-> `[ Plain Link ]`.
  4. Publish article and view on `ArticleReaderPage` -> verify responsive 16:9 rendering with `youtube-nocookie.com` and caption.
  5. Test SSRF protection by attempting to scrape `http://127.0.0.1:3001` -> verify rejection with 400 Bad Request.
