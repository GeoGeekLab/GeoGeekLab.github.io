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
    for (const [kind, domKind] of plays) {
      const context = await browser.newContext({
        viewport: engineName === 'webkit' ? { width:390, height:844 } : { width:1440, height:1000 }
      });
      const page = await context.newPage();
      const consoleLines = [];
      const pageErrors = [];
      const failedRequests = [];
      page.on('console', msg => {
        if (msg.type()==='error' || msg.type()==='warning') {
          const value=msg.text();
          consoleLines.push(value.length > 500 ? value.slice(0,500)+'…' : value);
        }
      });
      page.on('pageerror', error => pageErrors.push(String(error?.stack || error).slice(0,800)));
      page.on('requestfailed', request => failedRequests.push(`${request.method()} ${request.url()} :: ${request.failure()?.errorText || 'failed'}`));

      await page.goto(`${LIVE}?probe=${Date.now()}-${engineName}-${kind}`, { waitUntil:'domcontentloaded', timeout:30_000 });
      await page.waitForFunction(() => Boolean(window.GeoModules?.__geoSpatialPlayRuntime), null, {timeout:10_000});
      const trigger=page.locator(`[data-instrument="${kind}"]`).first();
      await trigger.scrollIntoViewIfNeeded();
      const pre=await trigger.evaluate(el=>({tag:el.tagName,href:el.getAttribute('href'),text:el.textContent.trim()}));
      const started=Date.now();
      await trigger.click({ timeout:10_000, noWaitAfter:true });
      await page.waitForTimeout(80);
      const immediate=await page.evaluate((kind)=>({
        dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
        active:window.GeoInstruments?.getActive?.()||null,
        entryState:document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState||null,
        entryText:document.querySelector(`[data-instrument="${kind}"]`)?.textContent?.trim()||'',
        stageLength:document.getElementById('instrumentStage')?.innerHTML?.length||0,
        url:location.href
      }),kind);

      let finalState;
      try {
        await page.waitForFunction(({kind}) => {
          const dialog=document.getElementById('instrumentDialog');
          const stage=document.getElementById('instrumentStage');
          return Boolean(dialog?.open && window.GeoInstruments?.getActive?.()===kind && (stage?.innerHTML?.length||0)>80);
        }, {kind}, {timeout:20_000});
        finalState=await page.evaluate(({kind,domKind})=>({
          ok:true,
          dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
          active:window.GeoInstruments?.getActive?.()||null,
          shell:Boolean(document.querySelector(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`)),
          entryState:document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState||null,
          entryText:document.querySelector(`[data-instrument="${kind}"]`)?.textContent?.trim()||'',
          stageLength:document.getElementById('instrumentStage')?.innerHTML?.length||0,
          stageText:document.getElementById('instrumentStage')?.textContent?.trim().slice(0,160)||'',
          url:location.href
        }),{kind,domKind});
      } catch (error) {
        failed=true;
        finalState=await page.evaluate((kind)=>({
          ok:false,
          dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
          active:window.GeoInstruments?.getActive?.()||null,
          entryState:document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState||null,
          entryText:document.querySelector(`[data-instrument="${kind}"]`)?.textContent?.trim()||'',
          stageLength:document.getElementById('instrumentStage')?.innerHTML?.length||0,
          stageText:document.getElementById('instrumentStage')?.textContent?.trim().slice(0,160)||'',
          url:location.href
        }),kind);
      }

      console.log('RESULT', JSON.stringify({
        engine:engineName,kind,elapsedMs:Date.now()-started,pre,immediate,finalState,
        consoleLines,pageErrors,failedRequests
      }));
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
if (failed) process.exit(1);
