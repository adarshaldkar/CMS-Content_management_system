# The Gazette — UI Phase 4: Command Palette, Reader Experience Suite & Visual Revision Diffing

**Document:** `implemented/UI_phase4.md`  
**Phase:** 4 of 5  
**Focus:** RBAC-Aware Command Palette (`Ctrl+K`), Contextual Actions, Reader Experience Suite (Typography, Progress & Deep-Linkable TOC), and Semantic Revision Diffing  
**Status:** Refined, Frozen & Approved for Implementation  
**Standard:** Strict Local Execution — Zero External CDNs, Zero Uncalibrated Third-Party Bloat  

---

## 1. Executive Summary & Phase Objectives

Phase 4 transforms **The Gazette** into a fast, reader-customizable, and editorially rigorous digital publishing platform. It introduces a universal **RBAC-Aware Command Palette (`Ctrl + K` / `Cmd + K`)** for instant keyboard navigation, a **Reader Experience Suite** that allows users to adjust typography and navigate via deep-linkable table of contents, and an **Editorial Visual Revision Diff Viewer** for inspecting draft changes before publication.

### Surface & Capability Boundaries:
* **Reader-Facing Surface:** In-article typography controls, single shared reading progress bar, deep-linkable scroll-spy TOC, and public command palette search.
* **Author-Facing Surface:** Manuscript quick actions, in-editor contextual commands (*Save Draft*, *Submit for Review*, *Insert Media*), and personal revision history.
* **Editor & Admin Surface:** RBAC-protected system commands (*Database Mesh Switcher*, *Queue Triage*, *User Management*), unified/split visual revision diffs, and non-destructive version rollbacks.

### Core Architectural Rules for Phase 4:
1. **RBAC & Context-Aware Command Palette:** Palette actions are filtered against user role permissions (Public / Author / Editor / Super Admin) and dynamic page context (Article Reader vs TipTap Studio vs Admin). The dialog container maintains `role="dialog"` with focus trapping; the search input maintains `role="combobox"`.
2. **Semantic TipTap Document Diffing:** Diffs are computed on semantic document nodes (paragraphs, headings, lists, embeds) rather than naive raw HTML strings, preventing broken tags or corrupt formatting.
3. **Non-Destructive Revision Rollback:** Reverting to a prior revision never overwrites or destroys historical snapshots. It creates a brand-new revision snapshot (e.g. `v14` cloned from `v12`) with explicit confirmation.
4. **Controlled Reader Preferences & Reset:** Controlled 3-typeface modes (*Newsreader Serif*, *Plus Jakarta Sans*, *JetBrains Mono*) and font scales (*S*, *M*, *L*, *XL*) persisted in `localStorage` with a 1-click **"Reset to Defaults"** action.
5. **Structural Threshold for Table of Contents:** TOC renders only when articles contain &ge; 3 meaningful `<h2>`/`<h3>` headings, with sanitized deep-linkable URL hashes (e.g. `/articles/slug#system-consensus`).

---

## 2. Phase 4 Architecture Overview

```text
                                  UI PHASE 4 ARCHITECTURE
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼─────────────────────────┐ ┌──────────▼────────────────────────┐ ┌───────────▼────────────────────────┐
│ 1. RBAC COMMAND PALETTE       │ │ 2. READER EXPERIENCE SUITE        │ │ 3. SEMANTIC REVISION DIFF VIEWER   │
├───────────────────────────────┤ ├───────────────────────────────────┤ ├──────────────────────────────────┤
│ • Global Hotkey (Ctrl/Cmd + K)│ │ • Shared Reading Progress Bar     │ │ • Semantic TipTap Node Tokenizer   │
│ • Role-Based Action Filtering │ │ • Controlled 3-Typeface Modes     │ │ • Unified & Split Side-by-Side     │
│ • Contextual Command Injection│ │ • Font Scaler (S / M / L / XL)    │ │ • Word-Level Delta Highlighting    │
│ • Debounced Dynamic Search    │ │ • 1-Click "Reset to Defaults"     │ │ • Metadata & Word Count Diffs      │
│ • Clearable Local History     │ │ • Scroll-Spy TOC (>=3 Headings)   │ │ • Non-Destructive Version Rollback │
│ • Dialog + Combobox Semantics │ │ • Deterministic Deep-Link Hashes  │ │ • Confirmation Modal Safety Guard  │
└───────────────────────────────┘ └───────────────────────────────────┘ └──────────────────────────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │   4. VERIFICATION   │
                                  ├─────────────────────┤
                                  │ • Vitest Diff Suite │
                                  │ • Playwright E2E    │
                                  │ • Axe A11y Audit    │
                                  │ • Rollback Safety   │
                                  │ • Build (0 Errors)  │
                                  └─────────────────────┘
```

