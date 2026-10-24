import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../site/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../../site/coordinates-field.css', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../site/coordinates-field.js', import.meta.url), 'utf8');
const start = html.indexOf('<section class="home-section coordinates-section');
const end = html.indexOf('<section class="home-section home-commons-full', start);
const coordinates = html.slice(start, end);

test('Coordinates presents the research identity and three practice dimensions', () => {
  assert.ok(start >= 0 && end > start);
  assert.match(coordinates, /<h2>Coordinates<\/h2>/);
  assert.match(coordinates, /<div class="coord-identity-copy">[\s\S]*?<h3>Research Engineer<\/h3>/);
  const dimensions = [
    ['METHOD', 'AI Native'],
    ['DOMAIN', 'Geospatial Engineering'],
    ['ETHOS', 'Open Science']
  ];
  for (const [axis, name] of dimensions) {
    assert.match(
      coordinates,
      new RegExp('<span class="coord-pillar-axis">\\d{2} / ' + axis + '</span><strong>' + name + '</strong>')
    );
  }
});

test('all four values have accessible interactive controls and defined content', () => {
  const values = ['open', 'taste', 'respect', 'respond'];
  assert.match(coordinates, /class="coord-atlas" data-active="open"/);
  assert.equal((coordinates.match(/<button\b[^>]*data-coord-value="/g) || []).length, 8);
  for (const name of values) {
    assert.ok(
      coordinates.includes('data-coord-value="' + name + '"'),
      'missing value button: ' + name
    );
    assert.match(
      coordinates,
      new RegExp('class="coord-point coord-point-' + name + '\\b')
    );
    assert.match(script, new RegExp('\\b' + name + ':\\s*\\{'));
  }
  assert.match(coordinates, /id="coordReadoutTitle">Open<\/h3>/);
  assert.match(coordinates, /id="coordReadoutLead">Share to connect\. Evolve in open\.<\/p>/);
  assert.match(script, /button\.addEventListener\('click'/);
  assert.match(script, /button\.addEventListener\('keydown'/);
  assert.match(script, /select\('open'\)/);
  assert.match(html, /<script src="\/coordinates-field\.js\?v=[^"]+"><\/script>/);
});

test('responsive coordinates layout and neighboring sections remain intact', () => {
  assert.match(css, /#now \.coord-atlas-layout/);
  assert.match(css, /@media\s*\(max-width:\s*780px\)/);
  assert.match(css, /grid-template-columns:\s*1fr/);
  assert.match(html, /AI Native · Geospatial Engineering · Open Science/);
  assert.match(html, /id="commonsMap"/);
  assert.equal((html.match(/<section\b/g) || []).length, (html.match(/<\/section>/g) || []).length);
});
