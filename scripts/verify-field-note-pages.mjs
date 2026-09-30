#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(root, 'content', 'field-notes');
const distRoot = path.join(root, 'dist', 'field-notes');

const exists = async p => fs.access(p).then(() => true).catch(() => false);
const strip = value => String(value || '')
  .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;/g, ' ')
  .replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ')
  .trim();

const failures = [];
let checked = 0;

for (const entry of await fs.readdir(contentRoot, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const base = path.join(contentRoot, entry.name);
  const recordPath = path.join(base, 'record.json');
  const bodyPath = path.join(base, 'body.en.html');
  if (!(await exists(recordPath))) continue;

  const record = JSON.parse(await fs.readFile(recordPath, 'utf8'));
  const slug = String(record?.data?.slug || record?.text?.en?.slug || '').trim();
  if (!slug) {
    failures.push(`${entry.name}: missing slug`);
    continue;
  }
  if (!(await exists(bodyPath))) {
    failures.push(`${entry.name} (${slug}): missing body.en.html`);
    continue;
  }

  const source = await fs.readFile(bodyPath, 'utf8');
  const sourceText = strip(source);
  if (sourceText.length < 80) {
    failures.push(`${entry.name} (${slug}): source body is unexpectedly short (${sourceText.length} chars)`);
    continue;
  }

  const pagePath = path.join(distRoot, slug, 'index.html');
  if (!(await exists(pagePath))) {
    failures.push(`${entry.name} (${slug}): generated page missing`);
    continue;
  }

  const html = await fs.readFile(pagePath, 'utf8');
  if (!/data-static-body\b/.test(html)) {
    failures.push(`${entry.name} (${slug}): generated page has no data-static-body`);
    continue;
  }

  const renderedText = strip(html);
  const sentinel = sourceText.slice(0, Math.min(140, sourceText.length));
  if (!renderedText.includes(sentinel)) {
    failures.push(`${entry.name} (${slug}): generated page does not contain the source-body opening text`);
    continue;
  }

  checked += 1;
}

if (failures.length) {
  console.error('Field Note body verification failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Verified ${checked} Field Note pages: source bodies are present in generated HTML.`);
