import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {
  WATER_MODEL_META,
  WATER_WAVELENGTHS_NM,
  WATER_REFERENCE_STATES,
  WATER_STATE_BOUNDS,
  computeWaterOptics,
  subsurfaceToAboveWater,
  aboveWaterToSubsurface
} from '../../site/water/water-model.js';

const close=(a,b,tol=1e-12)=>Math.abs(a-b)<=tol;
const allFinite=values=>values.every(Number.isFinite);
const allNonNegative=values=>values.every(v=>v>=0);

test('V1 model domain is 400-700 nm at 1 nm',()=>{
  assert.equal(WATER_MODEL_META.wavelengthMinNm,400);
  assert.equal(WATER_MODEL_META.wavelengthMaxNm,700);
  assert.equal(WATER_WAVELENGTHS_NM.length,301);
  assert.equal(WATER_WAVELENGTHS_NM[43],443);
  assert.equal(WATER_WAVELENGTHS_NM.at(-1),700);
});

test('component identities and physical bounds hold for every reference state',()=>{
  for(const state of Object.values(WATER_REFERENCE_STATES)){
    const out=computeWaterOptics(state),n=WATER_WAVELENGTHS_NM.length;
    for(const values of [out.absorption.water,out.absorption.phytoplankton,out.absorption.cdom,out.absorption.nap,out.absorption.total,out.backscattering.water,out.backscattering.particles,out.backscattering.total,out.u,out.rrs,out.Rrs]){
      assert.equal(values.length,n); assert.ok(allFinite(values)); assert.ok(allNonNegative(values));
    }
    for(let i=0;i<n;i++){
      const asum=out.absorption.water[i]+out.absorption.phytoplankton[i]+out.absorption.cdom[i]+out.absorption.nap[i];
      const bsum=out.backscattering.water[i]+out.backscattering.particles[i];
      assert.ok(close(out.absorption.total[i],asum,1e-11));
      assert.ok(close(out.backscattering.total[i],bsum,1e-11));
      assert.ok(out.u[i]>=0&&out.u[i]<1);
      assert.ok(1-1.7*out.rrs[i]>0);
    }
  }
});

test('rrs/Rrs interface transformation round-trips',()=>{
  for(const x of [0,0.0001,0.001,0.01,0.05]){
    const R=subsurfaceToAboveWater(x);
    assert.ok(close(aboveWaterToSubsurface(R),x,1e-14));
  }
});

test('CDOM preferentially changes short-visible absorption',()=>{
  const low=computeWaterOptics({ag440:0.05}),high=computeWaterOptics({ag440:0.50});
  assert.ok(high.absorption.cdom[43]-low.absorption.cdom[43] > high.absorption.cdom[265]-low.absorption.cdom[265]);
  assert.deepEqual(low.backscattering.particles,high.backscattering.particles);
});

test('NAP absorption and particle backscatter remain independent',()=>{
  const base=computeWaterOptics(),moreNap=computeWaterOptics({aNap443:0.5}),moreBbp=computeWaterOptics({bbp443:0.02});
  assert.deepEqual(base.backscattering.particles,moreNap.backscattering.particles);
  assert.deepEqual(base.absorption.nap,moreBbp.absorption.nap);
  assert.notDeepEqual(base.absorption.nap,moreNap.absorption.nap);
  assert.notDeepEqual(base.backscattering.particles,moreBbp.backscattering.particles);
});

test('chlorophyll changes Bricaud phytoplankton absorption nonlinearly',()=>{
  const low=computeWaterOptics({chl:0.1}),high=computeWaterOptics({chl:10}),i=43;
  assert.ok(high.absorption.phytoplankton[i]>low.absorption.phytoplankton[i]);
  const ratio=high.absorption.phytoplankton[i]/low.absorption.phytoplankton[i];
  assert.notEqual(Math.round(ratio*1e8)/1e8,100);
});

test('state validation rejects values outside the scientific contract',()=>{
  for(const [name,[min,max]] of Object.entries(WATER_STATE_BOUNDS)){
    assert.throws(()=>computeWaterOptics({[name]:min-(Math.abs(min)||1)*0.01-1e-9}),RangeError);
    assert.throws(()=>computeWaterOptics({[name]:max+(Math.abs(max)||1)*0.01+1e-9}),RangeError);
  }
});

test('reference Rrs spectra match committed regression fixture',()=>{
  const fixture=JSON.parse(fs.readFileSync(new URL('./reference-rrs.json',import.meta.url),'utf8'));
  assert.deepEqual(fixture.wavelengthNm,WATER_WAVELENGTHS_NM);
  for(const [name,record] of Object.entries(fixture.referenceStates)){
    const actual=computeWaterOptics(record.state).Rrs.map(x=>Number(x.toFixed(12)));
    assert.deepEqual(actual,record.Rrs,name);
  }
});
