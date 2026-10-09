import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../v102-atm-sensor-views.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(base,p)=>fs.readFileSync(path.join(base,p),'utf8');
const html=read(root,'app/index.html');
function bundle(src){
 const a=src.indexOf('const __factories='),b=src.indexOf('</script>',a);
 assert.ok(a>0&&b>a);
 return new Function(src.slice(a,b).replace("__require('main.js');","return __require;"))();
}
const req=bundle(html),old=bundle(read(path.resolve(root,'../workbench-v10-1'),'app/index.html'));
const V=globalThis.GeoGeekV102AtmSensor,{PSETS,initialParams,plots}=req('core/config.js');
const adapter=req('model/geogeek-adapter.js').geogeekAdapter;
const oldAdapter=old('model/geogeek-adapter.js').geogeekAdapter;
const makeSensorObservation=req('model/geogeek-adapter.js').makeSensorObservation;
const charts={
 chartFrame:(title,subtitle,series,mode)=>'<figure data-science-mode="'+mode+'"><figcaption>'+title+' · '+subtitle+'</figcaption><span data-series-count="'+series.length+'"></span></figure>'
};
function experiment(preset='clear'){
 const params={...initialParams,...PSETS[preset]};
 const data=adapter.compute(params);
 return {params,data,state:{params,plot:'toa',sensor:'olci',responseMode:'nominal',srfPlatform:'s2a',srfBand:'B02',probe:443}};
}
test('UX-063 atmosphere displays three path terms, numerical closure and defined geometry',()=>{
 const {state,data}=experiment();
 const markup=V.atmosphere(state,data,charts);
 for(const term of ['FIRST-ORDER SIMULATED TOA REFLECTANCE','not measured top-of-atmosphere radiance',
  'Rayleigh path','Aerosol path','Transmitted water','viewing zenith','Viewing zenith',
  'Aerosol optical depth','surface pressure','Additive closure','dimensionless',
  'data-science-mode="toa"','data-series-count="4"'])
  assert.ok(markup.toLowerCase().includes(term.toLowerCase()),term);
 assert.match(markup,/id="p6b-atmosphere-values"/);
 assert.match(markup,/role="region" tabindex="0"/);
 assert.match(markup,/<th scope="row">443<\/th>/);
});
test('UX-063 additive TOA components agree without changing model results in four presets',()=>{
 for(const preset of Object.keys(PSETS)){
  const {data,params}=experiment(preset);
  const check=V.atmosphereClosure(data);
  assert.equal(check.status,'agree',preset+' '+check.maxResidual);
  assert.ok(check.maxResidual<=1e-11);
  const previous=oldAdapter.compute(params);
  for(const key of ['a','bb','rrs','toa','ray','aeros','water','corrected'])
   assert.deepEqual(data[key],previous[key],preset+'/'+key);
 }
});
test('UX-063 invalid component or inconsistent TOA does not get a false closure claim',()=>{
 const {data}=experiment();
 const inconsistent={...data,toa:data.toa.slice()};
 inconsistent.toa[4]+=.1;
 assert.equal(V.atmosphereClosure(inconsistent).status,'mismatch');
 inconsistent.toa[4]=NaN;
 assert.equal(V.atmosphereClosure(inconsistent).status,'invalid');
});
test('UX-064 OLCI Oa11 remains outside 400–700 nm and never gets numerical data',()=>{
 const {state,data}=experiment();
 const obs=makeSensorObservation(data,'olci','toa',{responseMode:'nominal'});
 const nominal=makeSensorObservation(data,'olci','toa',{responseMode:'nominal'});
 const eleven=obs.bands.find(x=>x.id==='Oa11');
 assert.equal(eleven.status,'out_of_model_domain');
 assert.equal(eleven.value,null);
 const markup=V.sensor(state,data,charts,obs,nominal,'');
 assert.match(markup,/NOMINAL RECTANGULAR RESPONSE/);
 assert.match(markup,/not a measured mission SRF/);
 assert.match(markup,/OUT OF MODEL DOMAIN/);
 assert.match(markup,/centre above 700 nm/);
 assert.match(markup,/SRF coverage/);
 assert.match(markup,/tabindex="0"/);
 assert.match(markup,/<th scope="col">Nominal centre \(nm\)<\/th>/);
 const row=markup.match(/<tr data-srf-status="out_of_model_domain">[\s\S]*?<\/tr>/)?.[0];
 assert.ok(row,'missing Oa11 row');
 assert.match(row,/<th scope="row">Oa11<\/th>/);
 assert.match(row,/<td>—<\/td><td>—<\/td><\/tr>/);
});
test('UX-064 response classification uses provenance only when supplied by measured data',()=>{
 const {state,data}=experiment('phyto'),nominal=makeSensorObservation(data,'olci','rrs',{responseMode:'nominal'});
 const measured={...nominal,actualResponseMode:'measured',responseModel:'published-measured-1nm-srf',
  sensor:{label:'Synthetic verification sensor'},platform:'s2a',
  provenance:{publisher:'Synthetic test',sourceFile:'test-srf.csv',gitBlobSHA:'001122'},
  bands:nominal.bands.map((b,i)=>i===0?{...b,value:null,status:'partial',coverageFraction:.7}:b)};
 const view=V.sensor({...state,plot:'rrsBands',responseMode:'measured'},data,charts,measured,nominal,'');
 assert.match(view,/PUBLISHED MEASURED SRF/);
 assert.match(view,/Synthetic test/);
 assert.match(view,/test-srf.csv/);
 assert.match(view,/001122/);
 assert.match(view,/PARTIAL · no band value/);
 assert.match(view,/response-weighted mean/);
 assert.match(view,/data-science-mode="rrs"/);
 const absent=V.sourceInfo({...measured,actualResponseMode:'unavailable',provenance:null},'measured');
 assert.match(absent.kind,/UNAVAILABLE/);
 assert.match(absent.provenance,/No verified SRF source/);
 assert.equal(V.bandStatus({status:'partial'}),'PARTIAL · no band value');
 assert.equal(V.bandStatus({status:'unavailable'}),'UNAVAILABLE · no band value');
});
test('UX-064 sensor profile remains available without using measured source for nominal mode',()=>{
 const {state,data}=experiment();
 const nominal=makeSensorObservation(data,'olci','toa',{responseMode:'nominal'});
 const m=V.sensor({...state,plot:'srfProfile'},data,charts,nominal,nominal,'<div class="test-profile">No measured source</div>');
 assert.match(m,/class="test-profile"/);
 assert.match(m,/does not override the active response selection/);
 assert.doesNotMatch(m,/data-science-mode="toa"/);
 assert.deepEqual(plots.sensor,old('core/config.js').plots.sensor);
 assert.match(html,/v102-atm-sensor-views\.js\?v=10\.2\.0-p6b/);
 assert.match(html,/v102-atm-sensor\.css\?v=10\.2\.0-p6b/);
 assert.match(html,/schemaVersion:8/);
});
