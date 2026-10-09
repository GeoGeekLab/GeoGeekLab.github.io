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
  await expect(page.locator('.pulse-task-tabs [data-pulse-task="analyze"]')).toBeVisible({timeout:20000});
  await page.locator('.pulse-task-tabs [data-pulse-task="analyze"]').click();
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
  // SVG <g> bounds are not necessarily the painted hit surface. Move the
  // mouse to the real circle's screen coordinates and verify event delivery.
  await circle.scrollIntoViewIfNeeded();
  const hit=await circle.locator('.pw-event-hit').evaluate(node=>{
    const box=node.getBoundingClientRect();
    return {x:box.left+box.width/2,y:box.top+box.height/2};
  });
  await page.mouse.move(hit.x,hit.y);
  await expect(work.locator('.pw-hover-detail')).toContainText('B Polar Two');
  await expect(work.locator('.pw-hover-detail')).toContainText('COORDINATES');
  await expect(work.locator('.pw-floating-tip')).toBeVisible();
  // Updating the hover inspector must not move the map beneath the pointer.
  const still=await circle.locator('.pw-event-hit').evaluate(node=>{
    const box=node.getBoundingClientRect();
    return {x:box.left+box.width/2,y:box.top+box.height/2};
  });
  expect(Math.hypot(still.x-hit.x,still.y-hit.y)).toBeLessThan(1);
  await page.mouse.click(still.x,still.y);
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
  // Window B intentionally hides points outside its comparison period.
  await expect(work.locator('.pw-event[data-event-id="A Pacific"]')).toBeHidden();
  await expect(work.locator('.pw-event[data-event-id="B Polar"]')).toBeVisible();
});

test('original Pulse keeps one original land layer even when workflow map is mounted',async({page})=>{
  await open(page);
  await expect(page.locator('.pulse-observation-lab .pulse-land path')).toHaveCount(1);
  await expect(page.locator('.pw-map .pw-land path')).toHaveCount(1);
  await page.locator('.pulse-task-tabs [data-pulse-task="observe"]').click();
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

  // Capture the coordinates actually delivered to SVG pointer handlers.
  // Mobile emulation may scroll the document while the pointer travels.
  await map.evaluate(svg=>{
    window.__pulsePointerSamples=[];
    const hit=svg.querySelector('.pw-draw-hit');
    for(const kind of ['pointerdown','pointerup']) {
      hit.addEventListener(kind,event=>{
        const p=new DOMPoint(event.clientX,event.clientY).matrixTransform(svg.getScreenCTM().inverse());
        window.__pulsePointerSamples.push({kind,x:p.x,y:p.y});
      },{capture:true});
    }
  });
  await page.mouse.move(topLeft.x,topLeft.y);
  await page.mouse.down();
  await page.mouse.move(bottomRight.x,bottomRight.y,{steps:10});
  await page.mouse.up();

  const roi=async key=>Number(await work.locator('[data-pw="'+key+'"]').inputValue());
  const delivered=await map.evaluate(()=>window.__pulsePointerSamples);
  expect(delivered.map(x=>x.kind)).toEqual(['pointerdown','pointerup']);
  const start=delivered[0],end=delivered[1];
  const expectedLon=x=>x/1000*360-180,expectedLat=y=>90-y/500*180;
  expect(await roi('west')).toBeCloseTo(expectedLon(Math.min(start.x,end.x)),1);
  expect(await roi('east')).toBeCloseTo(expectedLon(Math.max(start.x,end.x)),1);
  expect(await roi('south')).toBeCloseTo(expectedLat(Math.max(start.y,end.y)),1);
  expect(await roi('north')).toBeCloseTo(expectedLat(Math.min(start.y,end.y)),1);
  if(test.info().project.name==='desktop-chromium') {
    expect(await roi('west')).toBeCloseTo(-85,1);
    expect(await roi('east')).toBeCloseTo(-55,1);
    expect(await roi('south')).toBeCloseTo(0,1);
    expect(await roi('north')).toBeCloseTo(25,1);
  }
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

  // Draw again on the zoomed and panned map. Selection coordinates should
  // remain geographic rather than inheriting the preceding screen offsets.
  await work.locator('[data-pw="draw"]').click();
  await map.scrollIntoViewIfNeeded();
  const revisedStart=await toScreen(280,180);
  const revisedEnd=await toScreen(350,245);
  await page.mouse.move(revisedStart.x,revisedStart.y);
  await page.mouse.down();
  await page.mouse.move(revisedEnd.x,revisedEnd.y,{steps:8});
  await page.mouse.up();
  const lon=x=>(x/1000)*360-180;
  const lat=y=>90-(y/500)*180;
  const revised=await map.evaluate(()=>window.__pulsePointerSamples.slice(-2));
  expect(revised.map(x=>x.kind)).toEqual(['pointerdown','pointerup']);
  expect(await roi('west')).toBeCloseTo(lon(Math.min(revised[0].x,revised[1].x)),1);
  expect(await roi('east')).toBeCloseTo(lon(Math.max(revised[0].x,revised[1].x)),1);
  expect(await roi('south')).toBeCloseTo(lat(Math.max(revised[0].y,revised[1].y)),1);
  expect(await roi('north')).toBeCloseTo(lat(Math.min(revised[0].y,revised[1].y)),1);
  if(test.info().project.name==='desktop-chromium') {
    expect(await roi('west')).toBeCloseTo(lon(280),1);
    expect(await roi('east')).toBeCloseTo(lon(350),1);
    expect(await roi('south')).toBeCloseTo(lat(245),1);
    expect(await roi('north')).toBeCloseTo(lat(180),1);
  }
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');
});

