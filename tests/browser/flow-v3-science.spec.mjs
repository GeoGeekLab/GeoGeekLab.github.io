import { test, expect } from '@playwright/test';

function grid(){
  return Array.from({length:84},(_,i)=>({
    latitude:-60+Math.floor(i/12)*20,
    longitude:-180+i%12*30,
    current:{wind_speed_10m:10,wind_direction_10m:270,time:'2026-11-13T12:00'}
  }));
}
async function open(page){
  await page.route('https://api.open-meteo.com/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify(grid())
  }));
  await page.route('https://raw.githubusercontent.com/martynafford/natural-earth-geojson/**',route=>route.fulfill({
    status:200,contentType:'application/json',body:JSON.stringify({type:'FeatureCollection',features:[]})
  }));
  await page.goto('/lab.html?instrument=flow&flowMode=field#l06',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.flow-lab[data-flow-round2="1"]')).toBeVisible({timeout:30000});
  await expect(page.locator('#flHudSource')).toContainText('Open-Meteo');
}
async function selectMode(page,mode){
  await page.locator('.flow-tabs [data-mode="'+mode+'"]').click();
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',mode);
}
async function sendMapPointer(page,{lat,lon}){
  await page.locator('#flMap').evaluate((map,{lat,lon})=>{
    const r=map.getBoundingClientRect();
    const x=r.left+(lon+180)/360*r.width;
    const y=r.top+(90-lat)/180*r.height;
    map.dispatchEvent(new PointerEvent('pointermove',{
      bubbles:true,clientX:x,clientY:y,pointerId:7,pointerType:'mouse'
    }));
  },{lat,lon});
}

test('Flow V3 Stage 2: field displays coverage limits instead of extrapolated polar wind',async({page})=>{
  await open(page);
  await sendMapPointer(page,{lat:0,lon:0});
  await expect(page.locator('#flInspect')).toContainText('10.0 m/s');
  await sendMapPointer(page,{lat:75,lon:0});
  await expect(page.locator('#flInspect')).toContainText('OUTSIDE FIELD DOMAIN');
  await expect(page.locator('#flInspect')).not.toContainText('10.0 m/s');
});

test('Flow V3 Stage 2: shared clock obeys PAUSE across FIELD and RELEASE',async({page})=>{
  await open(page);
  const shell=page.locator('.flow-lab');
  await expect(page.locator('#flSpeedOut')).toContainText('36,000×');
  await expect.poll(async()=>Number(await shell.getAttribute('data-simulated-seconds'))).toBeGreaterThan(0);
  await page.locator('#flPause').click();
  await expect(page.locator('#flPause')).toHaveText('PLAY');
  const held=await shell.getAttribute('data-simulated-seconds');
  await page.waitForTimeout(220);
  expect(await shell.getAttribute('data-simulated-seconds')).toBe(held);
  await selectMode(page,'release');
  await expect(page.locator('#flDynamic')).toContainText('SIM HOURS');
  await expect(page.locator('#flDynamic')).toContainText('36,000×');
  await page.locator('#flSeedGlobal').click();
  await page.waitForTimeout(180);
  expect(await shell.getAttribute('data-simulated-seconds')).toBe(held);
  await page.locator('#flPause').click();
  await expect.poll(async()=>Number(await shell.getAttribute('data-simulated-seconds'))).toBeGreaterThan(Number(held));
});

test('Flow V3 Stage 2: global PAUSE freezes TRIPS and native playback resumes',async({page})=>{
  await open(page);
  await selectMode(page,'trips');
  const playback=page.locator('#flTripPlay');
  const time=page.locator('#flTripTime');
  if((await playback.textContent())?.trim()==='▶')await playback.click();
  await expect(playback).toHaveText('Ⅱ');
  await expect.poll(async()=>Number(await time.inputValue()),{timeout:5000}).not.toBe(30);
  await page.locator('#flPause').click();
  await expect(page.locator('#flPause')).toHaveText('PLAY');
  const paused=await time.inputValue();
  await page.waitForTimeout(350);
  expect(await time.inputValue()).toBe(paused);
  await page.locator('#flPause').click();
  await expect.poll(async()=>Number(await time.inputValue()),{timeout:4000}).not.toBe(Number(paused));
  await playback.click();
  await expect(playback).toHaveText('▶');
  const stopped=await time.inputValue();
  await page.waitForTimeout(250);
  expect(await time.inputValue()).toBe(stopped);
  await page.locator('#flReset').click();
  await expect(time).toHaveValue('30');
  await expect(page.locator('#flTripOut')).toHaveText('30');
});

test('Flow V3 Stage 2: source and time transitions survive close and reopen',async({page})=>{
  await open(page);
  await selectMode(page,'release');
  await expect(page.locator('#flStatus')).toContainText('DATA');
  await page.locator('#instrumentClose').click();
  await expect(page.locator('#instrumentDialog')).not.toHaveAttribute('open','');
  await page.locator('[data-instrument="flow"]').first().click();
  await expect(page.locator('.flow-lab')).toBeVisible({timeout:15000});
  await expect(page.locator('.flow-tabs [data-mode]')).toHaveCount(4);
  await expect(page.locator('.flow-lab')).toHaveAttribute('data-mode',/field|release/);
});
