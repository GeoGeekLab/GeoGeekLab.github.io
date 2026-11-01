import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { LAB_PREVIEW_KINDS, LAB_PREVIEW_IMAGES, fetchLabPreviewImages, labPreviewCacheVersion, validateLabPreviewHtml, validateLabPreviewImage } from '../../scripts/lab-preview-manifest.mjs';

function image(filename, fill = 0) {
  const bytes = Buffer.alloc(9000, fill);
  if (filename.endsWith('.jpg')) bytes.set([0xff, 0xd8, 0xff]);
  else { bytes.write('RIFF', 0); bytes.write('WEBP', 8); }
  return bytes;
}
const images = () => new Map(LAB_PREVIEW_IMAGES.map(filename => [filename, image(filename)]));

test('the preview manifest covers every live Lab instrument, including Water and Swath', () => {
  const context = { window:{} };
  vm.runInNewContext(fs.readFileSync(new URL('../../site/content.js', import.meta.url), 'utf8'), context);
  const active = context.window.GEOGEEK_ARCHIVE.records.filter(record => record.kind === 'lab' && record.data?.instrument).map(record => record.data.instrument);
  assert.deepEqual([...new Set(active)].sort(), [...LAB_PREVIEW_KINDS].sort());
  assert.equal(LAB_PREVIEW_KINDS.length, 13);
  assert.equal(LAB_PREVIEW_IMAGES.length, 14);
});

test('cache identity covers every image and is stable across download completion order', () => {
  const initial = images();
  const version = labPreviewCacheVersion(initial);
  assert.equal(labPreviewCacheVersion(new Map([...initial].reverse())), version);
  const changed = images();
  changed.set('swath.jpg', image('swath.jpg', 1));
  assert.notEqual(labPreviewCacheVersion(changed), version);
  changed.delete('water.jpg');
  assert.throws(() => labPreviewCacheVersion(changed), /water.jpg: missing/);
});

test('missing or invalid media fails the complete reuse batch before any caller receives it', async () => {
  await assert.rejects(fetchLabPreviewImages('https://example.test/', {
    fetchImpl:async url => url.endsWith('swath.jpg') ? new Response('', { status:404 }) : new Response(image(url), { headers:{ 'content-type':url.endsWith('.jpg') ? 'image/jpeg' : 'image/webp' } }),
  }), /swath.jpg: HTTP 404/);
  assert.throws(() => validateLabPreviewImage('water.jpg', Buffer.alloc(9000)), /invalid image signature/);
});

test('public HTML cannot claim the correct image set while omitting a card or using stale cache tokens', () => {
  const version = labPreviewCacheVersion(images());
  const html = LAB_PREVIEW_KINDS.map(kind => `<div data-real-preview="${kind}"><img src="/assets/lab/previews/${kind}.jpg?v=${version}"></div>`).join('') + `/assets/lab/previews/orbit.webp?v=${version}`;
  assert.doesNotThrow(() => validateLabPreviewHtml(html, version));
  assert.throws(() => validateLabPreviewHtml(html.replace('data-real-preview="swath"', ''), version), /missing real card for swath/);
  assert.throws(() => validateLabPreviewHtml(html.replace(`water.jpg?v=${version}`, 'water.jpg?v=old'), version), /missing versioned image for water/);
});
