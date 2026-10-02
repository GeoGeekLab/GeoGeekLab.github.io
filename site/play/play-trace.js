(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const STORAGE_KEY = 'geogeek.play.trace.v1';

  function readAll() {
    try {
      const value = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch (_) {
      return [];
    }
  }

  function writeAll(records) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(records.slice(-120)));
    } catch (_) {
      // Trace is experiential, not required for the instrument to function.
    }
  }

  function append(record) {
    const records = readAll();
    const entry = {
      version: 1,
      timestamp: new Date().toISOString(),
      ...record
    };
    records.push(entry);
    writeAll(records);
    return entry;
  }

  function forPlay(play) {
    return readAll().filter(record => record.play === play);
  }

  function clearPlay(play) {
    writeAll(readAll().filter(record => record.play !== play));
  }

  GeoPlay.trace = { append, readAll, forPlay, clearPlay, STORAGE_KEY };
})();