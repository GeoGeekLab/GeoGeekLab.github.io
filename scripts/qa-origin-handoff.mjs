#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const assert = (condition, message) => { if (!condition) throw new Error(`Origin handoff QA: ${message}`); };

const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
assert(home.includes('rel="canonical" href="https://geogeeklab.github.io/index.html"'), 'home canonical URL is not /index.html');
assert(!home.includes("location.replace('/index.html'"), 'home must not perform a second client-side / -> /index.html navigation');

for (const relative of ['origin/index.html', 'origin/cn/index.html']) {
  const html = await fs.readFile(path.join(dist, relative), 'utf8');
  const scenes = html.match(/class="scene(?:\s|\")/g) || [];
  assert(html.includes('id="originExit"'), `${relative}: exit portal is missing`);
  assert(html.includes('href="/index.html"'), `${relative}: exit portal does not target /index.html`);
  assert(html.includes('function glideToExit()'), `${relative}: desktop exit glide is missing`);
  assert(html.includes('function enterHome()'), `${relative}: terminal home transition is missing`);
  assert(html.includes("location.assign('/index.html')"), `${relative}: downward handoff does not enter /index.html`);
  assert(html.includes("document.body.classList.toggle('origin-exit-active',inExitZone())"), `${relative}: Origin chrome restoration is missing`);
  assert(html.includes('body.origin-exit-active .brand'), `${relative}: terminal chrome styling is missing`);
  assert(html.includes('.brand{min-height:32px}'), `${relative}: brand/language centerline alignment fix is missing`);
  assert(scenes.length === 9, `${relative}: expected exactly 9 narrative scenes, found ${scenes.length}`);
  assert(!html.includes('data-scene="9"'), `${relative}: exit portal must not become scene 09`);
}

const zh = await fs.readFile(path.join(dist, 'origin/cn/index.html'), 'utf8');
// Protect the approved Chinese narrative in the generated Pages HTML.
for (const copy of [
  '探问宇宙，是寻找来处，亦是叩问归途。',
  '我们躯体里的碳、氧与铁，皆曾在恒星深处孕育。',
  '当繁星陨落，它们便散作星际里的微尘。',
  '不是物理公式里冰冷的算符，而是古人对万物生成的一次言说。',
  '我们追问宇宙的起源，也在寻找意识的来处。',
  '归途 / 已竟',
  '你，在此处',
  '万象归于一念。',
  '开始GeoGeek',
]) {
  assert(zh.includes(copy), `origin/cn/index.html: missing approved copy “${copy}”`);
}
for (const outdated of [
  '此刻为你',
  '行至水穷，坐看云起。',
  '探问宇宙，是寻来处，亦是归途。',
  '也在辨认自身的来处。',
]) {
  assert(!zh.includes(outdated), `origin/cn/index.html: outdated copy remains “${outdated}”`);
}
assert(
  /<section class="origin-exit"[^>]*>[\s\S]*?<h2 class="origin-exit-title" id="originExitTitle">你，在此处<\/h2>[\s\S]*?<p class="origin-exit-body">万象归于一念。<\/p>/u.test(zh),
  'origin/cn/index.html: final handoff must render the approved title and body in the exit section',
);

console.log('Origin handoff QA passed.');
