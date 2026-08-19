#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.join(root, 'dist');
const contentRoot = path.join(root, 'content', 'field-notes');
const SITE = 'https://geogeeklab.github.io';
const BUILD_VERSION = 1;

const exists = async p => fs.access(p).then(() => true).catch(() => false);
const read = p => fs.readFile(p, 'utf8');
const write = async (p, v) => { await fs.mkdir(path.dirname(p), { recursive: true }); await fs.writeFile(p, v); };
const escapeHtml = s => String(s ?? '').replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]));
const escapeXml = s => escapeHtml(s).replace(/'/g, '&apos;');
const stripTags = s => String(s ?? '').replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const clamp = (s, n=180) => { const t = stripTags(s); return t.length <= n ? t : `${t.slice(0, n - 1).trimEnd()}…`; };
const asArray = value => Array.isArray(value) ? value : value == null ? [] : [value];
const uniq = arr => [...new Set(arr.filter(Boolean))];
const escRe = s => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function localized(record, lang, key) {
  const candidates = [
    record?.text?.[lang]?.[key],
    record?.[lang]?.[key],
    record?.[key]?.[lang],
    lang === 'en' ? record?.[key] : undefined,
  ];
  return candidates.find(v => typeof v === 'string' && v.trim())?.trim() ?? '';
}

function recordId(record, dirName='') {
  return String(record.ref || record.id || record.recordId || dirName || '').trim();
}

function slugify(s) {
  return String(s || '').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 90) || 'record';
}

function recordSlug(record, dirName='') {
  return String(record?.data?.slug || record.slug || record.route || record.pathSlug || slugify(localized(record, 'en', 'title') || recordId(record, dirName))).replace(/^\/+|\/+$/g, '');
}

function recordDate(record) {
  return String(record?.data?.published || record?.data?.datePublished || record?.data?.date || record?.data?.created || record.published || record.datePublished || record.date || record.created || '').slice(0, 10);
}

function recordSeries(record) {
  return String(record?.data?.series || record?.data?.type || record?.data?.collection || record.series || record.type || record.collection || record?.atlas?.type || record?.data?.atlas?.type || '').trim();
}

function recordTags(record) {
  return uniq([
    ...asArray(record?.data?.tags),
    ...asArray(record?.data?.topics),
    ...asArray(record.tags),
    ...asArray(record.topics),
    ...asArray(record?.atlas?.topic),
    ...asArray(record?.atlas?.topics),
  ].flatMap(v => typeof v === 'string' ? v.split(',').map(x => x.trim()) : []));
}

function sourceUrl(record) {
  return String(record?.data?.sourceUrl || record?.data?.url || record?.data?.source?.url || record.sourceUrl || record.url || record?.source?.url || record?.provenance?.url || '').trim();
}

async function loadRecords() {
  if (!(await exists(contentRoot))) throw new Error(`Missing content directory: ${contentRoot}`);
  const dirs = (await fs.readdir(contentRoot, { withFileTypes: true })).filter(d => d.isDirectory()).map(d => d.name).sort();
  const records = [];
  for (const dirName of dirs) {
    const base = path.join(contentRoot, dirName);
    const recordPath = path.join(base, 'record.json');
    if (!(await exists(recordPath))) continue;
    const record = JSON.parse(await read(recordPath));
    const body = {};
    for (const lang of ['en', 'zh']) {
      const p = path.join(base, `body.${lang}.html`);
      body[lang] = (await exists(p)) ? await read(p) : '';
    }
    records.push({ dirName, base, record, body, id: recordId(record, dirName), slug: recordSlug(record, dirName) });
  }
  records.sort((a,b) => (recordDate(b.record) || '').localeCompare(recordDate(a.record) || '') || a.id.localeCompare(b.id));
  return records;
}

