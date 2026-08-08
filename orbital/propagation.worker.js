/*
  GeoGeek orbital propagation worker.

  Portions of the worker architecture are derived from Satlas:
  https://github.com/PremaanshVyas/satlas
  Copyright (c) 2026 Premaansh Vyas
  Licensed under the MIT License. See ../THIRD_PARTY_LICENSES/SATLAS-MIT.txt.

  Adaptation notes:
  - accepts CelesTrak OMM/GP JSON instead of Satlas' TLERecord type;
  - emits Earth-fixed globe coordinates so GeoGeek's cartographic globe stays aligned;
  - adds paired orbit / ground-trace output for the TRACE interaction.
*/

'use strict';

importScripts('https://cdn.jsdelivr.net/npm/satellite.js@6.0.1/dist/satellite.min.js');

const R_EARTH_KM = 6371.0;
let satrecs = [];

function toCartesian(position, date, groundOnly = false) {
  if (!position || typeof position !== 'object') return null;
  const gmst = satellite.gstime(date);
  const gd = satellite.eciToGeodetic(position, gmst);
  const lat = gd.latitude;
  const lon = gd.longitude;
  const altitudeKm = Number.isFinite(gd.height) ? gd.height : 0;
  const r = groundOnly ? 1.004 : Math.max(1.001, (R_EARTH_KM + altitudeKm) / R_EARTH_KM);
  const cosLat = Math.cos(lat);
  return [
    r * cosLat * Math.cos(lon),
    r * Math.sin(lat),
    -r * cosLat * Math.sin(lon)
  ];
}

function propagateOne(satrec, date, groundOnly = false) {
  if (!satrec) return null;
  try {
    const state = satellite.propagate(satrec, date);
    if (!state || !state.position) return null;
    return toCartesian(state.position, date, groundOnly);
  } catch {
    return null;
  }
}

self.onmessage = event => {
  const msg = event.data || {};

  if (msg.type === 'init') {
    const records = Array.isArray(msg.records) ? msg.records : [];
    satrecs = records.map(record => {
      try { return satellite.json2satrec(record); }
      catch { return null; }
    });
    self.postMessage({ type: 'ready', count: satrecs.length });
    return;
  }

  if (msg.type === 'tick') {
    if (!satrecs.length) return;
    const date = new Date(Number(msg.timestamp) || Date.now());
    const buffer = new Float32Array(satrecs.length * 3);
    for (let i = 0; i < satrecs.length; i += 1) {
      const p = propagateOne(satrecs[i], date, false);
      if (!p) continue;
      buffer[i * 3] = p[0];
      buffer[i * 3 + 1] = p[1];
      buffer[i * 3 + 2] = p[2];
    }
    self.postMessage({ type: 'positions', timestamp: date.getTime(), buffer }, [buffer.buffer]);
    return;
  }

  if (msg.type === 'trace') {
    const index = Number(msg.index);
    if (!Number.isInteger(index) || !satrecs[index]) return;
    const center = Number(msg.timestamp) || Date.now();
    const before = Number.isFinite(msg.beforeMinutes) ? msg.beforeMinutes : 35;
    const after = Number.isFinite(msg.afterMinutes) ? msg.afterMinutes : 85;
    const step = Math.max(1, Number.isFinite(msg.stepMinutes) ? msg.stepMinutes : 2);
    const orbitPoints = [];
    const groundPoints = [];
    for (let minute = -before; minute <= after; minute += step) {
      const date = new Date(center + minute * 60000);
      const orbit = propagateOne(satrecs[index], date, false);
      const ground = propagateOne(satrecs[index], date, true);
      if (!orbit || !ground) continue;
      orbitPoints.push(...orbit);
      groundPoints.push(...ground);
    }
    const orbit = new Float32Array(orbitPoints);
    const ground = new Float32Array(groundPoints);
    self.postMessage({ type: 'trace', index, orbit, ground }, [orbit.buffer, ground.buffer]);
  }
};
