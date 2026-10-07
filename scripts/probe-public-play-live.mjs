import { webkit } from 'playwright';

const LIVE='https://geogeeklab.github.io/lab.html';

async function snapshot(page,label){
  const data=await page.evaluate(()=>({
    url:location.href,
    runtime:Boolean(window.GeoModules?.__geoSpatialPlayRuntime),
    geoInstruments:Boolean(window.GeoInstruments),
    active:window.GeoInstruments?.getActive?.()||null,
    orient:Boolean(window.GeoPlayOrient),
    game:Boolean(window.GeoGame),
    playCore:Boolean(window.GeoPlay?.core),
    dialogOpen:Boolean(document.getElementById('instrumentDialog')?.open),
    entryState:document.querySelector('[data-instrument="locate"]')?.dataset.playEntryState||null,
    stageLength:document.getElementById('instrumentStage')?.innerHTML?.length||0,
    scripts:[...document.scripts].filter(s=>/games\.js|instruments\.js|figure-instrument|play\/|orient\//.test(s.src)).map(s=>({
      src:s.src,
      loaded:s.dataset.loaded||null,
      failed:s.dataset.loadFailed||null,
      readyState:s.readyState||null
    }))
  }));
  console.log(label,JSON.stringify(data));
}

const browser=await webkit.launch({headless:true});
let failed=false;
try{
  for(const mode of ['click','direct']){
    const context=await browser.newContext({viewport:{width:390,height:844}});
    const page=await context.newPage();
    const consoleLines=[]; const pageErrors=[]; const failedRequests=[];
    page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLines.push(m.text().slice(0,500));});
    page.on('pageerror',e=>pageErrors.push(String(e?.stack||e).slice(0,800)));
    page.on('requestfailed',r=>failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));

    const url=mode==='direct'
      ? `${LIVE}?instrument=locate&probe=${Date.now()}`
      : `${LIVE}?probe=${Date.now()}`;
    await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});
    await page.waitForFunction(()=>Boolean(window.GeoModules?.__geoSpatialPlayRuntime),null,{timeout:10000});
    await snapshot(page,`BEFORE_${mode.toUpperCase()}`);

    if(mode==='click'){
      const trigger=page.locator('[data-instrument="locate"]').first();
      await trigger.scrollIntoViewIfNeeded();
      await trigger.click({noWaitAfter:true,timeout:10000});
    }

    for(const delay of [250,1000,3000,7000,15000]){
      await page.waitForTimeout(delay-(delay===250?0:({1000:250,3000:1000,7000:3000,15000:7000}[delay]||0)));
      await snapshot(page,`AT_${delay}MS_${mode.toUpperCase()}`);
    }

    const end=await page.evaluate(()=>({
      ok:Boolean(document.getElementById('instrumentDialog')?.open && window.GeoInstruments?.getActive?.()==='locate' && (document.getElementById('instrumentStage')?.innerHTML?.length||0)>80)
    }));
    console.log('DIAGNOSTICS',mode,JSON.stringify({end,consoleLines,pageErrors,failedRequests}));
    if(!end.ok) failed=true;
    await context.close();
  }
} finally { await browser.close(); }
if(failed)process.exit(1);
