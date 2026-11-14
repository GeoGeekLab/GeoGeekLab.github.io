import {test,expect} from '@playwright/test';

function wind(){
  return Array.from({length:84},(_,i)=>({
    latitude:-60+Math.floor(i/12)*20,longitude:-180+(i%12)*30,
    current:{wind_speed_10m:9,wind_direction_10m:270,time:'2026-11-13T12:00'}
  }));
}
async function open(page,extra=''){
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(wind())
  }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[]})
  }));
  await page.goto('/lab.html?instrument=flow&flowMode=field'+extra+'#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
}
async function mode(page,key){
  await page.locator('.flow-tabs [data-mode="'+key+'"]').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',key);
}
async function setRange(locator,value){
  await locator.evaluate((input,v)=>{
    input.value=String(v);input.dispatchEvent(new Event('input',{bubbles:true}));
  },value);
}
test('Stage 5 OD keeps directed all-edge totals while top-N filters and exposes reciprocal pairs',async({page})=>{
  await open(page,'&sat=100045&earthLayer=terra-true');
  await mode(page,'od');
  await expect(page.locator('#flMovementAnalysis')).toBeVisible();
  await page.locator('[data-flow-place]').selectOption('nyc');
  await expect(page.locator('[data-od-out]')).toHaveText('138');
  await expect(page.locator('[data-od-in]')).toHaveText('340');
  await expect(page.locator('[data-od-net]')).toHaveText('-202');
  await expect(page.locator('[data-od-forward]')).toHaveText('94 units');
  await expect(page.locator('[data-od-reverse]')).toHaveText('88 units');
  await expect(page.locator('[data-od-pair-net]')).toHaveText('+6 normalized units');
  const first=page.locator('#flSvg [data-direction="nyc-to-lon"]');
  await expect(first).toHaveAttribute('marker-end','url(#flOdArrow)');
  await setRange(page.locator('#flTop'),4);
  await expect(page.locator('#flMovementAnalysis')).toContainText('4/24 highest-weight edges displayed');
  await expect(page.locator('[data-od-out]')).toHaveText('138');
  await expect(page.locator('[data-od-in]')).toHaveText('340');
  await page.locator('[data-flow-peer]').selectOption('par');
  await expect(page.locator('[data-od-forward]')).toHaveText('0 units');
  await expect(page.locator('[data-od-reverse]')).toHaveText('63 units');
  await expect(page.locator('[data-od-pair-net]')).toHaveText('-63 normalized units');
  await expect.poll(()=>new URL(page.url()).searchParams.get('flowPeer')).toBe('par');
  const url=new URL(page.url());
  expect(url.searchParams.get('sat')).toBe('100045');
  expect(url.searchParams.get('earthLayer')).toBe('terra-true');
  await page.locator('[data-flow-geometry="geodesic"]').click();
  await expect(page.locator('.flow-geo-overlay [data-flow-od]')).not.toHaveCount(0);
  await expect(page.locator('.flow-geo-overlay [data-flow-od]').first()).toHaveAttribute('marker-end','url(#flOdArrow)');
  await mode(page,'trips');
  await expect.poll(()=>new URL(page.url()).searchParams.has('flowNode')).toBe(false);
  expect(new URL(page.url()).searchParams.has('flowPeer')).toBe(false);
});

test('Stage 5 TRIPS marks authored samples separately from interpolated great-circle positions',async({page})=>{
  await open(page);
  await mode(page,'trips');
  const pause=page.locator('#flPause');
  if((await pause.textContent())?.trim()==='PAUSE')await pause.click();
  await expect(pause).toHaveText('PLAY');
  await page.locator('[data-flow-trip-select]').selectOption('0');
  const analysis=page.locator('#flMovementAnalysis');
  await expect(analysis).toBeVisible();
  await expect(page.locator('[data-trip-samples]')).toHaveText('5');
  await expect(page.locator('[data-trip-duration]')).toHaveText('72 units');
  await expect(page.locator('[data-trip-distance]')).toContainText('km');
  await expect(page.locator('[data-trip-spacing]')).toHaveText('18');
  await expect(analysis).toContainText('not UTC');
  await expect(analysis).toContainText('not measured distance traveled');
  await expect(page.locator('.flow-segment-list>div')).toHaveCount(4);
  await expect(page.locator('.flow-geo-overlay [data-flow-sample-trip="0"]')).toHaveCount(5);
  await expect(page.locator('.flow-trip-sample-legend')).toContainText('authored teaching sample');
  await setRange(page.locator('#flTripTime'),36);
  await expect(page.locator('[data-trip-position-kind]')).toHaveText('AUTHORED SAMPLE');
  await expect(page.locator('.flow-geo-overlay [data-flow-trip-head="0"]')).toHaveAttribute('data-flow-position-kind','sampled');
  await setRange(page.locator('#flTripTime'),40);
  await expect(page.locator('[data-trip-position-kind]')).toHaveText('INTERPOLATED DISPLAY POSITION');
  await expect(page.locator('.flow-geo-overlay [data-flow-trip-head="0"]')).toHaveAttribute('data-flow-position-kind','interpolated');
  await expect(page.locator('#flInspect')).toContainText('INTERPOLATED DISPLAY POSITION');
});

