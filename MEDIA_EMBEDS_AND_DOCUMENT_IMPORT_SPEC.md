# The Gazette — Rich Media Embeds & Manuscript Import Pipeline Specification

## 1. Executive Summary

This document establishes the comprehensive engineering architecture, data formats, security controls, and step-by-step implementation plan for three major authoring and reader enhancements requested for The Gazette:

1. **Feature 1: Native Video Upload & HTML5 Streaming Player**: Multi-format video upload (`.mp4`, `.webm`, `.mov`), backend streaming support with HTTP 206 partial content (`Accept-Ranges: bytes`), and responsive editorial video player with custom controls.
2. **Feature 2: Smart YouTube & Video Embeds**: Multi-format YouTube URL normalization (watch, youtu.be, shorts, embeds, start timestamp parameters), instant paste auto-conversion, modal embed tool, live studio preview with captions, alignment widths, and privacy-hardened (`youtube-nocookie.com`) lazy-loaded iframes.
3. **Feature 3: Multi-Format Document Import Pipeline**: Client & server parsing for `.docx` (via `mammoth`), `.md` (Markdown), `.txt` (Plain Text), and `.pdf` (structured text extraction) directly converting raw manuscripts into clean, semantic editorial blocks with a pre-insertion preview modal.

---

## 2. Feature 1: Native Video Upload & HTML5 Player Support

### 2.1 Storage, Streaming & Backend Architecture
* **Supported MIME Types**: `video/mp4`, `video/webm`, `video/quicktime` (.mov).
* **Payload Limits**: 100MB max per clip with MIME validation via magic bytes (`file-type` / mime sniffing).
* **HTTP 206 Partial Content (Streaming Scrubbing)**:
  * When serving `/uploads/media/...` video assets, the media controller or static file handler must support `Range` request headers.
  * Responds with `HTTP 206 Partial Content`, `Content-Range: bytes START-END/TOTAL`, and `Accept-Ranges: bytes`.
  * Enables instant seeking and scrubbing on mobile and desktop without downloading the full video binary first.

### 2.2 Author Experience in Article Editor Studio
* **Toolbar & Media Picker Integration**:
  * Added **"Video"** button to the editor toolbar and `/` slash menu.
  * Authors can either:
    1. Drag and drop a video file directly onto the editor canvas.
    2. Upload a new video clip through the editor file picker.
    3. Select an existing video asset from the central **Media Library**.
* **Video Block Attributes**:
  ```typescript
  interface VideoBlock {
    id: string;
    type: 'video';
    url: string;
    caption?: string;
    width?: 'standard' | 'wide' | 'full';
    posterUrl?: string;
    autoplay?: boolean;
    loop?: boolean;
    muted?: boolean;
  }
  ```

### 2.3 Reader Experience in `ArticleReaderPage`
* **Responsive 16:9 Aspect Ratio**: Contained inside `relative w-full aspect-video rounded-lg overflow-hidden bg-slate-950`.
* **Custom Playback Controls**:
  * Play / Pause toggle with centered click-to-play overlay.
  * Scrub bar with buffered progress indicator.
  * Speed selector (`0.75x`, `1x`, `1.25x`, `1.5x`, `2x`).
  * Picture-in-Picture (PiP) and Fullscreen toggles.
  * Captions/subtitles support (`<track>`).

---

## 3. Feature 2: Smart YouTube & External Video Embeds

### 3.1 URL Patterns & Normalization Engine
The system parses and normalizes diverse YouTube link formats into an immutable 11-character video ID and optional start timestamp:

| Input Format | Sample URL | Normalized Video ID | Start Offset |
| :--- | :--- | :--- | :--- |
| Standard Watch | `https://www.youtube.com/watch?v=dQw4w9WgXcQ` | `dQw4w9WgXcQ` | 0 |
| Shortened URL | `https://youtu.be/dQw4w9WgXcQ` | `dQw4w9WgXcQ` | 0 |
| Timed Share Link | `https://youtu.be/dQw4w9WgXcQ?t=1m30s` | `dQw4w9WgXcQ` | 90s (`start=90`) |
| YouTube Shorts | `https://www.youtube.com/shorts/dQw4w9WgXcQ` | `dQw4w9WgXcQ` | 0 |
| Standard Embed | `https://www.youtube.com/embed/dQw4w9WgXcQ` | `dQw4w9WgXcQ` | 0 |

#### Regex Extraction Algorithm:
```typescript
export function parseYouTubeUrl(url: string): { videoId: string; startTime?: number } | null {
  const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|v\/)|youtu\.be\/)([\w-]{11})(?:[^\w\s-].*)?/;
  const match = url.match(regExp);
  if (!match) return null;

  const videoId = match[1];
  let startTime: number | undefined;

  // Extract ?t=... or &t=... or ?start=...
  const timeMatch = url.match(/[?&](?:t|start)=(\d+h)?(\d+m)?(\d+s|\d+)?/);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1] || '0', 10) || 0;
    const minutes = parseInt(timeMatch[2] || '0', 10) || 0;
    const seconds = parseInt(timeMatch[3] || '0', 10) || 0;
    startTime = hours * 3600 + minutes * 60 + seconds;
  }

  return { videoId, startTime };
}
```

### 3.2 Authoring Workflows in Studio
* **Method A (Instant Paste)**:
  * Intercepts paste events on empty paragraph blocks.
  * If clipboard text matches a YouTube URL, automatically replaces the paragraph with a live `youtube` block.
