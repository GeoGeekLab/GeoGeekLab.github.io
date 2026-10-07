import { webkit } from 'playwright';

const LIVE='https://geogeeklab.github.io/lab.html';
const cases=[
  ['fresh-1',false],
  ['fresh-2',false],
  ['fresh-3',false],
  ['primed-1',true],
  ['primed-2',true]
];
let failed=0;

const browser=await webkit.launch({headless:true});
try {
  for (const [label,primed] of cases) {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    if (primed) {
      await context.addInitScript(() => {
        localStorage.setItem('geogeek.orient.primer.v1', JSON.stringify({
          version:'orient-primer-1', seen:true, updatedAt:new Date().toISOString()
        }));
      });
    }
    const page=await context.newPage();
    const errors=[];
    const failures=[];
    page.on('pageerror',e=>errors.push(String(e?.stack||e).slice(0,1000)));
    page.on('requestfailed',r=>failures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));

    await page.addInitScript(() => {
      window.__PLAY_EVENT_LOG__=[];
      const push=(type,event)=>{
        const el=event.target?.closest?.('[data-instrument]');
        if (!el) return;
        window.__PLAY_EVENT_LOG__.push({
          type,
          kind:el.dataset.instrument||null,
          tag:el.tagName,
          state:el.dataset.playEntryState||null,
          href:el.getAttribute('href')||null,
          t:performance.now()
        });
      };
      window.addEventListener('pointerdown',e=>push('pointerdown',e),true);
      window.addEventListener('click',e=>push('click',e),true);
    });

    await page.goto(`${LIVE}?release=20261007p&webkitLocateProbe=${Date.now()}-${label}`,{
      waitUntil:'domcontentloaded',timeout:30000
    });
    await page.waitForFunction(()=>Boolean(window.GeoModules?.__geoSpatialPlayRuntime),null,{timeout:12000});
    const trigger=page.locator('[data-instrument="locate"]').first();
    await trigger.scrollIntoViewIfNeeded();

    const before=await page.evaluate(()=>({
      href:document.querySelector('[data-instrument="locate"]')?.getAttribute('href')||null,
      tag:document.querySelector('[data-instrument="locate"]')?.tagName||null,
      state:document.querySelector('[data-instrument="locate"]')?.dataset.playEntryState||null,
      primer:localStorage.getItem('geogeek.orient.primer.v1'),
      runtime:Boolean(window.GeoModules?.__geoSpatialPlayRuntime)
    }));

    const started=Date.now();
    await trigger.click({timeout:10000,noWaitAfter:true});
    let ok=true;
    try {
      await page.waitForFunction(()=>Boolean(
        document.getElementById('instrumentDialog')?.open &&
        window.GeoInstruments?.getActive?.()==='locate' &&
        document.querySelector('.play-shell[data-play-kind="orient"],.play-v2-shell[data-play-kind="orient"]')
      ),null,{timeout:12000});
    } catch {
      ok=false;
      failed++;
    }

    const after=await page.evaluate(()=>({
      url:location.href,
      dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
      active:window.GeoInstruments?.getActive?.()||null,
      shell:Boolean(document.querySelector('.play-shell[data-play-kind="orient"],.play-v2-shell[data-play-kind="orient"]')),
      state:document.querySelector('[data-instrument="locate"]')?.dataset.playEntryState||null,
      text:document.querySelector('[data-instrument="locate"]')?.textContent?.trim()||'',
      primer:localStorage.getItem('geogeek.orient.primer.v1'),
      eventLog:window.__PLAY_EVENT_LOG__||[],
      stageText:document.getElementById('instrumentStage')?.textContent?.trim().slice(0,240)||''
    }));
    console.log('LOCATE_RESULT',JSON.stringify({
      label,primed,ok,elapsedMs:Date.now()-started,before,after,errors,failures
    }));
    await context.close();
  }
} finally {
  await browser.close();
}
if(failed) process.exit(1);
