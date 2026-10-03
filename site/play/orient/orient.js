(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const PLACES_URL = 'play/orient/data/places.v1.json';
  const RELATIONS_URL = 'play/orient/data/relations.v1.json';
  const HISTORY_KEY = 'geogeek.play.orient.history.v1';
  const HISTORY_VERSION = 'orient-history-1';
  const HISTORY_LIMIT = 32;

  const orient = window.GeoPlay?.orient;
  const geometry = orient?.geometry;
  const config = orient?.config;
  const metrics = orient?.metrics;
  const contentModel = orient?.contentModel;
  const sessionComposer = orient?.session;
  if (!geometry || !config || !metrics) throw new Error('ORIENT domain modules unavailable.');
  const {
    MAX_GREAT_CIRCLE_DISTANCE_KM: MAX_DISTANCE_KM,
    haversine,
    initialBearing,
    normalizeBearing
  } = geometry;
  const { computeResidual } = metrics;

  const FALLBACK_PLACES = {
    nairobi: { label: 'Nairobi', lat: -1.2921, lon: 36.8219 },
    jakarta: { label: 'Jakarta', lat: -6.2088, lon: 106.8456 },
    paris: { label: 'Paris', lat: 48.8566, lon: 2.3522 },
    vancouver: { label: 'Vancouver', lat: 49.2827, lon: -123.1207 },
    tokyo: { label: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    lima: { label: 'Lima', lat: -12.0464, lon: -77.0428 }
  };

  const FALLBACK_TRIALS = [
    { id: 'nairobi-jakarta', relationId: 'nairobi-jakarta', role: 'orientation', from: 'nairobi', to: 'jakarta', conditions: { coast: true, graticule: false, rings: false } },
    { id: 'paris-vancouver', relationId: 'paris-vancouver', role: 'baseline', from: 'paris', to: 'vancouver', conditions: { coast: false, graticule: false, rings: false } },
    { id: 'tokyo-lima', relationId: 'tokyo-lima', role: 'challenge', from: 'tokyo', to: 'lima', conditions: { coast: false, graticule: false, rings: true } }
  ];

  const toRad = degrees => degrees * Math.PI / 180;

  function fmtKm(value) {
    return `${Math.round(Math.abs(value)).toLocaleString()} KM`;
  }

  function mean(values) {
    return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
  }

  function normalizeSeed(value) {
    const text = String(value ?? '').trim().slice(0, 64);
    return text || null;
  }

  function randomSeed() {
    try {
      if (window.crypto?.getRandomValues) {
        const words = new Uint32Array(2);
        window.crypto.getRandomValues(words);
        return `${words[0].toString(36)}-${words[1].toString(36)}`;
      }
    } catch (_) {}
    return `${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffffff).toString(36)}`;
  }

  function seedFromUrl() {
    return normalizeSeed(new URLSearchParams(location.search).get('orientSeed'));
  }

  function syncSeedToUrl(seed) {
    try {
      const url = new URL(location.href);
      url.searchParams.set('orientSeed', seed);
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    } catch (_) {}
  }

  function readHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(HISTORY_KEY) || 'null');
      if (!parsed || parsed.version !== HISTORY_VERSION || !Array.isArray(parsed.relationIds)) return [];
      return parsed.relationIds.filter(value => typeof value === 'string').slice(-HISTORY_LIMIT);
    } catch (_) {
      return [];
    }
  }

  function rememberRelation(relationId) {
    if (!relationId || typeof relationId !== 'string') return;
    try {
      const previous = readHistory().filter(id => id !== relationId);
      previous.push(relationId);
      localStorage.setItem(HISTORY_KEY, JSON.stringify({ version: HISTORY_VERSION, relationIds: previous.slice(-HISTORY_LIMIT) }));
    } catch (_) {}
  }

  async function fetchJson(url, signal) {
    const response = await fetch(url, { signal, cache: 'no-cache' });
    if (!response.ok) throw new Error(`${url} ${response.status}`);
    return response.json();
  }

  async function loadSessionAssets(signal) {
    if (!contentModel || !sessionComposer) throw new Error('ORIENT session modules unavailable.');
    const placeArtifact = await fetchJson(PLACES_URL, signal);
    let relationArtifact;
    try {
      relationArtifact = await fetchJson(RELATIONS_URL, signal);
    } catch (error) {
      if (signal?.aborted) throw error;
      // Source-mode/local servers may not materialize the generated relation
      // artifact. Derivation from the versioned place file is deterministic.
      relationArtifact = contentModel.buildRelationArtifact(placeArtifact);
    }
    if (!Array.isArray(relationArtifact?.relations) || !relationArtifact.relations.length) {
      relationArtifact = contentModel.buildRelationArtifact(placeArtifact);
    }
    return { placeArtifact, relationArtifact };
  }

  function runtimePlaces(placeArtifact) {
    return Object.fromEntries((placeArtifact?.places || []).map(place => [place.id, {
      label: place.label,
      lat: Number(place.location?.lat),
      lon: Number(place.location?.lon)
    }]));
  }

  function fallbackRuntime(seed, reason) {
    return {
      plan: {
        version: 'orient-session-fallback-1',
        seed,
        contentVersion: 'fallback-release-pairs',
        difficultyModelVersion: null,
        historyApplied: false,
        fallback: true,
        fallbackReason: reason || 'content-unavailable',
        trials: FALLBACK_TRIALS.map((trial, index) => ({ ...trial, slot: index + 1 }))
      },
      places: { ...FALLBACK_PLACES }
    };
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

    const requestedSeed = seedFromUrl();
    let sessionSeed = requestedSeed || randomSeed();
    let sessionAssets = null;

    async function prepareSession(seed, { applyHistory = true } = {}) {
      try {
        if (!sessionAssets) sessionAssets = await loadSessionAssets(signal);
        const composer = applyHistory && typeof sessionComposer.composeFreshSession === 'function'
          ? sessionComposer.composeFreshSession
          : sessionComposer.composeSession;
        const plan = composer({
          seed,
          placeArtifact: sessionAssets.placeArtifact,
          relationArtifact: sessionAssets.relationArtifact,
          recentRelationIds: applyHistory ? readHistory() : []
        });
        return { plan, places: runtimePlaces(sessionAssets.placeArtifact) };
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[GeoGeek] ORIENT content session unavailable; using release-pair fallback.', error);
        return fallbackRuntime(seed, error?.message || 'content-unavailable');
      }
    }

    let land;
    let runtime;
    try {
      [land, runtime] = await Promise.all([
        loadWorld(signal),
        prepareSession(sessionSeed, { applyHistory: !requestedSeed })
      ]);
    } catch (error) {
      if (!signal?.aborted) shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return () => {};
    }
    if (signal?.aborted) return () => {};

    sessionSeed = runtime.plan.seed || sessionSeed;
    syncSeedToUrl(sessionSeed);

    const d3 = window.d3;
    const width = 800; const height = 800; const cx = 400; const cy = 400; const radius = 342;
    let trialIndex = 0;
    let estimate = null;
    let current = null;
    let sessionRecords = [];
    let dragging = false;
    let projection = null;
    let judgmentLine = null;
    let judgmentPoint = null;
    let hit = null;
    let sessionPlan = runtime.plan;
    let sessionTrials = runtime.plan.trials;
    let placeLookup = runtime.places;
    let svg = null;

    function createMap() {
      const map = d3.select(shell.field).append('svg')
        .attr('class', 'orient-map')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'application')
        .attr('tabindex', '0')
        .attr('aria-label', 'ORIENT reference field. Drag from the reference point to estimate the target relation.');
      map.on('keydown', handleKeydown);
      return map;
    }

    function applyRuntime(nextRuntime) {
      sessionPlan = nextRuntime.plan;
      sessionTrials = nextRuntime.plan.trials;
      placeLookup = nextRuntime.places;
      shell.root.dataset.orientSeed = sessionPlan.seed;
      shell.root.dataset.orientSessionVersion = sessionPlan.version;
      shell.root.dataset.orientFallback = sessionPlan.fallback ? 'true' : 'false';
    }

    applyRuntime(runtime);
    svg = createMap();

    const conditionsFor = trial => [
      ['PROJECTION', 'AZIMUTHAL EQUIDISTANT'],
      ['ROLE', String(trial.role || 'relation').toUpperCase()],
      ['REFERENCE', placeLookup[trial.from].label.toUpperCase()],
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
        bearingDeg: initialBearing(current.from, coordinate)
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
      const trial = sessionTrials[trialIndex];
      if (!trial) {
        shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>Session content could not be resolved.</p></div>';
        shell.setActions([{ label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }]);
        return;
      }
      const from = placeLookup[trial.from]; const to = placeLookup[trial.to];
      if (!from || !to) {
        shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>Session content could not be resolved.</p></div>';
        shell.setActions([{ label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }]);
        return;
      }
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
      shell.setFieldNote(`RELATION ${trialIndex + 1} / ${sessionTrials.length} · ${String(trial.role || 'relation').toUpperCase()} · DRAG FROM REFERENCE`);
      renderJudgeActions();
      requestAnimationFrame(() => machine.set('judge'));
    }

    function commit() {
      if (!estimate || machine.state !== 'judge') return;
      machine.set('commit');
      hit?.style('pointer-events', 'none');

      const trueDistance = haversine(current.from, current.to);
      const trueBearing = initialBearing(current.from, current.to);
      const residual = computeResidual({
        estimateDistanceKm: estimate.distanceKm,
        estimateBearingDeg: estimate.bearingDeg,
        truthDistanceKm: trueDistance,
        truthBearingDeg: trueBearing
      });
      const distanceResidual = residual.distanceResidualKm;
      const bearingResidual = residual.bearingResidualDeg;
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
        relationId: current.trial.relationId || current.trial.id,
        session: {
          version: sessionPlan.version,
          seed: sessionPlan.seed,
          contentVersion: sessionPlan.contentVersion,
          slot: current.trial.slot || trialIndex + 1,
          role: current.trial.role || 'relation',
          fallback: Boolean(sessionPlan.fallback)
        },
        judgment: { distanceKm: estimate.distanceKm, bearingDeg: estimate.bearingDeg },
        relation: { distanceKm: trueDistance, bearingDeg: trueBearing },
        result: {
          distanceResidualKm: distanceResidual,
          distanceRatio: residual.distanceRatio,
          bearingResidualDeg: bearingResidual
        },
        difficulty: current.trial.difficulty ? { ...current.trial.difficulty } : null,
        conditions: { before: { ...current.trial.conditions }, after: null },
        effect: {}
      };
      sessionRecords.push(record);
      GeoPlay.trace.append(record);
      if (!sessionPlan.fallback) rememberRelation(record.relationId);

      machine.set('compare');
      const distanceWord = residual.distanceClass.toUpperCase();
      const bearingWord = residual.bearingClass.toUpperCase();
      shell.setReadout(`
        <div class="play-kicker">RESIDUAL</div>
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE</span><strong>${distanceResidual >= 0 ? '+' : '−'}${fmtKm(distanceResidual)}</strong><em>${distanceWord}</em></div>
          <div class="play-metric"><span>BEARING</span><strong>${bearingResidual >= 0 ? '+' : '−'}${Math.abs(bearingResidual).toFixed(1)}°</strong><em>${bearingWord}</em></div>
        </div>`);
      shell.setFieldNote('JUDGMENT / WHITE · RELATION / SIGNAL');

      if (trialIndex < sessionTrials.length - 1) {
        shell.setActions([{ label: 'NEXT RELATION →', onClick: () => { trialIndex += 1; drawTrial(); } }]);
      } else {
        shell.setActions([{ label: 'VIEW TRACE →', onClick: showTrace }]);
      }
    }

    function showTrace() {
      machine.set('trace');
      hit?.on('pointerdown pointermove pointerup pointercancel', null);
      const distanceBias = mean(sessionRecords.map(record => record.result.distanceRatio)) * 100;
      const bearingBias = mean(sessionRecords.map(record => record.result.bearingResidualDeg));
      const distanceThreshold = config.legacyTrace.distanceBalancedRatio * 100;
      const bearingThreshold = config.legacyTrace.bearingBalancedDeg;
      const distanceWord = distanceBias > distanceThreshold ? 'LONG' : distanceBias < -distanceThreshold ? 'SHORT' : 'BALANCED';
      const bearingWord = bearingBias > bearingThreshold ? 'CLOCKWISE' : bearingBias < -bearingThreshold ? 'COUNTERCLOCKWISE' : 'BALANCED';
      const relationCount = sessionRecords.length;

      shell.field.innerHTML = `
        <div style="display:grid;place-items:center;width:100%;height:100%;padding:32px;text-align:center">
          <div><div class="play-trace-title">YOUR SPATIAL TRACE</div><p style="max-width:420px;margin:12px auto 0;color:rgba(241,239,231,.58);font:450 12px/1.6 var(--sans)">Not a score. A record of what changed across ${relationCount} reference fields.</p></div>
        </div>`;
      shell.setTask(`<div class="play-kicker">YOUR TRACE</div><p>${relationCount} committed relations.</p>`);
      shell.setReadout(`
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE TENDENCY</span><strong>${distanceBias >= 0 ? '+' : '−'}${Math.abs(distanceBias).toFixed(1)}%</strong><em>${distanceWord}</em></div>
          <div class="play-metric"><span>BEARING TENDENCY</span><strong>${bearingBias >= 0 ? '+' : '−'}${Math.abs(bearingBias).toFixed(1)}°</strong><em>${bearingWord}</em></div>
        </div>`);
      shell.setConditions([
        ['RELATIONS', String(relationCount)],
        ['MODEL', 'SPHERICAL EARTH'],
        ['RESULT', 'OBSERVATIONAL'],
        ['SESSION', String(sessionPlan.seed).slice(0, 12).toUpperCase()]
      ]);
      shell.setFieldNote('NOT A SCORE · A RECORD OF WHAT CHANGED');
      shell.setActions([
        { label: 'ANOTHER FIELD', secondary: true, onClick: startAnotherField },
        { label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }
      ]);
    }

    async function startAnotherField() {
      machine.set('observe');
      shell.setTask('<div class="play-kicker">CALIBRATING NEXT FIELD…</div>');
      shell.setReadout('');
      shell.setActions([]);
      sessionSeed = randomSeed();
      const nextRuntime = await prepareSession(sessionSeed, { applyHistory: true });
      if (signal?.aborted) return;
      sessionSeed = nextRuntime.plan.seed || sessionSeed;
      syncSeedToUrl(sessionSeed);
      trialIndex = 0;
      sessionRecords = [];
      shell.field.innerHTML = '';
      applyRuntime(nextRuntime);
      svg = createMap();
      drawTrial();
    }

    function handleKeydown(event) {
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
      bearing = normalizeBearing(bearing);
      distance = GeoPlay.core.clamp(distance, 0, MAX_DISTANCE_KM * .985);
      updateEstimate(endpointFromPolar(distance, bearing));
    }

    drawTrial();
    return () => {
      dragging = false;
      svg?.on('keydown', null);
      hit?.on('pointerdown pointermove pointerup pointercancel', null);
      stage.innerHTML = '';
    };
  }

  function register() {
    const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
    mounts.locate = mountOrient;
  }

  window.GeoPlayOrient = {
    mount: mountOrient,
    register,
    fallbackTrials: FALLBACK_TRIALS,
    sessionVersion: sessionComposer?.SESSION_VERSION || 'fallback'
  };
  register();
})();
