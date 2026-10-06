#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const contentRoot = path.join(root, 'content', 'elsewhere', 'book');
const distRoot = path.join(root, 'dist');

const exists = file => fs.access(file).then(() => true).catch(() => false);
const read = file => fs.readFile(file, 'utf8');

const escRe = value => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function findElement(html, id) {
  const startRe = new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=(['\"])${escRe(id)}\\2[^>]*>`, 'i');
  const match = startRe.exec(html);
  if (!match) return null;
  const tag = match[1];
  const openStart = match.index;
  const openEnd = openStart + match[0].length;
  const tokenRe = new RegExp(`<\\/?${escRe(tag)}\\b[^>]*>`, 'ig');
  tokenRe.lastIndex = openEnd;
  let depth = 1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<\//.test(token[0])) depth -= 1;
    else if (!/\/>$/.test(token[0])) depth += 1;
    if (depth === 0) {
      return { tag, openStart, openEnd, closeStart: token.index, closeEnd: token.index + token[0].length };
    }
  }
  return null;
}

function setElementInner(html, id, inner) {
  const loc = findElement(html, id);
  if (!loc) throw new Error(`BOOK final materialization: #${id} not found`);
  return html.slice(0, loc.openEnd) + inner + html.slice(loc.closeStart);
}

const renderBookBody = (bodyEn, bodyZh = '') => {
  if (!bodyZh) return bodyEn;
  return `<div class="book-language-switch" aria-label="Reading language">
  <span>READING LANGUAGE</span>
  <div class="book-language-options" role="group" aria-label="Choose reading language">
    <button type="button" data-book-lang-button="en" aria-pressed="true">ENGLISH</button>
    <button type="button" data-book-lang-button="zh" aria-pressed="false">中文</button>
  </div>
</div>
<div class="book-language-panel" data-book-lang-panel="en" lang="en">${bodyEn}</div>
<div class="book-language-panel" data-book-lang-panel="zh" lang="zh-Hans" hidden>${bodyZh}</div>`;
};

let count = 0;
if (await exists(contentRoot)) {
  const entries = (await fs.readdir(contentRoot, { withFileTypes: true }))
    .filter(entry => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const unit = path.join(contentRoot, entry.name);
    const recordPath = path.join(unit, 'record.json');
    if (!(await exists(recordPath))) continue;

    const record = JSON.parse(await read(recordPath));
    if (record?.data?.unit !== 'book') continue;

    const bodyEnPath = path.join(unit, 'body.en.html');
    const bodyZhPath = path.join(unit, 'body.zh.html');
    if (!(await exists(bodyEnPath))) throw new Error(`BOOK ${entry.name}: missing body.en.html`);

    const bodyEn = (await read(bodyEnPath)).trim();
    const bodyZh = (await exists(bodyZhPath)) ? (await read(bodyZhPath)).trim() : '';
    const body = renderBookBody(bodyEn, bodyZh);
    const ref = String(record.ref || `elsewhere:${record.id || entry.name}`);
    const pagePath = path.join(distRoot, 'records', `${ref.replace(':', '-')}.html`);
    if (!(await exists(pagePath))) throw new Error(`BOOK ${entry.name}: final static page missing: ${pagePath}`);

    let html = await read(pagePath);
    html = setElementInner(html, 'recordBody', body);
    await fs.writeFile(pagePath, html);

    const finalHtml = await read(pagePath);
    const firstEnglishParagraph = bodyEn.match(/<p>([\s\S]*?)<\/p>/i)?.[1]?.replace(/<[^>]+>/g, '')?.trim();
    if (!finalHtml.includes('data-book-lang-panel="en"')) throw new Error(`BOOK ${entry.name}: English authored panel was not materialized`);
    if (bodyZh && !finalHtml.includes('data-book-lang-panel="zh"')) throw new Error(`BOOK ${entry.name}: Chinese authored panel was not materialized`);
    if (firstEnglishParagraph && !finalHtml.replace(/<[^>]+>/g, '').includes(firstEnglishParagraph)) {
      throw new Error(`BOOK ${entry.name}: authored English prose missing after final materialization`);
    }
    count += 1;
  }
}

console.log(`Materialized final Elsewhere BOOK bodies: ${count} record${count === 1 ? '' : 's'}.`);
