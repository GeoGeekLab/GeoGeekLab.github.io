import { test, expect } from '@playwright/test';

const ORBIT_FIXTURE = [{
  OBJECT_NAME: 'ORBIT INTERACTION FIXTURE',
  OBJECT_ID: '1998-067A',
  EPOCH: '2026-10-01T22:19:34.116960',
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

async function stubOrbitSnapshot(page) {
  const fetchedAt = new Date().toISOString();
  await page.route('**/orbital/data/active.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(ORBIT_FIXTURE),
  }));
  await page.route('**/orbital/data/active.meta.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      schemaVersion: 1,
      dataset: 'celestrak-active-gp',
      format: 'CCSDS OMM JSON',
      source: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
      delivery: 'GeoGeek same-origin snapshot',
      fetchedAt,
      recordCount: ORBIT_FIXTURE.length,
      sha256: 'fixture',
      epochs: { oldest:ORBIT_FIXTURE[0].EPOCH, median:ORBIT_FIXTURE[0].EPOCH, newest:ORBIT_FIXTURE[0].EPOCH },
      refreshPolicy: { minimumHours:2, officialRequestsPerRun:1, retryOnHttpError:false, lastKnownGoodOnFailure:true },
    }),
  }));
}

test.beforeEach(async ({ page }) => {
  await stubOrbitSnapshot(page);
});

test('Orbit exposes advanced controls and forwards wheel zoom across the field', async ({ page }) => {
  const upstreamRequests = [];
  page.on('request', request => {
    if (/celestrak\.org\/NORAD\/elements\/gp\.php/i.test(request.url())) upstreamRequests.push(request.url());
  });

  await page.goto('/lab.html?instrument=orbit#l04', { waitUntil: 'domcontentloaded' });

  const orbit = page.locator('.orbit-v2');
  await expect(orbit).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.orbit-station-editor')).toBeVisible();
  await expect(page.locator('.orbit-rail-nav')).toBeVisible();
  await expect(page.locator('.orbit-enhancement-card')).toHaveCount(0);
  await expect(page.locator('.orbit-view-advanced')).toBeVisible();

  const status = page.locator('.instrument-status');
  await expect(status).toContainText(/SNAPSHOT/i);
  await expect(status).not.toContainText(/DEMO|LIVE CATALOG/i);
  await expect(orbit).toHaveAttribute('data-catalog-delivery', 'snapshot');
  await expect(page.locator('[data-orbit-delivery="snapshot"]')).toContainText(/same-origin snapshot/i);
  expect(upstreamRequests).toHaveLength(0);

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

test('Orbit deep links a selected catalog object using the same-origin snapshot', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.orbit-v2')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.instrument-status')).toContainText(/SNAPSHOT/i);
  await expect(page.locator('.instrument-status')).not.toContainText(/DEMO/i);
  await expect(page.locator('#orbitNorad')).toContainText('25544', { timeout: 10000 });
  await expect(page.locator('.orbit-ground-relation-legend')).toContainText('GEOMETRIC HORIZON');
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('[data-selection-name]')).toContainText('ORBIT INTERACTION FIXTURE');
});

test('Orbit round-two rail keeps object tasks primary and provenance progressive', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit#l04', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.orbit-v2')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-rail-nav')).toBeVisible();
  await expect(page.locator('.instrument-dialog')).toHaveAttribute('data-workspace-mode', /work|focus|inspect/);

  await page.locator('[data-workspace-mode="work"]').click();
  await expect(page.locator('.orbit-provenance')).toBeHidden();

  const search = page.locator('#orbitSearch');
  await search.fill('25544');
  await expect(page.locator('[data-search-index]')).toHaveCount(1);
  await search.press('ArrowDown');
  await expect(page.locator('[data-search-index]')).toHaveClass(/is-key-active/);
  await search.press('Enter');

  await expect(page.locator('#orbitNorad')).toContainText('25544');
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('[data-orbit-jump="object"]')).toHaveClass(/has-selection/);

  await page.locator('[data-orbit-jump="source"]').click();
  await expect(page.locator('.instrument-dialog')).toHaveAttribute('data-workspace-mode', 'inspect');
  await expect(page.locator('.orbit-provenance')).toBeVisible();

  await page.locator('[data-selection-clear]').click();
  await expect(page.locator('.orbit-selection-bar')).toBeHidden();
});
