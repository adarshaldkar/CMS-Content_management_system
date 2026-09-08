# Gazette Writing Studio & Editorial Manuscript Suite: Specification (v2.0 Refined)

> **Document Status**: Frozen Specification — Ready for Implementation  
> **Target Subsystems**: `RichTextEditor.tsx`, `ArticleEditorPage.tsx`, `RichEmbedModal.tsx`, `DocumentImportModal.tsx`, `embedFormatter.ts`, `embeds.api.ts`, `documents.api.ts`  
> **Architectural Alignment**: Integrated with Gazette Design System, Smart Embeds Engine, BullMQ Document Processing Queue, Media Library Storage Mesh, and WCAG 2.2 AA Accessibility.

---

## 1. Executive Summary & Problem-to-Solution Matrix

| # | Area / Component | Identified Root Cause | Refined Architectural Solution |
|---|---|---|---|
| **1** | **YouTube & Video Embedding** | `embedFormatter.ts` coupled transcript scraping directly into manuscript body, polluting text with raw timestamps (`[00:00] ♪♪`). Over-styled with SaaS `rounded-xl` and heavy drop-shadows. | **Strict Decoupling**: Embeds pure interactive `<iframe>` player in Gazette editorial container (hairline border, subtle radius, dark media surface, no shadow). Transcripts are strictly omitted from the body and available only via an explicit "Add Transcript" author action. |
| **2** | **Hyperlink Insertion** | Line 113 of `RichTextEditor.tsx` used blocking browser `prompt()`, losing cursor selection and opening an unstyled alert. | **Floating Link Popover with Selection Preservation**: Captures and caches the DOM/TipTap selection range prior to popover open; enforces strict scheme validation (`https:`, `http:`, `mailto:`; rejects `javascript:`, `data:`, `vbscript:`); enforces `rel="noopener noreferrer"`. |
| **3** | **PDF / Word Document Import** | Unreliable DOM injection; static review tab; synchronous request bottleneck on large files. | **Asynchronous Split-Pane Review**: Integrates with BullMQ document worker for files >2MB; split-pane UI (Document Intel on left, Live Gazette Typography on right); atomic cursor-targeted DOM insertion with zero focus loss. |
| **4** | **Controlled Editorial Composition** | Missing design primitives, risking Canva-style chaotic color/badge bloat. | **Semantic Editorial Tokens Only**: Text alignment (`left`, `center`, `right`, `justify`), semantic callouts (`Note`, `Quote`, `Warning`, `Correction`), semantic highlight token (Gazette blush/accent), and clean hairline/editorial divider. No arbitrary RGB palettes or generic badge pills. |
| **5** | **Writing Studio Workspace** | Heavy boxed wireframes, monospace micro-labels, AI-generated prototype vibe. | **Focus-Paper Editorial Canvas**: Clean uncluttered paper canvas (`#FCFBF9`), borderless fluid headline/dek, header-anchored publishing workflow, collapsible right inspector (drawer/bottom sheet on mobile), and robust autosave state machine. |

---

## 2. Detailed Technical & Visual Architecture

