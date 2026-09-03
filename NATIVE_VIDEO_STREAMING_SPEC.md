# The Gazette — Native Video Processing Pipeline & HTML5 Streaming Engine Specification (Production v2.0)

## 1. Executive Summary

This specification defines the complete, production-grade architectural blueprint for **Native Video Upload, Processing Pipeline & HTML5 Streaming Engine** across The Gazette platform.

In contrast to external third-party embeds (YouTube, Vimeo, Loom, Spotify), this engine empowers editorial desks and journalists to upload self-hosted video clips (`.mp4`, `.webm`, `.mov`) directly to The Gazette. The asset passes through an asynchronous **BullMQ media processing queue**, validates container structures and codecs (H.264/AAC, VP9/Opus), extracts video metadata, extracts a crisp poster frame, and streams to readers with an editorial-grade **HTML5 custom player** using **shadcn UI components**.

Every layer is engineered for enterprise reliability: **storage/CDN decoupling**, **database mesh asset synchronization**, **ID-based media authorization (`:mediaId`)**, **HTTP 206 partial content streaming with conditional headers (`ETag`, `If-Range`)**, and **anonymized ClickHouse playback analytics**.

---

## 2. End-to-End Media Ingestion & Processing Architecture

```text
                           AUTHOR / JOURNALIST
                                   │
                             Upload Video
                                   │
                                   ▼
              [POST /api/media/video/upload]
              ├── JwtAuthGuard + CsrfGuard + Roles(Author/Editor/Admin)
              └── Upload Quotas (100MB cap, 15-min duration, daily limit)
                                   │
                                   ▼
              [Binary Gatekeeper & Structural Validation]
              ├── Magic-Byte Signature Check (MP4 'ftyp', WebM EBML, MOV)
              ├── Container Box & Codec Whitelist (H.264/AAC, VP9/Opus)
              └── Antivirus & Malware Scanning Gatekeeper
                                   │
                                   ▼
              [Object Storage / Media Store & Initial DB Record]
              ├── Saves raw ingest file with unique mediaId (UUID)
              ├── Sets Status: 'UPLOADING' ──> 'VALIDATING'
              └── Mesh Sync (Postgres, Mongo, MySQL, MariaDB, CockroachDB)
                                   │
                                   ▼
              [BullMQ 'media-processing' Background Queue]
              ├── Job: 'process-video-asset'
              ├── 1. Metadata Extraction (Duration, Dimensions, Bitrate, FPS)
              ├── 2. Automated Poster Frame Capture (at 1.0s timestamp)
              ├── 3. Web Delivery Packaging & Normalization
              └── 4. Update MediaAsset Status: 'READY' (or 'FAILED')
                                   │
                                   ▼
                       [Delivery & Streaming Mesh]
                                   │
              ┌────────────────────┴────────────────────┐
              ▼                                         ▼
   [GET /api/media/stream/:mediaId]            [Cloudflare / CDN Layer]
   ├── Visibility & Auth Check                 ├── Edge Byte-Range Cache
   ├── HTTP 206 Byte-Range Slicing             └── Immutable Asset Versioning
   ├── Bounded Read Streams (64KB chunks)                │
   └── ETag, Last-Modified, If-Range                     ▼
              │                               [Article Reader Page]
              ▼                               ├── Custom HTML5 Video Player
   [ClickHouse Analytics]                     └── shadcn Slider / Dropdowns
   └── video_play, progress_25/50/75/100
```

---

## 3. Media Processing Lifecycle State Machine

Every uploaded video transitions through an explicit, deterministic state machine:

```text
┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌───────────┐
│  UPLOADING   │ ──> │  VALIDATING  │ ──> │  PROCESSING  │ ──> │   READY   │
└──────────────┘     └──────────────┘     └──────────────┘     └───────────┘
                            │                    │
                            ▼                    ▼
                     ┌──────────────┐     ┌──────────────┐
                     │    FAILED    │ <── │    FAILED    │
                     └──────────────┘     └──────────────┘
```

| Lifecycle State | Description | Reader / Editor Accessibility |
| :--- | :--- | :--- |
| **`UPLOADING`** | Incoming multipart chunk stream from client | Editor shows upload progress bar |
| **`VALIDATING`** | Magic numbers, container boxes, and codec verification | Editor shows spinner ("Verifying media...") |
| **`PROCESSING`** | BullMQ background worker extracting metadata & poster frame | Editor displays skeleton card |
| **`READY`** | Fully processed, poster generated, ready for streaming | Embeddable in manuscript & streamable |
| **`FAILED`** | Invalid container, unsupported codec, or corrupt file | Displays detailed error to author |

