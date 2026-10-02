import { test, expect } from '@playwright/test';

test('Atlas keeps the global information scale and reading rail aligned', async ({ page }, testInfo) => {
  const response = await page.goto('/atlas.html', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForSelector('#atlasStage .atlas-node');

  const scale = page.locator('.atlas-page > .scale-ui');
  const sidebar = page.locator('.atlas-workspace > .atlas-sidebar');
  const inspector = sidebar.locator(':scope > #atlasTip');
  const key = sidebar.locator(':scope > .atlas-key');

  // The later Atlas alignment intentionally restored the site-wide, viewport-level
  // information scale while keeping Atlas-specific reading tools in the rail.
  await expect(scale).toHaveCount(1);
  await expect(sidebar).toHaveCount(1);
  await expect(sidebar.locator(':scope > .scale-ui')).toHaveCount(0);
  await expect(inspector).toHaveCount(1);
  await expect(key).toHaveCount(1);

  if (testInfo.project.name === 'mobile-chromium') {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    return;
  }

  const geometry = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    return {
      stage: rect('#atlasStage'),
      sidebar: rect('.atlas-sidebar'),
      inspector: rect('.atlas-sidebar > #atlasTip'),
      key: rect('.atlas-sidebar > .atlas-key')
    };
  });

  expect(Math.abs(geometry.stage.top - geometry.sidebar.top)).toBeLessThanOrEqual(2);
  expect(geometry.inspector.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.inspector.right).toBeLessThanOrEqual(geometry.sidebar.right + 1);
  expect(geometry.key.top).toBeGreaterThan(geometry.inspector.top);
  expect(geometry.key.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.key.right).toBeLessThanOrEqual(geometry.sidebar.right + 1);
});
