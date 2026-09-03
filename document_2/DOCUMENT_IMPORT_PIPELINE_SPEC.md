# The Gazette — Multi-Format Document Import Pipeline Specification (Production v2.0)

## 1. Executive Summary

This specification defines the complete, production-grade architectural blueprint for the **Multi-Format Document Import Pipeline** across The Gazette platform.

Journalists and editorial desks frequently draft manuscripts in external tools (Microsoft Word, Google Docs, Markdown editors, raw text files, or PDF briefs). This engine empowers authors to import `.docx`, `.md`, `.txt`, and `.pdf` files directly into the Gazette Writing Studio. The pipeline parses document structure, preserves semantic typography (Headings, Paragraphs, Lists, Blockquotes, Tables, Code Fences), extracts embedded media into The Gazette Media Library, passes content through strict **XSS sanitization**, enqueues heavy document jobs to the **BullMQ `document-processing` queue**, and presents a **shadcn UI Pre-Import Review Modal** before inserting the manuscript into the editor canvas.

Every layer is engineered to high enterprise standards: **magic-byte binary signature verification**, **zip bomb protection**, **6-database mesh metadata synchronization**, and **anonymized ClickHouse import telemetry**.

---

## 2. End-to-End Import & Extraction Architecture

```text
                           AUTHOR / JOURNALIST
                                   │
                     Select / Drag Document File
                      (.docx, .md, .txt, .pdf)
                                   │
                                   ▼
                   [POST /api/documents/import]
                   ├── JwtAuthGuard + CsrfGuard + Permission(MEDIA_UPLOAD)
                   └── Size Cap (25 MB) & Rate Limiting
                                   │
                                   ▼
                [Binary Gatekeeper & Magic-Byte Validation]
                ├── .docx : PK Zip Header (0x50 0x4B 0x03 0x04)
                ├── .pdf  : PDF Header (%PDF- 0x25 0x50 0x44 0x46)
                ├── .md   : UTF-8 Text Stream Validation
                └── .txt  : Plain Text Character Set Encoding
                                   │
                                   ▼
              ┌────────────────────┴────────────────────┐
              │ (Light Sync Parse: .txt/.md)            │ (Heavy Async Queue: .docx/.pdf)
              ▼                                         ▼
   [In-Memory Text Extractor]               [BullMQ 'document-processing']
   ├── Fast UTF-8 Parse                     ├── Asynchronous Extraction Job
   └── Regex Normalizer                     ├── Image Extraction & Media Store
              │                                         │
              └────────────────────┬────────────────────┘
                                   │
                                   ▼
                   [Multi-Format Extractor Engine]
         ┌─────────────────┼─────────────────┼─────────────────┐
         ▼                 ▼                 ▼                 ▼
   [.docx Extractor] [.md Extractor]  [.txt Extractor]  [.pdf Extractor]
   ├── Mammoth.js    ├── Unified/   ├── Paragraph      ├── Layout Math
   ├── Style Mapping    Remark GFM      Normalization  ├── Title Heuristics
   └── Media Slicing ├── Code Fences ├── Smart Quotes  └── Clean Text
         │                 │                 │                 │
         └─────────────────┼─────────────────┴─────────────────┘
                           ▼
              [XSS Sanitizer & Media Ingestion]
              ├── Sanitizes HTML via sanitizer.util (strips scripts/iframes)
              ├── Saves embedded images to Media Library
              └── Generates DocumentImportResult Payload
                                   │
                                   ▼
             [Pre-Import Review Modal (shadcn UI)]
             ├── Tab 1: Executive Summary & File Metadata
             ├── Tab 2: Clean Editorial HTML Preview
             ├── Options: Strip inline styles, Extract images, Title detection
             ├── Notice: "PDF formatting may require manual review."
             └── Action: [ Confirm & Import into Manuscript ]
                                   │
                                   ▼
                    [Writing Studio Manuscript Canvas]
                    └── Formatted Gazette HTML Blocks
```

---

## 3. Supported Formats & Parsing Strategies