---

## 4. Binary Signature, Container & Codec Validation Policy

### 4.1 Supported Delivery & Ingest Matrix

| Format | Container | Supported Video Codec | Supported Audio Codec | Target Delivery |
| :--- | :--- | :--- | :--- | :--- |
| **MP4** | ISO Base Media File (`ftyp`) | **H.264 (AVC1)**, High/Main profile | **AAC-LC**, 44.1/48kHz Stereo | Universal Cross-Browser Native Delivery |
| **WebM** | EBML Container (`\x1A\x45\xDF\xA3`) | **VP9**, **VP8** | **Opus**, **Vorbis** | Modern Desktop/Android Delivery |
| **MOV** | QuickTime Container (`moov`/`ftypqt`) | **H.264**, **ProRes** (Ingest Only) | **AAC**, **PCM** | Ingest format &rarr; normalized for web delivery |

### 4.2 Structural Validation Gatekeeper
1. **Magic Bytes**:
   - MP4: Bytes 4–8 match `ftyp` with verified brand (`isom`, `mp42`, `MSNV`, `avc1`).
   - WebM: Bytes 0–3 match `\x1A\x45\xDF\xA3`.
   - MOV: Bytes 4–8 match `ftypqt` or top-level atom `moov`/`mdat`.
2. **Bounds & Quota Enforcement**:
   - Max file size: **100 MB**.
   - Max duration: **15 minutes (900 seconds)**.
   - Max resolution: **1920x1080 (1080p)**.
   - Max frame rate: **60 FPS**.
   - User upload quota: **20 video uploads per 24 hours per author**.

---

## 5. Backend HTTP 206 Byte-Range Streaming Engine

### 5.1 ID-Based Streaming (`GET /api/media/stream/:mediaId`)
Never expose local storage paths or arbitrary filenames in streaming URLs. The route accepts a UUID `:mediaId`:
1. **Database Lookup**: Resolves `:mediaId` from the active persistence database.
2. **Access Authorization**:
   - If asset visibility is `PUBLIC`: Open to all readers.
   - If asset visibility is `DRAFT` or `PRIVATE`: Validates caller JWT token and editorial permissions.
3. **HTTP 206 Partial Content Generation**:
   - Parses `Range: bytes=START-END`.
   - Computes chunk: `start`, `end = end ?? fileSize - 1`, `chunkSize = (end - start) + 1`.
   - Sets Response Headers:
     - `HTTP/1.1 206 Partial Content`
     - `Content-Range: bytes START-END/TOTAL_FILE_SIZE`
     - `Accept-Ranges: bytes`
     - `Content-Length: chunkSize`
     - `Content-Type: video/mp4` (or `video/webm`)
     - `ETag: "video-{mediaId}-{version}"`
     - `Cache-Control: public, max-age=604800, immutable`
   - Bounded stream via `fs.createReadStream(storagePath, { start, end })`.
4. **Conditional Requests & Range Abuse Guard**:
   - Supports `If-Range` matching `ETag`.
   - Handles `HTTP 416 Range Not Satisfiable` when requested range exceeds file size.
   - Rate limits excessive micro-range requests (> 200 req/sec per IP).

---

## 6. 6-Database Persistence Mesh & Video Schema

### 6.1 MediaAsset Schema Across Databases
The video metadata record is persisted across PostgreSQL, MongoDB, MySQL, MariaDB, and CockroachDB:

```typescript
export type MediaVisibility = 'PUBLIC' | 'PRIVATE' | 'DRAFT';
export type MediaStatus = 'UPLOADING' | 'VALIDATING' | 'PROCESSING' | 'READY' | 'FAILED';

export interface MediaAsset {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  url: string;
  streamUrl: string;
  posterUrl?: string;
  durationSeconds?: number;
  width?: number;
  height?: number;
  codec?: string;
  visibility: MediaVisibility;
  status: MediaStatus;
  uploadedBy: string;
  createdAt: string;
  updatedAt: string;
}
```

### 6.2 Article Native Video Block Schema
Persisted inside article manuscript blocks:

```typescript
export interface ArticleNativeVideoBlock {
  id: string;
  type: 'native_video';
  mediaId: string;
  streamUrl: string;
  posterUrl?: string;
  title?: string;
  caption?: string;
  width: 'standard' | 'wide' | 'full';
  aspectRatio: '16:9' | '4:3' | '9:16' | '1:1';
  autoplay: boolean; // Autoplay ONLY permitted if muted === true
  loop: boolean;
  muted: boolean;
  controls: boolean;
  durationSeconds?: number;
}
```

