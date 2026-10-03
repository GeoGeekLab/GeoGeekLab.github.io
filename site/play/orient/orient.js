(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const PLACES_URL = 'play/orient/data/places.v1.json';
  const RELATIONS_URL = 'play/orient/data/relations.v1.json';

  const orient = window.GeoPlay?.orient;
  const geometry = orient?.geometry;
  const config = orient?.config;
  const metrics = orient?.metrics;
  const contentModel = orient?.contentModel;
  const sessionComposer = orient?.session;
  const stateModel = orient?.state;
  const storage = orient?.storage;
  if (!geometry || !config || !metrics || !stateModel || !storage) throw new Error('ORIENT domain modules unavailable.');

  const {
    MAX_GREAT_CIRCLE_DISTANCE_KM: MAX_DISTANCE_KM,
    haversine,
    initialBearing,
    normalizeBearing
  } = geometry;
  const { computeResidual } = metrics;
  const { EVENTS, PHASES } = stateModel;

  const FALLBACK_PLACES = {
    nairobi: { label: 'Nairobi', lat: -1.2921, lon: 36.8219 },
    jakarta: { label: 'Jakarta', lat: -6.2088, lon: 106.8456 },
    paris: { label: 'Paris', lat: 48.8566, lon: 2.3522 },
    vancouver: { label: 'Vancouver', lat: 49.2827, lon: -123.1207 },
    tokyo: { label: 'Tokyo', lat: 35.6762, lon: 139.6503 },
    lima: { label: 'Lima', lat: -12.0464, lon: -77.0428 }
  };

  const FALLBACK_TRIALS = [
    { id: 'nairobi-jakarta', relationId: 'nairobi-jakarta', role: 'orientation', from: 'nairobi', to: 'jakarta', conditions: { coast: true, graticule: false, rings: true } },
    { id: 'paris-vancouver', relationId: 'paris-vancouver', role: 'baseline', from: 'paris', to: 'vancouver', conditions: { coast: true, graticule: false, rings: false } },
    { id: 'paris-tokyo', relationId: 'paris-tokyo', role: 'contrast', from: 'paris', to: 'tokyo', conditions: { coast: false, graticule: false, rings: false } },
    { id: 'tokyo-lima', relationId: 'tokyo-lima', role: 'challenge', from: 'tokyo', to: 'lima', conditions: { coast: false, graticule: false, rings: false } },
    { id: 'vancouver-jakarta', relationId: 'vancouver-jakarta', role: 'confirmation', from: 'vancouver', to: 'jakarta', conditions: { coast: true, graticule: false, rings: false } }
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

  function deepFreeze(value) {
    if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
    Object.freeze(value);
    Object.values(value).forEach(deepFreeze);
    return value;
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

  function fallbackRuntime(seed, reason, savedPlan = null) {
    return {
      plan: savedPlan || {
        version: 'orient-session-fallback-2',
        seed,
        targetSize: 5,
        contentVersion: 'fallback-release-pairs',
        difficultyModelVersion: null,
        adaptationStrategyVersion: null,
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
    GeoPlay.core.ensureStyle('play/orient/orient.css?v=20261003f', 'orient');

    const shell = GeoPlay.shell.create(stage, { kind: 'orient', triad: 'POINT / REFERENCE / ERROR' });
    const machine = stateModel.createMachine({ totalTrials: 0, requireConfidence: true });
    const phaseToShellState = phase => {
      if ([PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(phase)) return 'judge';
      if ([PHASES.BOOT, PHASES.PRIMER, PHASES.LOADING_TRIAL].includes(phase)) return 'observe';
      if (phase === PHASES.INSIGHT) return 'compare';
      if ([PHASES.COMMIT, PHASES.REVEAL, PHASES.COMPARE, PHASES.TRACE].includes(phase)) return phase;
      return 'observe';
    };
    const unsubscribeState = machine.subscribe(state => shell.setState(phaseToShellState(state.phase)));

    shell.setTask('<div class="play-kicker">CALIBRATING FIELD…</div>');
    shell.setReadout('');
    shell.setConditions([['PROJECTION', 'AZIMUTHAL EQUIDISTANT']]);
    shell.setActions([]);

    const requestedSeed = seedFromUrl();
    let sessionSeed = requestedSeed || randomSeed();
    let sessionAssets = null;
    let savedActive = storage.readActive();
    if (savedActive && requestedSeed && requestedSeed !== savedActive.sessionSeed) {
      storage.clearActive();
      savedActive = null;
    }

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
          recentRelationIds: applyHistory ? storage.readHistory() : []
        });
        return { plan, places: runtimePlaces(sessionAssets.placeArtifact), resumed: false };
      } catch (error) {
        if (signal?.aborted) throw error;
        console.warn('[GeoGeek] ORIENT content session unavailable; using release-pair fallback.', error);
        return { ...fallbackRuntime(seed, error?.message || 'content-unavailable'), resumed: false };
      }
    }

    async function runtimeFromActive(active) {
      if (!active?.plan) throw new Error('Active ORIENT session is invalid.');
      if (active.plan.fallback) return { ...fallbackRuntime(active.sessionSeed, active.plan.fallbackReason, active.plan), resumed: true };
      if (!sessionAssets) sessionAssets = await loadSessionAssets(signal);
      if (active.contentVersion && active.contentVersion !== sessionAssets.placeArtifact?.version) {
        throw new Error('Active ORIENT content version is unavailable.');
      }
      const places = runtimePlaces(sessionAssets.placeArtifact);
      const allPlacesExist = active.plan.trials.every(trial => places[trial.from] && places[trial.to]);
      if (!allPlacesExist) throw new Error('Active ORIENT places are unavailable.');
      return { plan: active.plan, places, resumed: true };
    }

    async function resolveInitialRuntime() {
      const canResume = savedActive && (!requestedSeed || requestedSeed === savedActive.sessionSeed);
      if (canResume) {
        try {
          return await runtimeFromActive(savedActive);
        } catch (error) {
          console.warn('[GeoGeek] ORIENT active session could not be restored; starting a fresh field.', error);
          storage.clearActive();
          savedActive = null;
        }
      }
      return prepareSession(sessionSeed, { applyHistory: !requestedSeed });
    }

    let land;
    let runtime;
    try {
      [land, runtime] = await Promise.all([loadWorld(signal), resolveInitialRuntime()]);
    } catch (error) {
      machine.dispatch({ type: EVENTS.ERROR, error: error?.message || 'field-unavailable' });
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
    let activeSession = null;
    let svg = null;
    let inputMode = null;

    function targetTrialCount() {
      return Math.max(sessionTrials.length, Number(sessionPlan.targetSize) || sessionTrials.length);
    }

    function noteInputMode(mode) {
      if (!mode) return;
      inputMode = inputMode && inputMode !== mode ? 'mixed' : mode;
    }

    function canJudge() {
      return [PHASES.JUDGE_EMPTY, PHASES.JUDGE_ACTIVE, PHASES.READY].includes(machine.state.phase);
    }

    function createMap() {
      const map = d3.select(shell.field).append('svg')
        .attr('class', 'orient-map')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'application')
        .attr('tabindex', '0')
        .attr('aria-label', 'ORIENT reference field. Drag from the reference point to estimate the target relation. Arrow keys adjust the vector. Keys 1, 2 and 3 set confidence.');
      map.on('keydown', handleKeydown);
      return map;
    }

    function ensureMap() {
      if (svg?.node()?.isConnected) return;
      shell.field.innerHTML = '';
      svg = createMap();
    }

    function applyRuntime(nextRuntime) {
      sessionPlan = nextRuntime.plan;
      sessionTrials = nextRuntime.plan.trials;
      placeLookup = nextRuntime.places;
      shell.root.dataset.orientSeed = sessionPlan.seed;
      shell.root.dataset.orientSessionVersion = sessionPlan.version;
      shell.root.dataset.orientFallback = sessionPlan.fallback ? 'true' : 'false';
      shell.root.dataset.orientResumed = nextRuntime.resumed ? 'true' : 'false';
    }

    function beginActiveSession(plan) {
      activeSession = storage.createActiveSession({ plan, sessionId: storage.createSessionId(plan.seed), currentSlot: 1 });
      storage.writeActive(activeSession);
      sessionRecords = [];
      trialIndex = 0;
      shell.root.dataset.orientSessionId = activeSession.sessionId;
    }

    function reconcileDurableEvidence() {
      if (!activeSession || !sessionRecords.length) return;
      const bySlot = new Map(sessionRecords.map(record => [Number(record.trial?.slot), record]));
      let contiguous = 0;
      while (bySlot.has(contiguous + 1)) contiguous += 1;
      if (contiguous <= activeSession.currentSlot - 1) return;
      const recordIds = sessionRecords.filter(record => Number(record.trial?.slot) <= contiguous).map(record => record.recordId);
      activeSession = {
        ...activeSession,
        currentSlot: Math.min(activeSession.plan.trials.length + 1, contiguous + 1),
        committedRecordIds: [...new Set([...(activeSession.committedRecordIds || []), ...recordIds])]
      };
      storage.writeActive(activeSession);
    }

    applyRuntime(runtime);
    if (runtime.resumed && savedActive) {
      activeSession = savedActive;
      sessionRecords = storage.recordsForSession(GeoPlay.trace.forPlay('orient'), activeSession.sessionId);
      const durableIds = new Set(sessionRecords.map(record => record.recordId));
      const activeEvidenceIntact = activeSession.committedRecordIds.every(recordId => durableIds.has(recordId));
      if (!activeEvidenceIntact) {
        storage.clearActive();
        beginActiveSession(sessionPlan);
        runtime.resumed = false;
        shell.root.dataset.orientResumed = 'false';
      } else {
        reconcileDurableEvidence();
        trialIndex = Math.max(0, Math.min(sessionTrials.length, activeSession.currentSlot - 1));
        shell.root.dataset.orientSessionId = activeSession.sessionId;
      }
    } else {
      beginActiveSession(sessionPlan);
    }

    function ensureAdaptationTrial() {
      if (sessionPlan.fallback || sessionTrials.length >= targetTrialCount() || sessionRecords.length < 4) return false;
      if (!sessionAssets || typeof sessionComposer?.composeAdaptationTrial !== 'function') return false;
      const nextPlan = sessionComposer.composeAdaptationTrial({
        plan: sessionPlan,
        records: sessionRecords,
        placeArtifact: sessionAssets.placeArtifact,
        relationArtifact: sessionAssets.relationArtifact,
        recentRelationIds: storage.readHistory()
      });
      if (!nextPlan || nextPlan.trials.length <= sessionTrials.length) return false;
      const updatedActive = storage.replaceActivePlan(activeSession, nextPlan);
      if (!updatedActive) return false;
      activeSession = updatedActive;
      sessionPlan = nextPlan;
      sessionTrials = nextPlan.trials;
      shell.root.dataset.orientSessionVersion = sessionPlan.version;
      return true;
    }

    if (runtime.resumed && sessionRecords.length >= 4 && sessionTrials.length < targetTrialCount()) {
      try { ensureAdaptationTrial(); } catch (error) { console.warn('[GeoGeek] ORIENT adaptation recovery unavailable.', error); }
    }

    machine.dispatch({ type: EVENTS.SESSION_READY, totalTrials: targetTrialCount(), trialIndex });

    const conditionsFor = trial => {
      const rows = [
        ['PROJECTION', 'AZIMUTHAL EQUIDISTANT'],
        ['ROLE', String(trial.role || 'relation').toUpperCase()],
        ['REFERENCE', placeLookup[trial.from].label.toUpperCase()],
        ['COAST', trial.conditions.coast ? 'ON' : 'OFF'],
        ['GRATICULE', trial.conditions.graticule ? 'ON' : 'OFF'],
        ['DISTANCE RINGS', trial.conditions.rings ? 'ON' : 'OFF']
      ];
      if (trial.adaptation?.axis) rows.splice(2, 0, ['FOCUS', String(trial.adaptation.axis).toUpperCase()]);
      return rows;
    };

    function endpointFromPolar(distanceKm, bearingDeg) {
      const r = GeoPlay.core.clamp(distanceKm / MAX_DISTANCE_KM, 0, .985) * radius;
      const theta = toRad(bearingDeg);
      return [cx + Math.sin(theta) * r, cy - Math.cos(theta) * r];
    }

    function updateJudgeNote() {
      if (!current) return;
      const prefix = `RELATION ${trialIndex + 1} / ${targetTrialCount()} · ${String(current.trial.role || 'relation').toUpperCase()}`;
      if (!estimate) shell.setFieldNote(`${prefix} · DRAG FROM REFERENCE`);
      else if (!machine.state.confidence) shell.setFieldNote(`${prefix} · SET CONFIDENCE`);
      else shell.setFieldNote(`${prefix} · READY TO COMMIT`);
    }

    function syncConfidenceControls() {
      const selected = machine.state.confidence;
      shell.task.querySelectorAll('.orient-confidence-option').forEach(button => {
        const value = button.dataset.confidence;
        button.disabled = !estimate || !canJudge();
        button.setAttribute('aria-pressed', value === selected ? 'true' : 'false');
        button.classList.toggle('is-selected', value === selected);
      });
      updateJudgeNote();
    }

    function selectConfidence(value) {
      if (!estimate || !canJudge()) return;
      machine.dispatch({ type: EVENTS.CONFIDENCE_SELECTED, confidence: value });
      syncConfidenceControls();
      renderJudgeActions();
    }

    function renderTrialTask() {
      const from = current.from;
      const to = current.to;
      const focus = current.trial.adaptation?.axis
        ? `<p class="orient-focus-copy">Fresh relation. Recheck ${String(current.trial.adaptation.axis).toUpperCase()} before you commit.</p>`
        : '<p>Estimate the relation.</p>';
      shell.setTask(`
        <div class="play-pair"><span>FROM</span><strong>${from.label.toUpperCase()}</strong></div>
        <div class="play-pair"><span>TO</span><strong>${to.label.toUpperCase()}</strong></div>
        ${focus}
        <div class="orient-confidence" role="group" aria-label="Confidence in this judgment">
          <span>HOW SURE?</span>
          <div class="orient-confidence-options">
            <button type="button" class="orient-confidence-option" data-confidence="low" aria-pressed="false" disabled>LOW</button>
            <button type="button" class="orient-confidence-option" data-confidence="medium" aria-pressed="false" disabled>MEDIUM</button>
            <button type="button" class="orient-confidence-option" data-confidence="high" aria-pressed="false" disabled>HIGH</button>
          </div>
          <small>KEYS 1 / 2 / 3</small>
        </div>`);
      shell.task.querySelectorAll('.orient-confidence-option').forEach(button => {
        button.addEventListener('click', () => selectConfidence(button.dataset.confidence));
      });
      syncConfidenceControls();
    }

    function updateEstimate(point) {
      if (!canJudge()) return;
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
      machine.dispatch({ type: EVENTS.JUDGMENT_CHANGED, judgment: { distanceKm: estimate.distanceKm, bearingDeg: estimate.bearingDeg } });
      judgmentLine.attr('x2', end[0]).attr('y2', end[1]).attr('opacity', 1);
      judgmentPoint.attr('cx', end[0]).attr('cy', end[1]).attr('opacity', 1);
      syncConfidenceControls();
      renderJudgeActions();
    }

    function renderJudgeActions() {
      const actions = [];
      if (!sessionPlan.fallback && sessionAssets && typeof sessionComposer?.replaceUnfamiliarTrial === 'function') {
        actions.push({ label: 'NOT FAMILIAR', secondary: true, onClick: replaceUnfamiliar });
      }
      actions.push({ label: 'RESET', secondary: true, disabled: !estimate, onClick: resetEstimate });
      actions.push({ label: 'COMMIT', disabled: machine.state.phase !== PHASES.READY, onClick: commit });
      shell.setActions(actions);
    }

    function resetEstimate() {
      machine.dispatch({ type: EVENTS.RESET });
      estimate = null;
      inputMode = null;
      judgmentLine?.attr('x2', cx).attr('y2', cy).attr('opacity', 0);
      judgmentPoint?.attr('cx', cx).attr('cy', cy).attr('opacity', 0);
      syncConfidenceControls();
      renderJudgeActions();
    }

    function replaceUnfamiliar() {
      if (!canJudge() || sessionPlan.fallback || !sessionAssets) return;
      const skippedId = current?.trial?.relationId || current?.trial?.id;
      try {
        const nextPlan = sessionComposer.replaceUnfamiliarTrial({
          plan: sessionPlan,
          slot: current.trial.slot || trialIndex + 1,
          attempt: (activeSession.skippedRelationIds?.length || 0) + 1,
          records: sessionRecords,
          placeArtifact: sessionAssets.placeArtifact,
          relationArtifact: sessionAssets.relationArtifact,
          recentRelationIds: [...storage.readHistory(), ...(activeSession.skippedRelationIds || [])]
        });
        const updatedActive = storage.replaceActivePlan(activeSession, nextPlan, { skippedRelationId: skippedId });
        if (!updatedActive) throw new Error('replacement persistence failed');
        activeSession = updatedActive;
        sessionPlan = nextPlan;
        sessionTrials = nextPlan.trials;
        machine.dispatch({ type: EVENTS.TRIAL_REPLACED });
        drawTrial();
      } catch (error) {
        console.warn('[GeoGeek] ORIENT alternate relation unavailable.', error);
        shell.setReadout('<div class="play-kicker">RELATION KEPT</div><p>No clean alternate relation is available for this slot. You can continue or start another field.</p>');
      }
    }

    function drawTrial() {
      ensureMap();
      estimate = null;
      inputMode = null;
      const trial = sessionTrials[trialIndex];
      if (!trial) {
        machine.dispatch({ type: EVENTS.ERROR, error: 'session-content-unresolved' });
        shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>Session content could not be resolved.</p></div>';
        shell.setActions([{ label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }]);
        return;
      }
      const from = placeLookup[trial.from]; const to = placeLookup[trial.to];
      if (!from || !to) {
        machine.dispatch({ type: EVENTS.ERROR, error: 'session-place-unresolved' });
        shell.field.innerHTML = '<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>Session content could not be resolved.</p></div>';
        shell.setActions([{ label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }]);
        return;
      }
      current = { trial, from, to };
      machine.dispatch({ type: EVENTS.TRIAL_LOADED, trialIndex, totalTrials: targetTrialCount() });

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
        if (!canJudge()) return;
        noteInputMode(event.pointerType === 'touch' ? 'touch' : 'pointer');
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

      renderTrialTask();
      shell.setReadout('');
      shell.setConditions(conditionsFor(trial));
      updateJudgeNote();
      renderJudgeActions();
    }

    function buildV2Record(residual, trueDistance, trueBearing) {
      const slot = current.trial.slot || trialIndex + 1;
      const relationId = current.trial.relationId || current.trial.id;
      const recordId = storage.createRecordId(activeSession.sessionId, slot);
      return deepFreeze({
        version: 2,
        recordId,
        play: 'orient',
        sessionId: activeSession.sessionId,
        sessionSeed: sessionPlan.seed,
        contentVersion: sessionPlan.contentVersion,
        difficultyModelVersion: sessionPlan.difficultyModelVersion || null,
        trial: {
          id: current.trial.id,
          slot,
          role: current.trial.role || 'relation',
          relationId,
          adaptation: current.trial.adaptation ? { ...current.trial.adaptation } : null
        },
        judgment: {
          distanceKm: estimate.distanceKm,
          bearingDeg: estimate.bearingDeg,
          confidence: machine.state.confidence || null,
          interaction: { primary: inputMode || 'unknown' }
        },
        relation: {
          id: relationId,
          from: current.trial.from,
          to: current.trial.to,
          distanceKm: trueDistance,
          bearingDeg: trueBearing
        },
        residual: {
          distanceKm: residual.distanceResidualKm,
          distanceRatio: residual.distanceRatio,
          distanceLogError: residual.distanceLogError,
          bearingDeg: residual.bearingResidualDeg,
          distanceClass: residual.distanceClass,
          bearingClass: residual.bearingClass
        },
        difficulty: current.trial.difficulty ? { ...current.trial.difficulty } : null,
        conditions: {
          coast: Boolean(current.trial.conditions.coast),
          rings: Boolean(current.trial.conditions.rings),
          graticule: Boolean(current.trial.conditions.graticule),
          projection: 'azimuthal-equidistant'
        }
      });
    }

    function observationForAdaptation(trial) {
      const evidence = trial?.adaptation;
      if (!evidence) return 'One fresh relation checks whether the earlier pattern holds.';
      if (evidence.mode === 'confirmation' || evidence.direction === 'mixed') {
        return `No single ${String(evidence.axis).toUpperCase()} direction dominated the first four relations. One fresh relation checks whether that holds.`;
      }
      const field = evidence.axis === 'distance' ? 'distanceClass' : 'bearingClass';
      const count = sessionRecords.slice(0, 4).filter(record => record.residual?.[field] === evidence.direction).length;
      return `${count} of 4 ${evidence.axis} estimates were ${evidence.direction}. The final relation asks whether you adjust.`;
    }

    function showAdaptationInsight() {
      const finalTrial = sessionTrials[4];
      if (!finalTrial?.adaptation) return false;
      machine.dispatch({ type: EVENTS.INSIGHT_REQUESTED });
      if (machine.state.phase !== PHASES.INSIGHT) return false;
      shell.readout.insertAdjacentHTML('beforeend', `
        <div class="orient-session-observation">
          <div class="play-kicker">SESSION OBSERVATION</div>
          <p>${observationForAdaptation(finalTrial)}</p>
        </div>`);
      shell.setFieldNote('SESSION OBSERVATION · DESCRIPTIVE · ONE FRESH RELATION REMAINS');
      shell.setActions([{ label: 'TRY ONE MORE →', onClick: () => {
        const nextIndex = 4;
        machine.dispatch({ type: EVENTS.NEXT_REQUESTED, trialIndex: nextIndex });
        trialIndex = nextIndex;
        drawTrial();
      } }]);
      return true;
    }

    function commit() {
      if (!estimate) return;
      machine.dispatch({ type: EVENTS.COMMIT_REQUESTED });
      if (machine.state.phase !== PHASES.COMMIT) return;
      syncConfidenceControls();
      hit?.style('pointer-events', 'none');

      const trueDistance = haversine(current.from, current.to);
      const trueBearing = initialBearing(current.from, current.to);
      const residual = computeResidual({
        estimateDistanceKm: estimate.distanceKm,
        estimateBearingDeg: estimate.bearingDeg,
        truthDistanceKm: trueDistance,
        truthBearingDeg: trueBearing
      });
      const record = buildV2Record(residual, trueDistance, trueBearing);
      const appended = deepFreeze(GeoPlay.trace.append(record));
      const normalized = deepFreeze(storage.normalizeTraceRecord(appended));
      sessionRecords = [...sessionRecords.filter(item => item.recordId !== normalized.recordId), normalized]
        .sort((a, b) => Number(a.trial?.slot || 0) - Number(b.trial?.slot || 0));

      if (!sessionPlan.fallback) storage.rememberRelation(record.trial.relationId);
      if (Number(record.trial.slot) === 4 && sessionTrials.length < targetTrialCount()) {
        try { ensureAdaptationTrial(); } catch (error) { console.warn('[GeoGeek] ORIENT adaptation trial unavailable.', error); }
      }

      const durable = GeoPlay.trace.readAll().some(item => item.play === 'orient' && item.recordId === record.recordId);
      if (durable) {
        const updatedActive = storage.commitActive(activeSession, { recordId: record.recordId, nextSlot: Number(record.trial.slot) + 1 });
        if (updatedActive) activeSession = updatedActive;
      }

      machine.dispatch({ type: EVENTS.RECORD_COMMITTED, recordId: record.recordId });
      const targetPoint = projection([current.to.lon, current.to.lat]);
      judgmentLine.attr('opacity', .55);
      judgmentPoint.attr('opacity', .72);
      svg.insert('line', '.orient-reference')
        .attr('class', 'orient-truth')
        .attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy)
        .transition().duration(matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 520)
        .attr('x2', targetPoint[0]).attr('y2', targetPoint[1]);
      svg.insert('circle', '.orient-reference').attr('class', 'orient-target').attr('cx', targetPoint[0]).attr('cy', targetPoint[1]).attr('r', 6);
      svg.insert('text', '.orient-reference').attr('class', 'orient-target-label').attr('x', targetPoint[0] + 10).attr('y', targetPoint[1] - 10).text(current.to.label.toUpperCase());
      machine.dispatch({ type: EVENTS.REVEAL_COMPLETED });

      const distanceResidual = residual.distanceResidualKm;
      const bearingResidual = residual.bearingResidualDeg;
      shell.setReadout(`
        <div class="play-kicker">RESIDUAL</div>
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE</span><strong>${distanceResidual >= 0 ? '+' : '−'}${fmtKm(distanceResidual)}</strong><em>${residual.distanceClass.toUpperCase()}</em></div>
          <div class="play-metric"><span>BEARING</span><strong>${bearingResidual >= 0 ? '+' : '−'}${Math.abs(bearingResidual).toFixed(1)}°</strong><em>${residual.bearingClass.toUpperCase()}</em></div>
          <div class="play-metric"><span>CONFIDENCE</span><strong>${String(record.judgment.confidence || 'unknown').toUpperCase()}</strong><em>RECORDED BEFORE REVEAL</em></div>
        </div>`);
      shell.setFieldNote('JUDGMENT / WHITE · RELATION / SIGNAL');

      if (Number(record.trial.slot) === 4 && showAdaptationInsight()) return;

      if (trialIndex < sessionTrials.length - 1) {
        shell.setActions([{ label: 'NEXT RELATION →', onClick: () => {
          const nextIndex = trialIndex + 1;
          machine.dispatch({ type: EVENTS.NEXT_REQUESTED, trialIndex: nextIndex });
          trialIndex = nextIndex;
          drawTrial();
        } }]);
      } else {
        shell.setActions([{ label: 'VIEW TRACE →', onClick: () => showTrace() }]);
      }
    }

    function showTrace({ recovered = false } = {}) {
      machine.dispatch({ type: EVENTS.TRACE_REQUESTED, recovered });
      if (machine.state.phase !== PHASES.TRACE) return;
      hit?.on('pointerdown pointermove pointerup pointercancel', null);
      storage.clearActive();

      const distanceBias = mean(sessionRecords.map(record => record.residual.distanceRatio)) * 100;
      const bearingBias = mean(sessionRecords.map(record => record.residual.bearingDeg));
      const distanceThreshold = config.legacyTrace.distanceBalancedRatio * 100;
      const bearingThreshold = config.legacyTrace.bearingBalancedDeg;
      const distanceWord = distanceBias > distanceThreshold ? 'LONG' : distanceBias < -distanceThreshold ? 'SHORT' : 'BALANCED';
      const bearingWord = bearingBias > bearingThreshold ? 'CLOCKWISE' : bearingBias < -bearingThreshold ? 'COUNTERCLOCKWISE' : 'BALANCED';
      const relationCount = sessionRecords.length;
      const highConfidence = sessionRecords.filter(record => record.judgment?.confidence === 'high').length;
      const skipped = activeSession?.skippedRelationIds?.length || 0;

      shell.field.innerHTML = `
        <div style="display:grid;place-items:center;width:100%;height:100%;padding:32px;text-align:center">
          <div><div class="play-trace-title">YOUR SPATIAL TRACE</div><p style="max-width:420px;margin:12px auto 0;color:rgba(241,239,231,.58);font:450 12px/1.6 var(--sans)">Not a score. A session observation across ${relationCount} committed reference fields.</p></div>
        </div>`;
      svg = null;
      shell.setTask(`<div class="play-kicker">YOUR TRACE</div><p>${relationCount} committed relations. Interpret this session before looking for a repeated pattern.</p>`);
      shell.setReadout(`
        <div class="play-metrics">
          <div class="play-metric"><span>DISTANCE / THIS SESSION</span><strong>${distanceBias >= 0 ? '+' : '−'}${Math.abs(distanceBias).toFixed(1)}%</strong><em>${distanceWord}</em></div>
          <div class="play-metric"><span>BEARING / THIS SESSION</span><strong>${bearingBias >= 0 ? '+' : '−'}${Math.abs(bearingBias).toFixed(1)}°</strong><em>${bearingWord}</em></div>
        </div>`);
      shell.setConditions([
        ['RELATIONS', String(relationCount)],
        ['HIGH CONFIDENCE', `${highConfidence} / ${relationCount}`],
        ['UNFAMILIAR REPLACED', String(skipped)],
        ['MODEL', 'SPHERICAL EARTH'],
        ['EVIDENCE', 'SESSION OBSERVATION'],
        ['SESSION', String(sessionPlan.seed).slice(0, 12).toUpperCase()]
      ]);
      shell.setFieldNote('NOT A SCORE · A RECORD OF WHAT CHANGED');
      shell.setActions([
        { label: 'ANOTHER FIELD', secondary: true, onClick: startAnotherField },
        { label: 'RETURN TO LAB', onClick: () => document.getElementById('instrumentClose')?.click() }
      ]);
    }

    async function startAnotherField() {
      storage.clearActive();
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
      svg = null;
      applyRuntime(nextRuntime);
      beginActiveSession(sessionPlan);
      machine.dispatch({ type: EVENTS.SESSION_READY, totalTrials: targetTrialCount(), trialIndex: 0 });
      drawTrial();
    }

    function showResumePrompt() {
      shell.field.innerHTML = `
        <div style="display:grid;place-items:center;width:100%;height:100%;padding:32px;text-align:center">
          <div><div class="play-trace-title">INCOMPLETE FIELD</div><p style="max-width:420px;margin:12px auto 0;color:rgba(241,239,231,.58);font:450 12px/1.6 var(--sans)">${sessionRecords.length} committed relation${sessionRecords.length === 1 ? '' : 's'} preserved locally.</p></div>
        </div>`;
      svg = null;
      shell.setTask(`<div class="play-kicker">RESUME FIELD</div><p>Continue from relation ${trialIndex + 1} of ${targetTrialCount()}, or start a fresh field.</p>`);
      shell.setReadout('Committed judgments remain in your local Spatial Trace. Uncommitted input and confidence were not saved.');
      shell.setConditions([
        ['SESSION', String(sessionPlan.seed).slice(0, 12).toUpperCase()],
        ['COMMITTED', String(sessionRecords.length)],
        ['NEXT RELATION', `${trialIndex + 1} / ${targetTrialCount()}`]
      ]);
      shell.setFieldNote('COMMITTED EVIDENCE PRESERVED · UNCOMMITTED JUDGMENT CLEARED');
      shell.setActions([
        { label: 'START NEW FIELD', secondary: true, onClick: startAnotherField },
        { label: 'CONTINUE FIELD →', onClick: drawTrial }
      ]);
    }

    function finishPrimer() {
      storage.markPrimerSeen();
      machine.dispatch({ type: EVENTS.PRIMER_COMPLETED });
      shell.field.innerHTML = '';
      svg = null;
      hit = null;
      drawTrial();
    }

    function showPrimer() {
      machine.dispatch({ type: EVENTS.PRIMER_REQUESTED });
      if (machine.state.phase !== PHASES.PRIMER) return;
      shell.field.innerHTML = '';
      svg = null;
      hit = null;
      let primerMoved = false;
      let primerDragging = false;
      let primerBearing = 55;
      let primerLength = 120;

      const primer = d3.select(shell.field).append('svg')
        .attr('class', 'orient-map orient-primer-map')
        .attr('viewBox', `0 0 ${width} ${height}`)
        .attr('role', 'application')
        .attr('tabindex', '0')
        .attr('aria-label', 'ORIENT practice input. Move a vector from the center. Angle means direction and length means distance. This practice is not recorded.');
      primer.append('circle').attr('class', 'orient-extent').attr('cx', cx).attr('cy', cy).attr('r', radius);
      primer.append('line').attr('class', 'orient-axis').attr('x1', cx).attr('x2', cx).attr('y1', cy - radius + 12).attr('y2', cy - 18);
      primer.append('text').attr('class', 'orient-north').attr('x', cx).attr('y', cy - radius + 9).attr('text-anchor', 'middle').text('N');
      const line = primer.append('line').attr('class', 'orient-judgment orient-primer-vector').attr('x1', cx).attr('y1', cy).attr('x2', cx).attr('y2', cy).attr('opacity', 0);
      const point = primer.append('circle').attr('class', 'orient-judgment-point').attr('cx', cx).attr('cy', cy).attr('r', 5).attr('opacity', 0);
      primer.append('circle').attr('class', 'orient-reference').attr('cx', cx).attr('cy', cy).attr('r', 6);
      primer.append('text').attr('class', 'orient-primer-label').attr('x', cx).attr('y', cy + 28).attr('text-anchor', 'middle').text('REFERENCE');
      const primerHit = primer.append('circle').attr('class', 'orient-hit').attr('cx', cx).attr('cy', cy).attr('r', radius);

      const setPrimerActions = () => shell.setActions([
        { label: 'SKIP PRIMER', secondary: true, onClick: finishPrimer },
        { label: 'START FIELD →', disabled: !primerMoved, onClick: finishPrimer }
      ]);
      const paintPrimer = (x, y) => {
        const dx = x - cx; const dy = y - cy;
        const length = Math.hypot(dx, dy) || 1;
        const factor = Math.min(1, radius * .86 / length);
        const end = [cx + dx * factor, cy + dy * factor];
        line.attr('x2', end[0]).attr('y2', end[1]).attr('opacity', 1);
        point.attr('cx', end[0]).attr('cy', end[1]).attr('opacity', 1);
        primerMoved = true;
        setPrimerActions();
        shell.setFieldNote('PRACTICE INPUT · ANGLE = DIRECTION · LENGTH = DISTANCE · NOT RECORDED');
      };
      const paintPolar = () => {
        const theta = toRad(primerBearing);
        paintPrimer(cx + Math.sin(theta) * primerLength, cy - Math.cos(theta) * primerLength);
      };

      primerHit.on('pointerdown', event => {
        primerDragging = true;
        event.preventDefault();
        primerHit.node()?.setPointerCapture?.(event.pointerId);
        const [x, y] = d3.pointer(event, primer.node());
        paintPrimer(x, y);
      }).on('pointermove', event => {
        if (!primerDragging) return;
        event.preventDefault();
        const [x, y] = d3.pointer(event, primer.node());
        paintPrimer(x, y);
      }).on('pointerup pointercancel', event => {
        primerDragging = false;
        primerHit.node()?.releasePointerCapture?.(event.pointerId);
      });
      primer.on('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
        event.preventDefault();
        if (event.key === 'ArrowLeft') primerBearing -= event.shiftKey ? 10 : 5;
        if (event.key === 'ArrowRight') primerBearing += event.shiftKey ? 10 : 5;
        if (event.key === 'ArrowUp') primerLength += event.shiftKey ? 40 : 20;
        if (event.key === 'ArrowDown') primerLength -= event.shiftKey ? 40 : 20;
        primerBearing = normalizeBearing(primerBearing);
        primerLength = GeoPlay.core.clamp(primerLength, 20, radius * .86);
        paintPolar();
      });

      shell.setTask(`
        <div class="play-kicker">INPUT PRIMER</div>
        <p>Move one vector from the center. Its angle is your direction estimate; its length is your distance estimate.</p>
        <div class="orient-primer-legend"><strong>ANGLE</strong><span>DIRECTION</span><strong>LENGTH</strong><span>DISTANCE</span></div>
        <p class="orient-primer-note">No place is being tested. This gesture is not recorded.</p>`);
      shell.setReadout('');
      shell.setConditions([
        ['MODE', 'PRACTICE INPUT'],
        ['TRUTH', 'HIDDEN / NONE'],
        ['RECORDING', 'OFF']
      ]);
      shell.setFieldNote('PRACTICE INPUT · MOVE THE VECTOR ONCE');
      setPrimerActions();
    }

    function handleKeydown(event) {
      if (!canJudge()) return;
      if (['1', '2', '3'].includes(event.key) && estimate) {
        event.preventDefault();
        selectConfidence({ '1': 'low', '2': 'medium', '3': 'high' }[event.key]);
        return;
      }
      if (event.key === 'Enter' && machine.state.phase === PHASES.READY) { event.preventDefault(); commit(); return; }
      if (event.key.toLowerCase() === 'r') { event.preventDefault(); resetEstimate(); return; }
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      event.preventDefault();
      noteInputMode('keyboard');
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

    if (trialIndex >= sessionTrials.length && sessionRecords.length) {
      showTrace({ recovered: true });
    } else if (runtime.resumed && sessionRecords.length) {
      showResumePrompt();
    } else if (!storage.hasSeenPrimer()) {
      showPrimer();
    } else {
      drawTrial();
    }

    return () => {
      dragging = false;
      machine.dispatch({ type: EVENTS.DISPOSE });
      unsubscribeState();
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
    sessionVersion: sessionComposer?.SESSION_VERSION || 'fallback',
    traceVersion: 2
  };
  register();
})();
