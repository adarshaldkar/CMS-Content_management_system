# The Gazette — UI Phase 1: Core Foundation, Accessibility & Stability

**Document:** `implemented/UI_phase1.md`  
**Phase:** 1 of 5  
**Focus:** Foundation, Design System Normalization, Layout Resilience, Accessibility, Error Boundaries & Code Quality  
**Status:** Frozen & Approved for Implementation  

---

## 1. Executive Summary & Phase Objectives

Phase 1 establishes the structural and accessibility foundation for The Gazette's user interface. Prior to adding animations, product tours, or analytics, the application must achieve **zero layout collapses**, **WCAG 2.2 AA accessibility compliance**, **explicit error boundaries**, and **strict adherence to The Gazette editorial design system**.

### The 3 Core Rules of Phase 1:
1. **Gazette Editorial Language > SaaS Trends:** Typography, whitespace, hairlines, asymmetry, and restrained imagery. Zero glassmorphism, zero neon glows, and zero generic card lifts.
2. **Zero Layout Collapse on Broken Assets & Errors:** If an image fails or a component crashes, the application degrades gracefully to structured editorial fallbacks and Correlation ID references without breaking page structure.
3. **Inclusive Motion & Accessibility:** Full compliance with `prefers-reduced-motion`, comprehensive keyboard navigation, semantic HTML landmarks, and WCAG 2.2 AA contrast standards.

---

## 2. Phase 1 Architecture Overview

```
PHASE 1
├── 1. Design System
│   ├── Tokens (Light & Dark)
│   ├── Typography Roles (Display, Section, Story, Body, Meta, Caption)
│   ├── Spacing Scales (Editorial XS..XL)
│   └── Editorial Rules
│
├── 2. Accessibility & Semantics
│   ├── WCAG 2.2 AA Baseline
│   ├── Keyboard Navigation & Focus Trap/Restoration
│   ├── Semantic HTML (<header>, <nav>, <main>, <article>, <section>, <aside>, <footer>)
│   ├── Reduced Motion (Functional vs Decorative Classification)
│   ├── Color Contrast (4.5:1 Normal, 3:1 Large & UI Elements)
│   └── ARIA Live Regions (Status, Autosave, Upload Progress)
│
├── 3. Resilience & Media Architecture
│   ├── Avatar Fallback (URL-keyed error reset)
│   ├── Image Fallback (Monospace fallback tag + CLS aspect-ratio)
│   ├── Loading States (EditorialSkeleton)
│   ├── Empty States (EditorialEmptyState)
│   ├── Error States (EditorialErrorBanner + Correlation ID)
│   └── React Error Boundaries (Component crash isolation)
│
├── 4. React Quality & Memory
│   ├── React Doctor Audit
│   ├── Measured Optimization (Profile first, then memoize)
│   ├── Effect Cleanup (Scroll listeners, Debounce timers)
│   └── SSE Connection Cleanup
│
├── 5. Performance Baselines & Budgets
│   ├── Core Web Vitals (LCP, INP, CLS ≈ 0)
│   ├── Initial Bundle & Route Chunk Budget
│   └── Media Loading (`loading="lazy"`, `decoding="async"`)
│
└── 6. Verification & Exit Gates
    ├── Build & TypeScript (0 errors)
    ├── ESLint (0 errors)
    ├── React Doctor Audit
    ├── Keyboard & Screen Reader Smoke Test
    └── Responsive Viewport Validation
```

---

## 3. Detailed Problem Statements & Technical Solutions

---

### Task 1.1: Design Token Normalization & Semantic Typography Roles

#### Current Problem:
* Arbitrary Tailwind utility classes (`text-2xl`, `text-4xl`, `border-zinc-200`, `border-gray-300`) produce inconsistent hierarchy across pages.
* Font size definitions lack semantic roles for editorial composition.

#### Technical Solution:
Update `client/src/index.css` and `client/tailwind.config.js` to define standardized semantic roles and spacing scales:

