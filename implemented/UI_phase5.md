# The Gazette — UI Phase 5: Advanced Specialized Experiences, Local AI Editorial Studio & 3D Interactive Canvas

**Document:** `implemented/UI_phase5.md`  
**Phase:** 5 of 5  
**Focus:** Local AI Writing Studio (Ollama), Code-Split 3D Interactive Canvas Experiences, Data Journalism Narrative Overlays, and Controlled Research Ingestion  
**Status:** Refined, Frozen & Approved for Implementation  
**Standard:** Strict Local Execution — Zero External CDNs, Zero Uncalibrated Third-Party Bloat, WCAG 2.2 AA Accessible  

---

## 1. Executive Summary & Phase Objectives

Phase 5 completes the vision for **The Gazette** by introducing advanced, progressive enhancements that empower editorial storytelling while preserving strict performance budgets, privacy standards, and accessibility guarantees. It integrates a **Local AI Writing Studio** powered by Ollama for advisory headline generation and SEO synthesis, code-split **3D Interactive Canvas Experiences** for memorable editorial moments, **Data Journalism Narrative Overlays** for investigative series, and a **Controlled URL Research Ingestion Assistant** with rigorous SSRF security guardrails.

### Surface & Capability Boundaries:
* **Editorial Studio Surface:** Assistive AI writing drawer in `ArticleEditorPage.tsx` (headline variations, SEO summaries, readability index, tone calibration), document research import with SSRF protection, and TipTap node injection.
* **Reader & Public Surface:** Lazy-loaded 3D interactive floating newspaper/globe canvas on `NotFoundPage.tsx` and interactive investigative narrative overlays with full static/tabular accessibility fallbacks.
* **Server & Infrastructure Surface:** NestJS Ollama gateway (`http://localhost:11434`) with strict 5-second timeouts, graceful manual fallback, and isolated BullMQ research scraping jobs.

