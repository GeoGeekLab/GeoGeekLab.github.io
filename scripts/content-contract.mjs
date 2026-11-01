// Shared publication rules for generated content and static delivery.
export function normalizePublicationDate(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  const match = /^(\d{4})[.-](\d{2})[.-](\d{2})(?:T.*)?$/.exec(raw);
  if (!match) throw new Error(`Invalid publication date: ${raw}`);
  const normalized = `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(`${normalized}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== normalized) {
    throw new Error(`Invalid publication date: ${raw}`);
  }
  return normalized;
}

export function recordSeries(record) {
  return String(record?.data?.seriesKey || record?.data?.series || record?.text?.en?.series || record?.data?.type || record?.data?.collection || record?.series || record?.type || record?.collection || record?.atlas?.type || record?.data?.atlas?.type || '').trim();
}

export function recordTags(record) {
  return [...new Set([
    record?.text?.en?.tags, record?.data?.tags, record?.data?.topics,
    record?.tags, record?.topics, record?.atlas?.topic, record?.atlas?.topics,
  ].flatMap(value => Array.isArray(value) ? value : value == null ? [] : [value])
    .flatMap(value => typeof value === 'string' ? value.split(',').map(tag => tag.trim()) : [])
    .filter(Boolean))];
}

export function isPublishedBook(record) {
  const data = record?.data || record;
  return data?.scaffold !== true && !['draft', 'private', 'unpublished'].includes(String(data?.status || '').trim().toLowerCase());
}

const historicalWater = /^water\/workbench-(?:v5|v6|v7|v8|v9|v10|v10-1)(?:\/|$)/;
export const legacyWaterRoutes = [
  ...['v5', 'v6', 'v7', 'v8', 'v9', 'v10', 'v10-1'].map(version => `water/workbench-${version}/app/index.html`),
  'water/prototype.html',
];

export function isPublicSitePath(relative) {
  const normalized = relative.replaceAll('\\', '/');
  if (historicalWater.test(normalized) || /^water\/(?:prototype\.html|water-prototype\.(?:css|js))$/.test(normalized)) return false;
  if (normalized.split('/').some(part => part === 'tests')) return false;
  const name = normalized.split('/').at(-1);
  return !/^readme(?:\.[^.]+)?$/i.test(name) && !/\.(?:test|spec)\.[cm]?js$/i.test(name);
}

