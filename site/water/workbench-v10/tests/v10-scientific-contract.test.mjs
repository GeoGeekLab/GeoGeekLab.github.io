import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import '../science-contract.js';
import '../../workbench-v9/analysis/uncertainty-engine.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const waterRoot=path.resolve(root,'..');
const v9Root=path.join(waterRoot,'workbench-v9');
const measured=fs.readFileSync(path.join(v9Root,'srf/measured-response-data.js'),'utf8');
(new Function('window',measured))(globalThis);
function modules(version) {
 const html=fs.readFileSync(path.join(waterRoot,version,'app/index.html'),'utf8');
 const start=html.indexOf('const __factories='),end=html.indexOf('</script>',start);
 assert.ok(start>=0&&end>start);
 return new Function(html.slice(start,end).replace("__require('main.js');","return __require;"))();
}
const v9=modules('workbench-v9');
const v10=modules('workbench-v10');
const {geogeekAdapter,makeSensorObservation}=v10('model/geogeek-adapter.js');
const {geogeekAdapter:oldAdapter}=v9('model/geogeek-adapter.js');
const defaults=v10('core/config.js').initialParams;
const C=globalThis.GeoGeekV10Contract;

test('AT-F02-01 V10 default keeps V9 numerical water and atmosphere spectra',()=>{
 const old=oldAdapter.compute(defaults),now=geogeekAdapter.compute(defaults);
 for(const id of ['a','bb','rrs','toa','corrected']){
  assert.equal(old[id].length,301);
  for(let i=0;i<301;i++)assert.equal(now[id][i],old[id][i],id+' / '+(400+i));
 }
});
test('AT-F02-02 changing optical slopes changes only their documented spectral components',()=>{
 const base=geogeekAdapter.compute(defaults);
 const custom=geogeekAdapter.compute({...defaults,sg:.023,snap:.021});
 assert.equal(C.modelVariant(defaults),'V9_COMPAT_FIXED_SLOPES');
 assert.equal(C.modelVariant({...defaults,sg:.023}),'V10_EXPLORATORY_CUSTOM_SLOPES');
 assert.deepEqual(custom.absorption.water,base.absorption.water);
 assert.deepEqual(custom.absorption.phytoplankton,base.absorption.phytoplankton);
 assert.deepEqual(custom.backscattering.total,base.backscattering.total);
 assert.equal(custom.absorption.cdom[440-400],base.absorption.cdom[440-400]);
 assert.equal(custom.absorption.nap[443-400],base.absorption.nap[443-400]);
 assert.notEqual(custom.absorption.cdom[400-400],base.absorption.cdom[400-400]);
 assert.notEqual(custom.absorption.nap[700-400],base.absorption.nap[700-400]);
});
test('AT-F02-04 direct model invocation rejects physically unsupported custom slope bounds',()=>{
 assert.throws(()=>geogeekAdapter.compute({...defaults,sg:-.02}),/optical slopes/);
 assert.throws(()=>geogeekAdapter.compute({...defaults,snap:.5}),/optical slopes/);
});
test('AT-F03-04 radiance-first reflectance uses separately integrated L and E0',()=>{
 const out=C.reflectanceFromBandRadiance({wavelengths:[400,410,420],toaRadiance:[2,2,2],solarIrradiance:[100,100,100],weights:[0,1,0],mu0:.5});
 assert.equal(out.status,'valid');assert.ok(Math.abs(out.value-Math.PI*.04)<1e-12);
 assert.throws(()=>C.reflectanceFromBandRadiance({wavelengths:[400,410],toaRadiance:[1,1],solarIrradiance:[1,1],weights:[1,1],mu0:0}),/solar geometry/);
});
test('AT-F01-02 unsupported 720 nm is null and explicitly out of model domain',()=>{
 const x=C.quantity('Rrs',.003,720);
 assert.equal(x.status,'out_of_domain');assert.equal(x.value,null);assert.equal(x.unit,'sr^-1');
});
test('AT-F03-01 constant spectral quantity survives normalized band integration',()=>{
 const x=C.bandMean([400,410,420],[.2,.2,.2],[0,.5,0]);
 assert.equal(x.status,'valid');assert.ok(Math.abs(x.value-.2)<1e-14);
 assert.equal(C.bandMean([400,410],[.2,.2],[0,0]).value,null);
});
test('AT-F03-02/05 unsupported OLCI Oa11 does not produce a valid water band',()=>{
 const d=geogeekAdapter.compute(defaults);
 const obs=makeSensorObservation(d,'olci','rrs',{responseMode:'nominal'});
 const b=obs.bands.find(x=>x.id==='Oa11');
 assert.ok(b);assert.equal(b.value,null);assert.equal(b.status,'out_of_model_domain');
 const status=C.classifyBand(b);
 assert.equal(status.status,'out_of_domain');assert.equal(status.value,null);
});
test('AT-F03-04 OLCI band OC4 uses supported nominal bands and provenance',()=>{
 const obs=makeSensorObservation(geogeekAdapter.compute(defaults),'olci','rrs',{responseMode:'nominal'});
 const c=C.olciBandOC4(obs);
 assert.equal(c.status,'valid');assert.equal(c.inputUnit,'sr^-1');
 assert.deepEqual(c.bandIds,['Oa03','Oa04','Oa05','Oa06']);
 assert.equal(c.responseMode,'nominal');
 const missing={...obs,bands:obs.bands.map(x=>x.id==='Oa03'?{...x,status:'unavailable',value:null}:x)};
 assert.equal(C.olciBandOC4(missing).status,'missing_data');
});
test('AT-F12-02 schema v6 import and schema v7 variant import retain science meanings',()=>{
 const {createExports}=v10('app/export.js');
 const {validateSession}=v10('core/session-store.js');
 const p=validateSession({params:defaults});
 const model={meta:{id:geogeekAdapter.id,modelVersion:geogeekAdapter.modelVersion}};
 const exporter=createExports({store:{state:p},models:model,notify:()=>{}});
 const state={params:defaults,sensor:'olci',probeNm:443,uncertaintyParameters:['chl','ag'],uncertaintySigma:.00002,uncertaintyStep:5};
 const old={kind:'water-as-spectrum',schemaVersion:6,model:model.meta,state,scenarioA:{params:defaults,sensor:'olci',name:'A'}};
 assert.equal(exporter.parseImport(old).params.sg,.0176);
 const custom={...defaults,sg:.024,snap:.02};
 const modern={...old,schemaVersion:7,state:{...state,params:custom},scenarioA:{params:custom,sensor:'olci',name:'A'},science:{modelVariant:C.modelVariant(custom)}};
 assert.equal(exporter.parseImport(modern).params.sg,.024);
 assert.throws(()=>exporter.parseImport({...modern,science:{modelVariant:'V9_COMPAT_FIXED_SLOPES'}}),/provenance/);
 assert.throws(()=>exporter.parseImport({...old,state:{...state,params:custom}}),/fixed optical slopes/);
});
test('AT-F01-03 V10 startup has byte-matching inlined contract before app boot',()=>{
 const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
 const source=fs.readFileSync(path.join(root,'science-contract.js'),'utf8');
 const m=app.match(/<script data-v10-science-fallback="inline">([\\s\\S]*?)<\\/script>/);
 assert.ok(m,'Missing inlined validity contract fallback');
 assert.ok(m[1].includes(source),'V10 inline and external scientific contracts diverged');
 const isolated={};vm.runInNewContext(m[1],isolated);
 assert.equal(isolated.GeoGeekV10Contract.appVersion,'10.0.0');
});
test('V10 bundle retains scoped mount contract, eight tabs and schema 7',()=>{
 const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
 const loader=fs.readFileSync(path.join(root,'instrument.js'),'utf8');
 assert.match(app,/schemaVersion:7/);assert.match(app,/MODEL \/ ASSUMPTIONS \/ VALIDITY/);
 assert.match(app,/V10 BAND-INTEGRATED OC4/);assert.match(app,/water_ui_geo_v10/);
 assert.match(loader,/water-v10-frame/);assert.match(loader,/GeoWaterWorkbenchV9/);
 assert.equal(v10('core/config.js').TABS.length,8);
});