test('ROI and filters invalidate stale event selections without changing catalogue statistics',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  await work.locator('[data-pc="find"]').fill('A Rift');
  await work.locator('[data-pc="found"] button').first().click();
  await expect(work.locator('.pw-selected')).toContainText('A Rift');
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED · A Rift');

  // The ROI retains A Rift and A Pacific but excludes the other records.
  for(const [key,value] of Object.entries({west:'-82',east:'-63',south:'5',north:'25'})){
    await work.locator('[data-pw="'+key+'"]').fill(value);
  }
  await work.locator('[data-pw="apply-roi"]').click();
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('5');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('2');
  await expect(work.locator('.pw-selected')).toContainText('A Rift');
  await expect(work.locator('.pw-hover-detail')).toContainText('A Rift');

  // M >= 4 removes the previously pinned M3.6 record.
  await work.locator('[data-pw="view-mag"]').fill('4');
  await work.locator('[data-pw="view-mag"]').dispatchEvent('change');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('1');
  await expect(work.locator('[data-pw="max-mag"]')).toHaveText('M 4.1');
  await expect(work.locator('.pw-selected')).toContainText('outside the current ROI or filters');
  await expect(work.locator('.pw-hover-detail')).toContainText('outside the current ROI or filters');
  await expect(work.locator('[data-pc="found"]')).toContainText('No matching visible records');

  const downloadPromise=page.waitForEvent('download');
  await work.locator('[data-pw="geojson"]').click();
  const file=await downloadPromise;
  const saved=JSON.parse(await readFile(await file.path(),'utf8'));
  expect(saved.features.map(f=>f.id)).toEqual(['A Pacific']);
  expect(saved.metadata.loadedValidRecords).toBe(5);
  expect(saved.metadata.visibleRecords).toBe(1);

  await work.locator('[data-pw="reset-roi"]').click();
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');
  await expect(work.locator('.pw-selected')).not.toContainText('A Rift');
});