```css
:root {
  /* Editorial Canvas & Ink Tokens */
  --color-canvas-paper: #fafaf8;
  --color-canvas-subtle: #f4f4f2;
  --color-ink-primary: #18181b;
  --color-ink-secondary: #52525b;
  --color-ink-muted: #71717a;
  --color-border-subtle: #e4e4e7;
  --color-border-strong: #d4d4d8;
  --color-accent-crimson: #881337;
  --color-accent-crimson-hover: #9f1239;

  /* Semantic Typography Roles */
  --type-display: clamp(2rem, 5vw, 3.75rem);   /* Newsreader 700 - Lead story */
  --type-section: clamp(1.5rem, 3.5vw, 2.5rem); /* Newsreader 600 - Section headers */
  --type-story: clamp(1.2rem, 2.2vw, 1.65rem); /* Newsreader 600 - Card headlines */
  --type-body: 1.05rem;                         /* Plus Jakarta Sans 400 - Line height 1.75 */
  --type-meta: 0.75rem;                         /* JetBrains Mono 500 - Uppercase tracking-wider */
  --type-caption: 0.8rem;                       /* Newsreader italic - Media captions */

  /* Editorial Spacing Scales */
  --space-editorial-xs: 0.25rem;  /* 4px */
  --space-editorial-sm: 0.5rem;   /* 8px */
  --space-editorial-md: 1rem;     /* 16px */
  --space-editorial-lg: 1.5rem;   /* 24px */
  --space-editorial-xl: 3rem;     /* 48px */
}
```

#### Affected Files:
* `client/src/index.css`
* `client/tailwind.config.js`

---

### Task 1.2: Accessibility, Semantics & Reduced Motion

#### Current Problem:
* No explicit `prefers-reduced-motion` strategy: continuous marquee animations run unconditionally.
* Screen reader navigation lacks landmark semantics (`<main>`, `<article>`, `<nav>`, `<aside>`).
* Dynamic updates (autosave state, notification badge count) lack `aria-live` announcements.

#### Technical Solution:
1. **Differentiated Reduced-Motion Strategy:**
   * **Decorative animations:** Disabled.
   * **Functional state transitions:** Preserved at instant duration without disorienting movement.

```css
@media (prefers-reduced-motion: reduce) {
  *,
  ::before,
  ::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }

  .animate-ticker {
    animation: none !important;
    transform: none !important;
  }
}
```

2. **Semantic HTML Landmarks:**
   * Ensure `PublicHeader.tsx` uses `<header>` and `<nav aria-label="Main Navigation">`.
   * Ensure `ArticleReaderPage.tsx` uses `<article>` with `<header>`, `<main>`, `<aside>`, and `<footer>`.
   * Ensure homepage sections use `<section aria-labelledby="...">`.

3. **Color Contrast Baseline:**
   * **Normal text:** ≥ 4.5:1 ratio against background.
   * **Large text (≥18pt or bold ≥14pt):** ≥ 3:1 ratio.
   * **Essential UI boundaries & focus rings:** ≥ 3:1 non-text contrast.

4. **ARIA Live Regions:**
   * Provide `aria-live="polite"` on autosave indicators:
     ```tsx
     <div aria-live="polite" aria-atomic="true" className="sr-only">
       {isSaving ? 'Saving draft...' : isSaved ? 'All changes saved.' : ''}
     </div>
     ```

#### Affected Files:
* `client/src/index.css`
* `client/src/components/layout/PublicHeader.tsx`
* `client/src/components/layout/AdminLayout.tsx`
* `client/src/pages/ArticleReaderPage.tsx`
* `client/src/pages/ArticleEditorPage.tsx`

---

### Task 1.3: Keyboard Navigation & Focus Management

#### Current Problem:
* Interactive drawers (Notification Drawer) and modal dialogs (Media Picker, Document Import) do not trap focus or restore focus to the trigger button upon dismissal.
* Missing skip links for keyboard-only users.

#### Technical Solution:
1. **Skip-to-Content Link:** Add an accessible skip link as the very first focusable element in `PublicLayout.tsx` and `AdminLayout.tsx`:
   ```tsx
   <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-ink-primary focus:text-white">
     Skip to main content
   </a>
   ```
2. **Focus Trap & Restoration in Overlays:**
   * Ensure `NotificationDrawer.tsx`, `DocumentImportModal.tsx`, and `MediaPickerModal.tsx` trap focus while open.
   * Store `document.activeElement` before opening and return focus upon `Escape` or close action.
3. **Full Keyboard Navigation:**
   * Test and guarantee standard keyboard controls across all interactive components: `Tab`, `Shift+Tab`, `Enter`, `Space`, and `Escape`.

#### Affected Files:
* `client/src/components/layout/PublicLayout.tsx`
* `client/src/components/layout/AdminLayout.tsx`
* `client/src/components/notifications/NotificationDrawer.tsx`
* `client/src/components/editor/DocumentImportModal.tsx`

---

### Task 1.4: Media Resilience, Aspect Ratios & CLS Prevention

