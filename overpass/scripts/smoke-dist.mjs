import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const dist = resolve(root, 'overpass/upstream/dist');
const required = [
  'index.html', 'admin.html', 'data/catalog.json',
  'textures/earth-day-1k.webp', 'textures/earth-night-1k.webp',
  'brand/wordmark.svg'
];
for (const path of required) assert(existsSync(resolve(dist, path)), 'Built artifact missing: ' + path);
const index = readFileSync(resolve(dist, 'index.html'), 'utf8');
assert(index.includes('Something watched you this week'), 'Original landing content missing');
assert(/assets\/[^"' >]+\.js/.test(index), 'Bundled JavaScript not linked');
const assets = readdirSync(resolve(dist, 'assets')).filter(x => x.endsWith('.js') || x.endsWith('.css'));
assert(assets.length >= 3, 'Bundle assets not produced');
const catalog = JSON.parse(readFileSync(resolve(dist, 'data/catalog.json'), 'utf8'));
assert(Array.isArray(catalog) || typeof catalog === 'object', 'Catalog invalid');
console.log('Watched standalone build smoke PASS');
console.log('Bundled JS/CSS files:', assets.length);
console.log('Catalog bytes:', statSync(resolve(dist, 'data/catalog.json')).size);
console.log('Known next-round portability risks: root-absolute public asset paths, host-specific /api and /s routes, Watched branding.');
