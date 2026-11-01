import { createHash } from 'node:crypto';

// One release manifest serves capture, reuse, local QA and public smoke checks.
export const LAB_PREVIEW_KINDS = Object.freeze([
  'orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'water', 'swath',
  'locate', 'zone', 'path', 'project', 'light',
]);
export const LAB_PREVIEW_IMAGES = Object.freeze([...LAB_PREVIEW_KINDS.map(kind => `${kind}.jpg`), 'orbit.webp']);

export function validateLabPreviewImage(filename, bytes) {
  if (bytes.length < 8000) throw new Error(`${filename}: absent or less than 8 KiB`);
  const valid = filename.endsWith('.jpg')
    ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) throw new Error(`${filename}: invalid image signature`);
}

export function labPreviewCacheVersion(images) {
  const hash = createHash('sha256');
  for (const filename of LAB_PREVIEW_IMAGES) {
    const bytes = images.get(filename);
    if (!bytes) throw new Error(`${filename}: missing from the preview manifest`);
    validateLabPreviewImage(filename, bytes);
    hash.update(filename);
    hash.update(bytes);
  }
  return `capture-${hash.digest('hex').slice(0, 12)}`;
}

export function replaceLabPreviewVersion(source, version) {
  const pattern = /const VERSION = ['"][^'"]+['"];/;
  if (!pattern.test(source)) throw new Error('Lab preview runtime is missing the VERSION declaration.');
  return source.replace(pattern, `const VERSION = '${version}';`);
}

export function validateLabPreviewHtml(html, version) {
  for (const kind of LAB_PREVIEW_KINDS) {
    if (!html.includes(`data-real-preview="${kind}"`)) throw new Error(`lab.html: missing real card for ${kind}`);
    if (!html.includes(`/assets/lab/previews/${kind}.jpg?v=${version}`)) throw new Error(`lab.html: missing versioned image for ${kind}`);
    if (html.includes(`data-preview-fallback="${kind}"`)) throw new Error(`lab.html: fallback incorrectly shipped for ${kind}`);
  }
  if (!html.includes(`/assets/lab/previews/orbit.webp?v=${version}`)) throw new Error('lab.html: missing Orbit WebP source');
  if (html.includes('/assets/lab/previews/earth-observatory.jpg')) throw new Error('lab.html: stale Earth preview path');
}

export async function fetchLabPreviewImages(baseUrl, { fetchImpl = fetch } = {}) {
  const base = new URL(baseUrl.endsWith('/') ? baseUrl : baseUrl + '/');
  const pairs = await Promise.all(LAB_PREVIEW_IMAGES.map(async filename => {
    const url = new URL(`assets/lab/previews/${filename}`, base);
    const response = await fetchImpl(url.href, { cache:'no-store', signal:AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`${filename}: HTTP ${response.status}`);
    const expected = filename.endsWith('.jpg') ? 'image/jpeg' : 'image/webp';
    if (!(response.headers.get('content-type') || '').startsWith(expected)) throw new Error(`${filename}: unexpected content type`);
    const bytes = Buffer.from(await response.arrayBuffer());
    validateLabPreviewImage(filename, bytes);
    return [filename, bytes];
  }));
  return new Map(pairs);
}
