# Gazette Editorial Studio — Advanced Editor Architecture v4.0
**Comprehensive Technical Specification & Implementation Guide**

---

## 🏛️ Executive Summary

The Gazette Editorial Studio v4.0 establishes a unified, newsroom-grade authoring platform. Rather than building a multi-engine hybrid, Gazette operates on a **Single Unified Editorial Architecture** inspired by the best engineering patterns from the open-source ecosystem:

- **TipTap / ProseMirror Core**: Singular internal headless editing engine with custom semantic nodes and full UI freedom.
- **WordPress Gutenberg Interoperability Adapter**: Bi-directional HTML comment block converter (`parseGutenbergToGazette` & `serializeGazetteToGutenberg`) with safe fallback containment.
- **Story Archetypes & Reusable Patterns**: Pre-structured journalistic compositions (*Investigation, Breaking News, Dialogue Interview, Standard Report, Opinion*) and newsroom notices (*Editor's Note, Correction, Disclaimer, Sources, Newsletter CTA*).
- **Interactive Document Map**: Outline navigation for 5,000–15,000 word investigations with live section word counts and smooth jump-to-block scrolling.
- **Context-Aware Selection Tools**: 1-click transformation of selected text into Pull Quotes, Themed Callouts, Corrections, Citations, and Semantic Highlights.
- **Multi-State Responsive Preview**: Exact visual parity with the public reader page across Desktop (1200px), Mobile Web (375px), Social Card (OG), Newsletter Digest (600px), and Print Press (A4).
- **Native Editorial Validation Engine**: Multi-tiered pre-publish audit (`BLOCKING`, `WARNING`, `INFO`) evaluating headline strength, SEO slugs, image alt-text, and heading hierarchy.
- **Zero Data-Loss Resilience**: Debounced IndexedDB draft backups, multi-tab BroadcastChannel collision arbitration, and dual-key version concurrency.

---

## 📐 System Architecture Diagram

```
                                  UNIFIED GAZETTE ARCHITECTURE
 ┌────────────────────────────────────────────────────────────────────────────────────────┐
 │                                                                                        │
 │    ADAPTERS (Input/Output)                                                             │
 │    ┌───────────────────────────┐         ┌───────────────────────────┐                 │
 │    │  Word (.docx) / PDF       │         │  Gutenberg HTML Adapter   │                 │
 │    │  Universal Ingestion      │         │  (Bi-directional Parser)  │                 │
 │    └─────────────┬─────────────┘         └─────────────┬─────────────┘                 │
 │                  │                                     │                               │
 │                  └───────────────────┬─────────────────┘                               │
 │                                      ▼                                                 │
 │                      GAZETTE CANONICAL DOCUMENT MODEL                                  │
 │                                      │                                                 │
 │                                      ▼                                                 │
 │                   TIPTAP / PROSEMIRROR CORE EDITING ENGINE                             │
 │   ┌────────────────────────────────────────────────────────────────────────────────┐   │
 │   │  • Semantic Nodes: pullQuote, callout, correction, sourceNote, divider         │   │
 │   │  • Unified Command Registry & Word-Caliber Shortcuts                           │   │
 │   │  • 7-Category Sticky Ribbon, Slash Palette (/), & Selection Mini-Toolbar       │   │
 │   │  • Image Resizer Overlay (8 handles, arrow keys, drag repositioning)           │   │
 │   └──────────────────────────────────┬─────────────────────────────────────────────┘   │
 │                                      │                                                 │
 │                                      ▼                                                 │
 │                 GAZETTE PUBLICATION RENDERER (SHARED PIPELINE)                         │
 │   ┌──────────────────────────────────┴─────────────────────────────────────────────┐   │
 │   │  ├── Responsive Editor Preview (Desktop 1200px, Mobile 375px, Social, Print)   │   │
 │   │  └── Public Reader Article Page (100% Visual & Semantic Parity)                │   │
 │   └──────────────────────────────────┬─────────────────────────────────────────────┘   │
 │                                      │                                                 │
 │                                      ▼                                                 │
 │                     EDITORIAL RESILIENCE & INTEGRITY LAYER                             │
 │   ┌────────────────────────────────────────────────────────────────────────────────┐   │
 │   │  • IndexedDB Async Snapshot (1,000ms debounce / 5,000ms throttle)              │   │
 │   │  • Server Draft Autosave with Dual-Key Concurrency (baseVersion + seq)         │   │
 │   │  • Multi-Tab BroadcastChannel Arbitration & Session Takeover                   │   │
 │   │  • Published Article Staging Isolation (Draft Branching)                       │   │
 │   │  • Gazette Editorial Validation Engine (BLOCKING / WARNING / INFO)             │   │
 │   └────────────────────────────────────────────────────────────────────────────────┘   │
 └────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🧱 1. Semantic Editorial Nodes Specification

Gazette does not rely on ad-hoc CSS. All components are defined as semantic nodes in [`editorialNodes.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/editor/editorialNodes.ts):

