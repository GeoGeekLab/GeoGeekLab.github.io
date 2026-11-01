import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { CORE_MODULES_URL, SITE_ASSET_RELEASE } from '../../scripts/site-release-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const verifier = path.join(root, 'scripts/verify-water-quiet-release.mjs');
const files = ['lab.html', 'core/modules.js', 'water/workbench-v10-2/instrument.js',
  'water/workbench-v10-2/app/index.html', 'water/workbench-v10-2/rt-engine.js',
  'water/workbench-v10-2/water-quiet.css', 'water/workbench-v10-2/water-quiet.js',
  'water/workbench-v10-2/water-attention.css', 'water/workbench-v10-2/water-attention.js'];
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'site/water/shared/provenance.json'), 'utf8'));

test('The Water CLI validates versioned production CSS and rejects missing typography or changed science', async t => {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(tempRoot, 'water-release-'));
  t.after(() => {
    // Only remove the uniquely created fixture under the resolved temporary root.
    assert.equal(path.dirname(fs.realpathSync(fixture)), tempRoot);
    assert.ok(path.basename(fixture).startsWith('water-release-'));
    fs.rmSync(fixture, { recursive: true });
  });
  for (const file of [...files, 'water/shared/provenance.json', ...manifest.assets.map(entry => 'water/shared/' + entry.path)]) {
    const target = path.join(fixture, file);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.copyFileSync(path.join(root, 'site', file), target);
  }
  const lab = path.join(fixture, 'lab.html');
  fs.writeFileSync(lab, fs.readFileSync(lab, 'utf8').replace(/(?:\/)?core\/modules\.js\?v=[^'"]+/g, CORE_MODULES_URL));
  const app = path.join(fixture, 'water/workbench-v10-2/app/index.html');
  const html = fs.readFileSync(app, 'utf8').replace('/design-tokens.css"', '/design-tokens.css?v=' + SITE_ASSET_RELEASE + '"');
  fs.writeFileSync(app, html);
  const run = () => spawnSync(process.execPath, [verifier, '--dist', fixture], { cwd: root, encoding: 'utf8' });

  await t.test('Version query strings preserve the same typography resource', () => {
    const result = run();
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /production artifact and shared science verified/);
  });
  await t.test('An external resource with the same pathname cannot satisfy the shared CSS contract', () => {
    fs.writeFileSync(app, html.replace('/design-tokens.css?v=', 'https://external.invalid/design-tokens.css?v='));
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /shared typography missing/);
    fs.writeFileSync(app, html);
  });
  await t.test('Production scientific bytes must match the pinned source digest', () => {
    fs.appendFileSync(path.join(fixture, 'water/shared/reference/rt-reference-v1.json'), '\n');
    const result = run();
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Production shared science drift: reference\/rt-reference-v1\.json/);
  });
});
