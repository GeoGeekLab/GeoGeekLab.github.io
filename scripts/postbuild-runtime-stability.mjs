#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function exists(file) {
  try { await fs.access(file); return true; }
  catch { return false; }
}

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(file));
    else if (/\.html$/i.test(entry.name)) out.push(file);
  }
  return out;
}

function injectAssets(html) {
  if (!/runtime-stability\.css/i.test(html)) {
    html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/runtime-stability.css">\n</head>');
  }
  if (!/runtime-stability\.js/i.test(html)) {
    html = html.replace(/<\/body>/i, '<script src="/runtime-stability.js" defer></script>\n</body>');
  }
  return html;
}

function patchLab(html) {
  html = html
    .replace('LIVE FIELD / 50 SOURCES / ONE MAP', 'EARTH FIELD / 50 SOURCES / ONE MAP')
    .replace('<span><i></i>LIVE</span><b>UTC 13:25</b>', '<span><i></i>PREVIEW</span><b>SAMPLE</b>')
    .replace('TIME / 2026-09-15 13:25 UTC', 'TIME / ILLUSTRATIVE')
    .replace('08 ACTIVE', 'SAMPLE VIEW')
    .replace('LIVE INSTRUMENT', 'INSTRUMENT PREVIEW');

  const fallback = `<div class="runtime-fallback lab-static-fallback" role="note">
    <strong>Lab index fallback</strong>
    <p>The interactive project index is enhanced with JavaScript. The Earth Observatory remains directly accessible even if the dynamic index cannot initialize.</p>
    <a href="earth/">Open Earth Observatory ↗</a>
  </div>`;
  html = html.replace('<section class="lab-list" id="labList"></section>', `<section class="lab-list" id="labList">${fallback}</section>`);
  return html;
}

function patchElsewhere(html) {
  const fallback = `<div class="runtime-fallback elsewhere-static-fallback" role="note">
    <strong>Elsewhere index fallback</strong>
    <p>This collection is normally assembled from the site data model. If JavaScript is unavailable, return to the homepage or browse Field Notes.</p>
    <a href="field-notes.html">Browse Field Notes ↗</a>
  </div>`;
  return html.replace('<section class="elsewhere-grid" id="elsewhereGrid"></section>', `<section class="elsewhere-grid" id="elsewhereGrid">${fallback}</section>`);
}

function patchAtlas(html) {
  const fallback = `<section class="runtime-fallback atlas-static-fallback" aria-label="Atlas fallback">
    <strong>Atlas fallback</strong>
    <p>The relational projection requires JavaScript. The underlying collections remain available directly.</p>
    <a href="field-notes.html">Field Notes ↗</a> · <a href="lab.html">Lab ↗</a> · <a href="elsewhere.html">Elsewhere ↗</a>
  </section>`;
  if (!/atlas-static-fallback/i.test(html)) html = html.replace('<div class="atlas-controls">', `${fallback}\n<div class="atlas-controls">`);
  return html;
}

for (const file of await htmlFiles(dist)) {
  let html = await fs.readFile(file, 'utf8');
  const base = path.basename(file).toLowerCase();
  const rel = path.relative(dist, file).replace(/\\/g, '/');
  if (base === 'lab.html' || rel === 'lab.html') html = patchLab(html);
  if (base === 'elsewhere.html' || rel === 'elsewhere.html') html = patchElsewhere(html);
  if (base === 'atlas.html' || rel === 'atlas.html') html = patchAtlas(html);
  html = injectAssets(html);
  await fs.writeFile(file, html);
}

for (const required of ['runtime-stability.js', 'runtime-stability.css']) {
  if (!(await exists(path.join(dist, required)))) throw new Error(`Missing runtime stability asset: ${required}`);
}

console.log('Applied GeoGeek runtime stability guards and static fallbacks.');
