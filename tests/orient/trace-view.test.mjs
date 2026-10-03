import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');
await import('../../site/play/orient/orient-feedback.js');
await import('../../site/play/orient/orient-trace-view.js');

const traceView = globalThis.GeoPlay.orient.traceView;

function makeRecord(slot, { distanceClass = 'long', distanceRatio = 0.12, bearingClass = 'clockwise', bearingDeg = 8, confidence = 'medium', coast = true, rings = false, role, adaptation = null } = {}) {
  const truthDistance = 8_000 + slot * 600;
  const truthBearing = 40 + slot * 22;
  return {
    version: 2,
    recordId: `session:t${slot}`,
    play: 'orient',
    sessionId: 'session',
    trial: { slot, role: role || ['orientation', 'baseline', 'contrast', 'challenge', 'adaptation'][slot - 1], adaptation },
    judgment: {
      distanceKm: truthDistance * (1 + distanceRatio),
      bearingDeg: truthBearing + bearingDeg,
      confidence
    },
    relation: { from: `from-${slot}`, to: `to-${slot}`, distanceKm: truthDistance, bearingDeg: truthBearing },
    residual: {
      distanceKm: truthDistance * distanceRatio,
      distanceRatio,
      bearingDeg,
      distanceClass,
      bearingClass
    },
    conditions: { coast, rings, graticule: false }
  };
}

function sessionRecords() {
  return [
    makeRecord(1, { distanceClass: 'long', distanceRatio: .18, bearingClass: 'clockwise', bearingDeg: 12, confidence: 'high' }),
    makeRecord(2, { distanceClass: 'long', distanceRatio: .14, bearingClass: 'aligned', bearingDeg: 2, confidence: 'medium', coast: true, role: 'baseline' }),
    makeRecord(3, { distanceClass: 'long', distanceRatio: .11, bearingClass: 'counterclockwise', bearingDeg: -9, confidence: 'low', coast: false, role: 'contrast' }),
    makeRecord(4, { distanceClass: 'short', distanceRatio: -.09, bearingClass: 'clockwise', bearingDeg: 7, confidence: 'high', role: 'challenge' }),
    makeRecord(5, { distanceClass: 'near', distanceRatio: .02, bearingClass: 'aligned', bearingDeg: 3, confidence: 'medium', role: 'adaptation', adaptation: { axis: 'distance', direction: 'long', mode: 'adaptation' } })
  ];
}

test('Spatial Trace keeps five individual records before deriving session observations', () => {
  const model = traceView.buildModel(sessionRecords());
  assert.equal(model.records.length, 5);
  assert.equal(model.relationCount, 5);
  assert.equal(model.observation.distance, '3 OF 5 DISTANCE ESTIMATES WERE LONG');
  assert.equal(model.observation.bearing, '2 CLOCKWISE · 1 COUNTERCLOCKWISE · 2 ALIGNED');
});

test('confidence note stays descriptive and identifies high-confidence residual context', () => {
  const note = traceView.confidenceNote(sessionRecords());
  assert.match(note.headline, /HIGH CONFIDENCE/);
  assert.match(note.detail, /2 of 5 judgments were high confidence/i);
  assert.doesNotMatch(`${note.headline} ${note.detail}`, /OVERCONFIDENT|ABILITY|SCORE/i);
});

test('contrast summary reports the single cue change without causal language', () => {
  const contrast = traceView.contrastSummary(sessionRecords());
  assert.equal(contrast.changed, 'COAST');
  assert.equal(contrast.baseline.distance, '14% LONG');
  assert.equal(contrast.contrast.distance, '11% LONG');
  assert.match(contrast.note, /NOT A CAUSAL EFFECT/);
});

test('final probe summary uses evidence counts and avoids a learning score', () => {
  const probe = traceView.probeSummary(sessionRecords());
  assert.deepEqual(probe, {
    axis: 'distance',
    earlier: '3 / 4 LONG',
    final: 'NEAR',
    note: 'DESCRIPTIVE · NOT A LEARNING SCORE'
  });
});

test('residual map uses fixed documented axes and one numbered point per record', () => {
  const svg = traceView.residualMap(sessionRecords());
  assert.match(svg, /CCW/);
  assert.match(svg, /CW/);
  assert.match(svg, /LONG/);
  assert.match(svg, /SHORT/);
  assert.equal((svg.match(/orient-trace-map-point/g) || []).length, 5);
});
