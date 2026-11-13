import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizePageDesign } from '../../scripts/site-design-contract.mjs';
import { LAB_DOCUMENT_RELEASE, SITE_ASSET_RELEASE } from '../../scripts/site-release-contract.mjs';

test('navigation normalizes real local destinations and preserves external and data attributes', () => {
  const html = `<head></head><nav id = 'primaryNav'><a data-href="atlas.html" href = '/lab.html?release=old' aria-current="page">Old Lab</a><a href="https://other.example/lab.html">External</a></nav>`;
  const result = normalizePageDesign(html);
  assert.ok(result.includes(`data-href="atlas.html" href = '/lab.html?release=${LAB_DOCUMENT_RELEASE}' aria-current="page">Lab`));
  assert.match(result, /href="https:\/\/other\.example\/lab\.html">External/);
});

test('versioning respects base and refreshes existing design tokens without activating lazy scripts', () => {
  const html = `<head><base href="../../"><link rel="stylesheet" href="/design-tokens.css"><script data-idle-src="core/modules.js?v=old"></script></head>`;
  const result = normalizePageDesign(html, 'field-notes/example/index.html');
  assert.equal((result.match(/design-tokens\.css/g) || []).length, 1);
  assert.ok(result.includes(`data-idle-src="/core/modules.js?v=${SITE_ASSET_RELEASE}"`));
  assert.doesNotMatch(result, /<script\s+src=/);
  assert.ok(result.includes(`design-tokens.css?v=${SITE_ASSET_RELEASE}`));
});
