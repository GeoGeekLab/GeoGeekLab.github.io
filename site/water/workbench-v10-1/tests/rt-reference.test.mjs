import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {solveRT,HG_BB_FRACTION,ANGLES,SOLVER_VERSION} from '../reference/dom-solver.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const d=JSON.parse(fs.readFileSync(path.join(root,'reference/rt-reference-v1.json'),'utf8'));
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const start=app.indexOf('const __factories='),end=app.indexOf('</script>',start);
const req=new Function(app.slice(start,end).replace("__require('main.js');","return __require;"))();
const {TABS,plots,initialParams}=req('core/config.js');
const {validateSession}=req('core/session-store.js');
const {rtWorkspace}=req('workspaces/rt.js');
const legacy=fs.readFileSync(path.join(root,'../workbench-v10/app/index.html'),'utf8');
const oldReq=new Function(legacy.slice(legacy.indexOf('const __factories='),legacy.indexOf('</script>',legacy.indexOf('const __factories='))).replace("__require('main.js');","return __require;"))();
const {geogeekAdapter}=oldReq('model/geogeek-adapter.js');

function mockReference(){
 globalThis.GeoGeekRT101={status:'ready',dataset:d,
  ids:d.cases.map(c=>c.id),suns:d.grid.sunZenithDeg,wavelengths:d.grid.wavelengthNm,depths:d.grid.depthM,
  caseData:id=>d.cases.find(c=>c.id===id),
  record:(id,sun,nm)=>d.cases.find(c=>c.id===id)?.records.find(r=>r.sza===sun&&r.nm===nm),
  matches:(params,id,sun)=>Object.entries(d.cases.find(c=>c.id===id)?.params||{}).every(([key,val])=>params[key]===val)&&params.sza===sun
 };
}
test('RT-101 scientific model identifier and reference provenance are honest',()=>{
 assert.equal(d.schema,'water-rt-reference-v1');assert.equal(d.referenceEngine,SOLVER_VERSION);
 assert.equal(d.status,'internally-generated-unvalidated');
 assert.equal(d.numerical.warning.includes('not cross-verified'),true);
 assert.equal(d.physics.airSeaBoundary,false);
 assert.ok(HG_BB_FRACTION>.04&&HG_BB_FRACTION<.07);
 assert.equal(ANGLES.length,8);
});
test('RT-102 angular phase and discrete profile dimensions match fixed grid',()=>{
 assert.equal(d.cases.length,3);
 for(const c of d.cases){
  assert.equal(c.records.length,15);
  for(const r of c.records){
   assert.equal(r.Ed.length,10);assert.equal(r.Eu.length,10);assert.equal(r.Kd.length,10);assert.equal(r.Lu.length,10);
   for(const row of r.Lu)assert.equal(row.slice(0,8).length,8);
   assert.ok(r.rrs>=0&&Number.isFinite(r.rrs));
   assert.ok(Math.abs(r.Ed[0]-1)<1e-9);
  }
 }
});
test('RT-103 absorption-only analytic Beer–Lambert and zero upwelling',()=>{
 const a=.15,sza=30,mu=Math.cos(sza*Math.PI/180);
 const x=solveRT({a,bb:0,sza});
 assert.ok(Math.abs(x.Ed[5]-Math.exp(-a*5/mu))<1e-8);
 assert.ok(x.Eu.every(v=>v===0));
 assert.equal(x.rrs,0);
 assert.ok(Math.abs(x.Kd[0]-a/mu)<1e-7);
});
test('RT-104 physical perturbation increases attenuation and preserves nonnegative flux',()=>{
 const low=solveRT({a:.04,bb:.002,sza:30}),high=solveRT({a:.1,bb:.002,sza:30});
 assert.ok(high.Ed.at(-1)<low.Ed.at(-1));
 assert.ok(high.Kd[0]>low.Kd[0]);
 assert.ok(low.Eu.every(x=>x>=0));
 assert.ok(high.Eu.every(x=>x>=0));
 assert.ok(low.residual<2e-6&&high.residual<2e-6);
});
test('RT-105 existing V10.0 model spectra are unchanged for same IOP state',()=>{
 const v10Req=oldReq,rtReq=req;
 const p=rtReq('core/config.js').initialParams;
 const old=v10Req('model/geogeek-adapter.js').geogeekAdapter.compute(p);
 const now=rtReq('model/geogeek-adapter.js').geogeekAdapter.compute(p);
 for(const key of ['a','bb','rrs','subsurfaceRrs','toa','corrected'])assert.deepEqual(now[key],old[key]);
});
test('RT-106 WATER RT workbench exposes 9 tabs and strict discrete sample controls',()=>{
 assert.equal(TABS.length,9);assert.deepEqual(plots.rt.map(p=>p[0]),['depth','angular','compare']);
 const raw=validateSession({tab:'rt',plot:'compare',rtCase:'evil',rtSun:45,rtWl:551,rtDepth:4});
 assert.deepEqual([raw.rtCase,raw.rtSun,raw.rtWl,raw.rtDepth],['clear',30,490,0]);
 mockReference();
 const state=validateSession({tab:'rt',plot:'depth'});
 for(const plot of ['depth','angular','compare']){
  const html=rtWorkspace.renderChart({state:{...state,plot}});
  assert.match(html,/rt-shell/);assert.match(html,/NOT EXTERNALLY BENCHMARKED/);
  assert.match(html,/aria-label=/);assert.doesNotMatch(html,/NaN|undefined/);
 }
 const controls=rtWorkspace.renderControls({state,controls:{csection:(a,b,html)=>html}});
 assert.match(controls,/data-rt-depth=/);
 assert.match(controls,/data-rt-apply=/);
});
test('RT-107 same IOP guard withholds live match when anything changes',()=>{
 mockReference();const c=d.cases.find(x=>x.id==='clear');
 const state={...initialParams,...c.params,sza:30};
 assert.equal(globalThis.GeoGeekRT101.matches(state,'clear',30),true);
 assert.equal(globalThis.GeoGeekRT101.matches({...state,ag:state.ag+.001},'clear',30),false);
 assert.equal(globalThis.GeoGeekRT101.matches({...state,sza:45},'clear',30),false);
});
test('RT-108 strict loading-failure UI does not fabricate reference curves',()=>{
 globalThis.GeoGeekRT101={status:'error',error:'Reference HTTP 404'};
 const html=rtWorkspace.renderChart({state:validateSession({tab:'rt'})});
 assert.match(html,/Reference dataset unavailable/);
 assert.doesNotMatch(html,/rt-svg/);
});
test('RT-109 V10.1 engine fallback and V10.0 source keep distinct iframe mounts',()=>{
 const v101=fs.readFileSync(path.join(root,'instrument.js'),'utf8');
 assert.match(v101,/GeoWaterWorkbenchV101/);
 assert.match(v101,/water-v101-frame/);
 assert.match(v101,/workbench-v10\/instrument\.js/);
 assert.match(v101,/V10\.0 fallback/);
 assert.match(app,/schemaVersion:8/);
 assert.match(app,/data-rt-case/);
 assert.match(app,/workspaces\/rt\.js/);
});
