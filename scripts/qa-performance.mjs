#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = file => fs.readFile(path.join(dist, file), 'utf8');
const isIntentionalSyncBootstrap = src => /(?:^|\/)ux-preinit\.js(?:[?#].*)?$/i.test(src);

let failures = 0;
function check(ok, label) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}

const fieldNotes = await read('field-notes.html');
const earth = await read('earth/index.html');
const labPreview = await read('lab-real-previews.js');
const styles = await read('styles.css');
const earthRefinement = await read('earth/earth-refinement.css');

const rows = [...fieldNotes.matchAll(/<article\b[^>]*class=(['"])[^'"]*static-note-row[^'"]*\1[^>]*\bdata-series=(['"])([^'"]+)\2[^>]*\bdata-record-ref=(['"])([^'"]+)\4/gi)];
check(rows.length === 23, 'PERF-01 all 23 static Field Notes expose filter metadata');
check(rows.every(match => /^(observation|scale|causality|representation|practice)$/.test(match[3])), 'PERF-01 Field Note rows use canonical series keys');
check(/editorial-layout\.css/.test(fieldNotes) && /geo-interactions\.css/.test(fieldNotes), 'PERF-02 Field Notes layout styles are first-response resources');

const blockingLocal = [...fieldNotes.matchAll(/<script\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)><\/script>/gi)]
  .filter(([, before,, src, after]) => !/^(?:https?:)?\/\//i.test(src) && !isIntentionalSyncBootstrap(src) && !/\b(?:defer|async|data-idle-src)\b/i.test(`${before} ${after}`) && !/\btype\s*=\s*(['"])module\1/i.test(`${before} ${after}`));
check(blockingLocal.length === 0, 'PERF-03 Field Notes has no accidental blocking local classic scripts');

check(/id="earthActivate"/.test(earth) && /src="boot\.js\?v=20261001a"/.test(earth), 'PERF-04 Earth ships a progressive activation shell');
check(!/unpkg\.com\/maplibre-gl@6\.6\.0\/dist\/maplibre-gl\.css/.test(earth), 'PERF-04 MapLibre CSS is off the Earth critical path');
check(/loading = eager \? 'eager' : 'lazy'/.test(labPreview) && /fetchPriority = 'high'/.test(labPreview), 'PERF-05 Lab LCP preview is eager and high priority');
check(!/display=swap/.test(styles) && !/display=swap/.test(earthRefinement), 'PERF-06 throttled first visits avoid late webfont swaps');

const allFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else allFiles.push(file);
  }
}
await walk(dist);
const htmlFiles = allFiles.filter(file => file.endsWith('.html'));

let blockingCount = 0;
let articleSrcsetCount = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  blockingCount += [...html.matchAll(/<script\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)><\/script>/gi)]
    .filter(([, before,, src, after]) => !/^(?:https?:)?\/\//i.test(src) && !isIntentionalSyncBootstrap(src) && !/\b(?:defer|async|data-idle-src)\b/i.test(`${before} ${after}`) && !/\btype\s*=\s*(['"])module\1/i.test(`${before} ${after}`)).length;
  if (/[/\\]field-notes[/\\][^/\\]+[/\\]index\.html$/.test(file)) articleSrcsetCount += (html.match(/\bsrcset=(['"])/gi) || []).length;
}
check(blockingCount === 0, 'PERF-07 generated HTML has no accidental blocking local classic scripts');

const responsiveVariants = allFiles.filter(file => /\.w(?:640|1280)\.(?:png|jpe?g|webp)$/i.test(file));
check(responsiveVariants.length > 0, 'PERF-08 production build generated responsive raster variants');
check(articleSrcsetCount > 0, 'PERF-08 Field Note HTML publishes responsive srcset candidates');

if (failures) {
  console.error(`\nPerformance QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log(`\nPerformance QA passed: ${htmlFiles.length} HTML files checked · ${responsiveVariants.length} responsive variants · ux-preinit is the sole intentional sync bootstrap.`);
