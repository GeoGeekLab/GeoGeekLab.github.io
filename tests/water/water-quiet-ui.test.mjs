import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read = name => readFileSync(new URL('../../' + name, import.meta.url), 'utf8');
const prefix = 'site/water/workbench-v10-2/';

test('Water quiet layer loads after all science styles', () => {
  const html = read(prefix + 'app/index.html');
  const cssAt = html.indexOf('water-quiet.css?v=20261011-quiet1');
  const jsAt = html.indexOf('water-quiet.js?v=20261011-quiet1');
  const uncertaintyAt = html.indexOf('v102-uncertainty.css');
  assert.ok(cssAt > uncertaintyAt && uncertaintyAt > 0);
  assert.ok(jsAt > cssAt && jsAt < html.indexOf('</head>'));
});

test('Secondary information uses reversible native disclosures', () => {
  const js = read(prefix + 'water-quiet.js');
  const css = read(prefix + 'water-quiet.css');
  assert.match(js, /document\.createElement\('details'\)/);
  assert.match(js, /body\.append\(status, method\)/);
  assert.match(js, /document\.createElement\('summary'\)/);
  assert.match(js, /contextExpanded = details\.open/);
  assert.match(js, /disclosureState\.set\(key, details\.open\)/);
  assert.match(js, /observer\.observe\(rail, \{ childList: true \}\)/);
  assert.match(js, /Not externally validated/);
  assert.match(css, /\.water-detail-group\[open\]/);
});

test('Water quiet layer cannot replace computation, scientific modules, or experiments', () => {
  const js = read(prefix + 'water-quiet.js');
  const css = read(prefix + 'water-quiet.css');
  assert.doesNotMatch(js, /GeoGeekRT101\s*=|models\.run\(|computeWaterOptics\(|fetch\(|localStorage\.|sessionStorage\./);
  assert.doesNotMatch(css, /display:\s*none[^;}]*!important/);
  assert.match(js, /tab === 'iop'/);
  assert.match(js, /tab === 'uncertainty'/);
  assert.match(css, /\.water-scope-boundary/);
});

test('Embedding refreshes Water UI only', () => {
  const adapter = read(prefix + 'instrument.js');
  assert.match(adapter, /chartfix', '10\.2\.0-quiet1'/);
  assert.match(adapter, /const frameUrl = new URL\('app\/index\.html', rootUrl\)/);
});
