import { readFile } from 'node:fs/promises';
import process from 'node:process';

const ASSETS = [
  'content.js',
  'archive-content.js',
  'lab-page.js',
  'play/play-bootstrap.js',
  'core/modules.js',
  'play/play-runtime.js'
];

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function extract(html, label) {
  const refs = new Map();
  for (const asset of ASSETS) {
    const pattern = new RegExp(`src=["']${escapeRegExp(asset)}\\?v=([^"'&<>\\s]+)["']`);
    const match = html.match(pattern);
    if (!match) throw new Error(`${label}: missing versioned Lab runtime reference for ${asset}`);
    refs.set(asset, match[1]);
  }
  return refs;
}

function compare(expected, actual, label) {
  for (const asset of ASSETS) {
    const want = expected.get(asset);
    const got = actual.get(asset);
    if (got !== want) {
      throw new Error(`${label}: ${asset} cache token mismatch; expected ${want}, got ${got}`);
    }
  }
}

async function readTarget() {
  const args = process.argv.slice(2);
  if (args.includes('--dist')) {
    return {
      label: 'dist/lab.html',
      html: await readFile(new URL('../dist/lab.html', import.meta.url), 'utf8')
    };
  }
  const urlIndex = args.indexOf('--url');
  if (urlIndex >= 0) {
    const url = args[urlIndex + 1];
    if (!url) throw new Error('--url requires a value');
    const response = await fetch(url, { redirect:'follow', cache:'no-store' });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    return { label:url, html:await response.text() };
  }
  return null;
}

const sourceHtml = await readFile(new URL('../site/lab.html', import.meta.url), 'utf8');
const expected = extract(sourceHtml, 'site/lab.html');
const target = await readTarget();

if (target) {
  compare(expected, extract(target.html, target.label), target.label);
}

console.log(
  `Lab cache contract OK: ${[...expected].map(([asset, token]) => `${asset}@${token}`).join(' · ')}${target ? ` · matched ${target.label}` : ''}`
);
