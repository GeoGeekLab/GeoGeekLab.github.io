import test from 'node:test';
import assert from 'node:assert/strict';
import {
  WATER_SENSOR_DEFINITIONS,
  WATER_SENSOR_ORDER,
  rectangularBandAverage,
  sampleSensorRrs
} from '../../site/water/sensor-observation.js';
import {
  WATER_WAVELENGTHS_NM,
  WATER_REFERENCE_STATES,
  computeWaterOptics
} from '../../site/water/water-model.js';

test('sensor catalogue exposes four declared teaching sensors',()=>{
  assert.deepEqual(WATER_SENSOR_ORDER,['olci','pace-oci','s2-msi','landsat-oli']);
  assert.equal(WATER_SENSOR_DEFINITIONS.olci.bands.length,10);
  assert.equal(WATER_SENSOR_DEFINITIONS['pace-oci'].bands.length,60);
  assert.equal(WATER_SENSOR_DEFINITIONS['s2-msi'].bands.length,4);
  assert.equal(WATER_SENSOR_DEFINITIONS['landsat-oli'].bands.length,4);
});

test('rectangular bandpass exactly preserves a constant spectrum',()=>{
  const wavelengths=[400,401,402,403,404,405,406,407,408,409,410];
  const values=wavelengths.map(()=>0.01234);
  const out=rectangularBandAverage(wavelengths,values,405,6);
  assert.equal(out.status,'full');
  assert.ok(Math.abs(out.value-0.01234)<1e-14);
});

test('a band whose full support exceeds the water-model domain is not numerically sampled',()=>{
  const values=WATER_WAVELENGTHS_NM.map(()=>1);
  const out=rectangularBandAverage(WATER_WAVELENGTHS_NM,values,400,15);
  assert.equal(out.status,'partial');
  assert.equal(out.value,null);
  assert.ok(out.coverageFraction>0 && out.coverageFraction<1);
});

test('sensor switching never changes continuous Rrs',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.phytoplanktonRich);
  const baseline=[...water.Rrs];
  for(const id of WATER_SENSOR_ORDER){
    const observation=sampleSensorRrs(water.wavelengthNm,water.Rrs,id);
    assert.deepEqual(water.Rrs,baseline);
    assert.equal(observation.sensor.id,id);
  }
});

test('all full band averages lie inside the local continuous Rrs range',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.turbidParticleRich);
  for(const id of WATER_SENSOR_ORDER){
    const observation=sampleSensorRrs(water.wavelengthNm,water.Rrs,id);
    for(const band of observation.bands){
      if(band.value==null) continue;
      const [lo,hi]=band.supportNm;
      const local=water.Rrs.filter((_,i)=>water.wavelengthNm[i]>=lo && water.wavelengthNm[i]<=hi);
      const min=Math.min(...local),max=Math.max(...local);
      assert.ok(band.value>=min-1e-10 && band.value<=max+1e-10,`${id} ${band.id}`);
    }
  }
});

test('expected visible bands are fully supported inside 400-700 nm',()=>{
  const water=computeWaterOptics(WATER_REFERENCE_STATES.clearOcean);
  const olci=sampleSensorRrs(water.wavelengthNm,water.Rrs,'olci');
  const msi=sampleSensorRrs(water.wavelengthNm,water.Rrs,'s2-msi');
  const oli=sampleSensorRrs(water.wavelengthNm,water.Rrs,'landsat-oli');
  const pace=sampleSensorRrs(water.wavelengthNm,water.Rrs,'pace-oci');
  assert.equal(olci.sampledCount,9);
  assert.equal(msi.sampledCount,4);
  assert.equal(oli.sampledCount,4);
  assert.equal(pace.sampledCount,60);
});
