import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import vm from 'node:vm';
import {
  normalizePublicationDate, recordSeries, recordTags, isPublishedBook,
  isPublicSitePath, hasNoindex, fillMissingSeo, rewriteSharedStylesheet,
  draftBookCompatibilityPage, waterCompatibilityPage, deferArticleRuntime,
} from '../../scripts/content-contract.mjs';

test('publication dates support authored dot dates and reject invalid calendar dates', () => {
  assert.equal(normalizePublicationDate('2026.09.15'), '2026-09-15');
  assert.equal(normalizePublicationDate('2024-02-29T14:00:00Z'), '2024-02-29');
  assert.equal(normalizePublicationDate(''), '');
  for (const invalid of ['2026.02.29', '2026-04-31', '2026-13-01', '15/09/2026']) {
    assert.throws(() => normalizePublicationDate(invalid), /Invalid publication date/);
  }
});

test('every authored Field Note retains its series, tags, and machine-readable date', async () => {
  const root = new URL('../../content/field-notes/', import.meta.url);
  for (const entry of await readdir(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const record = JSON.parse(await readFile(new URL(`${entry.name}/record.json`, root), 'utf8'));
    assert.equal(recordSeries(record), record.data.seriesKey);
    assert.deepEqual(recordTags(record), record.text.en.tags);
    const date = normalizePublicationDate(record.data.published);
    assert.ok(Number.isFinite(Date.parse(`${date}T00:00:00Z`)));
  }
});

test('drafts and scaffolds remain outside both source and manifest publication', () => {
  assert.equal(isPublishedBook({ data: { status: 'open' } }), true);
  assert.equal(isPublishedBook({ data: { status: 'draft', scaffold: false } }), false);
  assert.equal(isPublishedBook({ data: { status: 'open', scaffold: true } }), false);
  assert.equal(isPublishedBook({ status: 'draft' }), false);
  assert.equal(isPublishedBook({ status: 'open', scaffold: false }), true);
});

test('public copy removes development artifacts while retaining scientific data and licenses', () => {
  for (const relative of [
    'water/workbench-v8/README.md', 'water/workbench-v10-1/app/index.html',
    'water/prototype.html', 'water/water-prototype.js', 'water/water-prototype.css',
    'water/workbench-v10-2/tests/ui.test.mjs', 'water/workbench-v10-2/README.md',
    'play/swath/smoke.test.mjs',
  ]) assert.equal(isPublicSitePath(relative), false, relative);
  for (const relative of [
    'water/workbench-v10-2/app/index.html', 'water/shared/measured-sensor-response.js',
    'water/data/SOURCES.md', 'water/shared/srf/UPSTREAM-PROSAIL-GPL3.txt',
    'THIRD_PARTY_LICENSES.md', 'THIRD_PARTY_LICENSES/d3.LICENSE',
  ]) assert.equal(isPublicSitePath(relative), true, relative);
});

test('draft compatibility pages explain the unpublished state without indexing or running record renderers', () => {
  const html = draftBookCompatibilityPage({ text: { en: { title: '<script>draft</script>' } } });
  assert.equal(hasNoindex(html), true);
  assert.ok(html.includes('Reading response not published'));
  assert.ok(html.includes('&lt;script&gt;draft&lt;/script&gt;'));
  assert.ok(html.includes('/elsewhere.html#e02'));
  assert.equal(html.includes('app.js'), false);
  assert.equal(hasNoindex('<meta content="NOINDEX, follow" name="robots">'), true);
  assert.equal(hasNoindex('<meta name="robots" content="index,follow">'), false);
});

test('SEO defaults preserve authored values and replace empty metadata without duplicates', () => {
  const input = '<html><head><title>Light</title><meta content="Specific optical experiment" name="description"><meta name="twitter:description" content=""><link href="https://example.test/light" rel="canonical"></head></html>';
  const defaults = '<meta name="description" content="Generic"><meta property="og:description" content="Generic OG"><meta name="twitter:description" content="Generic Twitter"><link rel="canonical" href="https://example.test/default">';
  const output = fillMissingSeo(input, defaults);
  assert.ok(output.includes('Specific optical experiment'));
  assert.ok(output.includes('https://example.test/light'));
  assert.equal(output.includes('https://example.test/default'), false);
  assert.equal((output.match(/name="description"/g) || []).length, 1);
  assert.equal((output.match(/name="twitter:description"/g) || []).length, 1);
  assert.ok(output.includes('Generic OG'));
  assert.ok(output.includes('Generic Twitter'));
  assert.equal(fillMissingSeo(output, defaults), output);
});

test('shared stylesheet splitting preserves query strings and unrelated stylesheets', () => {
  const output = rewriteSharedStylesheet('<link href="styles.css?v=abc"><link href=\'/styles.css?release=2#main\'><link href="instrument.css?v=abc">');
  assert.equal(output, '<link href="/styles.base.css?v=abc"><link href=\'/styles.base.css?release=2#main\'><link href="instrument.css?v=abc">');
});

test('article content and first-view navigation remain immediate while archive enhancements keep their order', () => {
  const body = '<main><article><h1>A readable article</h1><p>Source prose.</p></article></main>';
  const input = `<script src="/ux-preinit.js?v=1"></script>${body}<script src="content.js"></script><script src="archive-content.js?v=2"></script><script src="core/site-model.js"></script><script src="app.js"></script><script src="/ux-refinements.js"></script>`;
  const output = deferArticleRuntime(input);
  assert.ok(output.includes(body));
  assert.ok(output.includes('<script src="/ux-preinit.js?v=1"></script>'));
  assert.ok(output.includes('<script src="/ux-refinements.js"></script>'));
  assert.deepEqual([...output.matchAll(/data-idle-src="([^"]+)"/g)].map(match => match[1]), ['content.js', 'archive-content.js?v=2', 'core/site-model.js', 'app.js']);
});

test('old Water URLs retain search and fragment when they open the current workspace', () => {
  const html = waterCompatibilityPage();
  assert.equal(hasNoindex(html), true);
  let destination;
  const location = { href: 'https://geogeeklab.github.io/water/workbench-v8/app/?case=coast#analysis', search: '?case=coast', hash: '#analysis', replace: value => { destination = value; } };
  vm.runInNewContext(/<script>([\s\S]*?)<\/script>/.exec(html)[1], { URL, location });
  assert.equal(destination, 'https://geogeeklab.github.io/water/workbench-v10-2/app/?case=coast#analysis');
});

test('lazy data attributes and inline code never activate an article script', () => {
  const inactive = '<script data-src="app.js"></script><script data-idle-src="core/site-model.js"></script><script title=\'src="archive-content.js"\'></script>';
  assert.equal(deferArticleRuntime(inactive), inactive);
  const inline = '<script>const example = \'<script src="app.js">\';</script>';
  assert.equal(deferArticleRuntime(inline), inline);
  const comment = '<!-- <script src="app.js"></script> -->';
  assert.equal(deferArticleRuntime(comment), comment);
  const typed = '<script type="application/json" src="app.js"></script><script type="module" src="app.js"></script>';
  assert.equal(deferArticleRuntime(typed), typed);
});

test('article deferral reads only a real src and preserves other attributes and whitespace', () => {
  const input = '<script data-src="/app.js" nonce="source-nonce" SRC = \'./core/site-model.js?v=2&amp;trace=1\' defer></script>';
  assert.equal(deferArticleRuntime(input), '<script data-src="/app.js" nonce="source-nonce" data-idle-src = \'./core/site-model.js?v=2&amp;trace=1\' defer></script>');
  assert.equal(deferArticleRuntime('<script src = app.js></script>'), '<script data-idle-src = app.js></script>');
});

test('noindex detection ignores data attributes, comments, and script strings', () => {
  for (const html of [
    '<meta data-name="robots" content="noindex">',
    '<meta name="robots" data-content="noindex">',
    '<meta data-name="robots" data-content="noindex">',
    '<meta title=\'name="robots" content="noindex"\'>',
    '<!-- <meta name="robots" content="noindex"> -->',
    '<script>const example=\'<meta name="robots" content="noindex">\';</script>',
  ]) assert.equal(hasNoindex(html), false, html);
  assert.equal(hasNoindex('<meta NAME = "robots" CONTENT = "noindex,follow">'), true);
  assert.equal(hasNoindex('<meta name = robots content = noindex>'), true);
});

test('SEO defaults require real attributes and handle valid spaced or unquoted values', () => {
  const input = '<head><meta data-name="description" data-content="Tracking"><meta NAME = description CONTENT = "Authored > default"><link data-rel="canonical" data-href="/tracking"><script data-type="application/ld+json">{"tracking":true}</script></head>';
  const defaults = '<meta name="description" content="Default"><link rel="canonical" href="https://example.test/current"><script type="application/ld+json">{"@type":"WebSite"}</script>';
  const output = fillMissingSeo(input, defaults);
  assert.ok(output.includes('CONTENT = "Authored > default"'));
  assert.equal(output.includes('content="Default"'), false);
  assert.ok(output.includes('href="https://example.test/current"'));
  assert.ok(output.includes('{"@type":"WebSite"}'));
  assert.equal(fillMissingSeo(output, defaults), output);
  const fakeDescription = fillMissingSeo('<head><meta data-name="description" data-content="Tracking"></head>', '<meta name="description" content="Real">');
  assert.ok(fakeDescription.includes('<meta name="description" content="Real">'));
});

test('stylesheet rewriting uses only real link href attributes', () => {
  const input = '<link data-href="styles.css?v=tracking" href = "/styles.css?v=real#view"><script>const example=\'<link href="styles.css">\';</script><!-- <link href="styles.css"> -->';
  const expected = '<link data-href="styles.css?v=tracking" href = "/styles.base.css?v=real#view"><script>const example=\'<link href="styles.css">\';</script><!-- <link href="styles.css"> -->';
  assert.equal(rewriteSharedStylesheet(input), expected);
});

test('the query-based record preview stays outside search discovery', async () => {
  const shell = await readFile(new URL('../../site/record.html', import.meta.url), 'utf8');
  assert.equal(hasNoindex(shell), true);
  assert.ok(shell.includes('core/site-model.js'), 'the preview remains available to record navigation');
});

test('LISTENING shares the authored title and description without generic fallback or double escaping', async () => {
  const template = await readFile(new URL('../../templates/elsewhere-listening.html', import.meta.url), 'utf8');
  const title = 'An authored &amp; attributed title';
  const description = 'A specific &quot;listening&quot; note &amp; source.';
  const page = template.replaceAll('{{TITLE}}', title).replaceAll('{{DESCRIPTION}}', description);
  const generic = '<meta name="description" content="Generic Elsewhere"><meta property="og:title" content="Generic title"><meta property="og:description" content="Generic sharing"><meta name="twitter:title" content="Generic title"><meta name="twitter:description" content="Generic sharing">';
  const result = fillMissingSeo(page, generic);
  for (const tag of [
    `<meta name="description" content="${description}"/>`,
    `<meta property="og:title" content="${title} — GeoGeek"/>`,
    `<meta property="og:description" content="${description}"/>`,
    `<meta name="twitter:title" content="${title} — GeoGeek"/>`,
    `<meta name="twitter:description" content="${description}"/>`,
  ]) assert.ok(result.includes(tag), tag);
  assert.equal(result.includes('Generic sharing'), false);
  assert.equal(result.includes('&amp;amp;'), false);
  assert.equal(result.includes('&amp;quot;'), false);
});
