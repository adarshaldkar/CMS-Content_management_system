# UI Phase 2: Interaction, Motion & Guided Onboarding

> **Standard:** Strict Local Execution — Zero Git Commits / Zero Git Pushes  
> **Goal:** Make the Gazette UI feel responsive and polished, introduce guided feature discovery for authors and administrators, and make live telemetry metrics transition naturally without layout shifts.

---

## Architecture & System Overview

```text
                                  UI PHASE 2 ARCHITECTURE
                                             │
      ┌──────────────────────────────────────┼──────────────────────────────────────┐
      │                                      │                                      │
┌─────▼─────────────────────────┐ ┌──────────▼────────────────────────┐ ┌───────────▼────────────────────────┐
│  1. MOTION.DEV (motion/react) │ │  2. DRIVER.JS ONBOARDING SYSTEM   │ │   3. NUMBERFLOW METRIC ODOC    │
├───────────────────────────────┤ ├───────────────────────────────────┤ ├──────────────────────────────────┤
│ • Modal Spring Transitions    │ │ • 5-Step Author Studio Tour       │ │ • User Dashboard Metric Cards    │
│ • Drawer Physics Slide        │ │ • 4-Step Admin DB Mesh Tour       │ │   (Published, Drafts, Review)    │
│ • Shared Layout Tab Indicator │ │ • LocalStorage State Persistence  │ │ • BullMQ Live Queue Depths       │
│ • Reduced-Motion Suppression  │ │ • "Take Tour Again" Replay Hook   │ │   (Waiting, Active, Completed)   │
└───────────────────────────────┘ └───────────────────────────────────┘ └──────────────────────────────────┘
                                             │
                                  ┌──────────▼──────────┐
                                  │  4. VERIFICATION    │
                                  ├─────────────────────┤
                                  │ • Playwright E2E    │
                                  │ • React Doctor CI   │
                                  │ • TypeScript Build  │
                                  └─────────────────────┘
```

---

## 1. Motion.dev Spring & Transition System (`motion/react`)

### Design & Accessibility Constraints
- **Sole Animation Engine:** Motion is the primary and only animation engine for standard UI. No ad-hoc keyframe bloat or external heavy animation libraries.
- **Micro-Spring Tuning:**
  - Dialog / Modal popovers: `type: 'spring', stiffness: 350, damping: 28, mass: 0.8`
  - Drawer slide: `type: 'spring', stiffness: 300, damping: 30, mass: 1.0`
- **Accessibility & Focus Trapping:**
  - Dialogs maintain standard HTML5/ARIA modal semantics (`role="dialog"`, `aria-modal="true"`, focus trapping, and `Escape` key dismissal).
  - Backdrops serve strictly as pointer-dismiss targets without corrupting keyboard tab order.
- **Reduced-Motion Guarantee:**
  - When `window.matchMedia('(prefers-reduced-motion: reduce)').matches` is true, Motion animations automatically collapse durations to 0 or degrade to instantaneous opacity transitions.

### Component Implementations

#### A. Modal / Dialog Spring Transitions
Files:
- `client/src/components/editor/MediaPickerModal.tsx`
- `client/src/components/editor/VideoUploadModal.tsx`
- `client/src/components/editor/DocumentImportModal.tsx`

```tsx
// Pattern for all accessible editorial modals:
<AnimatePresence>
  {isOpen && (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-ink-primary/40 backdrop-blur-xs"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 6 }}
        transition={{ type: 'spring', stiffness: 350, damping: 28 }}
        className="relative bg-white border border-border-subtle shadow-2xl z-10 w-full max-w-2xl focus:outline-none"
      >
        {/* Modal content */}
      </motion.div>
    </div>
  )}
</AnimatePresence>
```

#### B. Notification Drawer Physics Slide
File: `client/src/components/notifications/NotificationDrawer.tsx`
- Backdrop: `motion.div` with fade `opacity: 0 -> 1`.
- Drawer Body: `motion.aside` sliding from `x: '100%'` to `x: 0` with exit `x: '100%'` on `AnimatePresence`.

