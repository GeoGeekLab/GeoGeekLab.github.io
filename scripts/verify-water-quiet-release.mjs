#!/usr/bin/env node
// Verify what a visitor actually receives, including the original shared URL.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const release='20261011v107watercache1';
const adapterVersion='10.2.0-quiet2';
const quietVersion='20261011-quiet2';
const site=new URL('../site/',import.meta.url);
const paths=[
  'lab.html','core/modules.js','water/workbench-v10-2/instrument.js',
  'water/workbench-v10-2/app/index.html',
  'water/workbench-v10-2/water-quiet.css',
  'water/workbench-v10-2/water-quiet.js'
];
function verify(where,html,modules,adapter,app,css,js){
  assert.ok(html.includes('meta content="'+release+'" name="geogeek-lab-release"'),where+': stale release');
  assert.ok(html.includes('core/modules.js?v='+release),where+': stale module entry');
  assert.ok(modules.includes('workbench-v10-2/instrument.js?v='+adapterVersion),where+': old Water adapter URL');
  assert.ok(adapter.includes("chartfix', '"+adapterVersion),where+': old Water iframe URL');
  assert.ok(adapter.includes("version: '"+adapterVersion+"'"),where+': old adapter build');
  assert.ok(app.includes('water-quiet.css?v='+quietVersion),where+': missing quiet CSS reference');
  assert.ok(app.includes('water-quiet.js?v='+quietVersion),where+': missing quiet JS reference');
  assert.ok(css.includes('.water-scope-boundary'),where+': quiet styles not served');
  assert.ok(js.includes('compactWaterOpticsChart'),where+': quiet runtime not served');
}
verify('Source',...(await Promise.all(paths.map(p=>readFile(new URL(p,site),'utf8')))));
const pos=process.argv.indexOf('--url');
if(pos>=0){
  const base=process.argv[pos+1];
  if(!base)throw new Error('--url requires a public site base URL');
  async function get(file,legacy=false){
    const url=new URL(file,base.endsWith('/')?base:base+'/');
    if(legacy){
      url.searchParams.set('release','20261010v103play3');
      url.searchParams.set('instrument','water');
    }
    url.searchParams.set('__quiet_smoke',String(Date.now()));
    const res=await fetch(url,{cache:'no-store',headers:{'Cache-Control':'no-cache'}});
    if(!res.ok)throw new Error(file+': HTTP '+res.status);
    const type=res.headers.get('content-type')||'';
    const expected=file.endsWith('.html')?'text/html':file.endsWith('.css')?'text/css':'javascript';
    if(!type.includes(expected))throw new Error(file+': unexpected content type '+type);
    return res.text();
  }
  let failure;
  for(let attempt=0;attempt<5;attempt++){
    try{
      verify('Public Pages',...(await Promise.all(paths.map(p=>get(p)))));
      const old=await get('lab.html',true);
      assert.ok(old.includes('meta content="'+release+'" name="geogeek-lab-release"'),'Original shared URL returned old Lab');
      console.log('Public Water quiet release verified: '+release+' / '+adapterVersion+' / '+quietVersion+'; original shared URL current');
      process.exit(0);
    }catch(error){
      failure=error;
      if(attempt<4)await new Promise(resolve=>setTimeout(resolve,1500*(attempt+1)));
    }
  }
  throw failure;
}
console.log('Local Water quiet release wiring verified: '+release+' / '+adapterVersion+' / '+quietVersion);
