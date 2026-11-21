import * as satellite from 'https://cdn.jsdelivr.net/npm/satellite.js@6.0.2/+esm';
import { classifyOrbit, ORBIT_CLASSES } from './orbit-classification.js';

const EARTH_RADIUS_KM = 6371.0088;
let objects = [];
let byId = new Map();

function makeObject(record, index) {
  try {
    const satrec = satellite.json2satrec(record);
    const orbital = classifyOrbit(record);
    const epochRaw = String(record.EPOCH || '');
    const epochMs = Date.parse(epochRaw && !/[zZ]|[+-]\d\d:?\d\d$/.test(epochRaw) ? `${epochRaw}Z` : epochRaw);
    return {
      index,
      satrec,
      id: String(record.NORAD_CAT_ID ?? index),
      name: String(record.OBJECT_NAME || `OBJECT ${record.NORAD_CAT_ID ?? index}`).trim(),
      objectId: String(record.OBJECT_ID || ''),
      orbitClass: orbital.orbitClass,
      inclination: Number(record.INCLINATION || 0),
      eccentricity: Number(record.ECCENTRICITY || 0),
      periodMin: orbital.periodMin,
      perigeeKm: orbital.perigeeKm,
      apogeeKm: orbital.apogeeKm,
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
    height: Math.max(-0.5, Math.min(9, Number(observer.height || 0))),
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
  const end = start + horizonMs;
  // Short grazing LEO passes can last less than two minutes.
  // Sample those orbits every 30 seconds before event-root refinement.
  const coarseStepMs = item.periodMin != null && item.periodMin < 225 ? 30000 : 120000;
  const elevationAt = timeMs => elevationFor(item, new Date(timeMs), observer)?.elevation ?? null;
  const elevationStart = elevationAt(start);
  if (elevationStart === null) {
    self.postMessage({ type:'pass', id:item.id, requestId:message.requestId, result:null });
    return;
  }

  // Find the zero-degree horizon crossing to one-second temporal precision.
  function crossing(lo, hi) {
    const leftSign = elevationAt(lo) > 0;
    for (let i = 0; i < 24 && hi - lo > 1000; i++) {
      const mid = (lo + hi) / 2;
      const elevation = elevationAt(mid);
      if (elevation === null) break;
      if ((elevation > 0) === leftSign) lo = mid;
      else hi = mid;
    }
    return Math.round((lo + hi) / 2000) * 1000;
  }

  let aos = null;
  let los = null;
  let inProgress = elevationStart > 0;
  let inside = inProgress;
  if (inProgress) {
    // If the object is already above the horizon, recover the previous AOS.
    const backMs = Math.min(24 * 3600000, Math.max(2, (item.periodMin || 100) * 1.5) * 60000);
    let right = start;
    for (let left = start - coarseStepMs; left >= start - backMs; left -= coarseStepMs) {
      const elevation = elevationAt(left);
      if (elevation === null) continue;
      if (elevation <= 0) { aos = crossing(left, right); break; }
      right = left;
    }
  }

  let prevTime = start;
  let prevElevation = elevationStart;
  for (let t = start + coarseStepMs; t <= end + coarseStepMs; t += coarseStepMs) {
    const current = Math.min(t, end);
    const elevation = elevationAt(current);
    if (elevation === null) { prevTime = current; continue; }
    if (!inside && prevElevation !== null && prevElevation <= 0 && elevation > 0) {
      aos = crossing(prevTime, current);
      inside = true;
    } else if (inside && prevElevation !== null && prevElevation > 0 && elevation <= 0) {
      los = crossing(prevTime, current);
      break;
    }
    prevTime = current;
    prevElevation = elevation;
    if (current === end) break;
  }

  if (aos === null && !inProgress) {
    self.postMessage({ type:'pass', id:item.id, requestId:message.requestId, result:null });
    return;
  }
  // Maximize elevation using a coarse peak bracket and golden-section refinement.
  // Include a recovered past AOS when the selected pass is already underway.
  const leftBound = aos ?? start;
  const rightBound = Math.min(end, los ?? end);
  let bestTime = leftBound;
  let bestElevation = -90;
  let closestSampleTime = leftBound;
  let closestSampleRange = Infinity;
  for (let t = leftBound; t <= rightBound; t += coarseStepMs) {
    const look=elevationFor(item,new Date(t),observer);
    if (!look) continue;
    if (look.elevation > bestElevation) { bestElevation = look.elevation; bestTime = t; }
    if (look.range < closestSampleRange) { closestSampleRange=look.range; closestSampleTime=t; }
  }
  const lastElevation = elevationAt(rightBound);
  if (lastElevation !== null && lastElevation > bestElevation) bestTime = rightBound;
  let a = Math.max(leftBound, bestTime - coarseStepMs);
  let b = Math.min(rightBound, bestTime + coarseStepMs);
  const phi = (Math.sqrt(5) - 1) / 2;
  for (let i = 0; i < 32 && b - a > 1000; i++) {
    const c = b - (b - a) * phi;
    const d = a + (b - a) * phi;
    if ((elevationAt(c) ?? -90) < (elevationAt(d) ?? -90)) a = c;
    else b = d;
  }
  const peakTime = Math.round((a + b) / 2000) * 1000;
  const peak = elevationFor(item, new Date(peakTime), observer);
  let ca=Math.max(leftBound,closestSampleTime-coarseStepMs);
  let cb=Math.min(rightBound,closestSampleTime+coarseStepMs);
  for(let i=0;i<32&&cb-ca>1000;i++){
    const c=cb-(cb-ca)*phi,d=ca+(cb-ca)*phi;
    if((elevationFor(item,new Date(c),observer)?.range??Infinity) > (elevationFor(item,new Date(d),observer)?.range??Infinity))ca=c;
    else cb=d;
  }
  const closestTime=Math.round((ca+cb)/2000)*1000;
  const closestLook=elevationFor(item,new Date(closestTime),observer);
  const closest=closestLook?{...closestLook,timeMs:closestTime}:null;
  const result = {
    aos, los, inProgress, continuous:inProgress && aos === null && los === null,
    peak: peak ? { ...peak, timeMs:peakTime } : null,
    closest,
  };
  self.postMessage({ type:'pass', id:item.id, requestId:message.requestId, result });
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
      perigeeKm: item.perigeeKm,
      apogeeKm: item.apogeeKm,
      epochMs: item.epochMs,
    }));
    const counts = { ALL: objects.length, ...Object.fromEntries(ORBIT_CLASSES.map(name => [name, 0])) };
    for (const item of objects) counts[item.orbitClass] = (counts[item.orbitClass] || 0) + 1;
    self.postMessage({ type: 'ready', meta, counts });
    return;
  }
  if (message.type === 'positions') { postPositions(message); return; }
  if (message.type === 'trace') { postTrace(message); return; }
  if (message.type === 'pass') postPass(message);
};
