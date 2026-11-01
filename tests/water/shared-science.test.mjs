import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { solveRT } from '../../site/water/shared/reference/dom-solver.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const shared = path.join(root, 'site/water/shared');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(shared, 'provenance.json'), 'utf8'));
const reference = JSON.parse(fs.readFileSync(path.join(shared, 'reference/rt-reference-v1.json'), 'utf8'));

test('Shared science migration preserves the archived calculations, measurements and license bytes', () => {
  assert.equal(manifest.scienceChanged, false);
  for (const entry of manifest.assets) {
    const actual = fs.readFileSync(path.join(shared, entry.path));
    const archived = fs.readFileSync(path.join(root, entry.archivedSource));
    assert.equal(createHash('sha256').update(actual).digest('hex'), entry.sha256, entry.path);
    assert.deepEqual(actual, archived, entry.path);
  }
});

test('Current Water runtime has no dependency on a retired UI directory', () => {
  const runtimeFiles = fs.readdirSync(path.join(root, 'site/water/workbench-v10-2'))
    .filter(name => /\.(js|css)$/.test(name)).map(name => 'site/water/workbench-v10-2/' + name);
  runtimeFiles.push('site/water/workbench-v10-2/app/index.html', 'site/core/modules.js');
  for (const name of runtimeFiles) {
    assert.doesNotMatch(read(name), /(?:\.\.\/|water\/)workbench-v(?:5|6|7|8|9|10|10-1)\//, name);
  }
  const app = read('site/water/workbench-v10-2/app/index.html');
  assert.match(app, /href="\/design-tokens\.css"/);
  for (const role of ['sans', 'serif', 'mono']) assert.ok(app.includes(`--${role}:var(--font-${role})`));
});

test('Shared RT reference retains the analytic zero-scattering solution and fixed scientific status', () => {
  assert.equal(reference.status, 'internally-generated-unvalidated');
  assert.equal(reference.physics.airSeaBoundary, false);
  const result = solveRT({ a: .15, bb: 0, sza: 30 });
  const expected = Math.exp(-.15 * 5 / Math.cos(Math.PI / 6));
  assert.ok(Math.abs(result.Ed[5] - expected) < 1e-8);
  assert.ok(result.Eu.every(value => value === 0));
  assert.equal(result.rrs, 0);
});

test('Current RT loader fetches the shared reference and does not manufacture fallback radiance', async () => {
  const calls = [];
  let available = true;
  const context = { Event, dispatchEvent() {}, fetch: async url => {
    calls.push(url);
    return { ok: available, status: available ? 200 : 503, json: async () => reference };
  } };
  vm.createContext(context);
  vm.runInContext(read('site/water/workbench-v10-2/rt-engine.js'), context);
  await context.GeoGeekRT101.load();
  assert.equal(calls[0], '../../shared/reference/rt-reference-v1.json');
  assert.equal(context.GeoGeekRT101.status, 'ready');
  assert.equal(context.GeoGeekRT101.record('clear', 30, 440).nm, 440);
  available = false;
  await context.GeoGeekRT101.load(true);
  assert.equal(context.GeoGeekRT101.status, 'error');
  assert.equal(context.GeoGeekRT101.dataset, null);
  assert.equal(context.GeoGeekRT101.record('clear', 30, 440), null);
});
