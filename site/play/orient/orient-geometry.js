(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const orient = GeoPlay.orient = GeoPlay.orient || {};

  const EARTH_RADIUS_KM = 6371;
  const MAX_GREAT_CIRCLE_DISTANCE_KM = Math.PI * EARTH_RADIUS_KM;
  const toRad = degrees => degrees * Math.PI / 180;
  const toDeg = radians => radians * 180 / Math.PI;

  function normalizeBearing(angle) {
    if (!Number.isFinite(angle)) return Number.NaN;
    return ((angle % 360) + 360) % 360;
  }

  function signedAngle(angle) {
    if (!Number.isFinite(angle)) return Number.NaN;
    return ((angle + 180) % 360 + 360) % 360 - 180;
  }

  function haversine(a, b) {
    const [lon1, lat1] = a;
    const [lon2, lat2] = b;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const dPhi = toRad(lat2 - lat1);
    const dLambda = toRad(lon2 - lon1);
    const h = Math.sin(dPhi / 2) ** 2
      + Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  }

  function initialBearing(a, b) {
    const [lon1, lat1] = a;
    const [lon2, lat2] = b;
    const phi1 = toRad(lat1);
    const phi2 = toRad(lat2);
    const lambdaDelta = toRad(lon2 - lon1);
    const y = Math.sin(lambdaDelta) * Math.cos(phi2);
    const x = Math.cos(phi1) * Math.sin(phi2)
      - Math.sin(phi1) * Math.cos(phi2) * Math.cos(lambdaDelta);
    return normalizeBearing(toDeg(Math.atan2(y, x)));
  }

  function distanceRatio(estimateDistanceKm, truthDistanceKm) {
    if (!Number.isFinite(estimateDistanceKm) || !Number.isFinite(truthDistanceKm) || truthDistanceKm <= 0) {
      return Number.NaN;
    }
    return (estimateDistanceKm - truthDistanceKm) / truthDistanceKm;
  }

  function distanceLogError(estimateDistanceKm, truthDistanceKm) {
    if (!Number.isFinite(estimateDistanceKm) || !Number.isFinite(truthDistanceKm)
      || estimateDistanceKm <= 0 || truthDistanceKm <= 0) {
      return Number.NaN;
    }
    return Math.log(estimateDistanceKm / truthDistanceKm);
  }

  orient.geometry = Object.freeze({
    EARTH_RADIUS_KM,
    MAX_GREAT_CIRCLE_DISTANCE_KM,
    haversine,
    initialBearing,
    normalizeBearing,
    signedAngle,
    distanceRatio,
    distanceLogError,
  });
})();
