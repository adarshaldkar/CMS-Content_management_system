import { defineConfig, devices } from '@playwright/test';

/**
 * Gazette CMS — Playwright Production Test Configuration
 * Tiered testing strategy: Smoke (Chromium), Full Cross-Browser (Firefox, WebKit), Mobile Viewports.
 */
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 45 * 1000,
  expect: {
    timeout: 7000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'test-results/playwright-report', open: 'never' }],
  ],
  outputDir: 'test-results/artifacts',

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10 * 1000,
    navigationTimeout: 15 * 1000,
  },

  projects: [
    // ── Tier 1: Core Chromium Desktop ────────────────────────────────
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // ── Tier 2: Cross-Browser Regression ─────────────────────────────
    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        viewport: { width: 1440, height: 900 },
      },
    },
    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1440, height: 900 },
      },
    },

    // ── Tier 3: Mobile Viewport Matrix ───────────────────────────────
    {
      name: 'mobile-safari',
      use: {
        ...devices['iPhone 15 Pro'],
      },
    },
    {
      name: 'mobile-chrome',
      use: {
        ...devices['Pixel 8'],
      },
    },
  ],

  // Connects or boots local webServer if not already running
  webServer: process.env.CI
    ? {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: true,
        timeout: 120 * 1000,
      }
    : undefined,
});
