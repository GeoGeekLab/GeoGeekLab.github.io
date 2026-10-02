import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');
const tinyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');

async function expectNoSeriousAxeViolations(page) {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice']
      },
      resultTypes: ['violations']
    });
    return results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious');
  });
  expect(violations.map(item => `${item.impact}:${item.id}[${item.nodes.length}]`)).toEqual([]);
}

test('Earth temporal lab consumes unified GIBS products and exposes date-scoped raster provenance', async ({ page }) => {
  let gibsRequests = 0;
  await page.route('https://gibs.earthdata.nasa.gov/**', route => {
    gibsRequests += 1;
    return route.fulfill({
      status: 200,
      contentType: 'image/gif',
      body: tinyGif
    });
  });

  await page.goto('/lab.html?instrument=earth#l05', { waitUntil: 'domcontentloaded' });

  const lab = page.locator('.earth-observation-lab');
  await expect(lab).toBeVisible({ timeout: 10000 });
  await expect(page.locator('#eoInspectorTitle')).toHaveText('True color');
  await expect(page.locator('[data-earth-layer]')).toHaveCount(3);
  await expect(page.locator('#eoLatest')).toHaveText('SAFE DATE');
  await expect(page.locator('#eoCoverageEnd')).toContainText('SAFE THROUGH');
  await expect(page.locator('#eoInspectorMeta')).toContainText('RECENT-DATE POLICY');
  await expect(page.locator('#eoInspectorMeta')).toContainText('DISPLAY SAMPLE');
  await expect(page.locator('#eoInspectorMeta')).toContainText('DELIVERY');
  await expect(page.locator('#eoInspectorMeta')).toContainText('FRESHNESS');
  await expect(page.locator('.instrument-status')).toContainText('STATUS / TILE · DATE-SCOPED');
  await expect(page.locator('.instrument-status')).not.toContainText('LIVE');
  await expect(page.locator('#eoSupplyState')).toHaveText('TILE · DATE-SCOPED');

  const contract = await page.evaluate(() => {
    const description = window.GeoDataSupply.describe('nasa-gibs');
    return {
      sameProducts:window.GeoEarthTemporalLab.layers === window.GeoDataSupply.products('nasa-gibs'),
      productCount:window.GeoEarthTemporalLab.layers.length,
      requestStatus:description.request?.status,
      requestProduct:description.request?.productId,
      transport:description.transport,
      observationTime:description.request?.observationTime,
      hasPrivateMode:window.GeoEarthTemporalLab.layers.some(layer => Object.hasOwn(layer, 'mode') || Object.hasOwn(layer, 'lag') || Object.hasOwn(layer, 'start'))
    };
  });
  expect(contract.sameProducts).toBe(true);
  expect(contract.productCount).toBe(8);
  expect(contract.requestStatus).toBe('available');
  expect(contract.requestProduct).toBe('terra-true');
  expect(contract.transport).toBe('provider-raster');
  expect(contract.observationTime).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
  expect(contract.hasPrivateMode).toBe(false);

  await expect.poll(async () => {
    const box = await page.locator('#eoFrame').boundingBox();
    return box ? box.width / box.height : 0;
  }, { timeout: 10000 }).toBeGreaterThan(1.98);
  const frameBox = await page.locator('#eoFrame').boundingBox();
  expect(frameBox.width / frameBox.height).toBeLessThan(2.02);

  const range = page.locator('#eoRange');
  const archiveDays = await range.evaluate(node => Number(node.max));
  expect(archiveDays).toBeGreaterThan(5000);
  await expect(page.locator('#eoLayerList')).toHaveAttribute('role', 'tabpanel');
  await expect(page.locator('[data-group="VISUAL"]')).toHaveAttribute('tabindex', '0');
  await expectNoSeriousAxeViolations(page);

  await page.waitForTimeout(80);
  const beforeDrag = gibsRequests;
  await range.evaluate(node => {
    for (const value of [8, 16, 24, 32, 40, 48]) {
      node.value = String(value);
      node.dispatchEvent(new Event('input', { bubbles:true }));
    }
  });
  await page.waitForTimeout(60);
  expect(gibsRequests - beforeDrag).toBe(0);
  await page.waitForTimeout(220);
  expect(gibsRequests - beforeDrag).toBeLessThanOrEqual(4);

  const dateInput = page.locator('#eoDate');
  await dateInput.fill('2024-01-15');
  await dateInput.dispatchEvent('change');
  await expect(dateInput).toHaveValue('2024-01-15');

  const visualTab = page.locator('[data-group="VISUAL"]');
  await visualTab.focus();
  await visualTab.press('ArrowRight');
  await expect(page.locator('[data-group="THERMAL"]')).toBeFocused();

  const thermal = page.locator('[data-earth-layer="surface-temp"]');
  await expect(thermal).toBeVisible();
  await thermal.click();
  await expect(page.locator('#eoInspectorTitle')).toHaveText('Land surface temperature');
  await expect(page.locator('#eoInspectorMeta')).toContainText('Conservative T-2 day request window');
  await expect(page.locator('#eoInspectorMeta')).toContainText('authoritative color legend');
  await expect(page.locator('#eoInspectorMeta')).toContainText('HTTPS WMS · PROVIDER RASTER');
  await expect(page.locator('#eoOpacityWrap')).toBeVisible();
  await expect(dateInput).toHaveValue('2024-01-15');
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.productId)).toBe('surface-temp');
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');

  const compare = page.locator('#eoCompare');
  await compare.click();
  await expect(compare).toHaveAttribute('aria-pressed', 'true');
  const handle = page.locator('#eoCompareHandle');
  await expect(handle).toBeVisible();
  await expect(page).toHaveURL(/earthCompare=1/);

  await page.locator('[data-offset="30"]').click();
  await expect(page.locator('#eoHudReference')).toContainText('30D');
  await expect(page).toHaveURL(/earthOffset=30/);

  await handle.focus();
  await handle.press('End');
  await expect(handle).toHaveAttribute('aria-valuenow', '95');
  await expect(page).toHaveURL(/earthSplit=95/);

  const worldviewHref = await page.locator('#eoSourceLink').getAttribute('href');
  const worldview = new URL(worldviewHref);
  expect(worldview.hostname).toBe('worldview.earthdata.nasa.gov');
  expect(worldview.searchParams.get('l')).toContain('VIIRS_NOAA20_Land_Surface_Temp_Day');
  expect(worldview.searchParams.get('t')).toContain('2024-01-15');
  expect(worldview.searchParams.get('ca')).toBe('true');
  expect(worldview.searchParams.get('cm')).toBe('swipe');
  expect(worldview.searchParams.get('cv')).toBe('95');

  await page.locator('#eoGrid').click();
  await expect(page.locator('#eoGrid')).toHaveAttribute('aria-pressed', 'false');
  await expectNoSeriousAxeViolations(page);
});
