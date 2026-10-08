import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const here=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(path.join(here,'app/index.html'),'utf8');
const mount=fs.readFileSync(path.join(here,'instrument.js'),'utf8');
const loader=fs.readFileSync(path.join(here,'../../core/modules.js'),'utf8');
const html=fs.readFileSync(path.join(here,'../../lab.html'),'utf8');
test('V6 contains the sensitivity analysis and seven physical workspaces',()=>{
  assert.match(app,/GEOGEEK MODEL · v6/);
  assert.match(app,/data-sensitivity-parameter/);
  assert.match(app,/finite-difference/i);
  for(const key of ['path','iop','atm','sensor','ac','compare','sensitivity'])
    assert.match(app,new RegExp("id:'"+key+"'"));
});
test('V6 adapter verifies origin, performs cleanup, and matches embedded postMessage protocol',()=>{
  assert.match(mount,/event\.origin !== location\.origin/);
  assert.match(mount,/event\.source !== frame\.contentWindow/);
  assert.match(mount,/frame\.remove\(\)/);
  assert.match(mount,/geogeek:water-v5:ready/);
  assert.match(app,/geogeek:water-v5:ready/);
});
test('Lab loader has V6/V5/legacy fallbacks and V6 cache token',()=>{
  assert.match(loader,/loadModule\(WATER_WORKBENCH_V6\)/);
  assert.match(loader,/loadModule\(WATER_WORKBENCH_V5\)/);
  assert.match(loader,/loadModule\(WATER_INSTRUMENT\)/);
  assert.match(html,/core\/modules\.js\?v=20261008v6/);
  assert.match(html,/geogeek-lab-release/);
});
