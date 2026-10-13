#!/usr/bin/env node
// Optional public A12 staging gate; do not use this result as production Pages proof.
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {readFileSync,existsSync,mkdirSync,writeFileSync} from 'node:fs';
import {dirname,join,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const dist=join(root,'dist');
const output=join(root,'.a12-public-preview');
const input=process.env.A12_PREVIEW_BASE_URL;
assert.ok(input,'A12_PREVIEW_BASE_URL is required for the manual staging gate');
const url=new URL(input);
assert.equal(url.protocol,'https:','The independent staging origin must use HTTPS');
assert.ok(!url.username&&!url.password&&!url.search&&!url.hash,'Provide only a bare HTTPS origin');
assert.equal(url.pathname,'/','Staging must serve the built dist/ at the host root');
assert.ok(url.hostname!=='geogeeklab.github.io','Staging must not overwrite or audit the production Pages origin');
assert.ok(!['localhost','127.0.0.1','::1'].includes(url.hostname),'Staging must be publicly routable');
assert.ok(!url.hostname.endsWith('.localhost'),'Local hosts are not public staging');
assert.ok(existsSync(join(dist,'lab.html')),'The exact CI dist/ artifact must already be built');
mkdirSync(output,{recursive:true});

const base=url.origin;
const report={release:'20261013a12',workflowSha:process.env.GITHUB_SHA||null,
  scope:'public-independent-staging',previewOrigin:base,
  publicPreviewVerified:false,productionPagesVerified:false,exactAssetHashes:[],
  desktopChecks:[]};
// Lab HTML contains build-time generated Lab preview hashes and can differ
// byte-for-byte across legitimate CI builds. The existing release verifier
// checks its deployed release/meta and both cache variants; compare SHA-256
// only for reproducible runtime assets below.
const important=[
  'core/modules.js',
  'water/workbench-v10-2/instrument.js',
  'water/workbench-v10-2/app/index.html',
  'water/workbench-v10-2/water-quiet.css',
  'water/workbench-v10-2/water-quiet.js',
  'water/workbench-v10-2/water-attention.css',
  'water/workbench-v10-2/water-attention.js'
];
function sha256(bytes){return createHash('sha256').update(bytes).digest('hex');}
let browser;
try{
  await new Promise((ok,fail)=>{
    // Already validates MIME, normal cache, cache busters, and old deep-link URLs.
    const child=spawn(process.execPath,['scripts/verify-water-quiet-release.mjs','--url',base],
      {cwd:root,stdio:'inherit'});
    child.on('error',fail);
    child.on('exit',code=>code===0?ok():fail(new Error('Public A12 HTTP verifier exited '+code)));
  });
  report.labHtmlVerifiedByReleaseAndBrowser=true;
  // A release marker alone does not prove the right commit was published:
  // compare response bytes with THIS CI's exact assembled dist/ files.
  for(const path of important){
    const expected=readFileSync(join(dist,path));
    const bust=new URL('/'+path,base);
    bust.searchParams.set('__a12_sha',String(Date.now()));
    const response=await fetch(bust,{headers:{'Cache-Control':'no-cache'},cache:'no-store',
      signal:AbortSignal.timeout(30000)});
    assert.equal(response.status,200,path+': public HTTP '+response.status);
    const received=Buffer.from(await response.arrayBuffer());
    assert.equal(sha256(received),sha256(expected),
      path+': public content differs from the exact A12 CI build; do not promote');
    report.exactAssetHashes.push({path,sha256:sha256(expected)});
  }
  browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
  for(const viewport of [{width:1280,height:720},{width:1600,height:1000}]){
    const page=await browser.newPage({viewport,deviceScaleFactor:1,reducedMotion:'reduce'});
    const failedAssets=[];
    page.on('response',r=>{
      const u=new URL(r.url());
      if(u.origin===base&&r.status()>=400&&
        (/\/(water|core)\//.test(u.pathname)||u.pathname==='/lab.html'))
        failedAssets.push(r.status()+' '+u.pathname);
    });
    try{
      await page.goto(base+'/lab.html?release=20261011v107watercache1&instrument=water#l13',
        {waitUntil:'domcontentloaded',timeout:45000});
      await page.waitForFunction(()=>{
        const dialog=document.getElementById('instrumentDialog');
        return dialog?.open===true&&dialog.dataset.instrumentKind==='water'&&
          document.querySelector('meta[name="geogeek-lab-release"]')?.content==='20261013a12';
      },null,{timeout:45000});
      const frame=page.frameLocator('#instrumentStage iframe.water-v102-frame');
      await frame.locator('#mainNav [data-tab="rt"]').waitFor({state:'visible',timeout:45000});
      const nav=await frame.locator('#mainNav [data-tab]').evaluateAll(nodes=>{
        const width=document.documentElement.clientWidth;
        return {width,tabs:nodes.map(n=>{
          const r=n.getBoundingClientRect();
          return {name:n.textContent.trim(),left:r.left,right:r.right,
            visible:r.width>0&&r.height>0&&getComputedStyle(n).visibility!=='hidden',
            fontSize:parseFloat(getComputedStyle(n).fontSize)};
        })};
      });
      assert.equal(nav.tabs.length,9,'Staging is missing a workspace tab');
      for(const t of nav.tabs){
        assert.ok(t.visible&&t.left>=-1&&t.right<=nav.width+1,
          'Staging desktop nav clipped '+t.name);
        assert.ok(t.fontSize>=10,'Staging nav font below 10px');
      }
      await frame.locator('#mainNav [data-tab="rt"]').click();
      await frame.locator('[data-attention-mode="focus"]').click();
      await frame.locator('html[data-water-attention="focus"]').waitFor({state:'attached'});
      await frame.locator('.rt-science-plot-grid').waitFor({state:'visible'});
      const plotTop=await frame.locator('#plotNav [data-plot]').evaluateAll(nodes=>
        nodes.map(n=>({top:n.getBoundingClientRect().top,
          fontSize:parseFloat(getComputedStyle(n).fontSize)})));
      assert.equal(plotTop.length,3,'Staging RT plots missing');
      assert.ok(plotTop.every(p=>p.fontSize>=10),'Staging RT font below 10px');
      const oneRow=Math.max(...plotTop.map(p=>p.top))-Math.min(...plotTop.map(p=>p.top))<=3;
      assert.ok(oneRow,'Staging RT plot buttons wrap');
      await frame.locator('[data-attention-mode="detail"]').click();
      await frame.locator('html[data-water-attention="detail"]').waitFor({state:'attached'});
      await frame.locator('.award-rt-geometry').waitFor({state:'visible'});
      await frame.locator('[data-attention-mode="focus"]').click();
      await frame.locator('html[data-water-attention="focus"]').waitFor({state:'attached'});
      assert.deepEqual(failedAssets,[],'Staging Water resources failed HTTP');
      const screenshot='a12-public-staging-'+viewport.width+'x'+viewport.height+'.png';
      await page.locator('#instrumentDialog').screenshot({path:join(output,screenshot),animations:'disabled'});
      report.desktopChecks.push({viewport,navCount:9,rtPlots:3,rtPlotsSingleRow:oneRow,
        reversibleDensity:true,screenshot,failedAssets:[]});
      console.log('Public A12 staging browser PASS '+viewport.width+'x'+viewport.height);
    }finally{await page.close();}
  }
  report.publicPreviewVerified=true;
  report.status='pass';
  console.log('Independent public A12 staging verified; production Pages NOT audited.');
}catch(e){
  report.status='fail';report.error=String(e.stack||e);
  throw e;
}finally{
  writeFileSync(join(output,'result.json'),JSON.stringify(report,null,2)+'\n');
  if(browser)await browser.close();
}
