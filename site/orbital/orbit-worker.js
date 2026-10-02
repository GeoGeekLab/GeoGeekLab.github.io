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
  const velocity = Math.hypot(pv.velocity.x, pv.velocity.y, pv.velocity.z);
  return {
    lon: gd.longitude,
    lat: gd.latitude,
    altitude: gd.height,
    velocity,
    ecf: satellite.eciToEcf(pv.position, gmst),
  };
}

function filterIndices({ filter = 'ALL', query = '', maxPoints = 7200, selectedId = null }) {
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
  for (let i = 0; i < maxPoints; i++) out[i] = candidates[Math.floor(i * stride)];
  if (selectedIndex != null && candidates.includes(selectedIndex) && !out.includes(selectedIndex)) out[out.length - 1] = selectedIndex;
  return { indices: out, totalVisible: candidates.length };
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

function postPositions(message) {
  const date = new Date(Number(message.timeMs));
  const gmst = satellite.gstime(date);
  const { indices, totalVisible } = filterIndices(message);
  const packed = new Float32Array(indices.length * 4);
  const returned = new Int32Array(indices.length);
  let count = 0;
  let selectedState = null;
  for (const index of indices) {
    const item = objects[index];
    const p = propagateObject(item, date, gmst);
    if (!p) continue;
    const offset = count * 4;
    packed[offset] = p.lon;
    packed[offset + 1] = p.lat;
    packed[offset + 2] = p.altitude;
    packed[offset + 3] = p.velocity;
    returned[count] = index;
    if (message.selectedId && item.id === String(message.selectedId)) {
      selectedState = {
        index,
        lon: satellite.degreesLong(p.lon),
        lat: satellite.degreesLat(p.lat),
        altitude: p.altitude,
        velocity: p.velocity,
        look: observerLook(message.observer, p),
      };
    }
    count++;
  }
  const values = count === indices.length ? packed : packed.slice(0, count * 4);
  const actualIndices = count === indices.length ? returned : returned.slice(0, count);
  self.postMessage({
    type: 'positions',
    timeMs: date.getTime(),
    values,
    indices: actualIndices,
    totalVisible,
    selectedState,
  }, [values.buffer, actualIndices.buffer]);
}

function postTrace(message) {
  const item = byId.get(String(message.id));
  if (!item) return;
  const center = Number(message.timeMs);
  const periodMs = Math.max(60, Number(item.periodMin || 96)) * 60000;
  const samples = Math.max(90, Math.min(260, Number(message.samples || 180)));
  const packed = new Float32Array((samples + 1) * 3);
  let count = 0;
  for (let i = 0; i <= samples; i++) {
    const t = center - periodMs / 2 + periodMs * (i / samples);
    const date = new Date(t);
    const p = propagateObject(item, date);
    if (!p) continue;
    const o = count * 3;
    packed[o] = p.lon;
    packed[o + 1] = p.lat;
    packed[o + 2] = p.altitude;
    count++;
  }
  const values = count === samples + 1 ? packed : packed.slice(0, count * 3);
  self.postMessage({ type: 'trace', id: item.id, timeMs: center, periodMin: item.periodMin, values }, [values.buffer]);
}

function elevationFor(item, date, observer) {
  const gmst = satellite.gstime(date);
  const p = propagateObject(item, date, gmst);
  if (!p) return null;
  return observerLook(observer, p);
}

function postPass(message) {
  const item = byId.get(String(message.id));
  const observer = message.observer;
  if (!item || !observer) return;
  const start = Number(message.timeMs);
  const horizonMs = Math.max(1, Math.min(48, Number(message.hours || 24))) * 3600000;
  const stepMs = 60000;
  let inPass = false;
  let aos = null;
  let los = null;
  let peak = { elevation: -90, timeMs: null, azimuth: null, range: null };
  for (let t = start; t <= start + horizonMs; t += stepMs) {
    const look = elevationFor(item, new Date(t), observer);
    if (!look) continue;
    if (look.elevation > 0) {
      if (!inPass) { inPass = true; aos = t; }
      if (look.elevation > peak.elevation) peak = { ...look, timeMs: t };
    } else if (inPass) {
      los = t;
      break;
    }
  }
  self.postMessage({ type: 'pass', id: item.id, observer, result: aos ? { aos, los, peak } : null });
}

self.onmessage = event => {
  const message = event.data || {};
  if (message.type === 'init') {
    const raw = Array.isArray(message.records) ? message.records : [];
    objects = raw.map(makeObject).filter(Boolean);
    objects.forEach((item, index) => { item.index = index; byId.set(item.id, item); });
    const meta = objects.map(item => ({
      id: item.id,
      name: item.name,
      objectId: item.objectId,
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
  if (message.type === 'pass') postPass(message);
};
