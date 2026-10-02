#!/usr/bin/env node
import assert from 'node:assert/strict';
import { DATA_SUPPLY_SCHEMA_VERSION, DATASET_BY_ID, snapshotDatasets, referenceDatasets, validatePayload, metadataFor } from './data-supply-lib.mjs';

assert.equal(DATA_SUPPLY_SCHEMA_VERSION, 2);
const pulse = DATASET_BY_ID.get('usgs-earthquakes-day');
const reference = DATASET_BY_ID.get('natural-earth-land-110m');
assert.equal(pulse?.mode, 'snapshot');
assert.equal(pulse?.fallback, 'last-known-good');
assert.match(pulse?.scope || '', /rolling past-24-hour/i);
assert.equal(pulse?.delivery, 'GeoGeek same-origin snapshot');
assert.ok(pulse?.freshnessSemantics?.includes('fetchedAt'));
assert.equal(reference?.mode, 'reference');
assert.equal(reference?.delivery, 'GeoGeek same-origin reference');
assert.ok(reference?.version?.includes('2024-01-24'));
assert.match(reference?.freshnessSemantics || '', /Version-pinned/i);
assert.ok(snapshotDatasets().some(dataset => dataset.id === pulse.id));
assert.ok(!snapshotDatasets().some(dataset => dataset.id === reference.id));
assert.ok(referenceDatasets().some(dataset => dataset.id === reference.id));

const generated = Date.parse('2026-10-02T02:00:00Z');
const features = Array.from({ length:12 }, (_, index) => ({
  type:'Feature',
  id:`test-${index}`,
  properties:{
    mag:index === 0 ? null : 2.1 + index / 10,
    place:`Fixture event ${index}`,
    time:generated - (index + 1) * 30 * 60 * 1000,
    updated:generated - index * 20 * 60 * 1000,
    status:index % 2 ? 'reviewed' : 'automatic',
  },
  geometry:{ type:'Point', coordinates:[-120 + index, 30 + index / 2, 5 + index] },
}));
const payload = {
  type:'FeatureCollection',
  metadata:{ generated, count:features.length, api:'fixture-1' },
  features,
};
const validation = validatePayload(pulse, payload);
assert.equal(validation.recordCount, features.length);
assert.equal(validation.providerCount, features.length);
assert.equal(validation.providerGeneratedAt, '2026-10-02T02:00:00.000Z');
assert.equal(validation.providerApiVersion, 'fixture-1');
assert.equal(validation.scopeDetail.duration, 'PT24H');
assert.ok(validation.eventTimeRange.oldest);
assert.ok(validation.eventUpdatedRange.newest);

const meta = metadataFor(
  pulse,
  payload,
  { headers:{ get:() => null } },
  validation,
  '2026-10-02T02:05:00.000Z',
  'fixture-sha',
  pulse.upstream,
);
assert.equal(meta.schemaVersion, 2);
assert.equal(meta.datasetLabel, pulse.dataset);
assert.equal(meta.delivery, pulse.delivery);
assert.equal(meta.transport, pulse.transport);
assert.equal(meta.providerGeneratedAt, validation.providerGeneratedAt);
assert.equal(meta.providerCount, features.length);
assert.equal(meta.refreshPolicy.lastKnownGoodOnFailure, true);
assert.equal(meta.scope, pulse.scope);
assert.equal(meta.scopeDetail.duration, 'PT24H');

const badCount = structuredClone(payload);
badCount.metadata.count += 1;
assert.throws(() => validatePayload(pulse, badCount), /count mismatch/);
const badCoord = structuredClone(payload);
badCoord.features[0].geometry.coordinates[0] = 240;
assert.throws(() => validatePayload(pulse, badCoord), /geometry\/depth validation/);

const refPayload = {
  type:'FeatureCollection',
  features:Array.from({ length:50 }, (_, index) => ({
    type:'Feature', properties:{ id:index },
    geometry:{ type:'Polygon', coordinates:[[[index / 10,0],[index / 10 + .05,0],[index / 10 + .05,.05],[index / 10,0]]] },
  })),
};
const refValidation = validatePayload(reference, refPayload);
assert.equal(refValidation.recordCount, 50);

console.log('Data supply contract tests passed: Pulse snapshot + Natural Earth reference under schema v2.');
