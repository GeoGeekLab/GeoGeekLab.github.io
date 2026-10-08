import { chromium, devices } from 'playwright';

const host = 'https://geogeeklab.github.io';
const kinds = [
  ['locate','orient'],['zone','bound'],['path','connect'],
  ['project','project'],['light','light'],['swath','swath']
];
const browser = await chromium.launch({ headless: true, args:['--disable-dev-shm-usage'] });
let failures = 0;
try {
  for (const mode of ['desktop', 'mobile']) {
    const device = mode === 'mobile' ? devices['Pixel 7'] : { viewport:{width:1440,height:900} };
    for (const [kind,dom] of kinds) {
      const context = await browser.newContext({ ...device, reducedMotion:'reduce' });
      const page = await context.newPage();
      const errors = [], failedRequests = [];
      page.on('pageerror', error => errors.push(String(error.message).slice(0,220)));
      page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text().slice(0,220)); });
      page.on('requestfailed', req => {
        if (failedRequests.length < 8) failedRequests.push(req.url().slice(0,180) + ': ' + req.failure()?.errorText);
      });
      const url = host + '/lab.html?release=20261008c#l15';
      let outcome = 'PASS', reason = '';
      const diag = {};
      try {
        await page.goto(url, {waitUntil:'domcontentloaded',timeout:45_000});
        const trigger = page.locator('[data-instrument="' + kind + '"]').first();
        await trigger.waitFor({state:'visible',timeout:20_000});
        diag.before = await page.evaluate(kind => {
          const el = document.querySelector('[data-instrument="' + kind + '"]');
          const rect = el?.getBoundingClientRect();
          const atPoint = rect && document.elementFromPoint(rect.x + rect.width/2, rect.y + rect.height/2);
          return {
            release:document.querySelector('meta[name="geogeek-lab-release"]')?.content,
            runtime:window.GeoModules?.__geoSpatialPlayRuntime || false,
            triggerTag:el?.tagName,
            hitTag:atPoint?.tagName,
            hitClass:String(atPoint?.className || '').slice(0,90),
            boot:document.documentElement.dataset.geogeekBoot,
            isVisible:!!rect && rect.width>0 && rect.height>0
          };
        },kind);
        await trigger.click({timeout:12_000});
        await page.waitForFunction(dom => {
          const stage=document.getElementById('instrumentStage');
          return Boolean(document.getElementById('instrumentDialog')?.open &&
            stage?.querySelector('.play-shell[data-play-kind="'+dom+'"],.play-v2-shell[data-play-kind="'+dom+'"]'));
        },dom,{timeout:20_000});
        await page.waitForTimeout(300);
        diag.after = await page.evaluate(() => ({
          active:window.GeoInstruments?.getActive?.(),
          error:document.querySelector('#instrumentStage .instrument-error')?.textContent?.slice(0,150) || '',
          buttons:[...document.querySelectorAll('#instrumentStage button')].slice(0,5).map(b=>b.textContent?.trim().slice(0,50)),
          dialogOpen:document.getElementById('instrumentDialog')?.open
        }));
        if (diag.after.error) throw new Error('Stage rendered error: '+diag.after.error);
        if (diag.after.active !== kind) throw new Error('Incorrect active kind: '+diag.after.active);
      } catch(error) {
        failures++;
        outcome='FAIL'; reason=String(error.message).slice(0,350);
        diag.after = await page.evaluate(() => ({
          url:location.href,
          runtime:window.GeoModules?.__geoSpatialPlayRuntime,
          active:window.GeoInstruments?.getActive?.(),
          dialogOpen:document.getElementById('instrumentDialog')?.open,
          stage:document.getElementById('instrumentStage')?.textContent?.slice(0,550),
          trigger:document.querySelector('[data-instrument]')?.outerHTML?.slice(0,240)
        })).catch(()=>({}));
      }
      console.log(JSON.stringify({mode,kind,outcome,reason,diag,errors:errors.slice(-4),failedRequests}));
      await context.close();
    }
  }
} finally {
  await browser.close();
}
console.log('Live PLAY results: '+(12-failures)+' passed, '+failures+' failed');
if(failures) process.exitCode=1;
