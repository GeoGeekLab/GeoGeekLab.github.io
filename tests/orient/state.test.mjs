import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../../site/play/orient/orient-state.js');

const stateModel = globalThis.GeoPlay.orient.state;
const { EVENTS, PHASES } = stateModel;

test('state reducer follows the legal confidence-gated judgment → commit → reveal → compare path', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0, totalTrials: 5 });
  assert.equal(state.phase, PHASES.JUDGE_EMPTY);
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 5000, bearingDeg: 90 } });
  assert.equal(state.phase, PHASES.JUDGE_ACTIVE);
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'medium' });
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
  assert.equal(state.confidence, null);
});

test('editing a judgment after confidence selection invalidates that confidence', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 5000, bearingDeg: 90 } });
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'high' });
  assert.equal(state.phase, PHASES.READY);
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 5250, bearingDeg: 92 } });
  assert.equal(state.phase, PHASES.JUDGE_ACTIVE);
  assert.equal(state.confidence, null);
  const blocked = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(blocked, state);
});

test('primer is an explicit non-judgment state and returns to trial loading', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.PRIMER_REQUESTED });
  assert.equal(state.phase, PHASES.PRIMER);
  const blocked = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 1, bearingDeg: 2 } });
  assert.equal(blocked, state);
  state = stateModel.reducer(state, { type: EVENTS.PRIMER_COMPLETED });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
});

test('illegal commits remain explicit no-ops before judgment and confidence', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  const boot = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, boot);
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 0 });
  const empty = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, empty);
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 4000, bearingDeg: 30 } });
  const noConfidence = state;
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  assert.equal(state, noConfidence);
});

test('trial replacement clears all uncommitted evidence but keeps the slot identity', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 2 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 7000, bearingDeg: 250 } });
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'high' });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_REPLACED });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
  assert.equal(state.trialIndex, 2);
  assert.equal(state.judgment, null);
  assert.equal(state.confidence, null);
});

test('session insight can transition into the fifth loading slot', () => {
  let state = stateModel.createState({ totalTrials: 5, trialIndex: 3, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5, trialIndex: 3 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 3 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 8000, bearingDeg: 120 } });
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'low' });
  state = stateModel.reducer(state, { type: EVENTS.COMMIT_REQUESTED });
  state = stateModel.reducer(state, { type: EVENTS.RECORD_COMMITTED, recordId: 's1:t4' });
  state = stateModel.reducer(state, { type: EVENTS.REVEAL_COMPLETED });
  state = stateModel.reducer(state, { type: EVENTS.INSIGHT_REQUESTED });
  assert.equal(state.phase, PHASES.INSIGHT);
  state = stateModel.reducer(state, { type: EVENTS.NEXT_REQUESTED, trialIndex: 4 });
  assert.equal(state.phase, PHASES.LOADING_TRIAL);
  assert.equal(state.trialIndex, 4);
});

test('reset clears judgment and confidence without changing trial identity', () => {
  let state = stateModel.createState({ totalTrials: 5, requireConfidence: true });
  state = stateModel.reducer(state, { type: EVENTS.SESSION_READY, totalTrials: 5 });
  state = stateModel.reducer(state, { type: EVENTS.TRIAL_LOADED, trialIndex: 2 });
  state = stateModel.reducer(state, { type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: 7000, bearingDeg: 250 } });
  state = stateModel.reducer(state, { type: EVENTS.CONFIDENCE_SELECTED, confidence: 'low' });
  state = stateModel.reducer(state, { type: EVENTS.RESET });
  assert.equal(state.phase, PHASES.JUDGE_EMPTY);
  assert.equal(state.trialIndex, 2);
  assert.equal(state.judgment, null);
  assert.equal(state.confidence, null);
});
