import { chromium, firefox, webkit } from 'playwright';

const LIVE = 'https://geogeeklab.github.io/lab.html';
const plays = [
  ['locate','orient'],
  ['zone','bound'],
  ['path','connect'],
  ['project','project'],
  ['light','light']
];

const engines = { chromium, firefox, webkit };
let failed = false;

for (const [engineName, engine] of Object.entries(engines)) {
  const browser = await engine.launch({ headless:true });
  try {
    const context = await browser.newContext({
      viewport: engineName === 'webkit' ? { width:390, height:844 } : { width:1440, height:1000 }
    });
    const page = await context.newPage();
    const consoleLines = [];
    const pageErrors = [];
    const failedRequests = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') consoleLines.push(`${msg.type()}: ${msg.text()}`);
    });
    page.on('pageerror', error => pageErrors.push(String(error?.stack || error)));
    page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

    await page.goto(`${LIVE}?probe=${Date.now()}`, { waitUntil:'domcontentloaded', timeout:30_000 });
    await page.waitForFunction(() => document.readyState !== 'loading', null, { timeout:10_000 });

    const boot = await page.evaluate(() => ({
      href: location.href,
      ready: document.readyState,
      geoModules: Boolean(window.GeoModules),
      runtime: Boolean(window.GeoModules?.__geoSpatialPlayRuntime),
      geoInstruments: Boolean(window.GeoInstruments),
      triggers: [...document.querySelectorAll('.lab-group-play [data-instrument]')].map(el => ({
        kind: el.dataset.instrument,
        tag: el.tagName,
        href: el.getAttribute('href'),
        text: el.textContent.trim(),
        rect: el.getBoundingClientRect().toJSON?.() || {
          x:el.getBoundingClientRect().x,y:el.getBoundingClientRect().y,width:el.getBoundingClientRect().width,height:el.getBoundingClientRect().height
        },
        pointer: getComputedStyle(el).pointerEvents
      }))
    }));
    console.log('BOOT', engineName, JSON.stringify(boot));

    for (const [kind,domKind] of plays) {
      const trigger = page.locator(`[data-instrument="${kind}"]`).first();
      try {
        await trigger.scrollIntoViewIfNeeded();
        await trigger.click({ timeout:10_000 });
        await page.waitForTimeout(250);
        const state = await page.evaluate(({kind,domKind}) => ({
          url: location.href,
          dialogOpen: Boolean(document.getElementById('instrumentDialog')?.open),
          active: window.GeoInstruments?.getActive?.() || null,
          shell: Boolean(document.querySelector(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`)),
          entryState: document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState || null,
          stageText: document.getElementById('instrumentStage')?.textContent?.trim().slice(0,240) || ''
        }), {kind,domKind});
        console.log('CLICK', engineName, kind, JSON.stringify(state));
        if (!state.dialogOpen || !state.shell) {
          failed = true;
          console.error('FAIL_CLICK', engineName, kind, JSON.stringify({state,consoleLines,pageErrors,failedRequests}));
        }
        if (state.dialogOpen) {
          const close = page.locator('#instrumentClose');
          if (await close.count()) {
            await close.click({ timeout:5000 }).catch(()=>{});
            await page.waitForTimeout(100);
          }
        }
      } catch (error) {
        failed = true;
        console.error('EXCEPTION', engineName, kind, String(error?.stack || error), JSON.stringify({consoleLines,pageErrors,failedRequests}));
      }
    }

    console.log('DIAGNOSTICS', engineName, JSON.stringify({consoleLines,pageErrors,failedRequests}));
    await context.close();
  } finally {
    await browser.close();
  }
}

if (failed) process.exit(1);
