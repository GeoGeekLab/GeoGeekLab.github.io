#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const assert = (condition, message) => { if (!condition) throw new Error(`Origin handoff QA: ${message}`); };

const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
assert(home.includes('data-geogeek-home-canonical'), 'home canonical redirect marker is missing');
assert(home.includes('https://geogeeklab.github.io/index.html'), 'home canonical URL is not /index.html');
assert(home.includes("location.pathname === '/'"), 'root-path normalization is missing');

for (const relative of ['origin/index.html', 'origin/cn/index.html']) {
  const html = await fs.readFile(path.join(dist, relative), 'utf8');
  const scenes = html.match(/class="scene(?:\s|\")/g) || [];
  assert(html.includes('id="originExit"'), `${relative}: exit portal is missing`);
  assert(html.includes('href="/index.html"'), `${relative}: exit portal does not target /index.html`);
  assert(html.includes('function glideToExit()'), `${relative}: desktop exit glide is missing`);
  assert(html.includes('inExitZone()'), `${relative}: exit-zone navigation guard is missing`);
  assert(scenes.length === 9, `${relative}: expected exactly 9 narrative scenes, found ${scenes.length}`);
  assert(!html.includes('data-scene="9"'), `${relative}: exit portal must not become scene 09`);
}

console.log('Origin handoff QA passed.');
