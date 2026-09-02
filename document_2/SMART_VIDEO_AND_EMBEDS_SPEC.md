# The Gazette — Smart Video, Rich Embeds & OpenGraph Scraping Engine Specification (Production v2.0)

## 1. Executive Summary

This document defines the production-grade architectural and security specification for **Smart Video, Rich Embeds & OpenGraph Scraping Engine** across The Gazette platform.

The system provides an intelligent, secure media ingestion and metadata normalization pipeline supporting **YouTube, Vimeo, Loom, Spotify, Twitter/X, Generic Web Link Cards**, and **Native Video Streaming**.

Every component is engineered for **10/10 production readiness**, featuring **DNS-pinned SSRF protection with redirect re-validation**, **stream-bounded payload limits**, **Redis single-flight caching with negative TTLs**, **editorial snapshot reproducibility**, and **6-database persistence mesh compatibility**.

---

## 2. Multi-Provider Architecture & Resolution Matrix

| Provider | Validated Domain Allowlist | Dedicated Resolver Strategy | Extracted & Snapshotted Metadata |
| :--- | :--- | :--- | :--- |
| **YouTube** | `youtube.com`, `www.youtube.com`, `m.youtube.com`, `youtu.be`, `youtube-nocookie.com` | OEMBED API (`https://www.youtube.com/oembed`) + Regex ID & Start Timestamp extraction | Title, Author Name, Channel URL, Thumbnail (HD), 16:9 Aspect Ratio, Start Time Offset (seconds) |
| **Vimeo** | `vimeo.com`, `player.vimeo.com` | OEMBED API (`https://vimeo.com/api/oembed.json`) | Title, Author Name, Author URL, HD Thumbnail, Duration, Aspect Ratio |
| **Loom** | `loom.com`, `www.loom.com` | OEMBED API (`https://www.loom.com/v1/oembed`) + Direct Embed (`loom.com/embed/:id`) | Video Title, Author, Thumbnail, 16:9 Player Dimensions |
| **Spotify** | `open.spotify.com` | OEMBED API (`https://open.spotify.com/oembed`) + Compact Embed (`/embed/track/...`, `/embed/episode/...`) | Track/Episode Title, Artist/Podcast Name, Album Art, Audio Player Height |
| **Twitter / X** | `twitter.com`, `x.com` | Publish OEMBED API (`https://publish.twitter.com/oembed?omit_script=true`) | Tweet Author, Handle, Avatar, Sanitized Text Content, Publish Date |
| **Generic URLs** | Any public HTTP/HTTPS domain passing SSRF validation | OpenGraph / Twitter Cards / Meta HTML Parser | `og:title`, `og:description`, `og:image`, `og:site_name`, `author`, Favicon URL |
| **Native Video** | Local `/uploads/media/...` or Cloud CDN | Custom HTML5 Video Controller with HTTP 206 Streaming | Video Resolution, Duration, MIME Type, Poster Frame, File Size |

---

## 3. Advanced Cybersecurity & Anti-SSRF Defense Architecture

```text
Incoming Scrape Request: POST /api/embeds/scrape
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. URL Syntactic & Scheme Validation                        │
│    - Scheme MUST be 'http:' or 'https:' only (No file/data) │
│    - Rejects credentials in URL (http://user:pass@host)     │
│    - Port restricted to 80 and 443 only                     │
│    - Hostname length <= 253 characters                      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Single-Flight Request Coalescing & Redis Cache Check     │
│    - Cache Key: embed:meta:v1:{provider}:{sha256(url)}      │
│    - Cache Hit (24h TTL) -> Return cached metadata (<2ms)   │
│    - Negative Cache Hit (2m TTL) -> Return cached failure   │
│    - In-Flight Coalescing -> Merges duplicate requests      │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. DNS Resolution & IP Blacklist Gatekeeper                 │
│    - dns.promises.lookup(hostname) -> Resolved IPv4/IPv6    │
│    - Blocks Private/Internal Ranges:                        │
│      * 127.0.0.0/8 (Loopback)                               │
│      * 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 (Private)  │
│      * 169.254.169.254 / 169.254.0.0/16 (Cloud Metadata)   │
│      * ::1, fc00::/7, fe80::/10 (IPv6 Local/Private)        │
│      * 0.0.0.0/8 (Current Network)                          │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. IP-Pinned HTTP Fetch with Strict Stream Guard            │
│    - HTTP client binds socket to resolved safe IP (No TOCTOU│
│      DNS Rebinding vulnerability)                           │
│    - Custom Timeout: 3,500ms max                            │
│    - Max Redirects: 3 (Every redirect hop re-enters Step 1) │
│    - Content-Type Check: text/html, application/json only   │
│    - Stream Byte Counter: Socket destroyed if payload > 2MB │
└────────────────────────────┬────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Parsing, Sanitization & Cache Storage                    │
│    - DOMPurify / Sanitizer on all string fields             │
│    - Success: Cache for 86,400s (24 Hours)                  │
│    - Error: Cache failure for 120s (Negative TTL)           │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Editorial Snapshotting & 6-Database Persistence Mesh

### 4.1 Editorial Reproducibility Philosophy
* **Snapshotting at Write Time**: When an author embeds media and saves an article, the normalized metadata is persisted **directly into the article block**.
* **Zero Read-Time External Dependencies**: Readers viewing published articles load the snapshotted metadata from the active database engine without making outbound scrape requests.
* **Optional Refresh**: Authors in the studio can click a **"Refresh Metadata"** button to pull updated title/thumbnail changes from origin providers.

### 4.2 Universal Block Schema Across 6 Databases

The block schema is identically structured across PostgreSQL (JSONB), MongoDB (BSON Document), MySQL/MariaDB (JSON string), CockroachDB (JSONB), and ClickHouse (Analytical event stream):

```typescript
export type EmbedDisplayMode = 'embed' | 'card' | 'link';