```
                                  GAZETTE WRITING STUDIO
┌──────────────────────────────────────────────────────────────────────────────────┐
│ ← Stories / New Story                  Draft · Auto-saved 14s ago   [Revisions]  │
│                                                     [ Preview ]  [ Publish / Submit ]│
├──────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   HEADLINE (Newsreader 38px Bold)                                                │
│   Subtitle / Editorial Dek (Plus Jakarta Sans 18px Text-Slate-600)               │
│                                                                                  │
│   ┌──────────────────────────────────────────────────┐ ┌───────────────────────┐ │
│   │ Editorial Toolbar (Sticky Top)                   │ │ Inspector Panel       │ │
│   │ [H2 H3 H4] [B I U S] [Align] [Callout] [Media] ↩ ↪│ │ ───────────────────── │ │
│   ├──────────────────────────────────────────────────┤ │ 📷 Cover Image        │ │
│   │                                                  │ │    [Media Library]    │ │
│   │ Editorial Manuscript Canvas                      │ │ 🏷 Category / Section │ │
│   │                                                  │ │ 🔗 Slug / Permalinks  │ │
│   │  Paragraph text with Newsreader serif body...    │ │ 👤 Author Byline      │ │
│   │                                                  │ │ 📊 Reading Intel      │ │
│   │  ┌────────────────────────────────────────────┐  │ │    1,420 words        │ │
│   │  │ ▌ Pull Quote / Editorial Callout           │  │ │    6 min read         │ │
│   │  └────────────────────────────────────────────┘  │ │ 🔍 SEO & Social Card  │ │
│   │                                                  │ │                       │ │
│   │  ┌────────────────────────────────────────────┐  │ │ [Collapse Inspector] │ │
│   │  │ YouTube / Media Embed (Hairline Frame)     │  │ └───────────────────────┘ │
│   │  └────────────────────────────────────────────┘  │                           │
│   └──────────────────────────────────────────────────┘                           │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

### 2.1 YouTube & Unified Media Embed Model

#### Invariants:
1. **Never auto-inject transcripts into manuscript content**: Transcripts are treated strictly as secondary metadata and never dumped into the article body text.
2. **Editorial Media Styling**:
   - Container: `aspect-video w-full bg-slate-950 border border-slate-800 rounded-sm overflow-hidden` (No `rounded-2xl`, no heavy `shadow-2xl`).
   - Caption: Rendered in `font-serif text-xs italic text-ink-secondary text-center mt-2.5`.
3. **Unified Media Block Schema**:
   ```typescript
   export type MediaType = 'youtube' | 'vimeo' | 'spotify' | 'native_video' | 'image' | 'document';

   export interface UnifiedMediaBlock {
     type: MediaType;
     url: string;
     embedUrl?: string;
     title: string;
     caption?: string;
     width: 'standard' | 'wide' | 'full';
     aspectRatio?: string;
     provider?: string;
   }
   ```

---

### 2.2 Floating Link Popover & Selection Invariant

```
┌────────────────────────────────────────────────────────┐
│ 🔗 Editorial Hyperlink                                 │
│                                                        │
│ Destination URL                                        │
│ ┌────────────────────────────────────────────────────┐ │
│ │ https://thegazette.press/investigations/special    │ │
│ └────────────────────────────────────────────────────┘ │
│                                                        │
│ [X] Open in new window (rel="noopener noreferrer")     │
│                                                        │
│ [ Remove Link ]                    [ Cancel ] [ Apply ]│
└────────────────────────────────────────────────────────┘
```

#### Selection & Security Logic:
1. **Preserve Selection Range**:
   - When the link button is clicked or `Ctrl+K` is triggered, capture `const savedRange = window.getSelection()?.getRangeAt(0)?.cloneRange();`.
   - Store `savedRange` in component state.
   - Upon "Apply", restore the exact range via `selection.removeAllRanges(); selection.addRange(savedRange);` before executing `document.execCommand('createLink', false, validatedUrl)`.
2. **Security & Protocol Sanitization**:
   - **Allowed Protocols**: `http:`, `https:`, `mailto:`, `tel:`.
   - **Rejected / Blocked**: `javascript:`, `data:`, `vbscript:`, `file:`.
   - If `target="_blank"` is selected, automatically apply `rel="noopener noreferrer"`.

---

### 2.3 Document & PDF Import Pipeline (BullMQ Integration)

```
Upload File (.docx, .pdf, .md, .txt)
  │
  ├── Size <= 2MB ──────────► Fast Synchronous Parsing
  │
  └── Size > 2MB / Complex ─► BullMQ Queue: `cms-document-processing`
                                 │
                                 ├── Text extraction & heading hierarchy
                                 ├── Image extraction -> Gazette Media Library
                                 ├── Clean inline styling & sanitization
                                 └── Push result via SSE / WebSocket to Client