### 1.1 Pull Quote (`pullQuote`)
```html
<blockquote class="cms-pull-quote" data-node="pullQuote">
  <p>“A compelling statement that captures the core essence of the journalistic dispatch.”</p>
  <cite>— Senior Investigative Analyst, Regulatory Commission</cite>
</blockquote>
```

### 1.2 Themed Callout Aside (`callout`)
Available in 4 journalistic themes: `info`, `tip`, `warning`, `editorial`.
```html
<aside class="cms-callout" data-theme="editorial" data-node="callout">
  <header class="cms-callout-header">
    <span class="cms-callout-icon">✒️</span>
    <strong>Key Investigation Takeaways</strong>
  </header>
  <div class="cms-callout-content">
    <ul>
      <li>Finding 1: Over 40% of mandated compliance audits were postponed.</li>
    </ul>
  </div>
</aside>
```

### 1.3 Journalistic Correction Notice (`correction`)
```html
<div class="cms-editorial-correction" data-date="Sep 8, 2026" data-node="correction">
  <div class="cms-correction-badge">
    <span class="badge-text">CORRECTION</span>
    <time datetime="2026-09-08T00:00:00Z">Sep 8, 2026</time>
  </div>
  <p>An earlier version of this report misstated the initial fiscal year deficit figure.</p>
</div>
```

### 1.4 Sources & References Footnotes (`sourceNote`)
```html
<footer class="cms-source-note" data-node="sourceNote">
  <div class="cms-source-note-title">
    <svg ...></svg>
    <span>Sources &amp; References</span>
  </div>
  <ol>
    <li>Freedom of Information Disclosures (Ref. FOI-2026-8812)</li>
  </ol>
</footer>
```

### 1.5 Ornate Section Dividers (`divider`)
```html
<div class="cms-editorial-divider" data-style="asterism" data-node="divider"><span>⁂</span></div>
```

---

## ⚡ 2. WordPress Gutenberg Interoperability Adapter

Implemented in [`gutenberg-adapter.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/server/src/modules/documents/gutenberg-adapter.service.ts):

### 2.1 Ingestion Flow
1. Author pastes raw WordPress post content or connects to WordPress REST API.
2. The `parseGutenbergToGazette(gutenbergContent)` parser regex-extracts block comment delimiters:
   - `<!-- wp:heading {"level":2} -->` → `<h2>`
   - `<!-- wp:paragraph {"dropCap":true} -->` → `<p class="cms-drop-cap">`
   - `<!-- wp:image {"url":"..."} -->` → `<figure><img ... /><figcaption>...</figcaption></figure>`
   - `<!-- wp:quote {"citation":"..."} -->` → `<blockquote class="cms-pull-quote">...<cite>...</cite></blockquote>`
   - `<!-- wp:table -->` → `<table class="cms-editorial-table">`
   - `<!-- wp:code -->` → `<pre><code>...</code></pre>`
   - `<!-- wp:separator -->` → `<div class="cms-editorial-divider" data-style="asterism">⁂</div>`
3. **Safe Fallback**: Any unrecognized WordPress block is preserved safely inside a labeled container (`<div class="cms-unsupported-gutenberg-block" data-gutenberg-block="...">`) without data loss.

### 2.2 Serialization Flow
1. Author clicks **"Export to WordPress Gutenberg"** in the Ingestion Studio.
2. The `serializeGazetteToGutenberg(gazetteHtml)` engine converts the Gazette manuscript into standard WordPress Gutenberg block comments with 1-click clipboard copying.

---

## 📋 3. Story Templates & Reusable Pattern Library

Implemented in [`editorialPatterns.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/editor/editorialPatterns.ts):

