import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = relative => readFile(new URL(`../../${relative}`, import.meta.url), 'utf8');

test('BOOK runtime preserves the prerendered reading response after generic record rendering', async () => {
  const runtime = await read('site/core/book-unit.js');
  assert.match(runtime, /const prerenderedBookBody =/);
  assert.match(runtime, /else if \(prerenderedBookBody\) body\.innerHTML = prerenderedBookBody;/);
  assert.match(runtime, /detailLabel\.textContent = 'READING RESPONSE'/);
  assert.match(runtime, /setTimeout\(boot, 0\)/);
});

test('BOOK renderer loads after the generic app on static and preview record pages', async () => {
  for (const file of ['templates/elsewhere-book.html', 'site/record.html', 'site/elsewhere.html']) {
    const html = await read(file);
    const appIndex = html.indexOf('app.js?v=20260930g');
    const bookIndex = html.indexOf('core/book-unit.js?v=20261006a');
    assert.ok(appIndex >= 0, `${file} should load app.js`);
    assert.ok(bookIndex > appIndex, `${file} should load BOOK renderer after app.js`);
  }
});

test('Elsewhere BOOK collection is an expandable record index', async () => {
  const html = await read('site/elsewhere.html');
  const pageCss = await read('site/elsewhere-page.css');
  const bookCss = await read('site/book-unit.css');

  assert.match(html, /data-collection-entry="true"/);
  assert.match(html, /<strong>COLLECTIONS<\/strong> \/ 03/);
  assert.match(pageCss, /elsewhere-entry\[data-collection-entry="true"\]/);
  assert.match(bookCss, /grid-template-columns:repeat\(auto-fill,minmax\(320px,1fr\)\)/);
  assert.match(bookCss, /\.book-record-page \.record-deck\{[\s\S]*max-width:none;/);
  assert.doesNotMatch(bookCss, /\.book-record-page \.record-deck\{[\s\S]*white-space:nowrap/);
});

test('production build materializes the BOOK index from the generated manifest', async () => {
  const build = await read('scripts/build.mjs');
  const materializer = await read('scripts/materialize-elsewhere-book-index.mjs');

  assert.match(build, /materialize-elsewhere-book-index\.mjs/);
  assert.match(materializer, /data', 'elsewhere-books\.json/);
  assert.match(materializer, /books\.map\(\(book, index\)/);
  assert.match(materializer, /records\/\$\{ref\.replace\(':', '-'\)\}\.html/);
  assert.match(materializer, /Elsewhere BOOK index placeholder not found/);
});

test('authored BOOK bodies are re-materialized after every generic postbuild transform', async () => {
  const build = await read('scripts/build.mjs');
  const finalMaterializer = await read('scripts/materialize-elsewhere-book-records.mjs');
  const visualIndex = build.indexOf("postbuild-visual-readiness.mjs");
  const bookBodyIndex = build.indexOf("materialize-elsewhere-book-records.mjs");

  assert.ok(visualIndex >= 0 && bookBodyIndex > visualIndex, 'BOOK body materialization must run after visual readiness as the final build transform');
  assert.match(finalMaterializer, /content', 'elsewhere', 'book/);
  assert.match(finalMaterializer, /setElementInner\(html, 'recordBody', body\)/);
  assert.match(finalMaterializer, /data-book-lang-panel="en"/);
  assert.match(finalMaterializer, /authored English prose missing after final materialization/);
});
