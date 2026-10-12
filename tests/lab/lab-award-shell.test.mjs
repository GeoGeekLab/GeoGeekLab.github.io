import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');

test('A4 loads the shared Observatory shell without changing instrument versions', () => {
  const fullpage=read('site/lab-fullpage.js');
  assert.match(fullpage,/core\/lab-award-system\.css\?v=a4/);
  assert.match(fullpage,/lab-award-shell\.css\?v=a4/);
  assert.match(fullpage,/lab-award-shell\.js\?v=a4/);

  const water=read('site/water/workbench-v10-2/instrument.js');
  assert.match(water,/version:\s*'10\.2\.0-quiet2'/);
  assert.match(water,/conceptVersion:\s*'award-a3'/);
});

test('A4 host orientation is read-only', () => {
  const js=read('site/lab-award-shell.js');
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/localStorage\.|sessionStorage\./);
  assert.doesNotMatch(js,/\.click\(\)|\.dispatchEvent\(/);
  assert.doesNotMatch(js,/\.(?:value|checked)\s*=/);
  assert.doesNotMatch(js,/GeoGeekInstrumentMounts\s*=/);
  assert.match(js,/Read-only host orientation/);
  assert.match(js,/data-workspace-mode/);
  assert.match(js,/data-pulse-task/);
});

test('A4 keeps all seven Observatory instruments in one shell family', () => {
  const js=read('site/lab-award-shell.js');
  for(const kind of ['world','figure','orbit','earth','flow','pulse','water']){
    assert.match(js,new RegExp(kind));
  }
  assert.match(js,/SPECTRAL WATER/);
  assert.match(js,/SEISMIC FIELD/);
  assert.match(js,/ORBITAL FIELD/);
  assert.match(js,/EARTH OBSERVATION/);
});

test('A4 keeps the validated close target and reduced-motion behavior', () => {
  const css=read('site/lab-award-shell.css');
  assert.match(css,/width:44px/);
  assert.match(css,/height:44px/);
  assert.match(css,/border-radius:50%/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(css,/--lab-award-accent/);
  assert.match(css,/data-instrument-kind="water"/);
  assert.match(css,/data-instrument-kind="pulse"/);
});

test('A4 shared primitives stay model-agnostic', () => {
  const css=read('site/core/lab-award-system.css');
  assert.match(css,/\.gg-lab-topology/);
  assert.match(css,/\.gg-lab-telemetry/);
  assert.doesNotMatch(css,/water-model|RT101|earthquake\.usgs|sensor-observation/i);
});
