import { test, expect } from '@playwright/test';

test('Round 4 Atlas anchors scale and key to the workspace sidebar', async ({ page }, testInfo) => {
  const response = await page.goto('/atlas.html', { waitUntil: 'domcontentloaded' });
  expect(response?.status()).toBeLessThan(400);
  await page.waitForSelector('#atlasStage .atlas-node');

  const sidebar = page.locator('.atlas-workspace > .atlas-sidebar');
  const scale = sidebar.locator(':scope > .scale-ui');
  const inspector = sidebar.locator(':scope > #atlasTip');
  const key = sidebar.locator(':scope > .atlas-key');

  await expect(sidebar).toHaveCount(1);
  await expect(scale).toHaveCount(1);
  await expect(inspector).toHaveCount(1);
  await expect(key).toHaveCount(1);

  if (testInfo.project.name === 'mobile-chromium') {
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(1);
    return;
  }

  const position = await scale.evaluate(node => getComputedStyle(node).position);
  expect(position).not.toBe('fixed');

  const geometry = await page.evaluate(() => {
    const rect = selector => document.querySelector(selector).getBoundingClientRect();
    return {
      stage: rect('#atlasStage'),
      sidebar: rect('.atlas-sidebar'),
      scale: rect('.atlas-sidebar > .scale-ui'),
      inspector: rect('.atlas-sidebar > #atlasTip'),
      key: rect('.atlas-sidebar > .atlas-key')
    };
  });

  expect(Math.abs(geometry.stage.top - geometry.sidebar.top)).toBeLessThanOrEqual(2);
  expect(geometry.scale.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.scale.right).toBeLessThanOrEqual(geometry.sidebar.right + 1);
  expect(geometry.scale.right).toBeLessThanOrEqual(geometry.stage.right + geometry.sidebar.width + 32);
  expect(geometry.inspector.top).toBeGreaterThan(geometry.scale.bottom);
  expect(geometry.key.top).toBeGreaterThan(geometry.inspector.top);
  expect(geometry.key.left).toBeGreaterThanOrEqual(geometry.sidebar.left - 1);
  expect(geometry.key.right).toBeLessThanOrEqual(geometry.sidebar.right + 1);
});
