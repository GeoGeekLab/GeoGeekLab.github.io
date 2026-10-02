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

test('Earth temporal lab uses unified viewport WMS provenance, navigation and swipe compare', async ({ page }) => {
  let gibsRequests = 0;
  const requestUrls = [];
  await page.route('https://gibs.earthdata.nasa.gov/**', route => {
    gibsRequests += 1;
    requestUrls.push(route.request().url());
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
  await expect(page.locator('#eoInspectorMeta')).toContainText('VIEWPORT');
  await expect(page.locator('#eoInspectorMeta')).toContainText('DELIVERY');
  await expect(page.locator('#eoInspectorMeta')).toContainText('FRESHNESS');
  await expect(page.locator('.instrument-status')).toContainText('STATUS / WMS · VIEWPORT · DATE-SCOPED');
  await expect(page.locator('.instrument-status')).not.toContainText('LIVE');
  await expect(page.locator('#eoSupplyState')).toHaveText('WMS · VIEWPORT');
  await expect(page.locator('#eoZoomReadout')).toHaveText('Z 1.0');

  const contract = await page.evaluate(() => {
    const description = window.GeoDataSupply.describe('nasa-gibs');
    return {
      sameProducts:window.GeoEarthTemporalLab.layers === window.GeoDataSupply.products('nasa-gibs'),
      productCount:window.GeoEarthTemporalLab.layers.length,
      requestStatus:description.request?.status,
      requestProduct:description.request?.productId,
      transport:description.transport,
      observationTime:description.request?.observationTime,
      scope:description.request?.scope,
      bbox:document.querySelector('#eoFrame')?.dataset.bbox,
      zoom:document.querySelector('#eoFrame')?.dataset.zoom,
      hasPrivateMode:window.GeoEarthTemporalLab.layers.some(layer => Object.hasOwn(layer, 'mode') || Object.hasOwn(layer, 'lag') || Object.hasOwn(layer, 'start'))
    };
  });
  expect(contract.sameProducts).toBe(true);
  expect(contract.productCount).toBe(8);
  expect(contract.requestStatus).toBe('available');
  expect(contract.requestProduct).toBe('terra-true');
  expect(contract.transport).toBe('provider-raster');
  expect(contract.observationTime).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00Z$/);
  expect(contract.scope).toContain('VIEWPORT · EPSG:4326 · BBOX');
  expect(contract.bbox).toBe('-180.0000,-90.0000,180.0000,90.0000');
  expect(contract.zoom).toBe('1.00');
  expect(contract.hasPrivateMode).toBe(false);

  await expect.poll(async () => {
    const box = await page.locator('#eoFrame').boundingBox();
    return box ? box.width / box.height : 0;
  }, { timeout: 10000 }).toBeGreaterThan(1.98);
  const frameBox = await page.locator('#eoFrame').boundingBox();
  expect(frameBox.width / frameBox.height).toBeLessThan(2.02);

  const initialWms = new URL(requestUrls.find(url => url.includes('REQUEST=GetMap') || url.includes('request=GetMap')) || requestUrls.at(-1));
  expect(initialWms.searchParams.get('bbox').split(',').map(Number)).toEqual([-180, -90, 180, 90]);

  const beforeZoom = gibsRequests;
  await page.locator('#eoZoomIn').click();
  await expect(page.locator('#eoZoomReadout')).not.toHaveText('Z 1.0');
  await expect(page).toHaveURL(/earthZ=/);
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');
  expect(gibsRequests).toBeGreaterThan(beforeZoom);

  const zoomState = await page.evaluate(() => {
    const frame = document.querySelector('#eoFrame');
    const description = window.GeoDataSupply.describe('nasa-gibs');
    return { bbox:frame.dataset.bbox.split(',').map(Number), zoom:Number(frame.dataset.zoom), scope:description.request?.scope };
  });
  expect(zoomState.zoom).toBeGreaterThan(1);
  expect(zoomState.bbox[2] - zoomState.bbox[0]).toBeLessThan(360);
  expect(zoomState.bbox[3] - zoomState.bbox[1]).toBeLessThan(180);
  expect(zoomState.scope).toContain('VIEWPORT');

  // Isolate the wheel gesture from the request that committed the previous
  // button zoom. Dispatch one deterministic burst inside the browser so this
  // verifies application debounce semantics rather than Playwright command
  // scheduling latency between individual wheel calls.
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');
  const settledBeforeWheel = gibsRequests;
  await page.waitForTimeout(90);
  expect(gibsRequests).toBe(settledBeforeWheel);

  const beforeWheel = gibsRequests;
  const frame = page.locator('#eoFrame');
  await frame.evaluate(node => {
    const rect = node.getBoundingClientRect();
    const init = {
      bubbles:true,
      cancelable:true,
      deltaY:-80,
      deltaMode:0,
      clientX:rect.left + rect.width * .62,
      clientY:rect.top + rect.height * .45
    };
    for (let i = 0; i < 5; i += 1) node.dispatchEvent(new WheelEvent('wheel', init));
  });
  await page.waitForTimeout(80);
  expect(gibsRequests - beforeWheel).toBe(0);
  await page.waitForTimeout(360);
  const wheelRequests = gibsRequests - beforeWheel;
  expect(wheelRequests).toBeGreaterThan(0);
  expect(wheelRequests).toBeLessThanOrEqual(2);
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');

  const beforePan = gibsRequests;
  const rect = await frame.boundingBox();
  await page.mouse.move(rect.x + rect.width * .55, rect.y + rect.height * .55);
  await page.mouse.down();
  await page.mouse.move(rect.x + rect.width * .42, rect.y + rect.height * .48, { steps:4 });
  await page.mouse.up();
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');
  expect(gibsRequests).toBeGreaterThan(beforePan);
  const pannedUrl = new URL(requestUrls.at(-1));
  expect(pannedUrl.searchParams.get('bbox')).not.toBe('-180.000000,-90.000000,180.000000,90.000000');
  await expect(page).toHaveURL(/earthLon=/);
  await expect(page).toHaveURL(/earthLat=/);

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
  await expect(page.locator('#eoInspectorMeta')).toContainText('HTTPS WMS 1.1.1 · PROVIDER RASTER');
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
  expect(worldview.searchParams.get('v')).not.toBe('-180,-90,180,90');

  await page.locator('#eoFit').click();
  await expect(page.locator('#eoZoomReadout')).toHaveText('Z 1.0');
  await expect(page).not.toHaveURL(/earthZ=/);
  await expect(page.locator('#eoFrame')).toHaveAttribute('data-bbox', '-180.0000,-90.0000,180.0000,90.0000');

  await page.locator('#eoGrid').click();
  await expect(page.locator('#eoGrid')).toHaveAttribute('aria-pressed', 'false');
  await expectNoSeriousAxeViolations(page);
});

test('Earth viewport WMS keeps the last real frame when the provider becomes unavailable', async ({ page }) => {
  let failProvider = false;
  await page.route('https://gibs.earthdata.nasa.gov/**', route => {
    if (failProvider) {
      return route.fulfill({ status:503, contentType:'text/plain', body:'provider unavailable' });
    }
    return route.fulfill({ status:200, contentType:'image/gif', body:tinyGif });
  });

  await page.goto('/lab.html?instrument=earth#l05', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.earth-observation-lab')).toBeVisible({ timeout:10000 });
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('available');

  const previousSrc = await page.locator('#eoImageA img[data-eo-role="observation"]').getAttribute('src');
  expect(previousSrc).toContain('gibs.earthdata.nasa.gov');

  failProvider = true;
  await page.locator('#eoZoomIn').click();
  await expect.poll(() => page.evaluate(() => window.GeoDataSupply.describe('nasa-gibs').request?.status)).toBe('unavailable');
  await expect(page.locator('#eoSupplyState')).toHaveText('UNAVAILABLE');
  await expect(page.locator('.instrument-status')).toContainText('STATUS / UNAVAILABLE · WMS VIEWPORT');
  await expect(page.locator('.instrument-status')).not.toContainText('LIVE');
  await expect(page.locator('#eoLoading')).toContainText('PREVIOUS FRAME RETAINED');
  await expect(page.locator('#eoImageA img[data-eo-role="observation"]')).toHaveAttribute('src', previousSrc);
  await expect(page.locator('#instrumentStage')).not.toContainText('DEMO');
});
