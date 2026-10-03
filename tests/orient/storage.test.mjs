import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-storage.js');

const storage = globalThis.GeoPlay.orient.storage;

function memoryStore() {
  const map = new Map();
  return {
    getItem: key => map.has(key) ? map.get(key) : null,
    setItem: (key, value) => map.set(key, String(value)),
    removeItem: key => map.delete(key),
    raw: map
  };
}

const plan = {
  version: 'orient-session-2',
  seed: 'storage-contract',
  targetSize: 5,
  contentVersion: 'orient-content-1',
  relationVersion: 'orient-content-1',
  difficultyModelVersion: 'orient-difficulty-1',
  adaptationStrategyVersion: 'orient-adaptation-1',
  historyApplied: true,
  fallback: false,
  trials: [
    { slot: 1, role: 'orientation', id: 'a__b', relationId: 'a__b', from: 'a', to: 'b', conditions: { coast: true, rings: true, graticule: false }, difficulty: { distance: .2 }, relation: { huge: 'derived relation should not persist' } },
    { slot: 2, role: 'baseline', id: 'a__c', relationId: 'a__c', from: 'a', to: 'c', conditions: { coast: true, rings: false, graticule: false }, difficulty: { distance: .4 } }
  ]
};

test('active session stores a compact planned descriptor and restores v2 metadata', () => {
  const store = memoryStore();
  const active = storage.createActiveSession({ plan, sessionId: 'or_contract', currentSlot: 1 });
  assert.equal(active.schemaVersion, 1);
  assert.equal(active.sessionSeed, 'storage-contract');
  assert.equal(active.plan.targetSize, 5);
  assert.equal(active.plan.adaptationStrategyVersion, 'orient-adaptation-1');
  assert.equal('relation' in active.plan.trials[0], false);
  assert.deepEqual(active.skippedRelationIds, []);
  assert.equal(storage.writeActive(active, store), true);
  const restored = storage.readActive(store);
  assert.equal(restored.sessionId, active.sessionId);
  assert.equal(restored.currentSlot, active.currentSlot);
  assert.deepEqual(restored.committedRecordIds, active.committedRecordIds);
  assert.deepEqual(restored.skippedRelationIds, []);
  assert.deepEqual(restored.plan, active.plan);
  assert.ok(Date.parse(restored.updatedAt) >= Date.parse(active.updatedAt));
});

test('commitActive advances only after a durable record id exists', () => {
  const store = memoryStore();
  const active = storage.createActiveSession({ plan, sessionId: 'or_contract' });
  storage.writeActive(active, store);
  assert.equal(storage.commitActive(active, { nextSlot: 2 }, store), null);
  const updated = storage.commitActive(active, { recordId: 'or_contract:t1', nextSlot: 2 }, store);
  assert.equal(updated.currentSlot, 2);
  assert.deepEqual(updated.committedRecordIds, ['or_contract:t1']);
  assert.deepEqual(storage.readActive(store).committedRecordIds, ['or_contract:t1']);
});

test('replaceActivePlan persists a replacement and records unfamiliar relation ids without creating evidence', () => {
  const store = memoryStore();
  const active = storage.createActiveSession({ plan, sessionId: 'or_contract' });
  storage.writeActive(active, store);
  const replacementPlan = {
    ...plan,
    trials: [
      { ...plan.trials[0], id: 'a__d', relationId: 'a__d', to: 'd' },
      plan.trials[1]
    ]
  };
  const updated = storage.replaceActivePlan(active, replacementPlan, { skippedRelationId: 'a__b' }, store);
  assert.equal(updated.plan.trials[0].relationId, 'a__d');
  assert.deepEqual(updated.skippedRelationIds, ['a__b']);
  assert.deepEqual(updated.committedRecordIds, []);
  const restored = storage.readActive(store);
  assert.equal(restored.plan.trials[0].relationId, 'a__d');
  assert.deepEqual(restored.skippedRelationIds, ['a__b']);
});

test('primer flag is explicit, local and versioned', () => {
  const store = memoryStore();
  assert.equal(storage.hasSeenPrimer(store), false);
  assert.equal(storage.markPrimerSeen(store), true);
  assert.equal(storage.hasSeenPrimer(store), true);
  const payload = JSON.parse(store.getItem(storage.PRIMER_KEY));
  assert.equal(payload.version, storage.PRIMER_VERSION);
  assert.equal(payload.seen, true);
});

test('corrupt active-session JSON degrades to no active session', () => {
  const store = memoryStore();
  store.setItem(storage.ACTIVE_KEY, '{broken');
  assert.equal(storage.readActive(store), null);
});

test('recent relation history remains bounded and deduplicated', () => {
  const store = memoryStore();
  storage.rememberRelation('a__b', store);
  storage.rememberRelation('c__d', store);
  storage.rememberRelation('a__b', store);
  assert.deepEqual(storage.readHistory(store), ['c__d', 'a__b']);
});

test('v1 trace normalization preserves unknown confidence instead of fabricating it', () => {
  const normalized = storage.normalizeTraceRecord({
    version: 1,
    play: 'orient',
    timestamp: '2026-10-03T00:00:00.000Z',
    trialId: 'tokyo-lima',
    relationId: 'tokyo-lima',
    session: { seed: 'legacy', slot: 3, role: 'challenge', contentVersion: 'fallback-release-pairs' },
    judgment: { distanceKm: 12000, bearingDeg: 70 },
    relation: { distanceKm: 15495, bearingDeg: 64 },
    result: { distanceResidualKm: -3495, distanceRatio: -0.2255, bearingResidualDeg: 6 }
  });
  assert.equal(normalized.legacy, true);
  assert.equal(normalized.sessionId, null);
  assert.equal(normalized.confidence, null);
  assert.equal(normalized.judgment.confidence, null);
  assert.equal(normalized.residual.distanceLogError, null);
});

test('v2 trace normalization and session lookup preserve explicit evidence', () => {
  const record = {
    version: 2,
    play: 'orient',
    recordId: 'or_1:t1',
    sessionId: 'or_1',
    sessionSeed: 'seed',
    judgment: { distanceKm: 5000, bearingDeg: 90, confidence: 'high', interaction: { primary: 'keyboard' } },
    trial: { slot: 1, role: 'orientation', relationId: 'a__b' },
    relation: { id: 'a__b', from: 'a', to: 'b', distanceKm: 6000, bearingDeg: 100 },
    residual: { distanceKm: -1000, distanceRatio: -1 / 6, distanceLogError: Math.log(5 / 6), bearingDeg: -10, distanceClass: 'short', bearingClass: 'counterclockwise' },
    conditions: { coast: true, rings: true, graticule: false, projection: 'azimuthal-equidistant' }
  };
  const normalized = storage.normalizeTraceRecord(record);
  assert.equal(normalized.legacy, false);
  assert.equal(normalized.sessionId, 'or_1');
  assert.equal(normalized.confidence, 'high');
  assert.equal(normalized.judgment.interaction.primary, 'keyboard');
  assert.deepEqual(storage.recordsForSession([record, { ...record, recordId: 'or_2:t1', sessionId: 'or_2' }], 'or_1').map(item => item.recordId), ['or_1:t1']);
});
