import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const site=path.join(root,'site');
const output=path.join(root,'.award-submission');
const release='20261011v107watercache1';
const baselineCommit='9718171862959c9232e1dd7b4f69d31c36b0bc75';

fs.rmSync(output,{recursive:true,force:true});
fs.mkdirSync(output,{recursive:true});

const mime={
  '.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp',
  '.ico':'image/x-icon'
};

const server=http.createServer((req,res)=>{
  const url=new URL(req.url||'/',`http://${req.headers.host||'localhost'}`);
  let pathname=decodeURIComponent(url.pathname);
  if(pathname.endsWith('/')) pathname+='index.html';
  const target=path.resolve(site,`.${pathname}`);
  if(!target.startsWith(site+path.sep)&&target!==path.join(site,'index.html')){
    res.writeHead(403).end('Forbidden');
    return;
  }
  if(!fs.existsSync(target)||fs.statSync(target).isDirectory()){
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Cache-Control','no-store');
  res.setHeader('Content-Type',mime[path.extname(target).toLowerCase()]||'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

await new Promise((resolve,reject)=>{
  server.once('error',reject);
  server.listen(4173,'127.0.0.1',resolve);
});

const base='http://127.0.0.1:4173';
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const shots=[];

async function pageFor(viewport){
  const page=await browser.newPage({
    viewport,
    deviceScaleFactor:1,
    reducedMotion:'reduce',
    colorScheme:'dark'
  });
  await page.addInitScript(()=>{
    let seed=73421;
    Math.random=()=>{
      seed=(seed*48271)%2147483647;
      return (seed-1)/2147483646;
    };
  });
  return page;
}

async function waitHost(page,kind){
  await page.waitForFunction(expected=>{
    const dialog=document.getElementById('instrumentDialog');
    return dialog?.open===true&&
      dialog.dataset.instrumentKind===expected&&
      dialog.dataset.labAwardShell==='a4'&&
      dialog.dataset.labAwardPolish==='a5';
  },kind,{timeout:30000});
}

async function waitWater(page){
  await waitHost(page,'water');
  const frame=page.frameLocator('#instrumentStage iframe.water-v102-frame');
  await frame.locator('html[data-water-award-concept="a3"][data-water-award-polish="a5"]')
    .waitFor({state:'attached',timeout:30000});
  await frame.locator('#mainNav [data-tab]').first().waitFor({state:'visible',timeout:30000});
  return frame;
}

async function setWaterProbe(frame,nm){
  await frame.locator('#probeRange').evaluate((node,value)=>{
    node.value=String(value);
    node.dispatchEvent(new Event('input',{bubbles:true}));
  },nm);
  await frame.locator('#probeValue').waitFor({state:'visible'});
  const text=(await frame.locator('#probeValue').textContent())?.trim();
  if(text!==nm+' nm') throw new Error(`Water probe did not settle at ${nm} nm; received "${text||''}"`);
}

async function captureDialog(page,file,meta){
  await page.evaluate(()=>document.activeElement instanceof HTMLElement&&document.activeElement.blur());
  await page.waitForTimeout(180);
  const dialog=page.locator('#instrumentDialog');
  await dialog.screenshot({
    path:path.join(output,file),
    animations:'disabled',
    caret:'hide'
  });
  shots.push({file,...meta});
}

async function openWater(viewport){
  const page=await pageFor(viewport);
  await page.goto(`${base}/lab.html?release=${release}&instrument=water#l13`,{
    waitUntil:'domcontentloaded',timeout:45000
  });
  const frame=await waitWater(page);
  return {page,frame};
}

async function shotWaterSpectrum(viewport,file,label){
  const {page,frame}=await openWater(viewport);
  try{
    await frame.locator('#mainNav [data-tab="iop"]').click();
    const rrs=frame.locator('#plotNav [data-plot="rrs"]');
    if(await rrs.count()) await rrs.click();
    await setWaterProbe(frame,490);
    await frame.locator('.award-spectrum-ruler').waitFor({state:'visible'});
    await frame.locator('.p6-spectrum.award-spectrum-primary').waitFor({state:'visible'});
    await captureDialog(page,file,{
      label,
      instrument:'water',
      workspace:'iop',
      state:{plot:'rrs',wavelengthNm:490},
      viewport
    });
  }finally{await page.close();}
}

async function shotWaterRt(viewport,file,label){
  const {page,frame}=await openWater(viewport);
  try{
    await frame.locator('#mainNav [data-tab="rt"]').click();
    await frame.locator('.rt-science-workspace').waitFor({state:'visible'});
    // Curate both A11 densities: desktop Focus shows the chart; tablet Detail
    // preserves the full geometry and provenance inspection.
    const density=viewport.width>=1280?'focus':'detail';
    await frame.locator('[data-attention-mode="'+density+'"]').click();
    if(density==='detail') await frame.locator('.award-rt-geometry').waitFor({state:'visible'});
    else await frame.locator('.rt-science-plot-grid').waitFor({state:'visible'});
    await captureDialog(page,file,{
      label,
      instrument:'water',
      workspace:'rt',
      state:{view:'depth',reference:'fixed numerical grid',density},
      viewport
    });
  }finally{await page.close();}
}

async function shotWaterAtmosphere(viewport,file,label){
  const {page,frame}=await openWater(viewport);
  try{
    await frame.locator('#mainNav [data-tab="atm"]').click();
    await frame.locator('.award-model-topology').waitFor({state:'visible'});
    await captureDialog(page,file,{
      label,
      instrument:'water',
      workspace:'atm',
      state:{topology:'water → atmosphere / sensor / correction'},
      viewport
    });
  }finally{await page.close();}
}

async function shotPulse(viewport,file,label){
  const page=await pageFor(viewport);
  try{
    await page.goto(`${base}/lab.html?release=${release}&instrument=pulse#l10`,{
      waitUntil:'domcontentloaded',timeout:45000
    });
    await waitHost(page,'pulse');
    await page.waitForFunction(()=>
      !!window.GeoPulseObservationLab&&
      window.GeoGeekInstrumentMounts?.pulse===window.GeoPulseObservationLab.mount,
      null,{timeout:15000}
    );
    await page.waitForSelector('.pulse-observation-lab[data-state="ready"]',{
      state:'visible',timeout:30000
    });
    await captureDialog(page,file,{
      label,
      instrument:'pulse',
      workspace:'observe',
      state:{purpose:'cross-instrument family comparison'},
      viewport
    });
  }finally{await page.close();}
}

try{
  await shotWaterSpectrum({width:1600,height:1000},'01-water-spectrum-desktop.png','Wavelength as the primary optical coordinate');
  await shotWaterRt({width:1600,height:1000},'02-water-rt-desktop.png','Depth, direction and explicit numerical-reference limits');
  await shotWaterAtmosphere({width:1600,height:1000},'03-water-atmosphere-desktop.png','Observation topology from water signal to atmosphere');
  await shotWaterRt({width:1024,height:900},'04-water-rt-tablet.png','Reference chamber at tablet composition');
  await shotWaterSpectrum({width:390,height:844},'05-water-spectrum-mobile.png','Spectral instrument on a compact viewport');
  await shotPulse({width:1600,height:1000},'06-pulse-family-desktop.png','Shared Observatory grammar with a different scientific identity');

  const manifest={
    generatedAt:new Date().toISOString(),
    release,
    baselineCommit,
    branchHead:process.env.GITHUB_SHA||null,
    versions:{
      waterScience:'10.2.0-quiet2',
      waterConcept:'award-a3',
      waterPolish:'award-a5',
      observatoryHost:'award-a4',
      hostPolish:'award-a5',
      review:'A8 submission capture'
    },
    capturePolicy:{
      realControlsOnly:true,
      reducedMotion:true,
      injectedScientificValues:false,
      screenshotsAreEvidenceNotValidation:true
    },
    shots
  };
  fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  console.log(`Award submission review captured: ${shots.length} frames → ${output}`);
}finally{
  await browser.close();
  await new Promise(resolve=>server.close(resolve));
}
