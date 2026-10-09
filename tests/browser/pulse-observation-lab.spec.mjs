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

async function installPulseSupplyFixtures(page, { count = 205, stale = false, spacingMinutes = 6 } = {}) {
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
      time:generated - (index + 1) * spacingMinutes * 60 * 1000,
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

  let snapshotHits = 0;
  let referenceHits = 0;
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(quakeMeta)
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => {
    snapshotHits += 1;
    return route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(quakes) });
  });
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(landMeta)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => {
    referenceHits += 1;
    return route.fulfill({ status:200, contentType:'application/geo+json', body:JSON.stringify(land) });
  });

  // Provider URLs are logical dataset request identifiers. Keep every external
  // transport hard-aborted; successful rendering must therefore come from the
  // explicit same-origin snapshot/reference routes above.
  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/topojson-client@**', route => route.abort());
  await page.route('https://cdn.jsdelivr.net/npm/world-atlas@**', route => route.abort());

  return {
    snapshotHits:() => snapshotHits,
    referenceHits:() => referenceHits,
    generated,
    features
  };
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
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);

  // The viewport frame is intentionally responsive. Verify the geographic
  // projection itself is still exactly 2:1 and wholly within the stage.
  const world = await page.locator('.pulse-map').evaluate(svg => {
    const matrix=svg.getScreenCTM();
    const a=new DOMPoint(0,0).matrixTransform(matrix);
    const b=new DOMPoint(1000,500).matrixTransform(matrix);
    const frame=document.querySelector('#instrumentStage').getBoundingClientRect();
    return {ratio:(b.x-a.x)/(b.y-a.y),
      inside:a.x>=frame.left-2&&a.y>=frame.top-2&&
        b.x<=frame.right+2&&b.y<=frame.bottom+2};
  });
  expect(world.ratio).toBeCloseTo(2,1);
  expect(world.inside).toBe(true);
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
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);
});

test('Pulse keeps stale last-known-good visible and labels it stale without provider fallback', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:32, stale:true });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });
  await expect(page.locator('.pulse-observation-lab[data-state="ready"]')).toBeVisible({ timeout:10000 });
  await expect(page.locator('.instrument-status')).toContainText('STALE SNAPSHOT');
  await expect(page.locator('.pulse-provenance')).toContainText('STALE SNAPSHOT');
  await expect(page.locator('.pulse-event')).toHaveCount(32);
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);
});

