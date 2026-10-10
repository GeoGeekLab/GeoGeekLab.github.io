#!/usr/bin/env node
// Fail a production release if any Lab capture is missing or invalid.
// Local builds without captures can still render explicit fallback cards.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const target = process.argv.includes('--dist') ? 'dist' : 'site';
const base = path.join(root, target);
const kinds = [
  'orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'water',
  'locate', 'zone', 'path', 'project', 'light', 'swath'
];
const expected = [...kinds.map(kind => kind + '.jpg'), 'orbit.webp'];
const errors = [];

const runtime = path.join(base, 'lab-real-previews.js');
let version = '';
try {
  const script = fs.readFileSync(runtime, 'utf8');
  version = script.match(/const VERSION = ['"](capture-[0-9a-f]{12})['"];/)?.[1] || '';
  if (!version) errors.push(target + ': captured preview version missing');
} catch (error) {
  errors.push(runtime + ': ' + error.message);
}

for (const filename of expected) {
  const file = path.join(base, 'assets', 'lab', 'previews', filename);
  try {
    const stat = fs.statSync(file);
    if (!stat.isFile() || stat.size < 8000) {
      errors.push(filename + ': absent or less than 8 KiB');
      continue;
    }
    const fd = fs.openSync(file, 'r');
    const header = Buffer.alloc(12);
    try { fs.readSync(fd, header, 0, 12, 0); }
    finally { fs.closeSync(fd); }
    const valid = filename.endsWith('.jpg')
      ? header[0] === 0xff && header[1] === 0xd8 && header[2] === 0xff
      : header.toString('ascii', 0, 4) === 'RIFF' &&
        header.toString('ascii', 8, 12) === 'WEBP';
    if (!valid) errors.push(filename + ': invalid image signature');
  } catch (error) {
    errors.push(filename + ': ' + error.message);
  }
}

if (target === 'dist') {
  try {
    const html = fs.readFileSync(path.join(base, 'lab.html'), 'utf8');
    for (const kind of kinds) {
      const marker = 'data-real-preview="' + kind + '"';
      const image = '/assets/lab/previews/' + kind + '.jpg?v=' + version;
      if (!html.includes(marker)) errors.push('lab.html: missing real card for ' + kind);
      if (!html.includes(image)) errors.push('lab.html: missing versioned image for ' + kind);
      if (html.includes('data-preview-fallback="' + kind + '"')) {
        errors.push('lab.html: fallback incorrectly shipped for ' + kind);
      }
    }
    if (!html.includes('/assets/lab/previews/orbit.webp?v=' + version)) {
      errors.push('lab.html: missing Orbit WebP source');
    }
    if (html.includes('/assets/lab/previews/earth-observatory.jpg')) {
      errors.push('lab.html: stale Earth preview path');
    }
  } catch (error) {
    errors.push('dist/lab.html: ' + error.message);
  }
}

if (errors.length) {
  console.error('Lab preview verification failed:\\n' + errors.map(e => '  - ' + e).join('\\n'));
  process.exit(1);
}
console.log('Verified ' + expected.length + ' captured images in ' + target + ', version ' + version);