* **Method B (Toolbar Modal)**:
  * Click **"Embed Video"** button in the editor toolbar.
  * Modal provides URL input with immediate real-time validation and thumbnail preview.
* **Block Customization**:
  * Optional editorial caption input (e.g. *"Figure 2: Keynote demonstration at Tech Summit"*).
  * Width layout controls: Standard (`max-w-3xl`), Wide (`max-w-5xl`), and Full Bleed (`w-full`).

### 3.3 Security, Privacy & Rendering
* **Privacy-Enhanced Mode**: Embeds use `https://www.youtube-nocookie.com/embed/${videoId}` to prevent setting tracking cookies until the reader clicks play (GDPR/ePrivacy compliance).
* **Lazy Loading**: `loading="lazy"` attribute on the `<iframe>` so offscreen videos do not consume network bandwidth or slow initial article rendering.
* **Content Security Policy (CSP)**: Updated `frame-src` in `server/src/main.ts` to allow `https://www.youtube-nocookie.com` and `https://www.youtube.com`.

---

## 4. Feature 3: Document Import & Auto-Formatting (DOCX, PDF, MD, TXT)

### 4.1 Parser Architecture & Extraction Rules

```text
Author Drops File (.docx, .md, .txt, .pdf)
         │
         ▼
[Manuscript Parser Engine]
         │
  ┌──────┴───────────────────────────┬───────────────────────────┐
  ▼                                  ▼                           ▼
[.docx Parser]                 [Markdown Parser]          [PDF / TXT Parser]
(mammoth.js HTML converter)    (Tokens -> Blocks)         (Heading detection & cleaning)
  │                                  │                           │
  └──────────────────────────────────┼───────────────────────────┘
                                     │
                                     ▼
                     [Normalized Article Draft]
                     - Extracted Title (H1)
                     - Semantic Body HTML / Blocks
                     - Extracted Embedded Images
                     - Estimated Word & Reading Count
                                     │
                                     ▼
                     [Import Review Modal]
                     - Side-by-side formatted preview
                     - Options: "Replace Story" vs "Append to Draft"
                                     │
                                     ▼
                     [Populate Article Studio]
```

### 4.2 Format Conversion Details
1. **Microsoft Word (`.docx`)**:
   * Uses `mammoth.js` to preserve semantics rather than visual styles.
   * `Heading 1` -> `<h2>`, `Heading 2` -> `<h3>`.
   * Tables -> Semantic HTML tables (`<table>`, `<thead>`, `<tbody>`).
   * Bold, Italics, Lists, Blockquotes converted cleanly.
   * Embedded inline images extracted, converted to base64/data URLs or uploaded automatically to Media Assets.
2. **Markdown (`.md`)**:
   * Extracts `# Title` as article title, `## Section` as headers.
   * Fenced code blocks (` ```ts `), blockquotes (`>`), links (`[text](url)`), and unordered/ordered lists.
3. **Plain Text (`.txt`)**:
   * First non-empty line extracted as title.
   * Double linebreaks parsed into paragraphs; single linebreaks normalized.
4. **PDF (`.pdf`)**:
   * Structured text extraction detecting large fonts for titles/headings and contiguous text streams for body paragraphs.

---

## 5. Security & Traffic Hardening (2,000+ Concurrent Readers)

1. **Content Security Policy (CSP)**:
   * `frame-src`: Add `https://www.youtube-nocookie.com https://www.youtube.com`.
   * `media-src`: Add `'self' data: blob:`.
2. **XSS Sanitization**:
   * All imported HTML from `.docx` and `.pdf` files is passed through `sanitizeHtml` / `DOMPurify` before entering the editor state.
   * Disallows `<script>`, `<style>`, `<iframe>` (except verified YouTube iframes), and `on*` event handlers.
3. **Streaming Bandwidth Optimization**:
   * Native videos served with `Cache-Control: public, max-age=86400, immutable` and `Accept-Ranges: bytes` to allow browser-level chunk caching.
   * YouTube embeds defer network loading until viewport intersection (`loading="lazy"`).

---

## 6. Phased Implementation Strategy (Step-by-Step)

To ensure high quality, complete test coverage, and no rushed changes, we will execute these three features in **three distinct, sequential phases**:

* **Phase 1 (Next Immediate Step)**: **Smart YouTube & Video Embeds**
  - Regex parser and URL normalizer with timestamp support.
  - Video and YouTube editor blocks with captions and width controls.
  - Instant paste auto-conversion and toolbar embed modal.
  - Reader rendering on `ArticleReaderPage` with `youtube-nocookie.com` and responsive 16:9 container.
  - CSP updates and automated verification.

* **Phase 2**: **Native Video Upload & HTML5 Streaming Player**
  - Backend media upload handler extensions for video MIME types.
  - HTTP 206 partial content streaming header support.
  - Custom HTML5 editorial player with speed controls, play/pause overlay, and scrub bar.

* **Phase 3**: **Multi-Format Document Import Pipeline**
  - Client-side parser engine (`mammoth`, Markdown, TXT, PDF).
  - "Import Manuscript" toolbar button and drag-drop zone in Studio.
  - Import Review dialog with side-by-side preview and Replace/Append actions.

---

## 7. Status & Sign-off

- [x] Architectural Specification complete and persisted to `document_2/MEDIA_EMBEDS_AND_DOCUMENT_IMPORT_SPEC.md`.
- [ ] Phase 1: Smart YouTube Embeds (Ready to begin).
- [ ] Phase 2: Native Video Upload & HTML5 Player.
- [ ] Phase 3: Document Import Pipeline.
