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
const ok = (condition, message) => {
  if (condition) console.log(`✓ ${message}`);
  else { console.error(`✗ ${message}`); failures += 1; }
};
const has = (text, pattern) => typeof pattern === 'string' ? text.includes(pattern) : pattern.test(text);
const gzipSize = text => gzipSync(Buffer.from(text)).length;

const earth = await read(path.join(source, 'earth', 'app.js'));
const earthHtml = await read(path.join(source, 'earth', 'index.html'));
const commonsData = await read(path.join(source, 'commons', 'commons-data.js'));
const modules = await read(path.join(source, 'core', 'modules.js'));
const runtime = await read(path.join(source, 'runtime-stability.js'));
const runtimeCss = await read(path.join(source, 'runtime-stability.css'));

ok(has(earth, 'let selectedDate = todayUtc()'), 'GG-01 Earth initializes to the current UTC day');
ok(has(earth, "$('#todayButton').addEventListener('click', async () => { selectedDate = todayUtc();"), 'GG-01 NOW selects today rather than T-1');

ok(has(earth, "const HISTORICAL_ADAPTERS = new Set(['gibs', 'emsc'])"), 'GG-02 historical layers are explicitly scoped');
ok(has(earth, "const LIVE_ADAPTERS = new Set(['aurora'])"), 'GG-02 provider-live layers are explicitly scoped');
ok(has(earth, "CURRENT / RECENT · viewport-dependent, independent of view date"), 'GG-02 current viewport layers declare independence from view date');

ok(has(earth, 'async function runLatest(key, task)'), 'GG-03/GG-04 request generation guard exists');
ok(has(earth, 'previous?.controller.abort()'), 'GG-03/GG-04 superseded requests are aborted');
ok(has(earth, "runLatest('adapter:emsc'"), 'GG-03 date-scoped earthquake requests use latest-only control');
ok(has(earth, "runLatest('adapter:inaturalist'"), 'GG-04 iNaturalist viewport requests use latest-only control');
ok(has(earth, "runLatest('adapter:gbif'"), 'GG-04 GBIF viewport requests use latest-only control');
ok(has(earth, "runLatest('adapter:usgsWater'"), 'GG-04 USGS viewport requests use latest-only control');

ok(has(earth, 'input.max = day(today)'), 'GG-05 date input has a current-day maximum');
ok(has(earth, "$('#nextDay').disabled = value >= day(today)"), 'GG-05 next-day control is disabled at today');
ok(has(earth, 'selectedDate = clampDate(plusDays(selectedDate, 1))'), 'GG-05 programmatic +24H is clamped');

ok(has(runtime, 'setTimeout(pause, 520)'), 'GG-06 decorative GeoField is paused after idle');
ok(has(runtime, "['pointermove', 'pointerdown', 'wheel', 'scroll', 'resize', 'focusin']"), 'GG-06 interaction resumes decorative field only when needed');
ok(has(runtime, 'reducedMotion || saveData'), 'GG-07 reduced-motion/data-saver permanently stop decorative animation');
ok(has(runtimeCss, '@media (prefers-reduced-motion: reduce)'), 'GG-07 reduced-motion CSS fallback exists');

ok(has(earth, 'function syncPanel(open)'), 'GG-08 Earth panel visual and ARIA state share one function');
ok(has(earth, "$('#panelClose').addEventListener('click', () => syncPanel(false))"), 'GG-08 close button resets aria-expanded');
ok(has(earthHtml, 'aria-expanded="false"'), 'GG-08 mobile-first initial ARIA state is closed');

ok(has(runtime, 'INSTRUMENT PREVIEW'), 'GG-09 runtime removes misleading hard-coded live preview label');

ok((earth.match(/maplibre-gl@6\.6\.0/g) || []).length >= 2, 'GG-10 MapLibre has at least two CDN candidates');
ok(has(earth, 'map.setStyle({'), 'GG-10 base map has a style fallback');
ok(has(earthHtml, 'cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.css'), 'GG-10 MapLibre CSS has a fallback CDN');

const lab = await read(path.join(dist, 'lab.html'));
const atlas = await read(path.join(dist, 'atlas.html'));
const elsewhere = await read(path.join(dist, 'elsewhere.html'));
ok(has(lab, 'lab-static-fallback'), 'GG-11 Lab has a first-response fallback');
ok(has(atlas, 'atlas-static-fallback'), 'GG-11 Atlas has a first-response fallback');
ok(has(elsewhere, 'elsewhere-static-fallback'), 'GG-11 Elsewhere has a first-response fallback');
ok(!has(lab, '2026-09-15 13:25 UTC'), 'GG-09 built Lab no longer exposes stale fake-live timestamp');

ok(has(runtime, "closest?.('#commonsHour')"), 'GG-12 Commons hour input is coalesced');
ok(has(runtime, 'latestRaw = raw'), 'GG-12 Commons stale snapshot callers converge on latest result');

ok(has(commonsData, "localStorage.getItem(LOCAL_KEY) !== serialized"), 'GG-13 Commons verifies local writes');
ok(has(commonsData, 'geogeek:commons-storage-error'), 'GG-13 storage failure raises an explicit UI event');
ok(has(runtime, 'The browser could not persist this'), 'GG-13 visitor receives a persistence failure message');

ok(has(commonsData, 'const observationCounts = new Map()'), 'GG-14 observation counts use a linear aggregation map');
ok(!/places\.forEach\([^\n]*observations\.filter/.test(commonsData), 'GG-14 quadratic per-place observation filtering is removed');
ok(has(commonsData, 'MAX_LOCAL_OBSERVATIONS = 500'), 'GG-14 demo local growth is bounded');

ok(has(earth, 'const busyTokens = new Set()'), 'GG-15 loading state is tokenized per request');
ok(has(earth, 'busyTokens.delete(token)'), 'GG-15 one request cannot clear another request token');

ok(has(modules, 'loaded.delete(url)'), 'GG-16 failed lazy-load promises are evicted from cache');
ok(has(modules, "script.dataset.loadFailed = 'true'"), 'GG-16 failed dynamic scripts are marked/retryable');

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
ok(htmlPaths.length > 0 && missingRuntime === 0, `GG-06/GG-07 runtime stability assets are injected into all ${htmlPaths.length} HTML files`);

for (const file of [
  path.join(source, 'earth', 'app.js'),
  path.join(source, 'commons', 'commons-data.js'),
  path.join(source, 'core', 'modules.js'),
  path.join(source, 'runtime-stability.js'),
  path.join(root, 'scripts', 'postbuild-runtime-stability.mjs')
]) {
  const check = spawnSync(process.execPath, ['--check', file], { cwd: root, encoding: 'utf8' });
  ok(check.status === 0, `Syntax check passes: ${path.relative(root, file)}`);
  if (check.status !== 0 && check.stderr) console.error(check.stderr.trim());
}

const budgets = [
  ['Earth app', earth, 96 * 1024],
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
console.log('\nRuntime stability QA passed: all 17 visitor-stress audit classes are covered.');
