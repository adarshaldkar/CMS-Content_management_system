import { driver, type Config } from 'driver.js';

const isReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const tourService = {
  /**
   * 1. Author Writing Studio Tour (Interactive 10-Step Interactive Guide)
   */
  startEditorTour(force = false) {
    if (typeof window === 'undefined') return;
    if (!force && localStorage.getItem('gazette_tour_editor_v2')) return;

    // Verify critical elements are rendered
    const titleEl = document.querySelector('#tour-editor-title');
    if (!titleEl && !force) return;

    const tourConfig: Config = {
      showProgress: true,
      animate: !isReducedMotion(),
      popoverClass: 'gazette-driver-popover',
      allowClose: true,
      nextBtnText: 'Next →',
      prevBtnText: '← Back',
      doneBtnText: 'Start Writing ✍️',
      progressText: 'Step {{current}} of {{total}}',
      onDestroyStarted: () => {
        localStorage.setItem('gazette_tour_editor_v2', 'true');
        driverObj.destroy();
      },
      steps: [
        {
          element: '#tour-editor-title',
          popover: {
            title: '1. Typography-Driven Storytelling',
            description:
              'Craft a compelling headline and editorial dek. The article URL slug and SEO tags automatically auto-generate in real-time as you write.\n\n💡 <em>Tip: Clean serif typography provides a distraction-free writing environment.</em>',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-ribbon',
          popover: {
            title: '2. Sticky Word-Grade Ribbon',
            description:
              'Full Microsoft Word–caliber organization categorized into 7 structured dropdowns: <strong>Text</strong>, <strong>Format</strong>, <strong>Insert</strong>, <strong>Media</strong>, <strong>Editorial</strong>, <strong>Review</strong>, and <strong>View</strong>.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-doc-import',
          popover: {
            title: '3. Multi-Format Document Ingestion',
            description:
              'Instantly ingest raw Word (.docx), PDF, or Markdown files into editable semantic blocks with paginated A4 sheet preview, structured headings, and table conversion.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-editor-media',
          popover: {
            title: '4. Visual Assets & Precision Resizing',
            description:
              'Embed high-resolution images and native video streams. Click any image on canvas to activate <strong>8-handle drag resizing</strong>, arrow key nudging, and central repositioning.',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-editor-canvas',
          popover: {
            title: '5. Manuscript Canvas & Shortcuts',
            description:
              'Write freely with Word-grade hotkeys (<code>Ctrl+Alt+1..3</code> for headings, <code>Ctrl+B/I/U/K</code>, <code>Ctrl+Shift+H</code> for semantic highlight). Type <kbd className="font-mono bg-slate-100 px-1 py-0.5 rounded text-rose-800">/</kbd> on any blank line to summon the quick command palette!',
            side: 'top',
            align: 'center',
          },
        },
        {
          element: '#tour-editor-workflow',
          popover: {
            title: '6. Workflow Action Bar & Revisions',
            description:
              'Monitors real-time word count, reading duration, and editorial revision lineage (v1, v2). Transition status from <em>Draft</em> → <em>In Review</em> → <em>Approved</em> seamlessly.',
            side: 'top',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-mode-switcher',
          popover: {
            title: '7. Dynamic 3-Mode Workspace',
            description:
              'Seamlessly switch between <strong>Write</strong> (manuscript canvas), <strong>Review</strong> (side-by-side visual revision diff), and <strong>Preview</strong> (reader frontpage simulation).',
            side: 'bottom',
            align: 'center',
          },
        },
        {
          element: '#tour-editor-inspector',
          popover: {
            title: '8. Contextual Taxonomy & SERP Inspector',
            description:
              'Collapsible side panel with editorial taxonomy, cover visual selector, live Google SERP social card simulator, and dynamic Table of Contents generated from your headings.',
            side: 'left',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-save-exit',
          popover: {
            title: '9. Zero Data-Loss & "Save & Exit"',
            description:
              'Protected by continuous IndexedDB local backup and triple navigation guards. Use <strong>Save & Exit</strong> to safely flush changes to the database and exit without data loss.',
            side: 'bottom',
            align: 'end',
          },
        },
        {
          element: '#tour-editor-publish',
          popover: {
            title: '10. Pre-Publish Quality Gate',
            description:
              'Launches an automated pre-publish audit checking headline length, word count, excerpt, featured media, tags, and VIP publishing clearance slots before launching story to readers!',
            side: 'bottom',
            align: 'end',
          },
        },
      ],
    };

    const driverObj = driver(tourConfig);
    driverObj.drive();
  },

  /**
   * 2. Admin 6-Database Persistence Mesh Tour (4 Steps)
   */
  startAdminDbTour(force = false) {
    if (typeof window === 'undefined') return;
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
            description:
              'The Gazette mesh integrates PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, and ClickHouse in parallel.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-active',
          popover: {
            title: '2. Active Database Engine',
            description:
              'Indicates the primary operational core actively serving user authentication and article transactions.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-health',
          popover: {
            title: '3. Real-Time Heartbeat Telemetry',
            description:
              'Monitors latency, socket health, and schema validation across all 6 engines continuously.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-db-switcher',
          popover: {
            title: '4. Zero-Downtime Engine Switcher',
            description:
              'Switch the primary persistence engine dynamically at runtime without restarting the NestJS daemon.',
            side: 'top',
            align: 'start',
          },
        },
      ],
    });

    driverObj.drive();
  },
};
