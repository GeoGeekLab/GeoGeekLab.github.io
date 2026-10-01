import * as satellite from 'https://cdn.jsdelivr.net/npm/satellite.js@6.0.2/+esm';

const EARTH_RADIUS_KM = 6371.0088;
let objects = [];
let byId = new Map();

function orbitClass(record) {
  const meanMotion = Number(record.MEAN_MOTION || 0);
  const period = meanMotion > 0 ? 1440 / meanMotion : Infinity;
  const ecc = Number(record.ECCENTRICITY || 0);
  if (period < 225) return 'LEO';
  if (period >= 1200 && period <= 1650 && ecc < 0.25) return 'GEO';
  if (period < 1200) return 'MEO';
  return 'HIGH';
}

function makeObject(record, index) {
  try {
    const satrec = satellite.json2satrec(record);
    const meanMotion = Number(record.MEAN_MOTION || 0);
    const periodMin = meanMotion > 0 ? 1440 / meanMotion : null;
    const epochRaw = String(record.EPOCH || '');
    const epochMs = Date.parse(epochRaw && !/[zZ]|[+-]\d\d:?\d\d$/.test(epochRaw) ? `${epochRaw}Z` : epochRaw);
    return {
      index,
      satrec,
      id: String(record.NORAD_CAT_ID ?? index),
      name: String(record.OBJECT_NAME || `OBJECT ${record.NORAD_CAT_ID ?? index}`).trim(),
      objectId: String(record.OBJECT_ID || ''),
      objectType: String(record.OBJECT_TYPE || '').trim(),
      countryCode: String(record.COUNTRY_CODE || '').trim(),
      launchDate: String(record.LAUNCH_DATE || '').trim(),
      orbitClass: orbitClass(record),
      inclination: Number(record.INCLINATION || 0),
      eccentricity: Number(record.ECCENTRICITY || 0),
      periodMin,
      epochMs: Number.isFinite(epochMs) ? epochMs : null,
    };
  } catch {
    return null;
  }
}

function propagateObject(item, date, gmst = satellite.gstime(date)) {
  const pv = satellite.propagate(item.satrec, date);
  if (!pv?.position || !pv?.velocity) return null;
  const gd = satellite.eciToGeodetic(pv.position, gmst);
  if (!gd || !Number.isFinite(gd.longitude) || !Number.isFinite(gd.latitude) || !Number.isFinite(gd.height)) return null;
  return {
    lon: gd.longitude,
    lat: gd.latitude,
    altitude: gd.height,
    velocity: Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z),
    eci: pv.position,
    ecf: satellite.eciToEcf(pv.position, gmst),
  };
}

function observerLook(observer, propagated) {
  if (!observer || !propagated?.ecf) return null;
  const gd = {
    longitude: satellite.degreesToRadians(Number(observer.lon || 0)),
    latitude: satellite.degreesToRadians(Number(observer.lat || 0)),
    height: Math.max(0, Number(observer.height || 0)),
  };
  const look = satellite.ecfToLookAngles(gd, propagated.ecf);
  if (!look) return null;
  return {
    azimuth: satellite.radiansToDegrees(look.azimuth),
    elevation: satellite.radiansToDegrees(look.elevation),
    range: look.rangeSat,
  };
}

function filterIndices({ filter = 'ALL', query = '', maxPoints = 16000, selectedId = null }) {
  const q = String(query || '').trim().toLowerCase();
  const candidates = [];
  for (const item of objects) {
    if (filter !== 'ALL' && item.orbitClass !== filter) continue;
    if (q && !item.name.toLowerCase().includes(q) && !item.id.includes(q) && !item.objectId.toLowerCase().includes(q)) continue;
    candidates.push(item.index);
  }
  if (candidates.length <= maxPoints) return { indices: candidates, totalVisible: candidates.length };
  const selectedIndex = selectedId ? byId.get(String(selectedId))?.index : null;
  const out = new Array(maxPoints);
  const stride = candidates.length / maxPoints;
  for (let i = 0; i < maxPoints; i += 1) out[i] = candidates[Math.floor(i * stride)];
  if (selectedIndex != null && candidates.includes(selectedIndex) && !out.includes(selectedIndex)) out[out.length - 1] = selectedIndex;
  return { indices: out, totalVisible: candidates.length };
}

function postPositions(message) {
  const date = new Date(Number(message.timeMs));
  const gmst = satellite.gstime(date);
  const { indices, totalVisible } = filterIndices(message);
  const packed = new Float32Array(indices.length * 7);
  const returned = new Int32Array(indices.length);
  let count = 0;
  let selectedState = null;
  for (const index of indices) {
    const item = objects[index];
    const p = propagateObject(item, date, gmst);
    if (!p) continue;
    const o = count * 7;
    packed[o] = p.lon;
    packed[o + 1] = p.lat;
    packed[o + 2] = p.altitude;
    packed[o + 3] = p.velocity;
    packed[o + 4] = p.eci.x / EARTH_RADIUS_KM;
    packed[o + 5] = p.eci.y / EARTH_RADIUS_KM;
    packed[o + 6] = p.eci.z / EARTH_RADIUS_KM;
    returned[count] = index;
    if (message.selectedId && item.id === String(message.selectedId)) {
      selectedState = {
        index,
        lon: satellite.degreesLong(p.lon),
        lat: satellite.degreesLat(p.lat),
        altitude: p.altitude,
        velocity: p.velocity,
        eciEarthRadii: [p.eci.x / EARTH_RADIUS_KM, p.eci.y / EARTH_RADIUS_KM, p.eci.z / EARTH_RADIUS_KM],
        look: observerLook(message.observer, p),
      };
    }
    count += 1;
  }
  const values = count === indices.length ? packed : packed.slice(0, count * 7);
  const actualIndices = count === indices.length ? returned : returned.slice(0, count);
  self.postMessage({ type: 'positions', timeMs: date.getTime(), values, indices: actualIndices, totalVisible, selectedState }, [values.buffer, actualIndices.buffer]);
}

