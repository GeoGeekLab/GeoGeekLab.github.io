#!/usr/bin/env node
// Verify the supported UI and stable science against the current source manifest.
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {resolve,sep} from 'node:path';
import {pathToFileURL} from 'node:url';
import {CORE_MODULES_URL,SITE_ASSET_RELEASE} from './site-release-contract.mjs';
const site=new URL('../site/',import.meta.url);
const paths=['lab.html','core/modules.js','water/workbench-v10-2/instrument.js',
 'water/workbench-v10-2/app/index.html','water/workbench-v10-2/rt-engine.js',
 'water/workbench-v10-2/water-quiet.css','water/workbench-v10-2/water-quiet.js',
 'water/workbench-v10-2/water-attention.css','water/workbench-v10-2/water-attention.js'];
const source=await Promise.all(paths.map(file=>readFile(new URL(file,site),'utf8')));
const manifest=JSON.parse(await readFile(new URL('water/shared/provenance.json',site),'utf8'));
const adapterVersion=source[2].match(/version: '([^']+)'/)?.[1];
assert.ok(adapterVersion,'Current adapter has no version');
const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');
function hasSharedTypography(html){
 const base=new URL('https://water-release.invalid/water/workbench-v10-2/app/index.html');
 return [...html.matchAll(/<link\b[^>]*>/gi)].some(([tag])=>{
  if(!/\brel\s*=\s*(['"])stylesheet\1/i.test(tag))return false;
  const href=tag.match(/\bhref\s*=\s*(['"])([^'"]+)\1/i)?.[2];
  if(!href)return false;
  try{const url=new URL(href,base);return url.origin===base.origin&&url.pathname==='/design-tokens.css';}
  catch{return false;}
 });
}
function verify(where,bodies,production=false){
 const [html,modules,adapter,app,engine,quietCss,quietJs,attentionCss,attentionJs]=bodies;
 assert.match(html,/name="geogeek-lab-release"/,where+': Lab release marker missing');
 if(production)assert.ok(html.includes(CORE_MODULES_URL),where+': module URL must use '+SITE_ASSET_RELEASE);
 assert.ok(modules.includes('workbench-v10-2/instrument.js?v='+adapterVersion),where+': stale adapter URL');
 assert.doesNotMatch(modules,/water\/workbench-v(?:5|6|7|8|9|10|10-1)\//,where+': retired fallback');
 assert.ok(adapter.includes("chartfix', '"+adapterVersion),where+': stale iframe key');
 assert.ok(adapter.includes("version: '"+adapterVersion+"'"),where+': stale adapter');
 assert.match(adapter,/Retry Water workspace/,where+': missing explicit recovery');
 assert.ok(hasSharedTypography(app),where+': shared typography missing');
 for(const dependency of ['srf/measured-response-data.js','analysis/uncertainty-engine.js','science-contract.js','chart-fix.js']){
  assert.ok(app.includes('../../shared/'+dependency),where+': missing shared '+dependency);
 }
 assert.doesNotMatch(app,/\.\.\/workbench-v(?:5|6|7|8|9|10|10-1)\//,where+': retired dependency');
 assert.match(engine,/shared\/reference\/rt-reference-v1\.json/,where+': old reference path');
 assert.ok(quietCss.includes('.water-scope-boundary')&&quietJs.includes('compactWaterOpticsChart'),where+': quiet UI missing');
 assert.ok(attentionCss.includes('.water-nav-controls')&&attentionJs.includes('installNavControls'),where+': navigation missing');
}
verify('Source',source);
for(const entry of manifest.assets){
 assert.equal(sha256(await readFile(new URL('water/shared/'+entry.path,site))),entry.sha256,'Shared source drift: '+entry.path);
}
const distPos=process.argv.indexOf('--dist');
if(distPos>=0){
 const input=process.argv[distPos+1];
 const dist=input&&!input.startsWith('--')?pathToFileURL(resolve(input)+sep):new URL('../dist/',import.meta.url);
 const built=await Promise.all(paths.map(file=>readFile(new URL(file,dist),'utf8')));
 verify('Production artifact',built,true);
 const builtManifest=JSON.parse(await readFile(new URL('water/shared/provenance.json',dist),'utf8'));
 assert.deepEqual(builtManifest,manifest,'Production artifact changed the pinned science manifest');
 for(const entry of manifest.assets){
  assert.equal(sha256(await readFile(new URL('water/shared/'+entry.path,dist))),entry.sha256,'Production shared science drift: '+entry.path);
 }
 console.log('Supported Water production artifact and shared science verified ('+SITE_ASSET_RELEASE+').');
}
const pos=process.argv.indexOf('--url');
if(pos>=0){
 const input=process.argv[pos+1];if(!input)throw new Error('--url requires the deployed site base URL');
 const base=input.endsWith('/')?input:input+'/';
 async function get(file,bust=true){
  const url=new URL(file,base);if(bust)url.searchParams.set('__water_smoke',String(Date.now()));
  const res=await fetch(url,{cache:bust?'no-store':'default',signal:AbortSignal.timeout(15000)});
  assert.ok(res.ok,file+': HTTP '+res.status);
  const type=res.headers.get('content-type')||'',extension=new URL(file,base).pathname.split('.').pop();
  const expected={html:'text/html',css:'text/css',js:'javascript',mjs:'javascript',json:'json',txt:'text/plain'}[extension];
  if(expected)assert.ok(type.includes(expected),file+': unexpected content type '+type);
  return Buffer.from(await res.arrayBuffer());
 }
 for(const bust of [true,false]){
  const bytes=await Promise.all(paths.map(file=>get(file,bust)));
  verify('Deployed '+(bust?'fresh':'normal-cache'),bytes.map(value=>value.toString('utf8')),true);
 }
 await Promise.all(manifest.assets.map(async entry=>{
  assert.equal(sha256(await get('water/shared/'+entry.path)),entry.sha256,'Deployed shared science drift: '+entry.path);
 }));
 const legacy=(await get('lab.html?release=20261011v107watercache1&instrument=water')).toString('utf8');
 assert.ok(legacy.includes(CORE_MODULES_URL),'Old shared Lab URL returned stale modules');
 console.log('Supported Water release and shared science verified at '+base+' ('+SITE_ASSET_RELEASE+').');
}else if(distPos<0)console.log('Supported Water source and shared science verified ('+adapterVersion+').');
