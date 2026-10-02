(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const EARTH_RADIUS_KM = 6371;
  const MAX_DISTANCE_KM = Math.PI * EARTH_RADIUS_KM;

  const PLACES = {
    nairobi: { label: 'Nairobi', lat: -1.2921, lon: 36.8219 },
    jakarta: { label: 'Jakarta', lat: -6.2088, lon: 106.8456 },
    paris: { label: 'Paris', lat: 48.8566, lon: 2.3522 },
    vancouver: { label: 'Vancouver', lat: 49.2827, lon: -123.1207 },
    tokyo: { label: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    lima: { label: 'Lima', lat: -12.0464, lon: -77.0428 }
  };

  const TRIALS = [
    { id: 'nairobi-jakarta', from: 'nairobi', to: 'jakarta', conditions: { coast: true, graticule: false, rings: false } },
    { id: 'paris-vancouver', from: 'paris', to: 'vancouver', conditions: { coast: false, graticule: false, rings: false } },
    { id: 'tokyo-lima', from: 'tokyo', to: 'lima', conditions: { coast: false, graticule: false, rings: true } }
  ];

  const toRad = degrees => degrees * Math.PI / 180;
  function haversine(a, b) {
    const p1 = toRad(a.lat); const p2 = toRad(b.lat);
    const dp = toRad(b.lat - a.lat); const dl = toRad(b.lon - a.lon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  }

  function bearingTo(a, b) {
    const y = Math.sin(toRad(b.lon - a.lon)) * Math.cos(toRad(b.lat));
    const x = Math.cos(toRad(a.lat)) * Math.sin(toRad(b.lat)) - Math.sin(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.cos(toRad(b.lon - a.lon));
    return (Math.atan2(y, x) * 180 / Math.PI + 360) % 360;
  }

  function signedAngle(value) {
    return ((value + 540) % 360) - 180;
  }

  function fmtKm(value) {
    return `${Math.round(Math.abs(value)).toLocaleString()} KM`;
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  async function loadWorld(signal) {
    const core = window.GeoPlay?.core;
    if (!core) throw new Error('GeoPlay core unavailable.');
    await Promise.all([
      core.loadScript(D3_CDN, 'd3'),
      core.loadScript(TOPOJSON_CDN, 'topojson')
    ]);
    const response = await fetch(WORLD_ATLAS, { mode: 'cors', signal });
    if (!response.ok) throw new Error(`world-atlas ${response.status}`);
    const topology = await response.json();
    const landObject = topology.objects.land || topology.objects.countries;
    return window.topojson.feature(topology, landObject);
  }

  async function mountOrient({ signal, stage } = {}) {
    const GeoPlay = window.GeoPlay;
    if (!GeoPlay?.core || !GeoPlay?.shell || !GeoPlay?.trace) throw new Error('GeoPlay runtime incomplete.');
    GeoPlay.core.ensureStyle('play/play.css?v=20261002a', 'play');

    const shell = GeoPlay.shell.create(stage, {
      kind: 'orient',
      triad: 'POINT / REFERENCE / ERROR'
    });
    const machine = GeoPlay.core.createStateMachine({
      initial: 'observe',
      onChange: state => shell.setState(state)
    });

    shell.setTask('<div class="play-kicker">CALIBRATING FIELD…</div>');
    shell.setReadout('');
    shell.setConditions([['PROJECTION', 'AZIMUTHAL EQUIDISTANT']]);
    shell.setActions([]);

    let land;
    try {
      land = await loadWorld(signal);
    } catch (error) {
      if (!signal?.aborted) shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return () => {};
    }
    if (signal?.aborted) return () => {};

    const d3 = window.d3;
    const width = 800; const height = 800; const cx = 400; const cy = 400; const radius = 342;
    const svg = d3.select(shell.field).append('svg')
      .attr('class', 'orient-map')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('role', 'application')
      .attr('tabindex', '0')
      .attr('aria-label', 'ORIENT reference field. Drag from the reference point to estimate the target relation.');

    let trialIndex = 0;
    let estimate = null;
    let current = null;
    let sessionRecords = [];
    let dragging = false;
    let projection = null;
    let judgmentLine = null;
    let judgmentPoint = null;
    let hit = null;

    const conditionsFor = trial => [
      ['PROJECTION', 'AZIMUTHAL EQUIDISTANT'],
      ['REFERENCE', PLACES[trial.from].label.toUpperCase()],
      ['COAST', trial.conditions.coast ? 'ON' : 'OFF'],
      ['GRATICULE', trial.conditions.graticule ? 'ON' : 'OFF'],
      ['DISTANCE RINGS', trial.conditions.rings ? 'ON' : 'OFF']
    ];

    function endpointFromPolar(distanceKm, bearingDeg) {
      const r = GeoPlay.core.clamp(distanceKm / MAX_DISTANCE_KM, 0, .985) * radius;
      const theta = toRad(bearingDeg);
      return [cx + Math.sin(theta) * r, cy - Math.cos(theta) * r];
    }

    function updateEstimate(point) {
      if (machine.state !== 'judge') return;
      const dx = point[0] - cx; const dy = point[1] - cy;
      const length = Math.hypot(dx, dy) || 1;
      const factor = Math.min(1, radius * .985 / length);
      const end = [cx + dx * factor, cy + dy * factor];
      const lonlat = projection.invert(end);
      if (!lonlat) return;
      const [lon, lat] = lonlat;
      const coordinate = { lat, lon };
      estimate = {
        point: end,
        coordinate,
        distanceKm: haversine(current.from, coordinate),
        bearingDeg: bearingTo(current.from, coordinate)
      };
      judgmentLine.attr('x2', end[0]).attr('y2', end[1]).attr('opacity', 1);
      judgmentPoint.attr('cx', end[0]).attr('cy', end[1]).attr('opacity', 1);
      renderJudgeActions();
    }

    function renderJudgeActions() {
      shell.setActions([
        { label: 'RESET', secondary: true, disabled: !estimate, onClick: resetEstimate },
        { label: 'COMMIT', disabled: !estimate, onClick: commit }
      ]);
    }

    function resetEstimate() {
      estimate = null;
      judgmentLine?.attr('x2', cx).attr('y2', cy).attr('opacity', 0);
      judgmentPoint?.attr('cx', cx).attr('cy', cy).attr('opacity', 0);
      renderJudgeActions();
    }

    function drawTrial() {
      machine.set('observe');
      estimate = null;
      const trial = TRIALS[trialIndex];
      const from = PLACES[trial.from]; const to = PLACES[trial.to];
      current = { trial, from, to };

      svg.selectAll('*').remove();
      projection = d3.geoAzimuthalEquidistant()
        .rotate([-from.lon, -from.lat])
        .translate([cx, cy])
        .scale(radius / Math.PI)
        .clipAngle(179.999);
      const path = d3.geoPath(projection);

      svg.append('circle').attr('class', 'orient-extent').attr('cx', cx).attr('cy', cy).attr('r', radius);

      if (trial.conditions.rings) {
        [5000, 10000, 15000].forEach(distance => {
          const ringRadius = distance / MAX_DISTANCE_KM * radius;
          svg.append('circle').attr('class', 'orient-ring').attr('cx', cx).attr('cy', cy).attr('r', ringRadius);
          svg.append('text').attr('class', 'orient-ring-label').attr('x', cx + 5).attr('y', cy - ringRadius + 12).text(`${Math.round(distance / 1000)}K KM`);
        });
      }

      if (trial.conditions.graticule) svg.append('path').datum(d3.geoGraticule10()).attr('class', 'orient-graticule').attr('d', path);
      if (trial.conditions.coast) svg.append('path').datum(land).attr('class', 'orient-land').attr('d', path);

      svg.append('line').attr('class', 'orient-axis').attr('x1', cx).attr('x2', cx).attr('y1', cy - radius + 12).attr('y2', cy - 18);
      svg.append('text').attr('class', 'orient-north').attr('x', cx).attr('y', cy - radius + 9).attr('text-anchor', 'middle').text('N');

      judgmentLine = svg.append('line').attr('class', 'orient-judgment').attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy).attr('opacity', 0);
      judgmentPoint = svg.append('circle').attr('class', 'orient-judgment-point').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('opacity', 0);
      svg.append('circle').attr('class', 'orient-reference').attr('cx', cx).attr('cy', cy).attr('r', 6);
      svg.append('text').attr('class', 'orient-reference-label').attr('x', cx).attr('y', cy + 24).attr('text-anchor', 'middle').text(from.label.toUpperCase());

      hit = svg.append('circle').attr('class', 'orient-hit').attr('cx', cx).attr('cy', cy).attr('r', radius);
      hit.on('pointerdown', event => {
        if (machine.state !== 'judge') return;
        dragging = true;
        event.preventDefault();
        hit.node()?.setPointerCapture?.(event.pointerId);
        updateEstimate(d3.pointer(event, svg.node()));
      }).on('pointermove', event => {
        if (!dragging) return;
        event.preventDefault();
        updateEstimate(d3.pointer(event, svg.node()));
      }).on('pointerup pointercancel', event => {
        if (!dragging) return;
        dragging = false;
        hit.node()?.releasePointerCapture?.(event.pointerId);
        if (event.type === 'pointerup') updateEstimate(d3.pointer(event, svg.node()));
      });

      shell.setTask(`
        <div class="play-pair"><span>FROM</span><strong>${from.label.toUpperCase()}</strong></div>
        <div class="play-pair"><span>TO</span><strong>${to.label.toUpperCase()}</strong></div>
        <p>Estimate the relation.</p>`);
      shell.setReadout('');
      shell.setConditions(conditionsFor(trial));
      shell.setFieldNote(`RELATION ${trialIndex + 1} / ${TRIALS.length} · DRAG FROM REFERENCE`);
      renderJudgeActions();
      requestAnimationFrame(() => machine.set('judge'));
    }

    function commit() {
      if (!estimate || machine.state !== 'judge') return;
      machine.set('commit');
      hit?.style('pointer-events', 'none');

      const trueDistance = haversine(current.from, current.to);
      const trueBearing = bearingTo(current.from, current.to);
      const distanceResidual = estimate.distanceKm - trueDistance;
      const bearingResidual = signedAngle(estimate.bearingDeg - trueBearing);
      const targetPoint = projection([current.to.lon, current.to.lat]);

      machine.set('reveal');
      judgmentLine.attr('opacity', .55);
      judgmentPoint.attr('opacity', .72);
      svg.insert('line', '.orient-reference')
        .attr('class', 'orient-truth')
        .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)
        .transition().duration(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520)
        .attr('x2', targetPoint[0]).attr('y2', targetPoint[1]);
      svg.insert('circle', '.orient-reference').attr('class', 'orient-target').attr('cx', targetPoint[0]).attr('cy', targetPoint[1]).attr('r', 6);
      svg.insert('text', '.orient-reference').attr('class', 'orient-target-label').attr('x', targetPoint[0] + 10).attr('y', targetPoint[1] - 10).text(current.to.label.toUpperCase());

      const record = {
        play: 'orient',
        trialId: current.trial.id,
        judgment: { distanceKm: estimate.distanceKm, bearingDeg: estimate.bearingDeg },
        relation: { distanceKm: trueDistance, bearingDeg: trueBearing },
        result: {
          distanceResidualKm: distanceResidual,
          distanceRatio: trueDistance ? distanceResidual / trueDistance : 0,
          bearingResidualDeg: bearingResidual
        },
        conditions: { before: { ...current.trial.conditions }, after: null },
        effect: {}
      };
      sessionRecords.push(record);
      GeoPlay.trace.append(record);

      machine.set('compare');
      const distanceWord = distanceResidual >= 0 ? 'LONG' : 'SHORT';
      const bearingWord = bearingResidual > 0 ? 'CLOCKWISE' : bearingResidual < 0 ? 'COUNTERCLOCKWISE' : 'ALIGNED';
      shell.setReadout(`
        <div class="play-kicker">RESIDUAL</div>
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE</span><strong>${distanceResidual >= 0 ? '+' : '−'}${fmtKm(distanceResidual)}</strong><em>${distanceWord}</em></div>
          <div class="play-metric"><span>BEARING</span><strong>${bearingResidual >= 0 ? '+' : '−'}${Math.abs(bearingResidual).toFixed(1)}°</strong><em>${bearingWord}</em></div>
        </div>`);
      shell.setFieldNote('JUDGMENT / WHITE · RELATION / SIGNAL');

      if (trialIndex < TRIALS.length - 1) {
        shell.setActions([{ label: 'NEXT RELATION →', onClick: () => { trialIndex += 1; drawTrial(); } }]);
      } else {
        shell.setActions([{ label: 'VIEW TRACE →', onClick: showTrace }]);
      }
    }

    function showTrace() {
      machine.set('trace');
      svg.on('.drag', null);
      const distanceBias = mean(sessionRecords.map(record => record.result.distanceRatio)) * 100;
      const bearingBias = mean(sessionRecords.map(record => record.result.bearingResidualDeg));
      const distanceWord = distanceBias > 1 ? 'LONG' : distanceBias < -1 ? 'SHORT' : 'BALANCED';
      const bearingWord = bearingBias > 1 ? 'CLOCKWISE' : bearingBias < -1 ? 'COUNTERCLOCKWISE' : 'BALANCED';

      shell.field.innerHTML = `
        <div style="display:grid;place-items:center;width:100%;height:100%;padding:32px;text-align:center">
          <div><div class="play-trace-title">YOUR SPATIAL TRACE</div><p style="max-width:420px;margin:12px auto 0;color:rgba(241,239,231,.58);font:450 12px/1.6 var(--sans)">Not a score. A record of what changed across three reference fields.</p></div>
        </div>`;
      shell.setTask('<div class="play-kicker">YOUR TRACE</div><p>Three committed relations.</p>');
      shell.setReadout(`
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE TENDENCY</span><strong>${distanceBias >= 0 ? '+' : '−'}${Math.abs(distanceBias).toFixed(1)}%</strong><em>${distanceWord}</em></div>
          <div class="play-metric"><span>BEARING TENDENCY</span><strong>${bearingBias >= 0 ? '+' : '−'}${Math.abs(bearingBias).toFixed(1)}°</strong><em>${bearingWord}</em></div>
        </div>`);
      shell.setConditions([['RELATIONS', String(sessionRecords.length)], ['MODEL', 'SPHERICAL EARTH'], ['RESULT', 'OBSERVATIONAL']]);
      shell.setFieldNote('NOT A SCORE · A RECORD OF WHAT CHANGED');
      shell.setActions([
        { label: 'RESTART ORIENT', secondary: true, onClick: () => { trialIndex = 0; sessionRecords = []; drawTrial(); } },
        { label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }
      ]);
    }

    svg.on('keydown', event => {
      if (machine.state !== 'judge') return;
      if (event.key === 'Enter' && estimate) { event.preventDefault(); commit(); return; }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetEstimate(); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      let distance = estimate?.distanceKm ?? 5000;
      let bearing = estimate?.bearingDeg ?? 90;
      const bearingStep = event.shiftKey ? 10 : 2;
      const distanceStep = event.shiftKey ? 1000 : 250;
      if (event.key === 'ArrowLeft') bearing -= bearingStep;
      if (event.key === 'ArrowRight') bearing += bearingStep;
      if (event.key === 'ArrowUp') distance += distanceStep;
      if (event.key === 'ArrowDown') distance -= distanceStep;
      bearing = (bearing + 360) % 360;
      distance = GeoPlay.core.clamp(distance, 0, MAX_DISTANCE_KM * .985);
      updateEstimate(endpointFromPolar(distance, bearing));
    });

    drawTrial();
    return () => {
      dragging = false;
      svg.on('keydown', null);
      hit?.on('pointerdown pointermove pointerup pointercancel', null);
      stage.innerHTML = '';
    };
  }

  function register() {
    const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
    mounts.locate = mountOrient;
  }

  window.GeoPlayOrient = { mount: mountOrient, register, trials: TRIALS, places: PLACES };
  register();
})();