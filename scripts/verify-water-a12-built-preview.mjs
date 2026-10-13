#!/usr/bin/env node
// PR-only A12 built-dist HTTP/browser gate; no public Pages deployment.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createServer} from 'node:http';
import {createReadStream, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, extname, join, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..'),dist=join(root,'dist');
const out=join(root,'.a12-built-preview'),release='20261013a12';
const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8',
  '.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8',
  '.json':'application/json; charset=utf-8','.svg':'image/svg+xml',
  '.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg',
  '.webp':'image/webp','.ico':'image/x-icon'};
assert.ok(existsSync(join(dist,'lab.html')),'Build dist/ before A12 preview verification');
mkdirSync(out,{recursive:true});
const result={release,head:process.env.GITHUB_SHA||null,scope:'built-dist-preview-not-public-pages',
  httpVerification:false,publicPagesVerified:false,viewportChecks:[]};
const server=createServer((req,res)=>{
  let path;try{path=decodeURIComponent(new URL(req.url||'/','http://'+(req.headers.host||'localhost')).pathname);}
  catch{res.writeHead(400).end('Bad path');return;}
  if(path.endsWith('/'))path+='index.html';
  const file=resolve(dist,'.'+path);
  if(!file.startsWith(dist+sep)){res.writeHead(403).end('Forbidden');return;}
  if(!existsSync(file)){res.writeHead(404).end('Not found');return;}
  res.setHeader('Content-Type',mime[extname(file).toLowerCase()]||'application/octet-stream');
  res.setHeader('Cache-Control','no-store');
  createReadStream(file).on('error',()=>res.destroy()).pipe(res);
});
await new Promise((ok,fail)=>{server.once('error',fail);server.listen(0,'127.0.0.1',ok);});
const base='http://127.0.0.1:'+server.address().port;
let browser;
try{
  // Reuse the post-Pages smoke for canonical and cache-busted A12 assets,
  // correct content types, normal-cache URLs and the original shared URL.
  await new Promise((ok,fail)=>{
    const p=spawn(process.execPath,['scripts/verify-water-quiet-release.mjs','--url',base],
      {cwd:root,stdio:'inherit'});
    p.on('error',fail);
    p.on('exit',code=>code===0?ok():fail(new Error('Built HTTP verification exited '+code)));
  });
  result.httpVerification=true;
  for(const path of ['/lab.html?release=20261011v107watercache1&instrument=water',
    '/core/modules.js?v=20261013a12',
    '/water/workbench-v10-2/instrument.js?v=10.2.0-quiet2-a12',
    '/water/workbench-v10-2/water-attention.css?v=a12',
    '/water/workbench-v10-2/water-attention.js?v=a12']){
    const r=await fetch(base+path,{cache:'no-store'});
    assert.equal(r.status,200,path+': HTTP '+r.status);
    assert.ok((await r.text()).length>100,'Empty built asset: '+path);
  }
  assert.ok(readFileSync(join(dist,'lab.html'),'utf8').includes(
    'meta content="'+release+'" name="geogeek-lab-release"'),'Stale built Lab HTML');
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
    const criticalHttpErrors=[];
    page.on('response',response=>{
      const u=new URL(response.url());
      if(u.origin===base&&response.status()>=400&&/water-attention|\/core\/modules\.js/.test(u.pathname))
        criticalHttpErrors.push(response.status()+' '+u.pathname);
    });
    try{
      await page.goto(base+'/lab.html?release=20261011v107watercache1&instrument=water#l13',
        {waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>{
        const el=document.querySelector('#instrumentDialog');
        return el?.open===true&&el.dataset.instrumentKind==='water';
      },null,{timeout:45000});
      const frame=page.frameLocator('#instrumentStage iframe.water-v102-frame');
      await frame.locator('#mainNav [data-tab="rt"]').waitFor({state:'visible',timeout:45000});
      const nav=await frame.locator('#mainNav [data-tab]').evaluateAll(nodes=>{
        const width=document.documentElement.clientWidth;
        return {width,items:nodes.map(n=>{
          const r=n.getBoundingClientRect(),style=getComputedStyle(n);
          return {name:n.textContent.trim(),left:r.left,right:r.right,
            visible:r.width>0&&r.height>0&&style.visibility!=='hidden',
            fontSize:parseFloat(style.fontSize)};
        })};
      });
      assert.equal(nav.items.length,9,'Expected nine scientific workspaces');
      for(const tab of nav.items){
        assert.ok(tab.visible&&tab.left>=-1&&tab.right<=nav.width+1,'Clipped tab: '+tab.name);
        assert.ok(tab.fontSize>=10,'Tiny tab: '+tab.name);
      }
      await frame.locator('#mainNav [data-tab="rt"]').click();
      await frame.locator('.rt-science-plot-grid').waitFor({state:'visible',timeout:15000});
      await frame.locator('[data-attention-mode="focus"]').click();
      await frame.locator('html[data-water-attention="focus"]').waitFor({state:'attached'});
      const plots=await frame.locator('#plotNav [data-plot]').evaluateAll(nodes=>nodes.map(n=>{
        const r=n.getBoundingClientRect();
        return {name:n.textContent.trim(),top:r.top,fontSize:parseFloat(getComputedStyle(n).fontSize)};
      }));
      assert.equal(plots.length,3,'All three RT plots must be present');
      const singleRow=Math.max(...plots.map(p=>p.top))-Math.min(...plots.map(p=>p.top))<=3;
      if(viewport.width===1280)assert.ok(singleRow,'1280 RT plots wrap to a new row');
      assert.ok(plots.every(p=>p.fontSize>=10),'Tiny RT plot labels');
      await frame.locator('[data-attention-mode="detail"]').click();
      await frame.locator('html[data-water-attention="detail"]').waitFor({state:'attached'});
      await frame.locator('.award-rt-geometry').waitFor({state:'visible'});
      await frame.locator('[data-attention-mode="focus"]').click();
      await frame.locator('html[data-water-attention="focus"]').waitFor({state:'attached'});
      assert.deepEqual(criticalHttpErrors,[],'Critical built Water assets failed');
      const screenshot='a12-dist-rt-'+viewport.width+'x'+viewport.height+'.png';
      await page.locator('#instrumentDialog').screenshot({path:join(out,screenshot),animations:'disabled'});
      result.viewportChecks.push({viewport,navCount:9,plotCount:3,singleRow,
        densityModeReversible:true,screenshot,criticalHttpErrors:[]});
      console.log('A12 built preview '+viewport.width+'x'+viewport.height+': PASS');
    }finally{await page.close();}
  }
  result.status='pass';
  console.log('A12 dist HTTP/cache/browser gate passed; public Pages NOT verified.');
}catch(error){
  result.status='fail';result.error=String(error.stack||error);
  throw error;
}finally{
  writeFileSync(join(out,'result.json'),JSON.stringify(result,null,2)+'\n');
  if(browser)await browser.close();
  await new Promise(ok=>server.close(ok));
}
