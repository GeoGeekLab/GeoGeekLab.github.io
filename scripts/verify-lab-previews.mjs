#!/usr/bin/env node
// The same complete manifest gates authored captures, production output and live Pages.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LAB_PREVIEW_IMAGES, fetchLabPreviewImages, labPreviewCacheVersion, validateLabPreviewHtml } from './lab-preview-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urlIndex = process.argv.indexOf('--url');
const remote = urlIndex >= 0 ? process.argv[urlIndex + 1] : '';
if (urlIndex >= 0 && !remote) throw new Error('--url requires a site base URL');
const target = process.argv.includes('--dist') ? 'dist' : 'site';
const base = path.join(root, target);
const images = remote ? await fetchLabPreviewImages(remote) : new Map(await Promise.all(LAB_PREVIEW_IMAGES.map(async filename =>
  [filename, await fs.readFile(path.join(base, 'assets', 'lab', 'previews', filename))]
)));
const version = labPreviewCacheVersion(images);
async function read(relative) {
  if (!remote) return fs.readFile(path.join(base, relative), 'utf8');
  const response = await fetch(new URL(relative, remote.endsWith('/') ? remote : remote + '/'), {
    cache:'no-store', signal:AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`${relative}: HTTP ${response.status}`);
  return response.text();
}
const runtime = await read('lab-real-previews.js');
const declared = runtime.match(/const VERSION = ['"](capture-[0-9a-f]{12})['"];/)?.[1];
if (declared !== version) throw new Error(`Lab preview cache token mismatch: expected ${version}, got ${declared || 'missing'}`);
if (remote || target === 'dist') validateLabPreviewHtml(await read('lab.html'), version);
console.log(`Verified ${images.size} captured images in ${remote || target}, version ${version}`);
