import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDir = path.join(root, 'site');
const contentDir = path.join(root, 'content', 'field-notes');
const templatePath = path.join(root, 'templates', 'field-note.html');
const dist = path.join(root, 'dist');
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

const series = JSON.parse(fs.readFileSync(path.join(contentDir, 'series.json'), 'utf8'));
const records = [];
for (const entry of fs.readdirSync(contentDir, { withFileTypes: true })) {
  if (!entry.isDirectory()) continue;
  const unit = path.join(contentDir, entry.name);
  const metaPath = path.join(unit, 'record.json');
  if (!fs.existsSync(metaPath)) continue;
  const record = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  for (const lang of ['en', 'zh']) {
    record.text[lang].bodyHtml = fs.readFileSync(path.join(unit, `body.${lang}.html`), 'utf8').trim();
  }
  records.push(record);
}
records.sort((a, b) => String(b.data.published).localeCompare(String(a.data.published)) || a.id.localeCompare(b.id));

const payload = { series, records };
const makeArchiveBootstrap = ({ sourcePreview = false } = {}) => `(() => {\n  'use strict';\n  window.GEOGEEK_SOURCE_PREVIEW = ${sourcePreview ? 'true' : 'false'};\n  const payload = ${JSON.stringify(payload)};\n  window.GEOGEEK_WECHAT_ARCHIVE = payload;\n  const archive = window.GEOGEEK_ARCHIVE;\n  if (!archive) return;\n  archive.records = [...payload.records, ...archive.records.filter(record => record.kind !== 'notes')];\n  const buildLocale = lang => {\n    const ui = archive.locales?.[lang]?.ui || archive.locales?.en?.ui || {};\n    const itemFor = record => ({id:record.id,...(record.data||{}),...(record.text?.[lang]||record.text?.en||{})});\n    const byKind = kind => archive.records.filter(record=>record.kind===kind).map(itemFor);\n    const atlasLayout = archive.records.filter(record=>record.atlas).map(record=>({ref:record.ref,...Object.fromEntries(Object.entries(record.atlas||{}).filter(([key])=>key!=='text')),...(record.atlas?.text?.[lang]||record.atlas?.text?.en||{}),traceLinks:[...(record.relations?.trace||[])]}));\n    return {ui,notes:byKind('notes'),lab:byKind('lab'),elsewhere:byKind('elsewhere'),atlasLayout};\n  };\n  window.GEOGEEK_DATA = {en:buildLocale('en'),zh:buildLocale('zh')};\n})();\n`;

// Local source preview cache. It is derived from content/ and ignored by Git.
fs.writeFileSync(previewArchivePath, makeArchiveBootstrap({ sourcePreview: true }));
fs.rmSync(previewFigureRoot, { recursive: true, force: true });
for (const record of records) {
  const figures = path.join(contentDir, record.id, 'figures');
  if (fs.existsSync(figures)) copyDir(figures, path.join(previewFigureRoot, record.id));
}

// Production artifact.
fs.rmSync(dist, { recursive: true, force: true });
copyDir(sourceDir, dist);
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

fs.mkdirSync(path.join(dist, 'data'), { recursive: true });
fs.writeFileSync(path.join(dist, 'data', 'field-notes.json'), JSON.stringify(manifest, null, 2) + '\n');
fs.writeFileSync(path.join(dist, '.nojekyll'), '');
console.log(`Built GeoGeek: ${records.length} field notes → ${dist}`);
