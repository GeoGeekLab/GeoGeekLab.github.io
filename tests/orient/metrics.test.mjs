import test from 'node:test';
import assert from 'node:assert/strict';

function approx(actual, expected, tolerance = 1e-12) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected} (tol ${tolerance})`);
}

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');
await import('../../site/play/orient/orient-config.js');
await import('../../site/play/orient/orient-metrics.js');

const { config, metrics } = globalThis.GeoPlay.orient;

test('interpretation config freezes the v1 product deadzones', () => {
  assert.equal(config.interpretation.distanceDeadzoneRatio, 0.05);
  assert.equal(config.interpretation.bearingDeadzoneDeg, 5);
  assert.ok(Object.isFrozen(config));
  assert.ok(Object.isFrozen(config.interpretation));
});

test('legacy Trace thresholds stay separate from per-trial interpretation', () => {
  assert.equal(config.legacyTrace.distanceBalancedRatio, 0.01);
  assert.equal(config.legacyTrace.bearingBalancedDeg, 1);
});

test('distance classification uses a strict ±5% NEAR deadzone', () => {
  assert.equal(metrics.classifyDistanceRatio(0), 'near');
  assert.equal(metrics.classifyDistanceRatio(0.049999), 'near');
  assert.equal(metrics.classifyDistanceRatio(-0.049999), 'near');
  assert.equal(metrics.classifyDistanceRatio(0.05), 'long');
  assert.equal(metrics.classifyDistanceRatio(-0.05), 'short');
});

test('bearing classification uses a strict ±5° ALIGNED deadzone', () => {
  assert.equal(metrics.classifyBearingResidual(0), 'aligned');
  assert.equal(metrics.classifyBearingResidual(4.999), 'aligned');
  assert.equal(metrics.classifyBearingResidual(-4.999), 'aligned');
  assert.equal(metrics.classifyBearingResidual(5), 'clockwise');
  assert.equal(metrics.classifyBearingResidual(-5), 'counterclockwise');
});

test('classifiers reject invalid values without inventing an interpretation', () => {
  assert.equal(metrics.classifyDistanceRatio(Number.NaN), 'unknown');
  assert.equal(metrics.classifyBearingResidual(Number.POSITIVE_INFINITY), 'unknown');
});

test('computeResidual returns absolute, proportional, log and angular residuals', () => {
  const result = metrics.computeResidual({
    estimateDistanceKm: 12000,
    estimateBearingDeg: 100,
    truthDistanceKm: 10000,
    truthBearingDeg: 90,
  });

  approx(result.distanceResidualKm, 2000);
  approx(result.distanceRatio, 0.2);
  approx(result.distanceLogError, Math.log(1.2));
  approx(result.bearingResidualDeg, 10);
  assert.equal(result.distanceClass, 'long');
  assert.equal(result.bearingClass, 'clockwise');
});

test('computeResidual handles bearing wrap-around before interpretation', () => {
  const result = metrics.computeResidual({
    estimateDistanceKm: 10499,
    estimateBearingDeg: 359,
    truthDistanceKm: 10000,
    truthBearingDeg: 1,
  });

  approx(result.distanceRatio, 0.0499);
  approx(result.bearingResidualDeg, -2);
  assert.equal(result.distanceClass, 'near');
  assert.equal(result.bearingClass, 'aligned');
});

test('custom deadzones can be supplied without changing global product config', () => {
  assert.equal(metrics.classifyDistanceRatio(0.02, 0.01), 'long');
  assert.equal(metrics.classifyBearingResidual(2, 1), 'clockwise');
  assert.equal(config.interpretation.distanceDeadzoneRatio, 0.05);
  assert.equal(config.interpretation.bearingDeadzoneDeg, 5);
});
