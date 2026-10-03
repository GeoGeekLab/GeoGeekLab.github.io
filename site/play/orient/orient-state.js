(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};

  const PHASES = Object.freeze({
    BOOT: 'boot',
    PRIMER: 'primer',
    LOADING_TRIAL: 'loading-trial',
    JUDGE_EMPTY: 'judge-empty',
    JUDGE_ACTIVE: 'judge-active',
    READY: 'ready',
    COMMIT: 'commit',
    REVEAL: 'reveal',
    COMPARE: 'compare',
    INSIGHT: 'insight',
    TRACE: 'trace',
    ERROR: 'error',
    DISPOSED: 'disposed'
  });

  const EVENTS = Object.freeze({
    SESSION_READY: 'SESSION_READY',
    PRIMER_REQUESTED: 'PRIMER_REQUESTED',
    PRIMER_COMPLETED: 'PRIMER_COMPLETED',
    TRIAL_LOADED: 'TRIAL_LOADED',
    TRIAL_REPLACED: 'TRIAL_REPLACED',
    JUDGMENT_CHANGED: 'JUDGMENT_CHANGED',
    CONFIDENCE_SELECTED: 'CONFIDENCE_SELECTED',
    RESET: 'RESET',
    COMMIT_REQUESTED: 'COMMIT_REQUESTED',
    RECORD_COMMITTED: 'RECORD_COMMITTED',
    REVEAL_COMPLETED: 'REVEAL_COMPLETED',
    NEXT_REQUESTED: 'NEXT_REQUESTED',
    INSIGHT_REQUESTED: 'INSIGHT_REQUESTED',
    TRACE_REQUESTED: 'TRACE_REQUESTED',
    ERROR: 'ERROR',
    RETRY: 'RETRY',
    DISPOSE: 'DISPOSE'
  });

  function createState({ totalTrials = 0, trialIndex = 0, requireConfidence = false } = {}) {
    return Object.freeze({
      phase: PHASES.BOOT,
      totalTrials: Math.max(0, Number(totalTrials) || 0),
      trialIndex: Math.max(0, Number(trialIndex) || 0),
      judgment: null,
      confidence: null,
      committedRecordId: null,
      requireConfidence: Boolean(requireConfidence),
      error: null
    });
  }

  function freezeState(state) {
    return Object.freeze({ ...state });
  }

  function readinessPhase(state, judgment = state.judgment, confidence = state.confidence) {
    if (!judgment) return PHASES.JUDGE_EMPTY;
    if (state.requireConfidence && !confidence) return PHASES.JUDGE_ACTIVE;
    return PHASES.READY;
  }

  function reducer(state, event = {}) {
    if (!state || state.phase === PHASES.DISPOSED) return state;
    const type = event.type;

    if (type === EVENTS.ERROR) {
      return freezeState({ ...state, phase: PHASES.ERROR, error: event.error || 'unknown' });
    }
    if (type === EVENTS.DISPOSE) {
      return freezeState({ ...state, phase: PHASES.DISPOSED, judgment: null, confidence: null });
    }
    if (type === EVENTS.RETRY && state.phase === PHASES.ERROR) {
      return freezeState({ ...state, phase: PHASES.LOADING_TRIAL, error: null });
    }

    switch (type) {
      case EVENTS.SESSION_READY:
        if (![PHASES.BOOT, PHASES.TRACE, PHASES.LOADING_TRIAL].includes(state.phase)) return state;
        return freezeState({
          ...state,
          phase: PHASES.LOADING_TRIAL,
          totalTrials: Math.max(0, Number(event.totalTrials) || state.totalTrials),
          trialIndex: Math.max(0, Number(event.trialIndex) || 0),
          judgment: null,
          confidence: null,
          committedRecordId: null,
          error: null
        });

      case EVENTS.PRIMER_REQUESTED:
        if (state.phase !== PHASES.LOADING_TRIAL) return state;
        return freezeState({ ...state, phase: PHASES.PRIMER, judgment: null, confidence: null });

      case EVENTS.PRIMER_COMPLETED:
        if (state.phase !== PHASES.PRIMER) return state;
        return freezeState({ ...state, phase: PHASES.LOADING_TRIAL, judgment: null, confidence: null });

      case EVENTS.TRIAL_LOADED:
        if (![PHASES.BOOT, PHASES.LOADING_TRIAL, PHASES.COMPARE, PHASES.INSIGHT].includes(state.phase)) return state;
        return freezeState({
          ...state,
          phase: PHASES.JUDGE_EMPTY,
          trialIndex: Math.max(0, Number(event.trialIndex) || 0),
          totalTrials: Math.max(0, Number(event.totalTrials) || state.totalTrials),
          judgment: null,
          confidence: null,
          committedRecordId: null,
          error: null
        });

      case EVENTS.TRIAL_REPLACED:
        if (![PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(state.phase)) return state;
        return freezeState({ ...state, phase: PHASES.LOADING_TRIAL, judgment: null, confidence: null, committedRecordId: null });

      case EVENTS.JUDGMENT_CHANGED:
        if (![PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(state.phase)) return state;
        if (!event.judgment) return state;
        return freezeState({
          ...state,
          judgment: event.judgment,
          confidence: null,
          phase: readinessPhase(state, event.judgment, null)
        });

      case EVENTS.CONFIDENCE_SELECTED:
        if (![PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(state.phase)) return state;
        if (!['low', 'medium', 'high'].includes(event.confidence)) return state;
        return freezeState({
          ...state,
          confidence: event.confidence,
          phase: readinessPhase(state, state.judgment, event.confidence)
        });

      case EVENTS.RESET:
        if (![PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(state.phase)) return state;
        return freezeState({ ...state, phase: PHASES.JUDGE_EMPTY, judgment: null, confidence: null, committedRecordId: null });

      case EVENTS.COMMIT_REQUESTED:
        if (state.phase !== PHASES.READY || !state.judgment) return state;
        if (state.requireConfidence && !state.confidence) return state;
        return freezeState({ ...state, phase: PHASES.COMMIT });

      case EVENTS.RECORD_COMMITTED:
        if (state.phase !== PHASES.COMMIT || !event.recordId) return state;
        return freezeState({ ...state, phase: PHASES.REVEAL, committedRecordId: event.recordId });

      case EVENTS.REVEAL_COMPLETED:
        if (state.phase !== PHASES.REVEAL) return state;
        return freezeState({ ...state, phase: PHASES.COMPARE });

      case EVENTS.NEXT_REQUESTED:
        if (![PHASES.COMPARE, PHASES.INSIGHT].includes(state.phase)) return state;
        return freezeState({
          ...state,
          phase: PHASES.LOADING_TRIAL,
          trialIndex: Math.max(0, Number(event.trialIndex) || state.trialIndex + 1),
          judgment: null,
          confidence: null,
          committedRecordId: null
        });

      case EVENTS.INSIGHT_REQUESTED:
        if (state.phase !== PHASES.COMPARE) return state;
        return freezeState({ ...state, phase: PHASES.INSIGHT });

      case EVENTS.TRACE_REQUESTED:
        if (![PHASES.COMPARE, PHASES.INSIGHT].includes(state.phase) && !event.recovered) return state;
        if (event.recovered && ![PHASES.BOOT, PHASES.LOADING_TRIAL, PHASES.COMPARE, PHASES.INSIGHT].includes(state.phase)) return state;
        return freezeState({ ...state, phase: PHASES.TRACE, judgment: null, confidence: null });

      default:
        return state;
    }
  }

  function createMachine(options = {}) {
    let state = createState(options);
    const listeners = new Set();
    const notify = (previous, event) => {
      if (state === previous) return;
      for (const listener of listeners) listener(state, previous, event);
    };
    return Object.freeze({
      get state() { return state; },
      dispatch(event) {
        const previous = state;
        state = reducer(state, event);
        notify(previous, event);
        return state;
      },
      subscribe(listener) {
        if (typeof listener !== 'function') return () => {};
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    });
  }

  orient.state = Object.freeze({ PHASES, EVENTS, createState, reducer, createMachine });
})();
