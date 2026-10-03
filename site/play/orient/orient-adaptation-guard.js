(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  const base = orient.session;
  const trace = root.trace;
  if (!base?.composeAdaptationTrial || !trace?.readAll) throw new Error('ORIENT adaptation guard dependencies unavailable.');

  function composeAdaptationTrial(options = {}) {
    const required = Number(base.BASE_TRIAL_COUNT) || 4;
    const records = Array.isArray(options.records) ? options.records.slice(0, required) : [];
    const durableIds = new Set(trace.readAll()
      .filter(record => record?.play === 'orient' && typeof record.recordId === 'string')
      .map(record => record.recordId));
    if (records.length < required || records.some(record => !record?.recordId || !durableIds.has(record.recordId))) {
      throw new Error(`ORIENT adaptation requires ${required} durable committed records.`);
    }
    return base.composeAdaptationTrial(options);
  }

  orient.session = Object.freeze({ ...base, composeAdaptationTrial });
})();
