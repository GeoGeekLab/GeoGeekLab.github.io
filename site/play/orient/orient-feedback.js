(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  if (orient.feedback?.version === 'orient-feedback-1') return;

  const geometry = orient.geometry;
  const trace = root.trace;
  const MAX_DISTANCE_KM = Number(geometry?.MAX_GREAT_CIRCLE_DISTANCE_KM) || Math.PI * 6371;
  const signedAngle = typeof geometry?.signedAngle === 'function'
    ? geometry.signedAngle
    : angle => ((Number(angle) + 180) % 360 + 360) % 360 - 180;
  const SVG_NS = 'http://www.w3.org/2000/svg';
  const VERSION = 'orient-feedback-1';

  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const round = (value, digits = 1) => Number(value).toFixed(digits);
  const upper = value => String(value || '').toUpperCase();

  function signedKilometres(value) {
    if (!finite(value)) return '—';
    const sign = value > 0 ? '+' : value < 0 ? '−' : '';
    return `${sign}${Math.round(Math.abs(value)).toLocaleString('en-US')} KM`;
  }

  function percentMagnitude(value) {
    if (!finite(value)) return '—';
    const percent = Math.abs(value) * 100;
    return percent >= 10 ? `${Math.round(percent)}%` : `${round(percent, 1)}%`;
  }

  function distanceFeedback(record) {
    const residual = record?.residual || {};
    const classification = String(residual.distanceClass || '').toLowerCase();
    const ratio = Number(residual.distanceRatio);
    const kilometres = Number(residual.distanceKm);
    if (!finite(ratio)) return null;
    if (classification === 'near') {
      return {
        primary: 'NEAR',
        secondary: `${percentMagnitude(ratio)} · ${signedKilometres(kilometres)}`,
        classification: 'near'
      };
    }
    const word = classification === 'short' ? 'SHORT' : 'LONG';
    return {
      primary: `${percentMagnitude(ratio)} ${word}`,
      secondary: `${signedKilometres(kilometres)} · RELATIVE DISTANCE`,
      classification: word.toLowerCase()
    };
  }

  function bearingFeedback(record) {
    const residual = record?.residual || {};
    const classification = String(residual.bearingClass || '').toLowerCase();
    const degrees = Number(residual.bearingDeg);
    if (!finite(degrees)) return null;
    const magnitude = `${round(Math.abs(degrees), 1)}°`;
    if (classification === 'aligned') {
      return { primary: 'ALIGNED', secondary: `${magnitude} RESIDUAL`, classification: 'aligned' };
    }
    const word = classification === 'counterclockwise' ? 'COUNTERCLOCKWISE' : 'CLOCKWISE';
    return { primary: `${magnitude} ${word}`, secondary: 'ANGULAR RESIDUAL', classification: word.toLowerCase() };
  }

  function polarPoint(cx, cy, radius, bearingDeg) {
    const radians = Number(bearingDeg) * Math.PI / 180;
    return {
      x: Number(cx) + Math.sin(radians) * Number(radius),
      y: Number(cy) - Math.cos(radians) * Number(radius)
    };
  }

  function bearingArc({ cx, cy, radius, truthBearingDeg, judgmentBearingDeg } = {}) {
    const truth = Number(truthBearingDeg);
    const judgment = Number(judgmentBearingDeg);
    if (![cx, cy, radius, truth, judgment].every(value => Number.isFinite(Number(value)))) return null;
    const delta = signedAngle(judgment - truth);
    if (!finite(delta)) return null;
    const start = polarPoint(cx, cy, radius, truth);
    const end = polarPoint(cx, cy, radius, truth + delta);
    const mid = polarPoint(cx, cy, Number(radius) + 18, truth + delta / 2);
    const path = Math.abs(delta) < 0.05
      ? ''
      : `M ${round(start.x, 2)} ${round(start.y, 2)} A ${round(radius, 2)} ${round(radius, 2)} 0 0 ${delta >= 0 ? 1 : 0} ${round(end.x, 2)} ${round(end.y, 2)}`;
    return { deltaDeg: delta, start, end, mid, path };
  }

  function distanceSegment({ cx, cy, radius, truthBearingDeg, truthDistanceKm, judgmentDistanceKm } = {}) {
    const truthDistance = Number(truthDistanceKm);
    const judgmentDistance = Number(judgmentDistanceKm);
    if (![cx, cy, radius, truthBearingDeg, truthDistance, judgmentDistance].every(value => Number.isFinite(Number(value)))) return null;
    const truthRadius = clamp(truthDistance / MAX_DISTANCE_KM, 0, 1) * Number(radius);
    const judgmentRadius = clamp(judgmentDistance / MAX_DISTANCE_KM, 0, .985) * Number(radius);
    const truth = polarPoint(cx, cy, truthRadius, truthBearingDeg);
    const judgmentAtTruthBearing = polarPoint(cx, cy, judgmentRadius, truthBearingDeg);
    const midRadius = (truthRadius + judgmentRadius) / 2;
    const midBearing = Number(truthBearingDeg) + 3;
    const label = polarPoint(cx, cy, midRadius, midBearing);
    return { truthRadius, judgmentRadius, truth, judgmentAtTruthBearing, label };
  }

  function probeComparison(record, records = []) {
    const adaptation = record?.trial?.adaptation;
    const slot = Number(record?.trial?.slot);
    if (slot !== 5 || !adaptation?.axis) return null;
    const axis = adaptation.axis === 'bearing' ? 'bearing' : 'distance';
    const field = axis === 'bearing' ? 'bearingClass' : 'distanceClass';
    const earlier = records.filter(item => Number(item?.trial?.slot) >= 1 && Number(item?.trial?.slot) <= 4);
    const finalDirection = String(record?.residual?.[field] || 'mixed').toLowerCase();
    const direction = String(adaptation.direction || 'mixed').toLowerCase();
    if (adaptation.mode === 'confirmation' || direction === 'mixed') {
      return {
        axis,
        earlier: 'NO CLEAR DIRECTION',
        final: upper(finalDirection),
        note: 'DESCRIPTIVE · ONE FRESH RELATION'
      };
    }
    const count = earlier.filter(item => String(item?.residual?.[field] || '').toLowerCase() === direction).length;
    return {
      axis,
      earlier: `${count} / 4 ${upper(direction)}`,
      final: upper(finalDirection),
      note: 'DESCRIPTIVE · NOT A LEARNING SCORE'
    };
  }

  function findMetric(readout, label) {
    return [...(readout?.querySelectorAll('.play-metric') || [])].find(metric => metric.querySelector('span')?.textContent.trim() === label) || null;
  }

  function rewriteReadout(shell, record, records) {
    const readout = shell.querySelector('.play-readout');
    if (!readout) return;
    const distance = distanceFeedback(record);
    const bearing = bearingFeedback(record);
    const distanceMetric = findMetric(readout, 'DISTANCE');
    const bearingMetric = findMetric(readout, 'BEARING');
    const confidenceMetric = findMetric(readout, 'CONFIDENCE');

    if (distanceMetric && distance) {
      distanceMetric.dataset.residualClass = distance.classification;
      distanceMetric.querySelector('strong').textContent = distance.primary;
      distanceMetric.querySelector('em').textContent = distance.secondary;
    }
    if (bearingMetric && bearing) {
      bearingMetric.dataset.residualClass = bearing.classification;
      bearingMetric.querySelector('strong').textContent = bearing.primary;
      bearingMetric.querySelector('em').textContent = bearing.secondary;
    }
    if (confidenceMetric) {
      const em = confidenceMetric.querySelector('em');
      if (em) em.textContent = 'SET BEFORE REVEAL';
    }

    let key = readout.querySelector('.orient-feedback-key');
    if (!key) {
      key = document.createElement('div');
      key.className = 'orient-feedback-key';
      key.setAttribute('aria-hidden', 'true');
      key.innerHTML = '<div><strong>ANGLE</strong><span>BEARING ERROR</span></div><div><strong>RADIAL</strong><span>DISTANCE ERROR</span></div>';
      readout.appendChild(key);
    }

    const comparison = probeComparison(record, records);
    readout.querySelector('.orient-probe-comparison')?.remove();
    if (comparison) {
      const block = document.createElement('div');
      block.className = 'orient-probe-comparison';
      block.innerHTML = `<div class="play-kicker">FINAL PROBE · ${upper(comparison.axis)}</div><div class="orient-probe-grid"><span>EARLIER</span><strong>${comparison.earlier}</strong><span>THIS RELATION</span><strong>${comparison.final}</strong></div><small>${comparison.note}</small>`;
      readout.appendChild(block);
    }
  }

  function svgElement(name, className) {
    const node = document.createElementNS(SVG_NS, name);
    if (className) node.setAttribute('class', className);
    return node;
  }

  function renderVisual(shell, record) {
    const svg = shell.querySelector('svg.orient-map');
    if (!svg || !svg.querySelector('.orient-truth')) return false;
    const reference = svg.querySelector('.orient-reference');
    const extent = svg.querySelector('.orient-extent');
    if (!reference || !extent) return false;

    svg.querySelector('.orient-feedback-layer')?.remove();
    const cx = Number(reference.getAttribute('cx'));
    const cy = Number(reference.getAttribute('cy'));
    const fieldRadius = Number(extent.getAttribute('r'));
    const judgmentBearing = Number(record?.judgment?.bearingDeg);
    const truthBearing = Number(record?.relation?.bearingDeg);
    const judgmentDistance = Number(record?.judgment?.distanceKm);
    const truthDistance = Number(record?.relation?.distanceKm);
    if (![cx, cy, fieldRadius, judgmentBearing, truthBearing, judgmentDistance, truthDistance].every(finite)) return false;

    const layer = svgElement('g', 'orient-feedback-layer');
    layer.setAttribute('aria-hidden', 'true');
    layer.dataset.recordId = record.recordId || '';

    const angleRadius = clamp(Math.min(fieldRadius * .24, 84), 58, 84);
    const arc = bearingArc({ cx, cy, radius: angleRadius, truthBearingDeg: truthBearing, judgmentBearingDeg: judgmentBearing });
    if (arc) {
      const path = svgElement('path', 'orient-angle');
      path.setAttribute('d', arc.path);
      path.dataset.deltaDeg = String(arc.deltaDeg);
      layer.appendChild(path);

      const label = svgElement('text', 'orient-feedback-label orient-angle-label');
      label.setAttribute('x', round(arc.mid.x, 2));
      label.setAttribute('y', round(arc.mid.y, 2));
      label.setAttribute('text-anchor', 'middle');
      label.textContent = bearingFeedback(record)?.primary || 'BEARING';
      layer.appendChild(label);
    }

    const segment = distanceSegment({
      cx,
      cy,
      radius: fieldRadius,
      truthBearingDeg: truthBearing,
      truthDistanceKm: truthDistance,
      judgmentDistanceKm: judgmentDistance
    });
    if (segment) {
      const line = svgElement('line', 'orient-distance-residual');
      line.setAttribute('x1', round(segment.truth.x, 2));
      line.setAttribute('y1', round(segment.truth.y, 2));
      line.setAttribute('x2', round(segment.judgmentAtTruthBearing.x, 2));
      line.setAttribute('y2', round(segment.judgmentAtTruthBearing.y, 2));
      layer.appendChild(line);

      [segment.truth, segment.judgmentAtTruthBearing].forEach(point => {
        const cap = svgElement('circle', 'orient-distance-residual-cap');
        cap.setAttribute('cx', round(point.x, 2));
        cap.setAttribute('cy', round(point.y, 2));
        cap.setAttribute('r', '3');
        layer.appendChild(cap);
      });

      const label = svgElement('text', 'orient-feedback-label orient-distance-label');
      label.setAttribute('x', round(segment.label.x, 2));
      label.setAttribute('y', round(segment.label.y, 2));
      label.textContent = distanceFeedback(record)?.primary || 'DISTANCE';
      layer.appendChild(label);
    }

    svg.appendChild(layer);
    return true;
  }

  function recordsForShell(shell) {
    if (!trace?.forPlay) return [];
    const sessionId = shell.dataset.orientSessionId;
    if (!sessionId) return [];
    return trace.forPlay('orient')
      .filter(record => record?.version === 2 && record.sessionId === sessionId && record.recordId)
      .sort((a, b) => Number(a.trial?.slot || 0) - Number(b.trial?.slot || 0));
  }

  function enhanceShell(shell) {
    if (!shell?.isConnected || !shell.querySelector('.orient-truth')) return false;
    const records = recordsForShell(shell);
    const record = records.at(-1);
    if (!record) return false;
    if (shell.dataset.orientFeedbackRecordId === record.recordId && shell.querySelector('.orient-feedback-layer')) return true;
    if (!renderVisual(shell, record)) return false;
    rewriteReadout(shell, record, records);
    shell.dataset.orientFeedbackVersion = VERSION;
    shell.dataset.orientFeedbackRecordId = record.recordId;
    return true;
  }

  function sweep() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.play-shell[data-play-kind="orient"]').forEach(enhanceShell);
  }

  let observer = null;
  function install() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || observer) return;
    observer = new MutationObserver(() => queueMicrotask(sweep));
    observer.observe(document.documentElement, { childList: true, subtree: true });
    queueMicrotask(sweep);
  }

  orient.feedback = Object.freeze({
    version: VERSION,
    distanceFeedback,
    bearingFeedback,
    polarPoint,
    bearingArc,
    distanceSegment,
    probeComparison,
    enhanceShell,
    install
  });

  install();
})();
