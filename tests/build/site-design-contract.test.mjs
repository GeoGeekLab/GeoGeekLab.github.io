import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePageDesign } from '../../scripts/site-design-contract.mjs';

test('navigation normalizes real local destinations and preserves external and data attributes', () => {
  const html = `<head></head><nav id = 'primaryNav'><a data-href="atlas.html" href = '/lab.html?release=old' aria-current="page">Old Lab</a><a href="https://other.example/lab.html">External</a></nav>`;
  const result = normalizePageDesign(html);
  assert.match(result, /data-href="atlas.html" href = '\/lab.html\?release=20261013a12' aria-current="page">Lab/);
  assert.match(result, /href="https:\/\/other.example\/lab.html">External/);
});
test('versioning respects base and refreshes existing design tokens without activating lazy scripts', () => {
  const html = `<head><base href="../../"><link rel="stylesheet" href="/design-tokens.css"><script data-idle-src="core/modules.js?v=old"></script></head>`;
  const result = normalizePageDesign(html, 'field-notes/example/index.html');
  assert.equal((result.match(/design-tokens.css/g) || []).length, 1);
  assert.match(result, /data-idle-src="\/core\/modules.js\?v=20261029-repair"/);
  assert.doesNotMatch(result, /<script\s+src=/);
  assert.match(result, /design-tokens.css\?v=20261029-repair/);
});
