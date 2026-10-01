import { test, expect } from '@playwright/test';

test('Orbit exposes advanced controls and forwards wheel zoom across the field', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit#l04', { waitUntil: 'domcontentloaded' });

  const orbit = page.locator('.orbit-v2');
  await expect(orbit).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.orbit-enhancement-card')).toBeVisible();
  await expect(page.locator('.orbit-station-editor')).toBeVisible();

  const status = page.locator('.instrument-status');
  await expect(status).not.toContainText(/DEMO/i);

  await page.evaluate(() => {
    window.__orbitWheelCount = 0;
    document.querySelector('.orbit-canvas')?.addEventListener('wheel', () => {
      window.__orbitWheelCount += 1;
    });
  });

  const hud = page.locator('.orbit-hud');
  await hud.hover();
  await page.mouse.wheel(0, -320);
  await expect.poll(() => page.evaluate(() => window.__orbitWheelCount)).toBeGreaterThan(0);

  const before = await page.evaluate(() => window.__orbitWheelCount);
  await page.locator('[data-orbit-zoom="in"]').click();
  await expect.poll(() => page.evaluate(() => window.__orbitWheelCount)).toBeGreaterThan(before);

  const range = page.locator('#orbitTimeRange');
  const start = Number(await range.inputValue());
  await page.locator('[data-orbit-step="1"]').click();
  await expect.poll(async () => Number(await range.inputValue())).toBeGreaterThan(start);
});

test('Orbit deep links a selected catalog object and never presents a synthetic fallback label', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.orbit-v2')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.instrument-status')).not.toContainText(/DEMO/i);
  await expect(page.locator('.orbit-ground-relation-legend')).toContainText('GEOMETRIC HORIZON');
});
