#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const site = path.join(root, 'site');
const preinitVersion = '20261005a';

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(file));
    else if (/\.html$/i.test(entry.name)) out.push(file);
  }
  return out;
}

const shouldGate = relative => !/^(?:play|earth|orbital)\//i.test(relative);
const fail = message => { throw new Error(`Visual readiness QA: ${message}`); };

const runtimeFile = path.join(dist, 'visual-readiness.js');
const runtime = await fs.readFile(runtimeFile, 'utf8').catch(() => '');
if (!runtime) fail('missing dist/visual-readiness.js');
for (const contract of ['pagehide', 'pageshow', 'event.persisted', 'beginLeave', '__GEOGEEK_VISUAL_READY__']) {
  if (!runtime.includes(contract)) fail(`runtime missing ${contract} contract`);
}

const sourcePreinit = await fs.readFile(path.join(site, 'ux-preinit.js'), 'utf8');
if (/location\.replace\(['"]\/index\.html/.test(sourcePreinit)) {
  fail('ux-preinit still redirects / to /index.html');
}

let checked = 0;
for (const file of await htmlFiles(dist)) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (!shouldGate(relative)) continue;
  const html = await fs.readFile(file, 'utf8');
  const required = [
    'data-geogeek-boot-preinit',
    'data-geogeek-boot-critical',
    'id="geogeek-boot-cover"',
    'data-geogeek-boot-preload',
    'data-geogeek-visual-readiness="true"'
  ];
  for (const marker of required) {
    if (!html.includes(marker)) fail(`${relative} missing ${marker}`);
  }

  const preinitRefs = [...html.matchAll(/src=(['"])([^'"]*\/)?ux-preinit\.js(?:\?v=([^'"]+))?\1/gi)];
  for (const match of preinitRefs) {
    if (match[3] !== preinitVersion) {
      fail(`${relative} references stale ux-preinit cache key ${match[3] || '(none)'}`);
    }
  }
  checked += 1;
}

if (checked < 10) fail(`expected broad HTML coverage, checked only ${checked} documents`);

const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
if (/location\.replace\(['"]\/index\.html/.test(home)) {
  fail('built home still performs duplicate / -> /index.html navigation');
}
if (!/rel="canonical" href="https:\/\/geogeeklab\.github\.io\/index\.html"/.test(home)) {
  fail('home canonical link was lost while removing the client redirect');
}
if (!home.includes(`/ux-preinit.js?v=${preinitVersion}`)) {
  fail('home does not use the refreshed ux-preinit cache key');
}

const origin = await fs.readFile(path.join(dist, 'origin', 'index.html'), 'utf8');
if (!/dataset\.geogeekBootSurface\s*=\s*['"]dark['"]/.test(origin)) {
  fail('Origin does not initialize the dark readiness surface');
}

console.log(`Visual readiness QA passed for ${checked} site documents.`);
