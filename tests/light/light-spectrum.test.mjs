import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

async function geometry() {
  const context=vm.createContext({window:{},console});
  const source=await readFile(new URL('../../site/play/light/light-view.js',import.meta.url),'utf8');
  vm.runInContext(source,context,{filename:'site/play/light/light-view.js'});
  return context.window.GeoPlayLightView;
}

function yCoordinates(d) {
  return [...d.matchAll(/[ML][\\d.]+,([\\d.]+)/g)].map(match=>Number(match[1]));
}

test('Light spectrum uses one shared Y domain for relative before/after signals',async()=>{
  const {spectrumDomain,pathD}=await geometry();
  const before=[1,.5,.25];
  const after=[.2,.1,.05];
  const max=spectrumDomain(before,after);
  assert.equal(max,1);
  const original=yCoordinates(pathD(before,520,138,max));
  const reduced=yCoordinates(pathD(after,520,138,max));
  assert.equal(original.length,3);
  assert.equal(reduced.length,3);
  assert.ok(reduced.every((y,index)=>y>original[index]));
  assert.equal(reduced[0],103.2);
  assert.equal(original[0],12);
});

test('Light removed signal plots on the actual SVG axis baseline',async()=>{
  const {spectrumDomain,pathD}=await geometry();
  const before=[.04,.02,.01],after=[0,0,0];
  const y=yCoordinates(pathD(after,520,138,spectrumDomain(before,after)));
  assert.deepEqual(y,[126,126,126]);
  assert.equal(spectrumDomain([0,0],[0,0]),1);
  assert.deepEqual(yCoordinates(pathD([0,0],520,138,1)),[126,126]);
});

test('Light shared domain accommodates smaller nonzero Rrs values without normalizing each trace',async()=>{
  const {spectrumDomain,pathD}=await geometry();
  const before=[.004,.002,.001],after=before.map(x=>x*.1);
  const domain=spectrumDomain(before,after);
  assert.equal(domain,.004);
  const beforeY=yCoordinates(pathD(before,520,138,domain));
  const afterY=yCoordinates(pathD(after,520,138,domain));
  assert.ok(afterY.every((y,i)=>y>beforeY[i]));
  assert.ok(afterY.every(y=>y<126));
});

test('Light rejects invalid chart values rather than drawing a misleading curve',async()=>{
  const {spectrumDomain,pathD}=await geometry();
  assert.throws(()=>spectrumDomain([1,NaN],[0]),/finite/);
  assert.throws(()=>spectrumDomain([-1],[0]),/nonnegative/);
  assert.throws(()=>pathD([1],520,138,0),/positive/);
  assert.throws(()=>pathD([-1],520,138,1),/nonnegative/);
});
