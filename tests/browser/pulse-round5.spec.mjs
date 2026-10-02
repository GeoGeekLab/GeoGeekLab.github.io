import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

async function expectNoSeriousAxeViolations(page) {
  await page.addScriptTag({ path:axePath });
  const violations = await page.evaluate(async () => {
    const results = await window.axe.run(document, {
      runOnly:{ type:'tag', values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa','best-practice'] },
      resultTypes:['violations']
    });
    return results.violations.filter(item => item.impact === 'critical' || item.impact === 'serious');
  });
  expect(violations.map(item => `${item.impact}:${item.id}[${item.nodes.length}]`)).toEqual([]);
}

async function installPulseFixtures(page, {
  count = 360,
  slowSnapshotMs = 0,
  snapshotStatus = 200,
  referenceStatus = 200
} = {}) {
  const now = Date.now();
  const generated = now - 5 * 60 * 1000;
  const spacingMs = Math.max(10_000, Math.floor((23 * 60 * 60 * 1000) / Math.max(1, count)));
  const usgsSource = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  const landSource = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';

  const features = Array.from({ length:count }, (_, index) => ({
    type:'Feature',
    id:`round5-${index}`,
    properties:{
      mag:index % 19 === 0 ? null : 1.1 + (index % 10) * .65,
      place:`Round 5 event ${index + 1}`,
      time:generated - (index + 1) * spacingMs,
      updated:generated - index * Math.max(8_000, Math.floor(spacingMs / 2)),
      status:index % 3 ? 'reviewed' : 'automatic',
      magType:index % 2 ? 'ml' : 'mww',
      sig:60 + index,
      felt:index % 12 === 0 ? 10 + index : null,
      cdi:index % 12 === 0 ? 3.4 : null,
      mmi:index % 15 === 0 ? 4.1 : null,
      url:`https://earthquake.usgs.gov/earthquakes/eventpage/round5-${index}`
    },
    geometry:{
      type:'Point',
      coordinates:[-176 + (index * 31) % 352, -70 + (index * 17) % 140, index % 3 === 0 ? 20 : index % 3 === 1 ? 150 : 430]
    }
  }));

  const quakes = { type:'FeatureCollection', metadata:{ generated, count:features.length, api:'round5-fixture' }, features };
  const quakeMeta = {
    schemaVersion:2,
    supplyId:'usgs-earthquakes-day',
    dataset:'usgs-earthquakes-day',
    provider:'USGS Earthquake Hazards Program',
    format:'GeoJSON',
    source:usgsSource,
    delivery:'GeoGeek same-origin snapshot',
    transport:'HTTPS GeoJSON feed → scheduled refresh → Pages snapshot',
    scope:'Global rolling past-24-hour event catalogue shared by all visitors',
    fetchedAt:new Date(now - 2 * 60 * 1000).toISOString(),
    recordCount:features.length,
    providerCount:features.length,
    providerGeneratedAt:new Date(generated).toISOString(),
    providerApiVersion:'round5-fixture',
    sha256:'round5-fixture-sha'
  };
  const land = {
    type:'FeatureCollection',
    features:[
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-168,12],[-130,12],[-105,35],[-115,70],[-160,70],[-168,12]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-82,10],[-34,10],[-38,-55],[-74,-52],[-82,10]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-10,36],[45,36],[52,-35],[5,-35],[-10,36]]] } }
    ]
  };
  const landMeta = {
    schemaVersion:2,
    supplyId:'natural-earth-land-110m',
    dataset:'natural-earth-land-110m',
    provider:'Natural Earth',
    format:'GeoJSON',
    source:landSource,
    delivery:'GeoGeek same-origin reference',
    version:'Data current 2024-01-24 · pinned GeoJSON revision 0b9a6ceb0a70',
    recordCount:land.features.length,
    sha256:'round5-reference-sha'
  };

  let snapshotHits = 0;
  let referenceHits = 0;
  let providerAttempts = 0;

  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(quakeMeta) }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', async route => {
    snapshotHits += 1;
    if (slowSnapshotMs) await new Promise(resolve => setTimeout(resolve, slowSnapshotMs));
    try {
      await route.fulfill({
        status:snapshotStatus,
        contentType:'application/geo+json',
        body:snapshotStatus === 200 ? JSON.stringify(quakes) : JSON.stringify({ error:'fixture unavailable' })
      });
    } catch {}
  });
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(landMeta) }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => {
    referenceHits += 1;
    return route.fulfill({
      status:referenceStatus,
      contentType:'application/geo+json',
      body:referenceStatus === 200 ? JSON.stringify(land) : JSON.stringify({ error:'fixture unavailable' })
    });
  });

  await page.route('https://earthquake.usgs.gov/**', route => {
    providerAttempts += 1;
    return route.abort();
  });
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@**', route => route.abort());

  return {
    snapshotHits:() => snapshotHits,
    referenceHits:() => referenceHits,
    providerAttempts:() => providerAttempts
  };
}

test('Pulse stays lazy until the instrument is opened', async ({ page }) => {
  await installPulseFixtures(page, { count:120 });
  const pulseAssets = [];
  page.on('request', request => {
    if (/pulse-observation-lab-v[234]\.js/.test(request.url())) pulseAssets.push(request.url());
  });

  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(150);
  expect(pulseAssets).toHaveLength(0);
  expect(await page.evaluate(() => Boolean(window.GeoPulseObservationLab))).toBe(false);

  await page.locator('[data-instrument="pulse"]').first().click();
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });
  expect(pulseAssets.some(url => url.includes('pulse-observation-lab-v4.js'))).toBe(true);
  expect(pulseAssets.some(url => url.includes('pulse-observation-lab-v3.js'))).toBe(true);
  expect(pulseAssets.some(url => url.includes('pulse-observation-lab-v2.js'))).toBe(true);
  expect(await page.evaluate(() => window.GeoPulseObservationLab?.version)).toBe('20261002d');
});

