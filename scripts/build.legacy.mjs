import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'site');
const fieldNotesDir = path.join(root, 'content', 'field-notes');
const bookContentDir = path.join(root, 'content', 'elsewhere', 'book');
const templatePath = path.join(root, 'templates', 'field-note.html');
const bookTemplatePath = path.join(root, 'templates', 'elsewhere-book.html');
const dist = path.join(root, 'dist');
const originAudioUrl = 'https://www.scottbuckley.com.au/library/wp-content/uploads/2022/02/AdriftAmongInfiniteStars.mp3';
const originAudioPath = path.join(dist, 'assets', 'audio', 'origin-adrift.mp3');
const previewArchivePath = path.join(sourceDir, 'archive-content.js');
const previewFigureRoot = path.join(sourceDir, 'assets', 'field-notes');

const copyDir = (from, to) => {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const s = path.join(from, entry.name);
    const d = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
};

const escapeAttr = value => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/"/g, '&quot;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

const renderBookBody = (bodyEn, bodyZh = '', defaultLanguage = 'en') => {
  if (!bodyZh) return bodyEn;
  const defaultZh = defaultLanguage === 'zh';
  return `<div class="book-language-switch" aria-label="Reading language">
  <span>READING LANGUAGE</span>
  <div class="book-language-options" role="group" aria-label="Choose reading language">
    <button type="button" data-book-lang-button="en" aria-pressed="${defaultZh ? 'false' : 'true'}">ENGLISH</button>
    <button type="button" data-book-lang-button="zh" aria-pressed="${defaultZh ? 'true' : 'false'}">中文</button>
  </div>
</div>
<div class="book-language-panel" data-book-lang-panel="en" lang="en"${defaultZh ? ' hidden' : ''}>${bodyEn}</div>
<div class="book-language-panel" data-book-lang-panel="zh" lang="zh-Hans"${defaultZh ? '' : ' hidden'}>${bodyZh}</div>`;
};

