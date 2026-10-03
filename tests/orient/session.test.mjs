import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-geometry.js');
await import('../../site/play/orient/orient-content.js');
await import('../../site/play/orient/orient-session.js');

const model = globalThis.GeoPlay.orient.contentModel;
const session = globalThis.GeoPlay.orient.session;
const places = JSON.parse(fs.readFileSync(new URL('../../site/play/orient/data/places.v1.json', import.meta.url), 'utf8'));
const relations = model.buildRelationArtifact(places);
const relationIds = new Set(relations.relations.map(relation => relation.id));

function compose(seed, recentRelationIds = []) {
  return session.composeSession({ seed, placeArtifact: places, relationArtifact: relations, recentRelationIds });
}

function composeFresh(seed, recentRelationIds = []) {
  return session.composeFreshSession({ seed, placeArtifact: places, relationArtifact: relations, recentRelationIds });
}

function assertSessionContract(plan) {
  assert.equal(plan.version, 'orient-session-1');
  assert.equal(plan.contentVersion, 'orient-content-1');
  assert.equal(plan.trials.length, 4);
  assert.deepEqual(plan.trials.map(trial => trial.role), ['orientation', 'baseline', 'contrast', 'challenge']);
  assert.equal(new Set(plan.trials.map(trial => trial.relationId)).size, 4);
  for (const trial of plan.trials) {
    assert.ok(relationIds.has(trial.relationId));
    assert.ok(Number.isFinite(trial.difficulty.distance));
    assert.ok(Number.isFinite(trial.difficulty.bearing));
    assert.ok(Number.isFinite(trial.difficulty.overall));
  }
  const [t1, t2, t3] = plan.trials;
  assert.deepEqual(t1.conditions, { coast: true, graticule: false, rings: true });
  assert.deepEqual(t2.conditions, { coast: true, graticule: false, rings: false });
  assert.deepEqual(t3.conditions, { coast: false, graticule: false, rings: false });
  assert.equal(session.isCoreMatched(t2.relation, t3.relation), true);
  const conditionChanges = Object.keys(t2.conditions).filter(key => t2.conditions[key] !== t3.conditions[key]);
  assert.deepEqual(conditionChanges, ['coast']);
}

test('session composer freezes v1 roles, constraints and deterministic seed behavior', () => {
  assert.equal(session.SESSION_SIZE, 4);
  assert.equal(session.CORE_MATCH_MAX_DISTANCE_RATIO, 0.15);
  assert.equal(session.CORE_MATCH_MIN_BEARING_SEPARATION_DEG, 60);
  const first = compose('contract-seed');
  const second = compose('contract-seed');
  assert.deepEqual(first, second);
  assertSessionContract(first);
});

test('trial-level cue demand is separate from static relation difficulty', () => {
  const relation = relations.relations.find(item => item.id === 'paris__vancouver');
  const supported = session.cueDifficulty(relation, { coast: true, rings: true });
  const noRings = session.cueDifficulty(relation, { coast: true, rings: false });
  const noCues = session.cueDifficulty(relation, { coast: false, rings: false });
  assert.equal(noRings.distance, Math.min(1, supported.distance + 0.30));
  assert.equal(noRings.bearing, supported.bearing);
  assert.equal(noCues.bearing, Math.min(1, supported.bearing + 0.20));
  assert.equal('cue' in relation.difficulty, false);
});

test('direct recent filtering avoids the preceding session when the pool can do so', () => {
  const first = compose('cooldown-seed');
  const recent = first.trials.map(trial => trial.relationId);
  const second = compose('cooldown-seed', recent);
  assertSessionContract(second);
  assert.equal(second.historyApplied, true);
  assert.deepEqual(second.trials.filter(trial => recent.includes(trial.relationId)), []);
});

test('runtime cooldown reseeds until fresh while final seed remains independently reproducible', () => {
  const first = compose('fresh-contract');
  const recent = first.trials.map(trial => trial.relationId);
  const fresh = composeFresh('fresh-contract', recent);
  assertSessionContract(fresh);
  assert.equal(fresh.historyApplied, true);
  assert.ok(fresh.cooldownReseeds >= 1);
  assert.deepEqual(fresh.trials.filter(trial => recent.includes(trial.relationId)), []);
  const reproduced = compose(fresh.seed);
  assert.deepEqual(reproduced.trials, fresh.trials);
});

test('10,000 seeded sessions remain valid, matched and meaningfully varied', () => {
  const uniqueBySlot = [new Set(), new Set(), new Set(), new Set()];
  for (let index = 0; index < 10_000; index += 1) {
    const plan = compose(`qa-${index}`);
    assertSessionContract(plan);
    plan.trials.forEach((trial, slot) => uniqueBySlot[slot].add(trial.relationId));
  }
  assert.ok(uniqueBySlot[0].size >= 20, `orientation diversity too low: ${uniqueBySlot[0].size}`);
  assert.ok(uniqueBySlot[1].size >= 40, `baseline diversity too low: ${uniqueBySlot[1].size}`);
  assert.ok(uniqueBySlot[2].size >= 40, `contrast diversity too low: ${uniqueBySlot[2].size}`);
  assert.ok(uniqueBySlot[3].size >= 60, `challenge diversity too low: ${uniqueBySlot[3].size}`);
});
