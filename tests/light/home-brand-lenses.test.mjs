import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../site/brand-coordinates.css', import.meta.url), 'utf8');
const start = html.indexOf('<section class="home-section coordinates-section');
const end = html.indexOf('<section class="home-section home-commons-full', start);
const coordinates = html.slice(start, end);

test('Coordinates presents the requested role and practice as static content', () => {
  assert.ok(start >= 0 && end > start);
  assert.match(coordinates, /<h2>Coordinates<\/h2>/);
  assert.match(coordinates, /<h3 class="coordinate-role">Research Engineer<\/h3>/);
  const practice = [
    '<strong>AI Native</strong><span> — Method</span>',
    '<strong>Geospatial Engineering</strong><span> — Domain</span>',
    '<strong>Open Science</strong><span> — Principle</span>'
  ];
  for (const value of practice) assert.ok(coordinates.includes(value), value);
});

test('all four values and exact user-provided statements are visible together', () => {
  const statements = [
    ['Open', 'Share to connect. Open to expand.'],
    ['Taste', 'Sense to define. Taste to guide.'],
    ['Respect', 'Stand to equal. Respect to endure.'],
    ['Respond', 'Act to answer. Build to account.']
  ];
  assert.equal((coordinates.match(/class="coordinate-static-value"/g) || []).length, 4);
  for (const [title, statement] of statements) {
    assert.ok(coordinates.includes('<h3>' + title + '</h3>'), title);
    assert.ok(coordinates.includes('<p>' + statement + '</p>'), statement);
  }
  assert.doesNotMatch(coordinates, /<button\b|data-value-trigger|aria-pressed|valueActive/);
  assert.doesNotMatch(html, /<script[^>]*brand-coordinates\.js/);
});

test('responsive static layout and neighboring sections remain intact', () => {
  assert.match(css, /coordinate-static-values/);
  assert.match(css, /@media \(max-width:640px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(html, /AI Native · Geospatial Engineering · Open Science/);
  assert.match(html, /id="commonsMap"/);
  assert.equal((html.match(/<section\b/g) || []).length, (html.match(/<\/section>/g) || []).length);
});
