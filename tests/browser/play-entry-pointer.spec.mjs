import { test, expect } from '@playwright/test';

const CASES = [
  ['locate', 'orient'],
  ['zone', 'bound'],
  ['path', 'connect'],
  ['project', 'project'],
  ['light', 'light'],
  ['swath', 'swath']
];

async function primeOrient(page) {
  await page.addInitScript(() => {
    localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({ version:'orient-primer-1', seen:true }));
  });
}

async function openDirect(page, instrument, kind) {
  if (instrument === 'locate') await primeOrient(page);
  await page.goto(`/lab.html?instrument=${instrument}`, { waitUntil:'domcontentloaded' });
  const shell = page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`);
  await expect(shell).toBeVisible({ timeout:20_000 });
  return shell;
}

for (const [instrument, kind] of CASES) {
  test(`Lab card exposes a native fallback for ${kind}`, async ({ page }) => {
    if (instrument === 'locate') await primeOrient(page);
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    const trigger = page.locator(`[data-instrument="${instrument}"]`).first();
    await expect(trigger).toBeVisible({ timeout:10_000 });
    await expect(trigger).toHaveAttribute('href', new RegExp(`instrument=${instrument}`));
  });

  test(`Lab card opens ${kind} through the real entry button`, async ({ page }) => {
    if (instrument === 'locate') await primeOrient(page);
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    const trigger = page.locator(`[data-instrument="${instrument}"]`).first();
    await expect(trigger).toBeVisible({ timeout:10_000 });
    await trigger.click();
    await expect(page.locator('#instrumentDialog')).toHaveAttribute('open', '', { timeout:20_000 });
    await expect(page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`)).toBeVisible({ timeout:20_000 });
  });

  test(`Lab card body opens ${kind} without requiring the OPEN button`, async ({ page }) => {
    if (instrument === 'locate') await primeOrient(page);
    await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
    const trigger = page.locator(`[data-instrument="${instrument}"]`).first();
    await expect(trigger).toBeVisible({ timeout:10_000 });
    const card = trigger.locator('xpath=ancestor::*[contains(concat(" ", normalize-space(@class), " "), " project-card ")]').first();
    const visual = card.locator('.project-visual');
    await expect(visual).toBeVisible();
    await visual.click();
    await expect(page.locator('#instrumentDialog')).toHaveAttribute('open', '', { timeout:20_000 });
    await expect(page.locator(`.play-shell[data-play-kind="${kind}"], .play-v2-shell[data-play-kind="${kind}"]`)).toBeVisible({ timeout:20_000 });
  });
}

test('BOUND accepts an actual pointer-drawn region', async ({ page }) => {
  const shell = await openDirect(page, 'zone', 'bound');
  const hit = shell.locator('.bound-v2-hit');
  const box = await hit.boundingBox();
  expect(box).toBeTruthy();
  const pts = [
    [0.34,0.30],[0.62,0.30],[0.70,0.54],[0.58,0.72],[0.32,0.66],[0.26,0.44],[0.34,0.30]
  ];
  await page.mouse.move(box.x + box.width*pts[0][0], box.y + box.height*pts[0][1]);
  await page.mouse.down();
  for (const [x,y] of pts.slice(1)) {
    await page.mouse.move(box.x + box.width*x, box.y + box.height*y, { steps:4 });
  }
  await page.mouse.up();
  await expect(shell).toHaveAttribute('data-play-state', 'ready');
  await expect(shell.getByRole('button', { name:'COMMIT REGION' })).toBeEnabled();
});

test('CONNECT accepts real pointer clicks on route nodes', async ({ page }) => {
  const shell = await openDirect(page, 'path', 'connect');
  for (const name of ['Spain', 'France', 'Germany', 'Poland']) {
    await shell.getByRole('button', { name }).click();
  }
  await expect(shell).toHaveAttribute('data-play-state', 'routeReady');
  await expect(shell.getByRole('button', { name:'LOCK ROUTE' })).toBeEnabled();
});

