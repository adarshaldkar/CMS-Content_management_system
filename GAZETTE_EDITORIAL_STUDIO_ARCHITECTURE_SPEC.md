# Gazette Editorial Studio Architecture & Specification (v3.0 Frozen Master)

> **Document Status**: Frozen Architectural Master Document  
> **Mission**: Transform The Gazette Writing Studio from a modern web editor into a **publication-grade authoring environment** combining Microsoft Word–caliber tool organization with Gazette–grade journalistic workflows.  
> **Architectural Paradigm**: "Word-level editor organization + Gazette-level editorial workflow."

---

## 1. System Architecture Overview

```
                                  GAZETTE EDITORIAL STUDIO
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ [← Stories]   Untitled Manuscript        [Draft · Auto-saved]       [ WRITE | REVIEW | PREVIEW ]│
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│  TEXT  │  FORMAT  │  INSERT  │  MEDIA  │  EDITORIAL  │  REVIEW  │  VIEW       [Publish ▾]     │
├─────────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                      │                      │
│   ARTICLE HEADLINE (Newsreader 42px Bold)                            │  INSPECTOR [✕]       │
│   Subtitle / Editorial Deck (18px Italic)                            │  ──────────────────  │
│                                                                      │  ▼ ARTICLE           │
│   ┌──────────────────────────────────────────────────────────────┐   │    Section / Category│
│   │ Writing Canvas                                               │   │    Slug / Permalink  │
│   │                                                              │   │    Author Byline     │
│   │ Paragraph text with Newsreader serif body...                 │   │                      │
│   │                                                              │   │  ▼ MEDIA ASSETS      │
│   │ ▌ Editorial Callout / Editor's Note                          │   │    Cover Image       │
│   │                                                              │   │    Caption & Alt Text│
│   │ Type '/' for commands...                                     │   │                      │
│   │ ┌───────────────────────────┐                                │   │  ▼ SEO & SOCIAL      │
│   │ │ /table    Insert Table    │                                │   │    Meta Title & Desc │
│   │ │ /quote    Pull Quote      │                                │   │                      │
│   │ │ /note     Editor's Note   │                                │   │  ▼ EDITORIAL INTEL   │
│   │ │ /embed    Media Embed     │                                │   │    Word count: 1,420 │
│   │ └───────────────────────────┘                                │   │    Read time: ~6 min │
│   └──────────────────────────────────────────────────────────────┘   │                      │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Core Architectural Invariants

### 2.1 Unified Command & Action Registry
All UI access points (**Sticky Ribbon Menus**, **Slash `/` Palette**, **Command Palette `Ctrl+K`**, **Context Menus**, and **Keyboard Shortcuts**) execute through a single underlying command registry.

```
                            UNIFIED COMMAND REGISTRY
                                        │
        ┌───────────────────┬───────────┴───────────┬───────────────────┐
        ▼                   ▼                       ▼                   ▼
  Sticky Ribbon      Slash Palette (/)     Command Palette (Ctrl+K)   Hotkeys
  (7 Categories)     (Quick Keyboard)      (Global Quick-Search)     (Standard)
