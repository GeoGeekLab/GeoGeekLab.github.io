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
:root{--geogeek-boot-bg:#f6f4ee;--geogeek-boot-fg:#152019;--geogeek-boot-soft:#435048;--geogeek-boot-muted:#657068;--geogeek-boot-line:rgba(21,32,25,.08);--geogeek-boot-signal:#a64624;--geogeek-boot-pad:clamp(22px,4.2vw,68px);--geogeek-boot-sans:"Instrument Sans",Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;--geogeek-boot-mono:"IBM Plex Mono","SFMono-Regular","Roboto Mono","Liberation Mono",Menlo,Consolas,monospace}
html[data-geogeek-boot-surface="dark"]{--geogeek-boot-bg:#090b0d;--geogeek-boot-fg:#f1efe7;--geogeek-boot-soft:#aeb7af;--geogeek-boot-muted:#aeb7af;--geogeek-boot-line:rgba(242,240,233,.10);--geogeek-boot-signal:#e86a48}
html[data-geogeek-boot="loading"],html[data-geogeek-boot="leaving"],html[data-geogeek-boot="frozen"],html[data-geogeek-boot="restoring"]{background:var(--geogeek-boot-bg)!important}
html[data-geogeek-boot="loading"] body,html[data-geogeek-boot="leaving"] body,html[data-geogeek-boot="frozen"] body,html[data-geogeek-boot="restoring"] body{overflow:hidden!important;background:var(--geogeek-boot-bg)!important}
html[data-geogeek-boot="loading"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="leaving"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="frozen"] body>*:not(#geogeek-boot-cover),html[data-geogeek-boot="restoring"] body>*:not(#geogeek-boot-cover){visibility:hidden!important}
#geogeek-boot-cover{position:fixed!important;inset:0!important;z-index:2147483647!important;display:block!important;box-sizing:border-box!important;background:radial-gradient(circle at 78% 18%,rgba(46,83,63,.045),transparent 29%),radial-gradient(circle at 16% 84%,rgba(166,70,36,.025),transparent 25%),var(--geogeek-boot-bg)!important;color:var(--geogeek-boot-fg)!important;visibility:visible!important;opacity:1;pointer-events:auto;transition:opacity 140ms ease}
html[data-geogeek-boot-surface="dark"] #geogeek-boot-cover{background:var(--geogeek-boot-bg)!important}
#geogeek-boot-cover::after{content:"";position:absolute;left:0;right:0;top:71px;height:1px;background:var(--geogeek-boot-line)}
#geogeek-boot-cover .geogeek-boot-brand{position:absolute;left:var(--geogeek-boot-pad);top:0;height:72px;display:flex;align-items:center;gap:10px;font-family:var(--geogeek-boot-sans);font-size:16px;line-height:1;font-weight:680;letter-spacing:-.03em;color:var(--geogeek-boot-fg)}
#geogeek-boot-cover .geogeek-boot-brand-mark{position:relative;width:14px;height:14px;flex:0 0 14px;border:1px solid var(--geogeek-boot-soft);border-radius:50%;background:radial-gradient(circle at center,var(--geogeek-boot-signal) 0 2px,transparent 2.4px)}
#geogeek-boot-cover .geogeek-boot-brand-mark::before,#geogeek-boot-cover .geogeek-boot-brand-mark::after{content:"";position:absolute;background:var(--geogeek-boot-soft)}
#geogeek-boot-cover .geogeek-boot-brand-mark::before{left:6px;top:0;width:1px;height:14px}
#geogeek-boot-cover .geogeek-boot-brand-mark::after{left:0;top:6px;width:14px;height:1px}
#geogeek-boot-cover .geogeek-boot-scale{position:absolute;right:var(--geogeek-boot-pad);top:96px;min-width:148px;display:grid;gap:6px;text-align:right;font-family:var(--geogeek-boot-mono)}
#geogeek-boot-cover .geogeek-boot-scale>span{color:var(--geogeek-boot-muted);font-size:11px;line-height:1;font-weight:700;letter-spacing:.085em}
#geogeek-boot-cover .geogeek-boot-scale>strong{color:var(--geogeek-boot-fg);font-size:13px;line-height:1.25;font-weight:650;letter-spacing:.015em;text-transform:uppercase}
#geogeek-boot-cover .geogeek-boot-scale>em{color:var(--geogeek-boot-signal);font-size:11px;line-height:1;font-weight:700;letter-spacing:.07em;font-style:normal}
html[data-geogeek-boot="loading"] #geogeek-boot-cover,html[data-geogeek-boot="leaving"] #geogeek-boot-cover,html[data-geogeek-boot="frozen"] #geogeek-boot-cover,html[data-geogeek-boot="restoring"] #geogeek-boot-cover{opacity:1!important;pointer-events:auto!important;transition:none!important}
html[data-geogeek-boot="ready"] #geogeek-boot-cover{opacity:0;pointer-events:none;visibility:visible!important}
@media(max-width:640px){:root{--geogeek-boot-pad:18px}#geogeek-boot-cover::after{top:63px}#geogeek-boot-cover .geogeek-boot-brand{height:64px}#geogeek-boot-cover .geogeek-boot-scale{top:86px;right:18px}}
@media(prefers-reduced-motion:reduce){#geogeek-boot-cover{transition:none}}
</style>`;
  const preload = `<link rel="preload" href="${runtime}" as="script" data-geogeek-boot-preload>`;
  const cover = `<div id="geogeek-boot-cover" role="status" aria-live="polite" aria-label="Loading GeoGeek"><div class="geogeek-boot-brand" aria-hidden="true"><span class="geogeek-boot-brand-mark"></span><span>GeoGeek</span></div><div class="geogeek-boot-scale"><span>INFORMATION SCALE</span><strong id="geogeek-boot-status">CHANGING SCALE…</strong><em>VIEW / READYING</em></div></div>`;
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