// Tokenize attributes so data-src and quoted text cannot masquerade as src.
// Offsets let transforms preserve the remaining attributes and their values.
function attributes(tag) {
  const opening = /^<[\w:-]+\b/.exec(tag);
  if (!opening) return [];
  const result = [];
  let cursor = opening[0].length;
  while (cursor < tag.length) {
    while (/\s/.test(tag[cursor] || '') && cursor < tag.length) cursor++;
    if (cursor >= tag.length || /[/>]/.test(tag[cursor])) break;
    const nameStart = cursor;
    while (cursor < tag.length && !/[\s=/>]/.test(tag[cursor])) cursor++;
    const nameEnd = cursor;
    const name = tag.slice(nameStart, nameEnd).toLowerCase();
    while (cursor < tag.length && /\s/.test(tag[cursor])) cursor++;
    let value = '', valueStart = cursor, valueEnd = cursor;
    if (tag[cursor] === '=') {
      cursor++;
      while (cursor < tag.length && /\s/.test(tag[cursor])) cursor++;
      const quote = /['"]/.test(tag[cursor] || '') ? tag[cursor++] : '';
      valueStart = cursor;
      while (cursor < tag.length && (quote ? tag[cursor] !== quote : !/[\s>]/.test(tag[cursor]))) cursor++;
      valueEnd = cursor;
      value = tag.slice(valueStart, valueEnd);
      if (quote && tag[cursor] === quote) cursor++;
    }
    result.push({ name, value, nameStart, nameEnd, valueStart, valueEnd });
  }
  return result;
}

function attribute(tag, name) {
  return attributes(tag).find(item => item.name === name.toLowerCase())?.value || '';
}

// Consume raw script/style contents and comments before looking for metadata.
// A string such as "<meta name='robots'>" inside a script is not a meta tag.
function seoTags(html) {
  const tokens = /<!--[\s\S]*?-->|<(script|style)\b(?:[^<>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<(?:meta|link)\b(?:[^<>"']|"[^"]*"|'[^']*')*>/gi;
  return [...html.matchAll(tokens)].map(([tag]) => tag).filter(tag => !/^<!--|^<style\b/i.test(tag));
}

export function hasNoindex(html) {
  return seoTags(html).filter(tag => /^<meta\b/i.test(tag)).some(tag =>
    attribute(tag, 'name').toLowerCase() === 'robots' && /(?:^|[\s,])noindex(?:$|[\s,])/i.test(attribute(tag, 'content')));
}

function seoKey(tag) {
  if (/^<meta\b/i.test(tag)) {
    const name = attribute(tag, 'name') || attribute(tag, 'property');
    return name ? `meta:${name.toLowerCase()}` : '';
  }
  if (/^<link\b/i.test(tag)) {
    const rel = attribute(tag, 'rel');
    return rel ? `link:${rel.toLowerCase()}` : '';
  }
  if (/^<script\b/i.test(tag) && attribute(tag, 'type').toLowerCase() === 'application/ld+json') return 'script:application/ld+json';
  return '';
}

// Authored metadata remains authoritative. Empty values count as missing.
export function fillMissingSeo(html, defaults) {
  const existing = seoTags(html);
  const additions = [];
  for (const tag of seoTags(defaults)) {
    const key = seoKey(tag);
    if (!key) continue;
    const matches = existing.filter(candidate => seoKey(candidate) === key);
    const value = current => /^<meta/i.test(current) ? attribute(current, 'content') : /^<link/i.test(current) ? attribute(current, 'href') : current.replace(/<[^>]*>/g, '').trim();
    if (matches.some(current => value(current).trim())) continue;
    for (const current of matches) html = html.replace(current, '');
    additions.push(tag);
  }
  return additions.length ? html.replace(/<\/head>/i, `${additions.join('\n')}\n</head>`) : html;
}

export function rewriteSharedStylesheet(html) {
  return html.replace(/<!--[\s\S]*?-->|<(script|style)\b(?:[^<>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/\1\s*>|<link\b(?:[^<>"']|"[^"]*"|'[^']*')*>/gi, tag => {
    if (!/^<link\b/i.test(tag)) return tag;
    const href = attributes(tag).find(item => item.name === 'href');
    const match = href && /^\/?styles\.css([?#].*)?$/.exec(href.value);
    if (!match) return tag;
    return `${tag.slice(0, href.valueStart)}/styles.base.css${match[1] || ''}${tag.slice(href.valueEnd)}`;
  });
}

export function deferArticleRuntime(html) {
  return html.replace(/<!--[\s\S]*?-->|<script\b(?:[^<>"']|"[^"]*"|'[^']*')*>[\s\S]*?<\/script\s*>/gi, script => {
    if (!/^<script\b/i.test(script)) return script;
    const src = attributes(script).find(item => item.name === 'src');
    if (!src) return script;
    const type = attribute(script, 'type').trim().toLowerCase();
    // The idle loader creates classic scripts. Keep module and data blocks intact.
    if (type && !['text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes(type)) return script;
    const pathname = src.value.split(/[?#]/)[0].replace(/^(?:\.\/|\/)+/, '');
    const nonCritical = /^(?:content\.js|archive-content\.js|app\.js|core\/(?:site-model|modules|semantic-scale)\.js|commons\/(?:config|visit-tracker)\.js)$/i.test(pathname);
    return nonCritical ? `${script.slice(0, src.nameStart)}data-idle-src${script.slice(src.nameEnd)}` : script;
  });
}

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[char]));

export function draftBookCompatibilityPage(record) {
  const title = escapeHtml(record.text.en.title);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://geogeeklab.github.io/elsewhere.html"><title>Reading response not published — GeoGeek</title></head><body><main><h1>Reading response not published</h1><p>The reading response for <cite>${title}</cite> is still a draft.</p><p>It is not part of the published collection.</p><p><a href="/elsewhere.html#e02">Return to the published book collection</a>.</p></main></body></html>\n`;
}

export function waterCompatibilityPage() {
  const target = '/water/workbench-v10-2/app/';
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,follow"><link rel="canonical" href="https://geogeeklab.github.io${target}"><meta http-equiv="refresh" content="0;url=${target}"><title>Water as Spectrum has moved — GeoGeek</title><script>const destination=new URL(${JSON.stringify(target)},location.href);destination.search=location.search;destination.hash=location.hash;location.replace(destination.href);</script></head><body><main><h1>Water as Spectrum has moved</h1><p><a href="${target}">Open the current Water as Spectrum workspace</a>.</p></main></body></html>\n`;
}
