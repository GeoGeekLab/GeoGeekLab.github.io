import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const directory = path.dirname(fileURLToPath(import.meta.url));
const app = fs.readFileSync(path.join(directory, 'app/index.html'), 'utf8');
const adapter = fs.readFileSync(path.join(directory, 'instrument.js'), 'utf8');
const loader = fs.readFileSync(path.join(directory, '../../core/modules.js'), 'utf8');

test('V5 app is an offline bundle with six scientific workspaces', () => {
  assert.match(app, /<!doctype html>/i);
  for (const key of ['path', 'iop', 'atm', 'sensor', 'ac', 'compare']) {
    assert.ok(app.includes("id:'" + key + "'") || app.includes("id: '" + key + "'"));
  }
  assert.match(app, /geogeek:water-v5:ready/);
  assert.match(app, /geogeek:water-v5:escape/);
  assert.match(app, /BRICAUD_APHI_A/);
});
test('V5 adapter validates message origin and respects AbortSignal', () => {
  assert.match(adapter, /event\.source !== frame\.contentWindow/);
  assert.match(adapter, /event\.origin !== location\.origin/);
  assert.match(adapter, /signal\?\.removeEventListener\('abort'/);
  assert.match(adapter, /frame\.remove\(\)/);
});
test('Legacy Water fallback and all other loaders remain available', () => {
  assert.match(loader, /loadModule\(WATER_WORKBENCH_V5\)/);
  assert.match(loader, /loadModule\(WATER_INSTRUMENT\)/);
});
