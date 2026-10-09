import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const data=JSON.parse(fs.readFileSync(path.join(root,'../workbench-v10-1/reference/rt-reference-v1.json'),'utf8'));
const req=new Function(app.slice(app.indexOf('const __factories='),app.indexOf('</script>',app.indexOf('const __factories='))).replace("__require('main.js');","return __require;"))();
const {validateSession}=req('core/session-store.js'),views=req('components/rt-science-views.js');
const rtWorkspace=req('workspaces/rt.js').rtWorkspace;
function mock({status='ready',matched=false,error=''}={}){
 globalThis.GeoGeekRT101={status,error,dataset:data,caseData:id=>data.cases.find(c=>c.id===id),
  record:(id,sza,nm)=>data.cases.find(c=>c.id===id)?.records.find(x=>x.sza===sza&&x.nm===nm),
  matches:()=>matched,depths:data.grid.depthM,suns:data.grid.sunZenithDeg,wavelengths:data.grid.wavelengthNm,ids:data.cases.map(c=>c.id)};
}
function markup(plot='depth',overrides={}){
 const state=validateSession({tab:'rt',plot, ...overrides});
 return rtWorkspace.renderChart({state});
}
test('UX-RT4-01 profile axes are physically explicit, downward depth and logarithmic irradiance',()=>{
 mock();const html=markup();
 assert.equal((html.match(/class="rt-svg/g)||[]).length,2);
 for(const x of ['z increases downward','Depth z (m)','log10 scale','10^-','Finite-difference estimate','not an independent field measurement'])assert.ok(html.includes(x),x);
 assert.match(html,/rt-science-conditions/);
 assert.match(html,/rt-science-results/);
 assert.match(html,/View exact sampled values/);
 const caption='Discrete irradiance and attenuation';
 assert.ok(html.includes(caption));
 assert.equal((html.match(/<tr>/g)||[]).length,11);
});
test('UX-RT4-02 radiance is eight azimuth-averaged nodes with directional cosine not wavelength axis',()=>{
 mock();const html=markup('angular',{rtDepth:5,rtWl:550});
 assert.equal((html.match(/class="rt-svg/g)||[]).length,1);
 assert.match(html,/\|μ\| = \|cos\(upward zenith\)\|/);
 assert.match(html,/NOT a 2D/);
 assert.match(html,/not exactly μ = −1/);
 const svg=html.match(/<svg[^>]*>[\s\S]*?<\/svg>/)?.[0]||'';
 assert.ok(!svg.includes('Wavelength (nm)'), 'Angle SVG accidentally labeled as wavelength');
 assert.match(html,/Azimuth-averaged upward radiance/);
 assert.equal((html.match(/<tr>/g)||[]).length,9);
});
test('UX-RT4-03 matched spectra are fixed five-node subsurface rrs and signed Δ, not validation',()=>{
 mock();const html=markup('compare',{rtCase:'phyto',rtSun:60});
 assert.equal((html.match(/class="rt-svg/g)||[]).length,2);
 for(const x of ['Signed model discrepancy','PAIRWISE SPECTRAL RMSE','MEAN BIAS','Δr_rs','not evidence of accuracy','subsurface r_rs'])assert.ok(html.includes(x),x);
 assert.match(html,/Discrete markers are not a continuous sensor spectrum/);
 assert.equal((html.match(/<tr>/g)||[]).length,6);
 const c=data.cases.find(x=>x.id==='phyto').records.filter(r=>r.sza===60);
 const residuals=c.map(x=>x.semiRrs-x.rrs);
 const bias=residuals.reduce((x,y)=>x+y,0)/5;
 const rmse=Math.sqrt(residuals.reduce((x,y)=>x+y*y,0)/5);
 assert.ok(html.includes(views.fmtSigned(bias)));
 assert.ok(html.includes(views.fmt(rmse,6)));
});
test('UX-RT4-04 actual preset matches only on prescribed current IOP and solar state',()=>{
 mock({matched:false});const unmatched=markup('depth');
 assert.match(unmatched,/data-rt-apply="1"/);
 assert.match(unmatched,/Both models|BOTH models/);
 assert.match(unmatched,/does not.*current Water Optics sliders|not the current Water Optics sliders/);
 mock({matched:true});const matched=markup('depth');
 assert.match(matched,/Current IOP state matches/);
 assert.ok(!matched.includes('data-rt-apply="1"'));
});
test('UX-RT4-05 data loading failure must not render values or substitute semi-analytical results',()=>{
 mock({status:'error',error:'HTTP 404'});
 const html=markup('compare');
 assert.match(html,/Reference dataset unavailable/);
 assert.match(html,/No simulated light-field values will be invented/);
 assert.equal((html.match(/class="rt-svg/g)||[]).length,0);
 assert.match(html,/data-rt-retry="1"/);
});
test('UX-RT4-06 chart primitives handle zero or signed observations without NaNs',()=>{
 const chart=views.depthProfile({title:'Zero trace',desc:'Nonnegative',depths:[0,5,10],selectedDepth:5,
  axisTitle:'Normalized irradiance',log:true,series:[{label:'Down',color:'#ffffff',data:[1,.1,.01]},{label:'Zero',color:'#cccccc',data:[0,0,0]}]});
 assert.ok(!chart.includes('NaN')&&!chart.includes('Infinity'));
 assert.match(chart,/role="img"/);
 const resid=views.residualChart({title:'Signed',desc:'Around zero',xs:[440,490,550],values:[-.0001,0,.0002]});
 assert.match(resid,/Δr_rs/);
 assert.ok(!resid.includes('NaN'));
});
