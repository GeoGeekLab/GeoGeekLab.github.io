#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const labFile = path.join(dist, 'lab.html');
const gameFile = path.join(dist, 'gravity-trace', 'index.html');

await fs.access(gameFile);
let html = await fs.readFile(labFile, 'utf8');

if (!html.includes('/gravity-trace/lab-card.css')) {
  html = html.replace(/<\/head>/i, '<link rel="stylesheet" href="/gravity-trace/lab-card.css">\n</head>');
}

if (!html.includes('class="gravity-trace-card"')) {
  const card = `<a class="gravity-trace-card" href="gravity-trace/" aria-label="Open Gravity Trace spatial reasoning game">
  <div class="gravity-trace-copy">
    <span>PLAY / SPATIAL REASONING / ORIGINAL</span>
    <h2>Gravity Trace</h2>
    <p>Place temporary gravity wells, bend moving trajectories, and guide survey tracers through a changing spatial field.</p>
  </div>
  <span class="gravity-trace-enter">ENTER FIELD ↗</span>
</a>`;
  html = html.replace('<section class="lab-list" id="labList">', `${card}\n<section class="lab-list" id="labList">`);
}

html = html.replace(
  'The Earth Observatory remains directly accessible even if the dynamic index cannot initialize.',
  'The Earth Observatory and Gravity Trace remain directly accessible even if the dynamic index cannot initialize.'
).replace(
  '<a href="earth/">Open Earth Observatory ↗</a>',
  '<a href="earth/">Open Earth Observatory ↗</a> · <a href="gravity-trace/">Open Gravity Trace ↗</a>'
);

await fs.writeFile(labFile, html);
console.log('Integrated Gravity Trace into GeoGeek Lab.');
