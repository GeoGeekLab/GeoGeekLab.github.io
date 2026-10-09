import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../v102-physics-views.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=(base,name)=>fs.readFileSync(path.join(base,name),'utf8');
const newer=read(root,'app/index.html'),older=read(path.resolve(root,'../workbench-v10-1'),'app/index.html');
const V=globalThis.GeoGeekV102PhysicsViews;
function bundle(source){
 const a=source.indexOf('const __factories='),b=source.indexOf('</script>',a);
 assert.ok(a>0&&b>a);
 return new Function(source.slice(a,b).replace("__require('main.js');","return __require;"))();
}
const req=bundle(newer),oldReq=bundle(older);
const {PSETS,initialParams,stageData}=req('core/config.js');
const adapter=req('model/geogeek-adapter.js').geogeekAdapter;
const oldAdapter=oldReq('model/geogeek-adapter.js').geogeekAdapter;
const mockCharts={
 chartSvg:(series,key,opts)=>'<svg data-test-mode="'+key+'" role="img" aria-label="'+series[0].label+' '+opts.unit+'"></svg>',
 chartFrame:(title,subtitle,series,key)=>'<figure data-test-mode="'+key+'"><figcaption>'+title+' '+subtitle+'</figcaption></figure>'
};
function sample(name='clear'){
 const params={...initialParams,...PSETS[name]};
 return {params,data:adapter.compute(params),state:{stage:'water',probe:443,params,plot:'all'}};
}
test('UX-061: path has five conceptual stages separate from computed readouts',()=>{
 const {state,data}=sample();
 const html=V.path(state,data,stageData);
 assert.equal((html.match(/class="path-stage-card/g)||[]).length,5);
 assert.equal((html.match(/data-stage="/g)||[]).length,5);
 for(const id of ['sun','atm','surface','water','sat'])assert.match(html,new RegExp('data-stage="'+id+'"'));
 for(const phrase of ['SCHEMATIC ONLY','not calculated photon trajectories','ACTUAL COMPUTED MODEL VALUES',
  'does not solve an angle-resolved','not in this schematic','data-goto="iop"',
  'Choosing a stage changes only the explanation','Simulated TOA ρ*'])assert.ok(html.includes(phrase),phrase);
 assert.match(html,/aria-pressed="true"/);
 assert.match(html,/Input \/ conditions/);
});
test('UX-061: stage selection does not change model arrays or water parameters',()=>{
 const {state,data,params}=sample(),oldParams=JSON.stringify(params);
 const before=V.path(state,data,stageData);
 const after=V.path({...state,stage:'atm'},data,stageData);
 assert.notEqual(before,after);
 assert.equal(JSON.stringify(params),oldParams);
 const aValue=Math.abs(data.a[43])<.001?data.a[43].toExponential(4):data.a[43].toFixed(5);
 assert.ok(before.includes(aValue),'same computed absorption in path view');
 assert.ok(after.includes(aValue),'focus selection does not replace modeled data');
});
test('UX-062: IOP/AOP view gives three distinct quantities, units and models',()=>{
 const {state,data}=sample(),html=V.optics(state,data,mockCharts);
 for(const phrase of ['IOP / ABSORPTION','IOP / BACKSCATTERING','AOP / ABOVE-WATER REFLECTANCE',
 'not total scattering b','not provided by this semi-analytical','m⁻¹','sr⁻¹',
 'data-test-mode="a"','data-test-mode="bb"','data-test-mode="rrs"',
 'max |a − Σparts|','max |bb − Σparts|','Component sums agree','V9-compatible'])
  assert.ok(html.includes(phrase),phrase);
 assert.equal((html.match(/class="p6-spectrum"/g)||[]).length,3);
});
test('UX-062: component sums and V10.1 spectral arrays remain invariant across four water states',()=>{
 for(const name of Object.keys(PSETS)){
  const {params,data}=sample(name),c=V.closure(data),before=oldAdapter.compute(params);
  assert.ok(c.maximumA<=1e-10,name+' a closure '+c.maximumA);
  assert.ok(c.maximumBb<=1e-10,name+' bb closure '+c.maximumBb);
  for(const key of ['a','bb','rrs','subsurfaceRrs','toa'])assert.deepEqual(data[key],before[key],name+'/'+key);
 }
});
test('UX-062: semantically valid numeric table samples the 1-nm model',()=>{
 const {state,data}=sample(),html=V.spectralTable(data,state.probe);
 assert.match(html,/<table><caption>/);
 assert.match(html,/<th scope="col">/);
 assert.match(html,/<th scope="row">443<\/th>/);
 assert.match(html,/tabindex="0"/);
 assert.match(html,/all 301 modeled wavelengths/);
 assert.equal((html.match(/<tr/g)||[]).length,15);
 assert.ok(html.includes(data.rrs[43].toExponential(5))||html.includes(data.rrs[43].toFixed(6)));
});
test('UX-062: individual plot keys and exploratory slope classification remain intact',()=>{
 const {state,data}=sample();
 for(const key of ['rrs','a','bb']){
  const html=V.optics({...state,plot:key},data,mockCharts);
  assert.equal((html.match(/data-test-mode="/g)||[]).length,1,key);
  assert.match(html,new RegExp('data-test-mode="'+key+'"'));
  assert.match(html,/IOP \/ ABSORPTION/);
 }
 assert.match(V.optics({...state,params:{...state.params,sg:.019}},data,mockCharts),/EXPLORATORY SLOPE VARIANT/);
 const css=read(root,'v102-physics.css');
 for(const item of ['max-width:100%','overflow-x:auto','.p6-stage-grid','.p6-table-scroll',':focus-visible'])assert.ok(css.includes(item),item);
 assert.deepEqual(req('core/config.js').plots,oldReq('core/config.js').plots);
 assert.match(newer,/v102-physics-views\.js\?v=10\.2\.0-p6a/);
 assert.match(newer,/schemaVersion:8/);
});
