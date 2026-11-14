import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

test('Light copy distinguishes numerically tested water model from field evidence',async()=>{
  const source=await readFile(new URL('../../site/play/light/light-content.js',import.meta.url),'utf8');
  const context=vm.createContext({window:{}});
  vm.runInContext(source,context);
  const items=context.window.GeoPlayLightContent.EXPERIMENTS;
  assert.equal(items.length,6);
  const [sky,water,surface]=items;
  assert.match(sky.limit,/not a solved TOA radiance field/i);
  assert.match(water.limit,/idealized, numerically tested Water as Spectrum model/i);
  assert.match(water.limit,/not from field observations/i);
  assert.doesNotMatch(water.limit,/validated/i);
  assert.match(surface.equation,/DISTINCT PATHS/);
  assert.doesNotMatch(surface.equation,/OBSERVED WATER VIEW =/);
  for(const item of items) {
    assert.ok(item.limit&&item.chartLabel&&item.equation);
    assert.equal(item.choices.length,3);
  }
});
