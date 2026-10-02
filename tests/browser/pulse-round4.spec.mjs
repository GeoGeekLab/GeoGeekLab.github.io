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

async function installPulseSupplyFixtures(page, { count = 360 } = {}) {
  const now = Date.now();
  const generated = now - 5 * 60 * 1000;
  const fetchedAt = new Date(now - 2 * 60 * 1000).toISOString();
  const usgsSource = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  const landSource = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';

  const features = Array.from({ length:count }, (_, index) => ({
    type:'Feature',
    id:`round4-${index}`,
    properties:{
      mag:index === 11 ? null : 1.2 + (index % 10) * .65,
      place:`Round 4 event ${index + 1}`,
      time:generated - (index + 1) * 4 * 60 * 1000,
      updated:generated - index * 3 * 60 * 1000,
      status:index % 3 ? 'reviewed' : 'automatic',
      magType:index % 2 ? 'ml' : 'mww',
      sig:50 + index,
      felt:index % 12 === 0 ? 10 + index : null,
      cdi:index % 12 === 0 ? 3.4 : null,
      mmi:index % 15 === 0 ? 4.1 : null,
      url:`https://earthquake.usgs.gov/earthquakes/eventpage/round4-${index}`
    },
    geometry:{
      type:'Point',
      coordinates:[-176 + (index * 31) % 352, -70 + (index * 17) % 140, index % 3 === 0 ? 20 : index % 3 === 1 ? 150 : 430]
    }
  }));

  const quakes = { type:'FeatureCollection', metadata:{ generated, count:features.length, api:'round4-fixture' }, features };
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
    fetchedAt,
    recordCount:features.length,
    providerCount:features.length,
    providerGeneratedAt:new Date(generated).toISOString(),
    providerApiVersion:'round4-fixture',
    sha256:'round4-fixture-sha'
  };
  const land = {
    type:'FeatureCollection',
    features:[
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-168,12],[-130,12],[-105,35],[-115,70],[-160,70],[-168,12]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-82,10],[-34,10],[-38,-55],[-74,-52],[-82,10]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[-10,36],[45,36],[52,-35],[5,-35],[-10,36]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[25,35],[170,35],[150,75],[40,70],[25,35]]] } },
      { type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[110,-10],[155,-10],[153,-45],[112,-45],[110,-10]]] } }
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
    sha256:'round4-reference-sha'
  };

  let snapshotHits = 0;
  let referenceHits = 0;
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(quakeMeta) }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => {
    snapshotHits += 1;
    return route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(quakes) });
  });
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify(landMeta) }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => {
    referenceHits += 1;
    return route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(land) });
  });

  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@**', route => route.abort());

  return { generated, snapshotHits:() => snapshotHits, referenceHits:() => referenceHits };
}

test('Pulse Round 4 restores deep-linked temporal filters and count-grid representation', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:360 });
  await page.goto('/lab.html?instrument=pulse&pulseCutoff=720&pulseMag=4&pulseDepth=deep&pulseStatus=reviewed&pulseView=density#l10', { waitUntil:'domcontentloaded' });

  const lab = page.locator('.pulse-observation-lab[data-state="ready"]');
  await expect(lab).toBeVisible({ timeout:10000 });
  await expect(page.locator('#pulseFieldTitle')).toHaveText('360 EVENTS · ROLLING 24 H');
  await expect(page.locator('#pulseTimeline')).toHaveValue('720');
  await expect(page.locator('#pulseMagnitudeFilter')).toHaveValue('4');
  await expect(page.locator('#pulseDepthFilter')).toHaveValue('deep');
  await expect(page.locator('#pulseStatusFilter')).toHaveValue('reviewed');
  await expect(page.locator('[data-pulse-representation="density"]')).toHaveAttribute('aria-pressed', 'true');
  await expect(lab).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('.pulse-density-cell')).not.toHaveCount(0);
  await expect(page.locator('#pulseRepresentationState')).toContainText('DENSITY → COUNT GRID');
  await expect(page.locator('.pulse-filter-controls')).toContainText('not equal-area');
  await expect(page.locator('.pulse-filter-controls')).toContainText('not a hazard');

  const visibleText = await page.locator('#pulseVisibleCount').textContent();
  expect(Number.parseInt(visibleText, 10)).toBeGreaterThan(0);
  expect(Number.parseInt(visibleText, 10)).toBeLessThan(360);

  const contract = await page.evaluate(() => ({
    version:window.GeoPulseObservationLab?.version,
    deepLink:window.GeoPulseObservationLab?.deepLink,
    quakeTransport:window.GeoDataSupply.describe('usgs-earthquakes-day')?.transport,
    referenceTransport:window.GeoDataSupply.describe('natural-earth-land-110m')?.transport
  }));
  expect(contract.version).toBe('20261002c');
  expect(contract.deepLink).toEqual(['pulseCutoff','pulseMag','pulseDepth','pulseStatus','pulseView']);
  expect(contract.quakeTransport).toBe('same-origin-snapshot');
  expect(contract.referenceTransport).toBe('same-origin-reference');
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);

  await expectNoSeriousAxeViolations(page);
});

