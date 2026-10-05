import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadBoundField() {
  const context=vm.createContext({window:{},console});
  const source=await readFile(new URL('../../site/play/bound/bound-field.js',import.meta.url),'utf8');
  vm.runInContext(source,context,{filename:'site/play/bound/bound-field.js'});
  return context.window.GeoPlayBoundField;
}

const scenario={
  riskThreshold:.52,
  riskPeaks:[
    [.32,.38,.88,.16,.15],
    [.63,.58,.72,.20,.17],
    [.70,.27,.42,.11,.10]
  ],
  populationPeaks:[
    [.37,.43,.92,.13,.12],
    [.58,.60,.78,.14,.13],
    [.73,.31,.48,.08,.08]
  ],
  riskTexture:.025
};

test('Bound field resampling changes classification without changing the source model', async () => {
  const field=await loadBoundField();
  const before=field.sample(scenario,96);
  const after=field.sample(scenario,24);
  const change=field.classificationChange(before,after,{riskThreshold:scenario.riskThreshold,size:96});

  assert.equal(before.n,96);
  assert.equal(after.n,24);
  assert.ok(change.fraction>0);
  assert.ok(change.fraction<.5);
});

test('Bound evaluates the same committed boundary under two observation resolutions', async () => {
  const field=await loadBoundField();
  const before=field.sample(scenario,96);
  const after=field.sample(scenario,24);
  const boundary=field.guidedBoundary();
  const first=field.evaluate(before,boundary,{riskThreshold:scenario.riskThreshold});
  const second=field.evaluate(after,boundary,{riskThreshold:scenario.riskThreshold});

  assert.ok(first.coverage>=0 && first.coverage<=1);
  assert.ok(first.areaCost>0 && first.areaCost<1);
  assert.ok(second.coverage>=0 && second.coverage<=1);
  assert.ok(Math.abs(first.coverage-second.coverage)>0);
});

test('Bound quantifies the consequence of redrawing a boundary', async () => {
  const field=await loadBoundField();
  const original=field.guidedBoundary();
  const moved=field.transformBoundary(original,{dx:.08,dy:-.03,scale:.92});
  const shift=field.boundaryShift(original,moved,96);

  assert.ok(shift>0);
  assert.ok(shift<.5);
  assert.equal(field.boundaryShift(original,original,96),0);
});
