import { webkit } from 'playwright';

const LIVE='https://geogeeklab.github.io/lab.html';
const cases=[
  ['cold-runtime-1',false],
  ['cold-runtime-2',false],
  ['cold-visual-ready-1',true],
  ['cold-visual-ready-2',true]
];
let failed=0;

for (const [label,waitVisual] of cases) {
  const browser=await webkit.launch({headless:true});
  try {
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    const navs=[];
    const errors=[];
    const failures=[];
    page.on('framenavigated',frame=>{ if(frame===page.mainFrame()) navs.push(frame.url()); });
    page.on('pageerror',e=>errors.push(String(e?.stack||e).slice(0,1000)));
    page.on('requestfailed',r=>failures.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));
    await page.addInitScript(() => {
      window.__PLAY_EVENT_LOG__=[];
      const push=(type,event)=>{
        const el=event.target?.closest?.('[data-instrument]');
        window.__PLAY_EVENT_LOG__.push({
          type,
          target:event.target?.id||event.target?.className?.baseVal||event.target?.className||event.target?.tagName||null,
          kind:el?.dataset?.instrument||null,
          t:performance.now()
        });
      };
      window.addEventListener('pointerdown',e=>push('pointerdown',e),true);
      window.addEventListener('click',e=>push('click',e),true);
    });

    await page.goto(`${LIVE}?release=20261007p&coldProbe=${Date.now()}-${label}`,{
      waitUntil:'domcontentloaded',timeout:30000
    });
    await page.waitForFunction(()=>Boolean(window.GeoModules?.__geoSpatialPlayRuntime),null,{timeout:12000});
    if (waitVisual) {
      await page.waitForFunction(()=>window.__GEOGEEK_VISUAL_READY__===true,null,{timeout:12000});
    }

    const before=await page.evaluate(()=>({
      readyState:document.readyState,
      visualReady:window.__GEOGEEK_VISUAL_READY__===true,
      boot:document.documentElement.dataset.geogeekBoot||null,
      coverOpacity:getComputedStyle(document.getElementById('geogeek-boot-cover')).opacity,
      coverPointer:getComputedStyle(document.getElementById('geogeek-boot-cover')).pointerEvents,
      runtime:Boolean(window.GeoModules?.__geoSpatialPlayRuntime),
      href:document.querySelector('[data-instrument="locate"]')?.getAttribute('href')||null
    }));

    const trigger=page.locator('[data-instrument="locate"]').first();
    await trigger.scrollIntoViewIfNeeded();
    const started=Date.now();
    await trigger.click({timeout:12000,noWaitAfter:true});
    let ok=true;
    try {
      await page.waitForFunction(()=>Boolean(
        document.getElementById('instrumentDialog')?.open &&
        window.GeoInstruments?.getActive?.()==='locate' &&
        document.querySelector('.play-shell[data-play-kind="orient"],.play-v2-shell[data-play-kind="orient"]')
      ),null,{timeout:12000});
    } catch { ok=false; failed++; }

    const after=await page.evaluate(()=>({
      readyState:document.readyState,
      visualReady:window.__GEOGEEK_VISUAL_READY__===true,
      boot:document.documentElement.dataset.geogeekBoot||null,
      coverOpacity:getComputedStyle(document.getElementById('geogeek-boot-cover')).opacity,
      coverPointer:getComputedStyle(document.getElementById('geogeek-boot-cover')).pointerEvents,
      url:location.href,
      dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
      active:window.GeoInstruments?.getActive?.()||null,
      shell:Boolean(document.querySelector('.play-shell[data-play-kind="orient"],.play-v2-shell[data-play-kind="orient"]')),
      eventLog:window.__PLAY_EVENT_LOG__||[]
    }));

    console.log('COLD_RESULT',JSON.stringify({
      label,waitVisual,ok,elapsedMs:Date.now()-started,before,after,navs,errors,failures
    }));
    await context.close();
  } finally {
    await browser.close();
  }
}
if(failed) process.exit(1);
