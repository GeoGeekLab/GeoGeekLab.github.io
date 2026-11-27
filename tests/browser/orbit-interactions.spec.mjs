import { test, expect } from '@playwright/test';

const ORBIT_FIXTURE = [{
  OBJECT_NAME: 'ORBIT INTERACTION FIXTURE',
  OBJECT_ID: '1998-067A',
  EPOCH: '2026-10-01T22:19:34.116960',
  MEAN_MOTION: 15.00555103,
  ECCENTRICITY: 0.000583,
  INCLINATION: 98.3164,
  RA_OF_ASC_NODE: 103.8411,
  ARG_OF_PERICENTER: 20.5667,
  MEAN_ANOMALY: 339.5789,
  EPHEMERIS_TYPE: 0,
  CLASSIFICATION_TYPE: 'U',
  NORAD_CAT_ID: 25544,
  ELEMENT_SET_NO: 999,
  REV_AT_EPOCH: 8655,
  BSTAR: 0.00048021,
  MEAN_MOTION_DOT: 0.00005995,
  MEAN_MOTION_DDOT: 0,
}];

async function stubOrbitSnapshot(page) {
  const fetchedAt = new Date().toISOString();
  await page.route('**/orbital/data/active.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(ORBIT_FIXTURE),
  }));
  await page.route('**/orbital/data/active.meta.json', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      schemaVersion: 1,
      dataset: 'celestrak-active-gp',
      format: 'CCSDS OMM JSON',
      source: 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
      delivery: 'GeoGeek same-origin snapshot',
      fetchedAt,
      recordCount: ORBIT_FIXTURE.length,
      sha256: 'fixture',
      epochs: { oldest:ORBIT_FIXTURE[0].EPOCH, median:ORBIT_FIXTURE[0].EPOCH, newest:ORBIT_FIXTURE[0].EPOCH },
      refreshPolicy: { minimumHours:2, officialRequestsPerRun:1, retryOnHttpError:false, lastKnownGoodOnFailure:true },
    }),
  }));
}

test.beforeEach(async ({ page }) => {
  await stubOrbitSnapshot(page);
});

test('Orbit exposes advanced controls and forwards available zoom gestures', async ({ page }, testInfo) => {
  // Mobile emulation performs the same WebGL boot, accordion expansion, wheel
  // forwarding and time-step checks under a smaller, touch-enabled viewport.
  // Full-suite trace evidence shows the assertions complete successfully but
  // can cross Playwright's 30 s default while the final click is settling.
  test.setTimeout(45_000);
  const upstreamRequests = [];
  page.on('request', request => {
    if (/celestrak\.org\/NORAD\/elements\/gp\.php/i.test(request.url())) upstreamRequests.push(request.url());
  });

  await page.goto('/lab.html?instrument=orbit#l04', { waitUntil: 'domcontentloaded' });

  const orbit = page.locator('.orbit-v2');
  await expect(orbit).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.orbit-extras > summary')).toBeVisible();
  await expect(page.locator('.orbit-panel > .orbit-enhancement-card')).toHaveCount(0);
  await page.locator('.orbit-extras > summary').click();
  await expect(page.locator('.orbit-station-editor')).toBeVisible();
  await page.locator('.orbit-view-more > summary').click();
  await expect(page.locator('.orbit-view-more > .orbit-enhancement-card.orbit-view-advanced')).toBeVisible();

  const status = page.locator('.instrument-status');
  await expect(status).toContainText(/SNAPSHOT/i);
  await expect(status).not.toContainText(/DEMO|LIVE CATALOG/i);
  await expect(orbit).toHaveAttribute('data-catalog-delivery', 'snapshot');
  await expect(page.locator('[data-orbit-delivery="snapshot"]')).toContainText(/same-origin snapshot/i);
  expect(upstreamRequests).toHaveLength(0);

  await page.evaluate(() => {
    window.__orbitWheelCount = 0;
    document.querySelector('.orbit-canvas')?.addEventListener('wheel', () => {
      window.__orbitWheelCount += 1;
    });
  });

  if (testInfo.project.name === 'desktop-chromium') {
    // A real wheel is meaningful on desktop, not on an emulated touchscreen.
    const hud = page.locator('.orbit-hud');
    await hud.hover();
    await page.mouse.wheel(0, -320);
    await expect.poll(() => page.evaluate(() => window.__orbitWheelCount)).toBeGreaterThan(0);
  }
  const before = await page.evaluate(() => window.__orbitWheelCount);
  await page.locator('[data-orbit-zoom="in"]').click();
  await expect.poll(() => page.evaluate(() => window.__orbitWheelCount)).toBeGreaterThan(before);

  const range = page.locator('#orbitTimeRange');
  const start = Number(await range.inputValue());
  await page.locator('[data-orbit-step="1"]').click();
  await expect.poll(async () => Number(await range.inputValue())).toBeGreaterThan(start);
});

