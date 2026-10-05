#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const runtime = '/visual-readiness.js?v=20261005a';
const preinitVersion = '20261005a';

const exists = file => fs.access(file).then(() => true).catch(() => false);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...await htmlFiles(file));
    else if (/\.html$/i.test(entry.name)) out.push(file);
  }
  return out;
}

function shouldGate(relative) {
  // Standalone instrument runtimes own their own activation screens. The site
  // document system (home, collections, records, Origin and stories) shares
  // this readiness contract.
  return !/^(?:play|earth|orbital)\//i.test(relative);
}

function darkSurface(relative) {
  return /^origin\//i.test(relative);
}

function refreshCriticalBootstrap(html) {
  // The old preinit contained the / -> /index.html redirect. Updating its source
  // without changing the URL is insufficient because browsers and Pages may
  // retain the previous version. Preserve relative path prefixes but force a new
  // cache key anywhere ux-preinit participates in an entry document.
  return html.replace(
    /src=(['"])([^'"]*\/)?ux-preinit\.js(?:\?v=[^'"]*)?\1/gi,
    (_match, quote, prefix = '') => `src=${quote}${prefix}ux-preinit.js?v=${preinitVersion}${quote}`
  );
}

function removeDuplicateHomeNavigation(html, relative) {
  if (relative !== 'index.html') return html;
  // GitHub Pages serves dist/index.html for both `/` and `/index.html`. The
  // historical client redirect created an unnecessary second document
  // navigation and a visible stale-frame opportunity. Keep the canonical link,
  // remove only the redirect script inserted by the Origin handoff pass.
  return html.replace(/\s*<script\b[^>]*data-geogeek-home-canonical[^>]*>[\s\S]*?<\/script>\s*/i, '\n');
}

function bridgeProgrammaticNavigation(html, relative) {
  if (!/^origin\//i.test(relative)) return html;
  // Origin can return to Home by wheel, keyboard or touch without clicking an
  // anchor. Start the same visual handoff before its delayed location.assign so
  // the outgoing instrument never remains visible during that scripted return.
  const needle = "    document.body.classList.add('origin-home-leaving');\n    setTimeout(()=>location.assign('/index.html'),reduced?0:220);";
  if (!html.includes(needle)) return html;
  return html.replace(
    needle,
    "    document.body.classList.add('origin-home-leaving');\n    window.GeoGeekVisualReadiness?.beginLeave?.('Returning to GeoGeek…');\n    setTimeout(()=>location.assign('/index.html'),reduced?0:220);"
  );
}

function injectBoot(html, relative) {
  if (/data-geogeek-visual-readiness=(['"])true\1/i.test(html)) return html;
  const surface = darkSurface(relative) ? 'dark' : 'paper';
  const preinit = `<script data-geogeek-boot-preinit>document.documentElement.dataset.geogeekBoot='loading';document.documentElement.dataset.geogeekBootSurface='${surface}';</script>`;
  const critical = `<style data-geogeek-boot-critical>
:root{--geogeek-boot-bg:#f6f4ee;--geogeek-boot-fg:#121212;--geogeek-boot-muted:#6e6c66;--geogeek-boot-line:rgba(18,18,18,.16);--geogeek-boot-signal:#e94f37}
html[data-geogeek-boot-surface="dark"]{--geogeek-boot-bg:#090b0d;--geogeek-boot-fg:#f2f0e9;--geogeek-boot-muted:#aaa9a4;--geogeek-boot-line:rgba(242,240,233,.18);--geogeek-boot-signal:#e86a48}
html[data-geogeek-boot="loading"],html[data-geogeek-boot="leaving"],html[data-geogeek-boot="frozen"],html[data-geogeek-boot="restoring"]{background:var(--geogeek-boot-bg)!important}
html[data-geogeek-boot="loading"] body,html[data-geogeek-boot="leaving"] body,html[data-geogeek-boot="frozen"] body,html[data-geogeek-boot="restoring"] body{overflow:hidden!important;background:var(--geogeek-boot-bg)!important}
html[data-geogeek-boot="loading"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="leaving"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="frozen"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="restoring"] body>*:not(#geogeek-boot-cover){visibility:hidden!important}
#geogeek-boot-cover{position:fixed!important;inset:0!important;z-index:2147483647!important;display:grid!important;place-items:center!important;box-sizing:border-box!important;padding:32px!important;background:var(--geogeek-boot-bg)!important;color:var(--geogeek-boot-fg)!important;visibility:visible!important;opacity:1;pointer-events:auto;font-family:"IBM Plex Mono",ui-monospace,SFMono-Regular,Menlo,monospace;transition:opacity 140ms ease}
#geogeek-boot-cover .geogeek-boot-inner{width:min(440px,100%)}
#geogeek-boot-cover .geogeek-boot-mark{display:flex;align-items:center;gap:11px;font-size:12px;font-weight:650;letter-spacing:.13em;text-transform:uppercase}
#geogeek-boot-cover .geogeek-boot-mark::before{content:"";width:14px;height:14px;border:1px solid currentColor;background:radial-gradient(circle at center,var(--geogeek-boot-signal) 0 2px,transparent 2.5px)}
#geogeek-boot-cover .geogeek-boot-status{margin:22px 0 0;padding-top:14px;border-top:1px solid var(--geogeek-boot-line);color:var(--geogeek-boot-muted);font-size:10px;line-height:1.5;letter-spacing:.12em;text-transform:uppercase}
html[data-geogeek-boot="ready"] #geogeek-boot-cover{opacity:0;pointer-events:none;visibility:visible!important}
@media(prefers-reduced-motion:reduce){#geogeek-boot-cover{transition:none}}
</style>`;
  const preload = `<link rel="preload" href="${runtime}" as="script" data-geogeek-boot-preload>`;
  const cover = `<div id="geogeek-boot-cover" role="status" aria-live="polite" aria-label="Loading GeoGeek"><div class="geogeek-boot-inner"><div class="geogeek-boot-mark">GeoGeek</div><div class="geogeek-boot-status" id="geogeek-boot-status">Resolving the field…</div></div></div>`;
  const script = `<script src="${runtime}" defer data-geogeek-visual-readiness="true"></script>`;

  html = html.replace(/<head([^>]*)>/i, match => `${match}\n${preinit}\n${critical}\n${preload}`);
  html = html.replace(/<body\b([^>]*)>/i, match => `${match}\n${cover}`);
  html = html.replace(/<\/body>/i, `${script}\n</body>`);
  return html;
}

if (!(await exists(dist))) throw new Error(`Missing build output: ${dist}`);
if (!(await exists(path.join(dist, 'visual-readiness.js')))) {
  throw new Error('Missing visual-readiness.js in build output.');
}

let count = 0;
for (const file of await htmlFiles(dist)) {
  const relative = path.relative(dist, file).replaceAll('\\', '/');
  if (!shouldGate(relative)) continue;
  let html = await fs.readFile(file, 'utf8');
  html = refreshCriticalBootstrap(html);
  html = removeDuplicateHomeNavigation(html, relative);
  html = bridgeProgrammaticNavigation(html, relative);
  const patched = injectBoot(html, relative);
  await fs.writeFile(file, patched);
  count += 1;
}

console.log(`Applied site-wide visual readiness gate to ${count} HTML documents.`);