test('Pulse Round 4 synchronizes timeline, filters and representation into the URL without new provider requests', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:360 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });

  // AUTO crosses the declared threshold and therefore uses the count grid.
  await expect(page.locator('.pulse-observation-lab')).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('#pulseRepresentationState')).toContainText('AUTO → COUNT GRID');

  await page.locator('[data-pulse-representation="events"]').click();
  await expect(page.locator('.pulse-observation-lab')).toHaveAttribute('data-representation', 'events');
  await page.locator('#pulseMagnitudeFilter').selectOption('4');
  await page.locator('#pulseDepthFilter').selectOption('shallow');
  await page.locator('#pulseStatusFilter').selectOption('automatic');
  await page.locator('#pulseTimeline').evaluate(element => {
    element.value = '360';
    element.dispatchEvent(new Event('input', { bubbles:true }));
  });

  await expect.poll(() => page.url()).toContain('pulseCutoff=360');
  const url = new URL(page.url());
  expect(url.searchParams.get('pulseMag')).toBe('4');
  expect(url.searchParams.get('pulseDepth')).toBe('shallow');
  expect(url.searchParams.get('pulseStatus')).toBe('automatic');
  expect(url.searchParams.get('pulseView')).toBe('events');
  await expect(page.locator('#pulseTimelineState')).toContainText('6 H FROM WINDOW START');
  expect(Number.parseInt(await page.locator('#pulseVisibleCount').textContent(), 10)).toBeLessThan(360);

  const beforeHits = fixtures.snapshotHits();
  await page.locator('#pulseFull').click();
  await expect(page.locator('#pulseTimeline')).toHaveValue('1440');
  await expect.poll(() => new URL(page.url()).searchParams.has('pulseCutoff')).toBe(false);
  expect(fixtures.snapshotHits()).toBe(beforeHits);

  await page.locator('#pulseMagnitudeFilter').selectOption('all');
  await page.locator('#pulseDepthFilter').selectOption('all');
  await page.locator('#pulseStatusFilter').selectOption('all');
  await page.locator('[data-pulse-representation="auto"]').click();
  await expect.poll(() => {
    const current = new URL(page.url());
    return ['pulseMag','pulseDepth','pulseStatus','pulseView'].every(key => !current.searchParams.has(key));
  }).toBe(true);

  expect(fixtures.snapshotHits()).toBe(beforeHits);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);
});

test('Pulse Round 4 playback advances snapshot-internal cutoff and pauses cleanly', async ({ page }) => {
  await installPulseSupplyFixtures(page, { count:180 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });

  const play = page.locator('#pulsePlay');
  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'true');
  await expect(play).toHaveText('PAUSE');
  await expect.poll(async () => Number(await page.locator('#pulseTimeline').inputValue()), { timeout:2500 }).toBeGreaterThan(0);
  await expect.poll(() => new URL(page.url()).searchParams.has('pulseCutoff')).toBe(true);

  await play.click();
  await expect(play).toHaveAttribute('aria-pressed', 'false');
  const paused = Number(await page.locator('#pulseTimeline').inputValue());
  await page.waitForTimeout(500);
  expect(Number(await page.locator('#pulseTimeline').inputValue())).toBe(paused);

  await expectNoSeriousAxeViolations(page);
});