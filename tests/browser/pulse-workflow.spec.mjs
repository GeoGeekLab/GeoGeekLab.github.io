import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const feed = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const reference = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';

function feature(id, lon, lat, mag, depth, status = 'reviewed', place = id) {
  return {
    type:'Feature',id,
    geometry:{type:'Point',coordinates:[lon,lat,depth]},
    properties:{
      mag,place,time:Date.now()-3600000,updated:Date.now()-1800000,
      status,magType:'mw',type:'earthquake',
      url:'https://earthquake.usgs.gov/earthquakes/eventpage/'+id
    }
  };
}

async function fixtures(page) {
  const current = [
    feature('a',10,10,4.2,12),
    feature('b',100,-10,2.4,90,'automatic'),
    feature('c',20,20,5,55,'reviewed','=dangerous expression')
  ];
  const historical = [
    feature('hist-a',15,10,4.6,22),
    feature('hist-b',-70,40,3.3,120)
  ];
  const now = Date.now();
  const geojson = features => ({type:'FeatureCollection',features,metadata:{generated:now,count:features.length}});
  const metadata = {
    schemaVersion:2,supplyId:'usgs-earthquakes-day',dataset:'usgs-earthquakes-day',
    provider:'USGS Earthquake Hazards Program',format:'GeoJSON',source:feed,
    fetchedAt:new Date(now-60000).toISOString(),
    providerGeneratedAt:new Date(now).toISOString(),providerCount:current.length,
    sha256:'workflow-test-sha'
  };
  const land = {type:'FeatureCollection',features:[{
    type:'Feature',properties:{},
    geometry:{type:'Polygon',coordinates:[[[-50,-50],[50,-50],[50,50],[-50,50],[-50,-50]]]}
  }]};
  const landMeta = {
    schemaVersion:2,supplyId:'natural-earth-land-110m',
    dataset:'natural-earth-land-110m',source:reference,
    provider:'Natural Earth',version:'pinned',sha256:'workflow-reference-sha'
  };
  await page.route('https://earthquake.usgs.gov/**',route=>route.abort());
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(metadata)
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson',route=>route.fulfill({
    status:200,contentType:'application/geo+json',body:JSON.stringify(geojson(current))
  }));
  await page.route('**/data/reference/natural-earth-land-110m.meta.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(landMeta)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson',route=>route.fulfill({
    status:200,contentType:'application/geo+json',body:JSON.stringify(land)
  }));
  await page.route('https://earthquake.usgs.gov/fdsnws/event/1/query?**',route=>route.fulfill({
    status:200,contentType:'application/geo+json',body:JSON.stringify(geojson(historical))
  }));
  await page.goto('/lab.html?instrument=pulse#l10',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.pulse-workflow-launch')).toBeVisible({timeout:15000});
  await page.locator('.pulse-workflow-launch').click();
  await expect(page.locator('[data-pw="loaded"]')).toHaveText('3',{timeout:15000});
}

test('workflow preserves snapshot, applies geographic ROI and exports the selected set',async({page})=>{
  await fixtures(page);
  const work = page.locator('.pulse-workflow');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');
  await work.locator('[data-pw="west"]').fill('-5');
  await work.locator('[data-pw="east"]').fill('30');
  await work.locator('[data-pw="south"]').fill('0');
  await work.locator('[data-pw="north"]').fill('30');
  await work.locator('[data-pw="apply-roi"]').click();
  await expect(work.locator('[data-pw="visible"]')).toHaveText('2');
  await work.locator('[data-pw="view-mag"]').fill('4.5');
  await work.locator('[data-pw="view-mag"]').dispatchEvent('change');
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('3');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('1');
  await expect(work.locator('[data-pw="max-mag"]')).toHaveText('M 5.0');
  await expect(work.locator('[data-pw="median-depth"]')).toHaveText('55 km');

  const geojsonDownload = page.waitForEvent('download');
  await work.locator('[data-pw="geojson"]').click();
  const geojsonFile = await geojsonDownload;
  const geojson = JSON.parse(await readFile(await geojsonFile.path(),'utf8'));
  expect(geojson.features).toHaveLength(1);
  expect(geojson.features[0].id).toBe('c');
  expect(geojson.metadata.roi).toEqual({west:-5,east:30,south:0,north:30});
  expect(geojson.metadata.loadedValidRecords).toBe(3);
  expect(geojson.metadata.visibleRecords).toBe(1);

  const csvDownload = page.waitForEvent('download');
  await work.locator('[data-pw="csv"]').click();
  const csvFile = await csvDownload;
  const csv = await readFile(await csvFile.path(),'utf8');
  expect(csv).toContain('origin_utc');
  expect(csv).toContain("'=dangerous expression");
  expect(csv).not.toContain('"=dangerous expression"');

  const manifestDownload = page.waitForEvent('download');
  await work.locator('[data-pw="manifest"]').click();
  const manifestFile = await manifestDownload;
  const manifest = JSON.parse(await readFile(await manifestFile.path(),'utf8'));
  expect(manifest.sourceMode).toBe('snapshot');
  expect(manifest.viewFilters.minMagnitude).toBe(4.5);
});

test('history query uses date-scoped FDSN request without replacing snapshot fallback',async({page})=>{
  await fixtures(page);
  const work = page.locator('.pulse-workflow');
  const begin = new Date(Date.now()-3*86400000).toISOString().slice(0,10);
  const end = new Date().toISOString().slice(0,10);
  await work.locator('[data-pw="start"]').fill(begin);
  await work.locator('[data-pw="end"]').fill(end);
  const requests = [];
  page.on('request',request=>{
    if(request.url().includes('/fdsnws/event/1/query')) requests.push(request.url());
  });
  await work.locator('[data-pw="history"]').click();
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('2');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('2');
  expect(requests).toHaveLength(1);
  const query = new URL(requests[0]);
  expect(query.searchParams.get('starttime')).toBe(begin);
  expect(query.searchParams.get('minmagnitude')).toBe('2.5');
  expect(query.searchParams.get('limit')).toBe('10001');
  await work.locator('[data-pw="west"]').fill('0');
  await work.locator('[data-pw="east"]').fill('30');
  await work.locator('[data-pw="south"]').fill('0');
  await work.locator('[data-pw="north"]').fill('30');
  await work.locator('[data-pw="apply-roi"]').click();
  await expect(work.locator('[data-pw="visible"]')).toHaveText('1');
  await work.locator('[data-pw="return"]').click();
  await expect(page.locator('.pulse-observation-lab')).toBeVisible();
  await expect(page.locator('.pulse-workflow')).toBeHidden();
});

test('rejects incomplete provider results without silently replacing the loaded set',async({page})=>{
  await fixtures(page);
  const work = page.locator('.pulse-workflow');
  await page.unroute('https://earthquake.usgs.gov/fdsnws/event/1/query?**');
  await page.route('https://earthquake.usgs.gov/fdsnws/event/1/query?**',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({type:'FeatureCollection',features:[feature('only',1,1,4.1,10)],metadata:{count:10001}})
  }));
  await work.locator('[data-pw="history"]').click();
  await expect(work.locator('.pw-banner')).toContainText('exceeds 10,000 events');
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('3');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');
});