test('PROJECT range responds to a real pointer click near its end', async ({ page }) => {
  const shell = await openDirect(page, 'project', 'project');
  await shell.getByRole('button', { name:'GREENLAND' }).click();
  const scrubber = shell.locator('.project-v2-scrubber');
  await expect(scrubber).toBeVisible();
  const box = await scrubber.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width - 3, box.y + box.height/2);
  await expect(shell.getByRole('button', { name:'REVEAL AREA' })).toBeEnabled();
});

test('ORIENT accepts a real pointer judgment before confidence', async ({ page }) => {
  const shell = await openDirect(page, 'locate', 'orient');
  const map = shell.locator('.orient-map');
  const box = await map.boundingBox();
  expect(box).toBeTruthy();
  await page.mouse.click(box.x + box.width*0.62, box.y + box.height*0.48);
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeDisabled();
  const confidence = shell.locator('.orient-confidence-option').nth(1);
  await confidence.click();
  await expect(shell.getByRole('button', { name:'COMMIT' })).toBeEnabled();
});


test('Lab navigation uses a release-versioned document URL', async ({ page }) => {
  await page.goto('/index.html', { waitUntil:'domcontentloaded' });
  await expect(page.getByRole('link', { name:'Lab' }).first()).toHaveAttribute('href', '/lab.html?release=20261008v6p2');

  await page.goto('/lab.html?release=20261008v6p2', { waitUntil:'domcontentloaded' });
  await expect(page.locator('meta[name="geogeek-lab-release"]')).toHaveAttribute('content', '20261008v6p2');
});

test('latest Play click wins while shared runtime is still loading', async ({ page }) => {
  await page.route('**/games.js', async route => {
    await new Promise(resolve => setTimeout(resolve, 900));
    await route.continue();
  });

  await page.goto('/lab.html?release=20261008v6p2', { waitUntil:'domcontentloaded' });
  const locate = page.locator('[data-instrument="locate"]').first();
  const zone = page.locator('[data-instrument="zone"]').first();
  await expect(locate).toBeVisible();
  await expect(zone).toBeVisible();

  await locate.click();
  await zone.click();

  await expect(page.locator('.play-shell[data-play-kind="bound"], .play-v2-shell[data-play-kind="bound"]')).toBeVisible({ timeout:20_000 });
  await expect.poll(() => page.evaluate(() => window.GeoInstruments?.getActive?.() || null)).toBe('zone');
  await expect(page.locator('.play-shell[data-play-kind="orient"], .play-v2-shell[data-play-kind="orient"]')).toHaveCount(0);
});


test('duplicate click while a Play is opening does not cancel the pending open', async ({ page }) => {
  await page.goto('/lab.html?release=20261008v6p2', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.GeoModules?.__geoSpatialPlayRuntime));
  await page.evaluate(() => {
    const load = window.GeoModules.loadScript.bind(window.GeoModules);
    window.__duplicateClickBlocked = false;
    window.GeoModules.loadScript = src => {
      if (src.startsWith('play/orient/orient-geometry.js') && !window.__duplicateClickBlocked) {
        window.__duplicateClickBlocked = true;
        return new Promise(resolve => {
          window.__releaseDuplicateClick = () => resolve(load(src));
        });
      }
      return load(src);
    };
  });

  const locate = page.locator('[data-instrument="locate"]').first();
  await expect(locate).toBeVisible();
  await locate.click();
  await expect.poll(() => page.evaluate(() => window.__duplicateClickBlocked)).toBe(true);
  await locate.click();
  await expect(locate).toContainText('OPENING');
  await page.evaluate(() => window.__releaseDuplicateClick());

  await expect(page.locator('.play-shell[data-play-kind="orient"], .play-v2-shell[data-play-kind="orient"]')).toBeVisible({ timeout:20_000 });
  await expect.poll(() => page.evaluate(() => window.GeoInstruments?.getActive?.() || null)).toBe('locate');
});

test('PLAY reports a failed module and allows a clean second click', async ({ page }) => {
  await page.route('**/play/light/light.js?*', route => route.abort());
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  const trigger = page.locator('[data-instrument="light"]').first();
  await trigger.click();
  await expect(trigger).toContainText('RETRY PLAY', { timeout:20_000 });
  await expect(page).toHaveURL(/lab[.]html/);
  await page.unroute('**/play/light/light.js?*');
  await trigger.click();
  await expect(page.locator('.play-v2-shell[data-play-kind="light"]')).toBeVisible({ timeout:20_000 });
});

