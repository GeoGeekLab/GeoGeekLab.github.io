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
  // This isolated point tests physical pointer hit testing. Overlapping points are
  // intentionally reached through the event finder instead of forced hover.
  const circle=work.locator('.pw-event[data-event-id="B Polar Two"]');
  await circle.hover();
  await expect(work.locator('.pw-hover-detail')).toContainText('B Polar Two');
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


test('event finder locates overlapping points; A/B aggregate CSV exports retain comparable bins',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  await work.locator('[data-pc="find"]').fill('Polar');
  await expect(work.locator('[data-pc="found"] button')).toHaveCount(2);
  await work.locator('[data-pc="found"] button').first().click();
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED');
  await expect(work.locator('.pw-hover-detail')).toContainText('B Polar');
  await expect(work.locator('[data-pc="display"]')).toHaveValue('points');
  await expect.poll(async()=>Number((await work.locator('.pw-map').getAttribute('viewBox')).split(' ')[2])).toBeLessThan(1000);

  const chartDownload=page.waitForEvent('download');
  await work.locator('[data-pc="charts-csv"]').click();
  const chart=await chartDownload;
  const chartCsv=await readFile(await chart.path(),'utf8');
  expect(chartCsv).toContain('"chart","category","count_A","count_B"');
  expect(chartCsv).toContain('"trend"');
  expect(chartCsv).toContain('"magnitude"');
  expect(chartCsv).toContain('"depth"');

  const gridDownload=page.waitForEvent('download');
  await work.locator('[data-pc="grid-csv"]').click();
  const grid=await gridDownload;
  const gridCsv=await readFile(await grid.path(),'utf8');
  expect(gridCsv).toContain('"approx_area_km2"');
  expect(gridCsv).toContain('"count_per_million_km2_A"');
  expect(gridCsv.split('\r\n').length).toBeGreaterThan(3);
});

test('ROI drawing, pointer-centred zoom and drag pan stay accurate with SVG letterboxing',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  const map=work.locator('.pw-map');

  // Force non-2:1 drawing space. The world viewBox must letterbox horizontally
  // on wider viewports and vertically on narrower ones.
  await page.addStyleTag({content:`
    .pulse-workflow .pw-map {
      aspect-ratio:auto!important;
      height:230px!important;
      max-height:none!important;
      flex-shrink:0!important;
    }
  `});

  const toScreen=async(x,y)=>map.evaluate((svg,point)=>{
    const matrix=svg.getScreenCTM();
    const projected=new DOMPoint(point.x,point.y).matrixTransform(matrix);
    return {x:projected.x,y:projected.y};
  },{x,y});

  await work.locator('[data-pw="draw"]').click();
  await map.scrollIntoViewIfNeeded();
  const topLeft=await toScreen(((-85+180)/360)*1000,((90-25)/180)*500);
  const bottomRight=await toScreen(((-55+180)/360)*1000,((90-0)/180)*500);

  // The correct pointer positions must come from the SVG screen matrix.
  // Using the element's bounding rectangle would be incorrect here.
  const letterboxError=await map.evaluate(svg=>{
    const box=svg.getBoundingClientRect();
    const point=new DOMPoint(300,190).matrixTransform(svg.getScreenCTM());
    const naiveX=box.left+300*box.width/1000;
    const naiveY=box.top+190*box.height/500;
    return Math.hypot(point.x-naiveX,point.y-naiveY);
  });
  expect(letterboxError).toBeGreaterThan(2);

  await page.mouse.move(topLeft.x,topLeft.y);
  await page.mouse.down();
  await page.mouse.move(bottomRight.x,bottomRight.y,{steps:10});
  await page.mouse.up();

  const roi=async key=>Number(await work.locator('[data-pw="'+key+'"]').inputValue());
  expect(await roi('west')).toBeCloseTo(-85,1);
  expect(await roi('east')).toBeCloseTo(-55,1);
  expect(await roi('south')).toBeCloseTo(0,1);
  expect(await roi('north')).toBeCloseTo(25,1);
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');

  // Zooming at an off-centre pointer must keep that geographic point fixed.
  await map.scrollIntoViewIfNeeded();
  const anchor={x:570,y:280};
  const pointer=await toScreen(anchor.x,anchor.y);
  await page.mouse.move(pointer.x,pointer.y);
  await page.mouse.wheel(0,-120);
  await expect.poll(async()=>{
    const v=(await map.getAttribute('viewBox')).split(' ').map(Number);
    return v[2];
  }).toBeLessThan(1000);
  const afterAnchor=await map.evaluate((svg,pointer)=>{
    const point=new DOMPoint(pointer.x,pointer.y).matrixTransform(svg.getScreenCTM().inverse());
    return {x:point.x,y:point.y};
  },pointer);
  expect(afterAnchor.x).toBeCloseTo(anchor.x,0);
  expect(afterAnchor.y).toBeCloseTo(anchor.y,0);

  // Pan at a constant screen displacement. The starting CTM must stay fixed
  // during the drag, even as the SVG viewBox updates.
  const initial=await map.evaluate(svg=>({
    view:[svg.viewBox.baseVal.x,svg.viewBox.baseVal.y,svg.viewBox.baseVal.width,svg.viewBox.baseVal.height],
    matrixScale:svg.getScreenCTM().a
  }));
  const panStart=await toScreen(500,320);
  const dx=-12,dy=-6;
  await page.mouse.move(panStart.x,panStart.y);
  await page.mouse.down();
  await page.mouse.move(panStart.x+dx,panStart.y+dy,{steps:8});
  await page.mouse.up();
  const panned=(await map.getAttribute('viewBox')).split(' ').map(Number);
  const expectedX=Math.max(0,Math.min(1000-initial.view[2],initial.view[0]-dx/initial.matrixScale));
  const expectedY=Math.max(0,Math.min(500-initial.view[3],initial.view[1]-dy/initial.matrixScale));
  expect(panned[0]).toBeCloseTo(expectedX,0);
  expect(panned[1]).toBeCloseTo(expectedY,0);
  expect(panned[2]).toBeCloseTo(initial.view[2],3);
  expect(panned[3]).toBeCloseTo(initial.view[3],3);
});
