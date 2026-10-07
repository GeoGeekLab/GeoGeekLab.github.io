import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadModel() {
  const context=vm.createContext({window:{},console,Math});
  for (const path of ['../../site/water/water-data.js','../../site/water/water-model.js']) {
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    vm.runInContext(source,context,{filename:path});
  }
  return context.window.GeoWaterModel;
}
const close=(a,b,tol=1e-11)=>Math.abs(a-b)<=tol*Math.max(1,Math.abs(a),Math.abs(b));

test('Water engine returns complete non-negative IOP and AOP spectra', async () => {
  const model=await loadModel();
  const x=model.compute();
  assert.equal(x.wavelengthNm.length,301);
  for (const key of ['aw','aph','ag','aNAP','a','bbw','bbp','bb','u','rrs','Rrs']) {
    assert.equal(x[key].length,301,key);
    assert.ok(x[key].every(Number.isFinite),key);
    assert.ok(x[key].every(v=>v>=0),key);
  }
  for (let i=0;i<301;i++) {
    assert.ok(close(x.a[i],x.aw[i]+x.aph[i]+x.ag[i]+x.aNAP[i]),`a budget ${i}`);
    assert.ok(close(x.bb[i],x.bbw[i]+x.bbp[i]),`bb budget ${i}`);
    assert.ok(x.u[i]>=0 && x.u[i]<1,`u ${i}`);
    assert.ok(1-1.7*x.rrs[i]>0,`Lee02 denominator ${i}`);
  }
});

test('Lee02 interface transform round-trips', async () => {
  const model=await loadModel();
  for (const rrs of [0,0.001,0.01,0.05,0.1]) {
    const Rrs=model.subsurfaceToAbove(rrs);
    assert.ok(close(model.aboveToSubsurface(Rrs),rrs,1e-13));
  }
});

test('CDOM and NAP absorption retain their declared spectral slopes', async () => {
  const model=await loadModel();
  const base=model.compute({ag440:0.05,aNAP443:0.02});
  const moreCdom=model.compute({ag440:0.50,aNAP443:0.02});
  const moreNap=model.compute({ag440:0.05,aNAP443:0.20});
  const i410=10, i650=250;
  assert.ok((moreCdom.ag[i410]-base.ag[i410]) > (moreCdom.ag[i650]-base.ag[i650]));
  assert.ok((moreNap.aNAP[i410]-base.aNAP[i410]) > (moreNap.aNAP[i650]-base.aNAP[i650]));
});

test('Particle absorption and particle backscatter stay independent', async () => {
  const model=await loadModel();
  const base=model.compute({aNAP443:0.02,bbp443:0.002});
  const moreBack=model.compute({aNAP443:0.02,bbp443:0.02});
  const moreAbs=model.compute({aNAP443:0.20,bbp443:0.002});
  assert.ok(moreBack.bb.every((v,i)=>v>base.bb[i]));
  assert.ok(moreBack.a.every((v,i)=>close(v,base.a[i],1e-13)));
  assert.ok(moreAbs.bbp.every((v,i)=>close(v,base.bbp[i],1e-13)));
});

test('Bricaud chlorophyll response uses total exponent 1-B_specific', async () => {
  const model=await loadModel();
  const one=model.compute({Chl:1});
  const ten=model.compute({Chl:10});
  const i440=40;
  const ratio=ten.aph[i440]/one.aph[i440];
  const expected=Math.pow(10,1-0.6350);
  assert.ok(close(ratio,expected,2e-4));
  assert.ok(Math.abs(ratio-10)>1);
});

test('Reference states are numerically stable', async () => {
  const model=await loadModel();
  const ref=JSON.parse(await readFile(new URL('./reference-states.v1.json',import.meta.url),'utf8'));
  for (const [name,entry] of Object.entries(ref.states)) {
    const actual=model.compute(entry.state).Rrs;
    assert.equal(actual.length,entry.Rrs.length,name);
    for (let i=0;i<actual.length;i++) {
      assert.ok(close(actual[i],entry.Rrs[i],2e-11),`${name} Rrs[${i}]`);
    }
  }
});
