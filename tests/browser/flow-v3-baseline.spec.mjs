import { test, expect } from '@playwright/test';

// Deterministic interaction fixture; coordinates are schematic land shapes.
// It tests UI geometry, not the scientific validity of the basemap.
const schematicWorld={
  type:'FeatureCollection',
  features:[
    {type:'Feature',properties:{name:'West fixture'},geometry:{type:'Polygon',coordinates:[[[-168,67],[-128,69],[-90,53],[-82,12],[-105,-16],[-75,-55],[-46,-37],[-79,6],[-112,34],[-168,67]]]}},
    {type:'Feature',properties:{name:'East fixture'},geometry:{type:'Polygon',coordinates:[[[-10,70],[44,72],[91,60],[147,54],[152,8],[126,-12],[110,-48],[72,-29],[34,7],[-10,37],[-10,70]]]}},
    {type:'Feature',properties:{name:'South fixture'},geometry:{type:'Polygon',coordinates:[[[-16,37],[41,27],[37,-35],[19,-42],[-6,-17],[-16,37]]]}}
  ]
};
function modelWindFixture(){
  return Array.from({length:84},(_,index)=>({
    latitude:-60+Math.floor(index/12)*20,
    longitude:-180+(index%12)*30,
    current:{wind_speed_10m:6,wind_direction_10m:270,time:'2026-11-13T12:00'}
  }));
}
async function openFlow(page,extra=''){
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(modelWindFixture())
  }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(schematicWorld)
  }));
  await page.goto('/lab.html?instrument=flow&flowMode=field'+extra+'#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:20_000});
  await expect(page.locator('.flow-tabs [data-mode]')).toHaveCount(4);
}
function query(page,key){return new URL(page.url()).searchParams.get(key);}
async function selectMode(page,mode){
  await page.locator('.flow-tabs [data-mode="'+mode+'"]').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',mode);
  await expect(page.locator('.flow-tabs [data-mode="'+mode+'"]')).toHaveAttribute('aria-selected','true');
  await expect.poll(()=>query(page,'flowMode')).toBe(mode);
}

test('V3 baseline: FIELD, OD, TRIPS, RELEASE retain distinct source semantics and controls',async({page})=>{
  await openFlow(page);
  await expect(page.locator('.flow-active-summary')).toContainText('VELOCITY VECTOR');
  await expect(page.locator('#flDensity')).toBeVisible();
  await expect(page.locator('#flSpeed')).toBeVisible();
  await expect(page.locator('#flVectors')).toBeVisible();
  await expect(page.locator('#flStatus')).toContainText('DATA');

  await selectMode(page,'od');
  await expect(page.locator('.flow-active-summary')).toContainText('PLACE PAIRS');
  await expect(page.locator('#flTop')).toBeVisible();
  await expect(page.locator('#flCurves')).toBeVisible();
  await expect(page.locator('[data-flow-geometry="schematic"]')).toBeVisible();
  await expect(page.locator('#flStatus')).toContainText('REFERENCE');

  await selectMode(page,'trips');
  await expect(page.locator('.flow-active-summary')).toContainText('MOVING ENTITY');
  await expect(page.locator('#flTripTime')).toBeVisible();
  await expect(page.locator('#flTrail')).toBeVisible();
  await expect(page.locator('#flTripPlay')).toBeVisible();
  await expect(page.locator('#flStatus')).toContainText('REFERENCE');

  await selectMode(page,'release');
  await expect(page.locator('.flow-active-summary')).toContainText('PARTICLE ENSEMBLE');
  await expect(page.locator('#flReleaseCount')).toBeVisible();
  await expect(page.locator('#flReleaseLife')).toBeVisible();
  await expect(page.locator('#flSeedGlobal')).toBeVisible();
  await expect(page.locator('#flClearRelease')).toBeVisible();
  await expect(page.locator('.flow-active-summary')).toContainText('IF FIELD FROZE');
});