```

```typescript
export interface EditorialCommand {
  id: string; // e.g. 'insert.table', 'format.bold', 'editorial.correction'
  title: string;
  category: 'text' | 'format' | 'insert' | 'media' | 'editorial' | 'review' | 'view';
  shortcut?: string;
  icon: string;
  keywords: string[];
  execute: (editor: any, payload?: any) => void;
  isEnabled?: (editor: any) => boolean;
  isActive?: (editor: any) => boolean;
}
```

---

### 2.2 Intelligent Word & Google Docs Paste Parser
When authors copy content from Microsoft Word or Google Docs (`Ctrl+C` → `Ctrl+V`), raw MSO junk, proprietary XML, and nested span tags are automatically sanitized into clean semantic markup:
- Strips `mso-*`, `class="MsoNormal"`, `style="font-family: Calibri..."`.
- Converts Word bold/italic/underline/strikethrough into semantic `<strong>`, `<em>`, `<u>`, `<s>`.
- Preserves bulleted/numbered lists and heading hierarchy (`Heading 1..3` → `<h2>..<h4>`).
- Converts Word table grids into semantic Gazette table elements.
- Strips trailing `<span>` color overrides to preserve Gazette typography.

---

## 3. The 7-Category Sticky Ribbon Specification

The toolbar is anchored **sticky at the top of the editor window** and grouped into structured dropdown menus:

### 3.1 `TEXT` Menu
- **Paragraph (`<p>`)**: Standard body text (`Ctrl+Alt+0`).
- **Heading 1 (`<h2>`)**: Major section header (`Ctrl+Alt+1`).
- **Heading 2 (`<h3>`)**: Subsection header (`Ctrl+Alt+2`).
- **Heading 3 (`<h4>`)**: Minor block header (`Ctrl+Alt+3`).
- **Subtitle / Deck**: Editorial lead-in paragraph.
- **Caption Text**: Italicized media credit/attribution text.
- **Blockquote**: Standard quotation.
- **Pull Quote**: High-impact editorial display quote with crimson border.

### 3.2 `FORMAT` Menu
- **Inline Styling**: Bold (`Ctrl+B`), Italic (`Ctrl+I`), Underline (`Ctrl+U`), Strikethrough, Superscript, Subscript, Code Block (`pre/code`).
- **Semantic Highlight**: Gazette blush accent marker (`bg-rose-50 text-accent-crimson`).
- **Alignments**: Left, Center, Right, Justify.
- **Lists**: Bullet List (`<ul>`), Numbered List (`<ol>`), Interactive Checklist (`<ul class="cms-checklist">`).
- **Clear Formatting**: Strips inline overrides while preserving semantic structure (`Ctrl+\`).

### 3.3 `INSERT` Menu
- **Smart Hyperlink (`Ctrl+K`)**:
  - URL input with scheme whitelist (`https:`, `http:`, `mailto:`, `tel:`).
  - Open in new window toggle (`target="_blank" rel="noopener noreferrer"`).
  - Internal Gazette article search & selector.
  - One-click unlink action.
- **Table Builder**:
  - Predefined grids: `2×2`, `3×3`, `4×4`, or custom dimensions.
  - Table Styles: *Classic Hairline*, *Borderless Matrix*, *Compact Data*.
- **Horizontal Rules**: Clean hairline divider (`<hr class="cms-divider" />`).
- **Footnote / Citation Link**: Anchored superscripts linked to article source references.

### 3.4 `MEDIA` Menu
- **Media Library**: Direct selector from Gazette Cloudinary / local storage mesh.
- **Self-Hosted Video**: Upload `.mp4`, `.webm`, `.mov` with poster image and width presets.
- **Smart Embeds**: Paste URL from YouTube, Vimeo, Loom, Spotify, X → auto-generates responsive `<iframe>` with hairline borders.
- **Audio Embed**: Spotify, Apple Podcasts, Soundcloud, or `.mp3` player.
- **Document Ingestion**: Split-Pane Word (`.docx`), PDF (`.pdf`), Markdown (`.md`), Text (`.txt`) import pipeline.

### 3.5 `EDITORIAL` Menu (Publication-Specific Blocks)
- **Editor's Note**: Warm amber card (`bg-amber-50/70 border-l-3 border-amber-600`) for post-publication context.
- **Correction / Errata**: Slate block (`bg-slate-100 border-l-3 border-slate-700`) for transparent editorial corrections.
- **Warning / Disclaimer**: Advisory box for sensitive reporting or legal disclaimers.
- **Key Fact / Fact Box**: Clean summary block for data journalism and key statistics.
- **Timeline Block**: Chronological event stack with date pills.
- **Source Citation**: Formal bibliographic credit box.
- **Related Stories**: Pinned internal article card with thumbnail and reading time.

### 3.6 `REVIEW` Menu
- **Revision History Timeline**: Inspect versions, view author timestamps, restore past states.
- **Visual Diff Comparator**: Side-by-side highlighting of added and deleted text.
- **Workflow Transitions**: Draft → Pending Review → Approved → Scheduled → Published → Rejected.
- **Editorial Review Notes**: Private notes between staff editors and authors.

### 3.7 `VIEW` Menu
- **Contextual Inspector Toggle (`Ctrl+\`)**: Collapse or expand the right inspector panel.
- **Document Outline (TOC)**: Real-time heading hierarchy navigator.
- **Distraction-Free Focus Mode (`F11`)**: Hides all navigation and sidebar Chrome.
- **Reading Intelligence & Stats**: Live word count, character count, estimated reading time, readability score.

---

## 4. Interactive Table Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Table Style: [ Classic Hairline ▾ ]   [ + Row ] [ + Col ]   │
├──────────────────────────────┬──────────────────────────────┤
│ Metric / Headline (<th>)     │ Value / Measurement (<th>)   │
├──────────────────────────────┼──────────────────────────────┤
│ PostgreSQL Cluster Read IOPS │ 142,500 req/sec              │
├──────────────────────────────┼──────────────────────────────┤
│ ClickHouse Telemetry Latency │ 1.8ms per 1M rows            │
└──────────────────────────────┴──────────────────────────────┘
  Caption: Table 1.1 — Database Mesh Performance Benchmark (Source: Gazette Telemetry)
```

