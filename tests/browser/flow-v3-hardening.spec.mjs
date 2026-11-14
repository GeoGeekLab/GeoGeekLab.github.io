import {test,expect} from '@playwright/test';

const world={type:'FeatureCollection',features:[]};
const model=(speed,time)=>Array.from({length:84},(_,i)=>({
  latitude:-60+Math.floor(i/12)*20,
  longitude:-180+(i%12)*30,
  current:{wind_speed_10m:speed,wind_direction_10m:270,time},
  current_units:{wind_speed_10m:'m/s'}
}));
const currentUtc=()=>new Date().toISOString().slice(0,16);
async function sources(page,{speed=9,time=currentUtc(),openMeteo='ok',gfs='fail'}={}){
  let requests=0;
  await page.route('https://api.open-meteo.com/**',route=>{
    requests++;
    if(openMeteo==='fail')return route.fulfill({status:503,body:'unavailable'});
    const data=model(speed,time);
    if(openMeteo==='malformed')data[10].longitude=41;
    return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});
  });
  await page.route('https://raw.githubusercontent.com/cambecc/earth/**',route=>{
    if(gfs==='fail')return route.fulfill({status:503,body:'unavailable'});
    const header={nx:4,ny:3,lo1:0,la1:40,dx:90,dy:20,
      refTime:'2024-01-01T00:00:00Z',forecastTime:0};
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify([
        {header:{...header,parameterCategory:2,parameterNumber:2},data:Array(12).fill(8)},
        {header:{...header,parameterCategory:2,parameterNumber:3},data:Array(12).fill(2)}
      ])
    });
  });
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',
    route=>route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(world)}));
  return ()=>requests;
}
async function enter(page,query=''){
  await page.goto('/lab.html?instrument=flow&flowMode=field'+query+'#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
}
async function mode(page,name){
  await page.locator('.flow-tabs [data-mode="'+name+'"]').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',name);
}
async function sampleCenter(page){
  await page.locator('#flMap').focus();
  await page.keyboard.press('Enter');
  return await page.locator('#flSampleReadout').textContent();
}
async function metrics(page){
  return page.locator('.flow-lab').evaluate(node=>node._flowDiagnostics());
}

test('Stage 6 current wind fetch bypasses cache across repeated visits and exposes UTC provenance',async({page})=>{
  let count=0;
  await sources(page);
  // Override the source fixture for the second visit, preserving the same URL.
  await page.unroute('https://api.open-meteo.com/**');
  await page.route('https://api.open-meteo.com/**',route=>{
    count++;
    return route.fulfill({status:200,contentType:'application/json',
      body:JSON.stringify(model(count===1?8:16,currentUtc()))});
  });
  await enter(page);
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-cache','no-store');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-class','recent');
  await expect(page.locator('#flDataProvenance')).toContainText('Weather data: Open-Meteo');
  await expect(page.locator('#flDataProvenance a[href*="open-meteo.com/en/terms"]')).toBeVisible();
  expect(await sampleCenter(page)).toContain('8.0 metres per second');
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
  expect(await sampleCenter(page)).toContain('16.0 metres per second');
  expect(count).toBeGreaterThanOrEqual(2);
});

test('Stage 6 bad live grid degrades transparently to archived GFS with correct cache tag',async({page})=>{
  await sources(page,{openMeteo:'malformed',gfs:'ok'});
  await enter(page);
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-class','archived');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-cache','force-cache');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-failures',/live-unavailable/);
  await expect(page.locator('#flDataProvenance')).toContainText('ARCHIVED MODEL');
  await expect(page.locator('#flDataProvenance')).toContainText('NOT CURRENT');
  await expect(page.locator('#flDataProvenance')).toContainText('SOURCE RECOVERY');
});