test('window scope constrains point markers and invalidates selections outside map data',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  const a=work.locator('.pw-event[data-event-id="A Pacific"]');
  const b=work.locator('.pw-event[data-event-id="B Polar"]');
  await work.locator('[data-pc="find"]').fill('A Pacific');
  await work.locator('[data-pc="found"] button').first().click();
  await expect(work.locator('.pw-selected')).toContainText('A Pacific');

  await work.locator('[data-pc="scope"]').selectOption('b');
  await expect(a).toBeHidden();
  await expect(b).toBeVisible();
  await expect(work.locator('.pw-selected')).toContainText('outside the current map data');
  await expect(work.locator('.pw-hover-detail')).toContainText('outside the current map data');
  await expect(work.locator('[data-pw="visible"]')).toHaveText('5');
  await expect(work.locator('[data-pc="grid-legend"]')).toContainText('2 shown of 5 filtered records');

  await work.locator('[data-pc="scope"]').selectOption('a');
  await expect(a).toBeVisible();
  await expect(b).toBeHidden();
  await expect(work.locator('[data-pc="grid-legend"]')).toContainText('3 shown of 5 filtered records');
  await expect(work.locator('.pw-selected')).not.toContainText('A Pacific');

  await work.locator('[data-pc="display"]').selectOption('grid');
  const cell=work.locator('.pw-grid-cell').first();
  await cell.focus();
  await cell.press('Enter');
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED ·');
  await work.locator('[data-pc="scope"]').selectOption('b');
  await expect(work.locator('.pw-hover-detail')).toContainText('Selected cell is outside the current map subset');
});

test('catalogue reload invalidates event and comparison pins even when record count is unchanged',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  await work.locator('[data-pc="find"]').fill('B Polar');
  await work.locator('[data-pc="found"] button').first().click();
  await expect(work.locator('.pw-hover-detail')).toContainText('PINNED · B Polar');

  // Fetch the same fixture again. A new catalogue revision must invalidate old pins.
  await work.locator('[data-pw="snapshot"]').click();
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('5');
  await expect(work.locator('.pw-selected')).toContainText('A new catalogue was loaded');
  await expect(work.locator('.pw-hover-detail')).toContainText('Catalogue updated');
  await expect(work.locator('[data-pc="a-count"]')).toContainText('3 EVENTS');
  await expect(work.locator('[data-pc="b-count"]')).toContainText('2 EVENTS');
});

test('task navigation keeps loaded analyses and handles direct Analyze URLs',async({page})=>{
  await open(page);
  const dialog=page.locator('#instrumentDialog');
  const analyze=page.locator('.pulse-task-tabs [data-pulse-task="analyze"]');
  const observe=page.locator('.pulse-task-tabs [data-pulse-task="observe"]');
  await expect(dialog).toHaveAttribute('data-pulse-task','analyze');
  await expect(page.locator('.instrument-workspace-modes')).toBeHidden();
  await expect(analyze).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.pulse-workflow')).toBeVisible();
  await expect(page.locator('.pulse-observation-lab')).toBeHidden();
  await expect(page).toHaveURL(/pulseTask=analyze/);

  await page.locator('[data-pw="west"]').fill('-80');
  await page.locator('[data-pw="east"]').fill('-60');
  await page.locator('[data-pw="south"]').fill('5');
  await page.locator('[data-pw="north"]').fill('20');
  await page.locator('[data-pw="apply-roi"]').click();
  await expect(page.locator('[data-pw="visible"]')).toHaveText('3');

  await observe.click();
  await expect(dialog).toHaveAttribute('data-pulse-task','observe');
  await expect(page.locator('.pulse-observation-lab')).toBeVisible();
  await expect(page.locator('.pulse-workflow')).toBeHidden();
  await expect(page.locator('.pulse-provenance')).toBeVisible();
  await expect(page).not.toHaveURL(/pulseTask=analyze/);

  await analyze.click();
  await expect(page.locator('[data-pw="visible"]')).toHaveText('3');
  await expect(page.locator('[data-pw="west"]')).toHaveValue('-80.00');
  await expect(page.locator('.pulse-workflow')).toBeVisible();

  await page.goto('/lab.html?instrument=pulse&pulseTask=analyze#l10',{waitUntil:'domcontentloaded'});
  await expect(dialog).toHaveAttribute('data-pulse-task','analyze',{timeout:20000});
  await expect(page.locator('[data-pw="loaded"]')).toHaveText('5',{timeout:20000});
  await expect(analyze).toHaveAttribute('aria-pressed','true');
});