---

## 7. Frontend Custom HTML5 Video Player UX (shadcn UI)

### 7.1 Player Architecture & Design System
* **Container**: Responsive 16:9 `aspect-video` canvas in dark editorial theme (`#09090b`).
* **Custom Overlay & shadcn Controls**:
  * **Center Play/Pause Overlay**: Subtle fade-in button on hover / pause.
  * **Timeline Scrubber**: Powered by shadcn `Slider` with elapsed time and buffered range indicators.
  * **Time Indicator**: Displays `MM:SS / MM:SS` in `JetBrains Mono`.
  * **Volume Control**: shadcn `Slider` with mute toggle (`Volume2`, `VolumeX`).
  * **Playback Rate**: shadcn `DropdownMenu` offering `0.75x`, `1x`, `1.25x`, `1.5x`, `2x`.
  * **Picture-in-Picture (PiP)**: Invokes browser `requestPictureInPicture()`.
  * **Fullscreen**: Invokes Fullscreen API with keyboard shortcut `F`.
* **Keyboard Accessibility**:
  * `Space` / `K`: Toggle Play/Pause.
  * `ArrowLeft` / `ArrowRight`: Seek -5s / +5s.
  * `ArrowUp` / `ArrowDown`: Volume +/- 10%.
  * `M`: Toggle Mute.
  * `F`: Toggle Fullscreen.

### 7.2 Writing Studio Video Uploader
* **Video Insertion Dialog**: Powered by shadcn `Dialog` and `Tabs`:
  * **Tab 1: Upload Video**: Drag & drop `.mp4`/`.webm`/`.mov` with shadcn `Progress` upload bar.
  * **Tab 2: Media Library**: Select previously uploaded ready video assets.
* **Block Customization Toolbar**:
  * Alignment toggle (*Standard*, *Wide*, *Full Bleed*).
  * Poster frame selector.
  * Autoplay (muted) and loop switches powered by shadcn `Switch`.
  * Inline editable caption.

---

## 8. ClickHouse Telemetry & Privacy-Respecting Analytics

Streaming events are asynchronously dispatched to ClickHouse with anonymized reader session IDs:
* `video_play`: Dispatched on initial user playback.
* `video_progress_25`: Dispatched at 25% watch milestone.
* `video_progress_50`: Dispatched at 50% watch milestone.
* `video_progress_75`: Dispatched at 75% watch milestone.
* `video_complete`: Dispatched upon reaching 100% completion.

---

## 9. Automated Test & Verification Matrix

| Test Suite | Scope | Target |
| :--- | :--- | :--- |
| **Magic-Byte Signature Tests** | Verify valid MP4/WebM/MOV signatures pass; disguised executables rejected | 100% Pass |
| **HTTP 206 Streaming Tests** | Verify `Range: bytes=0-1024` returns HTTP 206, `Content-Range`, and bounded slice | 100% Pass |
| **Conditional Request Tests** | Verify `If-Range` with matching `ETag` returns 206; mismatch returns 200 | 100% Pass |
| **HTTP 416 Out-of-Bounds Tests** | Verify `Range: bytes=999999-999999` on 10KB file returns HTTP 416 | 100% Pass |
| **shadcn Player Unit Tests** | Verify Scrubber seeking, Volume slider, Speed selection, PiP, and Fullscreen | 100% Pass |
| **Browser E2E Studio & Reader Flow** | Upload video -> BullMQ process -> insert in manuscript -> stream in reader | 100% Pass |
| **Full Build Integrity** | Client & Server compile cleanly with 0 errors | 100% Pass |

---

## 10. Implementation Steps

1. **Step 2.1**: Backend Video Validator (`video-validator.util.ts`) with magic-byte checks and range header parser.
2. **Step 2.2**: Backend Media Controller & Service (`GET /api/media/stream/:mediaId` with HTTP 206, conditional headers, and upload handling).
3. **Step 2.3**: BullMQ Media Processing Worker (`media-processor.worker.ts`) for asynchronous metadata extraction and poster generation.
4. **Step 2.4**: Frontend Custom HTML5 Video Player (`VideoPlayer.tsx`) using shadcn `Slider` and `DropdownMenu`.
5. **Step 2.5**: Frontend Video Upload Modal (`VideoUploadModal.tsx`) using shadcn `Dialog`, `Tabs`, `Progress`, and `Switch`.
6. **Step 2.6**: Writing Studio (`RichTextEditor.tsx`) & Reader (`ArticleReaderPage.tsx`) integration.
7. **Step 2.7**: Comprehensive automated unit tests and browser verification.
