import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-state.js');

const stateModel = globalThis.GeoPlay.orient.state;
const { EVENTS, PHASES } = stateModel;

test('state reducer follows the legal judgment → commit → reveal → compare path', () => {
  let state = stateModel.createState({ totalTrials: 4, requireConfidence: false });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 4 });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0, totalTrials: 4 });
  assert.equal(state.phase, PHASES.JUDGE_EMPTY);
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 5000, bearingDeg: 90 } });
  assert.equal(state.phase, PHASES.READY);
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state.phase, PHASES.COMMIT);
  state = stateModel.reducer(state, { type: EVENTS.RECORD_COMMITTED, recordId: 's1:t1' });
  assert.equal(state.phase, PHASES.REVEAL);
  state = stateModel.reducer(state, { type: EVENTS.REVEAL_COMPLETED });
  assert.equal(state.phase, PHASES.COMPARE);
  state = stateModel.reducer(state, { type: EVENTS.NEXT_REQUESTED, trialIndex: 1 });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
  assert.equal(state.trialIndex, 1);
  assert.equal(state.judgment, null);
});

test('illegal commits are explicit no-ops', () => {
  let state = stateModel.createState({ totalTrials: 4 });
  const boot = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, boot);
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 4 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0 });
  const empty = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, empty);
});

test('confidence gate is already modeled for the next interaction milestone', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 4000, bearingDeg: 30 } });
  assert.equal(state.phase, PHASES.JUDGE_ACTIVE);
  const beforeCommit = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, beforeCommit);
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'high' });
  assert.equal(state.phase, PHASES.READY);
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state.phase, PHASES.COMMIT);
});

test('reset clears judgment and confidence without changing trial identity', () => {
  let state = stateModel.createState({ totalTrials: 4, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 4 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 2 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 7000, bearingDeg: 250 } });
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'low' });
  state = stateModel.reducer(state, { type: EVENTS.RESET });
  assert.equal(state.phase, PHASES.JUDGE_EMPTY);
  assert.equal(state.trialIndex, 2);
  assert.equal(state.judgment, null);
  assert.equal(state.confidence, null);
});
