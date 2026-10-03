import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');
await import('../../site/play/orient/orient-feedback.js');

const feedback = globalThis.GeoPlay.orient.feedback;

function record(overrides = {}) {
  return {
    version: 2,
    recordId: 'session:t1',
    trial: { slot: 1, adaptation: null },
    judgment: { distanceKm: 12_000, bearingDeg: 359, confidence: 'high' },
    relation: { distanceKm: 10_000, bearingDeg: 1 },
    residual: {
      distanceKm: 2_000,
      distanceRatio: 0.2,
      bearingDeg: -2,
      distanceClass: 'long',
      bearingClass: 'counterclockwise'
    },
    ...overrides
  };
}

test('distance feedback makes relative error primary and kilometres secondary', () => {
  const result = feedback.distanceFeedback(record());
  assert.equal(result.primary, '20% LONG');
  assert.equal(result.secondary, '+2,000 KM · RELATIVE DISTANCE');
  assert.equal(result.classification, 'long');
});

test('near distance and aligned bearing remain descriptive rather than scored', () => {
  const item = record({
    residual: {
      distanceKm: 180,
      distanceRatio: 0.018,
      bearingDeg: 2.4,
      distanceClass: 'near',
      bearingClass: 'aligned'
    }
  });
  assert.deepEqual(feedback.distanceFeedback(item), {
    primary: 'NEAR',
    secondary: '1.8% · +180 KM',
    classification: 'near'
  });
  assert.deepEqual(feedback.bearingFeedback(item), {
    primary: 'ALIGNED',
    secondary: '2.4° RESIDUAL',
    classification: 'aligned'
  });
});

test('bearing arc uses the shortest circular residual across north', () => {
  const arc = feedback.bearingArc({ cx: 400, cy: 400, radius: 72, truthBearingDeg: 1, judgmentBearingDeg: 359 });
  assert.equal(arc.deltaDeg, -2);
  assert.match(arc.path, /^M /);
  assert.ok(Number.isFinite(arc.start.x));
  assert.ok(Number.isFinite(arc.end.y));
});

test('distance residual segment decomposes range along the truth bearing', () => {
  const segment = feedback.distanceSegment({
    cx: 400,
    cy: 400,
    radius: 342,
    truthBearingDeg: 90,
    truthDistanceKm: 10_000,
    judgmentDistanceKm: 12_000
  });
  assert.ok(segment.judgmentRadius > segment.truthRadius);
  assert.ok(segment.judgmentAtTruthBearing.x > segment.truth.x);
  assert.ok(Math.abs(segment.truth.y - 400) < 1e-9);
});

test('final probe comparison reports evidence without claiming learning', () => {
  const records = [1, 2, 3, 4].map(slot => ({
    trial: { slot },
    residual: { distanceClass: slot === 4 ? 'short' : 'long', bearingClass: 'aligned' }
  }));
  const final = record({
    trial: { slot: 5, adaptation: { axis: 'distance', direction: 'long', mode: 'adaptation' } },
    residual: { distanceClass: 'near', bearingClass: 'aligned' }
  });
  assert.deepEqual(feedback.probeComparison(final, [...records, final]), {
    axis: 'distance',
    earlier: '3 / 4 LONG',
    final: 'NEAR',
    note: 'DESCRIPTIVE · NOT A LEARNING SCORE'
  });
});
