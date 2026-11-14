import {test,expect} from '@playwright/test';
const model=()=>Array.from({length:84},(_,i)=>({
  latitude:-60+Math.floor(i/12)*20,longitude:-180+(i%12)*30,
  current:{wind_speed_10m:10,wind_direction_10m:270,time:'2026-11-13T12:00'}
}));
async function open(page,{fallback=false}={}){
  await page.route('https://api.open-meteo.com/**',r=>r.fulfill({
    status:fallback?503:200,
    contentType:'application/json',body:fallback?'offline':JSON.stringify(model())
  }));
  await page.route('https://raw.githubusercontent.com/cambecc/earth/**',r=>r.fulfill({status:503,body:'offline'}));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',r=>r.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({type:'FeatureCollection',features:[]})
  }));
  await page.goto('/lab.html?instrument=flow&flowMode=field#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
}
async function mode(page,key){
  await page.locator('.flow-tabs [data-mode="'+key+'"]').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',key);
}
test('Stage 4 FIELD shows quantitative m/s scale, UTC model time and polar coverage mask',async({page})=>{
  await open(page);
  await expect(page.locator('.flow-speed-legend')).toBeVisible();
  await expect(page.locator('.flow-speed-legend')).toContainText('WIND SPEED · m/s');
  await expect(page.locator('.flow-speed-ticks')).toContainText('30+');
  await expect(page.locator('.flow-wind-time')).toContainText('VALID 2026-11-13 12:00 UTC');
  await expect(page.locator('#flDataProvenance')).toContainText('MODEL SNAPSHOT');
  await expect(page.locator('#flDataProvenance')).toContainText('LAT COVERAGE');
  await expect(page.locator('#flDataProvenance')).toContainText('uncertainty not quantified');
  await expect(page.locator('#flMap')).toHaveAttribute('data-field-coverage','60°S–60°N');
  await expect(page.locator('#flStreamlines')).toBeVisible();
  await page.locator('#flStreamlines').click();
  await expect(page.locator('#flStreamlines')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-field-style','streamlines');
  await page.locator('#flVectors').click();
  await expect(page.locator('#flVectors')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-field-style','glyphs');
  await page.locator('#flVectors').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-field-style','hidden');
});

test('Stage 4 RELEASE controls integration, disk radius, active seeds and elapsed simulation time',async({page})=>{
  await open(page);
  await mode(page,'release');
  const shell=page.locator('.flow-lab');
  await expect(page.locator('#flReleaseIntegrator')).toHaveValue('rk4');
  await expect(page.locator('#flSeedRadius')).toHaveValue('60');
  await expect(page.locator('#flReleaseElapsed')).toHaveText('0.0 h');
  const pause=page.locator('#flPause');
  if((await pause.textContent())?.trim()==='PAUSE')await pause.click();
  await expect(pause).toHaveText('PLAY');
  await page.locator('#flSeedRadius').fill('100');
  await expect(page.locator('#flSeedRadiusOut')).toHaveText('100 km');
  await page.locator('#flReleaseCount').fill('120');
  await page.locator('#flReleaseIntegrator').selectOption('rk2');
  await expect(shell).toHaveAttribute('data-release-integrator','rk2');
  await page.locator('#flReleaseIntegrator').selectOption('rk4');
  await expect(shell).toHaveAttribute('data-release-integrator','rk4');
  const map=page.locator('#flMap');
  const r=await map.boundingBox();
  if(!r)throw Error('Map not present');
  await map.click({position:{x:r.width/2,y:r.height/2}});
  await expect(page.locator('#flSampleReadout')).toContainText('Released 120/120');
  await expect(page.locator('#flSampleReadout')).toContainText('spread is not uncertainty');
  await expect(page.locator('#flActiveCount')).toHaveText('120');
  await expect(shell).toHaveAttribute('data-seed-radius-km','100');
  await expect(page.locator('#flReleaseElapsed')).toHaveText('0.0 h');
  await pause.click();
  await expect.poll(async()=>Number(await shell.getAttribute('data-release-elapsed-hours'))).toBeGreaterThan(0);
  await page.locator('#flClearRelease').click();
  await expect(page.locator('#flActiveCount')).toHaveText('0');
  await expect(page.locator('#flReleaseElapsed')).toHaveText('0.0 h');
});

test('Stage 4 fallback identifies synthetic field rather than model or forecast',async({page})=>{
  await open(page,{fallback:true});
  await expect(page.locator('#flStatus')).toHaveText('FALLBACK');
  await expect(page.locator('.flow-wind-time')).toContainText('SYNTHETIC FIELD');
  await expect(page.locator('#flDataProvenance')).toContainText('NO WEATHER VALID TIME');
  await expect(page.locator('#flDataProvenance')).toContainText('Not meteorological data');
  await mode(page,'release');
  await expect(page.locator('#flDataProvenance')).toContainText('SYNTHETIC FIELD');
  await expect(page.locator('#flDynamic')).toContainText('Spread ≠ uncertainty');
});

test('Stage 4 controls remain outside the map and preserve other query parameters',async({page})=>{
  await open(page);
  const overlap=await page.evaluate(()=>{
    const map=document.querySelector('#flMap').getBoundingClientRect();
    const regions=['.flow-speed-legend','#flDataProvenance','#flDynamic','.flow-workbar','.flow-map-footer'];
    return regions.map(sel=>{
      const r=document.querySelector(sel).getBoundingClientRect();
      return {sel,area:Math.max(0,Math.min(map.right,r.right)-Math.max(map.left,r.left))*
        Math.max(0,Math.min(map.bottom,r.bottom)-Math.max(map.top,r.top))};
    });
  });
  for(const item of overlap)expect(item.area,item.sel).toBeLessThan(2);
  await mode(page,'release');
  await page.locator('#flReleaseIntegrator').selectOption('euler');
  await mode(page,'od');
  await mode(page,'release');
  await expect(page.locator('#flReleaseIntegrator')).toHaveValue('euler');
});