### Core Architectural Rules for Phase 5:
1. **Zero Client-Side AI Bundle Overhead:** All AI inference and prompt orchestration are performed server-side via NestJS to local Ollama (`llama3:latest` / `mistral:latest`). Zero heavy AI libraries are bundled into the frontend client.
2. **Advisory-Only AI Guardrail:** AI outputs are strictly advisory suggestions. The author must explicitly click "Apply" or "Insert" to insert text into the TipTap manuscript; no automated silent content alterations are permitted.
3. **Mandatory `React.lazy()` Code-Splitting for 3D/Canvas:** All Three.js/Canvas modules must be loaded asynchronously on-demand via `React.lazy()` and `Suspense`, ensuring the core homepage and article reader bundle sizes remain lightweight (<550 KB).
4. **Graceful Degradation & Reduced Motion:** All 3D canvas elements must automatically degrade to static editorial SVG illustrations on mobile viewports (<768px), devices with low GPU memory, or when the user's OS has `prefers-reduced-motion: reduce` enabled.
5. **Rigorous SSRF & Sanitization Protection for Research Ingestion:** The research ingestion engine must block all private/internal IP ranges (`127.0.0.1`, `localhost`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`) and pass all extracted content through a strict DOMPurify sanitization pipeline with explicit source attribution.

---

## 2. Phase 5 Architecture Overview

```text
                                  UI PHASE 5 ARCHITECTURE
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼─────────────────────────┐ ┌──────────▼────────────────────────┐ ┌───────────▼────────────────────────┐
│ 1. LOCAL AI EDITORIAL DRAWER  │ │ 2. 3D INTERACTIVE CANVAS          │ │ 3. DATA JOURNALISM & RESEARCH      │
├───────────────────────────────┤ ├───────────────────────────────────┤ ├──────────────────────────────────┤
│ • 1-Click Headline Generator  │ │ • Lazy-Loaded Three.js Canvas     │ │ • Investigative Narrative Timelines│
│ • SEO Summary & Tag Synthesis │ │ • 3D Floating Newspaper Page      │ │ • Interactive Data Cards & Charts  │
│ • Readability & Tone Calibrator│ │ • Micro-Parallax Cursor Motion    │ │ • Screen Reader Table Fallbacks    │
│ • 5s Server Timeout Guardrail │ │ • Mobile & Reduced Motion Fallback│ │ • SSRF-Safe Web Ingestion Engine  │
│ • Strict Advisory Insert Flow │ │ • 0 KB Impact on Core Bundle      │ │ • DOMPurify & Attribution Badges   │
└───────────────────────────────┘ └───────────────────────────────────┘ └──────────────────────────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │   4. VERIFICATION   │
                                  ├─────────────────────┤
                                  │ • Vitest SSRF Suite │
                                  │ • Bundle Size Check │
                                  │ • Playwright E2E    │
                                  │ • Lighthouse >95    │
                                  │ • A11y WCAG 2.2 AA  │
                                  └─────────────────────┘
```

---

## 3. Detailed Component Specifications

---

### Task 5.1: Local AI Editorial Studio Drawer (Ollama & Smart Synthesis)

#### Location:
* `client/src/components/editor/AiAssistantDrawer.tsx`
* `client/src/api/ai.api.ts`
* `server/src/modules/ai/ai.service.ts`
* `server/src/modules/ai/ai.controller.ts`

#### Technical Specifications:
* **UI Drawer Component:** Slide-out right panel in `ArticleEditorPage.tsx` with smooth spring animation (`motion/react`).
* **Available AI Editorial Tools:**
  1. **Headline Workshop:** Generates 5 distinct headline angles (Direct/Journalistic, Analytical, Provocative/Engaging, SEO-Optimized, Short/Punchy).
  2. **Executive Summary & SEO Meta:** Generates a 150-character search engine description and 3-bullet executive summary.
  3. **Editorial Tone & Readability Score:** Computes Flesch-Kincaid grade level, average sentence length, passive voice count, and suggests stylistic refinements.
  4. **Section Expansion & Key Takeaways:** Generates suggested pull quotes or bulleted key takeaways based on manuscript body text.
* **Server Communication & Resilience:**
  - Calls `POST /api/ai/editorial-assist` with `{ action, manuscriptTitle, manuscriptContent }`.
  - Backend connects to local Ollama instance (`http://localhost:11434/api/generate`) with model `llama3:latest` (or `mistral:latest`).
  - **5-Second Timeout Protection:** If Ollama is offline or takes >5000ms, the API returns a structured HTTP 503 fallback with pre-calculated heuristic stats (word count, reading time, keyword density) without hanging the client.
* **Author Approval Guardrail:**
  - AI results render with an explicit **"Insert into Article"** or **"Use as Title"** button.
  - Zero automated silent document mutations.

---

### Task 5.2: Code-Split 3D Interactive Canvas Experience (`NotFoundPage.tsx`)

#### Location:
* `client/src/components/canvas/InteractiveNewspaperCanvas.tsx`
* `client/src/pages/NotFoundPage.tsx`

#### Technical Specifications:
* **Dynamic 3D Canvas Scene:**
  - A stylized 3D broadsheet newspaper page floating in subtle dark/light editorial space.
  - Features real Gazette typography texture rendered dynamically on a canvas mesh.
  - Gentle micro-parallax interaction responding smoothly to cursor position (`lerp` damping).
* **Bundle Budget & Code-Splitting:**
  - Loaded via `const InteractiveNewspaperCanvas = React.lazy(() => import('../components/canvas/InteractiveNewspaperCanvas'))`.
  - Wrapped in `<Suspense fallback={<EditorialIllustrationFallback />}>`.
  - Core bundle size impact: **0 KB** on initial page load.
* **Accessibility & Device Fallback Matrix:**
  - **Reduced Motion:** If `window.matchMedia('(prefers-reduced-motion: reduce)').matches`, 3D animation loop is disabled; renders static centered layout.
  - **Mobile / Touch Viewports (<768px):** Automatically renders the high-performance 2D SVG editorial illustration to preserve mobile battery and frame rate.
  - **WebGL Incompatibility:** Silent fallback if `WebGLRenderingContext` is unavailable.

---

### Task 5.3: Data Journalism Narrative Overlays & Visual Investigation Canvas

#### Location:
* `client/src/components/articles/DataJournalismOverlay.tsx`
* `client/src/components/articles/TimelineNarrativeCanvas.tsx`
* `client/src/pages/ArticleReaderPage.tsx`

#### Technical Specifications:
* **Narrative Timeline & Data Graphic:**
  - Supports deep-dive investigative pieces requiring milestone tracking or structured breakdown.
  - Renders interactive step cards with smooth hover micro-interactions.
* **Accessibility (WCAG 2.2 AA Standards):**
  - Every interactive visual element has a hidden `<div className="sr-only">` or accessible `<table>` equivalent containing the complete structured dataset.
  - All chart points and milestones are fully keyboard-navigable via Tab and Enter keys with distinct focus rings (`outline-accent-crimson`).

---

### Task 5.4: Controlled URL Research Ingestion & Scraping Assistant

#### Location:
* `client/src/components/editor/DocumentImportModal.tsx`
* `server/src/modules/scrapling/scrapling.service.ts`
* `server/src/modules/scrapling/scrapling.controller.ts`

#### Technical & Security Specifications:
* **SSRF (Server-Side Request Forgery) Defense Checklist:**
  1. Parse target URL and resolve hostname to IP.
  2. Reject all loopback, local, and private IPv4/IPv6 ranges (`127.0.0.0/8`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, `169.254.0.0/16`, `::1`).
  3. Enforce maximum response payload size limit (5 MB).
  4. Follow maximum 3 HTTP redirects, re-validating the resolved IP on every redirect hop.
* **Sanitization & TipTap Ingestion Pipeline:**
  - Cleans input through DOMPurify, removing `<script>`, `<iframe>`, `<style>`, and untrusted event handlers (`onload`, `onclick`).
  - Converts semantic article body into TipTap HTML nodes (headings, paragraphs, blockquotes, lists).
* **Source Attribution Badge:**
  - Automatically appends a standardized editorial citation block:
    `"Source Document: [Title] ([Domain]) — Imported on [Date] for Research Review."`

---

## 4. Implementation Step-by-Step Plan

```text
STEP 1: Backend AI & Scraping Services
  ├── 1.1: NestJS AI Module & Controller with Ollama integration & 5s timeout guard.
  ├── 1.2: NestJS SSRF-Protected URL Ingestion Controller with IP validation.
  └── 1.3: Vitest & Supertest unit tests verifying timeout resilience and SSRF rejection.

STEP 2: Frontend Local AI Editorial Assistant Drawer
  ├── 2.1: AiAssistantDrawer.tsx with 1-click headline workshop and summary generator.
  ├── 2.2: ai.api.ts client with structured error handling & offline fallback.
  └── 2.3: Integration into ArticleEditorPage.tsx toolbar.

STEP 3: 3D Interactive Canvas & 404 Experience
  ├── 3.1: InteractiveNewspaperCanvas.tsx using code-split Three.js / Canvas.
  ├── 3.2: Static editorial SVG fallback component for mobile & reduced motion.
  └── 3.3: React.lazy() integration in NotFoundPage.tsx.

STEP 4: Data Journalism Narrative Overlays & Research Import
  ├── 4.1: DataJournalismOverlay.tsx with accessible table fallback.
  ├── 4.2: DocumentImportModal.tsx URL research import tab with citation builder.
  └── 4.3: Integration into ArticleReaderPage.tsx and TipTap editor.

STEP 5: Verification, Benchmarks & Final Polish
  ├── 5.1: Verify 0 TypeScript and Vite compilation errors (`npm run build`).
  ├── 5.2: Lighthouse Performance & Accessibility audit (>95 score).
  └── 5.3: Playwright visual E2E verification.
```

---

## 5. Security, Bundle & Performance Budgets

| Metric / Guardrail | Target | Enforcement Strategy |
| :--- | :--- | :--- |
| **Initial JS Bundle Size** | `< 550 KB` | `React.lazy()` on 3D canvas and specialized modules |
| **AI Inference Timeout** | `&le; 5000 ms` | NestJS `AbortController` timeout + heuristic fallback |
| **Client AI Bundle Overhead** | `0 KB` | 100% server-side API processing |
| **SSRF Attack Surface** | `Zero Allowed` | Regex & IP CIDR subnet blacklisting in backend |
| **Accessibility Compliance** | `WCAG 2.2 AA` | Axe audit + screen reader accessible table fallbacks |
| **Frame Rate Performance** | `60 FPS` | `requestAnimationFrame` + `prefers-reduced-motion` check |

---

## 6. Verification & Testing Matrix

### 1. Automated Vitest Tests:
* `server/src/modules/ai/ai.service.spec.ts`: Tests Ollama integration, timeout triggers, and fallback payloads.
* `server/src/modules/scrapling/scrapling.service.spec.ts`: Tests SSRF IP blocker on `127.0.0.1`, `169.254.169.254`, and private networks.

### 2. End-to-End Playwright Tests:
* `client/e2e/ai-drawer.spec.ts`: Opens AI Drawer in Studio, tests headline generation, and verifies insertion into TipTap editor.
* `client/e2e/3d-canvas.spec.ts`: Navigates to `/404`, verifies canvas loads smoothly, and verifies reduced-motion fallback.

### 3. Production Build Validation:
* `npm run build` in `client/` and `server/` with **0 errors, 0 warnings**.
