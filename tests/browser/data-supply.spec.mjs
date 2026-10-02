import { test, expect } from '@playwright/test';

const isoDay = date => date.toISOString().slice(0, 10);
const NATURAL_EARTH_SOURCE = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';
const NATURAL_EARTH_VERSION = 'Data current 2024-01-24 · pinned GeoJSON revision 0b9a6ceb0a70';

function snapshotMeta({ id, fetchedAt, count = 1, window = null }) {
  return {
    schemaVersion: 2,
    supplyId: id,
    dataset: id,
    provider: 'TEST',
    format: 'JSON',
    source: 'https://example.invalid/',
    delivery: 'GeoGeek same-origin snapshot',
    fetchedAt,
    recordCount: count,
    sha256: 'fixture',
    ...(window ? { window } : {}),
  };
}

function referenceMeta() {
  return {
    schemaVersion:2,
    supplyId:'natural-earth-land-110m',
    dataset:'natural-earth-land-110m',
    provider:'Natural Earth',
    format:'GeoJSON',
    source:NATURAL_EARTH_SOURCE,
    delivery:'GeoGeek same-origin reference',
    version:NATURAL_EARTH_VERSION,
    recordCount:1,
    sha256:'fixture-reference',
    freshness:'version-pinned',
  };
}

test('unified supply routes snapshots, hybrid dates, queries, tiles and references by policy', async ({ page }) => {
  const now = new Date();
  const today = isoDay(now);
  const tomorrow = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)));
  const yesterday = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
  let noaaUpstream = 0;
  let emscUpstream = 0;
  let pulseSnapshotHits = 0;
  let referenceSnapshotHits = 0;

  await page.route('**/data/snapshots/noaa-aurora.meta.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(snapshotMeta({ id:'noaa-aurora', fetchedAt:now.toISOString(), count:1 }))
  }));
  await page.route('**/data/snapshots/noaa-aurora.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ source:'snapshot', coordinates:[[0,60,42]] })
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(snapshotMeta({ id:'usgs-earthquakes-day', fetchedAt:now.toISOString(), count:1 }))
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => {
    pulseSnapshotHits += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ type:'FeatureCollection', source:'pulse-snapshot', features:[] }) });
  });
  await page.route('**/data/reference/natural-earth-land-110m.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(referenceMeta())
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson', route => {
    referenceSnapshotHits += 1;
    return route.fulfill({
      status:200, contentType:'application/geo+json', body:JSON.stringify({
        type:'FeatureCollection', source:'reference', features:[{ type:'Feature', properties:{}, geometry:{ type:'Polygon', coordinates:[[[0,0],[1,0],[1,1],[0,0]]] } }]
      })
    });
  });
  await page.route('**/data/snapshots/emsc-current-day.meta.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(snapshotMeta({
      id:'emsc-events', fetchedAt:now.toISOString(), count:1,
      window:{ start:`${today}T00:00:00`, end:`${tomorrow}T00:00:00` }
    }))
  }));
  await page.route('**/data/snapshots/emsc-current-day.geojson', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ type:'FeatureCollection', source:'snapshot', features:[] })
  }));
  await page.route('https://services.swpc.noaa.gov/**', route => {
    noaaUpstream += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ source:'upstream', coordinates:[] }) });
  });
  // These providers are intentionally unreachable in this browser test. A
  // successful Pulse/reference read therefore proves same-origin delivery,
  // while the runtime transport state verifies which contract path was used.
  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.route(NATURAL_EARTH_SOURCE, route => route.abort());
  await page.route('https://www.seismicportal.eu/**', route => {
    emscUpstream += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ type:'FeatureCollection', source:'upstream', features:[] }) });
  });

  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const result = await page.evaluate(async ({ today, tomorrow, yesterday }) => {
    await import('/core/data-supply.js?v=browser-test');
    const aurora = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json').then(r => r.json());
    const pulseDataset = window.GeoDataSupply.get('usgs-earthquakes-day');
    const referenceDataset = window.GeoDataSupply.get('natural-earth-land-110m');
    const pulse = await fetch(pulseDataset.upstream).then(r => r.json());
    const reference = await fetch(referenceDataset.upstream).then(r => r.json());
    const current = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${today}T00:00:00&endtime=${tomorrow}T00:00:00&orderby=time-desc`).then(r => r.json());
    const past = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${yesterday}T00:00:00&endtime=${today}T00:00:00&orderby=time-desc`).then(r => r.json());
    const referenceInfo = window.GeoDataSupply.describe('natural-earth-land-110m');
    return {
      aurora:aurora.source,
      pulse:pulse.source,
      reference:reference.source,
      current:current.source,
      past:past.source,
      modes:Object.fromEntries(window.GeoDataSupply.datasets.map(dataset => [dataset.id, dataset.mode])),
      auroraTransport:window.GeoDataSupply.describe('noaa-aurora').transport,
      pulseTransport:window.GeoDataSupply.describe('usgs-earthquakes-day').transport,
      emscTransport:window.GeoDataSupply.describe('emsc-events').transport,
      referenceTransport:referenceInfo.transport,
      referenceStale:referenceInfo.stale,
      referenceFreshness:referenceInfo.freshnessLabel,
    };
  }, { today, tomorrow, yesterday });

  expect(result.aurora).toBe('snapshot');
  expect(result.pulse).toBe('pulse-snapshot');
  expect(result.reference).toBe('reference');
  expect(result.current).toBe('snapshot');
  expect(result.past).toBe('upstream');
  expect(noaaUpstream).toBe(0);
  expect(pulseSnapshotHits).toBeGreaterThan(0);
  expect(referenceSnapshotHits).toBeGreaterThan(0);
  expect(emscUpstream).toBe(1);
  expect(result.modes['orbit-active']).toBe('snapshot');
  expect(result.modes['usgs-earthquakes-day']).toBe('snapshot');
  expect(result.modes['natural-earth-land-110m']).toBe('reference');
  expect(result.modes['emsc-events']).toBe('hybrid');
  expect(result.modes['nasa-gibs']).toBe('tile');
  expect(result.modes['inaturalist']).toBe('query');
  expect(result.auroraTransport).toBe('same-origin-snapshot');
  expect(result.pulseTransport).toBe('same-origin-snapshot');
  expect(result.emscTransport).toBe('provider-fallback');
  expect(result.referenceTransport).toBe('same-origin-reference');
  expect(result.referenceStale).toBe(false);
  expect(result.referenceFreshness).toBe('VERSION-PINNED');
});

