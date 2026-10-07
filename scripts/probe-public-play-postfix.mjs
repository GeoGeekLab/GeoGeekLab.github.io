import { chromium, firefox, webkit } from 'playwright';

const LIVE='https://geogeeklab.github.io/lab.html';
const plays=[
  ['locate','orient'],
  ['zone','bound'],
  ['path','connect'],
  ['project','project'],
  ['light','light'],
  ['swath','swath']
];

let failed=false;
for (const [engineName,engine] of Object.entries({chromium,firefox,webkit})) {
  const browser=await engine.launch({headless:true});
  try {
    for (const [kind,domKind] of plays) {
      const context=await browser.newContext({
        viewport: engineName==='webkit'?{width:390,height:844}:{width:1440,height:1000}
      });
      const page=await context.newPage();
      const pageErrors=[];
      const requestFailures=[];
      page.on('pageerror',e=>pageErrors.push(String(e?.stack||e).slice(0,800)));
      page.on('requestfailed',r=>requestFailures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));

      await page.goto(`${LIVE}?release=20261007p&probe=${Date.now()}-${engineName}-${kind}`,{
        waitUntil:'domcontentloaded',
        timeout:30000
      });
      await page.waitForFunction(()=>Boolean(window.GeoModules?.__geoSpatialPlayRuntime),null,{timeout:12000});

      const trigger=page.locator(`[data-instrument="${kind}"]`).first();
      await trigger.scrollIntoViewIfNeeded();
      const started=Date.now();
      await trigger.click({timeout:10000,noWaitAfter:true});

      let state;
      try {
        await page.waitForFunction(({kind,domKind})=>{
          const dialog=document.getElementById('instrumentDialog');
          const shell=document.querySelector(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`);
          return Boolean(dialog?.open && window.GeoInstruments?.getActive?.()===kind && shell);
        },{kind,domKind},{timeout:12000});
        state=await page.evaluate(({kind,domKind})=>({
          ok:true,
          url:location.href,
          active:window.GeoInstruments?.getActive?.()||null,
          dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
          shell:Boolean(document.querySelector(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`)),
          entryState:document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState||null,
          entryText:document.querySelector(`[data-instrument="${kind}"]`)?.textContent?.trim()||''
        }),{kind,domKind});
      } catch(e) {
        state=await page.evaluate(({kind,domKind})=>({
          ok:false,
          url:location.href,
          active:window.GeoInstruments?.getActive?.()||null,
          dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
          shell:Boolean(document.querySelector(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`)),
          entryState:document.querySelector(`[data-instrument="${kind}"]`)?.dataset.playEntryState||null,
          entryText:document.querySelector(`[data-instrument="${kind}"]`)?.textContent?.trim()||'',
          stageText:document.getElementById('instrumentStage')?.textContent?.trim().slice(0,200)||''
        }),{kind,domKind});
        failed=true;
      }

      console.log('RESULT',JSON.stringify({
        engine:engineName,
        kind,
        elapsedMs:Date.now()-started,
        state,
        pageErrors,
        requestFailures
      }));
      await context.close();
    }
  } finally {
    await browser.close();
  }
}
if(failed) process.exit(1);
