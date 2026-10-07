import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCorrectionExperiment,
  correctionDiagnostics,
  olciOc4Chlorophyll,
  recoverRrsFromToa,
  OLCI_OC4_R2022
} from '../../site/water/atmosphere-correction.js';
import {
  ATMOSPHERE_DEFAULT_STATE,
  computeAtmosphereObservation
} from '../../site/water/atmosphere-model.js';
import {
  WATER_REFERENCE_STATES,
  computeWaterOptics
} from '../../site/water/water-model.js';

const close=(a,b,tol=1e-12)=>Math.abs(a-b)<=tol;

test('perfect first-order atmospheric correction closes the forward model',()=>{
  for(const state of Object.values(WATER_REFERENCE_STATES)){
    const water=computeWaterOptics(state);
    const truth={
      ...ATMOSPHERE_DEFAULT_STATE,
      aerosolOpticalDepth550:0.15,
      angstromExponent:1.0
    };
    const forward=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,truth);
    const experiment=buildCorrectionExperiment(
      water.wavelengthNm,
      water.Rrs,
      forward.reflectance.toaApprox,
      truth,
      {aerosolOpticalDepth550:0.15,angstromExponent:1.0}
    );

    assert.ok(experiment.diagnostics.rmse<1e-14);
    assert.ok(experiment.diagnostics.maxAbsoluteError<1e-13);
    assert.equal(experiment.diagnostics.negativeCount,0);
  }
});

test('aerosol over-correction is preserved as negative Rrs rather than clipped',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const truth={
    ...ATMOSPHERE_DEFAULT_STATE,
    aerosolOpticalDepth550:0.15,
    angstromExponent:1.0
  };
  const forward=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,truth);
  const experiment=buildCorrectionExperiment(
    water.wavelengthNm,
    water.Rrs,
    forward.reflectance.toaApprox,
    truth,
    {aerosolOpticalDepth550:0.25,angstromExponent:1.0}
  );

  assert.ok(experiment.diagnostics.rmse>1e-4);
  assert.ok(experiment.diagnostics.negativeCount>0);
  assert.ok(experiment.correction.estimatedRrs.some(v=>v<0));
});

test('wrong Angstrom exponent changes spectral error without changing true Rrs',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.phytoplanktonRich);
  const original=[...water.Rrs];
  const truth={
    ...ATMOSPHERE_DEFAULT_STATE,
    aerosolOpticalDepth550:0.15,
    angstromExponent:0.7
  };
  const forward=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,truth);
  const experiment=buildCorrectionExperiment(
    water.wavelengthNm,
    water.Rrs,
    forward.reflectance.toaApprox,
    truth,
    {aerosolOpticalDepth550:0.15,angstromExponent:2.0}
  );

  assert.deepEqual(water.Rrs,original);
  assert.ok(experiment.diagnostics.rmse>0);
  assert.notEqual(experiment.correction.estimatedRrs[43]-water.Rrs[43],experiment.correction.estimatedRrs[160]-water.Rrs[160]);
});

test('diagnostics report RMSE, signed bias, relative error, and negatives',()=>{
  const truth=[0.01,0.02,0.03,0.04];
  const estimate=[0.011,-0.001,0.025,0.05];
  const d=correctionDiagnostics(truth,estimate);

  assert.equal(d.finiteCount,4);
  assert.equal(d.negativeCount,1);
  assert.ok(d.rmse>0);
  assert.ok(Number.isFinite(d.meanBias));
  assert.ok(d.meanAbsoluteRelativeError>0);
  assert.equal(d.maxAbsoluteError,0.021);
});

test('OLCI OC4 diagnostic uses the declared NASA R2022 coefficient polynomial',()=>{
  const wavelengths=Array.from({length:301},(_,i)=>400+i);
  const Rrs=wavelengths.map(wl=>{
    if(wl===443)return 0.010;
    if(wl===490)return 0.012;
    if(wl===510)return 0.009;
    if(wl===560)return 0.006;
    return 0.007;
  });
  const result=olciOc4Chlorophyll(wavelengths,Rrs);
  const ratio=0.012/0.006;
  const x=Math.log10(ratio);
  const [a0,a1,a2,a3,a4]=OLCI_OC4_R2022.coefficients;
  const expected=Math.pow(10,a0+a1*x+a2*x*x+a3*x*x*x+a4*x*x*x*x);

  assert.equal(result.valid,true);
  assert.ok(close(result.ratio,ratio,1e-14));
  assert.ok(close(result.value,expected,1e-14));
});

test('OC4 diagnostic becomes invalid when required corrected reflectance is non-positive',()=>{
  const wavelengths=Array.from({length:301},(_,i)=>400+i);
  const Rrs=wavelengths.map(()=>0.005);
  Rrs[560-400]=-0.001;
  const result=olciOc4Chlorophyll(wavelengths,Rrs);

  assert.equal(result.valid,false);
  assert.equal(result.value,null);
});

test('recoverRrsFromToa only uses the assumed atmosphere in the inverse',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.turbidParticleRich);
  const truth={
    ...ATMOSPHERE_DEFAULT_STATE,
    aerosolOpticalDepth550:0.20,
    angstromExponent:1.2
  };
  const forward=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,truth);
  const recovered=recoverRrsFromToa(
    water.wavelengthNm,
    forward.reflectance.toaApprox,
    {...truth,aerosolOpticalDepth550:0.10}
  );

  assert.notDeepEqual(recovered.estimatedRrs,water.Rrs);
  assert.ok(recovered.estimatedPathReflectance.every(Number.isFinite));
  assert.ok(recovered.transmission.twoWay.every(v=>v>0&&v<=1));
});
