(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  const contentModel = orient.contentModel;
  if (!contentModel) throw new Error('ORIENT content model unavailable.');

  const SESSION_VERSION = 'orient-session-2';
  const SESSION_SIZE = 5;
  const BASE_TRIAL_COUNT = 4;
  const ADAPTATION_STRATEGY_VERSION = 'orient-adaptation-1';
  const RECENT_HISTORY_LIMIT = 32;
  const CORE_MATCH_MAX_DISTANCE_RATIO = 0.15;
  const CORE_MATCH_MIN_BEARING_SEPARATION_DEG = 60;
  const MAX_COOLDOWN_RESEEDS = 16;
  const INDEX_CACHE = new WeakMap();

  const SLOT_CONDITIONS = Object.freeze({
    orientation: Object.freeze({ coast: true, graticule: false, rings: true }),
    baseline: Object.freeze({ coast: true, graticule: false, rings: false }),
    contrast: Object.freeze({ coast: false, graticule: false, rings: false }),
    challenge: Object.freeze({ coast: false, graticule: false, rings: false }),
    adaptation: Object.freeze({ coast: true, graticule: false, rings: false }),
    confirmation: Object.freeze({ coast: true, graticule: false, rings: false })
  });

  const CHALLENGE_FAMILIES = Object.freeze([
    Object.freeze({ id: 'dateline', test: relation => Boolean(relation.geometry?.crossesDateLine) }),
    Object.freeze({ id: 'equator', test: relation => Boolean(relation.geometry?.crossesEquator) }),
    Object.freeze({ id: 'latitude', test: relation => Number(relation.geometry?.latitudeDemand) >= 0.55 }),
    Object.freeze({ id: 'oblique', test: relation => relation.geometry?.bearingShape === 'oblique' }),
    Object.freeze({ id: 'global', test: relation => ['very-long', 'global'].includes(relation.geometry?.distanceBand) })
  ]);

  const clamp01 = value => Math.max(0, Math.min(1, Number(value) || 0));
  const mean = values => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

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
    const relationById = new Map(relations.map(relation => [relation.id, relation]));
    const relationsByFrom = new Map();
    for (const relation of relations) {
      if (!placeById.has(relation.from) || !placeById.has(relation.to)) continue;
      const bucket = relationsByFrom.get(relation.from) || [];
      bucket.push(relation);
      relationsByFrom.set(relation.from, bucket);
    }

    const matchedById = new Map();
    for (const bucket of relationsByFrom.values()) {
      for (const base of bucket) matchedById.set(base.id, bucket.filter(candidate => isCoreMatched(base, candidate)));
    }

    const index = { places, relations, placeById, relationById, relationsByFrom, matchedById };
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

    const trials = [
      makeTrial(1, 'orientation', t1, SLOT_CONDITIONS.orientation),
      makeTrial(2, 'baseline', t2, SLOT_CONDITIONS.baseline),
      makeTrial(3, 'contrast', t3, SLOT_CONDITIONS.contrast),
      makeTrial(4, 'challenge', t4, SLOT_CONDITIONS.challenge, { challengeFamily: challengeSelection.family })
    ];

    return {
      version: SESSION_VERSION,
      seed: normalizedSeed,
      targetSize: SESSION_SIZE,
      contentVersion: placeArtifact?.version || contentModel.CONTENT_VERSION,
      relationVersion: relationArtifact?.version || null,
      difficultyModelVersion: contentModel.DIFFICULTY_MODEL_VERSION,
      adaptationStrategyVersion: ADAPTATION_STRATEGY_VERSION,
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

  function adaptationEvidence(records = []) {
    const evidence = (Array.isArray(records) ? records : []).slice(0, BASE_TRIAL_COUNT).filter(record => record?.residual);
    const distanceErrors = evidence.map(record => Number(record.residual.distanceLogError)).filter(Number.isFinite);
    const bearingErrors = evidence.map(record => Number(record.residual.bearingDeg)).filter(Number.isFinite);
    const distanceMagnitude = mean(distanceErrors.map(Math.abs));
    const bearingMagnitude = mean(bearingErrors.map(Math.abs));
    const distanceScore = distanceMagnitude / Math.log(1.25);
    const bearingScore = bearingMagnitude / 20;
    const axis = distanceScore >= bearingScore ? 'distance' : 'bearing';
    const signedDistance = mean(distanceErrors);
    const signedBearing = mean(bearingErrors);
    const direction = axis === 'distance'
      ? (signedDistance > Math.log(1.05) ? 'long' : signedDistance < Math.log(1 / 1.05) ? 'short' : 'mixed')
      : (signedBearing > 5 ? 'clockwise' : signedBearing < -5 ? 'counterclockwise' : 'mixed');
    const dominantMagnitude = axis === 'distance' ? distanceScore : bearingScore;
    const mode = dominantMagnitude >= 0.75 && direction !== 'mixed' ? 'adaptation' : 'confirmation';
    let sourceSlot = 1;
    let sourceMagnitude = -1;
    evidence.forEach((record, index) => {
      const value = axis === 'distance' ? Math.abs(Number(record.residual.distanceLogError)) : Math.abs(Number(record.residual.bearingDeg));
      if (Number.isFinite(value) && value > sourceMagnitude) {
        sourceMagnitude = value;
        sourceSlot = Number(record.trial?.slot) || index + 1;
      }
    });
    return Object.freeze({ axis, direction, mode, sourceSlot, evidenceCount: evidence.length });
  }

  function adaptationCost(index, relation, reference, evidence, usedPlaces) {
    const geometry = relation.difficulty?.geometry ?? 0.5;
    const place = relation.difficulty?.place ?? 0.5;
    const recognitionPenalty = (placeTier(index, relation, 'from') === 'extended' ? 0.8 : 0)
      + (placeTier(index, relation, 'to') === 'extended' ? 0.55 : 0);
    const reusedPlacePenalty = (usedPlaces.has(relation.from) ? 0.12 : 0) + (usedPlaces.has(relation.to) ? 0.10 : 0);
    const moderateCost = Math.abs(geometry - 0.48) * 0.8 + Math.abs(place - 0.42) * 0.25;
    const antipodalPenalty = Math.max(0, (relation.geometry?.antipodalRatio ?? 0) - 0.76) * 2;
    let matchCost = 0;
    if (reference) {
      if (evidence.axis === 'distance') {
        const refDistance = Number(reference.geometry?.distanceKm);
        const distance = Number(relation.geometry?.distanceKm);
        const scaleDelta = refDistance > 0 && distance > 0 ? Math.abs(Math.log(distance / refDistance)) : 1;
        matchCost += reference.geometry?.distanceBand === relation.geometry?.distanceBand ? 0 : 0.38;
        matchCost += scaleDelta * 0.45;
      } else {
        matchCost += reference.geometry?.bearingShape === relation.geometry?.bearingShape ? 0 : 0.20;
        matchCost += Math.abs((reference.geometry?.latitudeDemand ?? 0.5) - (relation.geometry?.latitudeDemand ?? 0.5)) * 0.45;
      }
    }
    return recognitionPenalty + reusedPlacePenalty + moderateCost + antipodalPenalty + matchCost;
  }

  function composeAdaptationTrial({ plan, records = [], placeArtifact, relationArtifact, recentRelationIds = [] } = {}) {
    if (!plan || !Array.isArray(plan.trials) || plan.trials.length < BASE_TRIAL_COUNT) throw new Error('ORIENT adaptation requires four base trials.');
    if (plan.trials.length >= SESSION_SIZE) return plan;
    const index = buildIndex(placeArtifact, relationArtifact);
    const evidence = adaptationEvidence(records);
    const sourceTrial = plan.trials.find(trial => Number(trial.slot) === evidence.sourceSlot) || plan.trials[0];
    const reference = index.relationById.get(sourceTrial?.relationId || sourceTrial?.id) || null;
    const usedIds = new Set(plan.trials.map(trial => trial.relationId || trial.id));
    const recent = relationFreshnessSet(recentRelationIds);
    const usedPlaces = new Set(plan.trials.flatMap(trial => [trial.from, trial.to]));
    let candidates = index.relations.filter(relation => !usedIds.has(relation.id) && !recent.has(relation.id));
    if (!candidates.length) candidates = index.relations.filter(relation => !usedIds.has(relation.id));
    const recognized = candidates.filter(relation => placeTier(index, relation, 'from') !== 'extended' && placeTier(index, relation, 'to') !== 'extended');
    if (recognized.length >= 12) candidates = recognized;
    const seed = `${plan.seed}|${ADAPTATION_STRATEGY_VERSION}|${evidence.axis}|${evidence.direction}|${evidence.mode}|${evidence.sourceSlot}`;
    const rng = createRng(seed);
    const relation = bandChoice(candidates, candidate => adaptationCost(index, candidate, reference, evidence, usedPlaces), rng, 0.26);
    if (!relation) throw new Error('Unable to compose ORIENT adaptation trial.');
    const role = evidence.mode;
    const trial = makeTrial(SESSION_SIZE, role, relation, SLOT_CONDITIONS[role], { adaptation: { ...evidence } });
    return { ...plan, targetSize: SESSION_SIZE, adaptationStrategyVersion: ADAPTATION_STRATEGY_VERSION, trials: [...plan.trials, trial] };
  }

  function chooseOrientationReplacement(index, candidates, rng) {
    const constrained = candidates.filter(relation => placeTier(index, relation, 'from') === 'anchor'
      && placeTier(index, relation, 'to') === 'anchor'
      && !relation.geometry?.crossesDateLine
      && ['medium', 'long'].includes(relation.geometry?.distanceBand));
    return scoredChoice(constrained.length ? constrained : candidates, relation => orientationScore(index, relation), rng, 0.22);
  }

  function replaceUnfamiliarTrial({ plan, slot, attempt = 1, records = [], placeArtifact, relationArtifact, recentRelationIds = [] } = {}) {
    if (!plan || !Array.isArray(plan.trials)) throw new Error('ORIENT replacement requires a valid plan.');
    const index = buildIndex(placeArtifact, relationArtifact);
    const slotNumber = Number(slot);
    const currentIndex = plan.trials.findIndex(trial => Number(trial.slot) === slotNumber);
    if (currentIndex < 0) throw new Error('ORIENT replacement slot is unavailable.');
    const current = plan.trials[currentIndex];
    const recent = relationFreshnessSet([...recentRelationIds, current.relationId || current.id]);
    const rng = createRng(`${plan.seed}|unfamiliar|${slotNumber}|${attempt}|${current.relationId || current.id}`);
    const preservedIds = new Set(plan.trials.filter((_, indexValue) => indexValue !== currentIndex).map(trial => trial.relationId || trial.id));
    let candidates = index.relations.filter(relation => !preservedIds.has(relation.id) && !recent.has(relation.id));
    if (!candidates.length) candidates = index.relations.filter(relation => !preservedIds.has(relation.id) && relation.id !== current.relationId);
    const nextTrials = plan.trials.slice();

    if (slotNumber === 1) {
      const relation = chooseOrientationReplacement(index, candidates, rng);
      if (!relation) throw new Error('No alternate orientation relation is available.');
      nextTrials[0] = makeTrial(1, 'orientation', relation, SLOT_CONDITIONS.orientation);
    } else if (slotNumber === 2) {
      const keepIds = new Set(plan.trials.filter(trial => ![2, 3].includes(Number(trial.slot))).map(trial => trial.relationId || trial.id));
      const baselinePool = index.relations.filter(relation => !keepIds.has(relation.id) && !recent.has(relation.id));
      const baselineCandidates = baselinePool.filter(base => placeTier(index, base, 'from') !== 'extended'
        && (index.matchedById.get(base.id) || []).some(candidate => !keepIds.has(candidate.id) && candidate.id !== base.id));
      const base = scoredChoice(baselineCandidates.length ? baselineCandidates : baselinePool,
        relation => baselineScore(index, relation, (index.matchedById.get(relation.id) || []).length), rng, 0.24);
      if (!base) throw new Error('No alternate baseline relation is available.');
      const matches = (index.matchedById.get(base.id) || []).filter(candidate => !keepIds.has(candidate.id) && candidate.id !== base.id);
      const contrast = scoredChoice(matches, relation => contrastCost(index, base, relation), rng, 0.08);
      if (!contrast) throw new Error('No matched contrast relation is available.');
      nextTrials[1] = makeTrial(2, 'baseline', base, SLOT_CONDITIONS.baseline);
      nextTrials[2] = makeTrial(3, 'contrast', contrast, SLOT_CONDITIONS.contrast);
    } else if (slotNumber === 3) {
      const base = index.relationById.get(plan.trials.find(trial => Number(trial.slot) === 2)?.relationId);
      if (!base) throw new Error('Baseline relation is unavailable.');
      const matches = (index.matchedById.get(base.id) || []).filter(candidate => !preservedIds.has(candidate.id) && candidate.id !== current.relationId && !recent.has(candidate.id));
      const fallbackMatches = (index.matchedById.get(base.id) || []).filter(candidate => !preservedIds.has(candidate.id) && candidate.id !== current.relationId);
      const relation = scoredChoice(matches.length ? matches : fallbackMatches, candidate => contrastCost(index, base, candidate), rng, 0.06);
      if (!relation) throw new Error('No alternate contrast relation is available.');
      nextTrials[2] = makeTrial(3, 'contrast', relation, SLOT_CONDITIONS.contrast);
    } else if (slotNumber === 4) {
      const usedPlaces = new Set(plan.trials.filter(trial => Number(trial.slot) < 4).flatMap(trial => [trial.from, trial.to]));
      const challengeCandidates = candidates.filter(relation => placeTier(index, relation, 'from') !== 'extended'
        && (relation.difficulty?.geometry ?? 0) >= 0.46 && relation.geometry?.antipodalRatio < 0.84);
      const selection = chooseChallenge(index, challengeCandidates.length ? challengeCandidates : candidates, usedPlaces, rng);
      if (!selection.relation) throw new Error('No alternate challenge relation is available.');
      nextTrials[3] = makeTrial(4, 'challenge', selection.relation, SLOT_CONDITIONS.challenge, { challengeFamily: selection.family });
    } else if (slotNumber === 5) {
      const basePlan = { ...plan, trials: plan.trials.filter(trial => Number(trial.slot) < 5) };
      return composeAdaptationTrial({
        plan: basePlan,
        records,
        placeArtifact,
        relationArtifact,
        recentRelationIds: [...recentRelationIds, current.relationId || current.id]
      });
    } else {
      throw new Error('ORIENT replacement slot is outside the session.');
    }

    return { ...plan, trials: nextTrials };
  }

  orient.session = Object.freeze({
    SESSION_VERSION,
    SESSION_SIZE,
    BASE_TRIAL_COUNT,
    ADAPTATION_STRATEGY_VERSION,
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
    adaptationEvidence,
    composeSession,
    composeFreshSession,
    composeAdaptationTrial,
    replaceUnfamiliarTrial
  });
})();