function postTrace(message) {
  const item = byId.get(String(message.id));
  if (!item) return;
  const center = Number(message.timeMs);
  const periodMs = Math.max(60, Number(item.periodMin || 96)) * 60000;
  const samples = Math.max(120, Math.min(360, Number(message.samples || 240)));
  const packed = new Float32Array((samples + 1) * 3);
  let count = 0;
  for (let i = 0; i <= samples; i += 1) {
    const t = center - periodMs / 2 + periodMs * (i / samples);
    const p = propagateObject(item, new Date(t));
    if (!p) continue;
    const o = count * 3;
    packed[o] = p.lon;
    packed[o + 1] = p.lat;
    packed[o + 2] = p.altitude;
    count += 1;
  }
  const values = count === samples + 1 ? packed : packed.slice(0, count * 3);
  self.postMessage({ type: 'trace', id: item.id, timeMs: center, periodMin: item.periodMin, values }, [values.buffer]);
}

function lookAt(item, timeMs, observer) {
  const date = new Date(timeMs);
  const p = propagateObject(item, date, satellite.gstime(date));
  if (!p) return null;
  return observerLook(observer, p);
}

function elevationAt(item, timeMs, observer) {
  return lookAt(item, timeMs, observer)?.elevation ?? null;
}

function refineCrossing(item, observer, a, b, rising) {
  let lo = a;
  let hi = b;
  for (let i = 0; i < 18; i += 1) {
    const mid = (lo + hi) / 2;
    const elevation = elevationAt(item, mid, observer);
    if (elevation == null) break;
    if (rising ? elevation > 0 : elevation <= 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}

function refinePeak(item, observer, aos, los) {
  let lo = aos;
  let hi = los;
  for (let i = 0; i < 20; i += 1) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    const e1 = elevationAt(item, m1, observer) ?? -90;
    const e2 = elevationAt(item, m2, observer) ?? -90;
    if (e1 < e2) lo = m1;
    else hi = m2;
  }
  const timeMs = (lo + hi) / 2;
  const look = lookAt(item, timeMs, observer);
  return look ? { ...look, timeMs } : { elevation: -90, azimuth: null, range: null, timeMs };
}

function findPasses(item, observer, start, hours = 48, limit = 3) {
  const end = start + Math.max(1, Math.min(72, Number(hours || 48))) * 3600000;
  const stepMs = 60000;
  const passes = [];
  let previousTime = start;
  let previousElevation = elevationAt(item, previousTime, observer);
  let aos = previousElevation != null && previousElevation > 0 ? start : null;

  for (let t = start + stepMs; t <= end && passes.length < limit; t += stepMs) {
    const elevation = elevationAt(item, t, observer);
    if (elevation == null) continue;
    if (aos == null && previousElevation != null && previousElevation <= 0 && elevation > 0) {
      aos = refineCrossing(item, observer, previousTime, t, true);
    }
    if (aos != null && previousElevation != null && previousElevation > 0 && elevation <= 0) {
      const los = refineCrossing(item, observer, previousTime, t, false);
      passes.push({ aos, los, peak: refinePeak(item, observer, aos, los) });
      aos = null;
    }
    previousTime = t;
    previousElevation = elevation;
  }
  return passes;
}

function postPasses(message) {
  const item = byId.get(String(message.id));
  if (!item || !message.observer) return;
  const passes = findPasses(item, message.observer, Number(message.timeMs), Number(message.hours || 48), Number(message.limit || 3));
  self.postMessage({ type: 'passes', id: item.id, observer: message.observer, passes });
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'init') {
    const raw = Array.isArray(message.records) ? message.records : [];
    objects = raw.map(makeObject).filter(Boolean);
    byId = new Map();
    objects.forEach((item, index) => { item.index = index; byId.set(item.id, item); });
    const meta = objects.map(item => ({
      id: item.id,
      name: item.name,
      objectId: item.objectId,
      objectType: item.objectType,
      countryCode: item.countryCode,
      launchDate: item.launchDate,
      orbitClass: item.orbitClass,
      inclination: item.inclination,
      eccentricity: item.eccentricity,
      periodMin: item.periodMin,
      epochMs: item.epochMs,
    }));
    const counts = { ALL: objects.length, LEO: 0, MEO: 0, GEO: 0, HIGH: 0 };
    for (const item of objects) counts[item.orbitClass] = (counts[item.orbitClass] || 0) + 1;
    self.postMessage({ type: 'ready', meta, counts });
    return;
  }
  if (message.type === 'positions') { postPositions(message); return; }
  if (message.type === 'trace') { postTrace(message); return; }
  if (message.type === 'passes') postPasses(message);
};
