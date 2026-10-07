import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WATER_MODEL_META,
  WATER_WAVELENGTHS_NM,
  WATER_REFERENCE_STATES,
  WATER_STATE_BOUNDS,
  computeWaterOptics,
  cdomAbsorption,
  napAbsorption,
  particleBackscatter,
  subsurfaceToAboveWater,
  aboveWaterToSubsurface
} from '../../site/water/water-model.js';

const close=(a,b,tol=1e-12)=>Math.abs(a-b)<=tol;
const idx=wl=>wl-WATER_MODEL_META.wavelengthMinNm;

test('empirical and pedagogical parameter boundaries are explicit',()=>{
  assert.deepEqual(WATER_STATE_BOUNDS.chl,[0.02,25]);
  assert.equal(WATER_MODEL_META.cdomSlopeNm1,0.0176);
  assert.equal(WATER_MODEL_META.napSlopeNm1,0.0123);
  assert.equal(WATER_MODEL_META.cdomReferenceNm,440);
  assert.equal(WATER_MODEL_META.napReferenceNm,443);
  assert.equal(WATER_MODEL_META.particleBackscatterReferenceNm,443);
});

test('declared spectral forms are reproduced exactly at diagnostic wavelengths',()=>{
  const ag=cdomAbsorption(0.5);
  assert.ok(close(ag[idx(440)],0.5));
  assert.ok(close(ag[idx(500)]/ag[idx(440)],Math.exp(-0.0176*60),1e-12));

  const nap=napAbsorption(0.4);
  assert.ok(close(nap[idx(443)],0.4));
  assert.ok(close(nap[idx(600)]/nap[idx(443)],Math.exp(-0.0123*(600-443)),1e-12));

  const bbp=particleBackscatter(0.01,1);
  assert.ok(close(bbp[idx(443)],0.01));
  assert.ok(close(bbp[idx(665)]/bbp[idx(443)],443/665,1e-12));
});

test('accepted state envelope remains finite, non-negative, and inside the interface domain',()=>{
  const grid={
    chl:[0.02,0.1,1,10,25],
    ag440:[0,0.02,0.2,0.8,2],
    aNap443:[0,0.02,0.2,0.5,1],
    bbp443:[0.0001,0.0007,0.002,0.01,0.03],
    eta:[0,0.5,1,1.5,2]
  };

  let checked=0;
  let minInterfaceDenominator=Infinity;
  let maxRrs=0;

  for(const chl of grid.chl)
  for(const ag440 of grid.ag440)
  for(const aNap443 of grid.aNap443)
  for(const bbp443 of grid.bbp443)
  for(const eta of grid.eta){
    const out=computeWaterOptics({chl,ag440,aNap443,bbp443,eta});
    checked++;
    for(let i=0;i<WATER_WAVELENGTHS_NM.length;i++){
      const arrays=[
        out.absorption.water[i],out.absorption.phytoplankton[i],out.absorption.cdom[i],out.absorption.nap[i],out.absorption.total[i],
        out.backscattering.water[i],out.backscattering.particles[i],out.backscattering.total[i],
        out.u[i],out.rrs[i],out.Rrs[i]
      ];
      assert.ok(arrays.every(Number.isFinite));
      assert.ok(arrays.every(v=>v>=0));
      assert.ok(out.u[i]<1);
      const denominator=1-1.7*out.rrs[i];
      assert.ok(denominator>0);
      minInterfaceDenominator=Math.min(minInterfaceDenominator,denominator);
      maxRrs=Math.max(maxRrs,out.Rrs[i]);
    }
  }

  assert.equal(checked,3125);
  assert.ok(minInterfaceDenominator>0.73);
  assert.ok(maxRrs<0.12);
});

test('interface transform remains reversible across the modeled reflectance envelope',()=>{
  for(const rrs of [0,0.001,0.01,0.05,0.10,0.15]){
    const Rrs=subsurfaceToAboveWater(rrs);
    assert.ok(close(aboveWaterToSubsurface(Rrs),rrs,1e-13));
  }
});

test('isolated optical interventions have the model-declared monotonic direction',()=>{
  const base={chl:1,ag440:0.05,aNap443:0.02,bbp443:0.002,eta:1};
  const low=computeWaterOptics(base);
  const moreCdom=computeWaterOptics({...base,ag440:0.5});
  const moreNap=computeWaterOptics({...base,aNap443:0.5});
  const moreBbp=computeWaterOptics({...base,bbp443:0.02});
  const moreChl=computeWaterOptics({...base,chl:10});

  for(let i=0;i<WATER_WAVELENGTHS_NM.length;i++){
    assert.ok(moreCdom.absorption.total[i]>=low.absorption.total[i]);
    assert.ok(moreCdom.Rrs[i]<=low.Rrs[i]);
    assert.ok(moreNap.absorption.total[i]>=low.absorption.total[i]);
    assert.ok(moreNap.Rrs[i]<=low.Rrs[i]);
    assert.ok(moreBbp.backscattering.total[i]>=low.backscattering.total[i]);
    assert.ok(moreBbp.Rrs[i]>=low.Rrs[i]);
  }

  assert.deepEqual(moreChl.backscattering.total,low.backscattering.total);
  assert.deepEqual(moreChl.absorption.cdom,low.absorption.cdom);
  assert.deepEqual(moreChl.absorption.nap,low.absorption.nap);
});

test('pedagogical reference states retain their declared diagnostic behavior',()=>{
  const clear=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const phyto=computeWaterOptics(WATER_REFERENCE_STATES.phytoplanktonRich);
  const cdom=computeWaterOptics(WATER_REFERENCE_STATES.cdomRich);
  const particle=computeWaterOptics(WATER_REFERENCE_STATES.turbidParticleRich);

  assert.ok(clear.Rrs[idx(443)]>clear.Rrs[idx(665)]);
  assert.ok(phyto.absorption.phytoplankton[idx(443)]>clear.absorption.phytoplankton[idx(443)]);
  assert.ok(cdom.Rrs[idx(443)]<cdom.Rrs[idx(560)]);
  assert.ok(particle.backscattering.particles[idx(443)]>clear.backscattering.particles[idx(443)]);
  assert.ok(particle.Rrs[idx(560)]>clear.Rrs[idx(560)]);
});