test('Pulse aborts a slow snapshot cleanly when closed before mount completes', async ({ page }) => {
  await installPulseFixtures(page, { count:180, slowSnapshotMs:900 });
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  await page.locator('[data-instrument="pulse"]').first().click();

  await expect(page.locator('#instrumentDialog')).toBeVisible();
  await expect(page.locator('#instrumentStage')).toHaveAttribute('aria-busy', 'true', { timeout:5000 });
  await page.locator('#instrumentClose').click();
  await expect(page.locator('#instrumentDialog')).not.toBeVisible();
  await page.waitForTimeout(1100);
  await expect(page.locator('#instrumentStage')).toBeEmpty();
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toHaveCount(0);
});

test('Pulse keeps provider fallback disabled when the same-origin snapshot is unavailable', async ({ page }) => {
  const fixtures = await installPulseFixtures(page, { snapshotStatus:503 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });

  await expect(page.locator('.instrument-error')).toContainText('Earthquake snapshot unavailable', { timeout:10000 });
  await expect(page.locator('.instrument-status')).toContainText('ERROR');
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.providerAttempts()).toBe(0);
});

test('Pulse detaches dense event DOM and coalesces rapid timeline scrubbing per animation frame', async ({ page }) => {
  await installPulseFixtures(page, { count:2400 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  const lab = page.locator('.pulse-observation-lab[data-state="ready"]');
  await expect(lab).toBeVisible({ timeout:15000 });
  await expect(lab).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('.pulse-density-cell')).not.toHaveCount(0);
  await expect(page.locator('.pulse-events .pulse-event')).toHaveCount(0);

  const denseStats = await page.evaluate(() => window.GeoPulseRound5Stats);
  expect(denseStats.eventNodeCount).toBe(2400);
  expect(denseStats.detachedEventCount).toBe(2400);

  await page.locator('[data-pulse-representation="events"]').click();
  await expect(lab).toHaveAttribute('data-representation', 'events');
  await expect(page.locator('.pulse-events .pulse-event')).toHaveCount(2400);
  await page.locator('[data-pulse-representation="density"]').click();
  await expect(page.locator('.pulse-events .pulse-event')).toHaveCount(0);

  await page.evaluate(() => {
    const timeline = document.querySelector('#pulseTimeline');
    for (let index = 0; index < 80; index += 1) {
      timeline.value = String((index * 30) % 1440);
      timeline.dispatchEvent(new Event('input', { bubbles:true }));
    }
  });

  await expect.poll(async () => Number(await page.locator('#pulseTimeline').inputValue())).toBe(930);
  const scrubStats = await page.evaluate(() => window.GeoPulseRound5Stats);
  expect(scrubStats.inputEvents).toBeGreaterThanOrEqual(80);
  expect(scrubStats.forwardedTimelineFrames).toBeLessThanOrEqual(3);
});

test('Pulse reduced-motion mode converts continuous playback into explicit one-hour steps', async ({ page }) => {
  await page.emulateMedia({ reducedMotion:'reduce' });
  await installPulseFixtures(page, { count:180 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  const lab = page.locator('.pulse-observation-lab[data-state="ready"]');
  await expect(lab).toBeVisible({ timeout:10000 });
  await expect(lab).toHaveAttribute('data-motion', 'reduced');

  const play = page.locator('#pulsePlay');
  await expect(play).toContainText('STEP FROM START');
  await play.click();
  await expect(page.locator('#pulseTimeline')).toHaveValue('0');
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  await page.waitForTimeout(500);
  await expect(page.locator('#pulseTimeline')).toHaveValue('0');

  await play.click();
  await expect(page.locator('#pulseTimeline')).toHaveValue('60');
  await page.waitForTimeout(500);
  await expect(page.locator('#pulseTimeline')).toHaveValue('60');
  await expectNoSeriousAxeViolations(page);
});

test('Pulse mobile controls stay touch-sized and avoid horizontal overflow', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await installPulseFixtures(page, { count:180 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });

  const sizes = await page.evaluate(() => {
    const button = document.querySelector('#pulsePlay').getBoundingClientRect();
    const select = document.querySelector('#pulseMagnitudeFilter').getBoundingClientRect();
    const timeline = document.querySelector('#pulseTimeline').getBoundingClientRect();
    return {
      button:button.height,
      select:select.height,
      timeline:timeline.height,
      overflow:document.documentElement.scrollWidth - document.documentElement.clientWidth
    };
  });
  expect(sizes.button).toBeGreaterThanOrEqual(44);
  expect(sizes.select).toBeGreaterThanOrEqual(44);
  expect(sizes.timeline).toBeGreaterThanOrEqual(44);
  expect(sizes.overflow).toBeLessThanOrEqual(1);

  await page.locator('[data-pulse-representation="density"]').tap();
  await expect(page.locator('.pulse-observation-lab')).toHaveAttribute('data-representation', 'density');
  await page.locator('#pulseMagnitudeFilter').selectOption('4');
  await expectNoSeriousAxeViolations(page);
});
