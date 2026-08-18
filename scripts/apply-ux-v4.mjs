import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const templateDir = path.join(root, 'templates');
const indexPath = path.join(site, 'index.html');

const required = [indexPath, path.join(site, 'styles.css'), path.join(site, 'app.js')];
for (const file of required) {
  if (!fs.existsSync(file)) {
    console.error(`GeoGeek UX v4: expected repository file not found: ${path.relative(root, file)}`);
    console.error('Run this script from the GeoGeekLab.github.io repository after copying the package contents into it.');
    process.exit(1);
  }
}

const faviconBlock = `<link rel="icon" href="/favicon.ico" sizes="any"/>\n<link rel="icon" type="image/svg+xml" href="/favicon.svg"/>\n<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png"/>\n<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png"/>`;
const cssLink = `<link href="/ux-refinements.css" rel="stylesheet"/>`;
const preinitScript = `<script src="/ux-preinit.js"></script>`;
const behaviorScript = `<script src="/ux-refinements.js"></script>`;

function walkHtml(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkHtml(full));
    else if (entry.isFile() && entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

function injectSharedAssets(file) {
  let html = fs.readFileSync(file, 'utf8');
  const original = html;

  if (!html.includes('/favicon.svg')) {
    const marker = /(<meta[^>]+name=["']application-name["'][^>]*>)/i;
    if (marker.test(html)) html = html.replace(marker, `$1\n${faviconBlock}`);
    else html = html.replace(/<title>/i, `${faviconBlock}\n<title>`);
  }

  if (!html.includes('/ux-refinements.css')) {
    if (/<link[^>]+styles\.css[^>]*>/i.test(html)) {
      html = html.replace(/(<link[^>]+styles\.css[^>]*>)/i, `$1\n${cssLink}`);
    } else html = html.replace(/<\/head>/i, `${cssLink}\n</head>`);
  }

  if (!html.includes('/ux-preinit.js')) {
    html = html.replace(/<\/head>/i, `${preinitScript}\n</head>`);
  }

  // Initial label; locale-specific correction is handled by ux-refinements.js.
  html = html.replace(/(<button[^>]+id=["']navToggle["'][^>]*>)Map(<\/button>)/i, '$1Index$2');

  if (!html.includes('/ux-refinements.js')) {
    html = html.replace(/<\/body>/i, `${behaviorScript}\n</body>`);
  }

  if (html !== original) fs.writeFileSync(file, html);
  return html !== original;
}

// Patch all authored HTML and the field-note template so generated records inherit the same chrome.
const authoredHtml = walkHtml(site);
const templates = walkHtml(templateDir);
let sharedPatched = 0;
for (const file of [...authoredHtml, ...templates]) if (injectSharedAssets(file)) sharedPatched += 1;

// Home-only structural refinements.
let index = fs.readFileSync(indexPath, 'utf8');
let changed = false;

const commonsIndexPattern = /\s*<a[^>]*class=["']sheet-index-sub["'][^>]*data-sheet-link=["']commons-gateway["'][^>]*>.*?<\/a>\s*/is;
if (commonsIndexPattern.test(index)) {
  index = index.replace(commonsIndexPattern, '\n');
  changed = true;
}

if (!index.includes('id="selected-work"')) {
  const selectedWork = `\n<section class="selected-work" data-scale="1 : 250,000" data-scale-level="SITE" id="selected-work" aria-labelledby="selectedWorkTitle">\n  <header class="selected-work-head">\n    <div class="selected-work-kicker" id="selectedWorkKicker">SELECTED / FIELD NOTES</div>\n    <div>\n      <h2 id="selectedWorkTitle">Recent records from the archive.</h2>\n      <a id="selectedWorkAll" href="field-notes.html">OPEN FIELD NOTES ↗</a>\n    </div>\n  </header>\n  <div class="preview-list selected-work-list" id="selectedWorkRows"></div>\n</section>\n`;
  const orbitalStart = /\n(<section class="orbital-threshold"[^>]*id="orbital-threshold"[^>]*>)/;
  if (!orbitalStart.test(index)) {
    console.error('GeoGeek UX v4: could not locate the orbital threshold anchor in site/index.html.');
    process.exit(1);
  }
  index = index.replace(orbitalStart, `${selectedWork}\n$1`);
  changed = true;
}

if (!index.includes('id="orbitalInstruction"')) {
  const traceKey = /(<div class="orbital-trace-key"[^>]*>[\s\S]*?<\/div>)/;
  if (!traceKey.test(index)) {
    console.error('GeoGeek UX v4: could not locate the orbital trace key in site/index.html.');
    process.exit(1);
  }
  index = index.replace(traceKey, `$1\n      <div class="orbital-instruction" id="orbitalInstruction" aria-hidden="true"><span>MOVE</span><i></i><span>SELECT</span><i></i><span>TRACE</span></div>`);
  changed = true;
}

if (!index.includes('id="orbitalAssist"')) {
  const orbitalSub = /(<p id="orbitalSub">[\s\S]*?<\/p>)/;
  if (!orbitalSub.test(index)) {
    console.error('GeoGeek UX v4: could not locate #orbitalSub in site/index.html.');
    process.exit(1);
  }
  index = index.replace(orbitalSub, `$1\n        <p class="orbital-keyboard-note" id="orbitalAssist">KEYBOARD · FOCUS THE FIELD AND PRESS ENTER TO OPEN THE ORBIT INSTRUMENT</p>`);
  changed = true;
}

if (changed) fs.writeFileSync(indexPath, index);

console.log(`GeoGeek UX v4 applied. Shared HTML updated: ${sharedPatched}; homepage structural update: ${changed ? 'yes' : 'already applied'}.`);
console.log('Next: npm run build && npm run qa');
