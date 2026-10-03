(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};

  const ACTIVE_KEY = 'geogeek.orient.active.v1';
  const HISTORY_KEY = 'geogeek.play.orient.history.v1';
  const HISTORY_VERSION = 'orient-history-1';
  const ACTIVE_SCHEMA_VERSION = 1;
  const HISTORY_LIMIT = 32;

  function resolveStore(store) {
    if (store) return store;
    try { return window.localStorage || null; } catch (_) { return null; }
  }

  function readJson(key, fallback, store) {
    const target = resolveStore(store);
    if (!target) return fallback;
    try {
      const raw = target.getItem(key);
      if (!raw) return fallback;
      return JSON.parse(raw);
    } catch (_) {
      return fallback;
    }
  }

  function writeJson(key, value, store) {
    const target = resolveStore(store);
    if (!target) return false;
    try {
      target.setItem(key, JSON.stringify(value));
      return true;
    } catch (_) {
      return false;
    }
  }

  function remove(key, store) {
    const target = resolveStore(store);
    if (!target) return false;
    try {
      target.removeItem(key);
      return true;
    } catch (_) {
      return false;
    }
  }

  function clone(value) {
    if (value == null) return value;
    if (typeof structuredClone === 'function') {
      try { return structuredClone(value); } catch (_) {}
    }
    return JSON.parse(JSON.stringify(value));
  }

  function sanitizePlan(plan) {
    if (!plan || !Array.isArray(plan.trials)) throw new Error('ORIENT active session requires a valid plan.');
    return {
      version: plan.version || 'orient-session-unknown',
      seed: String(plan.seed || ''),
      contentVersion: plan.contentVersion || null,
      difficultyModelVersion: plan.difficultyModelVersion || null,
      historyApplied: Boolean(plan.historyApplied),
      cooldownReseeds: Number(plan.cooldownReseeds) || 0,
      fallback: Boolean(plan.fallback),
      fallbackReason: plan.fallbackReason || null,
      challengeFamily: plan.challengeFamily || null,
      trials: plan.trials.map(trial => ({
        slot: Number(trial.slot) || 0,
        role: trial.role || 'relation',
        id: trial.id,
        relationId: trial.relationId || trial.id,
        from: trial.from,
        to: trial.to,
        conditions: { ...(trial.conditions || {}) },
        difficulty: trial.difficulty ? { ...trial.difficulty } : null,
        contrast: trial.contrast ? clone(trial.contrast) : undefined
      }))
    };
  }

  function randomToken() {
    try {
      if (window.crypto?.getRandomValues) {
        const words = new Uint32Array(2);
        window.crypto.getRandomValues(words);
        return `${words[0].toString(36)}${words[1].toString(36)}`;
      }
    } catch (_) {}
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER).toString(36);
  }

  function createSessionId(seed = 'orient') {
    return `or_${Date.now().toString(36)}_${String(seed).slice(0, 10).replace(/[^a-z0-9_-]/gi, '')}_${randomToken().slice(0, 10)}`;
  }

  function createRecordId(sessionId, slot) {
    return `${String(sessionId)}:t${Math.max(1, Number(slot) || 1)}`;
  }

  function createActiveSession({ plan, sessionId = createSessionId(plan?.seed), currentSlot = 1, committedRecordIds = [] } = {}) {
    const safePlan = sanitizePlan(plan);
    const maxSlot = safePlan.trials.length + 1;
    const slot = Math.max(1, Math.min(maxSlot, Number(currentSlot) || 1));
    const now = new Date().toISOString();
    return {
      schemaVersion: ACTIVE_SCHEMA_VERSION,
      sessionId: String(sessionId),
      sessionSeed: safePlan.seed,
      contentVersion: safePlan.contentVersion,
      difficultyModelVersion: safePlan.difficultyModelVersion,
      sessionVersion: safePlan.version,
      status: 'active',
      currentSlot: slot,
      committedRecordIds: [...new Set((committedRecordIds || []).filter(value => typeof value === 'string'))],
      plan: safePlan,
      startedAt: now,
      updatedAt: now
    };
  }

  function validActive(value) {
    if (!value || value.schemaVersion !== ACTIVE_SCHEMA_VERSION || value.status !== 'active') return false;
    if (typeof value.sessionId !== 'string' || !value.sessionId) return false;
    if (!value.plan || !Array.isArray(value.plan.trials) || !value.plan.trials.length) return false;
    if (!Number.isInteger(value.currentSlot) || value.currentSlot < 1 || value.currentSlot > value.plan.trials.length + 1) return false;
    if (!Array.isArray(value.committedRecordIds)) return false;
    return true;
  }

  function readActive(store) {
    const value = readJson(ACTIVE_KEY, null, store);
    return validActive(value) ? clone(value) : null;
  }

  function writeActive(active, store) {
    if (!validActive(active)) return false;
    return writeJson(ACTIVE_KEY, { ...clone(active), updatedAt: new Date().toISOString() }, store);
  }

  function clearActive(store) {
    return remove(ACTIVE_KEY, store);
  }

  function commitActive(active, { recordId, nextSlot } = {}, store) {
    if (!validActive(active) || typeof recordId !== 'string' || !recordId) return null;
    const committedRecordIds = [...new Set([...active.committedRecordIds, recordId])];
    const maxSlot = active.plan.trials.length + 1;
    const updated = {
      ...clone(active),
      currentSlot: Math.max(1, Math.min(maxSlot, Number(nextSlot) || active.currentSlot)),
      committedRecordIds,
      updatedAt: new Date().toISOString()
    };
    if (!writeActive(updated, store)) return null;
    return updated;
  }

  function readHistory(store) {
    const parsed = readJson(HISTORY_KEY, null, store);
    if (!parsed || parsed.version !== HISTORY_VERSION || !Array.isArray(parsed.relationIds)) return [];
    return parsed.relationIds.filter(value => typeof value === 'string').slice(-HISTORY_LIMIT);
  }

  function rememberRelation(relationId, store) {
    if (!relationId || typeof relationId !== 'string') return readHistory(store);
    const previous = readHistory(store).filter(id => id !== relationId);
    previous.push(relationId);
    const relationIds = previous.slice(-HISTORY_LIMIT);
    writeJson(HISTORY_KEY, { version: HISTORY_VERSION, relationIds }, store);
    return relationIds;
  }

  function normalizeTraceRecord(record) {
    if (!record || record.play !== 'orient') return null;
    if (record.version === 2) {
      return {
        ...clone(record),
        legacy: false,
        confidence: record.judgment?.confidence ?? null,
        sessionId: record.sessionId || null
      };
    }

    const result = record.result || {};
    const session = record.session || {};
    return {
      version: Number(record.version) || 1,
      legacy: true,
      play: 'orient',
      recordId: record.recordId || null,
      timestamp: record.timestamp || null,
      sessionId: null,
      sessionSeed: session.seed || null,
      contentVersion: session.contentVersion || null,
      difficultyModelVersion: null,
      trial: {
        id: record.trialId || null,
        relationId: record.relationId || record.trialId || null,
        slot: session.slot || null,
        role: session.role || 'relation'
      },
      judgment: {
        distanceKm: record.judgment?.distanceKm ?? null,
        bearingDeg: record.judgment?.bearingDeg ?? null,
        confidence: null,
        interaction: null
      },
      confidence: null,
      relation: {
        id: record.relationId || record.trialId || null,
        from: null,
        to: null,
        distanceKm: record.relation?.distanceKm ?? null,
        bearingDeg: record.relation?.bearingDeg ?? null
      },
      residual: {
        distanceKm: result.distanceResidualKm ?? null,
        distanceRatio: result.distanceRatio ?? null,
        distanceLogError: null,
        bearingDeg: result.bearingResidualDeg ?? null,
        distanceClass: null,
        bearingClass: null
      },
      conditions: clone(record.conditions?.before || record.conditions || {}),
      difficulty: clone(record.difficulty || null)
    };
  }

  function recordsForSession(records, sessionId) {
    if (!sessionId) return [];
    return (Array.isArray(records) ? records : [])
      .map(normalizeTraceRecord)
      .filter(record => record && !record.legacy && record.sessionId === sessionId)
      .sort((a, b) => Number(a.trial?.slot || 0) - Number(b.trial?.slot || 0));
  }

  orient.storage = Object.freeze({
    ACTIVE_KEY,
    HISTORY_KEY,
    HISTORY_VERSION,
    ACTIVE_SCHEMA_VERSION,
    HISTORY_LIMIT,
    sanitizePlan,
    createSessionId,
    createRecordId,
    createActiveSession,
    readActive,
    writeActive,
    clearActive,
    commitActive,
    readHistory,
    rememberRelation,
    normalizeTraceRecord,
    recordsForSession
  });
})();