### Table Styles:
1. **Classic Hairline**: Clean 1px border (`border-slate-200`), uppercase serif headers, subtle cell padding.
2. **Borderless Matrix**: No vertical rules; hairline horizontal dividers with alternating row tint.
3. **Compact Data**: Tight monospace cells tailored for financial, technical, or tabular datasets.

### Contextual Cell Controls:
- Insert Row Above / Below
- Insert Column Left / Right
- Delete Row / Column
- Toggle Header Row (`<thead>`)
- Horizontal Scroll Wrapper (ensuring zero table overflow on mobile viewports)

---

## 5. Pre-Publish Editorial Quality Checklist

Before an article can be moved to `Published` or `Submitted for Review`, an automated verification modal inspects the manuscript:

```
┌────────────────────────────────────────────────────────┐
│ 🛡️ PRE-PUBLISH EDITORIAL CHECKLIST                     │
│                                                        │
│  ✓ Story Headline present                              │
│  ✓ Primary Cover Asset selected                        │
│  ✓ Author Byline assigned                              │
│  ✓ Editorial Section selected                          │
│  ✓ SEO Meta Description configured                     │
│  ✓ All Hyperlinks valid (0 broken)                     │
│  ⚠ Image Alt Text missing on 1 figure                  │
│  ⚠ No formal Source Attribution attached               │
│                                                        │
│  [ Fix Issues in Inspector ]      [ Publish Anyway ➔ ] │
└────────────────────────────────────────────────────────┘
```

---

## 6. Three Workspace Modes Specification

```
[ WRITE ] ──► Standard Authoring Canvas (Menus, Slash palette, focus writing)
[ REVIEW ] ──► Revision Diff View, Editorial Comments, Approval/Rejection Gate
[ PREVIEW ] ──► Exact Magazine Replica (Identical font scaling, TOC, Paywall simulation)
```

1. **`WRITE`**: Distraction-free composition with sticky ribbon and contextual inspector.
2. **`REVIEW`**: Side-by-side diff comparing current draft with previous revisions, inline comment threads, and reviewer sign-off actions.
3. **`PREVIEW`**: Read-only simulation of the public `/articles/:slug` page, verifying exact typographic rendering, responsive embeds, and reader preferences.

---

## 7. Contextual Inspector Panel Specification