test('Observe and Analyze use one semantic scientific visual system',async({page})=>{
  await open(page);
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-pulse-ui-system]')?.sheet));
  const dialog=page.locator('#instrumentDialog');
  const work=page.locator('.pulse-workflow');
  const styleOf=async selector=>page.locator(selector).first().evaluate(node=>{
    const css=getComputedStyle(node);
    return {background:css.backgroundColor,color:css.color,fill:css.fill,
      stroke:css.stroke,borderRadius:css.borderTopLeftRadius,
      fontSize:parseFloat(css.fontSize),width:node.getBoundingClientRect().width};
  });
  const tokens=await dialog.evaluate(node=>{
    const css=getComputedStyle(node);
    return {
      event:css.getPropertyValue('--pulse-ui-signal').trim(),
      roi:css.getPropertyValue('--pulse-ui-roi').trim(),
      panel:css.getPropertyValue('--pulse-ui-panel').trim(),
      a:css.getPropertyValue('--pulse-ui-a').trim(),
      b:css.getPropertyValue('--pulse-ui-b').trim()
    };
  });
  expect(tokens.event).toBe('#d16339');
  expect(tokens.roi).toBe('#8fc69b');
  expect(tokens.a).not.toBe(tokens.b);

  const analysisEvent=await styleOf('.pw-map .pw-event-marker');
  const analysisLand=await styleOf('.pw-map .pw-land');
  const analysisBackground=await styleOf('.pw-map .pw-world-background');
  const analysisPanel=await styleOf('.pw-side');
  const analysisMap=await styleOf('.pw-map');
  const analysisInput=await styleOf('.pw-fields input');
  expect(analysisInput.fontSize).toBeGreaterThanOrEqual(12);
  expect(analysisMap.borderRadius).toBe('0px');

  // Install a non-world ROI so its SVG rectangle exists for visual comparison.
  for(const [key,value] of Object.entries({west:'-170',east:'170',south:'-80',north:'80'})){
    await work.locator('[data-pw="'+key+'"]').fill(value);
  }
  await work.locator('[data-pw="apply-roi"]').click();
  await work.locator('[data-pc="display"]').selectOption('grid');
  const eventGrid=await styleOf('.pw-grid-cell');
  const roi=await styleOf('.pw-roi-rect');
  expect(eventGrid.fill).not.toBe(roi.fill);
  const comparisonA=await styleOf('.pw-bar-a');
  const comparisonB=await styleOf('.pw-bar-b');
  expect(comparisonA.fill).not.toBe(comparisonB.fill);
  await work.locator('[data-pc="display"]').selectOption('points');

  await page.locator('.pulse-task-tabs [data-pulse-task="observe"]').click();
  const observationEvent=await styleOf('.pulse-observation-lab .pulse-event-marker');
  const observationLand=await styleOf('.pulse-observation-lab .pulse-land');
  const observationBackground=await styleOf('.pulse-observation-lab .pulse-map-background');
  const observationPanel=await styleOf('.pulse-observation-lab .pulse-panel');
  const observationMap=await styleOf('.pulse-map-frame');
  expect(analysisEvent.fill).toBe(observationEvent.fill);
  expect(analysisLand.fill).toBe(observationLand.fill);
  expect(analysisBackground.fill).toBe(observationBackground.fill);
  expect(analysisPanel.background).toBe(observationPanel.background);
  expect(observationMap.borderRadius).toBe('0px');
  await expect(page.locator('.pulse-provenance')).toBeVisible();

  if(page.viewportSize().width>1040){
    expect(Math.abs(analysisPanel.width-observationPanel.width)).toBeLessThan(3);
  }else{
    expect(observationPanel.width).toBeGreaterThan(230);
    expect(analysisPanel.width).toBeGreaterThan(230);
  }
  await page.locator('.pulse-task-tabs [data-pulse-task="analyze"]').click();
  await expect(work.locator('[data-pw="loaded"]')).toHaveText('5');
  await expect(work.locator('[data-pc="a-count"]')).toContainText('3 EVENTS');
  await expect(work.locator('[data-pc="b-count"]')).toContainText('2 EVENTS');
});

