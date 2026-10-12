import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');
const prefix='site/water/workbench-v10-2/';

test('Award A2 preserves the validated Water version contract', () => {
  const adapter=read(prefix+'instrument.js');
  assert.match(adapter,/version:\s*'10\.2\.0-quiet2'/);
  assert.match(adapter,/conceptVersion:\s*'award-a2'/);
  assert.match(adapter,/award-concept\.css\?v=a2/);
  assert.match(adapter,/award-concept\.js\?v=a2/);
  assert.match(adapter,/chartfix', '10\.2\.0-quiet2'/);
});

test('Award A2 is presentation-only and does not write model state', () => {
  const js=read(prefix+'award-concept.js');
  assert.doesNotMatch(js,/GeoGeekRT101\s*=/);
  assert.doesNotMatch(js,/models\.run\(|computeWaterOptics\(|fetch\(/);
  assert.doesNotMatch(js,/localStorage\.|sessionStorage\./);
  assert.doesNotMatch(js,/\.dispatchEvent\(|\.click\(\)/);
  assert.doesNotMatch(js,/\.(?:value|checked)\s*=/);
  assert.match(js,/NOT A RADIANCE FIELD/);
  assert.match(js,/ACTIVE WAVELENGTH/);
});

test('Award A2 exposes spectral and RT selection coordinates without hiding science', () => {
  const css=read(prefix+'award-concept.css');
  assert.match(css,/AWARD CONCEPT A2/);
  assert.match(css,/--water-probe-x/);
  assert.match(css,/--water-rt-depth-y/);
  assert.match(css,/--water-sun-angle/);
  assert.match(css,/\.award-spectrum-ruler/);
  assert.match(css,/\.award-rt-geometry/);
  assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(css,/\.rt-science-provenance\s*\{[^}]*display\s*:\s*none/is);
});

test('Award concept remains pinned to the requested release baseline', () => {
  const doc=read('site/water/AWARD_CONCEPT.md');
  const constitution=read('docs/LAB_VISUAL_CONSTITUTION.md');
  assert.match(doc,/20261011v107watercache1/);
  assert.match(doc,/9718171862959c9232e1dd7b4f69d31c36b0bc75/);
  assert.match(constitution,/20261011v107watercache1/);
  assert.match(constitution,/must not silently rebase/i);
});
