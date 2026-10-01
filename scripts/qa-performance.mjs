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

function executableScripts(html) {
  return [...html.matchAll(/<script\b([^>]*)><\/script>/gi)].flatMap(match => {
    const attrs = match[1];
    const source = attrs.match(/(?:^|\s)src\s*=\s*(['"])([^'"]+)\1/i);
    return source ? [{ attrs, src: source[2] }] : [];
  });
}

function accidentalBlockingLocalScripts(html) {
  return executableScripts(html).filter(({ attrs, src }) =>
    !/^(?:https?:)?\/\//i.test(src) &&
    !isIntentionalSyncBootstrap(src) &&
    !/\b(?:defer|async)\b/i.test(attrs) &&
    !/\btype\s*=\s*(['"])module\1/i.test(attrs)
  );
}

const home = await read('index.html');
const fieldNotes = await read('field-notes.html');
const lab = await read('lab.html');
const atlas = await read('atlas.html');
const earth = await read('earth/index.html');
const labPreview = await read('lab-real-previews.js');
const styles = await read('styles.css');
const earthRefinement = await read('earth/earth-refinement.css');

const rows = [...fieldNotes.matchAll(/<article\b[^>]*class=(['"])[^'"]*static-note-row[^'"]*\1[^>]*\bdata-series=(['"])([^'"]+)\2[^>]*\bdata-record-ref=(['"])([^'"]+)\4/gi)];
check(rows.length === 23, 'PERF-01 all 23 static Field Notes expose filter metadata');
check(rows.every(match => /^(observation|scale|causality|representation|practice)$/.test(match[3])), 'PERF-01 Field Note rows use canonical series keys');
check(/<body[^>]*\bclass=(['"])[^'"]*ux-mobile-v5[^'"]*ux-page-field-notes[^'"]*\1/i.test(fieldNotes), 'PERF-01 Field Notes mobile reading state exists in first-response HTML');
check(/<body[^>]*\bclass=(['"])[^'"]*ux-mobile-v5[^'"]*ux-page-atlas[^'"]*\1/i.test(atlas), 'PERF-01 Atlas mobile layout state exists in first-response HTML');
check(/editorial-layout\.css/.test(fieldNotes) && /geo-interactions\.css/.test(fieldNotes), 'PERF-02 Field Notes layout styles are first-response resources');
check(!/data-idle-\s+src\s*=/i.test(fieldNotes), 'PERF-03 data-idle-src attributes remain inert and intact');
check(accidentalBlockingLocalScripts(fieldNotes).length === 0, 'PERF-03 Field Notes has no accidental blocking local classic scripts');

check(/id="earthActivate"/.test(earth) && /src="boot\.js\?v=20261001a"/.test(earth), 'PERF-04 Earth ships a progressive activation shell');
check(!/unpkg\.com\/maplibre-gl@6\.6\.0\/dist\/maplibre-gl\.css/.test(earth), 'PERF-04 MapLibre CSS is off the Earth critical path');

check(/rel="preload" as="image" href="\/assets\/lab\/previews\/earth-observatory\.jpg\?v=20260930i" fetchpriority="high"/.test(lab), 'PERF-05 Lab LCP preview is discoverable from the initial document');
check(/earth-preview-screen is-real-output[^>]*data-real-preview="true"[^>]*>[\s\S]*?<img[^>]+earth-observatory\.jpg\?v=20260930i[^>]+loading="eager"[^>]+fetchpriority="high"/i.test(lab), 'PERF-05 Lab LCP image is present in first-response HTML');
check(/loading = eager \? 'eager' : 'lazy'/.test(labPreview) && /fetchPriority = 'high'/.test(labPreview), 'PERF-05 Lab preview enhancement preserves eager priority semantics');

check(/\/commons\/loader\.js\?v=20261001a/.test(home), 'PERF-06 Home uses the viewport-driven Commons loader');
check(!/<script[^>]+src=(['"])(?:\.?\/)?commons\/(?:config|geo|demo-data|commons-data|commons)\.js[^'"]*\1/i.test(home), 'PERF-06 heavy Commons runtime is absent from the initial Home script graph');

check(/data-geogeek-fonts="async"/.test(home) && /media="print" onload="this\.media='all'"/.test(home), 'PERF-07 webfont stylesheet is non-blocking in first-response HTML');
check(!/fonts\.googleapis\.com/i.test(styles) && !/fonts\.googleapis\.com/i.test(earthRefinement), 'PERF-07 CSS contains no render-blocking Google Fonts imports');
check(!/display=swap/.test(styles) && !/display=swap/.test(earthRefinement), 'PERF-07 slow first visits avoid late webfont swaps');

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
let malformedIdleCount = 0;
let articleSrcsetCount = 0;
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  blockingCount += accidentalBlockingLocalScripts(html).length;
  malformedIdleCount += (html.match(/data-idle-\s+src\s*=/gi) || []).length;
  if (/[/\\]field-notes[/\\][^/\\]+[/\\]index\.html$/.test(file)) articleSrcsetCount += (html.match(/\bsrcset=(['"])/gi) || []).length;
}
check(blockingCount === 0, 'PERF-08 generated HTML has no accidental blocking local classic scripts');
check(malformedIdleCount === 0, 'PERF-08 generated HTML preserves data-idle-src attributes');

const responsiveVariants = allFiles.filter(file => /\.w(?:640|1280)\.(?:png|jpe?g|webp)$/i.test(file));
check(responsiveVariants.length > 0, 'PERF-09 production build generated responsive raster variants');
check(articleSrcsetCount > 0, 'PERF-09 Field Note HTML publishes responsive srcset candidates');

if (failures) {
  console.error(`\nPerformance QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log(`\nPerformance QA passed: ${htmlFiles.length} HTML files checked · ${responsiveVariants.length} responsive variants · ux-preinit is the sole intentional sync bootstrap.`);
