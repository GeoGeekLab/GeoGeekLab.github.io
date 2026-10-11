import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');

test('Water V10.2 loads quality CSS after the scientific view styles', () => {
  const html = read('site/water/workbench-v10-2/app/index.html');
  const scientificStyles = [
    'v102-layout.css', 'v102-components.css', 'v102-rt.css',
    'v102-physics.css', 'v102-analysis.css', 'v102-atm-sensor.css',
    'v102-uncertainty.css'
  ];
  const polishIndex = html.indexOf('v102-quality.css');
  assert.ok(polishIndex > 0, 'Quality CSS is linked in the instrument document');
  for (const file of scientificStyles) {
    assert.ok(html.indexOf(file) >= 0 && html.indexOf(file) < polishIndex,
      file + ' must be loaded before the quality layer');
  }
  assert.ok(polishIndex < html.indexOf('</head>'), 'The style is present before the head closes');
});

test('Water V10.2 host communicates startup and removes loading state', () => {
  const adapter = read('site/water/workbench-v10-2/instrument.js');
  const css = read('site/water/workbench-v10-2/instrument.css');
  assert.match(adapter, /loading\.setAttribute\('role', 'status'\)/);
  assert.match(adapter, /stage\.replaceChildren\(frame, loading\)/);
  const cleared = adapter.match(/loading\.remove\(\)/g) || [];
  assert.ok(cleared.length >= 2, 'Loader clears on success and cleanup');
  assert.match(css, /\.water-v102-loading/);
  assert.match(css, /prefers-reduced-motion: reduce/);
});

test('The Lab releases the revised Water adapter without touching the model', () => {
  const modules = read('site/core/modules.js');
  const lab = read('site/lab.html');
  const styles = read('site/water/workbench-v10-2/v102-quality.css');
  assert.match(modules, /water\/workbench-v10-2\/instrument\.js\?v=10\.2\.0-ux1/);
  assert.match(lab, /20261011v105waterux1/);
  assert.match(styles, /\.nav-scroll/);
  assert.match(styles, /focus-visible/);
  assert.match(styles, /min-height: 44px/);
  assert.doesNotMatch(styles, /water-model\.js|rt-engine\.js/);
});