test('CONNECT exposes a retry action after a failed world dataset request', async ({ page }) => {
  const atlas = '**/world-atlas@2.0.2/countries-110m.json';
  await page.route(atlas, route => route.abort());
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  await page.locator('[data-instrument="path"]').first().click();
  const retry = page.locator('#instrumentStage [data-play-retry="path"]');
  await expect(retry).toBeVisible({ timeout:20_000 });
  await page.unroute(atlas);
  await retry.click();
  await expect(page.locator('.play-v2-shell[data-play-kind="connect"]')).toBeVisible({ timeout:20_000 });
});

test('PLAY direct-link startup preserves a decision without a second mount', async ({ page }) => {
  await page.goto('/lab.html?instrument=zone', { waitUntil:'domcontentloaded' });
  const shell = page.locator('.play-v2-shell[data-play-kind="bound"]');
  await expect(shell).toBeVisible({ timeout:20_000 });
  await shell.getByRole('button', { name:'GUIDED REGION' }).click();
  await expect(shell).toHaveAttribute('data-play-state','ready');
  await page.waitForTimeout(900);
  await expect(shell).toHaveAttribute('data-play-state','ready');
});

test('PROJECT direct link preserves its interactive state without a second mount', async ({ page }) => {
  await page.goto('/lab.html?instrument=project', { waitUntil:'domcontentloaded' });
  const shell = page.locator('.play-v2-shell[data-play-kind="project"]');
  await expect(shell).toBeVisible({ timeout:20_000 });
  await shell.getByRole('button',{name:'GREENLAND'}).click();
  await expect(shell).toHaveAttribute('data-play-state','transforming');
  await page.waitForTimeout(1200);
  await expect(shell).toHaveAttribute('data-play-state','transforming');
  await expect(page.locator('.play-v2-shell[data-play-kind="project"]')).toHaveCount(1);
});


test('PLAY retry after a stalled startup ignores the late first result', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.GeoModules?.__geoSpatialPlayRuntime));
  await page.evaluate(() => {
    const originalLoad = window.GeoModules.loadScript.bind(window.GeoModules);
    const originalTimeout = window.setTimeout.bind(window);
    window.setTimeout = (callback, delay, ...args) => {
      if (delay === 15000) {
        window.__expirePlayOpening = () => callback(...args);
        return originalTimeout(() => {}, 30000);
      }
      return originalTimeout(callback, delay, ...args);
    };
    window.__delayedLight = false;
    window.GeoModules.loadScript = src => {
      if (src.startsWith('play/light/light.js') && !window.__delayedLight) {
        window.__delayedLight = true;
        return new Promise(resolve => {
          window.__releaseDelayedLight = () => resolve(originalLoad(src));
        });
      }
      return originalLoad(src);
    };
  });

  const trigger = page.locator('[data-instrument="light"]').first();
  await trigger.click();
  await expect.poll(() => page.evaluate(() => window.__delayedLight)).toBe(true);
  await page.evaluate(() => window.__expirePlayOpening());
  await expect(trigger).toContainText('RETRY PLAY');

  await trigger.click();
  const shell = page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({ timeout:20_000 });
  await page.evaluate(() => window.__releaseDelayedLight());
  await page.waitForTimeout(250);
  await expect(shell).toHaveCount(1);
  await expect(trigger).not.toContainText('RETRY PLAY');
  await expect.poll(() => page.evaluate(() => window.GeoInstruments?.getActive?.())).toBe('light');
});


