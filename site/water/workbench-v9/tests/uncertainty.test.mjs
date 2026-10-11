import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../analysis/uncertainty-engine.js';
const E=globalThis.GeoGeekV9Engine;
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const lab=fs.readFileSync(path.join(root,'../../lab.html'),'utf8');
const loader=fs.readFileSync(path.join(root,'../../core/modules.js'),'utf8');
const srf=fs.readFileSync(path.join(root,'srf/measured-response-data.js'),'utf8');
const metadata={chl:{min:.02,max:25},ag:{min:0,max:2},anap:{min:0,max:1},bbp:{min:.0001,max:.03},eta:{min:0,max:3}};
const params={chl:1,ag:.05,anap:.02,bbp:.002,eta:1};
const mock=(expr,ids=['B1','B2','B3'])=>{
 const models={run:p=>({bands:expr(p)})};
 const sample=d=>({sensor:{label:'TEST sensor'},responseModel:'defined-test-srf',
   bands:d.bands.map((v,i)=>({id:ids[i],value:v,centerNm:450+50*i,status:'full'}))});
 return {models,sample};
};
const base=(o={})=>({...mock(p=>[.0001*p.chl+.003*p.ag,.0002*p.chl-.001*p.ag,.00015*p.chl]),params,bounds:metadata,noiseSigma:.00002,stepPercent:5,selected:['chl','ag'],...o});
test('Eigensystem reproduces symmetric analytic 2×2 cases',()=>{
 const i=E.diagnoseFisher([[1,0],[0,1]],1,[1,1]);
 assert.equal(i.rank,2);assert.deepEqual(i.uncertainties,[1,1]);assert.equal(i.condition,1);
 const dependent=E.diagnoseFisher([[1,1],[2,2]],1,[1,1]);
 assert.equal(dependent.rank,1);assert.equal(dependent.covariance,null);
 assert.equal(dependent.correlation,null);assert.equal(dependent.uncertainties,null);
});
test('Parameter covariance scales linearly with assumed noise sigma, quadratically with variance',()=>{
 const low=E.analyze(base()),high=E.analyze(base({noiseSigma:.0001}));
 assert.equal(low.rank,2);assert.equal(high.rank,2);
 low.uncertainties.forEach((v,i)=>assert.ok(Math.abs(high.uncertainties[i]/v-5)<1e-9));
 assert.equal(low.noise.source,'user-assumed, not instrument specification');
});
test('A two-band observation cannot identify 3–5 fitted water parameters',()=>{
 const low=mock(p=>[p.chl*.0001+p.ag*.003+p.anap*.002,p.chl*.0002-p.ag*.001],['B1','B2']);
 const r=E.analyze({...base(),...low,selected:['chl','ag','anap','bbp','eta']});
 assert.equal(r.numberOfMeasurements,2);assert.ok(r.rank<=2);
 assert.equal(r.identifiable,false);assert.equal(r.uncertainties,null);
 assert.match(r.interpretation,/not locally identifiable/);
});
test('Constant spectra in all parameters must return rank zero',()=>{
 const m=mock(()=>[.002,.002,.002]);
 const a=E.analyze({...base(),...m});
 assert.equal(a.rank,0);assert.equal(a.status,'rank-deficient');assert.equal(a.covariance,null);
});
test('A parameter at its physical bound uses a one-sided derivative',()=>{
 const p={...params,ag:0};
 const a=E.analyze(base({params:p}));
 const record=a.perturbations.find(x=>x.parameter==='ag');
 assert.equal(record.lower,0);assert.equal(record.mode,'forward');
 assert.ok(Math.abs(a.observations[0].derivatives[1]-.003)<1e-12);
});
test('Physical parameter units and scale-normalized Jacobian are not silently conflated',()=>{
 const a=E.analyze(base());
 assert.ok(Math.abs(a.observations[0].derivatives[0]-.0001)<1e-12);
 assert.ok(Math.abs(a.observations[0].derivatives[1]-.003)<1e-12);
 assert.equal(a.definitions.find(x=>x.id==='ag').scale,.1);
 assert.equal(a.definitions.find(x=>x.id==='chl').unit,'mg m⁻³');
});
test('Measured response gaps are excluded, never infilled',()=>{
 const m=mock(p=>[p.chl*.0001,p.ag*.002,p.chl*.0002]);
 const sample=d=>({sensor:{label:'MSI'},responseModel:'published-measured-1nm-srf',provenance:{gitBlobSHA:'abc'},
  bands:d.bands.map((v,i)=>({id:'B'+(i+1),status:i===0?'unavailable':'full',value:i===0?null:v,centerNm:450+i*50}))});
 const a=E.analyze({...base(),models:m.models,sample});
 assert.equal(a.numberOfMeasurements,2);
 assert.equal(a.dropped[0].status,'unavailable');
 assert.equal(a.source.provenance.gitBlobSHA,'abc');
});
test('Uncertainty mode rejects unsupported noise and duplicate parameter keys',()=>{
 assert.throws(()=>E.analyze(base({noiseSigma:1e-7})),/noise sigma/);
 assert.throws(()=>E.analyze(base({selected:['chl','chl']})),/parameter selection/);
});
test('Bundled V9 has 8 tabs, 3 matrix modes, schema 6 and persistent noise controls',()=>{
 for(const text of ['UNCERTAINTY','data-u9-parameter','data-u9-sigma','data-u9-step',
 'workspaces/uncertainty.js','uncertaintyAndIdentifiability','schemaVersion:6',
 'water_ui_geo_v9','chart-fix.js','measured-response-data.js'])assert.ok(app.includes(text),text);
 const release=lab.match(/<meta content="([^"]+)" name="geogeek-lab-release"\s*\/>/)?.[1];
 assert.ok(release,'Expected current Lab release metadata');
 assert.match(release,/^20\d{6}[a-z0-9]+$/i);
 assert.ok(lab.includes('core/modules.js?v='+release+'"'),'Lab loader must use the authored release token');
 assert.match(loader,/WATER_WORKBENCH_V9/);
 assert.match(srf,/be6c8291507aadfb75d9abcef6689be1600144dd/);
});
