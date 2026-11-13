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

test('Orbit exposes advanced controls and forwards wheel zoom across the field', async ({ page }) => {
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

  const hud = page.locator('.orbit-hud');
  await hud.hover();
  await page.mouse.wheel(0, -320);
  await expect.poll(() => page.evaluate(() => window.__orbitWheelCount)).toBeGreaterThan(0);

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

test('Orbit exposes clock-consistent step controls and true camera tracking', async ({ page }) => {
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
  const box=await page.locator('.orbit-canvas').boundingBox();
  if(!box)throw new Error('Missing orbital canvas');
  const x=box.x+box.width*.3,y=box.y+box.height*.5;
  await page.mouse.move(x,y);
  await page.mouse.down();
  await page.mouse.move(x+80,y+20,{steps:5});
  await page.mouse.up();
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
