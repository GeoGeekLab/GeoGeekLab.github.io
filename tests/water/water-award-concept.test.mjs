import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');
const prefix='site/water/workbench-v10-2/';

test('Award A3 plus A5 preserves the validated Water version contract', () => {
  const adapter=read(prefix+'instrument.js');
  assert.match(adapter,/version:\s*'10\.2\.0-quiet2'/);
  assert.match(adapter,/conceptVersion:\s*'award-a3'/);
  assert.match(adapter,/award-concept\.css\?v=a5/);
  assert.match(adapter,/award-optical\.js\?v=a3/);
  assert.match(adapter,/award-journey\.js\?v=a3/);
  assert.match(adapter,/award-polish\.js\?v=a5/);
  assert.match(adapter,/polishVersion:\s*'award-a5'/);
  assert.match(adapter,/award-concept\.js\?v=a3/);
  assert.match(adapter,/chartfix', '10\.2\.0-quiet2'/);
});

test('Award A3 modules are presentation-only and cannot write model state', () => {
  const scripts=[
    read(prefix+'award-optical.js'),
    read(prefix+'award-journey.js'),
    read(prefix+'award-polish.js'),
    read(prefix+'award-concept.js')
  ].join('\n');
  assert.doesNotMatch(scripts,/GeoGeekRT101\s*=/);
  assert.doesNotMatch(scripts,/models\.run\(|computeWaterOptics\(|fetch\(/);
  assert.doesNotMatch(scripts,/localStorage\.|sessionStorage\./);
  assert.doesNotMatch(scripts,/\.dispatchEvent\(|\.click\(\)/);
  assert.doesNotMatch(scripts,/\.(?:value|checked)\s*=/);
  assert.match(scripts,/NOT A RADIANCE FIELD/);
  assert.match(scripts,/ACTIVE WAVELENGTH/);
  assert.match(scripts,/MODEL TOPOLOGY · READ-ONLY/);
});

test('Award A3 CSS is modular and keeps A2 optical science visible', () => {
  const manifest=read(prefix+'award-concept.css');
  const foundation=read(prefix+'award-foundation.css');
  const journey=read(prefix+'award-journey.css');
  const shared=read('site/core/lab-award-system.css');

  assert.match(manifest,/lab-award-system\.css\?v=a3/);
  assert.match(manifest,/award-foundation\.css\?v=a3/);
  assert.match(manifest,/award-journey\.css\?v=a3/);
  assert.match(manifest,/award-polish\.css\?v=a5/);

  assert.match(foundation,/--water-probe-x/);
  assert.match(foundation,/--water-rt-depth-y/);
  assert.match(foundation,/--water-sun-angle/);
  assert.match(foundation,/\.award-spectrum-ruler/);
  assert.match(foundation,/\.award-rt-geometry/);
  assert.doesNotMatch(foundation,/\.rt-science-provenance\s*\{[^}]*display\s*:\s*none/is);

  assert.match(shared,/\.gg-lab-topology/);
  assert.match(journey,/\.award-observation-a3/);
  assert.match(journey,/p6b-atmosphere/);
  assert.match(journey,/p6b-sensor/);
  assert.match(journey,/p7-ac/);
});

test('Award A3 retains reduced-motion and scientific-limit affordances', () => {
  const foundation=read(prefix+'award-foundation.css');
  const shared=read('site/core/lab-award-system.css');
  const journey=read(prefix+'award-journey.js');
  assert.match(foundation,/@media \(prefers-reduced-motion:reduce\)/);
  assert.match(shared,/@media\(prefers-reduced-motion:reduce\)/);
  assert.match(journey,/not independent correction validation/i);
  assert.match(journey,/not measured satellite radiance/i);
  assert.match(journey,/no band value/i);
});

test('Award concept remains pinned to the requested release baseline', () => {
  const doc=read('site/water/AWARD_CONCEPT.md');
  const constitution=read('docs/LAB_VISUAL_CONSTITUTION.md');
  assert.match(doc,/20261011v107watercache1/);
  assert.match(doc,/9718171862959c9232e1dd7b4f69d31c36b0bc75/);
  assert.match(doc,/A3 implementation/);
  assert.match(constitution,/20261011v107watercache1/);
  assert.match(constitution,/must not silently rebase/i);
});


test('Award injection ignores transient about:blank iframe loads', () => {
  const adapter=read(prefix+'instrument.js');
  assert.match(adapter,/function onFrameLoad\(\)/);
  assert.match(adapter,/href === 'about:blank'/);
  const srcIndex=adapter.indexOf('frame.src = url.href');
  const appendIndex=adapter.indexOf('stage.replaceChildren(frame)');
  assert.ok(srcIndex >= 0 && appendIndex >= 0 && srcIndex < appendIndex,
    'frame src must be assigned before insertion so the concept layer cannot bind to about:blank');
  assert.match(adapter,/frame\.removeEventListener\('load', onFrameLoad\)/);
});


test('Award A5 links the shared wavelength coordinate without changing model semantics', () => {
  const css=read(prefix+'award-polish.css');
  const js=read(prefix+'award-polish.js');
  assert.match(css,/\.graph \.probe-line/);
  assert.match(css,/\.graph \.active-dot/);
  assert.match(css,/\.probe-range/);
  assert.match(css,/linear-gradient\(90deg/);
  assert.match(css,/prefers-reduced-motion:reduce/);
  assert.match(js,/waterAwardPolish='a5'/);
  assert.doesNotMatch(js,/models\.run\(|computeWaterOptics\(|fetch\(/);
  assert.doesNotMatch(js,/localStorage\.|sessionStorage\./);
  assert.doesNotMatch(js,/\.dispatchEvent\(|\.click\(\)/);
  assert.doesNotMatch(js,/\.(?:value|checked)\s*=/);
});


test('A5 tool overlay escapes scientific-field stacking without changing actions', () => {
  const css=read(prefix+'award-polish.css');
  const js=read(prefix+'award-polish.js');
  assert.match(css,/\.ui-toolmenu-panel\[data-award-tools-portal="a5"\]\s*\{[^}]*position:fixed!important/is);
  assert.match(css,/z-index:2147483000!important/);
  assert.match(js,/function positionTools\(\)/);
  assert.match(js,/getBoundingClientRect\(\)/);
  assert.match(js,/dataset\.awardOverlay='a5'/);
  assert.match(js,/document\.body\.appendChild\(panel\)/);
  assert.match(js,/menu\.appendChild\(panel\)/);
  assert.match(js,/aria-expanded/);
  assert.doesNotMatch(js,/\.click\(\)|\.dispatchEvent\(/);
});