test('Orbit deep links a selected catalog object using the same-origin snapshot', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.orbit-v2')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-enhancement-tools')).toBeVisible();
  await expect(page.locator('.instrument-status')).toContainText(/SNAPSHOT/i);
  await expect(page.locator('.instrument-status')).not.toContainText(/DEMO/i);
  await expect(page.locator('#orbitNorad')).toContainText('25544', { timeout: 10000 });
  await expect(page.locator('.orbit-ground-relation-legend')).toContainText('GEOMETRIC HORIZON');
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('[data-selection-name]')).toContainText('ORBIT INTERACTION FIXTURE');
});

test('Orbit round-two rail keeps object tasks primary and provenance progressive', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit#l04', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.orbit-v2')).toBeVisible({ timeout: 30000 });
  await expect(page.locator('.orbit-extras > summary')).toBeVisible();
  await expect(page.locator('.instrument-workspace-modes')).toBeHidden();
  await expect(page.locator('.instrument-dialog')).not.toHaveAttribute('data-workspace-mode', /.+/);
  await expect(page.locator('.orbit-provenance')).toBeHidden();

  const search = page.locator('#orbitSearch');
  await search.fill('25544');
  await expect(page.locator('[data-search-index]')).toHaveCount(1);
  await search.press('ArrowDown');
  await expect(page.locator('[data-search-index]')).toHaveClass(/is-key-active/);
  await search.press('Enter');

  await expect(page.locator('#orbitNorad')).toContainText('25544');
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('[data-selection-details]')).toBeVisible();

  await page.locator('.orbit-extras > summary').click();
  await expect(page.locator('.orbit-provenance')).toBeVisible();

  await page.locator('[data-selection-clear]').click();
  await expect(page.locator('.orbit-selection-bar')).toBeHidden();
});


test('Orbit clears deep-link state when the selected object is cleared', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil:'domcontentloaded' });
  await expect(page.locator('#orbitNorad')).toContainText('25544', {timeout:30000});
  await page.locator('[data-selection-clear]').click();
  await expect(page.locator('#orbitSelectedName')).toHaveText('NONE');
  await expect.poll(() => new URL(page.url()).searchParams.has('sat')).toBe(false);
  await page.reload({waitUntil:'domcontentloaded'});
  await expect(page.locator('#orbitSelectedName')).toHaveText('NONE', {timeout:30000});
});

test('Orbit exposes clock-consistent step controls and true camera tracking', async ({ page }, testInfo) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil:'domcontentloaded' });
  await expect(page.locator('#orbitNorad')).toContainText('25544', {timeout:30000});
  const orbit=page.locator('.orbit-v2');
  const before=Number(await orbit.getAttribute('data-simulation-time-ms'));
  await page.locator('.orbit-view-more > summary').click();
  await page.locator('[data-orbit-step="1"]').click();
  await expect.poll(async()=>Number(await orbit.getAttribute('data-simulation-time-ms'))-before).toBeGreaterThan(3500000);
  const after=Number(await orbit.getAttribute('data-simulation-time-ms'));
  expect(after-before).toBeLessThan(3700000);
  await page.locator('#orbitTrack').click();
  await expect(page.locator('#orbitTrack')).toHaveAttribute('aria-pressed','true');
  // The inspector is below the 3D stage on mobile; bring the canvas back
  // into the visual viewport before sending the touch gesture.
  await page.locator('#orbitStageV2').scrollIntoViewIfNeeded();
  const box=await page.locator('.orbit-canvas').boundingBox();
  if(!box)throw new Error('Missing orbital canvas');
  const x=box.x+box.width*.3,y=box.y+box.height*.5;
  if (testInfo.project.name === 'mobile-chromium') {
    // Test a real single-finger drag, not a synthetic mouse on a touch device.
    const cdp=await page.context().newCDPSession(page);
    const pt=(dx,dy)=>({x:Math.round(x+dx),y:Math.round(y+dy),id:1});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[pt(0,0)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(40,10)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[pt(100,24)]});
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  } else {
    await page.mouse.move(x,y);
    await page.mouse.down();
    await page.mouse.move(x+80,y+20,{steps:5});
    await page.mouse.up();
  }
  await expect(page.locator('#orbitTrack')).toHaveAttribute('aria-pressed','false');
});

