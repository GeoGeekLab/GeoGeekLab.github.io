import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../analysis/uncertainty-engine.js';
const dir=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const root=path.resolve(dir,'..');
const E=globalThis.GeoGeekV9Engine;
const srf=fs.readFileSync(path.join(dir,'srf/measured-response-data.js'),'utf8');
(new Function('window',srf))(globalThis);
function load(workbench){
 const html=fs.readFileSync(path.join(root,workbench,'app/index.html'),'utf8');
 const start=html.indexOf('const __factories=');
 const end=html.indexOf('</script>',start);
 assert.ok(start>=0&&end>start,workbench+' has an inline application bundle');
 const code=html.slice(start,end).replace("__require('main.js');","return __require;");
 return new Function(code)();
}
const v9=load('workbench-v9');
const v8=load('workbench-v8');
const {createModelGateway}=v9('model/model-gateway.js');
const {geogeekAdapter,makeSensorObservation}=v9('model/geogeek-adapter.js');
const {initialParams,CFG}=v9('core/config.js');
const models=createModelGateway(geogeekAdapter);
const main={models,params:initialParams,bounds:CFG,stepPercent:5,noiseSigma:.00002};
const withSensor=(sensor,responseMode,platform='s2a')=>d=>makeSensorObservation(d,sensor,'rrs',{responseMode,srfPlatform:platform});
test('V9 physical forward model remains numerically identical to V8 at 443/560/665 nm',()=>{
 const {createModelGateway:oldGateway}=v8('model/model-gateway.js');
 const {geogeekAdapter:oldAdapter}=v8('model/geogeek-adapter.js');
 const old=oldGateway(oldAdapter).run(initialParams),now=models.run(initialParams);
 assert.equal(now.rrs.length,301);
 for(const nm of [443,560,665]){
  const i=nm-400;
  for(const key of ['rrs','toa','corrected'])assert.equal(now[key][i],old[key][i],key+':'+nm);
 }
});
test('V9 OLCI 9 valid bands yield a two-dimensional Fisher subproblem',()=>{
 const r=E.analyze({...main,selected:['chl','ag'],sample:withSensor('olci','nominal')});
 assert.equal(r.numberOfMeasurements,9);assert.equal(r.rank,2);
 assert.equal(r.identifiable,true);assert.equal(r.uncertainties.length,2);
 assert.ok(r.condition>1);
});
test('V9 actual source-pinned S2A 3 visible bands cannot identify five parameters',()=>{
 const r=E.analyze({...main,selected:['chl','ag','anap','bbp','eta'],sample:withSensor('msi','measured')});
 assert.equal(r.numberOfMeasurements,3);assert.equal(r.rank,3);
 assert.equal(r.uncertainties,null);assert.equal(r.covariance,null);
 assert.deepEqual(r.dropped.map(x=>x.id),['B01']);
 assert.equal(r.source.provenance.gitBlobSHA,'be6c8291507aadfb75d9abcef6689be1600144dd');
});
test('Noise scaling and sensor platform remain explicit on real spectra',()=>{
 const low=E.analyze({...main,selected:['chl','ag'],sample:withSensor('msi','measured','s2b')});
 const high=E.analyze({...main,selected:['chl','ag'],noiseSigma:.0001,sample:withSensor('msi','measured','s2b')});
 assert.equal(low.source.platform,'s2b');assert.equal(low.rank,2);
 for(let i=0;i<2;i++)assert.ok(Math.abs(high.uncertainties[i]/low.uncertainties[i]-5)<1e-8);
});
test('V9 workspace renders rank deficiency and a correlated 2-parameter matrix',()=>{
 const {uncertaintyWorkspace}=v9('workspaces/uncertainty.js');
 const state={params:initialParams,sensor:'msi',responseMode:'measured',srfPlatform:'s2a',
  uncertaintyParameters:['chl','ag','anap','bbp','eta'],uncertaintySigma:.00002,uncertaintyStep:5,plot:'summary'};
 const rank=uncertaintyWorkspace.renderChart({state,models});
 assert.match(rank,/RANK DEFICIENT/);assert.match(rank,/No parameter uncertainties/);
 const summary=uncertaintyWorkspace.renderChart({state:{...state,sensor:'olci',responseMode:'nominal',uncertaintyParameters:['chl','ag']},models});
 assert.match(summary,/conditional 1σ/);
 const jac=uncertaintyWorkspace.renderChart({state:{...state,sensor:'olci',responseMode:'nominal',uncertaintyParameters:['chl','ag'],plot:'jacobian'},models});
 assert.match(jac,/Multi-parameter Jacobian/);
});
