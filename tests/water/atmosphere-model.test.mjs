import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ATMOSPHERE_DEFAULT_STATE,
  ATMOSPHERE_MODEL_META,
  ATMOSPHERE_STATE_BOUNDS,
  aerosolOpticalThickness,
  computeAtmosphereObservation,
  rayleighOpticalThickness
} from '../../site/water/atmosphere-model.js';
import {
  WATER_REFERENCE_STATES,
  computeWaterOptics
} from '../../site/water/water-model.js';
import { sampleSensorSpectrum } from '../../site/water/sensor-observation.js';

const close=(a,b,tol=1e-12)=>Math.abs(a-b)<=tol;

test('Rayleigh optical thickness follows the declared wavelength and pressure behavior',()=>{
  const t400=rayleighOpticalThickness(400,1013.25);
  const t700=rayleighOpticalThickness(700,1013.25);
  const lowPressure=rayleighOpticalThickness(550,900);
  const standard=rayleighOpticalThickness(550,1013.25);

  assert.ok(t400>t700);
  assert.ok(close(lowPressure/standard,900/1013.25,1e-12));
});

test('aerosol optical thickness follows the Angstrom power law exactly',()=>{
  const tau550=aerosolOpticalThickness(550,0.2,1.3);
  const tau440=aerosolOpticalThickness(440,0.2,1.3);
  assert.ok(close(tau550,0.2,1e-14));
  assert.ok(close(tau440,0.2*Math.pow(440/550,-1.3),1e-14));
});

test('TOA teaching reflectance is the exact sum of declared components',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const atmosphere=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,ATMOSPHERE_DEFAULT_STATE);

  for(let i=0;i<water.wavelengthNm.length;i++){
    const r=atmosphere.reflectance;
    assert.ok(close(
      r.toaApprox[i],
      r.rayleighPath[i]+r.aerosolPath[i]+r.waterTransmitted[i],
      1e-14
    ));
    assert.ok(close(r.waterSurface[i],Math.PI*water.Rrs[i],1e-14));
    assert.ok(atmosphere.transmission.twoWay[i]>0 && atmosphere.transmission.twoWay[i]<=1);
  }
});

test('atmosphere controls do not alter the underlying water spectrum',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.phytoplanktonRich);
  const original=[...water.Rrs];
  computeAtmosphereObservation(water.wavelengthNm,water.Rrs,{
    aerosolOpticalDepth550:0.4,
    angstromExponent:2,
    pressureHpa:900,
    solarZenithDeg:60,
    viewZenithDeg:40,
    relativeAzimuthDeg:20
  });
  assert.deepEqual(water.Rrs,original);
});

test('zero aerosol optical depth removes the aerosol path term',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const atmosphere=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,{aerosolOpticalDepth550:0});
  assert.ok(atmosphere.reflectance.aerosolPath.every(v=>v===0));
});

test('accepted atmosphere envelope stays finite, non-negative, and below unit TOA reflectance',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.turbidParticleRich);
  const grid={
    aerosolOpticalDepth550:[0,0.05,0.2,0.5],
    angstromExponent:[0,0.7,1.5,2.5],
    pressureHpa:[800,1013.25,1050],
    solarZenithDeg:[0,30,65],
    viewZenithDeg:[0,25,50],
    relativeAzimuthDeg:[0,90,180]
  };
  let checked=0,maxToa=0;

  for(const aerosolOpticalDepth550 of grid.aerosolOpticalDepth550)
  for(const angstromExponent of grid.angstromExponent)
  for(const pressureHpa of grid.pressureHpa)
  for(const solarZenithDeg of grid.solarZenithDeg)
  for(const viewZenithDeg of grid.viewZenithDeg)
  for(const relativeAzimuthDeg of grid.relativeAzimuthDeg){
    const out=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,{
      aerosolOpticalDepth550,angstromExponent,pressureHpa,solarZenithDeg,viewZenithDeg,relativeAzimuthDeg
    });
    checked++;
    for(const values of [
      out.tau.rayleigh,out.tau.aerosol,out.transmission.down,out.transmission.up,out.transmission.twoWay,
      out.reflectance.waterSurface,out.reflectance.waterTransmitted,out.reflectance.rayleighPath,
      out.reflectance.aerosolPath,out.reflectance.toaApprox,out.atmosphereFraction
    ]){
      assert.ok(values.every(Number.isFinite));
      assert.ok(values.every(v=>v>=0));
    }
    maxToa=Math.max(maxToa,...out.reflectance.toaApprox);
  }

  assert.equal(checked,1296);
  assert.ok(maxToa<1);
});

test('sensor band averaging samples TOA teaching reflectance, not surface Rrs',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const atmosphere=computeAtmosphereObservation(water.wavelengthNm,water.Rrs,ATMOSPHERE_DEFAULT_STATE);
  const toaBands=sampleSensorSpectrum(water.wavelengthNm,atmosphere.reflectance.toaApprox,'s2-msi','rhoTOA*');
  const waterBands=sampleSensorSpectrum(water.wavelengthNm,water.Rrs,'s2-msi','Rrs');

  assert.equal(toaBands.quantity,'rhoTOA*');
  assert.equal(toaBands.bands.length,4);
  assert.notDeepEqual(
    toaBands.bands.map(b=>b.value),
    waterBands.bands.map(b=>b.value)
  );
});

test('declared atmosphere teaching constants remain explicit',()=>{
  assert.equal(ATMOSPHERE_MODEL_META.aerosolSingleScatteringAlbedo,0.95);
  assert.equal(ATMOSPHERE_MODEL_META.aerosolAsymmetry,0.70);
  assert.deepEqual(ATMOSPHERE_STATE_BOUNDS.aerosolOpticalDepth550,[0,0.5]);
  assert.deepEqual(ATMOSPHERE_STATE_BOUNDS.solarZenithDeg,[0,65]);
});