test('V3 baseline: deep links preserve unrelated Earth/Orbit state on mode changes',async({page})=>{
  await openFlow(page,'&sat=100045&earthLayer=terra-true&earthDate=2026-11-12&earthOffset=7');
  for(const mode of ['od','trips','release','field']) await selectMode(page,mode);
  expect(query(page,'sat')).toBe('100045');
  expect(query(page,'earthLayer')).toBe('terra-true');
  expect(query(page,'earthDate')).toBe('2026-11-12');
  expect(query(page,'earthOffset')).toBe('7');

  await page.locator('[data-flow-jump="source"]').click();
  await expect(page.locator('#instrumentDialog')).toHaveAttribute('data-workspace-mode','inspect');
  await expect(page.locator('[data-flow-section="source"]')).toBeVisible();
  await expect(page.locator('[data-flow-section="source"]')).toContainText('Plate Carrée');
});

test('V3 baseline: zoom, FIT, PAUSE and RESET are reachable without a console error',async({page})=>{
  const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await openFlow(page);
  await page.locator('.flow-zoom [data-z="in"]').click();
  await expect(page.locator('#flZoom')).not.toHaveText('100%');
  await page.locator('.flow-zoom [data-z="fit"]').click();
  await expect(page.locator('#flZoom')).toHaveText('100%');
  const initial=(await page.locator('#flPause').textContent())?.trim();
  await page.locator('#flPause').click();
  await expect(page.locator('#flPause')).toHaveText(initial==='PAUSE'?'PLAY':'PAUSE');
  await page.locator('#flReset').click();
  await expect(page.locator('#flZoom')).toHaveText('100%');
  expect(errors).toEqual([]);
});

test('V3 baseline: record geography occupied by controls, save responsive screenshot',async({page},testInfo)=>{
  await openFlow(page);
  await page.evaluate(()=>document.fonts?.ready);
  const measured=await page.evaluate(()=>{
    const rect=selector=>{
      const el=document.querySelector(selector);
      if(!el)throw new Error('Missing '+selector);
      const box=el.getBoundingClientRect();
      return {x:box.x,y:box.y,right:box.right,bottom:box.bottom,width:box.width,height:box.height};
    };
    const area=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x))*
                      Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
    const map=rect('#flMap');
    const parts=['.flow-hud','.flow-tabs','.flow-grammar-strip','.flow-legend','.flow-projection-readout','.flow-zoom'];
    const overlays=Object.fromEntries(parts.map(selector=>{
      const box=rect(selector);
      return [selector,{...box,areaOnMap:area(map,box)}];
    }));
    const sumArea=Object.values(overlays).reduce((sum,item)=>sum+item.areaOnMap,0);
    return {
      viewport:{width:innerWidth,height:innerHeight},
      map,
      overlays,
      sumOverlayAreaFractionNotUnion:sumArea/(map.width*map.height),
      note:'Unmerged overlap estimate; evidence only, not a Stage-1 pass/fail target.'
    };
  });
  expect(measured.map.width).toBeGreaterThan(200);
  expect(measured.map.height).toBeGreaterThan(250);
  await testInfo.attach('flow-v3-stage1-layout.json',{
    body:Buffer.from(JSON.stringify(measured,null,2)),contentType:'application/json'
  });
  await testInfo.attach('flow-v3-stage1-screenshot.png',{
    body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
  });
});

test('V3 baseline: source failure must expose the procedural fallback and its limitation',async({page})=>{
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({status:503,body:'offline'}));
  await page.route('https://raw.githubusercontent.com/cambecc/earth/**',route=>route.fulfill({status:503,body:'offline'}));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(schematicWorld)
  }));
  await page.goto('/lab.html?instrument=flow#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:20_000});
  await expect(page.locator('#flStatus')).toHaveText('FALLBACK');
  await expect(page.locator('#flHudSource')).toContainText('Procedural vector field fallback');
  await expect(page.locator('#flInspect')).toContainText('not meteorological data');
});
