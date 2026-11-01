import test from 'node:test';
import assert from 'node:assert/strict';
import { DATASET_BY_ID, sha256, validatePayload } from '../../scripts/data-supply-lib.mjs';
import { primeFromLive, validatePrimeSnapshot } from '../../scripts/prime-data-supply-from-live.mjs';

const orbit = DATASET_BY_ID.get('orbit-active');
const volcanoes = DATASET_BY_ID.get('smithsonian-volcanoes');
const oldOrbit = Array.from({ length:5000 }, (_, i) => ({
  NORAD_CAT_ID:i + 1, OBJECT_NAME:`Satellite ${i + 1}`, EPOCH:'2000-01-01T00:00:00Z',
  MEAN_MOTION:15, ECCENTRICITY:0.01, INCLINATION:30,
}));
const raw = JSON.stringify(oldOrbit); // Intentionally no final newline.
const meta = { supplyId:orbit.id, fetchedAt:'2000-01-01T01:00:00Z', sha256:sha256(raw), recordCount:5000 };
const logger = { log() {}, warn() {} };

test('an intact old published snapshot can seed recovery, while fresh-payload validation rejects it', () => {
  assert.equal(validatePrimeSnapshot(orbit, raw, meta).recordCount, 5000);
  assert.throws(() => validatePayload(orbit, oldOrbit, meta), /Newest orbit epoch is unexpectedly old/);
});

test('recovery still rejects checksum, count, metadata identity and structural corruption', () => {
  assert.throws(() => validatePrimeSnapshot(orbit, raw + ' ', meta), /checksum/);
  assert.throws(() => validatePrimeSnapshot(orbit, raw, { ...meta, recordCount:4999 }), /recordCount mismatch/);
  assert.throws(() => validatePrimeSnapshot(orbit, raw, { ...meta, supplyId:'other' }), /supplyId mismatch/);
  const invalid = JSON.stringify(oldOrbit.map((record, i) => i === 1 ? { ...record, NORAD_CAT_ID:1 } : record));
  assert.throws(() => validatePrimeSnapshot(orbit, invalid, { ...meta, sha256:sha256(invalid) }), /Orbit record validation failed/);
});

test('recovery copies exactly the validated bytes and does not silently change the checksum', async () => {
  const writes = new Map();
  const result = await primeFromLive({
    snapshots:[orbit], references:[], logger, readLocal:async () => null,
    fetchImpl:async url => url.endsWith('.meta.json') ? Response.json(meta) : new Response(raw),
    write:async (file, content) => writes.set(file, content),
  });
  assert.equal(result[0].status, 'primed');
  const copied = [...writes].find(([file]) => file.endsWith('active.json'))?.[1];
  assert.equal(copied, raw);
  assert.equal(sha256(copied), meta.sha256);
});

test('a corrupt seed cannot write data or prevent the next dataset from priming', async () => {
  const payload = { type:'FeatureCollection', features:Array.from({ length:500 }, () => ({ geometry:{ type:'Point', coordinates:[1, 2] } })) };
  const volcanoRaw = JSON.stringify(payload);
  const volcanoMeta = { supplyId:volcanoes.id, fetchedAt:'2000-01-01T01:00:00Z', sha256:sha256(volcanoRaw), recordCount:500 };
  const writes = new Map();
  const result = await primeFromLive({
    snapshots:[orbit, volcanoes], references:[], logger, readLocal:async () => null,
    fetchImpl:async url => {
      if (url.includes('active.meta.json')) return Response.json(meta);
      if (url.includes('active.json')) return new Response('corrupt');
      return url.endsWith('.meta.json') ? Response.json(volcanoMeta) : new Response(volcanoRaw);
    },
    write:async (file, content) => writes.set(file, content),
  });
  assert.deepEqual(result.map(item => item.status), ['unavailable', 'primed']);
  assert.ok([...writes.keys()].every(file => !file.endsWith('active.json')));
});
