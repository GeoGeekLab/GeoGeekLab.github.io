import {test,expect} from '@playwright/test';

const windGrid=()=>Array.from({length:84},(_,i)=>({
  latitude:-60+Math.floor(i/12)*20,
  longitude:-180+(i%12)*30,
  current:{wind_speed_10m:10,wind_direction_10m:270,time:'2026-11-13T12:00'}
}));
const geo={
  type:'FeatureCollection',
  features:[{type:'Feature',properties:{name:'Sample land'},
    geometry:{type:'Polygon',coordinates:[[[-155,65],[-60,50],[-80,-40],[-135,-20],[-155,65]]]} }]
};
async function open(page,query=''){
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(windGrid())
  }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(geo)
  }));
  await page.goto('/lab.html?instrument=flow&flowMode=field'+query+'#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
  await expect(page.locator('.flow-workbar')).toBeVisible();
  await page.evaluate(async()=>{if(document.fonts?.ready)await document.fonts.ready;});
}
async function inspectGeometry(page){
  return page.evaluate(()=>{
    const rect=sel=>{
      const node=document.querySelector(sel);
      if(!node)throw Error('Missing '+sel);
      const r=node.getBoundingClientRect();
      return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
    };
    const overlap=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left))*
                         Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top));
    const map=rect('#flMap'),controls=[
      '.flow-hud','.flow-tabs','.flow-grammar-strip','.flow-legend',
      '.flow-projection-readout','.flow-zoom'
    ];
    const regions=controls.map(selector=>({selector,...rect(selector),overlap:overlap(map,rect(selector))}));
    const worldWidth=Number(document.querySelector('#flMap').dataset.worldWidth);
    const worldHeight=Number(document.querySelector('#flMap').dataset.worldHeight);
    return {
      map,regions,worldWidth,worldHeight,
      overlayFraction:regions.reduce((sum,r)=>sum+r.overlap,0)/(map.width*map.height),
      documentOverflow:Math.max(0,document.documentElement.scrollWidth-innerWidth)
    };
  });
}

test('V3 map-first controls occupy no permanent geographic content across three viewports',async({page},testInfo)=>{
  test.setTimeout(80000);
  const viewports=[
    {name:'desktop',width:1440,height:900},
    {name:'tablet',width:900,height:980},
    {name:'mobile',width:390,height:844}
  ];
  for(const viewport of viewports){
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    await open(page);
    const m=await inspectGeometry(page);
    expect(m.map.width,viewport.name).toBeGreaterThan(210);
    expect(m.map.height,viewport.name).toBeGreaterThan(150);
    expect(m.worldWidth/m.worldHeight,viewport.name).toBeCloseTo(2,7);
    expect(m.overlayFraction,viewport.name).toBeLessThanOrEqual(.08);
    for(const c of m.regions)expect(c.overlap,`map/control overlap ${viewport.name}: ${c.selector}`).toBeLessThan(2);
    expect(m.documentOverflow,`horizontal document overflow on ${viewport.name}`).toBeLessThanOrEqual(2);
    await testInfo.attach('flow-v3-'+viewport.name+'-geometry.json',{
      body:Buffer.from(JSON.stringify(m,null,2)),contentType:'application/json'
    });
    await testInfo.attach('flow-v3-'+viewport.name+'-work.png',{
      body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
    });
  }
});

test('V3 WORK, FOCUS and INSPECT retain map controls and reveal context only as requested',async({page})=>{
  await open(page);
  const dialog=page.locator('#instrumentDialog');
  const main=page.locator('.flow-main');
  const rail=page.locator('.flow-rail');
  await expect(main).toBeVisible();
  await expect(rail).toBeVisible();
  await expect(page.locator('[data-flow-section="source"]')).toBeHidden();
  await page.locator('.instrument-workspace-modes [data-workspace-mode="focus"]').click();
  await expect(dialog).toHaveAttribute('data-workspace-mode','focus');
  await expect(main).toBeVisible();
  await expect(rail).toBeHidden();
  await expect(page.locator('.flow-workbar .flow-tabs [data-mode="release"]')).toBeVisible();
  await expect(page.locator('.flow-map-footer .flow-zoom [data-z="fit"]')).toBeVisible();
  await page.locator('.flow-tabs [data-mode="od"]').click();
  const focusPlace=page.locator('.flow-workbar [data-flow-place]');
  await expect(focusPlace).toBeVisible();
  await focusPlace.selectOption('nyc');
  await expect(page.locator('#flInspect')).toContainText('New York');
  await page.locator('.flow-tabs [data-mode="trips"]').click();
  const focusTrip=page.locator('.flow-workbar [data-flow-trip-select]');
  await expect(focusTrip).toBeVisible();
  await focusTrip.selectOption('0');
  await expect.poll(()=>new URL(page.url()).searchParams.get('flowTrip')).toBe('0');
  await page.locator('.instrument-workspace-modes [data-workspace-mode="inspect"]').click();
  await expect(rail).toBeVisible();
  await expect(page.locator('[data-flow-section="source"]')).toBeVisible();
  await expect(page.locator('[data-flow-section="source"]')).toContainText('Plate Carrée');
  await page.locator('.instrument-workspace-modes [data-workspace-mode="work"]').click();
  await expect(page.locator('[data-flow-section="source"]')).toBeHidden();
});

