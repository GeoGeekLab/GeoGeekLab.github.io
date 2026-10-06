import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const execFileAsync = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

const optionalFontUrl = 'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;600&family=Instrument+Sans:wght@400;600&family=Newsreader:ital@0;1&display=optional';

const count = (text, pattern) => [...text.matchAll(pattern)].length;

test('production font pass replaces optional async delivery with one stable swap stylesheet', async () => {
  const dist = await mkdtemp(path.join(os.tmpdir(), 'geogeek-fonts-'));
  try {
    const html = `<!doctype html>
<html>
<head>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preload" as="style" href="${optionalFontUrl}" data-geogeek-fonts="async">
<link rel="stylesheet" href="${optionalFontUrl}" media="print" onload="this.media='all'">
<noscript><link rel="stylesheet" href="${optionalFontUrl}"></noscript>
</head>
<body>GeoGeek</body>
</html>`;
    const css = `@import url("${optionalFontUrl}");\nbody{font-family:"Instrument Sans",sans-serif;}`;

    await writeFile(path.join(dist, 'index.html'), html);
    await writeFile(path.join(dist, 'styles.css'), css);

    await execFileAsync(process.execPath, ['scripts/postbuild-font-stability.mjs'], {
      cwd: root,
      env: { ...process.env, GEOGEEK_DIST: dist },
    });

    const outputHtml = await readFile(path.join(dist, 'index.html'), 'utf8');
    const outputCss = await readFile(path.join(dist, 'styles.css'), 'utf8');

    assert.equal(count(outputHtml, /https:\/\/fonts\.googleapis\.com\/css2/g), 1);
    assert.match(outputHtml, /data-geogeek-fonts="stable"/);
    assert.match(outputHtml, /display=swap/);
    assert.doesNotMatch(outputHtml, /display=optional/);
    assert.doesNotMatch(outputHtml, /data-geogeek-fonts="async"/);
    assert.doesNotMatch(outputHtml, /media="print"/);
    assert.doesNotMatch(outputHtml, /onload="this\.media='all'"/);
    assert.match(outputHtml, /rel="preconnect" href="https:\/\/fonts\.googleapis\.com"/);
    assert.match(outputHtml, /rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin/);

    assert.doesNotMatch(outputCss, /fonts\.googleapis\.com/);
    assert.doesNotMatch(outputCss, /display=optional/);
  } finally {
    await rm(dist, { recursive: true, force: true });
  }
});

test('build runs font normalization after performance and visual-readiness transforms', async () => {
  const build = await readFile(path.join(root, 'scripts/build.mjs'), 'utf8');
  const performance = build.indexOf("./postbuild-performance.mjs");
  const visualReadiness = build.indexOf("./postbuild-visual-readiness.mjs");
  const fontStability = build.indexOf("./postbuild-font-stability.mjs");

  assert.ok(performance >= 0);
  assert.ok(visualReadiness > performance);
  assert.ok(fontStability > visualReadiness);
});
