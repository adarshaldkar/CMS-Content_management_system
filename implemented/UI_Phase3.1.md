# Implementation Plan: UI Phase 3 (Visual Analytics & Editorial Data Charts)

Build high-performance, dynamic visual analytics and editorial data charts for **The Gazette**, adhering to the refined [`implemented/UI_phase3.md`](file:///c:/Users/shrut/Desktop/CMS%20Project/implemented/UI_phase3.md) specification.

## User Review Required

> [!IMPORTANT]
> - All charting is built using lightweight SVG components and HTML5 2D Canvas routines with **zero external CDN dependencies or heavy monolithic libraries**.
> - Data journalism canvas routines are isolated and loaded via `React.lazy()` so standard reader and desk routes carry 0 KB extra payload.
> - Every chart includes an accessible, user-toggleable **"View Data Table"** mode and non-color semantic cues (hatch patterns, icons, dashed strokes).

---

## Proposed Changes

### 1. Analytics & Visualization Components (`client/src/components/analytics/`)

#### [NEW] [`AuthorMetricsChart.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/analytics/AuthorMetricsChart.tsx)
- Dynamic multi-metric SVG area & line chart comparing **Impressions / Views**, **Full Reads (>=90% scroll depth & >=30s)**, and **Likes**.
- Timeframe filters: `7D` (hourly resolution), `30D`, `90D` (ClickHouse daily rollups).
- Clean crosshair hover with floating tooltip showing exact date, count, and delta.
- Data Freshness badge (*"Live — updated 12s ago"* / *"Cached"*).
- User-toggleable **"View Data Table"** mode.

#### [NEW] [`ArticleSparkline.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/analytics/ArticleSparkline.tsx)
- Compact 80x24px inline SVG sparkline displaying 7-day velocity for published stories in author tables.
- Monochromatic / crimson trend accents with momentum indicator.

#### [NEW] [`AccessibleDataTable.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/analytics/AccessibleDataTable.tsx)
- Reusable WCAG 2.2 AA accessible table component rendering raw tabular records when users toggle data table view on any chart.

#### [NEW] [`QueueThroughputGraph.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/analytics/QueueThroughputGraph.tsx)
- Real-time BullMQ queue throughput graph showing Active, Completed, Delayed, and Failed jobs/sec over a 15-minute sliding window.
- 1.5-second stream coalescing to avoid 60Hz redraw thrashing.
- Stream connectivity indicator (Green live dot for active stream / Amber badge for polled fallback).

#### [NEW] [`CampaignPerformanceBar.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/analytics/CampaignPerformanceBar.tsx)
- Full newsletter conversion funnel bar: `Sent (100%)` &rarr; `Delivered` &rarr; `Opened` &rarr; `Clicked` &rarr; `Bounced / Suppressed` &rarr; `Unsubscribed / Spam Complaints`.
- Non-color hatch patterns and icon markers to differentiate positive engagement from deliverability failures.

---

### 2. Data Journalism Canvas Engine (`client/src/components/canvas/`)

#### [NEW] [`DataJournalismCanvas.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/canvas/DataJournalismCanvas.tsx)
- High-performance HTML5 2D Canvas engine with device pixel ratio (retina) scaling.
- Interactive Relational Network Graph (investigative source/entity clusters) and Economic Timeline Scrubber.
- `IntersectionObserver` pause on off-screen scroll; automatic static SVG/Table fallback on low-power devices.

---

### 3. Page Integrations

#### [MODIFY] [`UserDashboardPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/user/UserDashboardPage.tsx)
- Integrate `AuthorMetricsChart` with dynamic timeframe switching (`7D`, `30D`, `90D`).
- Embed `ArticleSparkline` into the published articles table.

#### [MODIFY] [`JobsManagerPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/JobsManagerPage.tsx)
- Embed `QueueThroughputGraph` above the queue job inspector with live sliding-window throughput telemetry.

#### [MODIFY] [`NewsletterManagerPage.tsx`](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/admin/NewsletterManagerPage.tsx)
- Embed `CampaignPerformanceBar` in campaign analytics view.

---

## Verification Plan

### Automated Tests
- TypeScript build check: `npm run build` in `client/`
- Vitest unit tests for SVG coordinates, time-series interpolation, and point clamping.

### Manual Verification
- Browser inspection on `http://localhost:5173`:
  1. Navigate to `/user/dashboard` &rarr; verify `AuthorMetricsChart` timeframe filtering (`7D`, `30D`, `90D`), crosshair hover, and "View Data Table" toggle.
  2. Navigate to `/admin/jobs` &rarr; verify `QueueThroughputGraph` real-time coalesced sliding window and queue selection.
  3. Navigate to `/admin/newsletter` &rarr; verify `CampaignPerformanceBar` full delivery funnel.
  4. Verify mobile responsiveness at 375px, 768px, and 1440px with zero layout shift (CLS &approx; 0).