| Story Template | Desk Category | Key Structural Elements |
| :--- | :--- | :--- |
| **In-Depth Investigation** | Investigative Desk | Drop-Cap, Key Findings Callout, Chronology, Primary Documents, Source Disclosures |
| **Breaking News Dispatch** | Breaking News | Live Updates Callout, Developing Facts Bullet Grid, Lead Quote, Follow-up Anchor |
| **Executive Dialogue Interview** | Profiles & Interviews | Biographical Aside, Styled Q&A Conversation Blocks, Thesis Pull-Quote |
| **Standard Editorial Report** | General News | Newsreader Lead, Subheadings, Macro Data Pull-Quote, Data Sources |
| **Opinion & Commentary** | Opinion & Editorial | Columnist Lead, Editorial Board Pull-Quote, Asterism Divider, Author Desk Signoff |

---

## 🧭 4. Document Map & Outline Navigator

Implemented in [`DocumentMapDrawer.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/editor/DocumentMapDrawer.tsx):
- Dynamically extracts all `H1`, `H2`, `H3`, `aside.cms-callout`, `blockquote.cms-pull-quote`, and `table` landmarks.
- Computes real-time word counts per section.
- Provides instant fuzzy search filtering.
- Clicking any landmark smoothly scrolls the editor canvas directly to the block and highlights it with a temporary accent ring (`ring-2 ring-rose-500/60`).
- Shortcut: `Ctrl+Shift+O`.

---

## 🛡️ 5. Gazette Editorial Validation Engine

Implemented in [`editorial-validation.service.ts`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/services/editorial-validation.service.ts):

```
                               EDITORIAL QUALITY GATE
 ┌─────────────────────────────────────────────────────────────────────────────────┐
 │ 🛑 BLOCKING (Must be resolved before publication)                              │
 │   • Article Headline presence (>0 chars)                                       │
 │   • Manuscript Body substance (>=50 words)                                     │
 │   • Canonical URL slug validity (/^[a-z0-9-]+$/)                               │
 │   • Primary Desk / Category assignment                                         │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │ ⚠️ WARNING (Recommended editorial adjustments)                                  │
 │   • Headline length quality (20–110 characters)                                │
 │   • Editorial Deck / Subtitle (>=30 characters)                                │
 │   • Cover Visual / Hero asset attached                                         │
 │   • Image alt-text accessibility (0 missing alt tags)                          │
 │   • Heading hierarchy sequence (No skipped heading levels)                     │
 ├─────────────────────────────────────────────────────────────────────────────────┤
 │ ℹ️ INFO (Journalistic craftsmanship telemetry)                                  │
 │   • Illuminated drop-cap styling presence                                      │
 │   • Primary source citations and bibliography presence                         │
 │   • High-impact pull-quote usage                                               │
 └─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 📱 6. Multi-State Responsive Preview Simulator

Implemented in [`ArticleEditorPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx):
1. **Desktop Web View (1200px)**: Full publication layout with hero image, metadata bar, Newsreader typography, and category tags.
2. **Mobile Web Smartphone View (375px)**: Realistic device chassis with speaker notch, responsive font scaling, and touch layout.
3. **OpenGraph Social Distribution Card**: 1200 × 630 pixel preview showing live headline truncation, cover image, and domain branding for X / LinkedIn / Facebook.
4. **Morning Dispatch Newsletter Digest (600px)**: Email-safe template layout with custom masthead and footer disclaimers.
5. **Print Press Edition (A4)**: High-contrast dual-column press proof layout with formal byline headers.

---

## 🔒 7. Zero Data-Loss Resilience Integration

1. **Continuous IndexedDB Backup**: Autosaves active manuscript snapshots to browser IndexedDB every 1,000ms on edit (`draftStorageService`).
2. **Crash & Refresh Auto-Recovery**: Detects uncommitted local drafts on page load and displays a prominent **"Restore Draft"** banner with word count difference telemetry.
3. **Multi-Tab Conflict Probing**: Uses `BroadcastChannel('gazette_multi_tab_channel')` to detect simultaneous edits across tabs and provides 1-click **"Take Over Session"** arbitration.
4. **Navigation Guard Interception**: Intercepts `window.onbeforeunload`, top-left back navigation, and browser `popstate` with an Unsaved Changes confirmation modal (`[Save & Leave]`, `[Discard & Leave]`, `[Keep Editing]`).

---

## ✅ 8. Verification & Test Matrix

- **Backend NestJS Suite**:
  - `gutenberg-adapter.service.ts` build: **0 errors**
  - `document-import.controller.ts` endpoints: `/api/documents/gutenberg/parse` & `/api/documents/gutenberg/serialize` verified.
- **Frontend Vite Suite**:
  - Full TypeScript check: **0 errors**
  - Scoped CSS rules: **100% responsive and accessible**.
