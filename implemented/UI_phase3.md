# The Gazette — UI Phase 3: Visual Analytics & Editorial Data Charts

**Document:** `implemented/UI_phase3.md`  
**Phase:** 3 of 5  
**Focus:** Author Analytics, Dashboard Data Visualization, BullMQ & Newsletter Telemetry Charts, and Interactive Data Journalism Graphics  
**Status:** Refined, Frozen & Approved for Implementation  
**Standard:** Strict Local Execution — Zero External CDNs, Zero Uncalibrated Third-Party Bloat  

---

## 1. Executive Summary & Phase Objectives

Phase 3 elevates **The Gazette** from plain numeric metric readouts to interactive visual analytics. It empowers authors to track their journalistic impact over time, equips administrators with real-time BullMQ queue and newsletter campaign throughput graphs, and provides a lightweight HTML5 2D Canvas graphic engine for interactive data journalism features.

### Core Architectural Rules for Phase 3:
1. **Editorial Design Fidelity (Bklit UI Standard):** Charts must feel like high-end print journalism infographics (*The Financial Times*, *The Economist*, *The Atlantic*). Restrained monochromatic ink scales, crimson trend highlights, precise hairline gridlines, and clean typography (*JetBrains Mono* for ticks/legends, *Newsreader* for headings). No neon glows, giant gradients, or flashy decorative animations.
2. **Clear Subsystem Separation:**
   - **Standard Analytics (Author Desk & Admin Suite):** Lightweight SVG-based chart components with accessible data tables and responsive scaling.
   - **Special Data Journalism (Editorial Articles):** Modular HTML5 2D Canvas visualizations code-split via `React.lazy()` with zero impact on everyday reader routes.
3. **Analytics Engine Architecture:**
   - **Transactional Storage:** PostgreSQL / MongoDB / CockroachDB / MariaDB / MySQL.
   - **Analytical & Time-Series Engine:** ClickHouse (materialized aggregates, retention downsampling, and sub-second rollups).
4. **Data Freshness & Stream Coalescing:** Real-time metrics (BullMQ throughput) are coalesced over 1–2 second aggregation windows rather than redrawing per event. Every chart clearly displays its data freshness state (e.g. *"Updated 12s ago"* or *"Analytics cached"*).
5. **Accessibility & Visible Data Table Toggle:** Every chart includes both screen-reader accessibility and an explicit, user-toggleable **"View Data Table"** mode. Non-color visual cues (shapes, dashes, symbols) accompany all color-coded states.
6. **Layout Stability (Target CLS ≈ 0):** Chart dimensions are reserved prior to data arrival via fixed aspect-ratio skeleton containers, preventing unexpected content jumps.

---

## 2. Phase 3 Architecture Overview

```text
                                  UI PHASE 3 ARCHITECTURE
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼─────────────────────────┐ ┌──────────▼────────────────────────┐ ┌───────────▼────────────────────────┐
│ 1. AUTHOR PERFORMANCE CHARTS  │ │ 2. ADMIN TELEMETRY & CAMPAIGNS   │ │ 3. DATA JOURNALISM CANVAS ENGINE   │
├───────────────────────────────┤ ├───────────────────────────────────┤ ├──────────────────────────────────┤
│ • ClickHouse Aggregate Engine │ │ • Real-Time SSE / WS Telemetry    │ │ • Lightweight HTML5 2D Canvas    │
│ • Impressions vs Full Reads   │ │ • 1-2s Metric Stream Coalescing   │ │ • Dynamic Network/Source Graph   │
│ • Defined Read Criteria       │ │ • BullMQ Active/Complete/Failed   │ │ • Economic & Climate Time Scrubber│
│ • 7D (Hourly) / 30D / 90D     │ │ • Full Newsletter Funnel (Bounce, │ │ • Isolated React.lazy() Chunk    │
│ • Per-Story 80x24px Sparkline │ │   Complaint, Suppression rates)   │ │ • IntersectionObserver Rendering │
│ • Visible Data Table Toggle   │ │ • Data Freshness Indicator        │ │ • Accessible Data Matrix Fallback│
└───────────────────────────────┘ └───────────────────────────────────┘ └──────────────────────────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │   4. VERIFICATION   │
                                  ├─────────────────────┤
                                  │ • Vitest Point Calc │
                                  │ • Playwright E2E    │
                                  │ • Axe Accessibility│
                                  │ • ClickHouse Rollup │
                                  │ • CLS Target ≈ 0    │
                                  └─────────────────────┘
```

