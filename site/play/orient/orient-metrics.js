(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const orient = GeoPlay.orient = GeoPlay.orient || {};
  const geometry = orient.geometry;
  const config = orient.config;
  if (!geometry) throw new Error('ORIENT geometry unavailable.');
  if (!config) throw new Error('ORIENT config unavailable.');

  function classifySigned(value, deadzone, positiveClass, negativeClass, neutralClass) {
    if (!Number.isFinite(value) || !Number.isFinite(deadzone) || deadzone < 0) return 'unknown';
    if (Math.abs(value) < deadzone) return neutralClass;
    return value >= 0 ? positiveClass : negativeClass;
  }

  function classifyDistanceRatio(value, deadzone = config.interpretation.distanceDeadzoneRatio) {
    return classifySigned(value, deadzone, 'long', 'short', 'near');
  }

  function classifyBearingResidual(value, deadzone = config.interpretation.bearingDeadzoneDeg) {
    return classifySigned(value, deadzone, 'clockwise', 'counterclockwise', 'aligned');
  }

  function computeResidual({ estimateDistanceKm, estimateBearingDeg, truthDistanceKm, truthBearingDeg } = {}) {
    const distanceResidualKm = estimateDistanceKm - truthDistanceKm;
    const ratio = geometry.distanceRatio(estimateDistanceKm, truthDistanceKm);
    const logError = geometry.distanceLogError(estimateDistanceKm, truthDistanceKm);
    const bearingResidualDeg = geometry.signedAngle(estimateBearingDeg - truthBearingDeg);

    return {
      distanceResidualKm,
      distanceRatio: ratio,
      distanceLogError: logError,
      bearingResidualDeg,
      distanceClass: classifyDistanceRatio(ratio),
      bearingClass: classifyBearingResidual(bearingResidualDeg),
    };
  }

  orient.metrics = Object.freeze({
    classifyDistanceRatio,
    classifyBearingResidual,
    computeResidual,
  });
})();
