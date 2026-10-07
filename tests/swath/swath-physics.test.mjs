import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
async function loadPhysics(){const context=vm.createContext({window:{},console,Math});const source=await readFile(new URL('../../site/play/swath/swath-physics.js',import.meta.url),'utf8');vm.runInContext(source,context,{filename:'swath-physics.js'});return context.window.GeoPlaySwathPhysics;}
const close=(a,b,tol=1e-9)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));
test('nadir look intersects at altitude and zero ground arc',async()=>{const p=await loadPhysics(),g=p.lookGeometry(600,0);assert.ok(close(g.slantRangeKm,600,1e-12));assert.ok(close(g.groundArcKm,0,1e-12));});
test('wider FOV increases swath and worsens fixed-detector GSD',async()=>{const p=await loadPhysics(),a=p.compute({altitudeKm:600,fovDeg:10,detectorPixels:6000}),b=p.compute({altitudeKm:600,fovDeg:30,detectorPixels:6000});assert.ok(b.swathKm>a.swathKm*3);assert.ok(b.nadirGsdM>a.nadirGsdM*2.9);assert.ok(close(a.orbitalPeriodMin,b.orbitalPeriodMin,1e-12));});
test('higher altitude increases swath, GSD, and circular-orbit period',async()=>{const p=await loadPhysics(),low=p.compute({altitudeKm:500,fovDeg:15,detectorPixels:6000}),high=p.compute({altitudeKm:900,fovDeg:15,detectorPixels:6000});assert.ok(high.swathKm>low.swathKm);assert.ok(high.nadirGsdM>low.nadirGsdM);assert.ok(high.orbitalPeriodMin>low.orbitalPeriodMin);});
test('more detector samples sharpen GSD without changing swath',async()=>{const p=await loadPhysics(),coarse=p.compute({altitudeKm:600,fovDeg:20,detectorPixels:1500}),fine=p.compute({altitudeKm:600,fovDeg:20,detectorPixels:12000});assert.ok(close(coarse.swathKm,fine.swathKm,1e-12));assert.ok(fine.nadirGsdM<coarse.nadirGsdM/7.9);});
test('edge sampling is never finer than nadir in V1 geometry',async()=>{const p=await loadPhysics();for(const altitudeKm of [350,600,900,1200])for(const fovDeg of [5,15,30,45]){const x=p.compute({altitudeKm,fovDeg,detectorPixels:6000});assert.ok(x.edgeGsdM>=x.nadirGsdM);assert.ok(x.swathKm>0&&x.equatorialCircumferenceFraction<1);}});