Located on the right (320px, collapsible with `Ctrl+\` or header button):

```
INSPECTOR PANEL
─────────────────────────────────────────────
▼ ARTICLE DETAILS
  • Section: Technology & Architecture
  • Slug: /articles/decentralized-mesh-2026
  • Author: Editorial Staff (Display Toggle)
  • Target Publication Slot: Morning Dispatch

▼ MEDIA & ASSETS
  • Cover Image: [ Change Asset ]
  • Caption: "Server rack telemetry rollups"
  • Alt Text: "Multi-cluster server topology"
  • Photo Credit: "Gazette Photography"

▼ SEO & SOCIAL PREVIEW
  • Meta Title Tag (60 chars max)
  • Meta Description (155 chars max)
  • OpenGraph Social Card Preview

▼ EDITORIAL GOVERNANCE
  • Topic Tags: #PostgreSQL, #ClickHouse, #Telemetry
  • Source Citations: 3 references attached
  • Review Clearance: Pre-approved for dispatch

▼ READING INTELLIGENCE
  • Words: 1,420 words
  • Characters: 8,640 chars
  • Est. Read Time: ~6 minutes
  • Heading Structure: Valid (H2 ➔ H3 hierarchy)
```

---

## 8. Reliability, Autosave & Offline Recovery

### Autosave State Machine:
```
[ Dirty Content ] ──► (1500ms Debounce) ──► [ Saving… ]
                                               │
               ┌───────────────────────────────┴───────────────────────────────┐
               ▼                                                               ▼
       [ Network OK ]                                                  [ Network Error ]
               │                                                               │
     [ Saved just now ]                                              [ Offline — Saved locally ]
       (Ticks: "Saved 20s ago")                                        • Cache in LocalStorage
                                                                       • Display [ Retry ] button
                                                                       • Auto-recovers on reconnect
```

---

## 9. Phased Implementation Roadmap

| Phase | Milestone | Deliverables |
|---|---|---|
| **Phase 1** | **Command Registry & Sticky Ribbon** | Build `commandRegistry.ts`, implement sticky 7-category menu bar (`TEXT`, `FORMAT`, `INSERT`, `MEDIA`, `EDITORIAL`, `REVIEW`, `VIEW`). |
| **Phase 2** | **Contextual Right Inspector** | Redesign sidebar into collapsible unified Inspector with accordion sections (Article, Media, SEO, Editorial, Reading). |
| **Phase 3** | **Interactive Slash (`/`) Palette** | Implement floating keyboard-navigable command palette triggered by `/` on any blank line. |
| **Phase 4** | **Interactive Tables & Editorial Blocks** | Build table generator (`2×2`..custom) with row/column controls, implement editorial blocks (Note, Correction, Key Fact, Citation). |
| **Phase 5** | **Pre-Publish Checklist & Workspace Modes** | Implement `WRITE` / `REVIEW` / `PREVIEW` switcher and automated Pre-Publish Quality Gate modal. |

---

## 10. Document Ingestion, Conversion & Edge-Case Specification

### 10.1 Universal Ingestion Pipeline
```text
UPLOAD DOCUMENT (.pdf, .docx, .md, .txt)
   ↓
1. File Validation & Size Guard (25 MB max)
   ↓
2. Security & Macro/Script Neutralization
   ↓
3. Document Structure Inspection
   ↓
4. Semantic Extraction Layer
   ├── Text & Typography (Hierarchy, Reading Order, Ligatures, Unicode Normalization)
   ├── Headings & Sections (H1/H2/H3 auto-detection, Step Headings, Alpha Items)
   ├── Hyperlinks (External URLs, mailto, tel; strip broken internal PDF anchors)
   ├── Embedded Media Assets (Raster PNG/JPEG upload to Media Service, SVG preservation)
   ├── Interactive Tables (ASCII grids, pipe tables, tab-delimited matricies → HTML <table>)
   ├── Mathematical Equations (LaTeX $$...$$, inline $...$, superscripts, subscripts)
   ├── Code Snippets (Multi-line blocks, language detection → <pre><code>)
   ├── Figures & Captions (Figure labels, callouts, source disclosures)
   └── Document Metadata (Title, author, creation date suggestions)
   ↓
5. Layout Normalization (Strip page headers/footers, page numbers, duplicate brand logos)
   ↓
6. Pre-Ingestion Quality Inspection & Diagnostics Report
   ↓
7. Author Interactive Preview & Element Selection Modal
   ↓
8. Semantic Ingestion into Gazette Editor Canvas
```

### 10.2 Three Outcome Tiers for Ingested Elements
* **✅ Converted**: Semantic text, structured headings, clean hyperlinks, responsive tables, formatted bullet/numbered lists.
* **⚠️ Preserved with Review**: Complex equations (preserved as LaTeX block with review flag), ambiguous matrix layouts, low-confidence OCR text blocks.
* **❌ Unsupported / Stripped**: Unsafe embedded binaries, executable scripts/macros, repeating page header/footer stamps, redundant page numbers.

### 10.3 Pre-Ingestion Diagnostics Report Modal
Before committing imported content to the manuscript canvas, authors are presented with:
```text
DOCUMENT INGESTION REPORT
─────────────────────────────────────────────
File: 1Fi_SDE_Intern_Assignment.pdf
Pages: 3  |  Words: 514  |  Read Time: ~3 min

✓ 4 Major Section Headings detected
✓ 2 Numbered Step Blocks (1. Explore, 2. Add Marketplace)
✓ 3 Alpha Sub-Items (A. Top Brands, B. Nearby Stores, C. 1Fi Marketplace)
✓ 2 Unordered Bullet Lists (6 total list items)
✓ 1 Hairline Divider
✓ 2 External Hyperlinks linkified

Import Configuration:
☑ Import Headings & Text
☑ Import Lists & Steps
☑ Import Tables & Matricies
☑ Import Hyperlinks
☑ Remove Repeating Page Numbers & Footers

[ Cancel ]                        [ Ingest into Manuscript ]
```

---

*This specification is architecturally complete, frozen, and ready to guide implementation.*