---

## 3. Detailed Component Specifications

---

### Task 4.1: RBAC & Context-Aware Command Palette (`Ctrl + K`)

#### Location:
* `client/src/components/common/CommandPaletteModal.tsx`
* `client/src/hooks/useCommandPalette.ts`
* `client/src/components/layout/Navbar.tsx`

#### Accessibility & Semantics:
* **Container:** `<div role="dialog" aria-modal="true" aria-labelledby="cmd-title">` with focus trapping and `Escape` key listener.
* **Search Input:** `<input role="combobox" aria-expanded="true" aria-autocomplete="list" aria-controls="cmd-list">`.
* **Results List:** `<ul id="cmd-list" role="listbox">` with active item aria-selected states.

#### RBAC Action Matrix:
| Role | Available Quick Actions |
| :--- | :--- |
| **Anonymous / Public** | Global search articles, jump to categories/desks, toggle dark/light theme, sign in / sign up. |
| **Author** | *All Public actions* + *Create New Story*, *Open Writer Studio*, *View My Drafts*, *Jump to Desk Analytics*. |
| **Editor** | *All Author actions* + *Open Editorial Review Queue*, *Manage Categories & Tags*, *Review Revision Diff*. |
| **Super Admin** | *All Editor actions* + *Switch Database Mesh*, *Jobs & BullMQ Triage*, *Newsletter Broadcast*, *Audit Explorer*, *User Management*. |

#### Dynamic Contextual Commands:
* **On Article Reader Page:** *Copy Article Link*, *Jump to Comments*, *Bookmark Story*, *Adjust Typography*, *Jump to Heading*.
* **On Writer Studio Page:** *Save Draft*, *Submit for Editorial Review*, *Import Document (.docx/.pdf)*, *Insert Video Embed*, *Preview Article*.
* **On Admin Pages:** *Filter DLQ Jobs*, *Inspect Database Health*, *Dispatch Newsletter Test*.

#### Search Performance & Privacy:
* **Local Actions:** Instant instant-match client filtering.
* **Database Queries:** 250ms debounced backend API search fetching top 6 matching stories/authors (prevents downloading large collections).
* **Recent Searches:** Stored locally in `localStorage`, never server-synced, with a clearable **"Clear Recent Searches"** button.

---

### Task 4.2: In-Article Reader Experience Suite

#### Location:
* `client/src/components/articles/ReaderPreferencesMenu.tsx`
* `client/src/components/articles/ReadingProgressBar.tsx`
* `client/src/components/articles/ArticleTableOfContents.tsx`
* `client/src/pages/ArticleReaderPage.tsx`

#### Technical Solution:
1. **Shared Reading Progress Bar (`ReadingProgressBar.tsx`):**
   - Single shared progress indicator mounted at the top edge of the viewport (`z-index: 60`, height: 2.5px).
   - Driven by passive scroll listeners and `requestAnimationFrame` batching for smooth rendering.
   - Respects `prefers-reduced-motion` with instantaneous width calculation.
2. **Reader Typography Controls (`ReaderPreferencesMenu.tsx`):**
   - **Typeface Modes (Strictly 3 Editorial Options):**
     - `newsreader` (Editorial Serif — *The Atlantic* print standard)
     - `jakarta` (Screen Sans — modern high-contrast readability)
     - `mono` (Technical Mono — code essays & architectural analyses)
   - **Font Size Scaler:** `small (15px)` · `default (18px)` · `large (21px)` · `xl (24px)`.
   - **Reading Width:** `standard (680px)` vs `wide (800px)`.
   - **Reset Control:** Single-click **"Reset to Defaults"** restoring `default / newsreader / standard`.
   - **State Persistence:** Keyed in `localStorage.getItem('thegazette_reader_prefs_v1')`.