test('Stage 5 one native TRIPS timeline persists through WORK FOCUS INSPECT and global PAUSE',async({page})=>{
  await open(page);
  await mode(page,'trips');
  const timeline=page.locator('.flow-timeline'),range=page.locator('#flTripTime'),pause=page.locator('#flPause');
  const play=page.locator('#flTripPlay');
  if((await pause.textContent())?.trim()==='PAUSE')await pause.click();
  await expect(pause).toHaveText('PLAY');
  await setRange(range,30);
  await page.locator('.instrument-workspace-modes [data-workspace-mode="focus"]').click();
  await expect(page.locator('.instrument-workspace-modes [data-workspace-mode="focus"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.flow-workbar .flow-timeline')).toHaveCount(1);
  await expect(page.locator('.flow-timeline')).toHaveCount(1);
  await expect(range).toHaveValue('30');
  await page.waitForTimeout(250);
  await expect(range).toHaveValue('30');
  if((await play.textContent())?.trim()==='▶')await play.click();
  await expect(play).toHaveText('Ⅱ');
  await pause.click();
  await expect(pause).toHaveText('PAUSE');
  await expect.poll(async()=>Number(await range.inputValue()),{timeout:5000}).not.toBe(30);
  await pause.click();
  await expect(pause).toHaveText('PLAY');
  const frozen=await range.inputValue();
  await page.waitForTimeout(280);
  await expect(range).toHaveValue(frozen);
  await page.locator('.instrument-workspace-modes [data-workspace-mode="inspect"]').click();
  await expect(page.locator('#flDynamic .flow-timeline')).toHaveCount(1);
  await expect(page.locator('.flow-timeline')).toHaveCount(1);
  await expect(range).toHaveValue(frozen);
  await expect(page.locator('[data-flow-section="source"]')).toBeVisible();
  await page.locator('.instrument-workspace-modes [data-workspace-mode="work"]').click();
  await expect(page.locator('#flDynamic .flow-timeline')).toHaveCount(1);
  await expect(page.locator('.flow-timeline')).toHaveCount(1);
});

test('Stage 5 numeric panels stay outside geographic content at desktop tablet and mobile sizes',async({page},testInfo)=>{
  test.setTimeout(80000);
  for(const size of [
    {name:'desktop',width:1440,height:900},
    {name:'tablet',width:900,height:980},
    {name:'mobile',width:390,height:844}
  ]){
    await page.setViewportSize({width:size.width,height:size.height});
    await open(page);
    for(const target of ['od','trips']){
      await mode(page,target);
      const metric=await page.evaluate(()=>{
        const m=document.querySelector('#flMap').getBoundingClientRect();
        const a=document.querySelector('#flMovementAnalysis').getBoundingClientRect();
        const overlap=Math.max(0,Math.min(m.right,a.right)-Math.max(m.left,a.left))*
          Math.max(0,Math.min(m.bottom,a.bottom)-Math.max(m.top,a.top));
        return {overlap,mapWidth:m.width,mapHeight:m.height};
      });
      expect(metric.overlap,size.name+' '+target+' should not block map').toBeLessThan(2);
      expect(metric.mapHeight,size.name).toBeGreaterThan(250);
      await testInfo.attach('flow-v3-stage5-'+size.name+'-'+target+'.png',{
        body:await page.screenshot({animations:'disabled'}),contentType:'image/png'
      });
    }
  }
});