test('Orbit sorts and paginates matching catalog objects', async ({ page }) => {
  const items=Array.from({length:24},(_,i)=>({
    ...ORBIT_FIXTURE[0],
    OBJECT_NAME:'ORBIT REGRESSION '+String(24-i).padStart(2,'0'),
    NORAD_CAT_ID:26000+i,
    OBJECT_ID:'2026-'+String(i+1).padStart(3,'0')+'A',
  }));
  await page.route('**/orbital/data/active.json',route=>route.fulfill({
    status:200, contentType:'application/json', body:JSON.stringify(items),
  }));
  await page.route('**/orbital/data/active.meta.json',route=>route.fulfill({
    status:200,contentType:'application/json',
    body:JSON.stringify({
      schemaVersion:2,supplyId:'orbit-active',dataset:'celestrak-active-gp',
      format:'CCSDS OMM JSON',source:'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON',
      fetchedAt:new Date().toISOString(),recordCount:items.length,sha256:'fixture',
      epochs:{oldest:items[0].EPOCH,median:items[0].EPOCH,newest:items[0].EPOCH},
      refreshPolicy:{minimumMs:7200000,staleAfterMs:28800000,lastKnownGoodOnFailure:true},
    }),
  }));
  await page.goto('/lab.html?instrument=orbit#l04',{waitUntil:'domcontentloaded'});
  const search=page.locator('#orbitSearch');
  await expect(search).toBeVisible({timeout:30000});
  await search.fill('ORBIT REGRESSION');
  await expect(page.locator('[data-search-index]')).toHaveCount(10);
  await expect(page.locator('.orbit-search-summary')).toContainText('24 MATCHES');
  await page.locator('[data-search-page="next"]').click();
  await expect(page.locator('.orbit-search-pager')).toContainText('PAGE 2 / 3');
  await page.locator('[data-orbit-sort]').selectOption('norad');
  await expect(page.locator('.orbit-search-pager')).toContainText('PAGE 1 / 3');
  await expect(page.locator('[data-search-index]').first()).toContainText('26000');
});


test('Orbit Escape closes help, clears selection, then exits the workspace', async ({ page }) => {
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#orbitNorad')).toContainText('25544',{timeout:30000});
  const stage=page.locator('#orbitStageV2');
  await page.locator('[data-orbit-help]').click();
  await stage.focus();
  await page.keyboard.press('Escape');
  await expect(page.locator('.orbit-enhancement-help')).toBeHidden();
  await expect(page.locator('#orbitSelectedName')).not.toHaveText('NONE');
  await page.keyboard.press('Escape');
  await expect(page.locator('#orbitSelectedName')).toHaveText('NONE');
  await page.keyboard.press('Escape');
  await expect(page.locator('#instrumentDialog')).not.toBeVisible();
});


test('Orbit visual workbench keeps HUD, selection, zoom and time dock separate', async ({page}, testInfo) => {
  test.setTimeout(50_000);
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04', { waitUntil:'domcontentloaded' });
  await expect(page.locator('#orbitNorad')).toContainText('25544', {timeout:30000});
  await expect(page.locator('.orbit-selection-bar')).toBeVisible();
  await expect(page.locator('.orbit-time-dock')).toBeVisible();
  await expect(page.locator('[data-orbit-fit]')).toBeVisible();
  await page.evaluate(async () => { if (document.fonts?.ready) await document.fonts.ready; });
  const result=await page.evaluate(() => {
    const get=selector=>{
      const element=document.querySelector(selector);
      if(!element)throw new Error('Missing '+selector);
      const rect=element.getBoundingClientRect();
      return {x:rect.x,y:rect.y,right:rect.right,bottom:rect.bottom,width:rect.width,height:rect.height};
    };
    const collide=(a,b)=>Math.max(0,Math.min(a.right,b.right)-Math.max(a.x,b.x)) *
                          Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.y,b.y));
    const stage=get('#orbitStageV2');
    const hud=get('.orbit-hud');
    const selection=get('.orbit-selection-bar');
    const zoom=get('.orbit-enhancement-tools');
    const timeline=get('.orbit-time-dock');
    const labelVisible=document.querySelector('.orbit-object-label')?.classList.contains('is-visible');
    const label=labelVisible?get('.orbit-object-label'):null;
    const inside=element=>element.x>=stage.x-2&&element.right<=stage.right+2&&
                           element.y>=stage.y-2&&element.bottom<=stage.bottom+2;
    return {
      stage, hud, selection, zoom, timeline, labelVisible,
      inside:{hud:inside(hud),selection:inside(selection),zoom:inside(zoom),timeline:inside(timeline)},
      collisions:{
        headerSelection:collide(hud,selection),
        selectionZoom:collide(selection,zoom),
        selectionTimeline:collide(selection,timeline),
        zoomTimeline:collide(zoom,timeline),
        labelHud:label?collide(label,hud):0,
        labelSelection:label?collide(label,selection):0,
        labelZoom:label?collide(label,zoom):0,
        labelTimeline:label?collide(label,timeline):0,
      },
      overflow:document.documentElement.scrollWidth-innerWidth,
      timeText:document.querySelector('#orbitTimeUtc')?.textContent||'',
    };
  });
  expect(result.inside).toEqual({hud:true,selection:true,zoom:true,timeline:true});
  for(const [pair,area] of Object.entries(result.collisions)) {
    expect(area, `overlap: ${pair} (${JSON.stringify(result)})`).toBeLessThan(3);
  }
  expect(result.overflow).toBeLessThanOrEqual(2);
  expect(result.timeText).toMatch(/^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d UTC$/);
  await testInfo.attach('orbit-workspace-visual', {
    body: await page.screenshot({animations:'disabled'}),
    contentType:'image/png',
  });
});