---

## 3. Detailed Component Specifications

---

### Task 3.1: Author Performance Analytics Suite

#### Location:
* `client/src/pages/user/UserDashboardPage.tsx`
* `client/src/components/analytics/AuthorMetricsChart.tsx`
* `client/src/components/analytics/ArticleSparkline.tsx`
* `client/src/components/analytics/AccessibleDataTable.tsx`

#### Data Definitions & Business Logic:
* **Impression / View:** Unique page load of the article.
* **Full Read (Completed Read):** Defined strictly as **Reader scrolled &ge; 90% of article body AND remained active on page for at least 30 seconds** (or 60% of estimated reading time).
* **Read Ratio:** `(Full Reads / Impressions) * 100`.
* **Data Downsampling & Retention:**
  - **7 Days:** 1-hour resolution time buckets.
  - **30 Days / 90 Days:** Daily aggregated rollups from ClickHouse.

#### Technical Solution:
1. **Editorial Multi-Series SVG Chart (`AuthorMetricsChart.tsx`):**
   - Clean hairline gridlines (`#e4e4e7` Light / `#27272a` Dark) with dashed styling.
   - Restrained crimson line `#881337` for Reads, Charcoal `#18181b` for Impressions, Slate `#71717a` for Likes.
   - Clean, non-distracting hover crosshair with exact numeric tooltip and day-over-day delta.
   - Header with **Data Freshness Badge** (*"Live — updated 15s ago"* or *"Cached daily summary"*).
   - Top-right **"View Data Table"** toggle button for direct tabular inspection.
2. **Compact Per-Article Sparkline (`ArticleSparkline.tsx`):**
   - Clean single 80x24px trend line embedded in the author's story table column.
   - Focuses strictly on 7-day velocity without cluttering rows with redundant charts.

#### TypeScript Interface:
```typescript
export interface TimeSeriesDataPoint {
  date: string; // ISO date or hourly timestamp
  views: number;
  reads: number;
  likes: number;
  comments: number;
}

export interface AuthorAnalyticsResponse {
  timeframe: '7d' | '30d' | '90d';
  lastUpdated: string; // ISO timestamp
  isLive: boolean;
  summary: {
    totalViews: number;
    totalReads: number;
    readRatio: number; // e.g. 0.68 for 68%
    totalLikes: number;
    trendPercentage: number; // e.g. +14.2%
  };
  timeline: TimeSeriesDataPoint[];
}
```

---

### Task 3.2: Admin Telemetry & Newsletter Campaign Graphs

#### Location:
* `client/src/pages/admin/JobsManagerPage.tsx`
* `client/src/pages/admin/NewsletterManagerPage.tsx`
* `client/src/components/analytics/QueueThroughputGraph.tsx`
* `client/src/components/analytics/CampaignPerformanceBar.tsx`

#### Technical Solution:
1. **BullMQ Real-Time Throughput Visualizer (`QueueThroughputGraph.tsx`):**
   - **Stream Coalescing:** Aggregates incoming telemetry over a 1.5-second sliding window before updating the SVG path (prevents high-frequency 60Hz redraw thrashing).
   - **Monitored Operational States:**
     - `Active / Running Jobs`: Dark Charcoal `#18181b`
     - `Completed / Succeeded`: Emerald `#059669` (with checkmark symbol in legend)
     - `Delayed / Retrying`: Amber `#d97706` (with clock symbol in legend)
     - `Failed / Errored`: Editorial Crimson `#881337` (with warning symbol in legend)
   - Connection status indicator: Green pulse dot for active SSE/WS stream; Amber badge for polled fallback.
