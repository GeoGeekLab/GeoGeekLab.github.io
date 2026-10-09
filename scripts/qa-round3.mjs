#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const read = file => fs.readFile(path.join(dist, file), 'utf8');

let failures = 0;
function check(ok, label) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}

const home = await read('index.html');
const lab = await read('lab.html');
const atlas = await read('atlas.html');
const origin = await read('origin/index.html');
const a11yCss = await read('round3-accessibility.css');
const a11yJs = await read('round3-accessibility.js');
const uxRuntime = await read('ux-refinements.js');

function scaleOpenTag(html) {
  return html.match(/<div\b[^>]*\bclass=(['"])[^'"]*\bscale-ui\b[^'"]*\1[^>]*>/i)?.[0] || '';
}

for (const [name, html] of [['Home', home], ['Lab', lab], ['Atlas', atlas]]) {
  const tag = scaleOpenTag(html);
  check(Boolean(tag), `R3-A11Y-01 ${name} exposes the information-scale container`);
  check(!/\b(?:role|tabindex|aria-haspopup|aria-expanded|aria-label)=/i.test(tag), `R3-A11Y-01 ${name} scale wrapper is non-interactive in first-response HTML`);
  check(/class=(['"])[^'"]*\bscale-disclosure\b/i.test(html), `R3-A11Y-01 ${name} has a dedicated scale disclosure button`);
  check(/id=(['"])informationScaleLegend\1/i.test(html), `R3-A11Y-01 ${name} disclosure target has a stable id`);
}

check(/data-round3-accessibility/i.test(home) && /round3-accessibility\.js\?v=20261007a/i.test(home), 'R3-A11Y-02 Round 3 accessibility layer is delivered on Home');
check(/removeAttribute\('aria-label'\)/.test(a11yJs), 'R3-A11Y-02 runtime removes legacy wrapper naming semantics');
check(/!scale\.querySelector\(':scope > \.scale-disclosure'\)/.test(uxRuntime), 'R3-A11Y-02 legacy Scale handler yields when the Round 3 disclosure exists');
check(/width:\s*25px\s*!important/.test(a11yCss) && /height:\s*25px\s*!important/.test(a11yCss), 'R3-A11Y-03 Atlas controls enforce a 25px hit box with subpixel margin');
check(/\.music-credit\s*\{[^}]*\.56/i.test(a11yCss), 'R3-A11Y-04 Origin credit contrast is raised above the measured threshold');
check(/\.sound\s*\{[^}]*min-width:\s*44px/i.test(a11yCss) && /min-height:\s*44px/i.test(a11yCss), 'R3-A11Y-04 Origin sound control meets the 44px target contract');
check(/round3Scrollable/.test(a11yJs) && /Commons summary metrics/.test(a11yJs), 'R3-A11Y-05 scrollable Commons metrics receive keyboard semantics');

check(/data-round3-lab-critical/i.test(lab), 'R3-PERF-01 Lab critical CSS is inlined in first-response HTML');
check(!/src=(['"])[^'"]*ux-preinit\.js/i.test(lab), 'R3-PERF-01 Lab removes the synchronous ux-preinit bootstrap');
for (const css of ['static-delivery.css', 'runtime-stability.css', 'earth-lab-preview.css', 'lab-page.css']) {
  check(!new RegExp(`<link\\b[^>]*href=(['"])[^'"]*${css.replace('.', '\\.')}[^'"]*\\1`, 'i').test(lab), `R3-PERF-02 ${css} is not a blocking Lab stylesheet request`);
}
check(/geo-interactions\.css[^>]*media=(['"])print\1[^>]*onload=/i.test(lab), 'R3-PERF-03 Geo interaction styling is non-blocking on Lab');
check(/data-round3-lab-postload/i.test(lab), 'R3-PERF-03 noncritical geo interaction runtime retains a post-load bootstrap');
check(!/<script\b[^>]*src=(['"])\/?geo-interactions\.js/i.test(lab), 'R3-PERF-03 geo interaction script is not parser-discovered');
check(/requestIdleCallback/.test(lab) && /addEventListener\('load'/.test(lab), 'R3-PERF-03 geo interaction enhancement waits for load and idle');
check(/<script\b[^>]*src=(['"])\/lab-real-previews\.js\?v=capture-[0-9a-f]{12}\1[^>]*\bdefer\b[^>]*data-round3-lab-preview-runtime/i.test(lab), 'R3-PERF-04 first-view preview runtime is parser-discovered and deferred');
check(/data-round3-lab-preview-discovery/.test(lab) && /new URLSearchParams\(location.search\)\.has\('instrument'\)/.test(lab) && /preload\.href = '\/assets\/lab\/previews\/orbit\.jpg\?v=capture-[0-9a-f]{12}'/.test(lab) && /preload\.fetchPriority = 'high'/.test(lab), 'R3-PERF-04 first-preview preload is version-pinned and skips direct instrument links');
check(/round3-accessibility\.js[^>]*\bdefer\b/i.test(origin), 'R3-A11Y-06 Origin receives the deferred Round 3 accessibility runtime');

if (failures) {
  console.error(`\nRound 3 QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log('\nRound 3 static QA passed.');