test('stale provider-fallback and last-known-good snapshots keep distinct transport semantics', async ({ page }) => {
  const stale = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  let noaaUpstream = 0;
  let pulseSnapshotHits = 0;
  await page.route('**/data/snapshots/noaa-aurora.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(snapshotMeta({ id:'noaa-aurora', fetchedAt:stale }))
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(snapshotMeta({ id:'usgs-earthquakes-day', fetchedAt:stale }))
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson', route => {
    pulseSnapshotHits += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ type:'FeatureCollection', source:'last-known-good', features:[] }) });
  });
  await page.route('https://services.swpc.noaa.gov/**', route => {
    noaaUpstream += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ source:'upstream', coordinates:[] }) });
  });
  await page.route('https://earthquake.usgs.gov/**', route => route.abort());
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const result = await page.evaluate(async () => {
    await import('/core/data-supply.js?v=stale-test');
    const aurora = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json').then(r => r.json());
    const pulseDataset = window.GeoDataSupply.get('usgs-earthquakes-day');
    const pulse = await fetch(pulseDataset.upstream).then(r => r.json());
    const auroraInfo = window.GeoDataSupply.describe('noaa-aurora');
    const pulseInfo = window.GeoDataSupply.describe('usgs-earthquakes-day');
    return {
      auroraSource:aurora.source,
      auroraStale:auroraInfo.stale,
      auroraTransport:auroraInfo.transport,
      pulseSource:pulse.source,
      pulseStale:pulseInfo.stale,
      pulseTransport:pulseInfo.transport,
    };
  });
  expect(result.auroraSource).toBe('upstream');
  expect(result.auroraStale).toBe(true);
  expect(result.auroraTransport).toBe('provider-fallback');
  expect(noaaUpstream).toBe(1);
  expect(result.pulseSource).toBe('last-known-good');
  expect(result.pulseStale).toBe(true);
  expect(result.pulseTransport).toBe('same-origin-snapshot');
  expect(pulseSnapshotHits).toBeGreaterThan(0);
});

test('explicit raster lifecycle is latest-request-wins and preserves date-scoped provenance', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const result = await page.evaluate(async () => {
    await import('/core/data-supply.js?v=raster-lifecycle-test');
    const supply = window.GeoDataSupply;
    const first = supply.beginRequest('nasa-gibs', {
      productId:'terra-true',
      transport:'provider-raster',
      observationTime:'2026-09-28T00:00:00Z',
      scope:'GLOBAL · EPSG:4326 · 2026-09-28 · SINGLE VIEW',
      requestUrl:'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?time=2026-09-28'
    });
    const requesting = supply.describe('nasa-gibs');
    const second = supply.beginRequest('nasa-gibs', {
      productId:'surface-temp',
      transport:'provider-raster',
      observationTime:'2026-09-29T00:00:00Z',
      scope:'GLOBAL · EPSG:4326 · 2026-09-29 · SINGLE VIEW'
    });
    const staleAccepted = first.succeed({ imageCount:1 });
    const latestAccepted = second.succeed({ imageCount:2 });
    const final = supply.describe('nasa-gibs');
    return {
      schemaVersion:supply.schemaVersion,
      productCount:supply.products('nasa-gibs').length,
      requestingStatus:requesting.request.status,
      requestingProduct:requesting.product?.id,
      staleAccepted,
      latestAccepted,
      finalStatus:final.request.status,
      finalTransport:final.transport,
      finalProduct:final.product?.id,
      finalObservationTime:final.request.observationTime,
      finalScope:final.request.scope
    };
  });

  expect(result.schemaVersion).toBe(2);
  expect(result.productCount).toBe(8);
  expect(result.requestingStatus).toBe('requesting');
  expect(result.requestingProduct).toBe('terra-true');
  expect(result.staleAccepted).toBe(false);
  expect(result.latestAccepted).toBe(true);
  expect(result.finalStatus).toBe('available');
  expect(result.finalTransport).toBe('provider-raster');
  expect(result.finalProduct).toBe('surface-temp');
  expect(result.finalObservationTime).toBe('2026-09-29T00:00:00Z');
  expect(result.finalScope).toContain('2026-09-29');
});
