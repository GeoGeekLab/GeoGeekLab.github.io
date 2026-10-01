#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const siteOrigin = 'https://geogeeklab.github.io';

if (!fs.existsSync(dist)) {
  console.error('dist/ is missing. Run the build before checking links.');
  process.exit(1);
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(full) : [full];
  });
}

function outputPathForUrl(url) {
  let pathname;
  try {
    pathname = decodeURIComponent(url.pathname);
  } catch {
    return null;
  }
  if (pathname.endsWith('/')) pathname += 'index.html';
  return path.join(dist, pathname.replace(/^\/+/, ''));
}

function documentBaseUrl(html, pageUrl, relative) {
  const match = html.match(/<base\b[^>]*\bhref\s*=\s*(["'])(.*?)\1[^>]*>/i);
  if (!match) return pageUrl;
  try {
    return new URL(match[2].trim(), pageUrl);
  } catch {
    throw new Error(`${relative}: invalid <base href> ${JSON.stringify(match[2])}`);
  }
}

const htmlFiles = walk(dist).filter(file => file.endsWith('.html'));
const missing = [];
let checked = 0;

for (const file of htmlFiles) {
  const html = fs.readFileSync(file, 'utf8');
  const relative = path.relative(dist, file).split(path.sep).join('/');
  const pageUrl = new URL(relative === 'index.html' ? '/' : `/${relative}`, siteOrigin);

  let baseUrl;
  try {
    baseUrl = documentBaseUrl(html, pageUrl, relative);
  } catch (error) {
    missing.push(error.message);
    continue;
  }

  const attrPattern = /\b(?:href|src)\s*=\s*(["'])(.*?)\1/gi;
  for (const match of html.matchAll(attrPattern)) {
    const raw = match[2].trim();
    if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:|data:|blob:)/i.test(raw)) continue;

    let resolved;
    try {
      resolved = new URL(raw, baseUrl);
    } catch {
      missing.push(`${relative}: invalid URL ${JSON.stringify(raw)}`);
      continue;
    }

    if (resolved.origin !== siteOrigin) continue;
    checked += 1;
    const target = outputPathForUrl(resolved);
    if (!target || !fs.existsSync(target) || !fs.statSync(target).isFile()) {
      missing.push(`${relative}: ${raw} -> ${resolved.pathname}`);
    }
  }
}

if (missing.length) {
  console.error(`Broken internal references: ${missing.length}`);
  for (const item of missing) console.error(`  - ${item}`);
  process.exit(1);
}

console.log(`Internal link check passed: ${checked} references across ${htmlFiles.length} HTML files.`);