test('Stage 6 source cascade visibly labels synthetic fallback and missing weather validity',async({page})=>{
  await sources(page,{openMeteo:'fail',gfs:'fail'});
  await enter(page);
  await expect(page.locator('#flStatus')).toHaveText('FALLBACK');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-class','synthetic');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-cache','none');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-failures',/live-unavailable,archive-unavailable/);
  await expect(page.locator('#flDataProvenance')).toContainText('NO WEATHER VALID TIME');
  await expect(page.locator('#flDataProvenance')).toContainText('Synthetic teaching fallback');
  await mode(page,'od');
  await expect(page.locator('#flStatus')).toHaveText('REFERENCE');
  await mode(page,'trips');
  await expect(page.locator('#flStatus')).toHaveText('REFERENCE');
});

test('Stage 6 stale model valid time is visibly marked rather than presented as current',async({page})=>{
  await sources(page,{time:'2024-01-01T00:00'});
  await enter(page);
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-source-class','stale');
  await expect(page.locator('[data-source-freshness]')).toContainText('STALE MODEL SNAPSHOT');
  await expect(page.locator('#flDataProvenance')).toContainText('VALID 2024-01-01 00:00 UTC');
});

test('Stage 6 frame budget at min/default/max particle density over three screen sizes',async({page},testInfo)=>{
  test.setTimeout(180000);
  await sources(page);
  const viewports=[
    {label:'desktop',width:1440,height:900},
    {label:'tablet',width:900,height:980},
    {label:'mobile',width:390,height:844}
  ];
  const records=[];
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await enter(page);
    for(const density of [250,900,1800]){
      await page.locator('#flDensity').evaluate((input,count)=>{
        input.value=String(count);input.dispatchEvent(new Event('input',{bubbles:true}));
      },density);
      // Reset the sampling window after an initial warm-up draw.
      await page.waitForTimeout(160);
      await page.locator('.flow-lab').evaluate(node=>node._flowResetMetrics());
      await expect.poll(async()=>(await metrics(page)).sampleFrames,{timeout:9000,intervals:[180]}).toBeGreaterThanOrEqual(30);
      const value=await metrics(page);
      const budget=value.budgets;
      expect(value.density).toBe(density);
      expect(value.drawP95Ms,viewport.label+' '+density+' particles').toBeLessThanOrEqual(
        viewport.label==='mobile'?budget.maxDrawP95MobileMs:budget.maxDrawP95DesktopMs);
      expect(value.svgPaths).toBeLessThanOrEqual(budget.maxSvgPaths);
      expect(value.domNodes).toBeLessThanOrEqual(budget.maxFlowDomNodes);
      expect(value.canvasSurfaceMiB).toBeLessThanOrEqual(budget.maxCanvasSurfaceMiB);
      records.push({viewport:viewport.label,density,...value});
    }
  }
  await testInfo.attach('stage6-flow-frame-budgets.json',{
    body:Buffer.from(JSON.stringify(records,null,2)),contentType:'application/json'
  });
});

test('Stage 6 overlay observer costs remain bounded during pan and TRIPS playback',async({page},testInfo)=>{
  await sources(page);await enter(page);
  await mode(page,'od');
  const initial=Number(await page.locator('.flow-lab').getAttribute('data-flow-overlay-renders')||0);
  const map=page.locator('#flMap');
  const r=await map.boundingBox();if(!r)throw Error('No map bounds');
  await page.mouse.move(r.x+r.width*.3,r.y+r.height*.5);
  await page.mouse.down();
  for(let i=0;i<30;i++)await page.mouse.move(
    r.x+r.width*(.3+i*.005),r.y+r.height*.5,{steps:1});
  await page.mouse.up();
  await page.waitForTimeout(250);
  const after=Number(await page.locator('.flow-lab').getAttribute('data-flow-overlay-renders')||0);
  expect(after).toBeGreaterThan(initial);
  expect(after-initial).toBeLessThanOrEqual(75);
  await mode(page,'trips');
  await page.waitForTimeout(750);
  const s=await metrics(page);
  expect(s.svgPaths).toBeLessThanOrEqual(s.budgets.maxSvgPaths);
  await testInfo.attach('stage6-flow-overlay.json',{
    body:Buffer.from(JSON.stringify({before:initial,after,metrics:s},null,2)),
    contentType:'application/json'
  });
});

