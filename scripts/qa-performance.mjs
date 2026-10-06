#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = file => fs.readFile(path.join(dist, file), 'utf8');
const exists = file => fs.access(path.join(dist, file)).then(() => true).catch(() => false);
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

function googleFontLinks(html) {
  return [...html.matchAll(/<link\b[^>]*>/gi)]
    .map(match => match[0])
    .filter(tag => /fonts\.googleapis\.com\/css2/i.test(tag));
}

function stableFontStylesheetLinks(html) {
  return googleFontLinks(html)
    .filter(tag => /\brel=(['"])stylesheet\1/i.test(tag))
    .filter(tag => /data-geogeek-fonts=(['"])stable\1/i.test(tag));
}

function hasLegacyFontBehavior(tag) {
  return /display=optional/i.test(tag) ||
    /data-geogeek-fonts=(['"])async\1/i.test(tag) ||
    /\bmedia=(['"])print\1/i.test(tag) ||
    /\bonload\s*=/i.test(tag);
}

function hasStableFontContract(html) {
  const delivery = googleFontLinks(html);
  const stable = stableFontStylesheetLinks(html);
  return delivery.length === 1 &&
    stable.length === 1 &&
    /display=swap/i.test(stable[0]) &&
    !hasLegacyFontBehavior(delivery[0]);
}

const home = await read('index.html');
const fieldNotes = await read('field-notes.html');
const lab = await read('lab.html');
const atlas = await read('atlas.html');
const styles = await read('styles.css');

const rows = [...fieldNotes.matchAll(/<article\b[^>]*class=(['"])[^'"]*static-note-row[^'"]*\1[^>]*\bdata-series=(['"])([^'"]+)\2[^>]*\bdata-record-ref=(['"])([^'"]+)\4/gi)];
check(rows.length === 23, 'PERF-01 all 23 static Field Notes expose filter metadata');
check(rows.every(match => /^(observation|scale|causality|representation|practice)$/.test(match[3])), 'PERF-01 Field Note rows use canonical series keys');
check(/<body[^>]*\bclass=(['"])[^'"]*ux-mobile-v5[^'"]*ux-page-field-notes[^'"]*\1/i.test(fieldNotes), 'PERF-01 Field Notes mobile reading state exists in first-response HTML');
check(/<body[^>]*\bclass=(['"])[^'"]*ux-mobile-v5[^'"]*ux-page-atlas[^'"]*\1/i.test(atlas), 'PERF-01 Atlas mobile layout state exists in first-response HTML');
check(/editorial-layout\.css/.test(fieldNotes) && /geo-interactions\.css/.test(fieldNotes), 'PERF-02 Field Notes layout styles are first-response resources');
check(!/data-idle-\s+src\s*=/i.test(fieldNotes), 'PERF-03 data-idle-src attributes remain inert and intact');
check(accidentalBlockingLocalScripts(fieldNotes).length === 0, 'PERF-03 Field Notes has no accidental blocking local classic scripts');

check(!(await exists('earth/index.html')), 'PERF-04 standalone Earth Observatory is absent from the production artifact');
check(!/earth-lab-preview|earth-observatory-heading|earth-observatory\.jpg/i.test(lab), 'PERF-04 Lab first response has no standalone Earth Observatory promotion');

check(/\/commons\/loader\.js\?v=20261001a/.test(home), 'PERF-05 Home uses the viewport-driven Commons loader');
check(!/<script[^>]+src=(['"])(?:\.?\/)?commons\/(?:config|geo|demo-data|commons-data|commons)\.js[^'"]*\1/i.test(home), 'PERF-05 heavy Commons runtime is absent from the initial Home script graph');

check(hasStableFontContract(home), 'PERF-06 webfont delivery is single-source and stable in first-response HTML');
check(!/fonts\.googleapis\.com/i.test(styles), 'PERF-06 site CSS contains no render-blocking Google Fonts imports');
check(!/display=optional/i.test(styles), 'PERF-06 site CSS does not restore optional font-display behavior');

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
const unstableFontPages = [];
for (const file of htmlFiles) {
  const html = await fs.readFile(file, 'utf8');
  blockingCount += accidentalBlockingLocalScripts(html).length;
  malformedIdleCount += (html.match(/data-idle-\s+src\s*=/gi) || []).length;
  if (/[/\\]field-notes[/\\][^/\\]+[/\\]index\.html$/.test(file)) articleSrcsetCount += (html.match(/\bsrcset=(['"])/gi) || []).length;
  if (!hasStableFontContract(html)) unstableFontPages.push(path.relative(dist, file).replaceAll('\\', '/'));
}
if (unstableFontPages.length) console.error(`Unstable font pages: ${unstableFontPages.join(', ')}`);
check(unstableFontPages.length === 0, 'PERF-06 every generated HTML page uses the stable webfont contract');
check(blockingCount === 0, 'PERF-07 generated HTML has no accidental blocking local classic scripts');
check(malformedIdleCount === 0, 'PERF-07 generated HTML preserves data-idle-src attributes');

const responsiveVariants = allFiles.filter(file => /\.w(?:640|1280)\.(?:png|jpe?g|webp)$/i.test(file));
check(responsiveVariants.length > 0, 'PERF-08 production build generated responsive raster variants');
check(articleSrcsetCount > 0, 'PERF-08 Field Note HTML publishes responsive srcset candidates');

if (failures) {
  console.error(`\nPerformance QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log(`\nPerformance QA passed: ${htmlFiles.length} HTML files checked · ${responsiveVariants.length} responsive variants · ux-preinit is the sole intentional sync bootstrap.`);
