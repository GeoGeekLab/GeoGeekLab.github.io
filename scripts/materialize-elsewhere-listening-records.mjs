#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const manifestPath = path.join(root, 'site', 'data', 'elsewhere-listening.json');
const templatePath = path.join(root, 'templates', 'elsewhere-listening.html');
const distRecords = path.join(root, 'dist', 'records');

const esc = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const titleForms = new Set(['original', 'first-release']);
const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
const records = Array.isArray(manifest.records) ? manifest.records : [];
const template = await fs.readFile(templatePath, 'utf8');

if (manifest.titlePolicy !== 'original-or-first-release-language') {
  throw new Error('LISTENING titlePolicy must be original-or-first-release-language');
}

await fs.mkdir(distRecords, { recursive: true });

for (const record of records) {
  if (!/^listening-\d{3}$/.test(String(record.id || ''))) {
    throw new Error(`LISTENING invalid id: ${record.id || '(missing)'}`);
  }
  const ref = String(record.ref || `elsewhere:${record.id}`);
  if (ref !== `elsewhere:${record.id}`) throw new Error(`LISTENING ${record.id}: invalid ref`);
  if (!record.source?.provider || !record.source?.embedUrl) {
    throw new Error(`LISTENING ${record.id}: source provider and embedUrl are required`);
  }

  const title = String(record.title || '').trim();
  if (title) {
    if (!String(record.titleLanguage || '').trim()) throw new Error(`LISTENING ${record.id}: titleLanguage is required`);
    if (!titleForms.has(String(record.titleForm || ''))) throw new Error(`LISTENING ${record.id}: invalid titleForm`);
  } else if (record.titleStatus !== 'pending-source-verification') {
    throw new Error(`LISTENING ${record.id}: missing title must be pending-source-verification`);
  }

  const provider = String(record.source.provider);
  const sourceId = String(record.source.bvid || record.source.videoId || record.source.aid || record.id);
  const displayTitle = title || sourceId;
  const excerpt = [record.creator, record.firstReleased].filter(Boolean).join(' · ')
    || String(record.context || 'Source title pending verification.');
  const noteParts = [record.context, record.note].filter(Boolean);
  const noteSection = noteParts.length
    ? `<section class="record-detail listening-record-note" aria-label="Listening note">\n<div class="record-section-label">LISTENING NOTE</div>\n<div class="record-body">${noteParts.map(part => `<p>${esc(part)}</p>`).join('')}</div>\n</section>\n`
    : '';
  const metaRows = [
    ['FIELD', 'LISTENING'],
    ['TITLE', title || 'PENDING SOURCE VERIFICATION'],
    ['TITLE LANGUAGE', record.titleLanguage || 'PENDING'],
    ['CREATOR', record.creator || ''],
    ['FIRST RELEASE', record.firstReleased || ''],
    ['SOURCE', provider],
    ['SOURCE ID', sourceId],
    ['STATUS', title ? 'VERIFIED TITLE' : 'SOURCE TITLE PENDING'],
  ].filter(([, value]) => value)
    .map(([label, value]) => `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`)
    .join('');

  const body = `<div class="listening-record-source">\n<div class="listening-record-source-head"><span>${esc(provider.toUpperCase())}</span><strong>${esc(sourceId)}</strong></div>\n<div class="listening-record-embed"><iframe src="${esc(record.source.embedUrl)}" title="${esc(title || `${provider} source ${sourceId}`)}" scrolling="no" frameborder="0" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>\n</div>`;
  const actions = [
    record.source.watchUrl ? `<a class="record-action secondary" href="${esc(record.source.watchUrl)}" rel="noreferrer" target="_blank">OPEN SOURCE ↗</a>` : '',
    '<a class="record-action secondary" href="elsewhere.html#e03">RETURN TO LISTENING ↗</a>',
  ].join('');

  const page = template
    .replaceAll('{{TITLE}}', esc(displayTitle))
    .replaceAll('{{DESCRIPTION}}', esc(record.context || `LISTENING record: ${displayTitle}`))
    .replaceAll('{{REF}}', esc(ref))
    .replaceAll('{{LANG}}', esc(record.titleLanguage || 'und'))
    .replaceAll('{{EXCERPT}}', esc(excerpt))
    .replaceAll('{{NOTE_SECTION}}', noteSection)
    .replaceAll('{{META}}', metaRows)
    .replaceAll('{{BODY}}', body)
    .replaceAll('{{ACTIONS}}', actions);

  await fs.writeFile(path.join(distRecords, `${ref.replace(':', '-')}.html`), page);
}

console.log(`Materialized Elsewhere LISTENING records: ${records.length}.`);
