#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fetchLabPreviewImages, labPreviewCacheVersion, replaceLabPreviewVersion } from './lab-preview-manifest.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.DATA_SUPPLY_LIVE_BASE || 'https://geogeeklab.github.io/';
// Validate the entire batch before replacing any local image or cache token.
const images = await fetchLabPreviewImages(base);
const version = labPreviewCacheVersion(images);
const runtimePath = path.join(root, 'site', 'lab-real-previews.js');
const runtime = replaceLabPreviewVersion(await fs.readFile(runtimePath, 'utf8'), version);
const output = path.join(root, 'site', 'assets', 'lab', 'previews');
await fs.mkdir(output, { recursive:true });
for (const [filename, bytes] of images) await fs.writeFile(path.join(output, filename), bytes);
await fs.writeFile(runtimePath, runtime);
console.log(`Reused ${images.size} validated Lab preview images · ${version}`);