test('Orbit validates observer ellipsoid height and applies it to the slant range', async ({page}) => {
  test.setTimeout(50_000);
  await page.goto('/lab.html?instrument=orbit&sat=25544#l04',{waitUntil:'domcontentloaded'});
  await expect(page.locator('#orbitNorad')).toContainText('25544',{timeout:30000});
  await page.locator('#orbitPlay').click();
  await expect(page.locator('#orbitPosition')).toContainText(/[NS].*[EW]/,{timeout:20000});
  const position=await page.locator('#orbitPosition').textContent();
  const match=position?.match(/([\d.]+)°\s*([NS]).*?([\d.]+)°\s*([EW])/);
  expect(match,'propagated satellite position should contain geodetic coordinates').toBeTruthy();
  const lat=Number(match[1])*(match[2]==='S'?-1:1);
  const lon=Number(match[3])*(match[4]==='W'?-1:1);
  await page.locator('.orbit-extras > summary').click();
  await page.locator('[data-station-lat]').fill(String(lat));
  await page.locator('[data-station-lon]').fill(String(lon));
  await page.locator('[data-station-height]').fill('-501');
  await page.locator('[data-station-set]').click();
  await expect(page.locator('.orbit-station-editor')).toHaveClass(/has-error/);
  await expect(page.locator('#orbitHorizonState')).toHaveText('NO STATION');

  await page.locator('[data-station-height]').fill('0');
  await page.locator('[data-station-set]').click();
  await expect(page.locator('#orbitObserverTitle')).toContainText('0 m ELLIPSOID');
  await expect(page.locator('#orbitRange')).toContainText('km');
  const seaLevel=Number.parseFloat((await page.locator('#orbitRange').textContent())||'');
  expect(Number.isFinite(seaLevel)).toBe(true);

  await page.locator('[data-station-height]').fill('9000');
  await page.locator('[data-station-set]').click();
  await expect(page.locator('#orbitObserverTitle')).toContainText('9,000 m ELLIPSOID');
  await expect.poll(async ()=>
    Number.parseFloat((await page.locator('#orbitRange').textContent())||'')
  ).toBeLessThan(seaLevel-4);
});

test('Orbit keeps preset feedback consistent after manual layer changes', async ({page}) => {
  await page.goto('/lab.html?instrument=orbit#l04',{waitUntil:'domcontentloaded'});
  await expect(page.locator('.orbit-v2')).toBeVisible({timeout:30000});
  await page.locator('.orbit-view-more > summary').click();
  const relations=page.locator('[data-orbit-preset="relations"]');
  const trace=page.locator('[data-orbit-preset="trace"]');
  await expect(relations).toHaveAttribute('aria-pressed','true');
  await page.locator('[data-layer="orbit"]').click();
  await expect(relations).toHaveAttribute('aria-pressed','false');
  await expect(trace).toHaveAttribute('aria-pressed','false');
  await trace.click();
  await expect(trace).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-layer="orbit"]')).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('[data-layer="graticule"]')).toHaveAttribute('aria-pressed','false');
});
