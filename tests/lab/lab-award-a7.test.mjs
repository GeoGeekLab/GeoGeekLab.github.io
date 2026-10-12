import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A7 is a composition review, not a new scientific or concept version',()=>{
  const water=read('site/water/workbench-v10-2/instrument.js');
  assert.match(water,/version:\s*'10\.2\.0-quiet2'/);
  assert.match(water,/conceptVersion:\s*'award-a3'/);
  assert.match(water,/polishVersion:\s*'award-a5'/);
  assert.doesNotMatch(water,/award-a7/);
});

test('A7 keeps the Water host compact without shrinking orientation below 10px',()=>{
  const css=read('site/lab-award-shell.css');
  assert.match(css,/data-instrument-kind="water"[\s\S]*instrument-award-context/);
  assert.match(css,/instrument-award-context-kicker/);
  assert.match(css,/font-size:10px/);
  assert.match(css,/instrument-award-axis[\s\S]*display:none/);
});

test('A7 removes the RT outer dashboard frame and keeps status/provenance visible',()=>{
  const css=read('site/water/workbench-v10-2/award-polish.css');
  assert.match(css,/A7 final composition review/);
  assert.match(css,/workspace\.rt-active \.rt-science-workspace\s*\{[\s\S]*border:0!important/);
  assert.doesNotMatch(css,/\.rt-science-status\s*\{[^}]*display:none/is);
  assert.doesNotMatch(css,/\.rt-science-provenance\s*\{[^}]*display:none/is);
});

test('A7 nav continuation is presentation-only',()=>{
  const js=read('site/water/workbench-v10-2/award-polish.js');
  assert.match(js,/function installNavEdges\(\)/);
  assert.match(js,/waterNavStart/);
  assert.match(js,/waterNavEnd/);
  assert.doesNotMatch(js,/models\.run\(|computeWaterOptics\(|fetch\(/);
  assert.doesNotMatch(js,/\.(?:value|checked)\s*=/);
});
