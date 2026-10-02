import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';

const require = createRequire(import.meta.url);
const axePath = require.resolve('axe-core/axe.min.js');

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

async function installPulseSupplyFixtures(page, { count = 205, stale = false } = {}) {
  const now = Date.now();
  const generated = now - 5 * 60 * 1000;
  const fetchedAt = new Date(now - (stale ? 4 * 60 * 60 * 1000 : 2 * 60 * 1000)).toISOString();
  const usgsSource = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  const landSource = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';
  const landVersion = 'Data current 2024-01-24 · pinned GeoJSON revision 0b9a6ceb0a70';

  const features = Array.from({ length:count }, (_, index) => ({
    type:'Feature',
    id:`fixture-${index}`,
    properties:{
      mag:index === 7 ? null : 1.3 + (index % 9) * .55,
      place:`Fixture seismic event ${index + 1}`,
      time:generated - (index + 1) * 6 * 60 * 1000,
      updated:generated - index * 4 * 60 * 1000,
      status:index % 4 ? 'reviewed' : 'automatic',
      magType:index % 2 ? 'ml' : 'mww',
      sig:40 + index,
      felt:index % 10 === 0 ? 20 + index : null,
      cdi:index % 10 === 0 ? 3.2 : null,
      mmi:index % 12 === 0 ? 3.8 : null,
      url:`https://earthquake.usgs.gov/earthquakes/eventpage/fixture-${index}`
    },
    geometry:{
      type:'Point',
      coordinates:[-175 + (index * 37) % 350, -68 + (index * 19) % 136, index % 3 === 0 ? 18 : index % 3 === 1 ? 140 : 420]
    }
  }));

  const quakes = {
    type:'FeatureCollection',
    metadata:{ generated, count:features.length, api:'browser-fixture' },
    features
  };
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
    providerApiVersion:'browser-fixture',
    sha256:'browser-fixture-sha'
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
    version:landVersion,
    recordCount:land.features.length,
    sha256:'browser-reference-sha'
  };

  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(quakeMeta)
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => route.fulfill({
    status:200, contentType:'application/geo+json', body:JSON.stringify(quakes)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(landMeta)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => route.fulfill({
    status:200, contentType:'application/geo+json', body:JSON.stringify(land)
  }));

  let providerHits = 0;
  await page.route('https://earthquake.usgs.gov/**', route => { providerHits += 1; return route.abort(); });
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => { providerHits += 1; return route.abort(); });
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@**', route => { providerHits += 1; return route.abort(); });
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@**', route => { providerHits += 1; return route.abort(); });

  return { providerHits:() => providerHits, generated, features };
}

test('Pulse consumes unified snapshot/reference supply and preserves seismic field semantics', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:205 });

  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });

  const lab = page.locator('.pulse-observation-lab[data-state="ready"]');
  await expect(lab).toBeVisible({ timeout:10000 });
  await expect(page.locator('#instrumentTitle')).toHaveText('Earth Pulse');
  await expect(page.locator('.instrument-status')).toContainText('SNAPSHOT');
  await expect(page.locator('.instrument-status')).not.toContainText('LIVE');
  await expect(page.locator('#pulseFieldTitle')).toHaveText('205 EVENTS · ROLLING 24 H');
  await expect(page.locator('.pulse-event')).toHaveCount(205);
  await expect(page.locator('.pulse-land path')).toHaveCount(5);
  await expect(page.locator('#pulseReferenceBadge')).toContainText('VERSION-PINNED');
  await expect(page.locator('.pulse-provenance')).toContainText('USGS Earthquake Hazards Program');
  await expect(page.locator('.pulse-provenance')).toContainText('GEOGEEK SNAPSHOT · SAME-ORIGIN');
  await expect(page.locator('.pulse-provenance')).toContainText('Global rolling past-24-hour');

  const contract = await page.evaluate(() => ({
    mounted:window.GeoGeekInstrumentMounts?.pulse === window.GeoPulseObservationLab?.mount,
    quakeTransport:window.GeoDataSupply.describe('usgs-earthquakes-day')?.transport,
    referenceTransport:window.GeoDataSupply.describe('natural-earth-land-110m')?.transport,
    referenceFreshness:window.GeoDataSupply.describe('natural-earth-land-110m')?.freshnessLabel,
    projection:window.GeoPulseObservationLab?.projection
  }));
  expect(contract.mounted).toBe(true);
  expect(contract.quakeTransport).toBe('same-origin-snapshot');
  expect(contract.referenceTransport).toBe('same-origin-reference');
  expect(contract.referenceFreshness).toBe('VERSION-PINNED');
  expect(contract.projection).toBe('equirectangular-2:1');
  expect(fixtures.providerHits()).toBe(0);

  await expect.poll(async () => {
    const box = await page.locator('.pulse-map-frame').boundingBox();
    return box ? box.width / box.height : 0;
  }, { timeout:5000 }).toBeGreaterThan(1.98);
  const mapBox = await page.locator('.pulse-map-frame').boundingBox();
  expect(mapBox.width / mapBox.height).toBeLessThan(2.02);
  await expect(page.locator('.pulse-map')).toHaveAttribute('viewBox', '0 0 1000 500');

  const fieldTitle = await page.locator('#pulseFieldTitle').textContent();
  const firstEvent = page.locator('.pulse-event').first();
  await firstEvent.focus();
  await expect(page.locator('#pulseInspectPlace')).toHaveText('Fixture seismic event 1');
  await expect(page.locator('#pulseEventStatus')).toHaveText('AUTOMATIC');
  await expect(page.locator('#pulseEventDepth')).toContainText('SHALLOW');
  await expect(page.locator('#pulseEventRecency')).toContainText('before feed generation');
  await expect(page.locator('#pulseFieldTitle')).toHaveText(fieldTitle);

  await firstEvent.press('Enter');
  await expect(firstEvent).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#pulseEventLink')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(firstEvent).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#pulseInspectTitle')).toHaveText('FOCUS OR SELECT AN EVENT');

  expect(await page.locator('.pulse-depth-shallow').count()).toBeGreaterThan(0);
  expect(await page.locator('.pulse-depth-intermediate').count()).toBeGreaterThan(0);
  expect(await page.locator('.pulse-depth-deep').count()).toBeGreaterThan(0);
  await expect(page.locator('.pulse-encoding')).toContainText('not an energy-proportional symbol');
  await expect(page.locator('.pulse-encoding')).toContainText('false southward stem');

  await expectNoSeriousAxeViolations(page);
  expect(fixtures.providerHits()).toBe(0);
});

test('Pulse keeps stale last-known-good visible and labels it stale without provider fallback', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:32, stale:true });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });
  await expect(page.locator('.instrument-status')).toContainText('STALE SNAPSHOT');
  await expect(page.locator('.pulse-provenance')).toContainText('STALE SNAPSHOT');
  await expect(page.locator('.pulse-event')).toHaveCount(32);
  expect(fixtures.providerHits()).toBe(0);
});
