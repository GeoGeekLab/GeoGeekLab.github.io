import test from 'node:test';
import assert from 'node:assert/strict';

const R = 6371;

function approx(actual, expected, tolerance = 1e-9) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≉ ${expected} (tol ${tolerance})`);
}

// The browser implementation exposes GeoPlay.orient.geometry. These unit tests
// import the same source through a tiny window shim so geometry stays usable
// without a browser or a new bundler.
globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');

const {
  haversine,
  initialBearing,
  normalizeBearing,
  signedAngle,
  distanceRatio,
  distanceLogError,
  EARTH_RADIUS_KM,
  MAX_GREAT_CIRCLE_DISTANCE_KM,
} = globalThis.GeoPlay.orient.geometry;

test('geometry constants use the ORIENT spherical Earth model', () => {
  assert.equal(EARTH_RADIUS_KM, R);
  approx(MAX_GREAT_CIRCLE_DISTANCE_KM, Math.PI * R);
});

test('haversine returns zero for the same point', () => {
  approx(haversine([139.6503, 35.6762], [139.6503, 35.6762]), 0);
});

test('geometry accepts both [lon, lat] arrays and runtime {lon, lat} points', () => {
  const parisArray = [2.3522, 48.8566];
  const vancouverArray = [-123.1207, 49.2827];
  const parisObject = { lon: 2.3522, lat: 48.8566 };
  const vancouverObject = { lon: -123.1207, lat: 49.2827 };
  approx(haversine(parisArray, vancouverArray), haversine(parisObject, vancouverObject), 1e-9);
  approx(initialBearing(parisArray, vancouverArray), initialBearing(parisObject, vancouverObject), 1e-9);
});

test('haversine is symmetric', () => {
  const a = [2.3522, 48.8566];
  const b = [-123.1207, 49.2827];
  approx(haversine(a, b), haversine(b, a), 1e-9);
});

test('haversine matches quarter and half circumference on the equator', () => {
  approx(haversine([0, 0], [90, 0]), Math.PI * R / 2, 1e-9);
  approx(haversine([0, 0], [180, 0]), Math.PI * R, 1e-9);
});

test('released ORIENT relations retain the existing spherical-model values', () => {
  const cases = [
    [{ lon: 36.8219, lat: -1.2921 }, { lon: 106.8456, lat: -6.2088 }, 7783.9, 96.14],
    [{ lon: 2.3522, lat: 48.8566 }, { lon: -123.1207, lat: 49.2827 }, 7920.8, 325.87],
    [{ lon: 139.6503, lat: 35.6762 }, { lon: -77.0428, lat: -12.0464 }, 15495.3, 63.78],
  ];
  for (const [from, to, expectedDistance, expectedBearing] of cases) {
    approx(haversine(from, to), expectedDistance, 0.1);
    approx(initialBearing(from, to), expectedBearing, 0.01);
  }
});

test('initialBearing handles cardinal directions', () => {
  approx(initialBearing([0, 0], [0, 10]), 0, 1e-9);
  approx(initialBearing([0, 0], [10, 0]), 90, 1e-9);
  approx(initialBearing([0, 0], [0, -10]), 180, 1e-9);
  approx(initialBearing([0, 0], [-10, 0]), 270, 1e-9);
});

test('normalizeBearing always maps finite angles into [0, 360)', () => {
  for (const [input, expected] of [[0, 0], [360, 0], [-1, 359], [721, 1], [-721, 359]]) {
    approx(normalizeBearing(input), expected);
  }
});

test('signedAngle maps to [-180, 180) and crosses north correctly', () => {
  for (const [input, expected] of [[0, 0], [1, 1], [-1, -1], [179, 179], [180, -180], [181, -179], [359, -1], [360, 0], [540, -180]]) {
    approx(signedAngle(input), expected);
  }
  approx(signedAngle(359 - 1), -2);
  approx(signedAngle(1 - 359), 2);
});

test('distanceRatio keeps signed proportional error', () => {
  approx(distanceRatio(12000, 10000), 0.2);
  approx(distanceRatio(8000, 10000), -0.2);
});

test('distanceLogError is symmetric for doubling and halving', () => {
  approx(distanceLogError(20000, 10000), Math.log(2));
  approx(distanceLogError(5000, 10000), -Math.log(2));
});

test('distance helpers reject non-positive truth and log estimate distances', () => {
  assert.ok(Number.isNaN(distanceRatio(1000, 0)));
  assert.ok(Number.isNaN(distanceLogError(0, 1000)));
  assert.ok(Number.isNaN(distanceLogError(1000, 0)));
});
