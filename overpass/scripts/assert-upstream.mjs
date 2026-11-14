import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const lock = JSON.parse(readFileSync(resolve(root, 'overpass/UPSTREAM.lock.json'), 'utf8'));
const upstream = resolve(root, lock.path);
const required = [
  'LICENSE', 'package.json', 'package-lock.json', 'vite.config.ts',
  'src/main.tsx', 'src/app/App.tsx', 'src/engine/passes.ts',
  'src/engine/match.ts', 'src/engine/elements.ts', 'src/imagery/index.ts',
  'src/globe/index.ts', 'api/og.tsx', 'public/data/catalog.json'
];
assert(existsSync(upstream), 'Watched submodule missing. Checkout with --recurse-submodules.');
const sha = execFileSync('git', ['-C', upstream, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
assert.equal(sha, lock.upstreamCommit, 'Watched submodule SHA differs from UPSTREAM.lock.json');
for (const path of required) assert(existsSync(resolve(upstream, path)), 'Missing upstream file: ' + path);
const pkg = JSON.parse(readFileSync(resolve(upstream, 'package.json'), 'utf8'));
assert.equal(pkg.license, 'MIT', 'Review the upstream license before building');
assert(readFileSync(resolve(upstream, 'LICENSE'), 'utf8').includes('Copyright (c) 2026 Armaan Gupta'), 'Upstream attribution missing');
console.log('Pinned Watched baseline verified:', sha);
console.log('Full upstream source retained as a submodule:', required.length, 'required checkpoints');
