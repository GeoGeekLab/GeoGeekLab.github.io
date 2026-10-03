#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateRelationArtifact, serializeRelationArtifact } from './build-orient-relations.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const placesPath = path.join(root, 'site', 'play', 'orient', 'data', 'places.v1.json');
const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
const model = globalThis.GeoPlay.orient.contentModel;

const VALID_TIERS = new Set(['anchor', 'common', 'extended']);
const VALID_REGIONS = new Set([
  'north-america', 'south-america', 'europe', 'africa', 'west-central-asia',
  'south-asia', 'east-asia', 'southeast-asia', 'oceania',
]);

assert.equal(places.version, model.CONTENT_VERSION);
assert.equal(places.places.length, 48, 'v1 place pool must contain 48 places');

const ids = new Set();
const labels = new Set();
const tierCounts = new Map();
const regionCounts = new Map();
for (const place of places.places) {
  assert.match(place.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.ok(!ids.has(place.id), `duplicate place id ${place.id}`);
  assert.ok(!labels.has(place.label), `duplicate place label ${place.label}`);
  ids.add(place.id);
  labels.add(place.label);
  assert.ok(Number.isFinite(place.location?.lat) && place.location.lat >= -90 && place.location.lat <= 90, `invalid latitude for ${place.id}`);
  assert.ok(Number.isFinite(place.location?.lon) && place.location.lon >= -180 && place.location.lon <= 180, `invalid longitude for ${place.id}`);
  assert.ok(VALID_TIERS.has(place.content?.recognitionTier), `invalid recognition tier for ${place.id}`);
  assert.ok(VALID_REGIONS.has(place.geography?.region), `invalid region for ${place.id}`);
  assert.equal(place.content?.enabled, true, `${place.id} must be explicitly enabled in v1`);
  tierCounts.set(place.content.recognitionTier, (tierCounts.get(place.content.recognitionTier) || 0) + 1);
  regionCounts.set(place.geography.region, (regionCounts.get(place.geography.region) || 0) + 1);
}
assert.deepEqual(Object.fromEntries([...tierCounts].sort()), { anchor: 16, common: 24, extended: 8 });
assert.ok(Math.max(...regionCounts.values()) / places.places.length <= 0.30, 'one geographic region dominates the place pool');

// Preserve the six canonical points already used by the released three-trial ORIENT.
const canonicalReleasePoints = {
  nairobi: [-1.2921, 36.8219],
  jakarta: [-6.2088, 106.8456],
  paris: [48.8566, 2.3522],
  vancouver: [49.2827, -123.1207],
  tokyo: [35.6762, 139.6503],
  lima: [-12.0464, -77.0428],
};
for (const [id, [lat, lon]] of Object.entries(canonicalReleasePoints)) {
  const place = places.places.find(item => item.id === id);
  assert.ok(place, `missing released place ${id}`);
  assert.equal(place.location.lat, lat, `${id} latitude changed`);
  assert.equal(place.location.lon, lon, `${id} longitude changed`);
}

const artifact = generateRelationArtifact();
const artifactAgain = generateRelationArtifact();
assert.equal(serializeRelationArtifact(artifact), serializeRelationArtifact(artifactAgain), 'relation generation must be deterministic');
assert.equal(artifact.version, model.CONTENT_VERSION);
assert.equal(artifact.difficultyModelVersion, model.DIFFICULTY_MODEL_VERSION);
assert.equal(artifact.sourcePlaceCount, 48);
assert.equal(artifact.sourceDirectedPairCount, 48 * 47);
assert.ok(artifact.normalRelationCount > 1500, 'normal relation reservoir is unexpectedly small');
assert.equal(artifact.relations.length, artifact.normalRelationCount);

const relationIds = new Set();
const byFrom = new Map();
for (const relation of artifact.relations) {
  assert.ok(!relationIds.has(relation.id), `duplicate relation ${relation.id}`);
  relationIds.add(relation.id);
  assert.ok(ids.has(relation.from) && ids.has(relation.to) && relation.from !== relation.to, `invalid endpoints for ${relation.id}`);
  assert.ok(relation.geometry.distanceKm >= model.NORMAL_DISTANCE_MIN_KM && relation.geometry.distanceKm <= model.NORMAL_DISTANCE_MAX_KM, `distance eligibility failed for ${relation.id}`);
  assert.ok(relation.geometry.bearingDeg >= 0 && relation.geometry.bearingDeg < 360, `bearing range failed for ${relation.id}`);
  assert.ok(['medium', 'long', 'very-long', 'global'].includes(relation.geometry.distanceBand), `invalid band for ${relation.id}`);
  assert.ok(['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'].includes(relation.geometry.bearingSector), `invalid sector for ${relation.id}`);
  assert.ok(['cardinal', 'oblique'].includes(relation.geometry.bearingShape), `invalid bearing shape for ${relation.id}`);
  for (const [name, value] of Object.entries(relation.difficulty)) {
    assert.ok(Number.isFinite(value) && value >= 0 && value <= 1, `invalid ${name} difficulty for ${relation.id}`);
  }
  if (!byFrom.has(relation.from)) byFrom.set(relation.from, []);
  byFrom.get(relation.from).push(relation);
}

const releaseRelations = [
  ['nairobi__jakarta', 7783.9, 96.14],
  ['paris__vancouver', 7920.8, 325.87],
  ['tokyo__lima', 15495.3, 63.78],
];
for (const [id, distanceKm, bearingDeg] of releaseRelations) {
  const relation = artifact.relations.find(item => item.id === id);
  assert.ok(relation, `missing released relation ${id}`);
  assert.equal(relation.geometry.distanceKm, distanceKm, `${id} distance changed`);
  assert.equal(relation.geometry.bearingDeg, bearingDeg, `${id} bearing changed`);
}

const angleSeparation = (a, b) => Math.abs(globalThis.GeoPlay.orient.geometry.signedAngle(a - b));
let matchable = 0;
for (const relation of artifact.relations) {
  const candidates = (byFrom.get(relation.from) || []).filter(candidate => {
    if (candidate.to === relation.to) return false;
    if (candidate.geometry.distanceBand !== relation.geometry.distanceBand) return false;
    if (Math.abs(candidate.geometry.distanceKm - relation.geometry.distanceKm) / relation.geometry.distanceKm > 0.15) return false;
    return angleSeparation(candidate.geometry.bearingDeg, relation.geometry.bearingDeg) >= 60;
  });
  if (candidates.length >= 2) matchable += 1;
}
const matchableRatio = matchable / artifact.normalRelationCount;
assert.ok(matchableRatio >= 0.65, `matched-relation reservoir too sparse: ${(matchableRatio * 100).toFixed(1)}%`);

console.log(`ORIENT content QA: 48 places; ${artifact.normalRelationCount} normal relations; ${(matchableRatio * 100).toFixed(1)}% have >=2 core matched candidates.`);
