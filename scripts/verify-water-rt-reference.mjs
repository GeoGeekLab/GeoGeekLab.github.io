#!/usr/bin/env node
/** Verify (or --write regenerate) every committed V10.1 reference record
 * from the unchanged V10.0 semi-analytical IOP implementation and independent
 * scalar DOM numerical solver. No external RT validation is claimed.
 */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {solveRT,SOLVER_VERSION,ANGLES,HG_BB_FRACTION} from '../site/water/workbench-v10-1/reference/dom-solver.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'site/water/workbench-v10-1/reference/rt-reference-v1.json');
const data=JSON.parse(fs.readFileSync(file,'utf8'));
const app=fs.readFileSync(path.join(root,'site/water/workbench-v10/app/index.html'),'utf8');
const i=app.indexOf('const __factories='),j=app.indexOf('</script>',i);
const req=new Function(app.slice(i,j).replace("__require('main.js');","return __require;"))();
const {geogeekAdapter}=req('model/geogeek-adapter.js');
const {initialParams,PSETS}=req('core/config.js');
function assert(ok,msg){if(!ok)throw new Error(msg);}
function close(x,y,rtol=5e-7){return Number.isFinite(x)&&Number.isFinite(y)&&Math.abs(x-y)<Math.max(1e-9,rtol*Math.max(1,Math.abs(x),Math.abs(y)));}
assert(data.schema==='water-rt-reference-v1','schema mismatch');
assert(data.referenceEngine===SOLVER_VERSION,'RT solver version mismatch');
assert(close(data.phase.backscatterFraction,HG_BB_FRACTION),'phase fraction mismatch');
assert(JSON.stringify(data.grid.upwardMu)===JSON.stringify(ANGLES),'angular grid mismatch');
let checked=0,largest=0;
for(const c of data.cases){
 assert(PSETS[c.id],'unknown water state '+c.id);
 const params={...initialParams,...PSETS[c.id],sg:.0176,snap:.0123};
 for(const key of ['chl','ag','anap','bbp','eta','sg','snap'])assert(c.params[key]===params[key],c.id+' param drift '+key);
 const semi=geogeekAdapter.compute(params);
 for(const sun of data.grid.sunZenithDeg)for(const nm of data.grid.wavelengthNm){
  const r=c.records.find(v=>v.nm===nm&&v.sza===sun);assert(r,c.id+' missing '+sun+'/'+nm);
  const i=nm-400,calc=solveRT({a:semi.a[i],bb:semi.bb[i],sza:sun});
  assert(close(r.a,semi.a[i])&&close(r.bb,semi.bb[i]),c.id+' IOP mismatch');
  assert(close(r.semiRrs,semi.subsurfaceRrs[i]),c.id+' semi mismatch');
  assert(calc.iterations<=120&&calc.residual<2e-6,c.id+' source iteration failure');
  for(const key of ['Ed','Eu','Kd']){
   assert(r[key].length===calc[key].length,key+' depth dimensions');
   for(let k=0;k<r[key].length;k++){
    largest=Math.max(largest,Math.abs(r[key][k]-calc[key][k]));
    assert(close(r[key][k],calc[key][k]),c.id+' '+sun+'/'+nm+' '+key+'['+k+']');
   }
  }
  for(let k=0;k<calc.Lu.length;k++){
   for(let a=0;a<ANGLES.length;a++)assert(close(r.Lu[k][a],calc.Lu[k][a]),'upwelling angular radiance mismatch');
  }
  assert(close(r.rrs,calc.rrs),'subsurface near-nadir reference mismatch');
  assert(Math.abs(r.Ed[0]-1)<1e-9,'incorrect normalized direct boundary');
  assert(r.Ed.every(v=>v>=0)&&r.Eu.every(v=>v>=0),'negative irradiance');
  assert(r.Kd.every(Number.isFinite),'invalid Kd');
  checked++;
 }
}
assert(checked===45,'reference count must be 45');
console.log('Water RT self-consistency OK: '+checked+' DOM slices, 3 cases, 3 sun angles, 5 wavelengths, 10 depth levels, 8 upward Gauss directions. Max abs diff '+largest+'. EXTERNAL CROSS-VALIDATION: NOT DONE.');
