(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  const contentModel = orient.contentModel;
  if (!contentModel) throw new Error('ORIENT content model unavailable.');

  const SESSION_VERSION = 'orient-session-1';
  const SESSION_SIZE = 4;
  const RECENT_HISTORY_LIMIT = 32;
  const CORE_MATCH_MAX_DISTANCE_RATIO = 0.15;
  const CORE_MATCH_MIN_BEARING_SEPARATION_DEG = 60;
  const MAX_COOLDOWN_RESEEDS = 16;
  const INDEX_CACHE = new WeakMap();

  const SLOT_CONDITIONS = Object.freeze({
    orientation: Object.freeze({ coast: true, graticule: false, rings: true }),
    baseline: Object.freeze({ coast: true, graticule: false, rings: false }),
    contrast: Object.freeze({ coast: false, graticule: false, rings: false }),
    challenge: Object.freeze({ coast: false, graticule: false, rings: false })
  });

  const CHALLENGE_FAMILIES = Object.freeze([
    Object.freeze({ id: 'dateline', test: relation => Boolean(relation.geometry?.crossesDateLine) }),
    Object.freeze({ id: 'equator', test: relation => Boolean(relation.geometry?.crossesEquator) }),
    Object.freeze({ id: 'latitude', test: relation => Number(relation.geometry?.latitudeDemand) >= 0.55 }),
    Object.freeze({ id: 'oblique', test: relation => relation.geometry?.bearingShape === 'oblique' }),
    Object.freeze({ id: 'global', test: relation => ['very-long', 'global'].includes(relation.geometry?.distanceBand) })
  ]);

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));

  function hashSeed(seed) {
    const text = String(seed ?? 'orient');
    let hash = 2166136261;
    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function createRng(seed) {
    let state = hashSeed(seed) || 0x6d2b79f5;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
  }

  function bearingSeparation(a, b) {
    const delta = Math.abs((Number(a) - Number(b) + 540) % 360 - 180);
    return Number.isFinite(delta) ? delta : Infinity;
  }

  function isCoreMatched(base, candidate) {
    if (!base || !candidate || base.id === candidate.id) return false;
    if (base.from !== candidate.from) return false;
    if (base.geometry?.distanceBand !== candidate.geometry?.distanceBand) return false;
    const baseDistance = Number(base.geometry?.distanceKm);
    const candidateDistance = Number(candidate.geometry?.distanceKm);
    if (!(baseDistance > 0) || !(candidateDistance > 0)) return false;
    const distanceRatio = Math.abs(candidateDistance - baseDistance) / baseDistance;
    if (distanceRatio > CORE_MATCH_MAX_DISTANCE_RATIO) return false;
    return bearingSeparation(base.geometry?.bearingDeg, candidate.geometry?.bearingDeg) >= CORE_MATCH_MIN_BEARING_SEPARATION_DEG;
  }

  function cueDifficulty(relation, conditions = {}) {
    // Rings directly support radial distance calibration; coast geometry mainly
    // supports directional orientation. Their absence therefore adds demand at
    // the Trial layer rather than mutating the static Relation difficulty.
    const ringsPenalty = conditions.rings ? 0 : 0.30;
    const coastPenalty = conditions.coast ? 0 : 0.20;
    const distance = clamp01(Number(relation?.difficulty?.distanceBase) + ringsPenalty);
    const bearing = clamp01(Number(relation?.difficulty?.bearingBase) + coastPenalty);
    return {
      distance,
      bearing,
      cueDemand: clamp01((ringsPenalty + coastPenalty) / 0.50),
      overall: clamp01((distance + bearing) / 2)
    };
  }

  function buildIndex(placeArtifact, relationArtifact) {
    if (relationArtifact && typeof relationArtifact === 'object') {
      const cached = INDEX_CACHE.get(relationArtifact);
      if (cached?.placeArtifact === placeArtifact) return cached.index;
    }

    const places = placeArtifact?.places || [];
    const relations = relationArtifact?.relations || [];
    if (!places.length || !relations.length) throw new Error('ORIENT content pool is empty.');
    const placeById = new Map(places.map(place => [place.id, place]));
    const relationsByFrom = new Map();
    for (const relation of relations) {
      if (!placeById.has(relation.from) || !placeById.has(relation.to)) continue;
      const bucket = relationsByFrom.get(relation.from) || [];
      bucket.push(relation);
      relationsByFrom.set(relation.from, bucket);
    }

    const matchedById = new Map();
    for (const bucket of relationsByFrom.values()) {
      for (const base of bucket) {
        matchedById.set(base.id, bucket.filter(candidate => isCoreMatched(base, candidate)));
      }
    }

    const index = { places, relations, placeById, relationsByFrom, matchedById };
    if (relationArtifact && typeof relationArtifact === 'object') INDEX_CACHE.set(relationArtifact, { placeArtifact, index });
    return index;
  }

  function placeTier(index, relation, side) {
    return index.placeById.get(relation?.[side])?.content?.recognitionTier || 'extended';
  }

  function relationFreshnessSet(recentRelationIds = []) {
    return new Set((Array.isArray(recentRelationIds) ? recentRelationIds : []).slice(-RECENT_HISTORY_LIMIT));
  }

  function scoredChoice(candidates, score, rng, jitter = 0.20) {
    let chosen = null;
    let chosenValue = Infinity;
    for (const item of candidates) {
      const baseScore = Number(score(item));
      if (!Number.isFinite(baseScore)) continue;
      const value = baseScore + rng() * jitter;
      if (value < chosenValue || (value === chosenValue && String(item.id) < String(chosen?.id || ''))) {
        chosen = item;
        chosenValue = value;
      }
    }
    return chosen;
  }

  function bandChoice(candidates, score, rng, tolerance = 0.30) {
    if (!candidates.length) return null;
    const entries = [];
    let minimum = Infinity;
    for (const item of candidates) {
      const value = Number(score(item));
      if (!Number.isFinite(value)) continue;
      entries.push({ item, value });
      if (value < minimum) minimum = value;
    }
    if (!entries.length) return null;
    const band = entries.filter(entry => entry.value <= minimum + tolerance);
    return band[Math.floor(rng() * band.length)]?.item || band[0].item;
  }

  function preferFresh(candidates, recent) {
    const fresh = candidates.filter(relation => !recent.has(relation.id));
    return fresh.length ? fresh : candidates;
  }

  function unused(candidates, used) {
    return candidates.filter(relation => !used.has(relation.id));
  }

  function orientationScore(index, relation) {
    const fromTier = placeTier(index, relation, 'from');
    const toTier = placeTier(index, relation, 'to');
    const tierPenalty = (fromTier === 'anchor' ? 0 : 0.8) + (toTier === 'anchor' ? 0 : 0.6);
    const bandPenalty = relation.geometry?.distanceBand === 'long' ? 0 : relation.geometry?.distanceBand === 'medium' ? 0.12 : 0.45;
    const flagPenalty = (relation.geometry?.crossesDateLine ? 0.8 : 0) + (relation.geometry?.antipodalRatio > 0.68 ? 0.6 : 0);
    return tierPenalty + bandPenalty + flagPenalty + Math.abs((relation.difficulty?.geometry ?? 0.5) - 0.32) * 1.8 + (relation.difficulty?.place ?? 0.5) * 0.8;
  }

  function contrastCost(index, base, candidate) {
    const baseDistance = Number(base.geometry.distanceKm);
    const distanceDelta = Math.abs(Number(candidate.geometry.distanceKm) - baseDistance) / baseDistance;
    const bearingDelta = bearingSeparation(base.geometry.bearingDeg, candidate.geometry.bearingDeg);
    const bearingTargetCost = Math.abs(bearingDelta - 105) / 180;
    const geometryCost = Math.abs((candidate.difficulty?.geometry ?? 0.5) - (base.difficulty?.geometry ?? 0.5));
    const placeCost = Math.abs((candidate.difficulty?.place ?? 0.5) - (base.difficulty?.place ?? 0.5));
    const latitudeCost = Math.abs((candidate.geometry?.latitudeDemand ?? 0.5) - (base.geometry?.latitudeDemand ?? 0.5));
    const flagCost = (candidate.geometry?.crossesEquator !== base.geometry?.crossesEquator ? 0.18 : 0)
      + (candidate.geometry?.crossesDateLine !== base.geometry?.crossesDateLine ? 0.25 : 0);
    const tierCost = placeTier(index, candidate, 'to') === placeTier(index, base, 'to') ? 0 : 0.15;
    return distanceDelta * 3.2 + bearingTargetCost * 0.45 + geometryCost * 1.3 + placeCost * 0.8 + latitudeCost * 0.7 + flagCost + tierCost;
  }

  function baselineScore(index, relation, matchedCount) {
    const fromTier = placeTier(index, relation, 'from');
    const toTier = placeTier(index, relation, 'to');
    const tierPenalty = (fromTier === 'extended' ? 0.8 : fromTier === 'common' ? 0.16 : 0)
      + (toTier === 'extended' ? 0.55 : 0);
    const geometry = relation.difficulty?.geometry ?? 0.5;
    const bandPenalty = relation.geometry?.distanceBand === 'long' || relation.geometry?.distanceBand === 'very-long' ? 0 : 0.28;
    const reservoirBonus = Math.min(matchedCount, 8) * -0.025;
    return tierPenalty + bandPenalty + Math.abs(geometry - 0.48) * 1.4 + (relation.difficulty?.place ?? 0.5) * 0.25 + reservoirBonus;
  }

  function challengeScore(index, relation, usedPlaces) {
    const reusedPlacePenalty = (usedPlaces.has(relation.from) ? 0.36 : 0) + (usedPlaces.has(relation.to) ? 0.24 : 0);
    const geometry = relation.difficulty?.geometry ?? 0.5;
    const place = relation.difficulty?.place ?? 0.5;
    const geometryTargetCost = Math.abs(geometry - 0.68) * 0.62;
    const placeTargetCost = Math.abs(place - 0.52) * 0.18;
    const antipodalPenalty = Math.max(0, (relation.geometry?.antipodalRatio ?? 0) - 0.78) * 1.8;
    const toTierPenalty = placeTier(index, relation, 'to') === 'extended' ? 0.04 : 0;
    return reusedPlacePenalty + geometryTargetCost + placeTargetCost + antipodalPenalty + toTierPenalty;
  }

  function chooseChallenge(index, candidates, usedPlaces, rng) {
    const familyStart = Math.floor(rng() * CHALLENGE_FAMILIES.length);
    let family = null;
    let familyPool = [];
    for (let offset = 0; offset < CHALLENGE_FAMILIES.length; offset += 1) {
      const candidateFamily = CHALLENGE_FAMILIES[(familyStart + offset) % CHALLENGE_FAMILIES.length];
      const candidatePool = candidates.filter(candidateFamily.test);
      if (candidatePool.length >= 8) {
        family = candidateFamily;
        familyPool = candidatePool;
        break;
      }
    }
    if (!family) {
      family = { id: 'general' };
      familyPool = candidates;
    }

    const unrepeatedPlaces = familyPool.filter(relation => !usedPlaces.has(relation.from) && !usedPlaces.has(relation.to));
    const choicePool = unrepeatedPlaces.length >= 8 ? unrepeatedPlaces : familyPool;
    return {
      family: family.id,
      relation: bandChoice(choicePool, relation => challengeScore(index, relation, usedPlaces), rng, 0.34)
    };
  }

  function makeTrial(slot, role, relation, conditions, metadata = {}) {
    return {
      slot,
      role,
      id: relation.id,
      relationId: relation.id,
      from: relation.from,
      to: relation.to,
      conditions: { ...conditions },
      difficulty: cueDifficulty(relation, conditions),
      ...metadata,
      relation
    };
  }

  function composeSession({ seed, placeArtifact, relationArtifact, recentRelationIds = [] } = {}) {
    const normalizedSeed = String(seed ?? 'orient-default');
    const rng = createRng(normalizedSeed);
    const index = buildIndex(placeArtifact, relationArtifact);
    const recent = relationFreshnessSet(recentRelationIds);
    const used = new Set();

    const pool = preferFresh(index.relations, recent);
    const orientationCandidates = pool.filter(relation => {
      const fromTier = placeTier(index, relation, 'from');
      const toTier = placeTier(index, relation, 'to');
      return fromTier === 'anchor' && toTier === 'anchor'
        && !relation.geometry?.crossesDateLine
        && (relation.geometry?.distanceBand === 'medium' || relation.geometry?.distanceBand === 'long');
    });
    const t1 = scoredChoice(orientationCandidates.length ? orientationCandidates : pool, relation => orientationScore(index, relation), rng, 0.34);
    if (!t1) throw new Error('Unable to compose ORIENT orientation trial.');
    used.add(t1.id);

    const baselineSource = unused(preferFresh(index.relations, recent), used);
    const baselineCandidates = baselineSource.filter(base => {
      if (placeTier(index, base, 'from') === 'extended') return false;
      const matches = index.matchedById.get(base.id) || [];
      return matches.filter(candidate => candidate.id !== t1.id).length >= 2;
    });
    const t2Pool = baselineCandidates.length ? baselineCandidates : baselineSource.filter(base =>
      (index.matchedById.get(base.id) || []).some(candidate => candidate.id !== t1.id));
    const t2 = scoredChoice(t2Pool, relation => baselineScore(index, relation, (index.matchedById.get(relation.id) || []).length), rng, 0.38);
    if (!t2) throw new Error('Unable to compose ORIENT baseline trial.');
    used.add(t2.id);

    const allMatches = (index.matchedById.get(t2.id) || []).filter(candidate => !used.has(candidate.id));
    const freshMatches = allMatches.filter(candidate => !recent.has(candidate.id));
    const t3Pool = freshMatches.length ? freshMatches : allMatches;
    const t3 = scoredChoice(t3Pool, relation => contrastCost(index, t2, relation), rng, 0.10);
    if (!t3) throw new Error('Unable to compose ORIENT contrast trial.');
    used.add(t3.id);

    const usedPlaces = new Set([t1.from, t1.to, t2.from, t2.to, t3.from, t3.to]);
    const challengePool = unused(preferFresh(index.relations, recent), used);
    const challengeCandidates = challengePool.filter(relation =>
      placeTier(index, relation, 'from') !== 'extended'
      && (relation.difficulty?.geometry ?? 0) >= 0.46
      && relation.geometry?.antipodalRatio < 0.84);
    const challengeSelection = chooseChallenge(index, challengeCandidates.length ? challengeCandidates : challengePool, usedPlaces, rng);
    const t4 = challengeSelection.relation;
    if (!t4) throw new Error('Unable to compose ORIENT challenge trial.');
    used.add(t4.id);

    const trials = [
      makeTrial(1, 'orientation', t1, SLOT_CONDITIONS.orientation),
      makeTrial(2, 'baseline', t2, SLOT_CONDITIONS.baseline),
      makeTrial(3, 'contrast', t3, SLOT_CONDITIONS.contrast),
      makeTrial(4, 'challenge', t4, SLOT_CONDITIONS.challenge, { challengeFamily: challengeSelection.family })
    ];

    return {
      version: SESSION_VERSION,
      seed: normalizedSeed,
      contentVersion: placeArtifact?.version || contentModel.CONTENT_VERSION,
      relationVersion: relationArtifact?.version || null,
      difficultyModelVersion: contentModel.DIFFICULTY_MODEL_VERSION,
      historyApplied: recent.size > 0,
      trials
    };
  }

  function composeFreshSession({ seed, placeArtifact, relationArtifact, recentRelationIds = [] } = {}) {
    const baseSeed = String(seed ?? 'orient-default');
    const recent = relationFreshnessSet(recentRelationIds);
    let plan = null;
    let reseeds = 0;
    for (; reseeds <= MAX_COOLDOWN_RESEEDS; reseeds += 1) {
      const candidateSeed = reseeds === 0 ? baseSeed : `${baseSeed}~${reseeds}`;
      plan = composeSession({ seed: candidateSeed, placeArtifact, relationArtifact, recentRelationIds: [] });
      const overlaps = plan.trials.some(trial => recent.has(trial.relationId));
      if (!overlaps) break;
    }
    return {
      ...plan,
      historyApplied: recent.size > 0,
      cooldownReseeds: Math.min(reseeds, MAX_COOLDOWN_RESEEDS + 1)
    };
  }

  orient.session = Object.freeze({
    SESSION_VERSION,
    SESSION_SIZE,
    RECENT_HISTORY_LIMIT,
    CORE_MATCH_MAX_DISTANCE_RATIO,
    CORE_MATCH_MIN_BEARING_SEPARATION_DEG,
    MAX_COOLDOWN_RESEEDS,
    SLOT_CONDITIONS,
    CHALLENGE_FAMILIES,
    hashSeed,
    createRng,
    bearingSeparation,
    isCoreMatched,
    cueDifficulty,
    composeSession,
    composeFreshSession
  });
})();
