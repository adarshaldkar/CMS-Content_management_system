# Technical Design: Editorial Navigation & Advanced Faceted Search Redesign

## 1. Executive Summary

This design document outlines the complete architectural refactoring of two primary user-facing interfaces in The Gazette digital publication platform:
1. **Front Page & Master Desk Navigation (`CategoryNav.tsx` & `TrendingTicker.tsx`)**: Replacing horizontal single-line overflow and browser scrollbars with a fixed curated desk bar, an "All Desks" mega-menu overlay, and an automated pagination rotator with zero emojis.
2. **Search & Discovery Suite (`SearchPage.tsx`)**: Replacing the horizontal topic scrollbar with a professional, two-column faceted discovery console featuring multi-select topic checkboxes, reading duration filters, publication timeline controls, sort ordering, and active dismissible filter chips.

---

## 2. Problem Analysis & Current UI Deficiencies

### A. Front Page Navigation Flaws (Reference: User Screenshot 1)
- **Horizontal Single-Line Overflow**: 15+ categories are rendered in a flex row with `overflow-x-auto`, causing an ugly native browser scrollbar across the page.
- **Visual Clutter**: Every single category competes for horizontal space, crowding core editorial actions.
- **Emoji Artifacts in Trending Ticker**: Unwanted emoji icons in category badge badges (`CATEGORY_STYLE_MAP`) that look like generic templates rather than premier typography.

### B. Search & Discovery Flaws (Reference: User Screenshot 2)
- **Redundant Horizontal Category Strip**: The search page repeats the horizontal category line with its own gray scrollbar (`[ < ===== > ]`).
- **Single-Dimensional Filtering**: Users can only click one category at a time; combining topics (e.g. AI + Cybersecurity) is impossible.
- **Missing Faceted Controls**: No structured sidebar for filtering by reading time duration, publication timeline, author, or sorting criteria.
- **Lack of Active Filter Transparency**: Applied parameters are not displayed as dismissible chips above results.

---

## 3. Proposed Architectural Solution

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│ MASTER HEADER BAR                                                                      │
│ THE GAZETTE                    Friday, August 28, 2026            Search   Write   User│
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [Front Page] [For You] [Tech & AI] [Business] [Science] [Culture]  |  [Explore All ▾]  │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ BREAKING & TRENDING ROTATOR (Zero Emojis, Clean Monospaced Dividers)                   │
│ TRENDING | [AI] The Architecture of Modern LLMs — Dr. Sarah Lin (5m)        < 1/8 >  ⏸ │
└────────────────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────────────────┐
│ SEARCH & DISCOVERY STUDIO (Two-Column Faceted Console)                                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ [ Search stories by headline, keyword, author, or excerpt...                 ] [Search]│
├───────────────────────────────┬────────────────────────────────────────────────────────┤
│ FACETED FILTER SIDEBAR        │ SEARCH RESULTS & TELEMETRY                             │
│                               │ Showing 14 articles matching query                     │
│ TOPIC DESKS (Multi-Select)    │ Active Filters: [ AI x ] [ Past 7 Days x ] [Clear All] │
│ [x] Artificial Intelligence 12├────────────────────────────────────────────────────────┤
│ [x] Software Architecture    8│ ARTICLE 1                                              │
│ [ ] Cybersecurity            5│ TECHNOLOGY & AI                                        │
│ [ ] Financial Markets       11│ The Future of Real-Time Event Streaming                │
│ [ ] Editorial Design         4│ By Marcus Vance | 4 min read | Aug 25, 2026            │
│                               │ High-throughput stream processing with Kafka and Flink.│
│ READING DEPTH                 ├────────────────────────────────────────────────────────┤
│ ( ) All Durations             │ ARTICLE 2                                              │
│ (x) Quick Read (< 3 min)      │ SCIENCE                                                │
│ ( ) In-Depth (> 7 min)        │ Beyond the Event Horizon                               │
│                               │ By Prof. Julian Hayes | 6 min read | Aug 24, 2026      │
│ PUBLICATION DATE              │ Gravitational wave astronomy and cosmic radiation.     │
│ [ Past 7 Days               ▾]│                                                        │
│                               │                                                        │
│ SORT ORDER                    │                                                        │
│ [ Latest Published          ▾]│                                                        │
│                               │                                                        │
│ [ Clear All Filters ]         │                                                        │
└───────────────────────────────┴────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Specifications

### 1. `CategoryNav.tsx` (Master Desk Bar + Mega-Menu)
- **Primary Bar**: Shows top 5 curated desks (`Front Page`, `For You`, `Tech & AI`, `Business & Markets`, `Science`, `Culture`).
- **"Explore All Desks" Trigger**: Clean button on the right edge with a dropdown chevron.
- **Sections Index Modal / Mega-Menu**:
  - When triggered, opens an elegant multi-column drawer/modal.
  - Groups all 15+ taxonomy categories by thematic desk with article count badges and descriptions.
  - Zero emojis, utilizing sharp monospaced kickers and serif headlines.

### 2. `TrendingTicker.tsx` (Clean Typography Rotator)
- Removes all emoji icons (`CATEGORY_STYLE_MAP` stripped of unicode emojis).
- Uses sharp SVG icons or pure monospaced labels (`TRENDING`, `BREAKING`).
- Eliminates raw horizontal scroll overflow with a smooth paginated rotator and previous/next stepper.

### 3. `SearchPage.tsx` & `FacetedFilterSidebar.tsx`
- **Two-Column Grid Layout**:
  - `col-span-12 lg:col-span-4`: Faceted filter sidebar.
  - `col-span-12 lg:col-span-8`: Search results stream and active chips.
- **Faceted Sidebar Controls**:
  - **Category Checkboxes**: Multi-select support passing comma-separated slugs to `categorySlugs` backend parameter.
  - **Reading Time Selector**: Filter options for Quick (< 3m), Medium (3-7m), Long (> 7m).
  - **Date Range Dropdown**: Any Time, Past 24h, Past 7d, Past 30d, Past Year.
  - **Sort Dropdown**: Latest, Trending, Most Read, Most Discussed.
  - **Clear Filters Button**: One-click reset.
- **Active Chips Bar**:
  - Renders dismissible badges above results for every active filter.
  - Clicking `x` on any chip immediately updates query state.

---

## 5. Verification Plan

### Automated & Build Verification
1. Run `npm run build -w client` to verify zero TypeScript errors in components and types.
2. Run `npm run build` for complete full-stack workspace validation.

### Functional Verification
1. Open `http://localhost:5173/` in browser:
   - Verify category bar fits all viewport sizes cleanly without horizontal scrollbars.
   - Click "Explore All Desks" to verify multi-column mega-menu opens smoothly.
   - Verify Trending rotator displays headline with zero emojis.
2. Open `http://localhost:5173/search` in browser:
   - Verify two-column layout with faceted filter sidebar on left.
   - Test checking multiple topic checkboxes (e.g. AI + Science) and verify results filter dynamically.
   - Test reading duration pills and date ranges.
   - Test removing active chips and clicking "Clear All Filters".
