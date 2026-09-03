# The Gazette — UI/UX Implementation Playbook (`UI_implementation.md`)

This document is the authoritative implementation playbook for The Gazette's frontend UI/UX decisions. It maps concrete product problems to specific solutions, enforcing three hard principles:

> **Gazette design system > component library**
> **Core functionality > visual effects**
> **Measured performance > absolute claims**

---

## The Anti-Overload Editorial Standard

The Gazette's visual language is:

```
Gazette
→ typography
→ whitespace
→ hairlines
→ asymmetry
→ restrained imagery
```

NOT:

```
SaaS
→ glass cards
→ glow borders
→ heavy shadows
→ bento everywhere
→ hover lift on every element
```

**When evaluating any UI addition, apply these three gates:**

1. Does it enhance reader focus or UX?
2. Is it subtle, fast, and non-distracting?
3. Does it preserve editorial elegance?

All three must be YES. Otherwise reject or simplify.

---

## Tooling Classification: Three Distinct Tiers

Before the problem matrix, the tools are explicitly classified so they are never confused in implementation:

```
CORE (always loaded, every user)
├── shadcn/ui
├── Tailwind CSS
├── Motion (framer-motion)
├── TipTap
├── TanStack Query
└── Zustand

PRODUCT TOOLS (npm installed, small footprint)
├── Driver.js (~5 KB)
└── Bklit UI (modular chart components)

SELECTIVE UI (copy-paste only, never globally installed)
├── Kokonut UI → borrow interaction patterns, apply Gazette styling
├── Skiper UI → borrow layout behavior, remove glassmorphism/glow
├── Canvas UI → React.lazy(), special editions only
└── ThreeUI → React.lazy(), special 3D editorial experiences only

SPECIALIZED ANIMATION (reserve; use Motion first)
├── Anime.js → SVG path tracing where Motion is insufficient
└── Animmaster → reference pattern only; implementation via Motion.dev

AI (server-side only, 0 client bundle impact)
├── Ollama → server-side model runner; requires compute/storage
└── Langflow → optional future AI workflow orchestration

DEVELOPMENT TOOLS (never enter production bundle)
├── React Doctor → audit tool, run during development
├── Archify → engineering documentation diagrams
├── OpenDesign → design system workflow
└── OpenHands → AI-assisted development assistant

REFERENCE CATALOGS (zero runtime dependency)
├── Design Engineer Tools → fonts, easing, color inspiration
├── Public APIs → API discovery catalog
├── Awesome LLM Apps → AI architecture reference
├── Awesome MCP Servers → AI tooling reference
└── Free-for.dev → free infrastructure discovery

FUTURE / CONTROLLED
└── Scrapling → controlled web ingestion with full governance
```

---

## Removal Plan Rule

**Every third-party tool must have a removal plan.**

If this library disappears tomorrow, can The Gazette still function?

| Tool | Removable Without Core Breakage? |
|---|---|
| Motion | Yes — CSS transitions fallback |
| Driver.js | Yes — remove tours, feature still works |
| Bklit UI | Yes — revert to text stats |
| Kokonut UI | Yes — copy-paste, no import dependency |
| Canvas UI | Yes — lazy-loaded, special editions only |
| Ollama | Yes — AI features degrade gracefully to manual workflow |

---

## Corrected Problem & Solution Matrix (16 Items)

---

### 1. React Component Re-Render & Effect Cleanup Issues

* **Pages Affected:** [`ArticleEditorPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx), [`ArticleReaderPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleReaderPage.tsx)
* **The Problem:** Rapid typing in TipTap or long article scrolling can trigger unnecessary child re-renders from unstable object/function prop references. SSE notification subscriptions may leak if `useEffect` cleanup is missing.
* **Tool Used:** **React Doctor** (`https://www.react.doctor/`) — development audit only, 0 KB production impact.
* **How It Solves the Issue:**
  1. Identifies unstable prop references causing unnecessary re-renders.
  2. Detects missing cleanup in scroll listeners and SSE subscriptions.
  3. Recommends targeted `useMemo` and `useCallback` placements.
