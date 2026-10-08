import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const quakeFeed='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
const landSource='https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/physical/ne_110m_land.json';
const DAY=86400000;
const timestamp=ms=>new Date(Math.floor(ms/60000)*60000).toISOString().slice(0,16);
function earthquake(id, lon, lat, mag, depth, ageHours) {
  return {
    type:'Feature', id,
    geometry:{type:'Point',coordinates:[lon,lat,depth]},
    properties:{
      place:id,mag,time:Date.now()-ageHours*3600000,updated:Date.now()-3600000,
      magType:'mw',status:'reviewed',type:'earthquake',
      url:'https://earthquake.usgs.gov/earthquakes/eventpage/'+id
    }
  };
}
async function open(page){
  const now=Date.now();
  const events=[
    earthquake('A Pacific',-70,10,4.1,25,18),
    earthquake('A Rift',-71,12,3.6,300,16),
    earthquake('A Unknown',-60,15,null,null,14),
    earthquake('B Polar',10,65,5.3,50,6),
    earthquake('B Polar Two',10.4,65.2,4.8,140,5)
  ];
  const data={type:'FeatureCollection',metadata:{generated:now,count:5},features:events};
  const metadata={
    schemaVersion:2,supplyId:'usgs-earthquakes-day',dataset:'usgs-earthquakes-day',
    provider:'USGS Earthquake Hazards Program',format:'GeoJSON',source:quakeFeed,
    fetchedAt:new Date(now-60000).toISOString(),providerCount:5,
    providerGeneratedAt:new Date(now).toISOString(),sha256:'phase2-fixture'
  };
  const land={type:'FeatureCollection',features:[{
    type:'Feature',properties:{},geometry:{type:'Polygon',coordinates:[[[-170,-70],[170,-70],[170,70],[-170,70],[-170,-70]]]}
  }]};
  const landMetadata={
    schemaVersion:2,supplyId:'natural-earth-land-110m',
    provider:'Natural Earth',source:landSource,
    version:'pinned-fixture',sha256:'phase2-reference'
  };
  await page.route('https://earthquake.usgs.gov/**',route=>route.abort());
  await page.route('**/data/snapshots/usgs-earthquakes-day.meta.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(metadata)
  }));
  await page.route('**/data/snapshots/usgs-earthquakes-day.geojson',route=>route.fulfill({
    status:200,contentType:'application/geo+json',body:JSON.stringify(data)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.meta.json',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(landMetadata)
  }));
  await page.route('**/data/reference/natural-earth-land-110m.geojson',route=>route.fulfill({
    status:200,contentType:'application/geo+json',body:JSON.stringify(land)
  }));
  await page.goto('/lab.html?instrument=pulse#l10',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.pulse-workflow-launch')).toBeVisible({timeout:20000});
  await page.locator('.pulse-workflow-launch').click();
  await expect(page.locator('.pulse-workflow [data-pw="loaded"]')).toHaveText('5',{timeout:10000});
  await expect(page.locator('.pw-comparison')).toBeVisible();
  return {now,events};
}

test('comparative periods, interactive charts and manifest are linked to filtered catalogue',async({page})=>{
  const {now}=await open(page);
  const work=page.locator('.pulse-workflow');
  await expect(work.locator('[data-pc="a-count"]')).toContainText('3 EVENTS');
  await expect(work.locator('[data-pc="b-count"]')).toContainText('2 EVENTS');
  await expect(work.locator('[data-pc="trend"] .pw-comparison-bar')).toHaveCount(24);
  await expect(work.locator('[data-pc="depth"] .pw-comparison-bar')).toHaveCount(8);

  const bar=work.locator('[data-pc="depth"] .pw-comparison-bar').first();
  await bar.focus();
  await expect(work.locator('[data-pc="chart-readout"]')).toContainText('Shallow depth');
  await bar.press('Enter');
  await expect(work.locator('[data-pc="chart-readout"]')).toContainText('SELECTED');

  await work.locator('[data-pc="a-start"]').fill(timestamp(now-20*3600000));
  await work.locator('[data-pc="a-end"]').fill(timestamp(now-12*3600000));
  await work.locator('[data-pc="b-start"]').fill(timestamp(now-8*3600000));
  await work.locator('[data-pc="b-end"]').fill(timestamp(now+3600000));
  await work.locator('[data-pc="apply"]').click();
  await expect(work.locator('[data-pc="a-count"]')).toContainText('3 EVENTS');
  await expect(work.locator('[data-pc="b-count"]')).toContainText('2 EVENTS');

  const fileWait=page.waitForEvent('download');
  await work.locator('[data-pw="manifest"]').click();
  const file=await fileWait;
  const manifest=JSON.parse(await readFile(await file.path(),'utf8'));
  expect(manifest.analysis.version).toBe(2);
  expect(manifest.analysis.comparisonCounts).toEqual({a:3,b:2});
  expect(manifest.analysis.periodsUTC.a.endExclusive).toContain('T');
  expect(manifest.visibleRecords).toBe(5);

  // An invalid overlap must preserve the previously applied split.
  await work.locator('[data-pc="b-start"]').fill(timestamp(now-19*3600000));
  await work.locator('[data-pc="apply"]').click();
  await expect(work.locator('[data-pc="compare-status"]')).toContainText('overlap');
  await expect(work.locator('[data-pc="a-count"]')).toContainText('3 EVENTS');
});

test('mouse and keyboard inspection show complete points; map zoom and configurable grid work',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  const circle=work.locator('.pw-event').first();
  await circle.hover();
  await expect(work.locator('.pw-hover-detail')).toContainText('A Pacific');
  await expect(work.locator('.pw-hover-detail')).toContainText('COORDINATES');
  await expect(work.locator('.pw-floating-tip')).toBeVisible();
  await circle.click();
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED');

  await work.locator('[data-pc="zoom-in"]').click();
  await expect.poll(async()=>{
    return Number((await work.locator('.pw-map').getAttribute('viewBox')).split(' ')[2]);
  }).toBeLessThan(1000);
  await work.locator('[data-pc="zoom-reset"]').click();
  await expect(work.locator('.pw-map')).toHaveAttribute('viewBox','0 0 1000 500');

  await work.locator('[data-pc="display"]').selectOption('grid');
  await work.locator('[data-pc="resolution"]').selectOption('10');
  await work.locator('[data-pc="scope"]').selectOption('a');
  await work.locator('[data-pc="measure"]').selectOption('area');
  await expect(work.locator('.pw-grid-cell')).not.toHaveCount(0);
  await expect(work.locator('[data-pc="grid-legend"]')).toContainText('events/10⁶ km²');
  const cell=work.locator('.pw-grid-cell').first();
  await cell.focus();
  await expect(work.locator('.pw-hover-detail')).toContainText('records');
  await cell.press('Enter');
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED ·');
  await work.locator('[data-pc="scope"]').selectOption('b');
  await expect(work.locator('[data-pc="grid-legend"]')).toContainText('WINDOW B');
  await work.locator('[data-pc="display"]').selectOption('points');
  await expect(work.locator('.pw-event').first()).toBeVisible();
});

test('original Pulse keeps one original land layer even when workflow map is mounted',async({page})=>{
  await open(page);
  await expect(page.locator('.pulse-observation-lab .pulse-land path')).toHaveCount(1);
  await expect(page.locator('.pw-map .pw-land path')).toHaveCount(1);
  await page.locator('.pulse-workflow [data-pw="return"]').click();
  await expect(page.locator('.pulse-observation-lab')).toBeVisible();
});
