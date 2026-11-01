import fs from 'node:fs/promises';
import path from 'node:path';
import { gzipSync } from 'node:zlib';

const attribute = (tag, name) => tag.match(new RegExp(`\\s${name}\\s*=\\s*(["'])(.*?)\\1`, 'i'))?.[2];

export function initialLocalScripts(html, pageUrl) {
  const baseTag = html.match(/<base\b[^>]*>/i)?.[0];
  const base = new URL(baseTag && attribute(baseTag, 'href') || pageUrl, pageUrl);
  const scripts = new Map();
  for (const tag of html.matchAll(/<script\b[^>]*>/gi)) {
    const src = attribute(tag[0], 'src');
    if (!src) continue; // data-idle-src is not an initial resource.
    const url = new URL(src.replaceAll('&amp;', '&'), base);
    if (url.origin !== new URL(pageUrl).origin) continue;
    url.hash = '';
    scripts.set(url.href, url);
  }
  return [...scripts.values()];
}

export async function scriptBudget(htmlFile, dist) {
  const html = await fs.readFile(htmlFile, 'utf8');
  const pageUrl = new URL(path.relative(dist, htmlFile).split(path.sep).join('/'), 'https://geogeeklab.github.io/');
  let total = 0;
  for (const url of initialLocalScripts(html, pageUrl)) {
    const file = path.resolve(dist, `.${decodeURIComponent(url.pathname)}`);
    if (!file.startsWith(path.resolve(dist) + path.sep)) throw new Error(`Script escapes artifact: ${url.pathname}`);
    const bytes = await fs.readFile(file).catch(error => { throw new Error(`Missing initial script ${url.pathname}`, { cause: error }); });
    total += gzipSync(bytes).length;
  }
  return total;
}
