(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  if (orient.traceView?.version === 'orient-trace-view-1') return;

  const VERSION = 'orient-trace-view-1';
  const MAX_DISTANCE_KM = Number(orient.geometry?.MAX_GREAT_CIRCLE_DISTANCE_KM) || Math.PI * 6371;
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const upper = value => String(value || '').toUpperCase();
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character]);

  function sorted(records = []) {
    return [...records]
      .filter(record => record?.version === 2 && record?.recordId)
      .sort((a, b) => Number(a.trial?.slot || 0) - Number(b.trial?.slot || 0));
  }

  function percent(value) {
    if (!finite(value)) return '—';
    const magnitude = Math.abs(value) * 100;
    return magnitude >= 10 ? `${Math.round(magnitude)}%` : `${magnitude.toFixed(1)}%`;
  }

  function distanceLabel(record) {
    const kind = String(record?.residual?.distanceClass || '').toLowerCase();
    const ratio = Number(record?.residual?.distanceRatio);
    if (!finite(ratio)) return '—';
    if (kind === 'near') return 'NEAR';
    return `${percent(ratio)} ${kind === 'short' ? 'SHORT' : 'LONG'}`;
  }

  function bearingLabel(record) {
    const kind = String(record?.residual?.bearingClass || '').toLowerCase();
    const value = Number(record?.residual?.bearingDeg);
    if (!finite(value)) return '—';
    if (kind === 'aligned') return 'ALIGNED';
    return `${Math.abs(value).toFixed(1)}° ${kind === 'counterclockwise' ? 'COUNTERCLOCKWISE' : 'CLOCKWISE'}`;
  }

  function classCounts(records, field, classes) {
    const counts = Object.fromEntries(classes.map(value => [value, 0]));
    records.forEach(record => {
      const value = String(record?.residual?.[field] || '').toLowerCase();
      if (Object.hasOwn(counts, value)) counts[value] += 1;
    });
    return counts;
  }

  function evidenceLine(records, axis) {
    const isDistance = axis === 'distance';
    const classes = isDistance ? ['long', 'short', 'near'] : ['clockwise', 'counterclockwise', 'aligned'];
    const counts = classCounts(records, isDistance ? 'distanceClass' : 'bearingClass', classes);
    const directional = isDistance ? ['long', 'short'] : ['clockwise', 'counterclockwise'];
    const dominant = directional.map(key => [key, counts[key]]).sort((a, b) => b[1] - a[1])[0];
    if (dominant?.[1] >= 3) return `${dominant[1]} OF ${records.length} ${upper(axis)} ESTIMATES WERE ${upper(dominant[0])}`;
    return classes.map(key => `${counts[key]} ${upper(key)}`).join(' · ');
  }

  function sessionObservation(records = []) {
    const items = sorted(records);
    return {
      distance: evidenceLine(items, 'distance'),
      bearing: evidenceLine(items, 'bearing')
    };
  }

  function confidenceNote(records = []) {
    const items = sorted(records);
    const highs = items.filter(record => record?.judgment?.confidence === 'high');
    if (!highs.length) return { headline: 'NO HIGH-CONFIDENCE JUDGMENTS', detail: 'Confidence is shown as context, not a score.' };
    const largestDistance = [...items].filter(record => finite(Number(record?.residual?.distanceRatio)))
      .sort((a, b) => Math.abs(Number(b.residual.distanceRatio)) - Math.abs(Number(a.residual.distanceRatio)))[0];
    const largestBearing = [...items].filter(record => finite(Number(record?.residual?.bearingDeg)))
      .sort((a, b) => Math.abs(Number(b.residual.bearingDeg)) - Math.abs(Number(a.residual.bearingDeg)))[0];
    const flags = [];
    if (largestDistance?.judgment?.confidence === 'high') flags.push('largest distance error');
    if (largestBearing?.judgment?.confidence === 'high') flags.push('largest bearing error');
    return flags.length
      ? { headline: `${flags.join(' + ').toUpperCase()} WAS HIGH CONFIDENCE`, detail: `${highs.length} of ${items.length} judgments were high confidence.` }
      : { headline: `${highs.length} OF ${items.length} JUDGMENTS WERE HIGH CONFIDENCE`, detail: 'The largest residuals occurred at another confidence level.' };
  }

  function contrastSummary(records = []) {
    const items = sorted(records);
    const baseline = items.find(record => Number(record?.trial?.slot) === 2);
    const contrast = items.find(record => Number(record?.trial?.slot) === 3);
    if (!baseline || !contrast) return null;
    const changed = ['coast', 'rings', 'graticule'].filter(key => Boolean(baseline.conditions?.[key]) !== Boolean(contrast.conditions?.[key]));
    return {
      changed: changed.length === 1 ? upper(changed[0]) : changed.length ? changed.map(upper).join(' + ') : 'NO CUE CHANGE',
      reference: baseline.relation?.from?.label || baseline.relation?.from || baseline.trial?.from || '',
      baseline: { distance: distanceLabel(baseline), bearing: bearingLabel(baseline) },
      contrast: { distance: distanceLabel(contrast), bearing: bearingLabel(contrast) },
      note: 'DESCRIPTIVE COMPARISON · RELATIONS DIFFER, SO THIS IS NOT A CAUSAL EFFECT'
    };
  }

  function probeSummary(records = []) {
    const items = sorted(records);
    const finalRecord = items.find(record => Number(record?.trial?.slot) === 5);
    if (!finalRecord) return null;
    if (orient.feedback?.probeComparison) return orient.feedback.probeComparison(finalRecord, items);
    const adaptation = finalRecord.trial?.adaptation;
    if (!adaptation?.axis) return { axis: 'confirmation', earlier: 'NO ADAPTIVE METADATA', final: `${distanceLabel(finalRecord)} · ${bearingLabel(finalRecord)}`, note: 'DESCRIPTIVE · ONE FRESH RELATION' };
    const axis = adaptation.axis === 'bearing' ? 'bearing' : 'distance';
    const field = axis === 'bearing' ? 'bearingClass' : 'distanceClass';
    const direction = String(adaptation.direction || 'mixed').toLowerCase();
    const earlier = items.filter(record => Number(record?.trial?.slot) <= 4);
    const count = earlier.filter(record => String(record?.residual?.[field] || '').toLowerCase() === direction).length;
    return {
      axis,
      earlier: direction === 'mixed' ? 'NO CLEAR DIRECTION' : `${count} / 4 ${upper(direction)}`,
      final: upper(finalRecord.residual?.[field] || 'mixed'),
      note: 'DESCRIPTIVE · NOT A LEARNING SCORE'
    };
  }

  function polar(cx, cy, radius, bearingDeg) {
    const theta = Number(bearingDeg) * Math.PI / 180;
    return [cx + Math.sin(theta) * radius, cy - Math.cos(theta) * radius];
  }

  function miniField(record) {
    const size = 164; const cx = 82; const cy = 82; const radius = 58;
    const truthDistance = Number(record?.relation?.distanceKm);
    const truthBearing = Number(record?.relation?.bearingDeg);
    const judgmentDistance = Number(record?.judgment?.distanceKm);
    const judgmentBearing = Number(record?.judgment?.bearingDeg);
    const truthR = clamp(truthDistance / MAX_DISTANCE_KM, 0, 1) * radius;
    const judgmentR = clamp(judgmentDistance / MAX_DISTANCE_KM, 0, .985) * radius;
    const [tx, ty] = polar(cx, cy, truthR, truthBearing);
    const [jx, jy] = polar(cx, cy, judgmentR, judgmentBearing);
    const slot = Number(record?.trial?.slot || 0);
    const role = upper(record?.trial?.role || 'relation');
    const from = record?.relation?.from?.label || record?.relation?.from || record?.trial?.from || '';
    const to = record?.relation?.to?.label || record?.relation?.to || record?.trial?.to || '';
    return `<article class="orient-trace-card" data-trace-slot="${slot}">
      <div class="orient-trace-card-head"><span>RELATION ${slot} · ${escapeHtml(role)}</span><strong>${escapeHtml(from)} → ${escapeHtml(to)}</strong></div>
      <svg class="orient-trace-mini" viewBox="0 0 ${size} ${size}" role="img" aria-label="Relation ${slot}. Judgment and truth vectors.">
        <circle class="orient-trace-mini-extent" cx="${cx}" cy="${cy}" r="${radius}"></circle>
        <line class="orient-trace-mini-axis" x1="${cx}" y1="${cy - radius}" x2="${cx}" y2="${cy - 8}"></line>
        <line class="orient-trace-mini-judgment" x1="${cx}" y1="${cy}" x2="${jx.toFixed(2)}" y2="${jy.toFixed(2)}"></line>
        <circle class="orient-trace-mini-judgment-point" cx="${jx.toFixed(2)}" cy="${jy.toFixed(2)}" r="3.5"></circle>
        <line class="orient-trace-mini-truth" x1="${cx}" y1="${cy}" x2="${tx.toFixed(2)}" y2="${ty.toFixed(2)}"></line>
        <circle class="orient-trace-mini-truth-point" cx="${tx.toFixed(2)}" cy="${ty.toFixed(2)}" r="3.5"></circle>
        <circle class="orient-trace-mini-reference" cx="${cx}" cy="${cy}" r="4"></circle>
      </svg>
      <div class="orient-trace-card-metrics">
        <div><span>DISTANCE</span><strong>${escapeHtml(distanceLabel(record))}</strong></div>
        <div><span>BEARING</span><strong>${escapeHtml(bearingLabel(record))}</strong></div>
        <div><span>CONFIDENCE</span><strong>${escapeHtml(upper(record?.judgment?.confidence || 'unknown'))}</strong></div>
        <div><span>CONDITION</span><strong>COAST ${record?.conditions?.coast ? 'ON' : 'OFF'} · RINGS ${record?.conditions?.rings ? 'ON' : 'OFF'}</strong></div>
      </div>
    </article>`;
  }

  function residualMap(records = []) {
    const items = sorted(records);
    const width = 480; const height = 270; const left = 46; const right = 18; const top = 18; const bottom = 34;
    const innerW = width - left - right; const innerH = height - top - bottom;
    const x = value => left + ((clamp(Number(value), -90, 90) + 90) / 180) * innerW;
    const y = value => top + (1 - ((clamp(Number(value), -.5, .5) + .5) / 1)) * innerH;
    const zeroX = x(0); const zeroY = y(0);
    const points = items.map(record => {
      const slot = Number(record.trial?.slot || 0);
      const px = x(record.residual?.bearingDeg);
      const py = y(record.residual?.distanceRatio);
      return `<g class="orient-trace-map-point" data-trace-slot="${slot}"><circle cx="${px.toFixed(2)}" cy="${py.toFixed(2)}" r="7"></circle><text x="${px.toFixed(2)}" y="${(py + 2.8).toFixed(2)}" text-anchor="middle">${slot}</text></g>`;
    }).join('');
    return `<svg class="orient-residual-map" viewBox="0 0 ${width} ${height}" role="img" aria-label="Residual map. Horizontal is bearing error from counterclockwise to clockwise. Vertical is distance error from short to long.">
      <line class="orient-trace-map-axis" x1="${left}" y1="${zeroY}" x2="${width - right}" y2="${zeroY}"></line>
      <line class="orient-trace-map-axis" x1="${zeroX}" y1="${top}" x2="${zeroX}" y2="${height - bottom}"></line>
      <text class="orient-trace-map-label" x="${left}" y="${height - 10}">CCW</text>
      <text class="orient-trace-map-label" x="${width - right}" y="${height - 10}" text-anchor="end">CW</text>
      <text class="orient-trace-map-label" x="8" y="${top + 8}">LONG</text>
      <text class="orient-trace-map-label" x="8" y="${height - bottom}">SHORT</text>
      ${points}
    </svg>`;
  }

  function buildModel(records = []) {
    const items = sorted(records);
    return {
      records: items,
      relationCount: items.length,
      observation: sessionObservation(items),
      confidence: confidenceNote(items),
      contrast: contrastSummary(items),
      probe: probeSummary(items)
    };
  }

  function render({ shell, records, sessionPlan, skipped = 0, onAnotherField, onReturn } = {}) {
    if (!shell?.field || !shell?.setTask || !shell?.setReadout || !shell?.setActions) return false;
    const model = buildModel(records);
    if (!model.records.length) return false;

    shell.field.innerHTML = `<div class="orient-trace-workspace">
      <header class="orient-trace-hero"><div class="play-trace-title">YOUR SPATIAL TRACE</div><p>Individual evidence first. Not a score.</p></header>
      <section class="orient-trace-cards" aria-label="Five committed relation records">${model.records.map(miniField).join('')}</section>
      <section class="orient-trace-map-section"><div class="play-kicker">RESIDUAL MAP</div><p>Each numbered point is one committed relation. Axes use fixed scales: bearing ±90°, distance ±50%.</p>${residualMap(model.records)}</section>
    </div>`;

    const contrast = model.contrast ? `<section class="orient-trace-section"><div class="play-kicker">CONTRAST · ${escapeHtml(model.contrast.changed)}</div><div class="orient-trace-compare"><div><span>BASELINE</span><strong>${escapeHtml(model.contrast.baseline.distance)}</strong><small>${escapeHtml(model.contrast.baseline.bearing)}</small></div><div><span>CONTRAST</span><strong>${escapeHtml(model.contrast.contrast.distance)}</strong><small>${escapeHtml(model.contrast.contrast.bearing)}</small></div></div><p>${escapeHtml(model.contrast.note)}</p></section>` : '';
    const probe = model.probe ? `<section class="orient-trace-section"><div class="play-kicker">FINAL PROBE · ${escapeHtml(upper(model.probe.axis))}</div><div class="orient-trace-compare"><div><span>EARLIER</span><strong>${escapeHtml(model.probe.earlier)}</strong></div><div><span>THIS RELATION</span><strong>${escapeHtml(model.probe.final)}</strong></div></div><p>${escapeHtml(model.probe.note)}</p></section>` : '';

    shell.setTask(`<div class="play-kicker">YOUR TRACE</div><p>${model.relationCount} committed relations. Session-level observations stay attached to their evidence.</p>`);
    shell.setReadout(`<section class="orient-trace-section"><div class="play-kicker">SESSION OBSERVATION</div><div class="orient-trace-observations"><strong>${escapeHtml(model.observation.distance)}</strong><strong>${escapeHtml(model.observation.bearing)}</strong></div><p>THIS SESSION ONLY · ${model.relationCount} RELATIONS</p></section>
      <section class="orient-trace-section"><div class="play-kicker">CONFIDENCE NOTE</div><strong class="orient-trace-note-head">${escapeHtml(model.confidence.headline)}</strong><p>${escapeHtml(model.confidence.detail)}</p></section>
      ${contrast}${probe}`);
    shell.setConditions([
      ['RELATIONS', String(model.relationCount)],
      ['UNFAMILIAR REPLACED', String(skipped)],
      ['MODEL', 'SPHERICAL EARTH'],
      ['EVIDENCE', 'SESSION OBSERVATION'],
      ['SESSION', String(sessionPlan?.seed || '').slice(0, 12).toUpperCase()]
    ]);
    shell.setFieldNote('NOT A SCORE · INDIVIDUAL EVIDENCE → SESSION OBSERVATION');
    shell.setActions([
      { label: 'ANOTHER FIELD', secondary: true, onClick: onAnotherField },
      { label: 'RETURN TO LAB', onClick: onReturn }
    ]);
    shell.root.dataset.orientTraceViewVersion = VERSION;
    return true;
  }

  orient.traceView = Object.freeze({
    version: VERSION,
    sorted,
    distanceLabel,
    bearingLabel,
    sessionObservation,
    confidenceNote,
    contrastSummary,
    probeSummary,
    residualMap,
    buildModel,
    render
  });
})();
