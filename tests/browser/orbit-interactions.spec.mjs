import { test, expect } from '@playwright/test';

const ORBIT_FIXTURE = [{
  OBJECT_NAME: 'ORBIT INTERACTION FIXTURE',
  OBJECT_ID: '1998-067A',
  EPOCH: '2025-03-26T05:19:34.116960',
  MEAN_MOTION: 15.00555103,
  ECCENTRICITY: 0.000583,
  INCLINATION: 98.3164,
  RA_OF_ASC_NODE: 103.8411,
  ARG_OF_PERICENTER: 20.5667,
  MEAN_ANOMALY: 339.5789,
  EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U',
  NORAD_CAT_ID: 25544,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 8655,
  BSTAR: 0.00048021,
  MEAN_MOTION_DOT: 0.00005995,
  MEAN_MOTION_DDOT: 0,
}];

async function stubOrbitCatalog(page) {
  await page.route(/https:\/\/celestrak\.org\/NORAD\/elements\/gp\.php\?.*/, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(ORBIT_FIXTURE),
  }));
}

test.beforeEach(async ({ page }) => {
  await stubOrbitCatalog(page);
});

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
  await expect(page.locator('#orbitNorad')).toContainText('25544', { timeout: 10000 });
  await expect(page.locator('.orbit-ground-relation-legend')).toContainText('GEOMETRIC HORIZON');
});
