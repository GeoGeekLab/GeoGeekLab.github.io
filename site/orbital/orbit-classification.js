// Approximate orbital-regime taxonomy from GP/OMM mean elements.
// This is a browsing classification, not an authoritative orbit determination.
export const EARTH_MU_KM3_S2 = 398600.4418;
export const EARTH_RADIUS_KM = 6371.0088;
export const SIDEREAL_PERIOD_MIN = 1436.068;

export const ORBIT_CLASSES = ['LEO', 'MEO', 'GSO', 'GEO', 'HEO', 'HIGH'];

export function classifyOrbit(record) {
  const motion = Number(record.MEAN_MOTION);
  const eccentricity = Number(record.ECCENTRICITY);
  const inclination = Number(record.INCLINATION);
  if (!(motion > 0) || !Number.isFinite(eccentricity) || eccentricity < 0 ||
      eccentricity >= 1 || !Number.isFinite(inclination)) {
    return { orbitClass: 'HIGH', periodMin: null, perigeeKm: null, apogeeKm: null };
  }
  const periodMin = 1440 / motion;
  const angularRate = motion * 2 * Math.PI / 86400;
  const semiMajorKm = Math.cbrt(EARTH_MU_KM3_S2 / (angularRate * angularRate));
  const perigeeKm = semiMajorKm * (1 - eccentricity) - EARTH_RADIUS_KM;
  const apogeeKm = semiMajorKm * (1 + eccentricity) - EARTH_RADIUS_KM;
  const nearGeosynchronous = Math.abs(periodMin - SIDEREAL_PERIOD_MIN) <= 30;
  let orbitClass;
  if (nearGeosynchronous && eccentricity <= 0.01 && Math.abs(inclination) <= 1) orbitClass = 'GEO';
  else if (nearGeosynchronous) orbitClass = 'GSO';
  else if (eccentricity >= 0.25 && apogeeKm >= 2000) orbitClass = 'HEO';
  else if (apogeeKm <= 2000) orbitClass = 'LEO';
  else if (perigeeKm >= 2000 && apogeeKm < 35786) orbitClass = 'MEO';
  else orbitClass = 'HIGH';
  return { orbitClass, periodMin, perigeeKm, apogeeKm };
}
