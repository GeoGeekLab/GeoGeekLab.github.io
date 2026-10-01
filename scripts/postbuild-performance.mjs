#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const contentRoot = path.join(root, 'content', 'field-notes');

const exists = file => fs.access(file).then(() => true).catch(() => false);

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(file));
    else out.push(file);
  }
  return out;
}

async function loadFieldNoteSeriesKeys() {
  const map = new Map();
  if (!(await exists(contentRoot))) return map;
  for (const entry of await fs.readdir(contentRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join(contentRoot, entry.name, 'record.json');
    if (!(await exists(file))) continue;
    const record = JSON.parse(await fs.readFile(file, 'utf8'));
    const ref = String(record.ref || record.id || entry.name).trim();
    const key = String(record?.data?.seriesKey || '').trim().toLowerCase();
    if (ref && key) map.set(ref, key);
  }
  return map;
}

function isIntentionalSyncBootstrap(src) {
  return /(?:^|\/)ux-preinit\.js(?:[?#].*)?$/i.test(src);
}

function addDeferToClassicLocalScripts(html) {
  return html.replace(/<script\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)><\/script>/gi, (match, before, quote, src, after) => {
    const attrs = `${before} ${after}`;
    if (/\b(?:defer|async)\b/i.test(attrs) || /\btype\s*=\s*(['"])module\1/i.test(attrs)) return match;
    if (/^(?:https?:)?\/\//i.test(src)) return match;
    if (/\bdata-idle-src\b/i.test(attrs)) return match;
    if (isIntentionalSyncBootstrap(src)) return match;
    return `<script${before} src=${quote}${src}${quote}${after} defer></script>`;
  });
}

function addConnectionHints(html) {
  if (!/rel=(['"])preconnect\1[^>]*fonts\.googleapis\.com/i.test(html)) {
    const hints = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    html = html.replace(/<\/head>/i, `${hints}\n</head>`);
  }
  return html;
}

function stabilizeFieldNotes(html, seriesKeys) {
  if (!/data-static-note-list/i.test(html)) return html;
  const links = [
    '<link rel="stylesheet" href="/editorial-layout.css?v=20260930a">',
    '<link rel="stylesheet" href="/geo-interactions.css?v=20260930g">'
  ].filter(link => !html.includes(link.split('href="')[1].split('"')[0]));
  if (links.length) html = html.replace(/<\/head>/i, `${links.join('\n')}\n</head>`);

  html = html.replace(/(<article\b[^>]*class=(['"])[^'"]*static-note-row[^'"]*\2[^>]*\bdata-series=(['"]))[^'"]*(\3[^>]*\bdata-record-ref=(['"])([^'"]+)\5)/gi,
    (match, start, _classQuote, _seriesQuote, rest, _refQuote, ref) => {
      const key = seriesKeys.get(ref);
      return key ? `${start}${key}${rest}` : match;
    });
  return html;
}

function progressiveEarth(html) {
  if (!/id=(['"])map\1/i.test(html)) return html;

  // MapLibre is a large interactive renderer. Its CSS and module graph should
  // not delay the first usable shell; boot.js loads them only on user intent.
  html = html.replace(/\s*<link\b[^>]*href=(['"])https:\/\/unpkg\.com\/maplibre-gl@6\.6\.0\/dist\/maplibre-gl\.css\1[^>]*>\s*/i, '\n');

  html = html.replace(/<div id=(['"])map\1([^>]*)><\/div>/i, (_m, q, rest) => `<div id=${q}map${q}${rest}><div class="earth-boot" id="earthBoot"><div class="earth-boot-card"><span>EARTH OBSERVATORY / INTERACTIVE RENDERER</span><strong>Load the map when you need it.</strong><p id="earthBootStatus">The source catalogue shell is available immediately. MapLibre, tiles, and live provider requests stay off the critical path until activation.</p><button id="earthActivate" type="button">ACTIVATE INTERACTIVE MAP</button><small>ON DEMAND · SAVES INITIAL CPU / NETWORK / BATTERY</small></div></div></div>`);

  html = html.replace(/<script\b[^>]*\btype=(['"])module\1[^>]*\bsrc=(['"])app\.js(?:\?[^'"]*)?\2[^>]*><\/script>/i, '<script type="module" src="boot.js?v=20261001a"></script>');
  return html;
}

async function patchHtml(file, seriesKeys) {
  let html = await fs.readFile(file, 'utf8');
  html = addDeferToClassicLocalScripts(html);
  html = addConnectionHints(html);
  if (path.basename(file) === 'field-notes.html' && path.dirname(file) === dist) html = stabilizeFieldNotes(html, seriesKeys);
  if (path.relative(dist, file).replaceAll('\\', '/') === 'earth/index.html') html = progressiveEarth(html);
  await fs.writeFile(file, html);
}

async function patchCss(file) {
  let css = await fs.readFile(file, 'utf8');
  // Slow first visits keep metric-compatible platform fallbacks rather than
  // swapping brand webfonts after layout has already stabilized.
  css = css.replace(/display=swap/g, 'display=optional');
  await fs.writeFile(file, css);
}

async function main() {
  if (!(await exists(dist))) throw new Error(`Missing build output: ${dist}`);
  const files = await walk(dist);
  const seriesKeys = await loadFieldNoteSeriesKeys();
  for (const file of files.filter(file => file.endsWith('.html'))) await patchHtml(file, seriesKeys);
  for (const file of files.filter(file => file.endsWith('.css'))) await patchCss(file);
  console.log(`Applied browser performance pass to ${files.filter(file => file.endsWith('.html')).length} HTML files · ${seriesKeys.size} Field Note series keys.`);
}

await main();
