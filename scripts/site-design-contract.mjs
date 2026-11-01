import { SITE_ASSET_RELEASE, LAB_DOCUMENT_RELEASE } from './site-release-contract.mjs';

const origin = 'https://geogeeklab.github.io/';
const destinations = new Map([
  ['index.html', 'Home'], ['field-notes.html', 'Field Notes'],
  ['lab.html', 'Lab'], ['atlas.html', 'Atlas'], ['elsewhere.html', 'Elsewhere'],
]);
const changedAssets = /^\/(?:app\.js|ux-refinements\.js|coordinates-field\.css|design-tokens\.css|styles(?:\.base)?\.css|atlas-page\.css|core\/modules\.js)$/;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];
const setAttr = (tag, name, value) => tag.replace(new RegExp(`(\\s${name}\\s*=\\s*)(["'])(.*?)\\2`, 'i'), (_match, prefix, quote) => `${prefix}${quote}${value}${quote}`);

export function normalizePageDesign(html, relative = 'index.html') {
  const pageUrl = new URL(relative.replaceAll('\\', '/'), origin);
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
  const base = new URL(baseTag && attr(baseTag, 'href') || pageUrl, pageUrl);
  const localUrl = raw => {
    try {
      const url = new URL(raw.replaceAll('&amp;', '&'), base);
      return url.origin === new URL(origin).origin ? url : null;
    } catch { return null; }
  };
  html = html.replace(/(<nav\b[^>]*>)([\s\S]*?)(<\/nav>)/gi, (nav, open, links, close) => {
    if (attr(open, 'id') !== 'primaryNav' && !(attr(open, 'class') || '').split(/\s+/).includes('nav-links')) return nav;
    const normalized = links.replace(/(<a\b[^>]*>)([\s\S]*?)(<\/a>)/gi, (link, tag, label, end) => {
      const href = attr(tag, 'href');
      const url = href && localUrl(href);
      const name = url?.pathname.split('/').at(-1);
      if (!destinations.has(name)) return link;
      const destination = name === 'lab.html' ? `/lab.html?release=${LAB_DOCUMENT_RELEASE}` : name;
      return `${setAttr(tag, 'href', destination)}${destinations.get(name)}${end}`;
    });
    return `${open}${normalized}${close}`;
  });
  html = html.replace(/<(?:script|link)\b[^>]*>/gi, tag => {
    for (const name of ['src', 'data-idle-src', 'href']) {
      const raw = attr(tag, name);
      const url = raw && localUrl(raw);
      if (url && changedAssets.test(url.pathname)) tag = setAttr(tag, name, `${url.pathname}?v=${SITE_ASSET_RELEASE}`);
    }
    return tag;
  });
  if (!/<link\b[^>]*\shref\s*=\s*(['"])\/design-tokens\.css(?:[?#][^'"]*)?\1/i.test(html)) {
    html = html.replace(/<head\b[^>]*>/i, head=>`${head}\n<link rel="stylesheet" href="/design-tokens.css?v=${SITE_ASSET_RELEASE}">`);
  }
  return html;
}
