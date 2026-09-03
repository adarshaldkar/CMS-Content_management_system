# Implementation Plan: Multi-Format Document Import Pipeline (Task 3)

Implement multi-format manuscript extraction for `.docx`, `.md`, `.txt`, and `.pdf` files with magic-byte validation, XSS sanitization, automatic Word image extraction into The Gazette Media Library, BullMQ background job processing, and an interactive **Pre-Import Review Modal** built with **shadcn UI**.

## User Review Required

> [!IMPORTANT]
> - **Pre-Import Review Modal**: Allows authors to inspect extracted metadata (word count, reading time, heading count, extracted images count) and preview sanitized Gazette HTML before inserting into the manuscript canvas. Includes explicit disclaimer: *"PDF layout extraction uses text heuristics. Complex multi-column layouts may require manual editorial review."*
> - **Word Image Ingestion**: Embedded images inside `.docx` archives are automatically extracted, uploaded to The Gazette Media Library, and referenced via public media URLs.
> - **Security & Sanitization**: Strict XSS filtering via `sanitizer.util.ts` and zip bomb ratio checks on compressed `.docx` archives.

---

## Proposed Changes

### Backend Subsystem (`server/src/modules/documents/`)

#### [NEW] Dependencies
- Install `mammoth` (Word docx parser), `pdf-parse` (PDF layout text extractor), `remark` + `remark-html` + `remark-gfm` (Markdown parser).

#### [NEW] `server/src/modules/documents/document-import.service.ts`
- Document Extractor Engine:
  - Magic-byte validation (`.docx` PK header, `.pdf` `%PDF` header, UTF-8 text validation).
  - `.docx`: Converts Word elements to Gazette HTML tags (`Heading 1` -> `<h2>`, `Heading 2` -> `<h3>`, `Quote` -> `blockquote`), extracts `word/media/` embedded images into Media Library.
  - `.md`: Parses GitHub Flavored Markdown (GFM tables, code fences).
  - `.txt`: Normalizes paragraphs and converts smart quotes.
  - `.pdf`: Extracts text with line layout heuristics.
  - Passes extracted HTML through `sanitizer.util.ts`.
  - Calculates word count, reading time, and heading count.

#### [NEW] `server/src/modules/documents/document-import.controller.ts`
- `POST /api/documents/import` guarded by `JwtAuthGuard`, `CsrfGuard`, `RequirePermissions(Permission.MEDIA_UPLOAD)`.
- Accepts file up to 25 MB limit.

#### [NEW] `server/src/modules/documents/documents.module.ts`
- NestJS module exporting `DocumentImportService` and `DocumentImportController`.

#### [NEW] `server/src/modules/documents/document-import.spec.ts`
- Unit tests for `.docx`, `.md`, `.txt`, `.pdf` extractors, XSS sanitization, and zip bomb validation.

---

### Frontend Subsystem (`client/src/`)

#### [NEW] `client/src/api/documents.api.ts`
- `documentsApi.importDocument(file)` calling `POST /api/documents/import`.

#### [NEW] `client/src/components/editor/DocumentImportModal.tsx`
- Pre-Import Review Modal built with shadcn UI (`Dialog`, `Tabs`, `ScrollArea`, `Badge`, `Switch`, `Button`, `Alert`):
  - Tab 1: Executive Summary & File Analytics (Format, Detected Title, Word Count, Reading Time, Headings, Images).
  - Tab 2: Clean Editorial HTML Preview.
  - Toggles: Auto-detect title, Strip Word fonts/colors, Upload images to Media Library.
  - PDF Disclaimer: *"PDF layout extraction uses text heuristics. Complex multi-column layouts may require manual editorial review."*

#### [MODIFY] `client/src/components/editor/RichTextEditor.tsx`
- Add "Import Document (.docx, .md, .txt, .pdf)" button to toolbar with FileText icon.
- Open `DocumentImportModal` on file selection.

---

## Verification Plan

### Automated Tests
- `npm test -- src/modules/documents/document-import.spec.ts` (100% Pass for DOCX, MD, TXT, PDF, XSS, Zip Bomb).
- Full server test suite: `npm test`.
- Full build validation: `npm run build` in `server/` and `client/`.

### Manual / Browser Verification
- Launch `browser_subagent` to test Writing Studio (`/write`):
  1. Open Studio editor.
  2. Click "Import Document" button in toolbar.
  3. Upload sample document (`.docx` / `.md` / `.txt`).
  4. Verify **Pre-Import Review Modal** renders Analytics, Toggles, and HTML Preview.
  5. Click "Confirm & Import" and verify formatted content inserts into editor canvas.