test('Stage 6 unmount/remount disconnects frames, observers and workbench handlers',async({page})=>{
  await sources(page);
  await enter(page);
  const stage=page.locator('#instrumentStage');
  const session=await page.context().newCDPSession(page);
  await session.send('HeapProfiler.collectGarbage');
  const beforeHeap=await session.send('Runtime.getHeapUsage');
  for(let cycle=1;cycle<=3;cycle++){
    await expect(page.locator('.flow-lab')).toBeVisible();
    await page.locator('#flMap').focus();
    await page.keyboard.press('Enter');
    const before=await metrics(page);
    expect(before.domNodes).toBeLessThanOrEqual(before.budgets.maxFlowDomNodes);
    await page.locator('#instrumentClose').click();
    await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('open','');
    await expect.poll(async()=>Number(await stage.getAttribute('data-flow-disposed-count')||0)).toBe(cycle);
    await expect.poll(async()=>Number(await stage.getAttribute('data-flow-refinement-disposed-count')||0)).toBe(cycle);
    await expect(page.locator('.flow-lab')).toHaveCount(0);
    if(cycle<3){
      await page.locator('[data-instrument="flow"]').first().click();
      await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:20000});
    }
  }
  await session.send('HeapProfiler.collectGarbage');
  const afterHeap=await session.send('Runtime.getHeapUsage');
  const deltaMiB=(afterHeap.usedSize-beforeHeap.usedSize)/(1024*1024);
  await session.detach();
  await test.info().attach('stage6-flow-js-heap.json',{
    body:Buffer.from(JSON.stringify({
      beforeUsedMiB:beforeHeap.usedSize/(1024*1024),
      afterUsedMiB:afterHeap.usedSize/(1024*1024),
      deltaMiB,cycles:3,
      note:'CDP forced-GC JS heap only; excludes Canvas/GPU surfaces and is not a long-duration leak proof.'
    },null,2)),contentType:'application/json'
  });
  expect(deltaMiB,'JS heap growth after three closed Flow instances').toBeLessThanOrEqual(20);
});

test('Stage 6 reduced-motion starts paused yet permits keyboard inspection and full mode cycle',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});
  await sources(page);await enter(page);
  await expect(page.locator('#flPause')).toHaveText('PLAY');
  const shell=page.locator('.flow-lab');
  await expect.poll(async()=>Boolean((await metrics(page)).reducedMotion)).toBe(true);
  const held=Number(await shell.getAttribute('data-simulated-seconds')||0);
  await page.waitForTimeout(320);
  expect(Number(await shell.getAttribute('data-simulated-seconds')||0)).toBe(held);
  const result=await sampleCenter(page);
  expect(result).toContain('metres per second');
  for(const name of ['od','trips','release','field'])await mode(page,name);
  await expect(page.locator('#flPause')).toHaveText('PLAY');
});

test('Stage 6 access targets and mobile analytic panel do not overflow width',async({page})=>{
  await page.setViewportSize({width:390,height:844});
  await sources(page);await enter(page);
  for(const name of ['field','od','trips','release']){
    await mode(page,name);
    const v=await page.evaluate(()=>{
      const buttons=[...document.querySelectorAll('.flow-workbar button,.flow-map-footer button,.flow-rail-nav button')];
      return {horizontalOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth),
        minButtonHeight:Math.min(...buttons.filter(x=>x.getBoundingClientRect().height>0).map(x=>x.getBoundingClientRect().height)),
        liveRegions:[...document.querySelectorAll('.flow-lab [aria-live]')].length};
    });
    expect(v.horizontalOverflow,name).toBeLessThanOrEqual(2);
    expect(v.minButtonHeight,name).toBeGreaterThanOrEqual(43.5);
    expect(v.liveRegions).toBeLessThanOrEqual(3);
  }
});