#### C. Shared Layout Tab Indicator
File: `client/src/pages/admin/EditorialReviewPage.tsx`
- Add `motion.span layoutId="activeReviewTab"` under the selected tab for seamless gliding pill motion.

---

## 2. Driver.js Guided Onboarding & Feature Discovery

### Design & Persistence Architecture
- **Goal:** Improve feature discoverability and reduce first-time editor/admin friction.
- **Reduced Motion Support:** Driver.js checks `prefers-reduced-motion: reduce`. If active, `animate: false` is enforced so highlight rectangles snap immediately without disorienting movement.
- **Multi-Device State Persistence:**
  - Primary source of truth: User preferences / local storage cache (`gazette_tour_editor_v1`, `gazette_tour_admin_db_v1`).
  - Graceful degradation ensures cross-device sync where user profiles persist flags.
- **Non-Destructive Replay:** A visible "Take Tour Again" / "Guided Tour" button in the sub-header allows authors and admins to replay walkthroughs at any time.

### Centralized Tour Service (`client/src/services/tour.service.ts`)

```typescript
import { driver } from 'driver.js';

const isReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const tourService = {
  // 1. Author Writing Studio Tour (5 Steps)
  startEditorTour(force = false) {
    if (!force && localStorage.getItem('gazette_tour_editor_v1')) return;
    
    const driverObj = driver({
      showProgress: true,
      animate: !isReducedMotion(),
      popoverClass: 'gazette-driver-popover',
      onDestroyStarted: () => {
        localStorage.setItem('gazette_tour_editor_v1', 'true');
        driverObj.destroy();
      },
      steps: [
        {
          element: '#tour-editor-title',
          popover: {
            title: '1. Headline & Deck',
            description: 'Craft a compelling, typography-driven headline. The URL slug auto-generates in real-time.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-toolbar',
          popover: {
            title: '2. TipTap Editorial Toolbar',
            description: 'Format typography with pull-quotes, callouts, footnotes, code syntax, and drop-caps.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-doc-import',
          popover: {
            title: '3. Document Import Pipeline',
            description: 'Instantly ingest raw Word (.docx), PDF, or Markdown files into editable semantic blocks.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-media',
          popover: {
            title: '4. Native Video & Media Assets',
            description: 'Embed high-res images and native video streams with chunked HTTP Range playback.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-publish',
          popover: {
            title: '5. Publication Desk & Review',
            description: 'Submit your manuscript for senior editor clearance or publish directly based on role clearance.',
            side: 'left',
            align: 'start',
          },
        },
      ],
    });

    driverObj.drive();
  },

  // 2. Admin 6-Database Persistence Mesh Tour (4 Steps)
  startAdminDbTour(force = false) {
    if (!force && localStorage.getItem('gazette_tour_admin_db_v1')) return;

    const driverObj = driver({
      showProgress: true,
      animate: !isReducedMotion(),
      popoverClass: 'gazette-driver-popover',
      onDestroyStarted: () => {
        localStorage.setItem('gazette_tour_admin_db_v1', 'true');
        driverObj.destroy();
      },
      steps: [
        {
          element: '#tour-db-topology',
          popover: {
            title: '1. Multi-Engine Topology',
            description: 'The Gazette mesh integrates PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, and ClickHouse.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-active',
          popover: {
            title: '2. Active Database Engine',
            description: 'Indicates the primary operational core actively serving user authentication and article transactions.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-health',
          popover: {
            title: '3. Real-Time Heartbeat Telemetry',
            description: 'Monitors latency, socket health, and schema validation across all 6 engines continuously.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-switcher',
          popover: {
            title: '4. Zero-Downtime Engine Switcher',
            description: 'Switch the primary persistence engine dynamically at runtime without restarting the NestJS daemon.',
            side: 'top',
            align: 'start',
          },
        },
      ],
    });

    driverObj.drive();
  },
};
```

---

## 3. NumberFlow Live Metric Odometer Transitions (`@number-flow/react`)

