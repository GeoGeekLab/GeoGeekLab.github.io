#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = process.env.GEOGEEK_DIST
  ? path.resolve(process.env.GEOGEEK_DIST)
  : path.join(root, 'dist');

const fontCss = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Sans:wght@400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&display=swap';

const exists = file => fs.access(file).then(() => true).catch(() => false);

async function walk(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await walk(file));
    else out.push(file);
  }
  return out;
}

function removeGoogleFontStylesheets(html) {
  html = html.replace(
    /\s*<noscript>\s*<link\b[^>]*href=(['"])https:\/\/fonts\.googleapis\.com\/css(?:2)?[^>]*>\s*<\/noscript>\s*/gi,
    '\n'
  );
  html = html.replace(
    /\s*<link\b[^>]*href=(['"])https:\/\/fonts\.googleapis\.com\/css(?:2)?[^>]*>\s*/gi,
    '\n'
  );
  return html;
}

function ensureConnectionHints(html) {
  const hints = [];
  if (!/<link\b[^>]*rel=(['"])preconnect\1[^>]*href=(['"])https:\/\/fonts\.googleapis\.com\2/i.test(html)) {
    hints.push('<link rel="preconnect" href="https://fonts.googleapis.com">');
  }
  if (!/<link\b[^>]*rel=(['"])preconnect\1[^>]*href=(['"])https:\/\/fonts\.gstatic\.com\2/i.test(html)) {
    hints.push('<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>');
  }
  if (!hints.length) return html;
  return html.replace(/<\/head>/i, `${hints.join('\n')}\n</head>`);
}

function addStableFontStylesheet(html) {
  const escaped = fontCss.replace(/&/g, '&amp;');
  const stylesheet = `<link rel="stylesheet" href="${escaped}" data-geogeek-fonts="stable">`;
  return html.replace(/<\/head>/i, `${stylesheet}\n</head>`);
}

export function normalizeFontHtml(html) {
  html = removeGoogleFontStylesheets(html);
  html = ensureConnectionHints(html);
  html = addStableFontStylesheet(html);
  return html;
}

export function normalizeFontCss(css) {
  css = css.replace(
    /@import\s+url\((['"])https:\/\/fonts\.googleapis\.com\/[^'"]+\1\);?\s*/gi,
    ''
  );
  return css.replace(/([?&]display=)optional\b/gi, '$1swap');
}

async function main() {
  if (!(await exists(dist))) throw new Error(`Missing build output: ${dist}`);
  const files = await walk(dist);
  const htmlFiles = files.filter(file => file.endsWith('.html'));
  const cssFiles = files.filter(file => file.endsWith('.css'));

  for (const file of htmlFiles) {
    const html = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, normalizeFontHtml(html));
  }

  for (const file of cssFiles) {
    const css = await fs.readFile(file, 'utf8');
    await fs.writeFile(file, normalizeFontCss(css));
  }

  console.log(`Normalized font delivery in ${htmlFiles.length} HTML files and ${cssFiles.length} CSS files.`);
}

await main();
