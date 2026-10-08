import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const dataScript=fs.readFileSync(path.join(root,'srf/measured-response-data.js'),'utf8');
const upstream=fs.readFileSync(path.join(root,'../../core/modules.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'../../lab.html'),'utf8');
const json=dataScript.match(/Object\.freeze\(([\s\S]+)\);\s*$/)?.[1];
assert.ok(json,'SRF data JSON is embedded');
const records=JSON.parse(json);
globalThis.GeoGeekMeasuredSRFData=records;
function extract(id){
 const head='"'+id+'": function(require){\n',a=app.indexOf(head);
 assert.ok(a>=0,'Factory '+id+' exists');
 const b=app.indexOf('\n},\n"',a+head.length);
 assert.ok(b>a,'Factory boundary '+id);
 return app.slice(a+head.length,b);
}
const sensorDefinitions={
 's2-msi':{id:'s2-msi',label:'Sentinel-2A MSI',bands:[{id:'B01',centerNm:442.7,widthNm:21},{id:'B02',centerNm:492.4,widthNm:66},{id:'B03',centerNm:559.8,widthNm:36},{id:'B04',centerNm:664.6,widthNm:31}]},
 'landsat-oli':{id:'landsat-oli',label:'Landsat 8 OLI',bands:[{id:'B1',centerNm:440,widthNm:20},{id:'B2',centerNm:480,widthNm:60},{id:'B3',centerNm:560,widthNm:60},{id:'B4',centerNm:655,widthNm:30}]},
 olci:{id:'olci',label:'OLCI',bands:[]}};
const fakeNominal=(w,v,id)=>({sensor:sensorDefinitions[id],responseModel:'simplified-top-hat',bands:[],sampledCount:0,totalVisibleBands:0});
const source=extract('model/measured-sensor-response.js');
const implementation=new Function('require',source)(id=>{
 if(id==='model/upstream/sensor-observation.js')return {sampleSensorSpectrum:fakeNominal};
 if(id==='model/upstream/sensor-data.js')return {WATER_SENSOR_DEFINITIONS:sensorDefinitions};
 throw Error('Unexpected import '+id);
});
const w=Array.from({length:301},(_,i)=>400+i),ones=w.map(()=>0.023);
test('Measured publisher responses are source-pinned and non-Gaussian',()=>{
 assert.equal(records.schemaVersion,1);
 assert.equal(records.spectralModelDomainNm.join(','),'400,700');
 assert.deepEqual(Object.keys(records.data).sort(),['oli8','s2a','s2b']);
 const expected={'s2a':'be6c8291507aadfb75d9abcef6689be1600144dd',
 's2b':'94753de9654d69ec3be6f19c4b27bf7aa4c8381b',
 'oli8':'8092b059b8c9d46ca8dadfb159b5a0654554464d'};
 for(const [id,sha] of Object.entries(expected))assert.equal(records.data[id].sourceBlobSHA,sha);
});
test('All ten published SRFs integrate a constant to the same constant',()=>{
 let count=0;
 for(const [platform,group] of Object.entries(records.data)){
  for(const [band,r] of Object.entries(group.bands)){
   const result=implementation.integrateMeasured(w,ones,r);
   assert.equal(result.status,'full',platform+':'+band+' coverage '+result.coverageFraction);
   assert.ok(Math.abs(result.value-.023)<1e-12,platform+':'+band);
   assert.ok(r.relativeResponse.length>10);
   assert.ok(Math.abs(Math.max(...r.relativeResponse)-1)<.15);
   count++;
  }
 }
 assert.equal(count,10);
});
test('Measured response is different from an ideal rectangular average for a curved spectrum',()=>{
 const values=w.map(n=>.001+.00000001*(n-525)**2);
 const measured=implementation.integrateMeasured(w,values,records.data.s2a.bands.B02);
 assert.equal(measured.status,'full');
 const area=(values.slice(59,126).reduce((a,v)=>a+v,0))/67;
 assert.ok(Math.abs(measured.value-area)>1e-8);
});
test('No measured S2 coastal B01 can be synthesized',()=>{
 const result=implementation.sampleWithResponse(w,ones,'s2-msi','Rrs',{responseMode:'measured',srfPlatform:'s2a'});
 assert.equal(result.bands.length,4);
 assert.equal(result.bands[0].id,'B01');
 assert.equal(result.bands[0].status,'unavailable');
 assert.equal(result.bands[0].value,null);
 assert.equal(result.sampledCount,3);
 assert.equal(result.responseModel,'published-measured-1nm-srf');
});
test('S2A and S2B are distinguishable measured satellite platforms',()=>{
 const values=w.map(n=>n/1000);
 const a=implementation.sampleWithResponse(w,values,'s2-msi','Rrs',{responseMode:'measured',srfPlatform:'s2a'});
 const b=implementation.sampleWithResponse(w,values,'s2-msi','Rrs',{responseMode:'measured',srfPlatform:'s2b'});
 assert.equal(a.sampledCount,3);assert.equal(b.sampledCount,3);
 assert.ok(Math.abs(a.bands[1].value-b.bands[1].value)>1e-5);
});
test('Landsat 8 measured mode returns 4 full visible bands and SHA provenance',()=>{
 const result=implementation.sampleWithResponse(w,ones,'landsat-oli','Rrs',{responseMode:'measured'});
 assert.equal(result.platform,'oli8');
 assert.equal(result.sampledCount,4);
 assert.equal(result.provenance.gitBlobSHA,records.data.oli8.sourceBlobSHA);
});
test('Reduced source domain yields PARTIAL without extrapolation',()=>{
 const partial=implementation.sampleWithResponse(w.slice(100),ones.slice(100),'s2-msi','Rrs',{responseMode:'measured'});
 assert.equal(partial.bands[1].status,'partial');
 assert.equal(partial.bands[1].value,null);
 assert.ok(partial.bands[1].coverageFraction<1);
});
test('Unsupported sensor cannot claim a measured response',()=>{
 const result=implementation.sampleWithResponse(w,ones,'olci','Rrs',{responseMode:'measured'});
 assert.equal(result.actualResponseMode,'unavailable');
 assert.equal(result.responseModel,'measured-unavailable');
});
test('V8 preserves old scene and chart UI, versions load paths and export',()=>{
 assert.match(app,/path-stage-card/);
 assert.match(app,/chart-fix\.js/);
 assert.match(app,/data-response-mode/);
 assert.match(app,/measured-response-data\.js/);
 assert.match(app,/schemaVersion:5/);
 assert.match(app,/responseMode:state\.responseMode/);
 assert.match(upstream,/WATER_WORKBENCH_V8/);
 const token=lab.match(/<meta content="([^"]+)" name="geogeek-lab-release"\/>/)?.[1];
 assert.ok(token,'Lab release metadata');
 assert.ok(lab.includes('core/modules.js?v='+token),'Lab loader cache matches release token');
});