* **Goals (not guarantees):**
  * Minimize unnecessary re-renders in the editor.
  * Detect risky effect/cleanup patterns.
  * Verify editor responsiveness through browser profiling after fixes.
* **Note:** React Doctor identifies patterns. Actual performance validation requires browser DevTools profiling.

---

### 2. Abrupt Page Transitions & Modal Entry/Exit

* **Pages Affected:** All pages — modals, drawers, navigation tabs, dialogs.
* **The Problem:** Page navigation and modal overlays (Document Import, Media Picker, Notifications) snap without any physics, making the app feel static.
* **Tool Used:** **Motion** (`https://motion.dev/`) — core dependency.
* **How It Solves the Issue:**
  1. Spring-physics DOM transitions (`initial`, `animate`, `exit`, `layoutId`).
  2. Shared layout transitions for tab and active-state navigation.
  3. Smooth modal entry/exit with natural deceleration.
* **Hard Rules:**
  * Motion is the **primary and only** animation system for standard UI. Do not simultaneously use Anime.js + Animmaster + Motion for normal UI interactions.
  * All animations must respect `prefers-reduced-motion` media query.
  * No animation may delay user interaction.

---

### 3. Flat Homepage Layout — No Editorial Hierarchy

* **Page Affected:** [`HomePage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/HomePage.tsx)
* **The Problem:** Standard article feeds look identical to lead stories. The homepage feels like a blog list, not an editorial front page.
* **Tool Used:** **Skiper UI** (`https://skiper-ui.com/components`) — layout behavior reference only.
* **How It Solves the Issue:**
  1. Borrow the **asymmetric grid layout behavior** from Skiper — not its visual aesthetic.
  2. The target layout is an **Asymmetric Editorial Grid**, not a SaaS Bento Grid.
  3. Remove all glassmorphism, rounded card glows, and shadow lifts from any borrowed component.
  4. Apply The Gazette's own typography, hairlines, and whitespace to the borrowed structure.
* **The Target Editorial Composition:**
  ```
                      THE GAZETTE
  ─────────────────────────────────────────────
                LEAD STORY
         large editorial composition

  ────────────────────┬────────────────────────
  SECONDARY STORY     │  SECONDARY STORY
                      │
  ────────────────────┼────────────────────────
                   TRENDING
                   01
                   02
                   03
  ─────────────────────────────────────────────
  LATEST
  ─────────────────────────────────────────────
  ```
* **Rule:** If a Skiper component cannot be adapted to match the Gazette editorial language without heavy rework, build the layout natively instead.

---

### 4. Card Visuals & Form Controls Lacking Polish

* **Pages Affected:** [`ArticleEditorPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx), `UserSettingsPage.tsx`
* **The Problem:** Standard form controls and content inputs lack refined interaction feedback.
* **Tool Used:** **Kokonut UI** (`https://kokonutui.com/`) — copy-paste patterns only.
* **What We Borrow from Kokonut:**
  * Interaction patterns (focus rings, tab/keyboard navigation behavior).
  * Input micro-interactions (label float, validation feedback animations).
  * Specialized toggle and switch controls.
* **What We Do NOT Import from Kokonut:**
  * Glassmorphism surfaces.
  * Glowing action buttons.
  * Any component that overrides The Gazette's visual language.
* **Rule:** Borrow behavior. Apply Gazette styling. Never import Kokonut's aesthetic.

---

### 5. Author Dashboard & Admin Analytics Are Bare Text Numbers

* **Pages Affected:** [`UserDashboardPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/user/UserDashboardPage.tsx), `NewsletterManagerPage.tsx`
* **The Problem:** Author performance data (views, likes, subscriber growth) is shown as flat numbers with no visual trend context.
* **Tool Used:** **Bklit UI** (`https://bklit.com/`) — for editorial analytics only.
* **How It Solves the Issue:**
  1. Sparkline charts for article view trends over time.
  2. Progress rings for campaign open rates.
  3. Area graphs for subscriber growth.
* **Important Distinction — When Charts vs Tables:**
  ```
  Reader analytics      → chart (trend matters)
  Newsletter open rate  → chart (comparison matters)
  Queue status          → table (precision matters)
  Failed jobs           → table (action required)
  DB replication status → status matrix + small sparkline
  ```
* **Rule:** Use visualization only when the visual encoding provides more value than a number or table.

---

### 6. System Monitoring Numbers Jump Without Context

* **Pages Affected:** [`UserDashboardPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/user/UserDashboardPage.tsx), [`JobsManagerPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/JobsManagerPage.tsx)
* **The Problem:** Meaningful dynamic metrics (Reads, Published Stories, Active BullMQ Jobs) snap to new values instantly.
* **Tool Used:** **NumberFlow** from Design Engineer Tools (`https://designengineer.tools/`).
* **How It Solves the Issue:** Smooth odometer-style digit transitions on meaningful metric changes.
* **Use Sparingly — Only For:**
  * Total reads / views / likes
  * Published story count
  * Queue job depth
  * Campaign recipient count
* **Do NOT Animate:**
  * Article IDs, page numbers, timestamps, static counters.

---

### 7. New Authors Are Overwhelmed by the Writing Studio

* **Page Affected:** [`ArticleEditorPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx)
* **The Problem:** New authors cannot discover multi-format Document Import, native video streaming, and publishing slot controls without guidance.
* **Tool Used:** **Driver.js** (`https://driverjs.com/`) — ~5 KB npm package.
* **How It Solves the Issue:**
  * Step 1: Title & Subtitle input.
  * Step 2: TipTap formatting toolbar.
  * Step 3: Document Import (`.docx`, `.pdf`, `.md`, `.txt`).
  * Step 4: Native Video Upload (`.mp4`, `.webm`, `.mov`).
  * Step 5: Publishing Slot Clearance & Submit controls.
* **Tour State Persistence (Required):**
  ```
  userFeatureTour:
    editorIntro: completed / not-started
    mediaTour: completed / not-started
    adminTour: completed / not-started
  ```
  * First visit: tour runs automatically.
  * Returning user: tour does not run.
  * New major feature release: optional "What's New?" prompt.

---

### 8. Reading Progress is Invisible in Long-Form Articles

* **Page Affected:** [`ArticleReaderPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleReaderPage.tsx)
* **The Problem:** Readers of 10-minute investigative stories have no indicator of progress or article structure.
* **Reference:** Animmaster Lib (`https://animmasterlib.dev/scroll`) — pattern reference only.
* **Implementation:** Native **Motion** `useScroll` and `useTransform` hooks.
* **Note:** We reference Animmaster for the scroll-driven pattern. We implement using Motion. These must not be confused.
* **How It Solves the Issue:**
  1. 2px crimson progress bar at the top header (`#881337`), synchronized with scroll position.
  2. Scroll-triggered opacity reveals for pull-quotes and editorial callouts.
* **Engagement Actions (Restrained):**
  * Desktop: subtle side rail with Bookmark, Like, Share.
  * Mobile: compact inline actions, not a floating overlay.
  * No large glassmorphism widget permanently hovering over article text.
* **Rule:** The reader's primary task is reading. Engagement actions are secondary and must never compete with text.

---

### 9. Complex SVG Masthead Animations Require Path Precision

* **Pages Affected:** Header masthead, special edition loading sequences.
* **The Problem:** Standard CSS keyframes cannot achieve high-precision SVG stroke path tracing or morphing for editorial branding moments.
* **Tool Used:** **Anime.js** (`https://animejs.com/`) — reserve only.
* **Usage Rule:**
  * **First:** Evaluate whether Motion can handle the SVG animation.
  * **Only if Motion is insufficient:** Use Anime.js for the specific SVG interaction.
  * Anime.js is a specialized SVG reserve tool, not a core Gazette animation dependency.
  * Do not introduce Anime.js for UI transitions already covered by Motion.

---

### 10. Absence of Live Editorial Data in Publication Header

* **Page Affected:** [`HomePage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/HomePage.tsx) — edition-specific only.
* **The Problem:** The Gazette header lacks real-time editorial data contextually relevant to the current story or edition.
* **Reference:** Public APIs Catalog (`https://github.com/public-apis/public-apis`).
* **IMPORTANT — Not a General Ticker:**
  * Do NOT add a permanent weather/market ticker to the standard homepage header.
  * Generic market/weather tickers make The Gazette resemble MSN or a news portal, not an editorial publication.
* **Correct Approach — Edition-Specific Data:**
  ```
  Finance edition     → market data ticker
  Climate report      → weather/environmental data
  Election coverage   → live results feed
  Travel feature      → destination weather
  ```
  External data must support the journalism. It is not a permanent UI element.

---

### 11. AI Writing Assistance for Authors

* **Page Affected:** [`ArticleEditorPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleEditorPage.tsx)
* **The Problem:** Authors manually draft SEO metadata, headline variations, and article summaries.
* **Tool Used:** **Ollama** (`https://github.com/ollama/ollama`) — server-side only.
* **How It Solves the Issue:**
  1. AI assistant drawer offering "Generate 3 Headline Options" and "Auto-Summarize" as assistive suggestions.
  2. NestJS `AiAssistantService` connects to `http://localhost:11434` (local) or a cloud endpoint (production VPS).
  3. 5-second timeout guard: if Ollama is unavailable, the editor continues fully without AI features.
* **Bundle Impact:** 0 client-side bundle impact. AI processing is entirely server-side.
* **Infrastructure Reality:** Ollama requires server-side model storage, RAM, and CPU/GPU. Not infrastructure-free.
* **Governance Rule:**
  ```
  AI suggests → Author reviews → Author publishes
  ```
  AI output is never published automatically without author review.

---

### 12. Web Article Import (URL Ingestion Feature)

* **Page Affected:** [`DocumentImportModal.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/editor/DocumentImportModal.tsx)
* **The Problem:** Authors manually copy-paste web research articles, losing formatting and attribution.
* **Tool Used:** **Scrapling** (`https://github.com/d4vinci/Scrapling`) — future / controlled.
* **Required Governance Before Implementation:**
  ```
  URL validation
  SSRF protection (block internal network addresses)
  Redirect chain validation
  robots.txt / policy considerations
  Copyright warning to author
  Source attribution preservation
  Rate limiting per user
  Full HTML sanitization pipeline
  Content review modal before TipTap injection
  ```
* **Feature Positioning:** This is a **research import assistant**, not a content copy tool.
  * Import must surface in the Document Import review modal with source URL preserved.
  * Author must explicitly confirm imported content before use.
  * Do not implement until SSRF protection and sanitization are in place.

---

### 13. Broken Article Layouts When Media Assets Are Deleted

* **Pages Affected:** [`HomePage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/HomePage.tsx), [`ArticleReaderPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleReaderPage.tsx)
* **The Problem:** Deleted Media Library assets cause referencing articles to render broken image icons or collapsed containers.
* **Tool Used:** `useState(imgErr)` graceful fallback pattern + WCAG contrast-compliant placeholder styling.
* **UI Fallback:**
  * `onError` handler replaces broken image with a clean styled box: `"COVER IMAGE UNAVAILABLE"`.
  * Uses high-contrast color tokens for WCAG AA/AAA compliance in both light and dark mode.
* **Data Lifecycle Fix (Required Beyond UI):**
  ```
  Media deleted
   → find referencing articles
   → mark asset as unavailable in article record
   → trigger admin notification
   → fallback rendering at display time
  ```
  The UI fallback is the final safety net. The data lifecycle fix is the primary solution.

---

### 14. Admin Systems Control — Complex 6-DB Mesh & Queue Visibility

* **Pages Affected:** [`DatabaseSwitcherPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/DatabaseSwitcherPage.tsx), [`JobsManagerPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/JobsManagerPage.tsx)
* **The Problem:** New administrators cannot understand the 6-Database Mesh roles or BullMQ queue lifecycle without documentation.
* **Tool Used:** **Driver.js** (interactive tours) + **Mermaid inline diagrams** (admin explanatory UI).
* **Important Distinction:**
  * **Archify** is an engineering documentation tool. Use it to generate architecture diagrams for `/docs/ARCHITECTURE_DIAGRAMS.md`.
  * **Mermaid** renders inline static flow diagrams in the Admin Panel UI as explanatory content.
  * The production Admin Panel must not depend on Archify as a runtime tool.

---

### 15. Special Edition Data Journalism Visual Experiences

* **Pages Affected:** Special edition articles in [`ArticleReaderPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/ArticleReaderPage.tsx).
* **The Problem:** Data journalism articles (climate reports, election coverage, economic analyses) require interactive canvas graphics without loading heavy 3D engines.
* **Tool Used:** **Canvas UI** (`https://canvasui.dev/`) — `React.lazy()` only.
* **How It Solves the Issue:**
  1. Lightweight HTML5 `<canvas>` interactive data infographics.
  2. Loaded only for specific special edition article routes via `React.lazy()`.
  3. Fallback: HTML table/chart rendering for low-power mobile browsers.
* **Bundle Impact:** Not included in the initial critical bundle. Downloaded only when the feature loads.

---

### 16. Generic 404 Error Page

* **Page Affected:** [`NotFoundPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/NotFoundPage.tsx)
* **The Problem:** Standard 404 pages are dead ends with no brand presence.
* **Tool Used:** **ThreeUI** (`https://threeui.com/browse`) — `React.lazy()` only.
* **Conditional Rendering Rules:**
  ```
  Desktop, sufficient GPU      → subtle 3D floating newspaper scene
  Mobile / low-power device    → static editorial illustration
  prefers-reduced-motion       → static illustration only
  ```
* **Bundle Impact:** Not included in the initial critical bundle. Code-split via `React.lazy()`.

---

## Detailed 5-Phase Implementation Roadmap

Every phase has concrete deliverables, guardrails, and exit criteria. No phase begins until the preceding phase's exit criteria are verified.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          THE GAZETTE 5-PHASE ROADMAP                        │
├──────────────┬──────────────┬──────────────┬──────────────┬─────────────────┤
│   PHASE 1    │   PHASE 2    │   PHASE 3    │   PHASE 4    │     PHASE 5     │
│  Foundation, │ Interaction, │  Editorial   │   Pipeline   │   Advanced &    │
│  Resilience  │  Motion &    │  Layout &    │  Governance  │   AI Studio     │
│ & A11y Audit │  Onboarding  │  Analytics   │ & Ingestion  │  (Code-Split)   │
└──────────────┴──────────────┴──────────────┴──────────────┴─────────────────┘
```

---

### Phase 1: Core Foundation, Accessibility & Stability (The Essentials)
*Goal: Zero visual bugs, complete layout resilience, normalized design tokens, and accessibility compliance.*

* [ ] **Design Token Normalization:**
  * Standardize editorial typography scales, spacing units, and hairline border colors across `index.css`.
  * Ensure consistent color tokens across both Light and Dark editorial palettes.
* [ ] **Accessibility & Motion Compliance:**
  * Implement `@media (prefers-reduced-motion: reduce)` across all CSS transitions and ticker animations.
  * Audit color contrast with Color.review standards (WCAG AA/AAA compliance for all body and meta text).
* [ ] **Layout & Image Resilience:**
  * Standardize `onError` fallback handling across all image containers (homepage cards, reader hero, user avatars in `UserLayout.tsx`).
  * Display clean monospace placeholder containers (`"COVER IMAGE UNAVAILABLE"`) so broken assets never break layouts.
* [ ] **React Doctor Quality Audit:**
  * Run React Doctor audit on `ArticleEditorPage.tsx` and `ArticleReaderPage.tsx`.
  * Fix unmemoized prop references causing re-render cascades.
  * Ensure all `useEffect` scroll listeners and SSE notification subscriptions have explicit cleanup returns.
* [ ] **UI State Normalization:**
  * Add uniform skeleton loading, empty state illustrations, and error banners to all data-fetching pages.

*Phase 1 Exit Criteria:* All pages render stably with zero broken images, zero unhandled errors, full reduced-motion support, and passing React Doctor audit.

---

### Phase 2: Core Interaction, Motion Framework & Onboarding
*Goal: Fluid spring transitions, guided onboarding for authors, and dynamic metric feedback.*

* [ ] **Motion.dev Primary Engine Setup:**
  * Configure Motion as the single animation system for all standard UI components.
  * Implement gentle spring presets for modal overlays (Document Import, Media Picker, Notifications Drawer).
  * Add shared layout glide transitions (`layoutId`) for navigation tabs.
* [ ] **Driver.js Author Onboarding Engine:**
  * Build 5-step guided tour on `ArticleEditorPage.tsx` (Title → Toolbar → Document Import → Native Video → Review Submission).
  * Build admin walkthrough on `DatabaseSwitcherPage.tsx` explaining 6-DB mesh roles.
  * **Tour State Persistence:** Store completion state (`userFeatureTour: { editorIntro: 'completed' }`) so returning authors are never interrupted.
* [ ] **NumberFlow Metric Animations:**
  * Add smooth odometer rolling transitions to author reads, followers, and published counts on `UserDashboardPage.tsx`.
  * Add dynamic counter transitions to BullMQ queue depth counters on `JobsManagerPage.tsx`.
  * *Guardrail: Strictly avoid animating static IDs, timestamps, or table row counters.*

*Phase 2 Exit Criteria:* Smooth modal transitions, working Driver.js tour with persistent completion flag, and functional NumberFlow metrics without layout jank.

---

### Phase 3: Editorial Layout Refinements & Component Upgrades
*Goal: Asymmetric front page composition, restrained reader progress, and actionable analytics.*

* [ ] **Asymmetric Editorial Grid (`HomePage.tsx`):**
  * Borrow structural grid layout from Skiper UI while strictly applying Gazette typography and hairlines.
  * Establish clear visual hierarchy: Lead Story Hero → Secondary Story Columns → Trending List (01..03) → Latest Stream.
  * *Guardrail: Zero glassmorphism, zero neon glows, zero bloated card padding.*
* [ ] **Kokonut UI Form & Input Refinements:**
  * Upgrade form inputs and toggles in `ArticleEditorPage.tsx` and `UserSettingsPage.tsx` using Kokonut interaction patterns.
  * Apply Gazette high-contrast focus rings and clean label transitions.
* [ ] **Article Reader Scroll Experience (`ArticleReaderPage.tsx`):**
  * Implement 2px top crimson progress bar using native Motion `useScroll`.
  * Add restrained side action rail (desktop) and compact inline bar (mobile) for bookmarking, liking, and sharing.
  * Implement scroll-triggered text opacity reveal on key editorial pull-quotes.
* [ ] **Bklit UI Editorial Analytics:**
  * Add sparkline charts for story view trends and subscriber growth on `UserDashboardPage.tsx` and `NewsletterManagerPage.tsx`.
  * *Guardrail: Keep system monitoring (BullMQ queue depth, failed jobs, replication status) as dense, clean tables.*

*Phase 3 Exit Criteria:* Front page matches high-end editorial standards, reader progress is smooth, and author metrics provide visual trend context without clutter.

---

### Phase 4: Pipeline Governance & Media Architecture
*Goal: Cloud media durability, secure web ingestion, and contextual data feeds.*

* [ ] **Cloudinary / Object Storage Migration:**
  * Decouple media storage from local server disk to Cloudinary / S3.
  * Configure auto-responsive image delivery (`f_auto,q_auto,w_800`) for article covers and thumbnails.
* [ ] **Scrapling Web Article Ingestion (Controlled Feature):**
  * Build URL research import in `DocumentImportModal.tsx`.
  * **Strict Governance Checklist:**
    * SSRF protection (block private IP/internal network addresses).
    * Redirect chain validation and domain allowlist/blocklist.
    * Explicit copyright/attribution warning shown to the author before import.
    * Full HTML sanitization pipeline before TipTap injection.
    * Run via isolated BullMQ background job with timeout limits.
* [ ] **Edition-Specific Public API Feeds:**
  * Add contextual live data widgets on `HomePage.tsx` for specific editions only (e.g., financial indices for market coverage, climate weather data for environmental features).
  * Wrap in silent `try/catch` with automatic fallback to internal breaking news marquee if external APIs fail.

*Phase 4 Exit Criteria:* Uploads persist in cloud storage, URL research import passes all SSRF and sanitization tests, and external API feeds fail silently without breaking pages.

---

### Phase 5: Advanced Specialized Experiences & AI Studio (Optional & Code-Split)
*Goal: Progressive enhancement, intelligent writing assistance, and memorable micro-moments.*

* [ ] **Ollama Local AI Writing Studio:**
  * Add assistive AI drawer to `ArticleEditorPage.tsx` for 1-click headline variations and story summaries.
  * Connect NestJS to `http://localhost:11434` with strict 5-second timeout guard and graceful manual fallback.
  * *Guardrail: 0 client-side bundle impact (all server-side). AI suggestions are strictly advisory and require author confirmation.*
* [ ] **ThreeUI Interactive 404 Experience (`NotFoundPage.tsx`):**
  * Build subtle 3D floating newspaper page responding to cursor movement.
  * Code-split via `React.lazy()` (0 KB impact on critical initial bundle).
  * Automatically fallback to static editorial illustration on mobile, low-power devices, or when `prefers-reduced-motion` is active.
* [ ] **Canvas UI Data Journalism Overlays:**
  * Provide lazy-loaded HTML5 canvas infographics for special investigative series.
  * Include fallback data tables for unsupported browsers.
* [ ] **Anime.js Reserve Evaluation:**
  * Test whether Motion can achieve the required Gazette masthead SVG path tracing.
  * Only introduce Anime.js if Motion proves strictly incapable of the vector path morphing.

*Phase 5 Exit Criteria:* AI studio works offline with fallback, 3D/canvas features load on-demand without slowing core bundles, and all interactive features gracefully degrade.

---

## Corrected Tool Classification Summary

| Tool | Tier | Use Case | Bundle Impact |
|---|---|---|---|
| **shadcn/ui** | Core | Base UI primitives | Core |
| **Motion** | Core | Primary animation system | Core |
| **TipTap** | Core | Rich-text editor | Core |
| **Driver.js** | Product | Onboarding tours, tour state persistence | ~5 KB |
| **Bklit UI** | Product | Editorial analytics charts | Modular |
| **NumberFlow** | Product | Meaningful dynamic metric transitions | ~3 KB |
| **Skiper UI** | Selective | Layout behavior reference only (not aesthetic) | 0 KB (Copy-Paste) |
| **Kokonut UI** | Selective | Interaction patterns only (not glassmorphism) | 0 KB (Copy-Paste) |
| **Canvas UI** | Selective | Special edition data journalism | Not in initial bundle |
| **ThreeUI** | Selective | 3D editorial experiences, 404 | Not in initial bundle |
| **Anime.js** | Reserve | SVG path animation where Motion is insufficient | ~14 KB (if needed) |
| **Animmaster** | Reference | Scroll pattern reference; implement via Motion | 0 KB (pattern only) |
| **Ollama** | AI (server) | Local AI writing assistance | 0 client KB; server-side compute |
| **Scrapling** | Future | Governed web content ingestion | Worker task |
| **React Doctor** | Dev Tool | Component audit | 0 KB |
| **Archify** | Dev Tool | Engineering documentation diagrams | 0 KB |
| **Public APIs** | Reference | Edition-specific live data integration | 0 KB (fetch calls) |
