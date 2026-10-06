#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const elsewherePath = path.join(dist, 'elsewhere.html');
const manifestPath = path.join(dist, 'data', 'elsewhere-books.json');

const escapeHtml = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

const books = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const count = books.length;
const rows = books.map((book, index) => {
  const ref = String(book.ref || `elsewhere:${book.id}`);
  const href = `records/${ref.replace(':', '-')}.html`;
  const secondary = [book.author, book.firstPublished].filter(Boolean).join(' · ');
  return `<a class="book-unit-row contour-target" data-record-ref="${escapeHtml(ref)}" data-transition-source data-local-scale="1 : 2,500" data-local-level="RECORD" href="${escapeHtml(href)}">
<span class="book-unit-index">${String(index + 1).padStart(2, '0')}</span>
<span class="book-unit-main"><strong>${escapeHtml(book.title)}</strong><small>${escapeHtml(secondary)}</small></span>
<span class="book-unit-shift">${escapeHtml(String(book.shift || '').toUpperCase())}</span>
<span class="book-unit-arrow" aria-hidden="true">↗</span>
</a>`;
}).join('\n');

const unit = `<section class="book-unit" aria-label="Book records" data-book-count="${count}">
<div class="book-unit-head"><span>BOOK INDEX</span><strong>${String(count).padStart(2, '0')} ${count === 1 ? 'RECORD' : 'RECORDS'}</strong></div>
${count ? `<div class="book-unit-list">\n${rows}\n</div>` : '<p class="book-unit-empty">No book records yet.</p>'}
</section>`;

let html = await fs.readFile(elsewherePath, 'utf8');
const pattern = /<section class="book-unit"[\s\S]*?<\/section>/;
if (!pattern.test(html)) throw new Error('Elsewhere BOOK index placeholder not found');
html = html.replace(pattern, unit);
await fs.writeFile(elsewherePath, html);
console.log(`Materialized Elsewhere BOOK index: ${count} record${count === 1 ? '' : 's'}.`);
