#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const contentRoot = path.join(root, 'content', 'field-notes');
const fontCss = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&display=optional';

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
  return html.replace(/<script\b([^>]*)><\/script>/gi, (match, attrs) => {
    const source = attrs.match(/(?:^|\s)src\s*=\s*(['"])([^'"]+)\1/i);
    if (!source) return match;
    const src = source[2];
    // Startup dependencies consumed by inline entrypoints must retain parser order.
    if (/\bdata-geogeek-sync-dependency(?:\s|=|$)/i.test(attrs)) return match;
    if (/\bdata-idle-src\s*=/i.test(attrs)) return match;
    if (/\b(?:defer|async)\b/i.test(attrs) || /\btype\s*=\s*(['"])module\1/i.test(attrs)) return match;
    if (/^(?:https?:)?\/\//i.test(src)) return match;
    if (isIntentionalSyncBootstrap(src)) return match;
    return match.replace(/><\/script>$/i, ' defer></script>');
  });
}

function addConnectionHints(html) {
  if (!/rel=(['"])preconnect\1[^>]*fonts\.googleapis\.com/i.test(html)) {
    const hints = '<link rel="preconnect" href="https://fonts.googleapis.com">\n<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>';
    html = html.replace(/<\/head>/i, `${hints}\n</head>`);
  }
  return html;
}

function addAsyncFonts(html) {
  if (/data-geogeek-fonts=(['"])async\1/i.test(html)) return html;
  const escaped = fontCss.replace(/&/g, '&amp;');
  const tags = [
    `<link rel="preload" as="style" href="${escaped}" data-geogeek-fonts="async">`,
    `<link rel="stylesheet" href="${escaped}" media="print" onload="this.media='all'">`,
    `<noscript><link rel="stylesheet" href="${escaped}"></noscript>`
  ].join('\n');
  return html.replace(/<\/head>/i, `${tags}\n</head>`);
}

function primeMobilePageState(html, pageKind) {
  return html.replace(/<body\b([^>]*)>/i, (match, attrs) => {
    const classMatch = attrs.match(/\bclass=(['"])([^'"]*)\1/i);
    const required = ['ux-inner-page', 'ux-mobile-v5', `ux-page-${pageKind}`];
    if (classMatch) {
      const classes = new Set(classMatch[2].split(/\s+/).filter(Boolean));
      required.forEach(value => classes.add(value));
      const replacement = `class=${classMatch[1]}${[...classes].join(' ')}${classMatch[1]}`;
      attrs = attrs.replace(classMatch[0], replacement);
    } else {
      attrs += ` class="${required.join(' ')}"`;
    }
    if (!/\bdata-page-kind=/.test(attrs)) attrs += ` data-page-kind="${pageKind}"`;
    return `<body${attrs}>`;
  });
}

function replaceDivByClass(html, className, replacement) {
  const escaped = className.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const open = new RegExp(`<div\\b[^>]*class=(['"])[^'"]*\\b${escaped}\\b[^'"]*\\1[^>]*>`, 'i');
  const match = open.exec(html);
  if (!match) return html;

  let depth = 1;
  const tags = /<\/?div\b[^>]*>/gi;
  tags.lastIndex = match.index + match[0].length;
  let tag;
  while ((tag = tags.exec(html))) {
    if (/^<\/div/i.test(tag[0])) depth -= 1;
    else depth += 1;
    if (depth === 0) return `${html.slice(0, match.index)}${replacement}${html.slice(tags.lastIndex)}`;
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

  html = primeMobilePageState(html, 'field-notes');
  html = html.replace(/(<article\b[^>]*class=(['"])[^'"]*static-note-row[^'"]*\2[^>]*\bdata-series=(['"]))[^'"]*(\3[^>]*\bdata-record-ref=(['"])([^'"]+)\5)/gi,
    (match, start, _classQuote, _seriesQuote, rest, _refQuote, ref) => {
      const key = seriesKeys.get(ref);
      return key ? `${start}${key}${rest}` : match;
    });
  return html;
}

function stabilizeAtlas(html) {
  if (!/class=(['"])[^'"]*atlas-page[^'"]*\1/i.test(html)) return html;
  return primeMobilePageState(html, 'atlas');
}

function prioritizeLabPreview(html) {
  if (!/class=(['"])[^'"]*earth-lab-preview/.test(html)) return html;
  const href = '/assets/lab/previews/earth-observatory.jpg?v=20260930i';
  if (!html.includes(`rel="preload" as="image" href="${href}"`)) {
    html = html.replace(/<\/head>/i, `<link rel="preload" as="image" href="${href}" fetchpriority="high">\n</head>`);
  }

  const staticPreview = `<div class="earth-preview-screen is-real-output" data-real-preview="true" aria-hidden="true"><img src="${href}" alt="Real Earth Observatory interface preview" loading="eager" decoding="async" fetchpriority="high"></div>`;
  return replaceDivByClass(html, 'earth-preview-screen', staticPreview);
}

function lazyHomeCommons(html) {
  if (!/id=(['"])commons\1/i.test(html) || !/commons\/commons\.js/i.test(html)) return html;
  const commonsFiles = new Set([
    'commons/config.js',
    'commons/geo.js',
    'commons/demo-data.js',
    'commons/commons-data.js',
    'commons/commons.js'
  ]);

  html = html.replace(/\s*<script\b([^>]*)><\/script>/gi, (match, attrs) => {
    const source = attrs.match(/(?:^|\s)src\s*=\s*(['"])([^'"]+)\1/i);
    if (!source) return match;
    const clean = source[2].replace(/^\.?\//, '').replace(/[?#].*$/, '');
    return commonsFiles.has(clean) ? '' : match;
  });

  if (!/commons\/loader\.js/.test(html)) {
    html = html.replace(/<\/body>/i, '<script src="/commons/loader.js?v=20261001a" defer></script>\n</body>');
  }
  return html;
}

function progressiveEarth(html) {
  if (!/id=(['"])map\1/i.test(html)) return html;
  html = html.replace(/\s*<link\b[^>]*href=(['"])https:\/\/unpkg\.com\/maplibre-gl@6\.6\.0\/dist\/maplibre-gl\.css\1[^>]*>\s*/i, '\n');
  html = html.replace(/<div id=(['"])map\1([^>]*)><\/div>/i, (_m, q, rest) => `<div id=${q}map${q}${rest}><div class="earth-boot" id="earthBoot"><div class="earth-boot-card"><span>EARTH OBSERVATORY / INTERACTIVE RENDERER</span><strong>Load the map when you need it.</strong><p id="earthBootStatus">The source catalogue shell is available immediately. MapLibre, tiles, and provider requests stay off the critical path until activation.</p><button id="earthActivate" type="button">ACTIVATE INTERACTIVE MAP</button><small>ON DEMAND · SAVES INITIAL CPU / NETWORK / BATTERY</small></div></div></div>`);
  html = html.replace(/<script\b[^>]*\btype=(['"])module\1[^>]*\bsrc=(['"])(?:app|runtime)\.js(?:\?[^'"]*)?\2[^>]*><\/script>/i, '<script type="module" src="boot.js?v=20261002a"></script>');
  return html;
}

async function patchHtml(file, seriesKeys) {
  let html = await fs.readFile(file, 'utf8');
  html = addDeferToClassicLocalScripts(html);
  html = addConnectionHints(html);
  html = addAsyncFonts(html);
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (relative === 'field-notes.html') html = stabilizeFieldNotes(html, seriesKeys);
  if (relative === 'lab.html') html = prioritizeLabPreview(html);
  if (relative === 'atlas.html') html = stabilizeAtlas(html);
  if (relative === 'index.html') html = lazyHomeCommons(html);
  if (relative === 'earth/index.html') html = progressiveEarth(html);
  await fs.writeFile(file, html);
}

async function patchCss(file) {
  let css = await fs.readFile(file, 'utf8');
  css = css.replace(/@import\s+url\((['"])https:\/\/fonts\.googleapis\.com\/[^'"]+\1\);?\s*/gi, '');
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
