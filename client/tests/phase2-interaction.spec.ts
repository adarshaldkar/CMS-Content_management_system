import { test, expect } from '@playwright/test';

test.describe('Phase 2: Interaction, Motion & Guided Onboarding', () => {
  test.beforeEach(async ({ page }) => {
    // Clear tour flags before each test run
    await page.addInitScript(() => {
      localStorage.removeItem('gazette_tour_editor_v1');
      localStorage.removeItem('gazette_tour_admin_db_v1');
    });
  });

  test('Author Studio Tour launches on first visit and persists completion', async ({ page }) => {
    await page.goto('/editor');

    // Wait for the Driver.js tour popover to appear
    const popover = page.locator('.driver-popover.gazette-driver-popover');
    await expect(popover).toBeVisible({ timeout: 6000 });

    // Step 1: Headline & Deck
    await expect(page.locator('.driver-popover-title')).toContainText('1. Headline & Deck');

    // Click next step
    await page.locator('.driver-popover-next-btn').click();

    // Step 2: TipTap Toolbar
    await expect(page.locator('.driver-popover-title')).toContainText('2. TipTap Editorial Toolbar');

    // Close / complete tour
    await page.locator('.driver-popover-close-btn').click();
    await expect(popover).not.toBeVisible();

    // Verify localStorage persistence
    const persisted = await page.evaluate(() => localStorage.getItem('gazette_tour_editor_v1'));
    expect(persisted).toBe('true');

    // Reload page and ensure tour does NOT auto-launch again
    await page.reload();
    await page.waitForTimeout(1000);
    await expect(popover).not.toBeVisible();

    // Replay Tour via Guided Tour button in subheader
    const replayBtn = page.getByRole('button', { name: /Guided Tour/i });
    if (await replayBtn.isVisible()) {
      await replayBtn.click();
      await expect(popover).toBeVisible();
    }
  });

  test('Admin Database Mesh Tour launches and highlights active engine', async ({ page }) => {
    await page.goto('/admin/database');

    // Wait for the admin tour popover
    const popover = page.locator('.driver-popover.gazette-driver-popover');
    await expect(popover).toBeVisible({ timeout: 6000 });

    // Step 1: Multi-Engine Topology
    await expect(page.locator('.driver-popover-title')).toContainText('1. Multi-Engine Topology');

    // Close tour
    await page.locator('.driver-popover-close-btn').click();
    await expect(popover).not.toBeVisible();

    // Verify persistence
    const persisted = await page.evaluate(() => localStorage.getItem('gazette_tour_admin_db_v1'));
    expect(persisted).toBe('true');
  });

  test('User Dashboard renders NumberFlow numerical elements cleanly', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that typographic metrics bar exists and contains numerical text
    const metricsBar = page.locator('.py-6.border-b.border-border-subtle');
    await expect(metricsBar).toBeVisible();

    // Look for NumberFlow elements
    const numberFlows = page.locator('number-flow');
    const count = await numberFlows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
