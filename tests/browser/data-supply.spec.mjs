import { test, expect } from '@playwright/test';

const isoDay = date => date.toISOString().slice(0, 10);

function snapshotMeta({ id, fetchedAt, count = 1, window = null }) {
  return {
    schemaVersion: 1,
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

test('unified supply routes snapshots, hybrid dates, queries and tiles by policy', async ({ page }) => {
  const now = new Date();
  const today = isoDay(now);
  const tomorrow = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1)));
  const yesterday = isoDay(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1)));
  let noaaUpstream = 0;
  let emscUpstream = 0;

  await page.route('**/data/snapshots/noaa-aurora.meta.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify(snapshotMeta({ id:'noaa-aurora', fetchedAt:now.toISOString(), count:1 }))
  }));
  await page.route('**/data/snapshots/noaa-aurora.json', route => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ source:'snapshot', coordinates:[[0,60,42]] })
  }));
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
  await page.route('https://www.seismicportal.eu/**', route => {
    emscUpstream += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ type:'FeatureCollection', source:'upstream', features:[] }) });
  });

  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const result = await page.evaluate(async ({ today, tomorrow, yesterday }) => {
    await import('/core/data-supply.js?v=browser-test');
    const aurora = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json').then(r => r.json());
    const current = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${today}T00:00:00&endtime=${tomorrow}T00:00:00&orderby=time-desc`).then(r => r.json());
    const past = await fetch(`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${yesterday}T00:00:00&endtime=${today}T00:00:00&orderby=time-desc`).then(r => r.json());
    return {
      aurora:aurora.source,
      current:current.source,
      past:past.source,
      modes:Object.fromEntries(window.GeoDataSupply.datasets.map(dataset => [dataset.id, dataset.mode])),
      auroraTransport:window.GeoDataSupply.describe('noaa-aurora').transport,
      emscTransport:window.GeoDataSupply.describe('emsc-events').transport,
    };
  }, { today, tomorrow, yesterday });

  expect(result.aurora).toBe('snapshot');
  expect(result.current).toBe('snapshot');
  expect(result.past).toBe('upstream');
  expect(noaaUpstream).toBe(0);
  expect(emscUpstream).toBe(1);
  expect(result.modes['orbit-active']).toBe('snapshot');
  expect(result.modes['emsc-events']).toBe('hybrid');
  expect(result.modes['nasa-gibs']).toBe('tile');
  expect(result.modes['inaturalist']).toBe('query');
  expect(result.auroraTransport).toBe('same-origin-snapshot');
  expect(result.emscTransport).toBe('provider-fallback');
});

test('stale Earth snapshot falls back to provider while Orbit remains last-known-good', async ({ page }) => {
  const stale = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString();
  let noaaUpstream = 0;
  await page.route('**/data/snapshots/noaa-aurora.meta.json', route => route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(snapshotMeta({ id:'noaa-aurora', fetchedAt:stale }))
  }));
  await page.route('https://services.swpc.noaa.gov/**', route => {
    noaaUpstream += 1;
    return route.fulfill({ status:200, contentType:'application/json', body:JSON.stringify({ source:'upstream', coordinates:[] }) });
  });
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const result = await page.evaluate(async () => {
    await import('/core/data-supply.js?v=stale-test');
    const payload = await fetch('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json').then(r => r.json());
    return { source:payload.source, stale:window.GeoDataSupply.describe('noaa-aurora').stale, transport:window.GeoDataSupply.describe('noaa-aurora').transport };
  });
  expect(result.source).toBe('upstream');
  expect(result.stale).toBe(true);
  expect(result.transport).toBe('provider-fallback');
  expect(noaaUpstream).toBe(1);
});