#### Current Problem:
* Deleted media assets from local storage or cloud return 404, breaking avatar circles in `AdminLayout.tsx` and creating broken image icons.
* Images without explicit aspect-ratios cause Cumulative Layout Shift (CLS) as content jumps when images load.
* If a broken avatar URL later changes to a valid one, error states do not reset.

#### Technical Solution:
1. **URL-Keyed Avatar Component:**
   * Wrap avatar logic into a reusable `EditorialAvatar.tsx` that resets `hasError` when `avatarUrl` changes:

```tsx
export function EditorialAvatar({ name, avatarUrl, size = 'md' }: AvatarProps) {
  const [hasError, setHasError] = useState(false);

  // Reset error state whenever the URL property changes
  useEffect(() => {
    setHasError(false);
  }, [avatarUrl]);

  return (
    <div className="w-8 h-8 rounded bg-ink-primary text-white flex items-center justify-center text-xs font-mono font-bold uppercase shrink-0 overflow-hidden">
      {avatarUrl && !hasError ? (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full object-cover"
          loading="lazy"
          decoding="async"
          onError={() => setHasError(true)}
        />
      ) : (
        <span>{name?.charAt(0) || 'A'}</span>
      )}
    </div>
  );
}
```

2. **CLS-Resistant Article Cover Container:**
   * Enforce explicit aspect ratio (`aspect-video` or `aspect-[16/9]`) and use `loading="lazy"` + `decoding="async"`.
   * On error, display the structured editorial fallback box:

```tsx
<div className="relative w-full aspect-[16/9] bg-canvas-subtle border border-border-subtle overflow-hidden">
  {coverUrl && !imgError ? (
    <img
      src={coverUrl}
      alt={title}
      className="w-full h-full object-cover"
      loading="lazy"
      decoding="async"
      onError={() => setImgError(true)}
    />
  ) : (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center">
      <span className="font-mono text-[10px] tracking-widest text-ink-muted uppercase">
        Cover Asset Unavailable
      </span>
    </div>
  )}
</div>
```

#### Affected Files:
* `client/src/components/common/EditorialAvatar.tsx` (new)
* `client/src/components/layout/AdminLayout.tsx`
* `client/src/components/layout/UserLayout.tsx`
* `client/src/components/layout/PublicHeader.tsx`
* `client/src/pages/HomePage.tsx`
* `client/src/pages/ArticleReaderPage.tsx`

---

### Task 1.5: Component Error Boundaries & UI State Primitives

#### Current Problem:
* Component crashes (e.g. TipTap rendering error, broken embed, malformed comment data) crash the entire React root.
* Missing standard loading, empty, and error feedback across data-fetching views.

#### Technical Solution:
1. **React Error Boundary with Correlation ID Reference:**
   * Create `EditorialErrorBoundary.tsx` to catch render crashes in isolated components (editor, reader, comment thread, media library) without taking down the full application:

```tsx
interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

export class EditorialErrorBoundary extends Component<Props, { hasError: boolean; errorRef: string }> {
  state = { hasError: false, errorRef: '' };

  static getDerivedStateFromError() {
    const errorRef = `ERR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    return { hasError: true, errorRef };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[ErrorBoundary ${this.state.errorRef}]`, error, info);
    // Ready for Sentry captureException integration
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 border border-border-subtle bg-canvas-subtle text-center rounded my-4">
          <h3 className="font-serif text-lg font-bold text-ink-primary mb-1">
            {this.props.fallbackTitle || 'Section temporarily unavailable'}
          </h3>
          <p className="text-xs text-ink-secondary mb-3">
            An unexpected error occurred while rendering this component.
          </p>
          <span className="font-mono text-[10px] text-ink-muted block">
            Reference: {this.state.errorRef}
          </span>
        </div>
      );
    }
    return this.props.children;
  }
}
```

2. **Standardized Editorial State Primitives:**
   * `EditorialSkeleton.tsx`: Content-shaped skeleton loaders matching font line-heights.
   * `EditorialEmptyState.tsx`: Structured empty screen with title, description, and action button.
   * `EditorialErrorBanner.tsx`: Inline error alert with retry button and Correlation ID display.

#### Affected Files:
* `client/src/components/common/EditorialErrorBoundary.tsx` (new)
* `client/src/components/common/EditorialSkeleton.tsx` (new)
* `client/src/components/common/EditorialEmptyState.tsx` (new)
* `client/src/components/common/EditorialErrorBanner.tsx` (new)

---

### Task 1.6: React Quality & Performance Profiling

#### Current Problem:
* `ArticleEditorPage.tsx` and `ArticleReaderPage.tsx` have unmemoized callbacks and risk listener leaks on navigation.