### Scope & Performance Enforcement (Per Roadmap Spec)
- `@number-flow/react` is scoped strictly to **meaningful telemetry metric values** (User Dashboard stats and Admin BullMQ Queue depths) to avoid visual noise on static numbers.
- **Throttling Rapid Updates:** For high-throughput queues (BullMQ completed/failed tasks), visual transitions are coalesced (e.g. 500ms debounce/throttle window) while underlying state remains real-time.
- **Reduced Motion:** When `prefers-reduced-motion: reduce` is active, numbers update statically without rolling odometer animations.

### Implementations

#### A. User Dashboard Metric Counters
File: `client/src/pages/user/UserDashboardPage.tsx`
- Replace static digits in cards:
  - **Published Stories** count: `<NumberFlow value={publishedCount} />`
  - **In Review Manuscripts**: `<NumberFlow value={inReviewCount} />`
  - **Active Drafts**: `<NumberFlow value={draftsCount} />`
  - **Total Manuscripts**: `<NumberFlow value={totalCount} />`

#### B. BullMQ Queue Depth Telemetry
File: `client/src/pages/admin/JobsManagerPage.tsx`
- Replace live queue polling counts:
  - **Waiting Jobs**: `<NumberFlow value={queue.counts.waiting} />`
  - **Active Jobs**: `<NumberFlow value={queue.counts.active} />`
  - **Completed Jobs**: `<NumberFlow value={queue.counts.completed} />`
  - **Failed Jobs**: `<NumberFlow value={queue.counts.failed} />`
  - **Delayed Jobs**: `<NumberFlow value={queue.counts.delayed} />`

---

## 4. Testing & Verification Gate

### A. Playwright End-to-End Suite (`client/tests/phase2-interaction.spec.ts`)
Automated browser test verifying:
1. **Author Tour Flow:** First visit triggers Driver.js, steps forward through all 5 items, completes, sets localStorage key, and does not repeat upon page reload.
2. **Replay Trigger:** Clicking "Take Tour" in the subheader successfully re-launches the tour.
3. **Modal Motion:** Modal opens, renders smoothly, and unmounts cleanly on ESC or backdrop click.
4. **NumberFlow:** Metrics render numerical text correctly and transition smoothly on state updates.

### B. React Doctor Audit
- Run `npx -y react-doctor@latest --yes --no-telemetry --no-supply-chain` to ensure no new lifecycle bugs or effect memory leaks were introduced.

### C. Build & Bundle Gate
- Execute `npm run build -w client` (`tsc -b && vite build`) to guarantee 0 TypeScript errors and clean production chunking.

---

## 5. Execution Sequence Checklist

- [ ] **Step 1: Create `client/src/services/tour.service.ts`** with 5-step author tour, 4-step admin tour, and persistence logic.
- [ ] **Step 2: Add Driver Popover Styling** to `client/src/index.css` matching the Gazette editorial theme.
- [ ] **Step 3: Wire Author Tour** in `ArticleEditorPage.tsx` (`#tour-editor-*` IDs + "Guided Tour" replay button).
- [ ] **Step 4: Wire Admin Tour** in `DatabaseSwitcherPage.tsx` (`#tour-db-*` IDs + "Take Tour" replay button).
- [ ] **Step 5: Add NumberFlow** to `UserDashboardPage.tsx` for manuscripts, drafts, and publication counts.
- [ ] **Step 6: Add NumberFlow** to `JobsManagerPage.tsx` for BullMQ queue telemetry.
- [ ] **Step 7: Wire Motion Transitions** in `MediaPickerModal.tsx`, `VideoUploadModal.tsx`, `DocumentImportModal.tsx`, and `NotificationDrawer.tsx`.
- [ ] **Step 8: Add Playwright Test Suite** `client/tests/phase2-interaction.spec.ts`.
- [ ] **Step 9: Run Test Suite & React Doctor Audit**.
- [ ] **Step 10: Run Production Build (`npm run build -w client`)**.
