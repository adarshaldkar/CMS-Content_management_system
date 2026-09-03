import { driver } from 'driver.js';

const isReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const tourService = {
  /**
   * 1. Author Writing Studio Tour (5 Steps)
   */
  startEditorTour(force = false) {
    if (typeof window === 'undefined') return;
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
            description: 'Craft a compelling, typography-driven headline. The URL slug auto-generates in real-time as you write.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-toolbar',
          popover: {
            title: '2. TipTap Editorial Toolbar',
            description: 'Format typography with pull-quotes, callouts, footnotes, code syntax, and drop-caps for reading excellence.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-doc-import',
          popover: {
            title: '3. Document Import Pipeline',
            description: 'Instantly ingest raw Word (.docx), PDF, or Markdown files directly into editable semantic blocks.',
            side: 'bottom',
            align: 'start',
          },
        },
        {
          element: '#tour-editor-media',
          popover: {
            title: '4. Native Video & Media Assets',
            description: 'Embed high-resolution images and native video streams with chunked HTTP Range playback.',
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
            description: 'The Gazette mesh integrates PostgreSQL, MongoDB, MariaDB, MySQL, CockroachDB, and ClickHouse in parallel.',
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