#### Technical Solution:
* **Measured Optimization Rule:** Profile in browser DevTools first. Apply `useCallback` or `useMemo` only where referential instability measurably triggers child re-renders.
* **Effect Cleanup Audit:**
  * In `ArticleReaderPage.tsx`, ensure `scroll` listener is removed on unmount.
  * In `NotificationDrawer.tsx`, ensure SSE connection calls `eventSource.close()` on unmount.
  * In `ArticleEditorPage.tsx`, ensure autosave debounce timers are cleared via `clearTimeout`.

---

## 4. Performance Baseline Budgets

| Metric | Target | Measurement Tool |
|---|---|---|
| **Cumulative Layout Shift (CLS)** | < 0.05 (Target ~0) | Lighthouse / Web Vitals |
| **Interaction to Next Paint (INP)** | < 200ms | Chrome DevTools Performance tab |
| **Largest Contentful Paint (LCP)** | < 2.5s on simulated 4G | Lighthouse |
| **Critical Initial JS Bundle** | < 250 KB (gzipped) | Vite bundle analysis (`npm run build`) |
| **Route Chunks** | < 80 KB per lazy route | Vite build output |

---

## 5. Step-by-Step Implementation Sequence

```
STEP 1: CSS Design Tokens & Reduced Motion
  └─ Update index.css with typography roles, spacing scale & reduced-motion rules

STEP 2: Media Resilience Primitives
  └─ Create EditorialAvatar with URL-keyed error reset
  └─ Replace avatar markup in AdminLayout, UserLayout, PublicHeader
  └─ Add aspect-ratio & fallback markup to HomePage & ArticleReaderPage

STEP 3: Error Boundaries & UI State Primitives
  └─ Create EditorialErrorBoundary with Correlation ID generation
  └─ Create EditorialSkeleton, EditorialEmptyState, EditorialErrorBanner
  └─ Wrap ArticleEditorPage, Reader content, and MediaLibrary with boundaries

STEP 4: Accessibility, Semantics & Keyboard Navigation
  └─ Add skip-to-content link to PublicLayout and AdminLayout
  └─ Verify HTML landmarks (<main>, <nav>, <article>, <aside>)
  └─ Implement focus restoration in NotificationDrawer and Import Modal
  └─ Add aria-live to editor autosave and notification counters

STEP 5: React Doctor Audit & Effect Cleanup
  └─ Verify cleanup on window scroll listeners, debouncers, SSE streams
  └─ Profile editor rendering and apply measured memoization

STEP 6: Verification & Exit Criteria Sign-Off
  └─ Execute 14-point Phase 1 Exit Verification Checklist
```

---

## 6. Comprehensive 14-Point Phase 1 Exit Criteria Checklist

Phase 1 passes and unlocks Phase 2 only when all 14 criteria are verified:

* [ ] **1. Build:** `npm run build -w client` compiles with 0 errors.
* [ ] **2. TypeScript:** `tsc --noEmit` passes with 0 type errors across client.
* [ ] **3. ESLint:** Client lint passes without unresolved warnings.
* [ ] **4. Design Tokens:** Semantic typography roles and spacing scale verified in `index.css`.
* [ ] **5. Reduced Motion:** `prefers-reduced-motion` tested in DevTools; all ticker/transition delays halt cleanly.
* [ ] **6. Color Contrast:** WCAG 2.2 AA compliant (≥4.5:1 normal text, ≥3:1 large text & UI elements).
* [ ] **7. Keyboard Navigation:** Full Tab, Shift+Tab, Enter, Space, Escape, and focus restoration verified across all modals.
* [ ] **8. Semantic HTML:** Explicit landmarks (`<header>`, `<nav>`, `<main>`, `<article>`, `<aside>`, `<footer>`) confirmed.
* [ ] **9. ARIA Live Regions:** Dynamic status changes (autosave, counters) announce to screen readers.
* [ ] **10. Broken Media Resilience:** Invalid/deleted avatar and article cover URLs render structured fallbacks without layout collapse.
* [ ] **11. Image CLS Prevention:** Explicit aspect ratios and `loading="lazy"` + `decoding="async"` applied.
* [ ] **12. Error Boundaries:** `EditorialErrorBoundary` isolates component crashes and displays Correlation IDs.
* [ ] **13. UI State Normalization:** Uniform Skeleton, EmptyState, and ErrorBanner primitives active.
* [ ] **14. Memory & Listener Cleanup:** Scroll listeners, debouncers, and SSE streams cleanly dispose on route change.
