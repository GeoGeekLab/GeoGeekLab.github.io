#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const source = path.join(root, 'site');
let failures = 0;

const read = file => fs.readFile(file, 'utf8');
const exists = file => fs.access(file).then(() => true).catch(() => false);
const ok = (condition, message) => {
  if (condition) console.log(`✓ ${message}`);
  else { console.error(`✗ ${message}`); failures += 1; }
};
const has = (text, pattern) => typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
const gzipSize = text => gzipSync(Buffer.from(text)).length;

const commonsData = await read(path.join(source, 'commons', 'commons-data.js'));
const modules = await read(path.join(source, 'core', 'modules.js'));
const runtime = await read(path.join(source, 'runtime-stability.js'));
const runtimeCss = await read(path.join(source, 'runtime-stability.css'));
const earthLab = await read(path.join(source, 'earth-observation-lab-v3.js'));
const pulseLab = await read(path.join(source, 'pulse-observation-lab-v4.js'));

ok(!(await exists(path.join(source, 'earth', 'index.html'))), 'GG-01 standalone Earth Observatory source route is removed');
ok(has(earthLab, "datasetId:'nasa-gibs'"), 'GG-02 L05 Earth remains bound to the unified NASA GIBS contract');
ok(has(pulseLab, 'abort-safe-aria-busy'), 'GG-03 Pulse retains abort-safe loading semantics');

ok(has(runtime, 'setTimeout(pause, 520)'), 'GG-04 decorative GeoField is paused after idle');
ok(has(runtime, "['pointermove', 'pointerdown', 'wheel', 'scroll', 'resize', 'focusin']"), 'GG-04 interaction resumes decorative field only when needed');
ok(has(runtime, 'reducedMotion || saveData'), 'GG-05 reduced-motion/data-saver permanently stop decorative animation');
ok(has(runtimeCss, '@media (prefers-reduced-motion: reduce)'), 'GG-05 reduced-motion CSS fallback exists');

const lab = await read(path.join(dist, 'lab.html'));
const atlas = await read(path.join(dist, 'atlas.html'));
const elsewhere = await read(path.join(dist, 'elsewhere.html'));
ok(has(lab, 'lab-static-fallback'), 'GG-06 Lab has a first-response fallback');
ok(!has(lab, 'Open Earth Observatory'), 'GG-06 Lab fallback does not resurrect the removed standalone Earth route');
ok(has(atlas, 'atlas-static-fallback'), 'GG-06 Atlas has a first-response fallback');
const elsewhereEntries = (elsewhere.match(/\belsewhere-entry\b/g) || []).length;
ok(elsewhereEntries >= 3 && has(elsewhere, 'CURRENT ENTRIES'), 'GG-06 Elsewhere has first-response static content');

ok(has(runtime, "closest?.('#commonsHour')"), 'GG-07 Commons hour input is coalesced');
ok(has(runtime, 'latestRaw = raw'), 'GG-07 Commons stale snapshot callers converge on latest result');

ok(has(commonsData, "localStorage.getItem(LOCAL_KEY) !== serialized"), 'GG-08 Commons verifies local writes');
ok(has(commonsData, 'geogeek:commons-storage-error'), 'GG-08 storage failure raises an explicit UI event');
ok(has(runtime, 'The browser could not persist this'), 'GG-08 visitor receives a persistence failure message');

ok(has(commonsData, 'const observationCounts = new Map()'), 'GG-09 observation counts use a linear aggregation map');
ok(!/places\.forEach\([^\n]*observations\.filter/.test(commonsData), 'GG-09 quadratic per-place observation filtering is removed');
ok(has(commonsData, 'MAX_LOCAL_OBSERVATIONS = 500'), 'GG-09 demo local growth is bounded');

ok(has(modules, 'loaded.delete(url)'), 'GG-10 failed lazy-load promises are evicted from cache');
ok(has(modules, "script.dataset.loadFailed = 'true'"), 'GG-10 failed dynamic scripts are marked/retryable');
ok(has(modules, "kind === 'earth'"), 'GG-10 L05 Earth remains lazy-loaded through the Lab instrument lifecycle');

const htmlPaths = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (/\.html$/i.test(entry.name)) htmlPaths.push(file);
  }
}
await walk(dist);
let missingRuntime = 0;
for (const file of htmlPaths) {
  const html = await read(file);
  if (!/runtime-stability\.js/i.test(html) || !/runtime-stability\.css/i.test(html)) missingRuntime += 1;
}
ok(htmlPaths.length > 0 && missingRuntime === 0, `GG-11 runtime stability assets are injected into all ${htmlPaths.length} HTML files`);

for (const file of [
  path.join(source, 'commons', 'commons-data.js'),
  path.join(source, 'core', 'modules.js'),
  path.join(source, 'runtime-stability.js'),
  path.join(source, 'earth-observation-lab-v3.js'),
  path.join(source, 'pulse-observation-lab-v4.js'),
  path.join(root, 'scripts', 'postbuild-runtime-stability.mjs')
]) {
  const check = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  ok(check.status === 0, `Syntax check passes: ${path.relative(root, file)}`);
  if (check.status !== 0 && check.stderr) console.error(check.stderr.trim());
}

const budgets = [
  ['Commons data', commonsData, 32 * 1024],
  ['Runtime stability', runtime, 20 * 1024],
];
for (const [name, text, limit] of budgets) {
  const size = gzipSize(text);
  ok(size <= limit, `${name} gzip ${(size / 1024).toFixed(1)} KiB ≤ ${Math.round(limit / 1024)} KiB`);
}

if (failures) {
  console.error(`\nRuntime stability QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log('\nRuntime stability QA passed: standalone Earth is retired and shared visitor-stability guards remain covered.');
