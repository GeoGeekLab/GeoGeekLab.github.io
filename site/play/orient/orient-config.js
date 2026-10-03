(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const orient = GeoPlay.orient = GeoPlay.orient || {};

  const interpretation = Object.freeze({
    distanceDeadzoneRatio: 0.05,
    bearingDeadzoneDeg: 5,
  });

  // Preserve the released three-trial Trace thresholds until the Trace v2
  // milestone replaces the legacy aggregate summary.
  const legacyTrace = Object.freeze({
    distanceBalancedRatio: 0.01,
    bearingBalancedDeg: 1,
  });

  orient.config = Object.freeze({
    interpretation,
    legacyTrace,
  });
})();