test('Pulse Round 4 scrubs snapshot time, filters events, plays forward, and aggregates dense views without changing supply semantics', async ({ page }) => {
  const fixtures = await installPulseSupplyFixtures(page, { count:420, spacingMinutes:3 });
  await page.goto('/lab.html?instrument=pulse#l10', { waitUntil:'domcontentloaded' });

  const lab = page.locator('.pulse-observation-lab[data-state="ready"]');
  await expect(lab).toBeVisible({ timeout:10000 });
  await expect(page.locator('.pulse-temporal-controls')).toBeVisible();
  await expect(page.locator('.pulse-filter-controls')).toBeVisible();
  await expect(page.locator('#pulseTimeline')).toHaveValue('1440');
  await expect(page.locator('#pulseTimelineState')).toHaveText('FULL SNAPSHOT');
  await expect(page.locator('#pulseFieldTitle')).toHaveText('420 EVENTS · ROLLING 24 H');
  await expect(page.locator('#pulseVisibleCount')).toHaveText('420 VISIBLE');

  await expect(lab).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('#pulseRepresentationState')).toHaveText('AUTO → COUNT GRID');
  expect(await page.locator('.pulse-density-cell').count()).toBeGreaterThan(0);
  await expect(page.locator('.pulse-filter-controls')).toContainText('not equal-area');
  await expect(page.locator('.pulse-filter-controls')).toContainText('not a hazard');
  await expect(page.locator('#pulseTimelineHelp')).toContainText('never requests historical data');

  await page.getByRole('button', { name:'EVENTS', exact:true }).click();
  await expect(lab).toHaveAttribute('data-representation', 'events');

  await page.locator('#pulseMagnitudeFilter').selectOption('4');
  await page.locator('#pulseDepthFilter').selectOption('deep');
  await page.locator('#pulseStatusFilter').selectOption('reviewed');

  const fullExpected = fixtures.features.filter(feature => {
    const mag = feature.properties.mag;
    const depth = feature.geometry.coordinates[2];
    const status = feature.properties.status;
    const time = feature.properties.time;
    return Number.isFinite(mag) && mag >= 4 && depth >= 300 && status === 'reviewed' &&
      time >= fixtures.generated - 24 * 60 * 60 * 1000 && time <= fixtures.generated;
  }).length;
  await expect(page.locator('#pulseVisibleCount')).toHaveText(`${fullExpected} VISIBLE`);
  await expect(page.locator('.pulse-event[data-visible="true"]')).toHaveCount(fullExpected);
  await expect(page.locator('#pulseFieldTitle')).toHaveText('420 EVENTS · ROLLING 24 H');

  await page.locator('#pulseTimeline').evaluate(input => {
    input.value = '720';
    input.dispatchEvent(new Event('input', { bubbles:true }));
  });
  const cutoff = fixtures.generated - 12 * 60 * 60 * 1000;
  const halfExpected = fixtures.features.filter(feature => {
    const mag = feature.properties.mag;
    const depth = feature.geometry.coordinates[2];
    const status = feature.properties.status;
    const time = feature.properties.time;
    return Number.isFinite(mag) && mag >= 4 && depth >= 300 && status === 'reviewed' &&
      time >= fixtures.generated - 24 * 60 * 60 * 1000 && time <= cutoff;
  }).length;
  await expect(page.locator('#pulseVisibleCount')).toHaveText(`${halfExpected} VISIBLE`);
  await expect(page.locator('#pulseTimelineState')).toHaveText('12 H FROM WINDOW START');

  await page.locator('#pulseMagnitudeFilter').selectOption('all');
  await page.locator('#pulseDepthFilter').selectOption('all');
  await page.locator('#pulseStatusFilter').selectOption('all');
  await page.locator('#pulseTimeline').evaluate(input => {
    input.value = '0';
    input.dispatchEvent(new Event('input', { bubbles:true }));
  });
  await page.locator('#pulsePlay').click();
  await expect(page.locator('#pulsePlay')).toHaveAttribute('aria-pressed', 'true');
  await expect.poll(async () => Number(await page.locator('#pulseTimeline').inputValue()), { timeout:3000 }).toBeGreaterThan(0);
  await page.locator('#pulsePlay').click();
  await expect(page.locator('#pulsePlay')).toHaveAttribute('aria-pressed', 'false');

  await page.locator('#pulseFull').click();
  await page.getByRole('button', { name:'AUTO', exact:true }).click();
  await expect(lab).toHaveAttribute('data-representation', 'density');
  await expect(page.locator('#pulseVisibleCount')).toHaveText('420 VISIBLE');

  const contract = await page.evaluate(() => ({
    timeline:window.GeoPulseObservationLab?.timeline,
    density:window.GeoPulseObservationLab?.density,
    quakeTransport:window.GeoDataSupply.describe('usgs-earthquakes-day')?.transport,
    referenceTransport:window.GeoDataSupply.describe('natural-earth-land-110m')?.transport
  }));
  expect(contract.timeline).toBe('snapshot-internal-origin-cutoff');
  expect(contract.density).toBe('12x10-degree-count-grid');
  expect(contract.quakeTransport).toBe('same-origin-snapshot');
  expect(contract.referenceTransport).toBe('same-origin-reference');

  await expectNoSeriousAxeViolations(page);
  expect(fixtures.snapshotHits()).toBeGreaterThan(0);
  expect(fixtures.referenceHits()).toBeGreaterThan(0);
});