| Format | Extractor Technology | Preserved Structural Elements | Media Handling & Formatting Disclaimer |
| :--- | :--- | :--- | :--- |
| **`.docx`** | `mammoth` + Custom AST Mapper | H1-H6, Paragraphs, Bold, Italic, Strikethrough, Blockquotes, Lists, Tables | Extracts embedded PNG/JPEG images & uploads to Gazette Media Library |
| **`.md`** | `remark-parse` + `remark-gfm` | Headings (`#`), Code Fences (```lang), GFM Tables, Footnotes, Blockquotes, Lists, Task Lists | Resolves relative/external image links |
| **`.txt`** | Native Regex & Block Normalizer | Paragraph splits (`\n\n`), Bullet lists (`* `, `- `), Smart quote conversions | N/A |
| **`.pdf`** | `pdf-parse` + Layout Heuristic Engine | Heading hierarchy (font size/weight heuristics), Paragraphs, Structural Text | *PDF layout extraction uses text heuristics. Complex multi-column layouts may require manual editorial review.* |

---

## 4. Parser Engine Specifications

### 4.1 `.docx` Microsoft Word Parsing (`Mammoth.js`)
* **Style Mapping Rules**:
  * `Heading 1` &rarr; `<h2>` (Gazette section header).
  * `Heading 2` &rarr; `<h3>` (Gazette sub-header).
  * `Heading 3` / `Heading 4` &rarr; `<h4>`.
  * `Intense Quote` / `Quote` &rarr; `blockquote`.
  * `Inline Code` &rarr; `<code>`.
* **Embedded Image Extraction**:
  * Scans document binary for `word/media/` assets.
  * Converts images to WebP/PNG, assigns unique `mediaId` (UUID), uploads to Gazette Media Library, and replaces inline Word relationship IDs with Gazette public media URLs (`/uploads/media-uuid.png`).

### 4.2 `.md` Markdown Parsing (`Unified / Remark`)
* Parses GitHub Flavored Markdown (GFM).
* Converts Markdown tables into responsive `<table class="cms-table">` elements.
* Converts fenced code blocks (```typescript ... ```) into `<pre><code class="language-typescript">...</code></pre>`.

### 4.3 `.pdf` Portable Document Format Parsing
* Uses structural line heuristics:
  * Single isolated capitalized lines surrounded by double line breaks &rarr; `<h2>`.
  * Preserves paragraph boundaries while stripping page header/footer page numbers (`Page X of Y`).

---

## 5. Security, Sanitization & Abuse Prevention

1. **Strict XSS Defense (`sanitizer.util.ts`)**:
   - All extracted HTML passes through server-side sanitization prior to client delivery.
   - Strips `<script>`, `<iframe>`, `<object>`, `<embed>`, `onload`, `onerror`, `style="..."`, and `javascript:` URIs.
2. **Zip Bomb Protection (`.docx`)**:
   - `.docx` files are ZIP archives. The parser checks uncompressed size ratio before expansion.
   - Rejects archives where uncompressed size exceeds **100 MB** or expansion ratio exceeds **100:1**.
3. **File Size Cap**: Maximum allowable upload size is **25 MB**.

---

## 6. Pre-Import Review Modal UX (shadcn UI Components)

When a document is uploaded, the **Pre-Import Review Modal** renders before the manuscript is modified:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│  Import Document: quarterly_report.docx                                [X]  │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Summary & Metadata ]  [ Editorial HTML Preview ]                         │
├─────────────────────────────────────────────────────────────────────────────┤
│  DOCUMENT ANALYTICS                                                         │
│  ├── File Type       : Microsoft Word (.docx)                               │
│  ├── Detected Title  : Q3 Financial Overview & Tech Strategy                 │
│  ├── Word Count      : 1,420 words                                          │
│  ├── Est. Read Time  : 6 mins                                               │
│  ├── Structural      : 5 Headings, 14 Paragraphs, 2 Tables, 3 Images        │
│                                                                             │
│  IMPORT OPTIONS                                                             │
│  [x] Auto-detect primary title as Article Headline                          │
│  [x] Strip inline Word font styles & colors                                 │
│  [x] Upload 3 embedded images to Media Library                              │
│                                                                             │
│  ℹ Note: PDF layout extraction uses text heuristics. Complex multi-column    │
│    layouts may require manual editorial review.                             │
├─────────────────────────────────────────────────────────────────────────────┤
│  [ Cancel ]                                       [ Confirm & Import ]      │
└─────────────────────────────────────────────────────────────────────────────┘
```

* **Components**: Built using shadcn `Dialog`, `Tabs`, `ScrollArea`, `Badge`, `Switch`, `Button`, `Table`, `Alert`.

---

## 7. Data Transfer Schema

### 7.1 Backend Import Response (`DocumentImportResult`)

```typescript
export interface ExtractedImageAsset {
  originalName: string;
  mediaId: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export interface DocumentImportResult {
  filename: string;
  format: 'docx' | 'md' | 'txt' | 'pdf';
  title?: string;
  htmlContent: string;
  wordCount: number;
  readingTimeMinutes: number;
  headingsCount: number;
  paragraphsCount: number;
  extractedImages: ExtractedImageAsset[];
  warnings?: string[];
}
```

---

## 8. 6-Database Persistence Mesh & Telemetry

* **Metadata Sync**: Document import audit records are written to PostgreSQL, MongoDB, MySQL, MariaDB, and CockroachDB.
* **ClickHouse Analytics**: Emits `document_imported` event containing `format`, `wordCount`, `extractedImagesCount`, `parseDurationMs`.

---

## 9. Automated Verification Matrix

| Test Suite | Scope | Target |
| :--- | :--- | :--- |
| **`.docx` Extraction Tests** | Verify Mammoth parses Word headings, lists, tables, and images | 100% Pass |
| **`.md` Extraction Tests** | Verify Remark parses GFM tables, code fences, and blockquotes | 100% Pass |
| **`.txt` Extraction Tests** | Verify paragraph splits and smart quotes | 100% Pass |
| **`.pdf` Extraction Tests** | Verify PDF layout text extraction and heading heuristics | 100% Pass |
| **XSS Sanitization Tests** | Verify embedded malicious scripts/iframes are stripped | 100% Pass |
| **Zip Bomb Defense Tests** | Verify oversized compressed Word archives are rejected | 100% Pass |
| **Full Build Integrity** | Client & Server compile cleanly with 0 errors | 100% Pass |

---

## 10. Implementation Steps

1. **Step 3.1**: Install backend document parsing dependencies (`mammoth`, `pdf-parse`, `remark`, `remark-html`, `remark-gfm`).
2. **Step 3.2**: Create Backend Document Import Service (`document-import.service.ts`) with parsers for `.docx`, `.md`, `.txt`, `.pdf`.
3. **Step 3.3**: Create Backend Controller (`document-import.controller.ts`) with `POST /api/documents/import`.
4. **Step 3.4**: Create Frontend API Client ([`documents.api.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/api/documents.api.ts)).
5. **Step 3.5**: Create Frontend Pre-Import Review Modal (`DocumentImportModal.tsx`) using shadcn UI components (`Dialog`, `Tabs`, `ScrollArea`, `Switch`).
6. **Step 3.6**: Integrate Document Import button in Writing Studio toolbar (`RichTextEditor.tsx`).
7. **Step 3.7**: Write comprehensive unit tests and conduct browser E2E verification.