test('PLAY rapid A-B-A clicks honor the final request after both older loads finish', async ({ page }) => {
  await page.goto('/lab.html', { waitUntil:'domcontentloaded' });
  await page.waitForFunction(() => Boolean(window.GeoModules?.__geoSpatialPlayRuntime));
  await page.evaluate(() => {
    const originalLoad = window.GeoModules.loadScript.bind(window.GeoModules);
    const barriers = {};
    window.__playBarriers = barriers;
    window.GeoModules.loadScript = src => {
      const key = src.includes('play/orient/orient-geometry.js') ? 'orient' :
        src.includes('play/bound/bound.js') ? 'bound' : null;
      if (!key) return originalLoad(src);
      if (!barriers[key]) {
        let release;
        const promise = new Promise(resolve => {
          release = () => resolve(originalLoad(src));
        });
        barriers[key] = { promise, release };
      }
      return barriers[key].promise;
    };
  });

  const locate = page.locator('[data-instrument="locate"]').first();
  const bound = page.locator('[data-instrument="zone"]').first();
  await locate.click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__playBarriers.orient))).toBe(true);
  await bound.click();
  await expect.poll(() => page.evaluate(() => Boolean(window.__playBarriers.bound))).toBe(true);
  await locate.click();
  await page.evaluate(() => Object.values(window.__playBarriers).forEach(entry => entry.release()));

  const orient = page.locator('.play-shell[data-play-kind="orient"], .play-v2-shell[data-play-kind="orient"]');
  await expect(orient).toBeVisible({ timeout:20_000 });
  await expect(page.locator('.play-v2-shell[data-play-kind="bound"]')).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => window.GeoInstruments?.getActive?.())).toBe('locate');
  await expect(locate).not.toContainText('OPENING');
});


test('LIGHT exposes choice controls at the 1843 by 832 Chrome viewport', async ({ page }) => {
  await page.setViewportSize({ width:1843, height:832 });
  await page.goto('/lab.html?instrument=light', { waitUntil:'domcontentloaded' });
  const shell = page.locator('.play-v2-shell[data-play-kind="light"]');
  await expect(shell).toBeVisible({timeout:20_000});
  const black = shell.getByRole('button',{name:'BLACK'});
  await expect(black).toBeVisible();
  const dimensions = await page.evaluate(() => {
    const rect=selector=>document.querySelector(selector)?.getBoundingClientRect();
    const stage=rect('#instrumentStage');
    const shell=rect('.play-v2-shell[data-play-kind="light"]');
    const button=[...document.querySelectorAll('.light-panel button')].find(b=>b.textContent.trim()==='BLACK');
    const choice=button?.getBoundingClientRect();
    const hit=choice&&document.elementFromPoint(choice.x+choice.width/2,choice.y+choice.height/2);
    return {
      stageBottom:stage?.bottom,
      shellBottom:shell?.bottom,
      choiceBottom:choice?.bottom,
      hitIsButton:!!hit&&!!button&&(hit===button||button.contains(hit)),
      modeHidden:document.querySelector('.instrument-workspace-modes')?.hidden,
      modeDisplay:getComputedStyle(document.querySelector('.instrument-workspace-modes')).display
    };
  });
  expect(dimensions.shellBottom).toBeLessThanOrEqual(dimensions.stageBottom+2);
  expect(dimensions.choiceBottom).toBeLessThan(dimensions.stageBottom);
  expect(dimensions.hitIsButton).toBe(true);
  expect(dimensions.modeHidden).toBe(true);
  expect(dimensions.modeDisplay).toBe('none');
  await black.click({timeout:6000});
  await expect(black).toHaveAttribute('aria-pressed','true');
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await expect(shell).toHaveAttribute('data-play-state','committed');
});

test('SWATH choices remain visible on a 1280 by 720 Chrome viewport', async ({ page }) => {
  await page.setViewportSize({ width:1280, height:720 });
  await page.goto('/lab.html?instrument=swath', { waitUntil:'domcontentloaded' });
  const shell=page.locator('.play-v2-shell[data-play-kind="swath"]');
  await expect(shell).toBeVisible({timeout:20_000});
  const option=shell.getByRole('button',{name:'MORE GROUND · COARSER PIXELS'});
  const geometry=await option.evaluate(el=>{
    const control=el.getBoundingClientRect();
    const stage=document.getElementById('instrumentStage').getBoundingClientRect();
    const at=document.elementFromPoint(control.left+control.width/2,control.top+control.height/2);
    return {controlBottom:control.bottom,stageBottom:stage.bottom,hit:at===el||el.contains(at)};
  });
  expect(geometry.controlBottom).toBeLessThan(geometry.stageBottom);
  expect(geometry.hit).toBe(true);
  await option.click({timeout:6000});
  await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
  await expect(shell).toHaveAttribute('data-play-state','committed');
});