function findElement(html, id) {
  const startRe = new RegExp(`<([a-zA-Z][\\w:-]*)\\b[^>]*\\bid=(['\"])${escRe(id)}\\2[^>]*>`, 'i');
  const m = startRe.exec(html);
  if (!m) return null;
  const tag = m[1];
  const openStart = m.index;
  const openEnd = openStart + m[0].length;
  const tokenRe = new RegExp(`<\\/?${escRe(tag)}\\b[^>]*>`, 'ig');
  tokenRe.lastIndex = openEnd;
  let depth = 1;
  let token;
  while ((token = tokenRe.exec(html))) {
    if (/^<\//.test(token[0])) depth -= 1;
    else if (!/\/>$/.test(token[0])) depth += 1;
    if (depth === 0) {
      return { tag, openStart, openEnd, closeStart: token.index, closeEnd: token.index + token[0].length, openTag: m[0] };
    }
  }
  return null;
}

function replaceElement(html, id, replacement) {
  const loc = findElement(html, id);
  if (!loc) return html;
  return html.slice(0, loc.openStart) + replacement + html.slice(loc.closeEnd);
}

function setElementInner(html, id, inner, { removeId=false, attrs='' }={}) {
  const loc = findElement(html, id);
  if (!loc) return html;
  let open = loc.openTag;
  if (removeId) open = open.replace(/\s+id=(['"])[^'"]+\1/i, '');
  if (attrs) open = open.replace(/>$/, ` ${attrs}>`);
  return html.slice(0, loc.openStart) + open + inner + `</${loc.tag}>` + html.slice(loc.closeEnd);
}

function setHtmlLang(html, lang) {
  if (/<html\b[^>]*\blang=/i.test(html)) return html.replace(/(<html\b[^>]*\blang=)(['"])[^'"]*\2/i, `$1"${lang}"`);
  return html.replace(/<html\b/i, `<html lang="${lang}"`);
}

function removeHeadTags(html, patterns) {
  for (const pattern of patterns) html = html.replace(pattern, '');
  return html;
}

function upsertTitle(html, title) {
  const safe = escapeHtml(title);
  if (/<title>[\s\S]*?<\/title>/i.test(html)) return html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${safe}</title>`);
  return html.replace(/<head\b[^>]*>/i, m => `${m}\n<title>${safe}</title>`);
}

function addHead(html, block) {
  return /<\/head>/i.test(html) ? html.replace(/<\/head>/i, `${block}\n</head>`) : html;
}

function seoBlock({ canonical, title, description, lang='en', alternate, type='website', image=`${SITE}/assets/og-default.png`, jsonLd=[] }) {
  const alts = alternate ? [
    `<link rel="alternate" hreflang="en" href="${escapeHtml(alternate.en)}">`,
    `<link rel="alternate" hreflang="zh-CN" href="${escapeHtml(alternate.zh)}">`,
    `<link rel="alternate" hreflang="x-default" href="${escapeHtml(alternate.en)}">`,
  ].join('\n') : '';
  const ld = asArray(jsonLd).filter(Boolean).map(x => `<script type="application/ld+json">${JSON.stringify(x).replace(/</g, '\\u003c')}</script>`).join('\n');
  return [
    `<meta name="description" content="${escapeHtml(description)}">`,
    `<link rel="canonical" href="${escapeHtml(canonical)}">`,
    alts,
    `<meta property="og:type" content="${type}">`,
    `<meta property="og:title" content="${escapeHtml(title)}">`,
    `<meta property="og:description" content="${escapeHtml(description)}">`,
    `<meta property="og:url" content="${escapeHtml(canonical)}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:locale" content="${lang === 'zh-CN' ? 'zh_CN' : 'en_US'}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${escapeHtml(title)}">`,
    `<meta name="twitter:description" content="${escapeHtml(description)}">`,
    `<meta name="twitter:image" content="${escapeHtml(image)}">`,
    ld,
  ].filter(Boolean).join('\n');
}

function patchSeo(html, meta) {
  html = upsertTitle(html, meta.title);
  html = removeHeadTags(html, [
    /<meta\b[^>]*\bname=(['"])description\1[^>]*>\s*/gi,
    /<link\b[^>]*\brel=(['"])canonical\1[^>]*>\s*/gi,
    /<link\b[^>]*\brel=(['"])alternate\1[^>]*\bhreflang=[^>]*>\s*/gi,
    /<meta\b[^>]*\bproperty=(['"])og:[^'"]+\1[^>]*>\s*/gi,
    /<meta\b[^>]*\bname=(['"])twitter:[^'"]+\1[^>]*>\s*/gi,
    /<script\b[^>]*\btype=(['"])application\/ld\+json\1[^>]*>[\s\S]*?<\/script>\s*/gi,
  ]);
  return addHead(html, seoBlock(meta));
}

function addStaticAssets(html, route='') {
  if (!/static-delivery\.css/i.test(html)) html = html.replace(/<\/head>/i, `<link rel="stylesheet" href="/static-delivery.css">\n</head>`);
  if (!/static-delivery\.js/i.test(html)) html = html.replace(/<\/body>/i, `<script src="/static-delivery.js" defer></script>\n</body>`);
  return html;
}

function metadataDl(item) {
  const r = item.record;
  const fields = [
    ['Reference', item.id],
    ['Published', recordDate(r)],
    ['Series', recordSeries(r)],
    ['Topics', recordTags(r).join(' · ')],
  ].filter(([,v]) => v);
  const src = sourceUrl(r);
  if (src) fields.push(['Source', `<a href="${escapeHtml(src)}" rel="noopener noreferrer">Source ↗</a>`]);
  return fields.map(([k,v]) => `<dt>${escapeHtml(k)}</dt><dd>${k === 'Source' ? v : escapeHtml(v)}</dd>`).join('\n');
}

function collectRelationRefs(record) {
  const out = [];
  const visit = v => {
    if (!v) return;
    if (typeof v === 'string') {
      for (const token of v.split(/[\s,;|→>]+/)) if (/^n?\d{1,4}$/i.test(token) || /^N\d+/i.test(token)) out.push(token);
      return;
    }
    if (Array.isArray(v)) return v.forEach(visit);
    if (typeof v === 'object') Object.values(v).forEach(visit);
  };
  visit(record.relations); visit(record.trace); visit(record.related); visit(record?.atlas?.trace); visit(record?.atlas?.relations);
  return uniq(out);
}

function relatedItems(item, records) {
  const byId = new Map(records.map(x => [x.id.toLowerCase(), x]));
  const explicit = collectRelationRefs(item.record).map(ref => byId.get(ref.toLowerCase())).filter(x => x && x !== item);
  const out = uniq(explicit.map(x => x.id)).map(id => records.find(x => x.id === id)).filter(Boolean);
  if (out.length >= 2) return out.slice(0,4);
  const idx = records.indexOf(item);
  for (const candidate of [records[idx-1], records[idx+1], records[idx-2], records[idx+2]]) {
    if (candidate && candidate !== item && !out.includes(candidate)) out.push(candidate);
    if (out.length >= 3) break;
  }
  return out;
}

function relatedNav(item, records, lang) {
  const related = relatedItems(item, records);
  if (!related.length) return '';
  const title = lang === 'zh' ? '关联记录' : 'Related records';
  const links = related.map(x => {
    const href = lang === 'zh' ? `/zh/field-notes/${x.slug}/` : `/field-notes/${x.slug}/`;
    const text = localized(x.record, lang, 'title') || localized(x.record, 'en', 'title') || x.id;
    return `<a class="static-related-link" href="${href}"><span>${escapeHtml(x.id)}</span><strong>${escapeHtml(text)}</strong></a>`;
  }).join('\n');
  return `<nav class="static-related" aria-label="${escapeHtml(title)}"><p class="static-kicker">${escapeHtml(title)}</p><div class="static-related-grid">${links}</div></nav>`;
}

function languageNav(item, lang) {
  const href = lang === 'zh' ? `/field-notes/${item.slug}/` : `/zh/field-notes/${item.slug}/`;
  const label = lang === 'zh' ? 'EN' : '中文';
  return `<nav class="static-language-nav" aria-label="Language"><a rel="alternate" hreflang="${lang === 'zh' ? 'en' : 'zh-CN'}" href="${href}">${label}</a></nav>`;
}

function articleSchemas(item, lang, canonical, title, description, image) {
  const language = lang === 'zh' ? 'zh-CN' : 'en';
  const article = {
    '@context': 'https://schema.org', '@type': 'BlogPosting',
    headline: title, description, datePublished: recordDate(item.record) || undefined,
    inLanguage: language, mainEntityOfPage: canonical, image,
    author: { '@type': 'Person', name: 'GeoGeek', url: SITE },
  };
  Object.keys(article).forEach(k => article[k] === undefined && delete article[k]);
  const breadcrumb = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'GeoGeek', item: `${SITE}/` },
      { '@type': 'ListItem', position: 2, name: lang === 'zh' ? 'Field Notes / 田野札记' : 'Field Notes', item: `${SITE}/field-notes.html` },
      { '@type': 'ListItem', position: 3, name: title, item: canonical },
    ],
  };
  return [article, breadcrumb];
}

function detectImageSize(buf) {
  if (buf.length < 12) return null;
  if (buf.slice(1,4).toString() === 'PNG' && buf.length >= 24) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (buf.slice(0,6).toString('ascii').startsWith('GIF')) return { width: buf.readUInt16LE(6), height: buf.readUInt16LE(8) };
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i + 9 < buf.length) {
      if (buf[i] !== 0xff) { i++; continue; }
      const marker = buf[i+1];
      const len = buf.readUInt16BE(i+2);
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return { height: buf.readUInt16BE(i+5), width: buf.readUInt16BE(i+7) };
      if (!len || len < 2) break;
      i += 2 + len;
    }
  }
  if (buf.slice(0,4).toString('ascii') === 'RIFF' && buf.slice(8,12).toString('ascii') === 'WEBP') {
    const kind = buf.slice(12,16).toString('ascii');
    if (kind === 'VP8X' && buf.length >= 30) return { width: 1 + buf.readUIntLE(24,3), height: 1 + buf.readUIntLE(27,3) };
    if (kind === 'VP8 ' && buf.length >= 30) return { width: buf.readUInt16LE(26) & 0x3fff, height: buf.readUInt16LE(28) & 0x3fff };
  }
  return null;
}

let imageTool;
function getImageTool() {
  if (imageTool !== undefined) return imageTool;
  for (const cmd of ['magick','convert']) {
    const r = spawnSync(cmd, ['-version'], { stdio: 'ignore' });
    if (!r.error && r.status === 0) return imageTool = cmd;
  }
  return imageTool = null;
}

async function makeVariant(source, width) {
  const ext = path.extname(source);
  const base = source.slice(0, -ext.length);
  const out = `${base}.w${width}${ext}`;
  if (await exists(out)) return out;
  const tool = getImageTool();
  if (!tool) return null;
  const args = tool === 'magick' ? [source, '-auto-orient', '-resize', `${width}x>`, '-strip', out] : [source, '-auto-orient', '-resize', `${width}x>`, '-strip', out];
  const r = spawnSync(tool, args, { stdio: 'ignore' });
  return r.status === 0 && await exists(out) ? out : null;
}

function attr(tag, name) {
  const m = new RegExp(`\\b${escRe(name)}=(['\"])(.*?)\\1`, 'i').exec(tag);
  return m ? m[2] : '';
}
function setAttr(tag, name, value) {
  const re = new RegExp(`\\s+${escRe(name)}=(['\"])(.*?)\\1`, 'i');
  if (re.test(tag)) return tag.replace(re, ` ${name}="${escapeHtml(value)}"`);
  return tag.replace(/\s*\/?>(\s*)$/, m => ` ${name}="${escapeHtml(value)}"${m.includes('/>') ? ' />' : '>'}`);
}

function cleanLocalSrc(src) {
  const raw = String(src || '').split(/[?#]/)[0];
  try { return decodeURIComponent(raw); } catch { return raw; }
}

async function resolveLocalImage(src, htmlFile) {
  const clean = cleanLocalSrc(src);
  if (!clean || /^(?:https?:|data:|blob:|mailto:|javascript:)/i.test(clean)) return null;

  // Deep static routes may inherit source-template paths such as
  // `assets/brand/wechat-qr.jpg`. Try the page-relative location first, then
  // the production root and finally the source-site root. The latter two are
  // important for shared chrome images that are not article figures.
  const stripped = clean.replace(/^\/+/, '').replace(/^(?:\.\.\/)+/, '');
  const candidates = uniq([
    clean.startsWith('/') ? path.join(dist, stripped) : path.resolve(path.dirname(htmlFile), clean),
    path.join(dist, stripped),
    path.join(root, 'site', stripped),
  ]);
  for (const candidate of candidates) if (await exists(candidate)) return candidate;
  return null;
}

function publicAssetSrc(asset) {
  const rel = path.relative(dist, asset);
  if (!rel.startsWith('..') && !path.isAbsolute(rel)) return `/${rel.split(path.sep).join('/')}`;
  return '';
}

async function processArticleImages(html, htmlFile) {
  const tags = [...html.matchAll(/<img\b[^>]*>/gi)];
  if (!tags.length) return html;
  let output = '';
  let cursor = 0;
  for (const match of tags) {
    output += html.slice(cursor, match.index);
    let tag = match[0];
    const src = attr(tag, 'src');
    if (!src || /^(?:https?:|data:|blob:)/i.test(src)) { output += tag; cursor = match.index + match[0].length; continue; }
    const asset = await resolveLocalImage(src, htmlFile);
    if (asset) {
      try {
        const buf = await fs.readFile(asset);
        const size = detectImageSize(buf);
        if (size?.width && size?.height) {
          if (!attr(tag, 'width')) tag = setAttr(tag, 'width', String(size.width));
          if (!attr(tag, 'height')) tag = setAttr(tag, 'height', String(size.height));

          // If a deep article route inherited a root asset as a relative URL,
          // canonicalise it to a root-relative URL so the browser and QA resolve
          // the same asset. Article-local figure URLs are left untouched.
          const pageRelative = path.resolve(path.dirname(htmlFile), cleanLocalSrc(src));
          if (!(await exists(pageRelative))) {
            const publicSrc = publicAssetSrc(asset);
            if (publicSrc) tag = setAttr(tag, 'src', publicSrc);
          }

          if (size.width > 800 && /\.(?:png|jpe?g|webp)$/i.test(asset)) {
            const widths = [640,1280].filter(w => w < size.width);
            const variants = [];
            for (const w of widths) {
              const v = await makeVariant(asset, w);
              if (v) variants.push({ w, v });
            }
            if (variants.length) {
              const sourceSrc = attr(tag, 'src') || src;
              const rels = variants.map(({w,v}) => {
                const pub = publicAssetSrc(v);
                return `${pub || path.relative(path.dirname(htmlFile), v).split(path.sep).join('/')} ${w}w`;
              });
              rels.push(`${sourceSrc} ${size.width}w`);
              tag = setAttr(tag, 'srcset', rels.join(', '));
              tag = setAttr(tag, 'sizes', '(max-width: 760px) 100vw, 760px');
            }
          }
        }
      } catch {}
    }
    if (!attr(tag, 'loading')) tag = setAttr(tag, 'loading', 'lazy');
    if (!attr(tag, 'decoding')) tag = setAttr(tag, 'decoding', 'async');
    output += tag;
    cursor = match.index + match[0].length;
  }
  output += html.slice(cursor);
  return output;
}

async function copyDir(from, to) {
  if (!(await exists(from))) return;
  await fs.mkdir(to, { recursive: true });
  for (const entry of await fs.readdir(from, { withFileTypes:true })) {
    const a = path.join(from, entry.name), b = path.join(to, entry.name);
    if (entry.isDirectory()) await copyDir(a,b); else await fs.copyFile(a,b);
  }
}

function articleTemplateFallback() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>GeoGeek Field Note</title><link rel="stylesheet" href="/styles.css"></head><body><a class="skip-link" href="#main">Skip to content</a><main id="main" class="record-page"><article><p class="static-kicker">FIELD NOTE</p><h1 id="recordTitle">Record</h1><p id="recordExcerpt"></p><dl id="recordMeta"></dl><div class="record-body" id="recordBody"></div></article></main></body></html>`;
}

async function renderArticle(item, records, lang) {
  const outDir = lang === 'zh' ? path.join(dist, 'zh', 'field-notes', item.slug) : path.join(dist, 'field-notes', item.slug);
  const outFile = path.join(outDir, 'index.html');
  let html = (lang === 'en' && await exists(outFile)) ? await read(outFile) : '';
  if (!html && lang === 'zh') {
    const sourceTemplate = path.join(root, 'templates', 'field-note.html');
    if (await exists(sourceTemplate)) html = await read(sourceTemplate);
  }
  if (!html) {
    const enFile = path.join(dist, 'field-notes', item.slug, 'index.html');
    html = (await exists(enFile)) ? await read(enFile) : articleTemplateFallback();
  }
  const title = localized(item.record, lang, 'title') || localized(item.record, 'en', 'title') || item.id;
  const bodyRaw = item.body[lang] || item.body.en || '';
  const body = bodyRaw.replaceAll(`assets/field-notes/${item.dirName}/`, `/assets/field-notes/${item.dirName}/`);
  const excerpt = localized(item.record, lang, 'excerpt') || localized(item.record, lang, 'description') || clamp(body, 220);
  const langCode = lang === 'zh' ? 'zh-CN' : 'en';
  html = setHtmlLang(html, langCode);
  html = setElementInner(html, 'recordTitle', escapeHtml(title), { removeId:true, attrs:'data-static-title' });
  html = setElementInner(html, 'recordExcerpt', escapeHtml(excerpt), { removeId:true, attrs:'data-static-excerpt' });
  html = setElementInner(html, 'recordMeta', metadataDl(item), { removeId:true, attrs:'data-static-meta' });
  const articleInner = `${languageNav(item, lang)}\n${body}\n${relatedNav(item, records, lang)}`;
  html = setElementInner(html, 'recordBody', articleInner, { removeId:true, attrs:'data-static-body' });
  if (!html.includes('data-static-body')) {
    html = html.replace(/<\/main>/i, `<article class="record-body" data-static-body><h1>${escapeHtml(title)}</h1><p>${escapeHtml(excerpt)}</p>${languageNav(item, lang)}${body}${relatedNav(item,records,lang)}</article></main>`);
  }
  html = html.replace(/<body\b([^>]*)>/i, `<body$1 data-static-record="true">`);
  const canonical = lang === 'zh' ? `${SITE}/zh/field-notes/${item.slug}/` : `${SITE}/field-notes/${item.slug}/`;
  const alternate = { en: `${SITE}/field-notes/${item.slug}/`, zh: `${SITE}/zh/field-notes/${item.slug}/` };
  const firstImg = /<img\b[^>]*\bsrc=(['"])(.*?)\1/i.exec(body)?.[2];
  const image = firstImg ? new URL(firstImg, canonical).href : `${SITE}/assets/og-default.png`;
  html = patchSeo(html, {
    canonical, title: `${title} — GeoGeek`, description: excerpt, lang:langCode,
    alternate, type:'article', image, jsonLd: articleSchemas(item,lang,canonical,title,excerpt,image),
  });
  html = addStaticAssets(html);
  await fs.mkdir(outDir,{recursive:true});
  await copyDir(path.join(item.base,'figures'), path.join(outDir,'figures'));
  html = await processArticleImages(html, outFile);
  await write(outFile, html);
}

function noteRows(records, lang='en') {
  return records.map(item => {
    const title = localized(item.record, lang, 'title') || localized(item.record,'en','title') || item.id;
    const excerpt = localized(item.record, lang, 'excerpt') || localized(item.record,lang,'description') || clamp(item.body[lang] || item.body.en, 150);
    const href = lang === 'zh' ? `/zh/field-notes/${item.slug}/` : `/field-notes/${item.slug}/`;
    return `<article class="static-note-row" data-series="${escapeHtml(recordSeries(item.record).toLowerCase())}" data-record-ref="${escapeHtml(item.id)}"><a href="${href}"><span class="static-note-ref">${escapeHtml(item.id)}</span><span class="static-note-copy"><strong>${escapeHtml(title)}</strong><small>${escapeHtml(excerpt)}</small></span><time datetime="${escapeHtml(recordDate(item.record))}">${escapeHtml(recordDate(item.record))}</time></a></article>`;
  }).join('\n');
}

function selectedRows(records) {
  const selected = records.filter(x => x.record?.data?.featured === true || x.record?.data?.selected === true || x.record?.data?.home === true || x.record.featured === true || x.record.selected === true || x.record.home === true);
  const items = (selected.length ? selected : records).slice(0,3);
  return items.map(item => {
    const title = localized(item.record,'en','title') || item.id;
    return `<a class="static-selected-row" href="/field-notes/${item.slug}/"><span>${escapeHtml(item.id)}</span><strong>${escapeHtml(title)}</strong><time datetime="${escapeHtml(recordDate(item.record))}">${escapeHtml(recordDate(item.record))}</time></a>`;
  }).join('\n');
}

function orientationBlock() {
  return `<div class="static-orientation" aria-label="GeoGeek orientation"><p>GIS · REMOTE SENSING · GEOAI · VISUALIZATION</p><p>Observations, experiments, and instruments for understanding Earth across scale, representation, and point of view.</p><nav><a href="/field-notes.html"><span>READ</span> Field Notes</a><a href="/lab.html"><span>BUILD</span> Lab</a><a href="/atlas.html"><span>EXPLORE</span> Atlas</a></nav></div>`;
}

async function staticizeCollection(records) {
  const file = path.join(dist,'field-notes.html');
  if (!(await exists(file))) return;
  let html = await read(file);
  const staticList = `<section class="static-note-list" data-static-note-list aria-label="Field Notes">${noteRows(records)}</section><div id="noteList" hidden aria-hidden="true"></div>`;
  html = replaceElement(html, 'noteList', staticList);
  if (!html.includes('data-static-note-list')) html = html.replace(/<\/main>/i, `${staticList}</main>`);
  html = addStaticAssets(html);
  await write(file, html);
}

async function staticizeHome(records) {
  const file = path.join(dist,'index.html');
  if (!(await exists(file))) return;
  let html = await read(file);
  const rows = `<div class="static-selected-work" data-static-selected-work>${selectedRows(records)}</div><div id="selectedWorkRows" hidden aria-hidden="true"></div>`;
  html = replaceElement(html, 'selectedWorkRows', rows);
  if (!html.includes('static-orientation')) {
    if (html.includes('data-static-selected-work')) html = html.replace('<div class="static-selected-work"', `${orientationBlock()}\n<div class="static-selected-work"`);
    else html = html.replace(/(<h1\b[^>]*>\s*GeoGeek\s*<\/h1>)/i, `$1\n${orientationBlock()}`);
  }
  html = addStaticAssets(html);
  await write(file, html);
}

async function stripArchiveBodies() {
  const candidates = [path.join(dist,'archive-content.js'), path.join(dist,'content','archive-content.js')];
  for (const p of candidates) {
    if (!(await exists(p))) continue;
    let js = await read(p);
    js = js.replace(/("bodyHtml"\s*:\s*)"(?:\\.|[^"\\])*"/g, '$1""');
    await write(p, js);
  }
}

function metadataRecord(item) {
  const r = item.record;
  return {
    id: item.id, slug: item.slug, published: recordDate(r), series: recordSeries(r),
    title: { en: localized(r,'en','title'), zh: localized(r,'zh','title') },
    excerpt: {
      en: localized(r,'en','excerpt') || localized(r,'en','description') || clamp(item.body.en,180),
      zh: localized(r,'zh','excerpt') || localized(r,'zh','description') || clamp(item.body.zh,180),
    },
    tags: recordTags(r), source: sourceUrl(r) || undefined,
    atlas: r.atlas || r?.data?.atlas || undefined, relations: r.relations || r?.data?.relations || undefined, trace: r.trace || r?.data?.trace || undefined,
    url: `/field-notes/${item.slug}/`, zhUrl: `/zh/field-notes/${item.slug}/`,
  };
}

async function writeIndexes(records) {
  const payload = { version: BUILD_VERSION, generated: new Date().toISOString(), records: records.map(metadataRecord) };
  await write(path.join(dist,'data','field-notes.json'), JSON.stringify(payload,null,2)+'\n');
  await write(path.join(dist,'data','site-index.json'), JSON.stringify({ version:BUILD_VERSION, generated:payload.generated, site:SITE, collections:{ fieldNotes:payload.records } },null,2)+'\n');
}

function rss(records, lang) {
  const zh = lang === 'zh';
  const items = records.slice(0,30).map(item => {
    const title = localized(item.record,lang,'title') || localized(item.record,'en','title') || item.id;
    const desc = localized(item.record,lang,'excerpt') || localized(item.record,lang,'description') || clamp(item.body[lang] || item.body.en,280);
    const url = zh ? `${SITE}/zh/field-notes/${item.slug}/` : `${SITE}/field-notes/${item.slug}/`;
    const d = recordDate(item.record);
    return `<item><title>${escapeXml(title)}</title><link>${url}</link><guid isPermaLink="true">${url}</guid>${d ? `<pubDate>${new Date(`${d}T00:00:00Z`).toUTCString()}</pubDate>`:''}<description>${escapeXml(desc)}</description></item>`;
  }).join('');
  return `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>${zh?'GeoGeek Field Notes / 田野札记':'GeoGeek Field Notes'}</title><link>${SITE}/</link><description>${zh?'关于 GIS、遥感、GeoAI 与空间观察的双语札记。':'Research notes on GIS, remote sensing, GeoAI, visualization, and geographic observation.'}</description><language>${zh?'zh-CN':'en'}</language>${items}</channel></rss>\n`;
}

function jsonFeed(records, lang) {
  const zh = lang === 'zh';
  return JSON.stringify({
    version:'https://jsonfeed.org/version/1.1', title:zh?'GeoGeek Field Notes / 田野札记':'GeoGeek Field Notes', home_page_url:`${SITE}/`, feed_url:`${SITE}/${zh?'zh/':''}feed.json`, language:zh?'zh-CN':'en',
    items: records.slice(0,50).map(item => {
      const url = zh ? `${SITE}/zh/field-notes/${item.slug}/` : `${SITE}/field-notes/${item.slug}/`;
      return { id:url, url, title:localized(item.record,lang,'title') || localized(item.record,'en','title') || item.id, summary:localized(item.record,lang,'excerpt') || clamp(item.body[lang] || item.body.en,280), date_published:recordDate(item.record) ? `${recordDate(item.record)}T00:00:00Z`:undefined, tags:recordTags(item.record) };
    }),
  },null,2)+'\n';
}

async function writeFeeds(records) {
  await write(path.join(dist,'feed.xml'), rss(records,'en'));
  await write(path.join(dist,'zh','feed.xml'), rss(records,'zh'));
  await write(path.join(dist,'feed.json'), jsonFeed(records,'en'));
  await write(path.join(dist,'zh','feed.json'), jsonFeed(records,'zh'));
}

async function listHtml(dir=dist) {
  const out=[];
  for (const entry of await fs.readdir(dir,{withFileTypes:true})) {
    const p=path.join(dir,entry.name);
    if (entry.isDirectory()) out.push(...await listHtml(p)); else if (entry.isFile() && entry.name.endsWith('.html')) out.push(p);
  }
  return out;
}

function publicPathForFile(file) {
  const rel = path.relative(dist,file).split(path.sep).join('/');
  if (rel === 'index.html') return '/';
  if (rel.endsWith('/index.html')) return `/${rel.slice(0,-'index.html'.length)}`;
  return `/${rel}`;
}

function genericDescription(route) {
  if (route === '/') return 'GeoGeek is a personal atlas of GIS, remote sensing, GeoAI, visualization, field notes, experiments, and geographic instruments.';
  if (route.includes('field-notes')) return 'GeoGeek Field Notes preserve place, scale, source, method, and uncertainty around geographic observations.';
  if (route.includes('lab')) return 'GeoGeek Lab contains lightweight geographic experiments, tools, and instruments that make scale, assumptions, and limits visible.';
  if (route.includes('atlas')) return 'GeoGeek Atlas reprojects the archive by field, time, type, topic, trace, and geography.';
  if (route.includes('commons')) return 'GeoGeek Commons is a privacy-conscious shared geographic field of anonymous visits and coarse observations.';
  if (route.includes('elsewhere')) return 'GeoGeek Elsewhere collects references and orientations beyond measured geographic work.';
  return 'GeoGeek — a personal atlas of space, time, perspective, and trace.';
}

function titleFromHtml(html, route) {
  const t=/<title>([\s\S]*?)<\/title>/i.exec(html)?.[1];
  if (t) return stripTags(t);
  const h=/<h1\b[^>]*>([\s\S]*?)<\/h1>/i.exec(html)?.[1];
  return h ? `${stripTags(h)} — GeoGeek` : `GeoGeek — ${route}`;
}

async function patchGenericSeo() {
  for (const file of await listHtml()) {
    let html=await read(file);
    const route=publicPathForFile(file);
    const canonical=`${SITE}${route}`;
    const isArticle=/\/(?:zh\/)?field-notes\/[^/]+\/$/.test(route);
    if (!isArticle) {
      const title=titleFromHtml(html,route);
      const websiteSchema = route === '/' ? { '@context':'https://schema.org','@type':'WebSite',name:'GeoGeek',url:`${SITE}/`,description:genericDescription(route),inLanguage:['en','zh-CN'] } : null;
      html=patchSeo(html,{canonical,title,description:genericDescription(route),lang:/^\/zh\//.test(route)?'zh-CN':'en',jsonLd:websiteSchema});
    }
    html=addStaticAssets(html,route);
    if (route === '/' || route === '/field-notes.html') {
      if (!/application\/rss\+xml/i.test(html)) html=html.replace(/<\/head>/i, `<link rel="alternate" type="application/rss+xml" title="GeoGeek Field Notes" href="/feed.xml">\n</head>`);
    }
    await write(file,html);
  }
}

async function writeSitemap(records) {
  const htmlFiles=await listHtml();
  const urls=[];
  for (const file of htmlFiles) {
    const route=publicPathForFile(file);
    if (/404\.html$/.test(route)) continue;
    urls.push({loc:`${SITE}${route}`});
  }
  const byPath=new Map(records.flatMap(item=>[
    [`${SITE}/field-notes/${item.slug}/`,item],
    [`${SITE}/zh/field-notes/${item.slug}/`,item],
  ]));
  const body=uniq(urls.map(x=>x.loc)).sort().map(loc=>{
    const item=byPath.get(loc);
    const alternates=item ? `<xhtml:link rel="alternate" hreflang="en" href="${SITE}/field-notes/${item.slug}/"/><xhtml:link rel="alternate" hreflang="zh-CN" href="${SITE}/zh/field-notes/${item.slug}/"/><xhtml:link rel="alternate" hreflang="x-default" href="${SITE}/field-notes/${item.slug}/"/>` : '';
    const lastmod=item && recordDate(item.record) ? `<lastmod>${recordDate(item.record)}</lastmod>`:'';
    return `<url><loc>${escapeXml(loc)}</loc>${lastmod}${alternates}</url>`;
  }).join('');
  const xml=`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${body}</urlset>\n`;
  await write(path.join(dist,'sitemap.xml'),xml);
  await write(path.join(dist,'robots.txt'),`User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`);
}

function parseTopLevelCss(css) {
  const chunks=[]; let start=0, i=0, depth=0, quote='', comment=false;
  while (i<css.length) {
    if (comment) { if (css[i]==='*' && css[i+1]==='/') {comment=false;i+=2;continue;} i++;continue; }
    if (quote) { if (css[i]==='\\') {i+=2;continue;} if (css[i]===quote) quote=''; i++; continue; }
    if (css[i]==='/' && css[i+1]==='*') {comment=true;i+=2;continue;}
    if (css[i]==='"' || css[i]==="'") {quote=css[i++];continue;}
    if (css[i]==='{') { if (depth===0) start=i; depth++; i++; continue; }
    if (css[i]==='}') { depth--; if (depth===0) {
      let preStart=start-1; while (preStart>=0 && css[preStart]!=='}' && css[preStart]!==';') preStart--;
      preStart++;
      chunks.push({start:preStart,end:i+1,text:css.slice(preStart,i+1),prelude:css.slice(preStart,start).trim()});
    } i++; continue; }
    i++;
  }
  return chunks;
}

async function splitCss() {
  const cssFile=path.join(dist,'styles.css');
  if (!(await exists(cssFile))) return;
  const css=await read(cssFile); const chunks=parseTopLevelCss(css);
  const moved=[]; const atlas=[]; const commons=[];
  for (const c of chunks) {
    if (c.prelude.startsWith('@')) continue;
    const p=c.prelude.toLowerCase();
    if ((p.includes('.atlas') || p.includes('[data-atlas')) && !p.includes('.commons')) {atlas.push(c.text);moved.push(c);}
    else if ((p.includes('.commons') || p.includes('[data-commons')) && !p.includes('.atlas')) {commons.push(c.text);moved.push(c);}
  }
  let base=css;
  for (const c of moved.sort((a,b)=>b.start-a.start)) base=base.slice(0,c.start)+base.slice(c.end);
  await write(path.join(dist,'styles.base.css'),base);
  await write(path.join(dist,'styles-atlas.css'),atlas.join('\n'));
  await write(path.join(dist,'styles-commons.css'),commons.join('\n'));
  for (const file of await listHtml()) {
    let html=await read(file); const route=publicPathForFile(file);
    html=html.replace(/href=(['"])(\/?styles\.css)\1/gi,'href="/styles.base.css"');
    const routeCss=[];
    if (route==='/' || route.includes('atlas')) routeCss.push('/styles-atlas.css');
    if (route==='/' || route.includes('commons')) routeCss.push('/styles-commons.css');
    for (const href of routeCss) if (!html.includes(href)) html=html.replace(/<\/head>/i,`<link rel="stylesheet" href="${href}">\n</head>`);
    await write(file,html);
  }
}

async function optimizeScripts() {
  for (const file of await listHtml()) {
    let html=await read(file); const route=publicPathForFile(file);

    // Non-critical global work never participates in first paint.
    html=html.replace(/<script\b([^>]*?)\bsrc=(['"])([^'"]*(?:commons\/visit-tracker\.js|previews\.js))\2([^>]*)><\/script>/gi,(m,a,q,src,b)=>{
      if (/\/(?:zh\/)?field-notes\/[^/]+\/$/.test(route) && /previews\.js$/i.test(src)) return '';
      return `<script data-idle-src="${escapeHtml(src)}"></script>`;
    });

    // The collection is now fully present in first-response HTML and filtering
    // is handled by static-delivery.js. Preserve the legacy runtime as an idle
    // enhancement rather than paying its data/model/app cost before content is
    // usable. Script order is preserved by static-delivery.js's sequential
    // loader, so legacy dependencies still initialise in their original order.
    if (route === '/field-notes.html' || route === '/zh/field-notes.html') {
      html=html.replace(/<script\b([^>]*?)\bsrc=(['"])([^'"]+)\2([^>]*)><\/script>/gi,(m,a,q,src,b)=>{
        if (/static-delivery\.js(?:[?#].*)?$/i.test(src)) return m;
        if (/^(?:https?:)?\/\//i.test(src)) return m;
        return `<script data-idle-src="${escapeHtml(src)}"></script>`;
      });
    }
    await write(file,html);
  }
}

async function main() {
  if (!(await exists(dist))) throw new Error('Legacy build did not create dist/.');
  for (const asset of ['static-delivery.css','static-delivery.js']) {
    const source = path.join(root,'site',asset);
    if (await exists(source)) await fs.copyFile(source,path.join(dist,asset));
  }
  const ogSource = path.join(root,'site','assets','og-default.png');
  if (await exists(ogSource)) {
    await fs.mkdir(path.join(dist,'assets'),{recursive:true});
    await fs.copyFile(ogSource,path.join(dist,'assets','og-default.png'));
  }
  const records=await loadRecords();
  await stripArchiveBodies();
  await writeIndexes(records);
  for (const item of records) { await renderArticle(item,records,'en'); await renderArticle(item,records,'zh'); }
  await staticizeCollection(records);
  await staticizeHome(records);
  await writeFeeds(records);
  await patchGenericSeo();
  await splitCss();
  await optimizeScripts();
  await writeSitemap(records);
  console.log(`[static-delivery] ${records.length} Field Notes prerendered in EN/ZH; metadata, feeds, sitemap, responsive image pass and route CSS split complete.`);
  if (!getImageTool()) console.warn('[static-delivery] ImageMagick not found; width/height still emitted, responsive raster variants skipped.');
}

await main();
