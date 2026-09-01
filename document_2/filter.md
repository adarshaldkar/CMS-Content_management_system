# Editorial Navigation & Advanced Faceted Search Redesign

Redesigning the front page category navigation bar and the search & discovery suite to eliminate horizontal single-line scrollbars, remove all emojis, and implement a professional two-column faceted filter suite.

## User Review Required

> [!IMPORTANT]
> - All raw horizontal category scrollbars on both the Front Page and Search Page are being removed.
> - The Search page (`/search`) is being converted into a modern **Two-Column Faceted Discovery Studio** with multi-select checkboxes for categories, reading time selectors, date range filters, sort ordering, and active dismissible filter chips.
> - All unicode emojis in category styles and tickers are being eliminated and replaced with crisp typography and Lucide SVG icons.

## Proposed Changes

### Component: Navigation & Header

#### [MODIFY] [CategoryNav.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/layout/CategoryNav.tsx)
- Restructure to render 5-6 primary curated desks with fixed width.
- Add an "Explore All Desks" dropdown trigger that opens a multi-column modal index of all categories.
- Remove `overflow-x-auto` to eliminate horizontal scrollbar.

#### [MODIFY] [TrendingTicker.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/layout/TrendingTicker.tsx)
- Strip all unicode emojis from `CATEGORY_STYLE_MAP`.
- Replace raw horizontal marquee with a smooth paginated headline rotator with discrete prev/next controls.

---

### Component: Search & Discovery Studio

#### [MODIFY] [SearchPage.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/pages/SearchPage.tsx)
- Replace single horizontal category bar with a **Two-Column Faceted Grid**:
  - Left column: `FacetedFilterSidebar` with multi-select category checkboxes, reading depth radios, date dropdown, and clear-all action.
  - Right column: Active filter chips bar + vertical article results feed with keyword highlighting.

#### [DELETE] [EditorialTopicNav.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/articles/EditorialTopicNav.tsx)
- Deprecate single-line horizontal topic scrollbar in favor of the faceted checkbox sidebar.

#### [NEW] [FacetedFilterSidebar.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/articles/FacetedFilterSidebar.tsx)
- Dedicated sidebar component with structured filter sections:
  - Multi-select category checkboxes with article count badges.
  - Reading duration filters (< 3m, 3-7m, > 7m).
  - Publication timeline dropdown.
  - Sort order dropdown.
  - Reset filters button.

#### [NEW] [ActiveFilterChips.tsx](file:///c:/Users/shrut/Desktop/CMS%20Project/client/src/components/articles/ActiveFilterChips.tsx)
- Dismissible chips bar showing active query parameters with individual removal triggers and a global "Clear All" action.

---

## Verification Plan

### Automated Tests
- Run `npm run build -w client` to verify zero TypeScript errors.
- Run `npm run build` to verify full workspace build.

### Manual Verification
- Test Front Page (`/`): Verify clean desk bar, "Explore All Desks" mega-menu, and emoji-free trending rotator.
- Test Search Page (`/search`): Verify two-column layout, multi-category checkbox filtering, reading time filters, active chips removal, and search responsiveness.