const series = JSON.parse(fs.readFileSync(path.join(fieldNotesDir, 'series.json'), 'utf8'));
const records = [];
for (const entry of fs.readdirSync(fieldNotesDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const unit = path.join(fieldNotesDir, entry.name);
  const metaPath = path.join(unit, 'record.json');
  if (!fs.existsSync(metaPath)) continue;
  const record = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  record.text.en.bodyHtml = fs.readFileSync(path.join(unit, 'body.en.html'), 'utf8').trim();
  records.push(record);
}
records.sort((a, b) => String(b.data.published).localeCompare(String(a.data.published)) || a.id.localeCompare(b.id));

const bookShiftTypes = new Set(['frame', 'scale', 'distance', 'vocabulary', 'method']);
const bookRecords = [];
if (fs.existsSync(bookContentDir)) {
  for (const entry of fs.readdirSync(bookContentDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const unit = path.join(bookContentDir, entry.name);
    const metaPath = path.join(unit, 'record.json');
    if (!fs.existsSync(metaPath)) continue;

    const bodyPath = path.join(unit, 'body.en.html');
    const bodyZhPath = path.join(unit, 'body.zh.html');
    if (!fs.existsSync(bodyPath)) throw new Error(`BOOK ${entry.name}: missing body.en.html`);

    const record = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const scaffold = record.data?.scaffold === true;
    const expectedRef = `elsewhere:${record.id}`;
    if (record.kind !== 'elsewhere') throw new Error(`BOOK ${entry.name}: kind must be "elsewhere"`);
    if (record.data?.unit !== 'book') throw new Error(`BOOK ${entry.name}: data.unit must be "book"`);
    if (record.id !== entry.name) throw new Error(`BOOK ${entry.name}: record id must match directory name`);
    if (record.ref !== expectedRef) throw new Error(`BOOK ${entry.name}: ref must be "${expectedRef}"`);
    if (!record.text?.en?.title) throw new Error(`BOOK ${entry.name}: text.en.title is required`);
    if (!record.text?.en?.author) throw new Error(`BOOK ${entry.name}: text.en.author is required`);
    if (!record.data?.firstPublished) throw new Error(`BOOK ${entry.name}: data.firstPublished is required`);
    if (!scaffold && !record.text?.en?.before) throw new Error(`BOOK ${entry.name}: text.en.before is required`);
    if (!scaffold && (!record.text?.en?.shift?.type || !record.text?.en?.shift?.text)) throw new Error(`BOOK ${entry.name}: text.en.shift.type and text.en.shift.text are required`);
    if (record.text?.en?.shift?.type && !bookShiftTypes.has(String(record.text.en.shift.type).toLowerCase())) throw new Error(`BOOK ${entry.name}: text.en.shift.type must be frame, scale, distance, vocabulary, or method`);
    if (!scaffold && !record.text?.en?.after) throw new Error(`BOOK ${entry.name}: text.en.after is required`);
    if (!scaffold && !record.text?.en?.return) throw new Error(`BOOK ${entry.name}: text.en.return is required`);

    const publicationYear = Number(String(record.data.firstPublished).match(/\d{4}/)?.[0]);
    if (!Number.isFinite(publicationYear)) throw new Error(`BOOK ${entry.name}: data.firstPublished must contain a four-digit year`);

    record.data.parentRef ||= 'elsewhere:e02';
    record.atlas ||= {};
    record.atlas.type ||= 'book';
    record.atlas.year ||= publicationYear;
    record.atlas.text ||= {};
    record.atlas.text.en = {
      topic: 'Reading',
      place: 'Non-spatial',
      spatialField: 'reading field',
      ...(record.atlas.text.en || {})
    };
    const bodyEn = fs.readFileSync(bodyPath, 'utf8').trim();
    const bodyZh = fs.existsSync(bodyZhPath) ? fs.readFileSync(bodyZhPath, 'utf8').trim() : '';
    if (scaffold && (bodyEn || bodyZh)) throw new Error(`BOOK ${entry.name}: scaffold body files must stay empty`);
    if (!scaffold && !bodyEn) throw new Error(`BOOK ${entry.name}: authored body.en.html must not be empty`);
    record.text.en.bodyHtml = renderBookBody(bodyEn, bodyZh, record.data?.defaultReadingLanguage || 'en');
    bookRecords.push(record);
  }
}
bookRecords.sort((a, b) => {
  const orderA = a.data.order != null && Number.isFinite(Number(a.data.order)) ? Number(a.data.order) : Number.MAX_SAFE_INTEGER;
  const orderB = b.data.order != null && Number.isFinite(Number(b.data.order)) ? Number(b.data.order) : Number.MAX_SAFE_INTEGER;
  return orderA - orderB || a.id.localeCompare(b.id);
});

const payload = { series, records, books: bookRecords };
const makeArchiveBootstrap = ({ sourcePreview = false } = {}) => `(() => {\n  'use strict';\n  window.GEOGEEK_SOURCE_PREVIEW = ${sourcePreview ? 'true' : 'false'};\n  const payload = ${JSON.stringify(payload)};\n  window.GEOGEEK_WECHAT_ARCHIVE = { series: payload.series, records: payload.records };\n  window.GEOGEEK_ELSEWHERE_CONTENT = { records: payload.books };\n  const archive = window.GEOGEEK_ARCHIVE;\n  if (!archive) return;\n  const generatedElsewhereRefs = new Set(payload.books.map(record => record.ref));\n  const retained = archive.records.filter(record => record.kind !== 'notes' && !generatedElsewhereRefs.has(record.ref));\n  const nonNotes = retained.flatMap(record => record.ref === 'elsewhere:e02' ? [record, ...payload.books] : [record]);\n  archive.records = [...payload.records, ...nonNotes];\n  const ui = archive.locales?.en?.ui || {};\n  const itemFor = record => ({id:record.id,...(record.data||{}),...(record.text?.en||{}),traceLinks:[...(record.relations?.trace||[])]});\n  const byKind = kind => archive.records.filter(record=>record.kind===kind).map(itemFor);\n  const atlasLayout = archive.records.filter(record=>record.atlas).map(record=>({ref:record.ref,...Object.fromEntries(Object.entries(record.atlas||{}).filter(([key])=>key!=='text')),...(record.atlas?.text?.en||{}),traceLinks:[...(record.relations?.trace||[])]}));\n  window.GEOGEEK_DATA = {en:{ui,notes:byKind('notes'),lab:byKind('lab'),elsewhere:byKind('elsewhere'),atlasLayout}};\n})();\n`;


// Local source preview cache. It is derived from content/ and ignored by Git.
fs.writeFileSync(previewArchivePath, makeArchiveBootstrap({ sourcePreview: true }));
fs.rmSync(previewFigureRoot, { recursive: true, force: true });
for (const record of records) {
  const figures = path.join(fieldNotesDir, record.id, 'figures');
  if (fs.existsSync(figures)) copyDir(figures, path.join(previewFigureRoot, record.id));
}

// ORIENT relations are deterministic generated content. Keep the authored place
// pool in Git and materialize the relation artifact immediately before copying
// the source site so local/CI/Pages builds all ship the same versioned pool.
const { writeRelationArtifact } = await import('./build-orient-relations.mjs');
writeRelationArtifact();

// Production artifact.
fs.rmSync(dist, { recursive: true, force: true });
copyDir(sourceDir, dist);

// Origin soundtrack: fetch the CC-BY source during deployment, then trim/transcode the
// narrative window (00:44–06:02) so visitors do not download the full 320 kbps master.
// The page keeps the official source URL as a runtime fallback if this optional step fails.
try {
  const response = await fetch(originAudioUrl, {
    headers: { 'user-agent': 'GeoGeek-Pages-Build/1.0', accept: 'audio/mpeg,*/*;q=0.8' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const source = Buffer.from(await response.arrayBuffer());
  if (source.length < 500_000) throw new Error(`unexpected audio payload (${source.length} bytes)`);
  fs.mkdirSync(path.dirname(originAudioPath), { recursive: true });
  const tempAudio = path.join(dist, 'assets', 'audio', '.origin-adrift-source.mp3');
  fs.writeFileSync(tempAudio, source);
  const ffmpeg = spawnSync('ffmpeg', [
    '-hide_banner','-loglevel','error','-y',
    '-ss','44','-i',tempAudio,'-t','318',
    '-codec:a','libmp3lame','-b:a','112k','-ar','44100',
    originAudioPath,
  ], { stdio: 'inherit' });
  if (ffmpeg.error || ffmpeg.status !== 0) {
    fs.copyFileSync(tempAudio, originAudioPath);
    console.warn('Origin soundtrack: ffmpeg unavailable; deployed the full source MP3 and will cue the same window at runtime.');
  } else {
    console.log('Origin soundtrack: deployed 00:44–06:02 at 112 kbps.');
  }
  fs.rmSync(tempAudio, { force: true });
} catch (error) {
  console.warn(`Origin soundtrack asset skipped: ${error?.message || error}. Runtime will fall back to the official CC-BY source.`);
}
fs.writeFileSync(path.join(dist, 'archive-content.js'), makeArchiveBootstrap({ sourcePreview: false }));

const template = fs.readFileSync(templatePath, 'utf8');
const manifest = [];
for (const record of records) {
  const title = record.text.en.title;
  const description = record.text.en.excerpt || '';
  const page = template
    .replaceAll('{{TITLE}}', escapeAttr(title))
    .replaceAll('{{DESCRIPTION}}', escapeAttr(description))
    .replaceAll('{{REF}}', escapeAttr(record.ref));
  const pageDir = path.join(dist, 'field-notes', record.data.slug);
  fs.mkdirSync(pageDir, { recursive: true });
  fs.writeFileSync(path.join(pageDir, 'index.html'), page);
  manifest.push({
    id: record.id,
    ref: record.ref,
    slug: record.data.slug,
    published: record.data.published,
    series: record.data.seriesKey,
    figures: record.data.figures || 0
  });
}

const bookTemplate = fs.readFileSync(bookTemplatePath, 'utf8');
for (const record of bookRecords) {
  const title = record.text.en.title;
  const description = record.text.en.subtitle || '';
  const page = bookTemplate
    .replaceAll('{{TITLE}}', escapeAttr(title))
    .replaceAll('{{DESCRIPTION}}', escapeAttr(description))
    .replaceAll('{{REF}}', escapeAttr(record.ref))
    .replace('<p class="record-deck" id="recordExcerpt"></p>', `<p class="record-deck" id="recordExcerpt">${escapeAttr(description)}</p>`)
    .replace('<div class="record-body" id="recordBody"></div>', `<div class="record-body" id="recordBody">${record.text.en.bodyHtml}</div>`);
  const pagePath = path.join(dist, 'records', `${record.ref.replace(':', '-')}.html`);
  fs.mkdirSync(path.dirname(pagePath), { recursive: true });
  fs.writeFileSync(pagePath, page);
}

const bookManifest = bookRecords.map(record => ({
  id: record.id,
  ref: record.ref,
  parentRef: record.data.parentRef,
  order: record.data.order ?? null,
  title: record.text.en.title,
  author: record.text.en.author,
  firstPublished: record.data.firstPublished || '',
  editionRead: record.data.editionRead || '',
  languageRead: record.data.languageRead || '',
  availableLanguages: record.text.en.bodyHtml.includes('data-book-lang-panel="zh"') ? ['en', 'zh'] : ['en'],
  shift: record.text.en.shift?.type || ''
}));

fs.mkdirSync(path.join(dist, 'data'), { recursive: true });
fs.writeFileSync(path.join(dist, 'data', 'field-notes.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(dist, 'data', 'elsewhere-books.json'), JSON.stringify(bookManifest, null, 2) + '\n');
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`Built GeoGeek: ${records.length} field notes + ${bookRecords.length} books → ${dist}`);
