import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const path='site/water/workbench-v10-2/';

test('A11 is injected into the existing Water iframe, never a parallel scientific app',()=>{
  const adapter=read(path+'instrument.js');
  assert.match(adapter,/water-attention\.css\?v=a11/);
  assert.match(adapter,/water-attention\.js\?v=a11/);
  assert.match(adapter,/dataset\.waterAttentionStyle/);
  assert.match(adapter,/award-concept\.css\?v=a5/);
  assert.match(adapter,/10\.2\.0-quiet2/);
});

test('Focus and Detail only switch display density; model state is untouched',()=>{
  const script=read(path+'water-attention.js');
  assert.match(script,/root\.dataset\.waterAttention='focus'/);
  assert.match(script,/new Set\(\['focus','detail'\]\)/);
  assert.match(script,/aria-pressed/);
  assert.match(script,/setMode/);
  assert.doesNotMatch(script,/GeoGeekRT101|computeWaterOptics|fetch\(|XMLHttpRequest|localStorage|sessionStorage/);
  assert.doesNotMatch(script,/\.dispatchEvent\(|\.click\(\)|\.value\s*=|\.checked\s*=/);
  assert.doesNotMatch(script,/\.remove\(|replaceChildren|innerHTML\s*\+=/);
});

test('Focus puts the real RT chart first, with scientific warnings visible',()=>{
  const css=read(path+'water-attention.css');
  assert.match(css,/data-water-attention="focus"/);
  assert.match(css,/\.rt-science-view\s*\{\s*order:1/);
  assert.match(css,/\.rt-science-status\s*\{\s*order:0/);
  assert.match(css,/\.rt-science-plot-grid\s*\{\s*order:1/);
  assert.match(css,/\.rt-science-conditions\s*\{\s*order:3/);
  assert.match(css,/\.rt-science-hero\s*\{\s*display:none!important/);
  assert.doesNotMatch(css,/\.water-scope-boundary\s*\{[^}]*display\s*:\s*none/is);
  assert.doesNotMatch(css,/\.rt-science-status\s*\{[^}]*display\s*:\s*none/is);
  assert.doesNotMatch(css,/\.rt-science-provenance\s*\{[^}]*display\s*:\s*none/is);
  assert.match(css,/@media\(forced-colors:active\)/);
  assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);
});