test('Pulse ROI, field status and controls remain legible at narrow layouts',async({page})=>{
  await open(page);
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-pulse-ui-system]')?.sheet));
  const work=page.locator('.pulse-workflow');
  const button=work.locator('[data-pw="draw"]');
  const before=await button.evaluate(node=>getComputedStyle(node).backgroundColor);
  await button.click();
  const after=await button.evaluate(node=>getComputedStyle(node).backgroundColor);
  expect(after).not.toBe(before);
  await expect(button).toHaveAttribute('aria-pressed','true');
  await button.click();
  await expect(button).toHaveAttribute('aria-pressed','false');
  for(const field of ['west','east','south','north']){
    const size=await work.locator('[data-pw="'+field+'"]').evaluate(node=>parseFloat(getComputedStyle(node).fontSize));
    expect(size).toBeGreaterThanOrEqual(12);
  }
  const map=work.locator('.pw-map');
  const mapRect=await map.boundingBox();
  expect(mapRect.width).toBeGreaterThan(180);
  expect(mapRect.height).toBeGreaterThan(90);
});

test('comparison denominators track ROI-filter scope and never claim seismic hazard rates',async({page})=>{
  await open(page);
  const work=page.locator('.pulse-workflow');
  const note=work.locator('[data-pc="comparison-note"]');
  await expect(note).toContainText('A: 3 events /');
  await expect(note).toContainText('B: 2 events /');
  await expect(note).toContainText('5 ROI/filter records from a 5-record loaded catalogue');
  await expect(note).toContainText('not detection-corrected seismicity rates');

  // Narrow ROI to the A records while retaining the loaded catalogue.
  for(const [key,value] of Object.entries({west:'-80',east:'-55',south:'0',north:'25'})){
    await work.locator('[data-pw="'+key+'"]').fill(value);
  }
  await work.locator('[data-pw="apply-roi"]').click();
  await expect(work.locator('[data-pw="visible"]')).toHaveText('3');
  await expect(note).toContainText('3 ROI/filter records from a 5-record loaded catalogue');
  await expect(note).toContainText('B: 0 events /');
  await work.locator('[data-pw="reset-roi"]').click();
  await expect(note).toContainText('5 ROI/filter records from a 5-record loaded catalogue');
});

test('mobile Observe and Analyze controls have 44px touch targets without horizontal page overflow',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const work=page.locator('.pulse-workflow');
  await page.waitForFunction(()=>Boolean(document.querySelector('link[data-pulse-ui-system]')?.sheet));
  const touch=async selector=>page.locator(selector).first().evaluate(node=>({
    width:node.getBoundingClientRect().width,
    height:node.getBoundingClientRect().height
  }));
  for(const selector of [
    '.pw-section-nav button',
    '[data-pw="draw"]',
    '[data-pw="snapshot"]',
    '[data-pw="west"]',
    '[data-pc="display"]',
    '[data-pc="zoom-in"]'
  ]){
    const size=await touch(selector);
    expect(size.height,selector).toBeGreaterThanOrEqual(44);
    expect(size.width,selector).toBeGreaterThan(20);
  }
  await expect(page.locator('.pulse-workflow')).toBeVisible();
  await expect(work.locator('.pw-map-column .pw-map-tools [data-pc="zoom-in"]')).toBeVisible();
  await expect(work.locator('.pw-map-column .pw-map-help')).toContainText('Drag empty map to pan');
  const box=work.locator('.pw-map');
  const original=Number((await box.getAttribute('viewBox')).split(' ')[2]);
  await work.locator('.pw-map-column [data-pc="zoom-in"]').click();
  const changed=Number((await box.getAttribute('viewBox')).split(' ')[2]);
  expect(changed).toBeLessThan(original);
  await work.locator('.pw-map-column [data-pc="zoom-reset"]').click();
  await expect(box).toHaveAttribute('viewBox','0 0 1000 500');
  const source=page.locator('[data-pw="source-state"]');
  await expect(source).toContainText('USGS feed generated');
  await page.locator('.pulse-task-tabs [data-pulse-task="observe"]').click();
  await expect(page.locator('.pulse-observation-lab')).toBeVisible();
  for(const selector of ['#pulsePlay','#pulseMagnitudeFilter','#pulseTimeline']){
    expect((await touch(selector)).height,selector).toBeGreaterThanOrEqual(44);
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
});
