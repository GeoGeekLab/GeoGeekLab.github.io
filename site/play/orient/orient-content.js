(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const orient = GeoPlay.orient = GeoPlay.orient || {};
  const geometry = orient.geometry;
  if (!geometry) throw new Error('ORIENT geometry unavailable.');

  const CONTENT_VERSION = 'orient-content-1';
  const DIFFICULTY_MODEL_VERSION = 'orient-difficulty-1';
  const NORMAL_DISTANCE_MIN_KM = 2500;
  const NORMAL_DISTANCE_MAX_KM = 16500;
  const CARDINAL_TOLERANCE_DEG = 15;

  const RECOGNITION_DEMAND = Object.freeze({
    anchor: 0.15,
    common: 0.45,
    extended: 0.75,
  });

  const DISTANCE_BANDS = Object.freeze([
    Object.freeze({ id: 'medium', minKm: 2500, maxKm: 5000 }),
    Object.freeze({ id: 'long', minKm: 5000, maxKm: 9000 }),
    Object.freeze({ id: 'very-long', minKm: 9000, maxKm: 13000 }),
    Object.freeze({ id: 'global', minKm: 13000, maxKm: 16500.0000001 }),
  ]);

  const clamp01 = value => Math.max(0, Math.min(1, value));
  const round = (value, digits) => Number(value.toFixed(digits));

  function distanceBand(distanceKm) {
    if (!Number.isFinite(distanceKm) || distanceKm < NORMAL_DISTANCE_MIN_KM || distanceKm > NORMAL_DISTANCE_MAX_KM) return null;
    return DISTANCE_BANDS.find(band => distanceKm >= band.minKm && distanceKm < band.maxKm)?.id || null;
  }

  function bearingSector(bearingDeg) {
    if (!Number.isFinite(bearingDeg)) return null;
    const normalized = geometry.normalizeBearing(bearingDeg);
    const sectors = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return sectors[Math.floor(((normalized + 22.5) % 360) / 45)];
  }

  function bearingShape(bearingDeg) {
    if (!Number.isFinite(bearingDeg)) return null;
    const normalized = geometry.normalizeBearing(bearingDeg);
    const nearest = Math.min(...[0, 90, 180, 270].map(axis => Math.abs(geometry.signedAngle(normalized - axis))));
    return nearest <= CARDINAL_TOLERANCE_DEG ? 'cardinal' : 'oblique';
  }

  function crossesDateLine(from, to) {
    return Math.abs(to.location.lon - from.location.lon) > 180;
  }

  function crossesEquator(from, to) {
    return (from.location.lat < 0 && to.location.lat > 0)
      || (from.location.lat > 0 && to.location.lat < 0);
  }

  function recognitionDemand(place) {
    return RECOGNITION_DEMAND[place?.content?.recognitionTier] ?? Number.NaN;
  }

  function distanceDemand(distanceKm) {
    return clamp01((distanceKm - NORMAL_DISTANCE_MIN_KM) / (NORMAL_DISTANCE_MAX_KM - NORMAL_DISTANCE_MIN_KM));
  }

  function antipodalDemand(antipodalRatio) {
    return clamp01((antipodalRatio - 0.55) / (0.82 - 0.55));
  }

  function buildRelation(from, to) {
    if (!from || !to || from.id === to.id) return null;
    const distanceKmRaw = geometry.haversine(from.location, to.location);
    const bearingDegRaw = geometry.initialBearing(from.location, to.location);
    const band = distanceBand(distanceKmRaw);
    if (!band) return null;

    const dateLine = crossesDateLine(from, to);
    const equator = crossesEquator(from, to);
    const shape = bearingShape(bearingDegRaw);
    const latitudeDemand = Math.max(Math.abs(from.location.lat), Math.abs(to.location.lat)) / 90;
    const antipodalRatio = distanceKmRaw / geometry.MAX_GREAT_CIRCLE_DISTANCE_KM;
    const distanceDemandValue = distanceDemand(distanceKmRaw);
    const antipodalDemandValue = antipodalDemand(antipodalRatio);
    const placeDemand = (recognitionDemand(from) + recognitionDemand(to)) / 2;
    const geometryDemand = 0.30 * distanceDemandValue
      + 0.25 * latitudeDemand
      + 0.20 * antipodalDemandValue
      + 0.15 * (dateLine ? 1 : 0)
      + 0.10 * (equator ? 1 : 0);

    // Cue difficulty belongs to Trial conditions. These static bases deliberately
    // omit the later Rings (+0.30) and Coast (+0.20) terms.
    const distanceBase = 0.45 * distanceDemandValue + 0.25 * placeDemand;
    const bearingBase = 0.25 * latitudeDemand
      + 0.15 * (shape === 'oblique' ? 1 : 0)
      + 0.20 * (dateLine ? 1 : 0)
      + 0.20 * placeDemand;

    return {
      id: `${from.id}__${to.id}`,
      from: from.id,
      to: to.id,
      geometry: {
        distanceKm: round(distanceKmRaw, 1),
        bearingDeg: round(bearingDegRaw, 2),
        distanceBand: band,
        bearingSector: bearingSector(bearingDegRaw),
        bearingShape: shape,
        crossesEquator: equator,
        crossesDateLine: dateLine,
        latitudeDemand: round(latitudeDemand, 4),
        antipodalRatio: round(antipodalRatio, 4),
      },
      difficulty: {
        geometry: round(geometryDemand, 4),
        place: round(placeDemand, 4),
        distanceBase: round(distanceBase, 4),
        bearingBase: round(bearingBase, 4),
      },
    };
  }

  function buildRelationArtifact(placeArtifact) {
    if (placeArtifact?.version !== CONTENT_VERSION || !Array.isArray(placeArtifact?.places)) {
      throw new Error(`ORIENT places must use ${CONTENT_VERSION}.`);
    }
    const enabled = placeArtifact.places
      .filter(place => place?.content?.enabled !== false)
      .slice()
      .sort((a, b) => a.id.localeCompare(b.id));
    const relations = [];
    for (const from of enabled) {
      for (const to of enabled) {
        const relation = buildRelation(from, to);
        if (relation) relations.push(relation);
      }
    }
    relations.sort((a, b) => a.id.localeCompare(b.id));
    return {
      version: CONTENT_VERSION,
      difficultyModelVersion: DIFFICULTY_MODEL_VERSION,
      sourcePlaceCount: enabled.length,
      sourceDirectedPairCount: enabled.length * Math.max(0, enabled.length - 1),
      normalRelationCount: relations.length,
      relations,
    };
  }

  orient.contentModel = Object.freeze({
    CONTENT_VERSION,
    DIFFICULTY_MODEL_VERSION,
    NORMAL_DISTANCE_MIN_KM,
    NORMAL_DISTANCE_MAX_KM,
    CARDINAL_TOLERANCE_DEG,
    RECOGNITION_DEMAND,
    DISTANCE_BANDS,
    distanceBand,
    bearingSector,
    bearingShape,
    crossesDateLine,
    crossesEquator,
    recognitionDemand,
    distanceDemand,
    antipodalDemand,
    buildRelation,
    buildRelationArtifact,
  });
})();
