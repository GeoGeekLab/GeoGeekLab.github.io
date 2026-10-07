import { chromium, firefox, webkit } from 'playwright';

const LIVE='https://geogeeklab.github.io/lab.html';
const engines={chromium,firefox,webkit};
let failed=false;

async function open(page,kind,domKind){
  await page.goto(`${LIVE}?instrument=${kind}&probe=${Date.now()}`,{waitUntil:'domcontentloaded',timeout:30000});
  const shell=page.locator(`.play-shell[data-play-kind="${domKind}"],.play-v2-shell[data-play-kind="${domKind}"]`);
  await shell.waitFor({state:'visible',timeout:20000});
  return shell;
}

for(const [engineName,engine] of Object.entries(engines)){
  const browser=await engine.launch({headless:true});
  try{
    const cases=[
      ['locate','orient',async(page,shell)=>{
        const map=shell.locator('.orient-map');
        const box=await map.boundingBox();
        if(!box)throw new Error('orient map has no box');
        await page.mouse.click(box.x+box.width*.62,box.y+box.height*.48);
        const confidence=shell.locator('.orient-confidence-option').nth(1);
        await confidence.click();
        const commit=shell.getByRole('button',{name:'COMMIT'});
        if(await commit.isDisabled())throw new Error('orient commit stayed disabled');
      }],
      ['zone','bound',async(page,shell)=>{
        const hit=shell.locator('.bound-v2-hit');
        const box=await hit.boundingBox(); if(!box)throw new Error('bound hit has no box');
        const pts=[[.34,.30],[.62,.30],[.70,.54],[.58,.72],[.32,.66],[.26,.44],[.34,.30]];
        await page.mouse.move(box.x+box.width*pts[0][0],box.y+box.height*pts[0][1]); await page.mouse.down();
        for(const [x,y] of pts.slice(1))await page.mouse.move(box.x+box.width*x,box.y+box.height*y,{steps:4});
        await page.mouse.up();
        const commit=shell.getByRole('button',{name:'COMMIT REGION'});
        if(await commit.isDisabled())throw new Error('bound commit stayed disabled');
      }],
      ['path','connect',async(page,shell)=>{
        for(const name of ['Spain','France','Germany','Poland'])await shell.getByRole('button',{name}).click();
        const lock=shell.getByRole('button',{name:'LOCK ROUTE'});
        if(await lock.isDisabled())throw new Error('connect lock stayed disabled');
      }],
      ['project','project',async(page,shell)=>{
        await shell.getByRole('button',{name:'GREENLAND'}).click();
        const scrubber=shell.locator('.project-v2-scrubber');
        const box=await scrubber.boundingBox(); if(!box)throw new Error('project scrubber has no box');
        await page.mouse.click(box.x+box.width-3,box.y+box.height/2);
        const reveal=shell.getByRole('button',{name:'REVEAL AREA'});
        if(await reveal.isDisabled())throw new Error('project reveal stayed disabled');
      }],
      ['light','light',async(page,shell)=>{
        await shell.getByRole('button',{name:'BLACK'}).click();
        await shell.getByRole('button',{name:'COMMIT PREDICTION'}).click();
        await shell.getByRole('button',{name:'REMOVE SCATTERING'}).click();
        const attr=await shell.getAttribute('data-atmospheric-scattering');
        if(attr!=='off')throw new Error(`light scattering attr is ${attr}`);
      }]
    ];

    for(const [kind,domKind,interact] of cases){
      const context=await browser.newContext({viewport:engineName==='webkit'?{width:390,height:844}:{width:1440,height:1000}});
      if(kind==='locate'){
        await context.addInitScript(()=>localStorage.setItem('geogeek.orient.primer.v1',JSON.stringify({version:'orient-primer-1',seen:true})));
      }
      const page=await context.newPage();
      const consoleLines=[];const pageErrors=[];const failedRequests=[];
      page.on('console',m=>{if(['error','warning'].includes(m.type()))consoleLines.push(m.text().slice(0,500));});
      page.on('pageerror',e=>pageErrors.push(String(e?.stack||e).slice(0,800)));
      page.on('requestfailed',r=>failedRequests.push(`${r.method()} ${r.url()} :: ${r.failure()?.errorText||'failed'}`));
      const started=Date.now();
      try{
        const shell=await open(page,kind,domKind);
        const openedMs=Date.now()-started;
        await interact(page,shell);
        console.log('INTERACTION_OK',JSON.stringify({engine:engineName,kind,openedMs,consoleLines,pageErrors,failedRequests}));
      }catch(error){
        failed=true;
        console.log('INTERACTION_FAIL',JSON.stringify({
          engine:engineName,kind,elapsedMs:Date.now()-started,error:String(error?.stack||error).slice(0,1600),
          url:page.url(),consoleLines,pageErrors,failedRequests,
          dialogOpen:await page.locator('#instrumentDialog').evaluate(el=>el.open).catch(()=>false),
          active:await page.evaluate(()=>window.GeoInstruments?.getActive?.()||null).catch(()=>null),
          stageText:await page.locator('#instrumentStage').textContent().catch(()=>null)
        }));
      }
      await context.close();
    }
  }finally{await browser.close();}
}
if(failed)process.exit(1);
