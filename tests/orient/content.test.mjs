import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Reuse the browser domain code directly; no parallel Node implementation.
globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');
await import('../../site/play/orient/orient-content.js');

const model = globalThis.GeoPlay.orient.contentModel;
const places = JSON.parse(fs.readFileSync(new URL('../../site/play/orient/data/places.v1.json', import.meta.url), 'utf8'));
const byId = new Map(places.places.map(place => [place.id, place]));

test('content versions and authored recognition demands are explicit', () => {
  assert.equal(model.CONTENT_VERSION, 'orient-content-1');
  assert.equal(model.DIFFICULTY_MODEL_VERSION, 'orient-difficulty-1');
  assert.deepEqual(model.RECOGNITION_DEMAND, { anchor: 0.15, common: 0.45, extended: 0.75 });
});

test('distance bands enforce the normal 2,500–16,500 km relation pool', () => {
  assert.equal(model.distanceBand(2499.9), null);
  assert.equal(model.distanceBand(2500), 'medium');
  assert.equal(model.distanceBand(4999.9), 'medium');
  assert.equal(model.distanceBand(5000), 'long');
  assert.equal(model.distanceBand(9000), 'very-long');
  assert.equal(model.distanceBand(13000), 'global');
  assert.equal(model.distanceBand(16500), 'global');
  assert.equal(model.distanceBand(16500.1), null);
});

test('bearing metadata uses eight sectors and the ±15° cardinal heuristic', () => {
  assert.equal(model.bearingSector(0), 'N');
  assert.equal(model.bearingSector(44), 'NE');
  assert.equal(model.bearingSector(91), 'E');
  assert.equal(model.bearingShape(15), 'cardinal');
  assert.equal(model.bearingShape(15.01), 'oblique');
  assert.equal(model.bearingShape(269), 'cardinal');
});

test('relation geometry preserves current released ORIENT truth values', () => {
  const cases = [
    ['nairobi', 'jakarta', 7783.9, 96.14],
    ['paris', 'vancouver', 7920.8, 325.87],
    ['tokyo', 'lima', 15495.3, 63.78],
  ];
  for (const [fromId, toId, distanceKm, bearingDeg] of cases) {
    const relation = model.buildRelation(byId.get(fromId), byId.get(toId));
    assert.equal(relation.geometry.distanceKm, distanceKm);
    assert.equal(relation.geometry.bearingDeg, bearingDeg);
  }
});

test('cue difficulty is not baked into static relation difficulty', () => {
  const relation = model.buildRelation(byId.get('paris'), byId.get('vancouver'));
  assert.ok(Number.isFinite(relation.difficulty.geometry));
  assert.ok(Number.isFinite(relation.difficulty.place));
  assert.ok(Number.isFinite(relation.difficulty.distanceBase));
  assert.ok(Number.isFinite(relation.difficulty.bearingBase));
  assert.equal('rings' in relation.difficulty, false);
  assert.equal('coast' in relation.difficulty, false);
  assert.equal('cue' in relation.difficulty, false);
});

test('buildRelationArtifact is deterministic and only emits eligible directed relations', () => {
  const first = model.buildRelationArtifact(places);
  const second = model.buildRelationArtifact(places);
  assert.deepEqual(first, second);
  assert.equal(first.sourcePlaceCount, 48);
  assert.equal(first.sourceDirectedPairCount, 2256);
  assert.ok(first.normalRelationCount > 1500);
  for (const relation of first.relations) {
    assert.notEqual(relation.from, relation.to);
    assert.ok(relation.geometry.distanceKm >= 2500 && relation.geometry.distanceKm <= 16500);
  }
});
