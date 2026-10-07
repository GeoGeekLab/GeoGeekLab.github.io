import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadPhysics() {
  const context=vm.createContext({window:{},console,Math});
  const source=await readFile(new URL('../../site/play/light/light-physics.js',import.meta.url),'utf8');
  vm.runInContext(source,context,{filename:'site/play/light/light-physics.js'});
  return context.window.GeoPlayLightPhysics;
}

function fakeWater() {
  const wavelengthNm=Array.from({length:301},(_,i)=>400+i);
  const Rrs=wavelengthNm.map(lambda=>{
    const blue=Math.exp(-((lambda-455)/70)**2)*0.004;
    const green=Math.exp(-((lambda-550)/95)**2)*0.0014;
    return blue+green+0.00005;
  });
  return {wavelengthNm,Rrs};
}

test('Rayleigh teaching spectrum favors short visible wavelengths', async () => {
  const physics=await loadPhysics();
  const wavelengths=physics.DEFAULT_WAVELENGTHS;
  const spectrum=physics.rayleighRelativeSpectrum(wavelengths,true);
  const i450=wavelengths.indexOf(450);
  const i650=wavelengths.indexOf(650);
  assert.ok(spectrum[i450]>spectrum[i650]);
  assert.equal(Math.max(...spectrum),1);
  assert.ok(physics.rayleighRelativeSpectrum(wavelengths,false).every(value=>value===0));
});

test('Fresnel teaching path is finite and removable', async () => {
  const physics=await loadPhysics();
  const r=physics.fresnelUnpolarized(40,1,1.34);
  assert.ok(r>0 && r<1);
  const sky=physics.rayleighRelativeSpectrum();
  const reflected=physics.surfaceReflectionRelative(sky,{enabled:true,thetaDeg:40});
  assert.ok(reflected.some(value=>value>0));
  assert.ok(physics.surfaceReflectionRelative(sky,{enabled:false}).every(value=>value===0));
});

test('Water-backscatter ablation zeroes the displayed water-leaving spectrum without mutating baseline Rrs', async () => {
  const physics=await loadPhysics();
  const water=fakeWater();
  const baseline=[...water.Rrs];
  const removed=physics.waterLeavingSpectrum(water,false);
  assert.ok(removed.every(value=>value===0));
  assert.deepEqual(water.Rrs,baseline);
});

test('Scene keeps the three mechanism paths independent', async () => {
  const physics=await loadPhysics();
  const water=fakeWater();

  const noSky=physics.buildScene({
    waterOutput:water,
    mechanisms:{atmosphericScattering:false,waterBackscatter:true,surfaceReflection:true},
    chartMode:'sky'
  });
  assert.ok(noSky.skySpectrum.every(value=>value===0));
  assert.ok(noSky.waterSignal.some(value=>value>0));
  assert.ok(noSky.surfaceSpectrum.some(value=>value>0));

  const noWater=physics.buildScene({
    waterOutput:water,
    mechanisms:{atmosphericScattering:true,waterBackscatter:false,surfaceReflection:true},
    chartMode:'water'
  });
  assert.ok(noWater.waterSignal.every(value=>value===0));
  assert.ok(noWater.surfaceSpectrum.some(value=>value>0));

  const noSurface=physics.buildScene({
    waterOutput:water,
    mechanisms:{atmosphericScattering:true,waterBackscatter:true,surfaceReflection:false},
    chartMode:'surface'
  });
  assert.ok(noSurface.surfaceSpectrum.every(value=>value===0));
  assert.ok(noSurface.waterSignal.some(value=>value>0));
});