2. **Full-Lifecycle Newsletter Funnel (`CampaignPerformanceBar.tsx`):**
   - Full production delivery funnel showing:
     `Sent (100%)` &rarr; `Delivered` &rarr; `Opened` &rarr; `Clicked Links` &rarr; `Bounced / Suppressed` &rarr; `Unsubscribed / Spam Complaints`.
   - Distinct hatch patterns and icon markers to differentiate positive engagement from deliverability failures.

---

### Task 3.3: Data Journalism Interactive Canvas Engine

#### Location:
* `client/src/components/canvas/DataJournalismCanvas.tsx`
* `client/src/components/canvas/InteractiveChartEmbed.tsx`
* `client/src/pages/ArticleReaderPage.tsx`

#### Technical Solution:
1. **HTML5 2D Canvas Engine (Retina & Low-Power Optimized):**
   - Uses native 2D Canvas context with device pixel ratio scaling (`window.devicePixelRatio`).
   - Supports 2 core investigative visualization archetypes:
     - **Relational Source Network:** Interactive node-graph for investigative journalism (e.g. visualizing corporate structures, database mesh clusters, or investigative source trees).
     - **Timeline & Variable Scrubber:** Interactive time-slider enabling readers to simulate economic models or historical data.
2. **Performance & Isolation Safeguards:**
   - Isolated in a separate chunk (`React.lazy()` + `Suspense`).
   - `IntersectionObserver` automatically stops `requestAnimationFrame` loops when scrolled out of viewport.
   - Seamless fallback to an accessible static SVG chart and HTML data table on low-power devices or if Canvas is disabled.

---

## 4. Accessibility, Semantics & Contrast Rules

### Non-Color Cues & WCAG 2.2 AA Alignment:
* **Color Ratios:**
  - Normal text / axis labels: &ge; 4.5:1 against canvas paper background.
  - Large display metrics / UI borders / graphics: &ge; 3:1.
* **Dual-Encoding:** Metrics never rely solely on color. Dash patterns (`strokeDasharray="4,4"` vs solid), icons (✓, ⚠️, ◷), and explicit text labels accompany all states.
* **Accessible Fallbacks:** Every chart includes a semantic table alternative toggleable by users and accessible to screen readers:
  ```tsx
  <div role="region" aria-label="Author Readership Trends Chart">
    {/* Visual SVG representation */}
    <svg aria-hidden={isTableVisible ? "true" : "false"}>...</svg>

    {/* User-Toggleable Semantic Table */}
    {isTableVisible && (
      <AccessibleDataTable
        caption="Monthly Readership Summary"
        headers={["Date", "Views", "Full Reads", "Likes"]}
        rows={data.timeline}
      />
    )}
  </div>
  ```
* **Reduced Motion:** If `prefers-reduced-motion` is active, animations collapse to instant rendering, and Canvas particle movements are static.

---

## 5. Verification & Testing Plan

### 1. Automated Unit & Integration Tests (Vitest)
* Point calculation and coordinate clamping logic under extreme values (0, millions, NaN).
* Time-series bucket downsampling (hourly &rarr; daily rollups).
* Stale data and network timeout error state rendering.

### 2. End-to-End & Interaction Tests (Playwright)
* Timeframe filter changes (`7D` &rarr; `30D` &rarr; `90D`) update chart coordinates and data table rows.
* Hover tooltip positioning and crosshair hit-testing across viewport widths (375px, 768px, 1440px).
* "View Data Table" button toggles accessible table view on and off.

### 3. Accessibility & Performance Audits
* **Axe A11y Suite:** 0 WCAG 2.2 AA violations on all analytics views.
* **Layout Shift Budget:** Target Cumulative Layout Shift **CLS &approx; 0** on chart mount via reserved aspect containers.
* **Memory & Lifecycle Audit:** Confirm `cancelAnimationFrame` and SSE listener teardown on component unmount.