3. **Deep-Linkable Scroll-Spy Table of Contents (`ArticleTableOfContents.tsx`):**
   - **Structural Threshold:** Evaluates parsed headings; renders sticky desktop sidebar only if **$\ge 3$ meaningful `<h2>`/`<h3>` headings exist**.
   - **Deterministic Slugs:** Sanitizes heading text into clean URL hash anchors (e.g. `## Real-Time Mesh Synchronization` &rarr; `#real-time-mesh-synchronization`).
   - **Scroll-Spy:** Uses `IntersectionObserver` on heading elements to dynamically highlight the current reading section.

---

### Task 4.3: Semantic Editorial Revision Diff Viewer

#### Location:
* `client/src/components/editor/RevisionDiffViewer.tsx`
* `client/src/utils/diffEngine.ts`
* `client/src/pages/ArticleEditorPage.tsx`
* `client/src/pages/admin/EditorialReviewPage.tsx`

#### Technical Solution:
1. **Semantic Node Tokenizer (`diffEngine.ts`):**
   - Tokenizes TipTap JSON blocks and prose paragraphs prior to diffing.
   - Computes word-level diffs while preserving block structures (headings, quotes, lists, media).
   - **Additions (`<ins>`):** Soft emerald highlight `#ecfdf5` with subtle green underline and `<span class="sr-only">Added:</span>`.
   - **Deletions (`<del>`):** Soft rose highlight `#fff1f2` with crimson strikethrough and `<span class="sr-only">Deleted:</span>`.
2. **Dual-Mode Diff Interface (`RevisionDiffViewer.tsx`):**
   - **Unified Inline View:** Single editorial column displaying inline changes with insertion/deletion markers.
   - **Split Side-by-Side View:** Synchronized dual-pane layout comparing *Base Snapshot (v12)* vs *Target Snapshot (v13)*.
   - **Metadata Delta Bar:** Displays word count delta ($\pm \Delta$ words), reading time changes, editor author, and timestamp.
3. **Non-Destructive Revision Rollback Guard:**
   - Clicking **"Revert to this Version"** triggers a confirmation modal:
     > *"Create a new draft revision (v14) based on snapshot v12? Existing revision history will be preserved."*
   - Authorized action creates a brand-new revision snapshot without mutating or destroying historical versions.

---

## 4. Accessibility & Contrast Standards

### WAI-ARIA Matrix:
* **Command Palette:** `role="dialog"` container with focus trap. Keyboard support: `Escape` closes, `ArrowDown`/`ArrowUp` cycles list items, `Enter` executes action. Focus restores to previously focused element upon modal close.
* **Reader Controls:** Native `<button>` elements with `aria-pressed` states for typography toggles; native slider with `aria-valuemin="15"` and `aria-valuemax="24"`.
* **Revision Diff:** Dual-encoded diffs pairing color with text strikethrough/underline and offscreen screen-reader text labels.

---

## 5. Verification & Testing Plan

### 1. Automated Unit Tests (Vitest)
* Semantic diff tokenizer: verifies word additions, deletions, multiline paragraphs, lists, and code blocks.
* Heading parser test: verifies deterministic heading slug generation, hierarchy parsing, and threshold suppression (&lt; 3 headings).
* Reader preferences reducer test: validates state serialization, default reset, and `localStorage` caching.

### 2. End-to-End Tests (Playwright)
* **Command Palette Flow:**
  1. Trigger `Ctrl + K` / `Cmd + K` &rarr; verify focus on search input.
  2. Type search query &rarr; verify debounced results.
  3. Cycle with `ArrowDown` &rarr; hit `Enter` &rarr; verify navigation.
  4. Verify Super Admin actions are hidden from unauthenticated guests.
* **Reader Experience Suite:**
  1. Toggle font size to `xl` &rarr; verify prose CSS class updates &rarr; reload page &rarr; verify persistence.
  2. Click "Reset to Defaults" &rarr; verify reset to 18px Newsreader.
  3. Click TOC heading link &rarr; verify smooth scroll to heading and URL hash update.
* **Revision Diff & Rollback Safety:**
  1. Open Revision Diff &rarr; switch between Unified and Split views.
  2. Click Revert &rarr; verify confirmation modal appears.
  3. Confirm revert &rarr; verify new revision `vN+1` is created while retaining old versions.

### 3. Build & Performance Budget
* Run `npm run build` in `client/` to verify **0 TypeScript errors**.
* Bundle overhead check: Confirm Phase 4 additions add minimal bundle footprint (< 15 kB combined gzipped).