test('V3 keyboard geography navigation, accessible OD/TRIPS selection and URL cleanup',async({page})=>{
  await open(page,'&sat=100045&earthLayer=terra-true&flowNode=invalid');
  const map=page.locator('#flMap');
  await map.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#flSampleLive')).toContainText('Sampled');
  await expect(page.locator('.flow-map-footer #flSampleReadout')).toBeVisible();
  const leftBefore=Number(await map.getAttribute('data-projection-left'));
  await page.keyboard.press('ArrowRight');
  await expect.poll(async()=>Number(await map.getAttribute('data-projection-left'))).toBeGreaterThan(leftBefore);
  await page.keyboard.press('Home');
  await expect(page.locator('#flZoom')).toHaveText('100%');
  await page.keyboard.press('+');
  await expect(page.locator('#flZoom')).not.toHaveText('100%');
  await page.keyboard.press('Home');
  await page.locator('.flow-tabs [data-mode="od"]').click();
  const place=page.locator('[data-flow-place]');
  await expect(place).toBeVisible();
  await place.selectOption('nyc');
  await expect.poll(()=>new URL(page.url()).searchParams.get('flowNode')).toBe('nyc');
  await expect(page.locator('#flInspect')).toContainText('New York');
  await map.focus();
  await page.keyboard.press('Escape');
  await expect.poll(()=>new URL(page.url()).searchParams.has('flowNode')).toBe(false);
  await page.locator('.flow-tabs [data-mode="trips"]').click();
  await page.locator('[data-flow-trip-select]').selectOption('0');
  await expect.poll(()=>new URL(page.url()).searchParams.get('flowTrip')).toBe('0');
  await page.locator('.flow-tabs [data-mode="field"]').click();
  await expect.poll(()=>new URL(page.url()).searchParams.has('flowTrip')).toBe(false);
  expect(new URL(page.url()).searchParams.get('sat')).toBe('100045');
  expect(new URL(page.url()).searchParams.get('earthLayer')).toBe('terra-true');
});

test('V3 mobile touch samples a persistent model value and controls are 44px targets',async({page},testInfo)=>{
  test.skip(testInfo.project.name!=='mobile-chromium','Touch-specific check');
  await page.setViewportSize({width:390,height:844});
  await open(page);
  const map=page.locator('#flMap');
  await map.scrollIntoViewIfNeeded();
  const r=await map.boundingBox();
  if(!r)throw Error('No map rectangle');
  await map.tap({position:{x:r.width/2,y:r.height/2}});
  await expect(page.locator('#flSampleLive')).toContainText('10.0 metres per second');
  await expect(page.locator('.flow-map-footer #flSampleReadout')).toBeVisible();
  await expect(page.locator('#flSampleReadout')).toContainText('10.0 metres per second');
  await expect(page.locator('#flInspect')).toContainText('10.0 m/s');
  await expect(page.locator('.instrument-head h2')).toHaveCSS('white-space','normal');
  const minTargets=await page.evaluate(()=>{
    const selectors=['.flow-workbar .flow-tabs button','.flow-workbar .flow-hud button',
      '.flow-map-footer .flow-zoom button','.flow-rail-nav button',
      '.instrument-dialog[data-instrument-kind="flow"] .instrument-workspace-modes button'];
    return selectors.flatMap(sel=>[...document.querySelectorAll(sel)].map(el=>({
      label:el.textContent.trim(),height:el.getBoundingClientRect().height
    })));
  });
  for(const el of minTargets)expect(el.height,`Small target: ${el.label}`).toBeGreaterThanOrEqual(43.5);
});