export interface ArticleEmbedBlock {
  id: string;
  type: 'embed';
  provider: 'youtube' | 'vimeo' | 'loom' | 'spotify' | 'twitter' | 'generic' | 'native_video';
  url: string;
  displayMode: EmbedDisplayMode; // 'embed' | 'card' | 'link'
  embedUrl?: string;
  videoId?: string;
  title: string;
  description?: string;
  authorName?: string;
  authorUrl?: string;
  thumbnailUrl?: string;
  caption?: string;
  width: 'standard' | 'wide' | 'full';
  aspectRatio: string; // '16:9', '4:3', '1:1', 'compact'
  startTime?: number; // YouTube start seconds
  faviconUrl?: string;
  snapshottedAt: string; // ISO timestamp
}
```

---

## 5. Authoring Experience in the Writing Studio

### 5.1 Three Ways to Insert
1. **Instant Clipboard Paste (Smart Auto-Detection)**:
   - Pasting any valid URL into an empty line triggers URL detection.
   - Shows inline loader skeleton and replaces with the rendered embed card.
2. **Toolbar "Embed Media / Link" Tool**:
   - Quick modal with immediate URL pattern badge (e.g. `[YouTube Video]`, `[Spotify Track]`, `[Web Article]`).
3. **Slash Commands**:
   - `/youtube`, `/vimeo`, `/loom`, `/spotify`, `/embed`, `/video`.

### 5.2 Author Display Mode Switcher
Every embed block gives the author three display choices:
```text
┌───────────────────────────────────────────────────────────┐
│  Display Mode:  [ ▶ Interactive Embed ]  [ 📄 Rich Card ]  [ 🔗 Plain Link ]
│  Width:         [ Standard (3xl) ]       [ Wide (5xl) ]   [ Full Bleed ]
│  Caption:       [ Figure 1: Editorial Keynote Demonstration... ]
└───────────────────────────────────────────────────────────┘
```

---

## 6. Reader Experience & Resilience (`ArticleReaderPage`)

### 6.1 Responsive Player & Privacy-Enhanced Mode
* **YouTube**: Always rendered via `https://www.youtube-nocookie.com/embed/${videoId}${startTime ? `?start=${startTime}` : ''}`.
* **Lazy Loading**: `loading="lazy"` on all `<iframe>` elements to prevent blocking initial paint.
* **Aspect Ratio**: CSS `aspect-video` container (`aspect-ratio: 16 / 9`) eliminating Cumulative Layout Shift (CLS).

### 6.2 Provider Unavailable / Offline Fallback State
If an external provider is blocked by reader extensions or unavailable:
```text
┌───────────────────────────────────────────────────────────┐
│ ⚠️ Embed Preview Unavailable                              │
│                                                           │
│ [ Thumbnail / Cover Art ]                                 │
│ Title: Building Distributed Mesh Architecture             │
│ Source: YouTube (youtube.com)                             │
│                                                           │
│ [ ↗ Open Original Source ]                                │
└───────────────────────────────────────────────────────────┘
```

### 6.3 Native Video Streaming (HTTP 206)
* Served via `/api/media/stream/:filename` supporting `Range: bytes=START-END`.
* Response headers: `HTTP 206 Partial Content`, `Content-Range`, `Accept-Ranges: bytes`.
* Custom HTML5 player controls: Scrubber, playback rate (`0.75x` to `2x`), Picture-in-Picture, and Fullscreen.

---

## 7. Security, Privacy & Traffic Hardening (2,000+ Readers)

1. **Content Security Policy (CSP)** in `server/src/main.ts`:
   - `frame-src`: `'self' https://www.youtube-nocookie.com https://www.youtube.com https://player.vimeo.com https://www.loom.com https://open.spotify.com https://platform.twitter.com https://syndication.twitter.com`
   - `media-src`: `'self' data: blob: https://*`
2. **Iframe Sandboxing**:
   - `sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"`
3. **Analytics Privacy in ClickHouse**:
   - Video events (`video_play`, `video_progress_50`, `embed_click`) logged with anonymized session hashes; zero PII stored without explicit reader consent.

---

## 8. Automated Test & Verification Matrix

| Test Suite | Scope | Target |
| :--- | :--- | :--- |
| **SSRF Gatekeeper Unit Tests** | DNS lookups, private IP range blocks, 169.254.169.254, loopback, IPv6 | 100% Pass |
| **Redirect Re-Validation Tests** | Safe URL redirecting to 127.0.0.1 blocked at Hop 1 | 100% Pass |
| **Stream Limit & Content-Type Tests** | Payload > 2MB destroys stream; image/png content-type rejected | 100% Pass |
| **Provider Parser Unit Tests** | YouTube (watch, youtu.be, shorts, ?t=90s), Vimeo, Loom, Spotify, Twitter/X | 100% Pass |
| **Redis Single-Flight & Negative TTL** | 24h cache hit; 2min negative cache on failed scrape | 100% Pass |
| **Browser E2E Studio & Reader Flow** | Paste link -> auto convert -> mode switch -> reader 16:9 render | 100% Pass |
| **Full Build Integrity** | Client & Server compile cleanly with 0 errors | 100% Pass |