```

#### Split-Pane Modal Layout:
- **Left Pane (Document Telemetry & Controls)**:
  - Detected format badge (`.PDF`, `.DOCX`, `.MD`, `.TXT`).
  - Word count, paragraph count, heading count, extracted media count.
  - Toggles: `Clean inline fonts & styling`, `Extract images to Media Library`, `Use top header as Story Headline`.
- **Right Pane (Gazette Magazine Typography Preview)**:
  - Full-fidelity HTML rendering using Gazette typography tokens (`Newsreader` serif headings, balanced margins, clean blockquotes).
- **Atomic Insertion**:
  - Inserts directly at cursor position without page refresh or selection jitter.

---

### 2.4 Controlled Editorial Composition (Semantic Design Tools)

We provide **structured editorial primitives**, strictly governed by Gazette design tokens:

#### 1. Text Alignments:
- `align-left` (Default)
- `align-center` (Poetry, citations, center features)
- `align-right` (Epigraphs, right attribution)
- `align-justify` (Formal newspaper columns)

#### 2. Semantic Callout Blocks:
- **Editorial Pull Quote**: Large serif italics with crimson border (`border-l-2 border-accent-crimson pl-4 my-6 font-serif italic text-lg text-ink-primary`).
- **Editorial Note (`note`)**: Subdued warm background (`bg-amber-50/60 border-l-2 border-amber-600 p-4 text-sm font-sans`).
- **Correction / Notice (`warning`)**: Muted slate/crimson card for updates and errata (`bg-slate-100 border-l-2 border-slate-700 p-4 text-xs font-mono`).

#### 3. Semantic Highlighting (No RGB Color Palette):
- Uses Gazette accent token: `bg-accent-crimson/10 text-accent-crimson px-1 rounded-xs font-medium`.

#### 4. Editorial Dividers:
- **Hairline Divider**: Clean thin rule (`border-t border-border-subtle my-8`).
- **Editorial Rule**: Centered ornamental break with subtle spacing.

---

### 2.5 Studio Workspace Layout & Autosave State Machine

#### Visual Hierarchy:
1. **Header**: Breadcrumbs, autosave status indicator, `[ Revision History ]`, `[ Preview ]`, `[ Submit for Review / Publish ]`.
2. **Canvas**: Focused manuscript container (`max-w-3xl mx-auto px-6 py-10 bg-canvas-paper`). Seamless borderless inputs for Title and Dek.
3. **Collapsible Right Inspector**:
   - **Desktop**: Collapsible right sidebar (320px).
   - **Tablet**: Slide-over drawer with toggle button in header.
   - **Mobile (< 768px)**: Bottom-sheet modal or dedicated inspector tab.
   - **Cover Asset**: Sourced strictly from **Gazette Media Library** or direct local upload (no uncontrolled third-party stock providers).

#### Autosave State Machine:
```
[ Dirty Content Detected ] ──► (Debounce 1500ms) ──► [ State: "Saving..." ]
                                                           │
                      ┌────────────────────────────────────┴────────────────────────────────────┐
                      ▼                                                                         ▼
            [ Network Success ]                                                       [ Network Failure ]
                      │                                                                         │
        [ State: "Saved just now" ]                                              [ State: "Save Failed — Offline" ]
                      │                                                                         │
        (Tick every 10s: "Saved 10s ago")                                        • Cache manuscript in LocalStorage
                                                                                 • Enable manual [ Retry Save ] button
                                                                                 • Auto-retry when online event triggers
```

#### Editing History:
- **Undo / Redo buttons** visible in toolbar (`Undo` and `Redo` icons).
- Supported hotkeys: `Ctrl+Z` / `Cmd+Z` (Undo), `Ctrl+Y` / `Ctrl+Shift+Z` / `Cmd+Shift+Z` (Redo).

---

## 3. Test & Verification Plan

### 3.1 Automated E2E Test Suite (Playwright)

1. **YouTube Embed Flow**:
   - Paste `https://youtu.be/7wtfhZwyrcc` into editor canvas.
   - Assert `iframe` is inserted with `aspect-video` and hairline border.
   - Assert **no transcript timestamps** (`[00:00]`) exist anywhere in the manuscript body.
2. **Link Popover Flow**:
   - Select word `"investigation"`.
   - Open link popover; verify popover displays selected text.
   - Enter `https://example.com` and toggle "Open in new window".
   - Click "Apply"; verify `<a href="https://example.com" target="_blank" rel="noopener noreferrer">` wraps `"investigation"`.
   - Test malicious schemes: enter `javascript:alert(1)` -> verify validation error is displayed and insertion is blocked.
3. **Document Import Flow**:
   - Upload sample `.docx` and `.pdf` files.
   - Verify Split-Pane modal shows metadata analytics (word count, format badge).
   - Click "Confirm & Import"; verify formatted semantic HTML is inserted into editor at cursor position.
4. **Editorial Styling Suite**:
   - Test Align Left, Center, Right, Justify.
   - Insert Pull Quote, Editorial Note, and Hairline Divider.
   - Save draft and reload page; assert all styling tokens persist accurately.
5. **Autosave & Offline Resilience**:
   - Simulate network offline during edit.
   - Assert UI displays `"Save Failed — Stored locally"`.
   - Re-enable network; assert draft automatically saves and updates to `"Saved just now"`.
6. **Responsive Layouts**:
   - Test 375px (Mobile), 768px (Tablet), 1440px (Desktop) viewport rendering.

---

### 3.2 Security & Compliance Matrix

| Vulnerability Vector | Defense Mechanism | Validation Check |
|---|---|---|
| **XSS via Link URL** | Strict scheme whitelist (`http:`, `https:`, `mailto:`, `tel:`). Regex disallows `javascript:`, `data:`, `vbscript:`. | Rejected with inline error message. |
| **Reverse Tabnabbing** | Automatic injection of `rel="noopener noreferrer"` on all `target="_blank"` anchors. | DOM inspector confirms attribute presence. |
| **XSS in Document Import** | DOM sanitization stripping `<script>`, `<iframe>` (except whitelisted video providers), inline event handlers (`onclick`, `onerror`). | Malicious tags stripped prior to editor insertion. |
| **Iframe Hijacking** | Video embed iframes restricted to verified providers (YouTube, Vimeo, Loom, Spotify) with `sandbox` / safe attributes. | Unrecognized embed domains converted to safe preview cards or plain links. |

---

*This specification is now refined, architecturally frozen, and ready for execution.*
