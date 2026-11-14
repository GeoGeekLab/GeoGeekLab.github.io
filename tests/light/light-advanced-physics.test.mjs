import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
const load=async file=>await readFile(new URL(file,import.meta.url),'utf8');
async function physics(){
  const context=vm.createContext({window:{},Math,console});
  vm.runInContext(await load('../../site/play/light/light-physics.js'),context);
  return context.window.GeoPlayLightPhysics;
}
function water(){
  const wavelengthNm=Array.from({length:301},(_,i)=>400+i);
  return {wavelengthNm,Rrs:wavelengthNm.map(()=>.004),absorption:{total:wavelengthNm.map(l=>.07+.004*Math.max(0,l-540))}};
}
test('Direct sunlight loses relatively more blue light on a longer Rayleigh path',async()=>{
  const p=await physics(),w=p.DEFAULT_WAVELENGTHS,normal=p.atmosphericDirectTransmission(w,1.2),long=p.atmosphericDirectTransmission(w,6);
  const blue=w.indexOf(450),red=w.indexOf(650);
  assert.ok(long[blue]/normal[blue]<long[red]/normal[red]);
  assert.ok(long.every((v,i)=>v>0&&v<normal[i]));
  assert.throws(()=>p.atmosphericDirectTransmission(w,-1));
});
test('Absorption-only survival matches Beer-Lambert with the Water IOP array',async()=>{
  const p=await physics(),fixture=water(),zero=p.absorptionOnlyTransmission(fixture,0),deep=p.absorptionOnlyTransmission(fixture,5);
  assert.ok(zero.every(x=>x===1));
  assert.ok(deep.every(x=>x>0&&x<1));
  assert.ok(deep[250]<deep[50]);
  assert.ok(Math.abs(deep[250]-Math.exp(-fixture.absorption.total[250]*5))<1e-12);
  assert.throws(()=>p.absorptionOnlyTransmission(fixture,-1));
});
test('Fresnel fraction rises towards grazing and stays in its physical bounds',async()=>{
  const p=await physics(),w=p.DEFAULT_WAVELENGTHS,low=p.grazingReflectionFraction(w,40),high=p.grazingReflectionFraction(w,75);
  assert.ok(high[0]>low[0]);
  assert.ok(high.every(x=>x>=0&&x<=1&&x===high[0]));
  assert.throws(()=>p.grazingReflectionFraction(w,90));
});
test('Three advanced chart modes provide unit-consistent, finite results',async()=>{
  const p=await physics(),fixture=water();
  for(const [mode,id,value] of [['sunset','sunset',6],['depth','depth',5],['grazing','grazing',75]]){
    const scene=p.buildScene({waterOutput:fixture,chartMode:mode,interventionId:id,exploreValue:value});
    assert.equal(scene.chart.unit,'fraction');
    assert.equal(scene.chart.before.length,scene.chart.after.length);
    assert.equal(scene.chart.before.length,scene.chart.wavelengthNm.length);
    assert.ok(scene.chart.before.every(x=>x>=0&&x<=1));
    assert.ok(scene.chart.after.every(x=>x>=0&&x<=1));
    assert.equal(scene.visualValue,value);
  }
});
