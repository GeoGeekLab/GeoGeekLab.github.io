import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../v102-analysis-views.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const v101=fs.readFileSync(path.resolve(root,'../workbench-v10-1/app/index.html'),'utf8');
function bundle(source){
 const a=source.indexOf('const __factories='),b=source.indexOf('</script>',a);
 assert.ok(a>0&&b>a);
 return new Function(source.slice(a,b).replace("__require('main.js');","return __require;"))();
}
const req=bundle(html),old=bundle(v101),V=globalThis.GeoGeekV102AnalysisViews;
const {validateSession}=req('core/session-store.js');
const adapter=req('model/geogeek-adapter.js').geogeekAdapter;
const oldAdapter=old('model/geogeek-adapter.js').geogeekAdapter;
const models={run:p=>adapter.compute(p),meta:adapter};
const charts={
 chartFrame:(title,subtitle,series,mode)=>'<figure data-original-chart="'+mode+'" data-series="'+series.length+'">'+title+' '+subtitle+'</figure>',
 metricGrid:()=>'<div data-original-metrics="true"></div>'
};
globalThis.GeoGeekV10Contract={olciBandOC4:()=>({status:'invalid',reason:'test only; not measured'})};
function fixture(overrides={}){
 const state=validateSession(overrides),data=adapter.compute(state.params);
 return {state,data};
}
test('UX-071 shows same-model closure as a controlled exercise, not empirical AC verification',()=>{
 const {state,data}=fixture({tab:'ac',plot:'correction'});
 const x=req('workspaces/ac.js').acWorkspace.renderChart({state,data,models,charts});
 for(const phrase of ['Correction is not independent validation','MATCHED FORWARD / INVERSE ASSUMPTIONS',
  'NOT PERFORMED','same-model algebraic closure','not accuracy on measured data',
  'data-original-chart="correction"','id="p7-ac-values"','Recovered − reference',
  'Signed mean residual','Negative corrected wavelengths'])assert.ok(x.includes(phrase),phrase);
 const s=V.acSummary(state,data);
 assert.equal(s.matched,true);
 assert.ok(s.rmse<1e-9);
 assert.equal(s.residual.length,301);
 const table=V.ac(state,data,'');
 assert.equal((table.match(/<tr/g)||[]).length,15);
});
test('UX-071 parameter perturbation retains signed residuals and is labeled as internal sensitivity',()=>{
 const {state,data}=fixture({tab:'ac',params:{...validateSession().params,corrAot:.2},plot:'error'});
 const s=V.acSummary(state,data);
 assert.equal(s.matched,false);
 assert.ok(s.rmse>0);
 const x=req('workspaces/ac.js').acWorkspace.renderChart({state,data,models,charts});
 assert.match(x,/PERTURBED ASSUMED ATMOSPHERE/);
 assert.match(x,/not an empirical correction error/);
 assert.match(x,/data-original-chart="error"/);
 for(let i=0;i<301;i++)assert.ok(Math.abs(s.residual[i]-(data.corrected[i]-data.rrs[i]))<1e-15);
});
test('UX-072 shows A snapshot, actually selected B source and signed B − A spectrum',()=>{
 const {state,data}=fixture({tab:'compare',plot:'overlay'});
 const original=req('workspaces/compare.js').compareWorkspace.renderChart({state,data,models,charts});
 assert.match(original,/SCENARIO A · SNAPSHOT/);
 assert.match(original,/SCENARIO B · LIVE CURRENT STATE/);
 assert.match(original,/Return B to live current state/);
 assert.match(original,/Clear saved B snapshot/);
 assert.match(original,/Reset A to model defaults/);
 assert.match(original,/data-original-chart="overlay"/);
 const B={name:'B · Past saved sample',params:{...state.params,chl:5},sensor:'olci',savedAt:'2026-10-09T00:00:00.000Z'};
 const saved={...state,snapshotB:B,compareBSource:'saved',plot:'delta'};
 const x=req('workspaces/compare.js').compareWorkspace.renderChart({state:saved,data,models,charts});
 assert.match(x,/SCENARIO B · SAVED SNAPSHOT/);
 assert.match(x,/B · Past saved sample/);
 assert.match(x,/data-original-chart="delta"/);
 assert.ok(V.compareSummary(saved,models).rmse>0);
 const live={...saved,compareBSource:'live'};
 const y=V.compare(live,models,'');
 assert.match(y,/a saved B exists/i);
 assert.match(y,/not currently plotted/);
});
test('UX-072 session save/import state shape is preserved and reset actions are delegated',()=>{
 const original=validateSession();
 const next=validateSession({...original,baseline:{...original.baseline,name:'A · Test'},snapshotB:{name:'B · Saved',params:original.params,sensor:'olci'},compareBSource:'saved'});
 assert.equal(next.baseline.name,'A · Test');
 assert.equal(next.compareBSource,'saved');
 assert.equal(next.snapshotB.name,'B · Saved');
 const events=req('app/events.js').bindWorkbenchEvents.toString();
 for(const phrase of ['dataset.compareReset',"action==='live'","action==='clear-b'","action==='defaults'","s.snapshotB=null","clone(initialParams)"])assert.ok(events.includes(phrase),phrase);
 assert.match(html,/schemaVersion:8/);
});
test('UX-073 presents correct units and boundary-safe finite difference, preserving original chart',()=>{
 const {state,data}=fixture({tab:'sensitivity',plot:'derivative'});
 const x=req('workspaces/sensitivity.js').sensitivityWorkspace.renderChart({state,data,models,charts});
 for(const phrase of ['LOCAL FINITE DIFFERENCE','Requested relative numerical step','Actual lower / upper parameter',
  'sr⁻¹ per','Dimensionless elasticity','not inverse accuracy','data-original-chart="sensitivity"',
  'id="p7-sens-spectrum"'])assert.ok(x.includes(phrase),phrase);
 const p={...state.params,chl:.02};
 const atBound={...state,params:p},d=adapter.compute(p);
 const boundary=req('workspaces/sensitivity.js').sensitivityWorkspace.renderChart({state:atBound,data:d,models,charts});
 assert.match(boundary,/one-sided/i);
 assert.match(boundary,/ONE-SIDED BOUNDARY/);
 assert.match(boundary,/not measurement uncertainty/);
});
test('UX-073 original sensor-band response still renders while carrying interpretive numeric table',()=>{
 const {state,data}=fixture({tab:'sensitivity',plot:'bands'});
 const view=req('workspaces/sensitivity.js').sensitivityWorkspace.renderChart({state,data,models,charts});
 assert.match(view,/Band-integrated Rrs sensitivity/);
 assert.match(view,/id="p7-sens-spectrum"/);
 assert.match(view,/SRF/);
 assert.match(view,/not inverse accuracy/);
});
test('Stage 7 preserves V10.1 model arrays exactly across all four reference states',()=>{
 const {PSETS,initialParams}=req('core/config.js');
 for(const name of Object.keys(PSETS)){
  const p={...initialParams,...PSETS[name]},a=adapter.compute(p),b=oldAdapter.compute(p);
  for(const key of ['a','bb','rrs','toa','ray','aeros','water','corrected'])assert.deepEqual(a[key],b[key],name+' '+key);
 }
 const expected=req('core/config.js').plots;
 assert.deepEqual(expected,old('core/config.js').plots);
 assert.match(html,/data-geogeek-sync-dependency="water-v102-analysis"/);
});
