#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

const exists = file => fs.access(file).then(() => true).catch(() => false);
const read = file => fs.readFile(file, 'utf8');

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(file));
    else if (/\.html$/i.test(entry.name)) out.push(file);
  }
  return out;
}

function stripAttr(attrs, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return attrs.replace(new RegExp(`\\s+${escaped}=(['"])\\s*[^'"]*\\1`, 'ig'), '');
}

function patchScaleMarkup(html) {
  const open = /<div\b([^>]*\bclass=(['"])[^'"]*\bscale-ui\b[^'"]*\2[^>]*)>/i;
  const match = open.exec(html);
  if (!match) return html;

  let attrs = match[1];
  for (const name of ['tabindex', 'role', 'aria-haspopup', 'aria-expanded', 'aria-label']) attrs = stripAttr(attrs, name);
  const replacement = `<div${attrs}>`;
  html = `${html.slice(0, match.index)}${replacement}${html.slice(match.index + match[0].length)}`;

  if (!/class=(['"])[^'"]*\bscale-disclosure\b/i.test(html)) {
    const button = '<button type="button" class="scale-disclosure" aria-label="Information scale options" aria-expanded="false" aria-controls="informationScaleLegend"></button>';
    html = html.replace(replacement, `${replacement}\n${button}`);
  }
  html = html.replace(/<div\b([^>]*\bclass=(['"])[^'"]*\bscale-legend\b[^'"]*\2[^>]*)>/i, (full, legendAttrs) => {
    if (/\bid=(['"])[^'"]+\1/i.test(legendAttrs)) return full;
    return `<div${legendAttrs} id="informationScaleLegend">`;
  });
  return html;
}

function removeStylesheet(html, basename) {
  const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`\\s*<link\\b[^>]*href=(['"])[^'"]*${escaped}(?:\\?[^'"]*)?\\1[^>]*>\\s*`, 'ig'), '\n');
}

function removeScript(html, basename) {
  const escaped = basename.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`\\s*<script\\b[^>]*src=(['"])[^'"]*${escaped}(?:\\?[^'"]*)?\\1[^>]*><\\/script>\\s*`, 'ig'), '\n');
}

function removeLegacyPreviewArtifacts(html) {
  html = removeScript(html, 'previews.js');
  html = html.replace(/\s*<link\b[^>]*href=(['"])[^'"]*earth-observatory\.jpg(?:\?[^'"]*)?\1[^>]*>\s*/ig, '\n');
  html = html.replace(/\/assets\/lab\/previews\/earth-observatory\.jpg(?:\?[^'"<\s]*)?/ig, '/assets/lab/previews/earth.jpg');
  return html;
}

async function labPreviewVersion() {
  const file = path.join(dist, 'lab-real-previews.js');
  if (!(await exists(file))) throw new Error('Round 3 missing lab-real-previews.js runtime.');
  const source = await read(file);
  const match = source.match(/const VERSION = ['"]([^'"]+)['"];/);
  if (!match) throw new Error('Round 3 could not resolve the Lab preview cache version.');
  if (!/^capture-[a-f0-9]{12}$/i.test(match[1])) throw new Error(`Round 3 received a non-capture Lab preview version: ${match[1]}`);
  return match[1];
}

async function patchLegacyScaleRuntime() {
  const file = path.join(dist, 'ux-refinements.js');
  if (!(await exists(file))) throw new Error('Round 3 missing ux-refinements.js runtime.');
  let js = await read(file);
  const legacy = "const scale = $('.scale-ui');\n  if (scale) {";
  const guarded = "const scale = $('.scale-ui');\n  if (scale && !scale.querySelector(':scope > .scale-disclosure')) {";
  if (!js.includes(guarded)) {
    if (!js.includes(legacy)) throw new Error('Round 3 could not locate the legacy Scale runtime block.');
    js = js.replace(legacy, guarded);
    await fs.writeFile(file, js);
  }
}

async function patchLab(html) {
  const previewVersion = await labPreviewVersion();
  const criticalFiles = [
    'static-delivery.css',
    'runtime-stability.css',
    'lab-page.css',
    'lab-real-previews.css',
    'editorial-layout.css'
  ];
  const critical = [];
  for (const name of criticalFiles) {
    const file = path.join(dist, name);
    if (!(await exists(file))) throw new Error(`Round 3 missing Lab critical CSS: ${name}`);
    critical.push(`/* ${name} */\n${await read(file)}`);
    html = removeStylesheet(html, name);
  }

  // Capture images are the Lab collection's authoritative first-view visual state.
  // Register their MutationObserver before app.js creates cards. Keep unrelated
  // interaction enhancements off the critical path.
  html = removeScript(html, 'ux-preinit.js');
  html = removeScript(html, 'geo-interactions.js');
  html = removeScript(html, 'lab-real-previews.js');
  html = removeLegacyPreviewArtifacts(html);

  const criticalTag = `<style data-round3-lab-critical>\n${critical.join('\n')}\n</style>`;
  if (!/data-round3-lab-critical/i.test(html)) html = html.replace(/<\/head>/i, `${criticalTag}\n</head>`);

  const previewRuntime = `<script src="/lab-real-previews.js?v=${previewVersion}" defer data-round3-lab-previews="authoritative"></script>`;
  if (!/data-round3-lab-previews=(['"])authoritative\1/i.test(html)) {
    html = html.replace(/<\/head>/i, `${previewRuntime}\n</head>`);
  }

  if (!/geo-interactions\.css/i.test(html)) {
    const asyncStyle = [
      '<link rel="stylesheet" href="/geo-interactions.css?v=20260930g" media="print" onload="this.media=\'all\'" data-round3-nonblocking="geo-interactions">',
      '<noscript><link rel="stylesheet" href="/geo-interactions.css?v=20260930g"></noscript>'
    ].join('\n');
    html = html.replace(/<\/head>/i, `${asyncStyle}\n</head>`);
  }

  if (!/data-round3-lab-postload/i.test(html)) {
    const postload = `<script data-round3-lab-postload>
(() => {
  const start = () => {
    if (document.querySelector('script[data-round3-postload="geo-interactions"]')) return;
    const script = document.createElement('script');
    script.src = '/geo-interactions.js?v=20260930g';
    script.dataset.round3Postload = 'geo-interactions';
    document.head.appendChild(script);
  };
  const idle = () => 'requestIdleCallback' in window
    ? requestIdleCallback(start, { timeout: 1600 })
    : setTimeout(start, 650);
  if (document.readyState === 'complete') idle();
  else addEventListener('load', idle, { once: true });
})();
</script>`;
    html = html.replace(/<\/body>/i, `${postload}\n</body>`);
  }

  return html;
}

async function main() {
  if (!(await exists(dist))) throw new Error(`Missing build output: ${dist}`);
  const a11yCssFile = path.join(dist, 'round3-accessibility.css');
  const a11yJsFile = path.join(dist, 'round3-accessibility.js');
  if (!(await exists(a11yCssFile)) || !(await exists(a11yJsFile))) throw new Error('Round 3 accessibility assets were not copied to dist.');
  const a11yCss = await read(a11yCssFile);
  const inlineA11y = `<style data-round3-accessibility>\n${a11yCss}\n</style>`;
  const script = '<script src="/round3-accessibility.js?v=20261001b" defer data-round3-accessibility="true"></script>';

  const files = await htmlFiles(dist);
  for (const file of files) {
    let html = await read(file);
    html = patchScaleMarkup(html);
    const relative = path.relative(dist, file).replaceAll('\\', '/');
    if (relative === 'lab.html') html = await patchLab(html);
    if (!/data-round3-accessibility/i.test(html)) html = html.replace(/<\/head>/i, `${inlineA11y}\n</head>`);
    if (!/data-round3-accessibility=(['"])true\1/i.test(html)) html = html.replace(/<\/body>/i, `${script}\n</body>`);
    await fs.writeFile(file, html);
  }

  await patchLegacyScaleRuntime();
  console.log(`Applied Round 3 accessibility + Lab render-path pass to ${files.length} HTML files.`);
}

await main();
