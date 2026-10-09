(() => {
  'use strict';

  const ensureStyle = (href, key) => {
    if (document.querySelector(`link[data-${key}]`)) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.dataset[key.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = '1';
    document.head.appendChild(link);
  };

  ensureStyle('lab-transform.css?v=20261001a', 'lab-transform');
  ensureStyle('lab-map-field.css?v=20261001a', 'lab-map-field');

  // Lab status vocabulary describes source condition, not a product mode.
  // Any older fallback path that still requests the synthetic status is exposed
  // to visitors as unavailable instead of presenting a misleading mode label.
  const labStatus = window.GEOGEEK_DATA?.en?.ui?.lab?.status;
  if (labStatus) labStatus.demo = 'UNAVAILABLE';

  function alignFlowContent() {
    const root = window.GEOGEEK_DATA?.en;
    const item = root?.lab?.find(entry => entry.id === 'l06');
    if (item) Object.assign(item, {
      status: 'Instrument',
      title: 'Geographic Flow Laboratory',
      tags: ['Movement', 'Flow', 'Trajectory'],
      description: 'One workbench compares continuous vector fields, aggregate origin–destination networks, timestamped trajectories, and Lagrangian releases without pretending they are the same geometry.',
      coord: 'field / OD / x(t)',
      instrumentKicker: 'FLOW / FIELD / NETWORK / TRAJECTORY',
      source: 'Open-Meteo · NOAA GFS · Natural Earth · reproducible demo data'
    });
    const ui = root?.ui;
    if (ui?.lab?.conditions) ui.lab.conditions.flow = [
      ['INPUT', 'Vector field · OD · timestamped paths'],
      ['GEOMETRY', 'Field · network · trajectory · particles'],
      ['TIME', 'Snapshot · aggregate · sequence'],
      ['LIMIT', 'Representation ≠ phenomenon']
    ];
    if (ui?.lab) ui.lab.flow = { caption: 'MOVEMENT / FLOW', title: 'Flow is not one geometry.' };
    if (ui?.a11y) ui.a11y.windFrame = 'Interactive geographic flow laboratory';

    const card = document.querySelector('#l06');
    if (!card) return;
    const meta = card.querySelectorAll('.project-meta span');
    if (meta[0]) meta[0].textContent = 'Instrument';
    if (meta[1]) meta[1].textContent = 'Movement · Flow · Trajectory';
    const title = card.querySelector('h2');
    const copy = card.querySelector('.project-copy > p');
    const coord = card.querySelector('.lab-coord');
    const stamp = card.querySelector('.preview-stamp');
    if (title) title.textContent = 'Geographic Flow Laboratory';
    if (copy) copy.textContent = 'Compare field, OD network, timestamped trajectory, and particle release as distinct geographic movement grammars.';
    if (coord) coord.textContent = 'field / OD / x(t)';
    if (stamp) stamp.textContent = 'FIELD / OD / TRIPS / RELEASE';
  }

  alignFlowContent();

  const list = document.querySelector('#labList');
  const dialog = document.querySelector('#instrumentDialog');
  const stage = document.querySelector('#instrumentStage');
  const buildRows = [...document.querySelectorAll('.lab-build-row')];

  // Lab has one explicit semantic-scale contract:
  // collection index -> individual record/object -> instrument detail.
  // An external build is still an individual information object, so hovering
  // its row is RECORD even though its destination is outside the site model.
  // Keep DETAIL locked while the modal instrument owns interaction so a card
  // pointerleave/focusout cannot restore the collection underneath the dialog.
  const setCollectionScale = () => window.GeoScale?.apply?.('COLLECTION', false);
  const setRecordScale = () => window.GeoScale?.apply?.('RECORD');
  const setDetailScale = () => window.GeoScale?.apply?.('DETAIL');
  const releaseRecordScale = () => {
    if (dialog?.open || document.body.classList.contains('instrument-open')) setDetailScale();
    else window.GeoScale?.restore?.();
  };

  function bindRecordScaleTarget(target) {
    if (!target || target.dataset.labScaleBound === '1') return;
    target.dataset.labScaleBound = '1';
    target.addEventListener('pointerenter', () => {
      if (!dialog?.open) setRecordScale();
    });
    target.addEventListener('focusin', () => {
      if (!dialog?.open) setRecordScale();
    });
    target.addEventListener('pointerleave', releaseRecordScale);
    target.addEventListener('focusout', event => {
      if (target.contains(event.relatedTarget)) return;
      releaseRecordScale();
    });
  }

  if (list) {
    const instrumentIds = new Set(['l04','l05','l06','l07','l08','l09','l10','l11','l12','l13','l14','l15','l16']);

    // The Lab collection should only show records that actually expose an instrument.
    list.querySelectorAll('.project-card').forEach(card => {
      if (!instrumentIds.has(card.id) || !card.querySelector('[data-instrument]')) {
        card.remove();
        return;
      }
      const trigger = card.querySelector('[data-instrument]');
      if (trigger?.dataset.instrument) card.dataset.instrumentKind = trigger.dataset.instrument;
      bindRecordScaleTarget(card);
    });

    list.querySelectorAll('.lab-group-block').forEach(block => {
      const cards = [...block.querySelectorAll('.project-card')];
      if (!cards.length) {
        block.remove();
        return;
      }

      const ids = new Set(cards.map(card => card.id));
      if (ids.has('l11') || ids.has('l12')) block.classList.add('lab-group-studies');
      else if (ids.has('l04') || ids.has('l05') || ids.has('l06') || ids.has('l10') || ids.has('l13')) block.classList.add('lab-group-observatory');
      else if (ids.has('l07') || ids.has('l08') || ids.has('l09') || ids.has('l14') || ids.has('l15') || ids.has('l16')) block.classList.add('lab-group-play');
    });
  }

  buildRows.forEach(bindRecordScaleTarget);

  // Establish the collection as the durable page scale. Individual rows and
  // instrument workspaces are temporary descendants of this baseline.
  setCollectionScale();

  if (!dialog || !stage) return;

  const families = {
    orbit: 'map',
    earth: 'map',
    flow: 'map',
    pulse: 'map',
    world: 'map',
    locate: 'field',
    zone: 'field',
    path: 'field',
    figure: 'transform',
    water: 'spectral',
    light: 'field',
    swath: 'field',
    project: 'field'
  };

  const playKinds = new Set(['locate', 'zone', 'path', 'project', 'light', 'swath']);

  function setInstrumentIdentity(kind = '') {
    if (!kind) {
      delete dialog.dataset.instrumentKind;
      delete dialog.dataset.instrumentFamily;
      delete dialog.dataset.playWorkspace;
      delete stage.dataset.instrumentKind;
      return;
    }
    dialog.dataset.instrumentKind = kind;
    dialog.dataset.instrumentFamily = families[kind] || 'field';
    if (playKinds.has(kind)) dialog.dataset.playWorkspace = 'true';
    else delete dialog.dataset.playWorkspace;
    stage.dataset.instrumentKind = kind;
  }

  function detectKind() {
    if (stage.querySelector('.earth-layout')) return 'earth';
    if (stage.querySelector('.orbital-lab, .orbit-v2')) return 'orbit';
    if (stage.querySelector('.flow-lab, .flow-layout')) return 'flow';
    if (stage.querySelector('.pulse-layout')) return 'pulse';
    if (stage.querySelector('.world-layout')) return 'world';
    if (stage.querySelector('.figure-layout')) return 'figure';
    if (stage.querySelector('.water-lab')) return 'water';
    if (stage.querySelector('.game-layout')) {
      const requested = new URLSearchParams(location.search).get('instrument');
      return requested || 'field';
    }
    return new URLSearchParams(location.search).get('instrument') || '';
  }

  function buildDisclosure(root, selector, label, key = label) {
    if (!root || root.querySelector(`[data-disclosure-key="${CSS.escape(key)}"]`)) return;
    const nodes = [...root.querySelectorAll(selector)].filter(node => !node.closest('.instrument-disclosure'));
    if (!nodes.length) return;
    const details = document.createElement('details');
    details.className = 'instrument-disclosure';
    details.dataset.disclosureKey = key;
    const summary = document.createElement('summary');
    summary.textContent = label;
    const body = document.createElement('div');
    body.className = 'instrument-disclosure-body';
    nodes.forEach(node => body.appendChild(node));
    details.append(summary, body);
    root.appendChild(details);
  }

  function enhanceEarth() {
    const root = stage.querySelector('.earth-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const controls = root.querySelector('.earth-controls');
    buildDisclosure(controls, ':scope > p, :scope > .source-line', 'OBSERVATION LIMITS', 'earth-limits');
  }

  function enhanceOrbit() {
    const root = stage.querySelector('.orbital-lab, .orbit-v2');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const panel = root.querySelector('.orbital-lab-panel, .orbit-panel');
    buildDisclosure(panel, ':scope > p', 'READING NOTE', 'orbit-note');
  }

  function enhanceFigure() {
    const root = stage.querySelector('.figure-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const controls = root.querySelector('.figure-control');
    buildDisclosure(controls, ':scope > p, :scope > .source-line', 'METHOD NOTE', 'figure-note');
  }

  function enhancePulse() {
    const root = stage.querySelector('.pulse-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const panel = root.querySelector('.pulse-panel');
    if (panel) {
      panel.tabIndex = 0;
      panel.setAttribute('aria-label', 'Earthquake event details and observation conditions');
    }
    buildDisclosure(panel, ':scope > p', 'READING NOTE', 'pulse-note');
  }

  function enhanceWorld() {
    const root = stage.querySelector('.world-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const panel = root.querySelector('.world-panel');
    buildDisclosure(panel, ':scope > p, :scope > .source-line', 'PROJECTION NOTE', 'world-note');
  }

  function enhanceField() {
    const root = stage.querySelector('.game-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const panel = root.querySelector('.game-panel');
    buildDisclosure(panel, ':scope > .game-references', 'REFERENCES', 'game-references');
  }

  function syncInstrumentShell() {
    if (!stage.childElementCount) {
      setInstrumentIdentity('');
      return;
    }
    const kind = detectKind();
    setInstrumentIdentity(kind);
    if (kind === 'earth') enhanceEarth();
    if (kind === 'orbit') enhanceOrbit();
    if (kind === 'figure') enhanceFigure();
    if (kind === 'pulse') enhancePulse();
    if (kind === 'world') enhanceWorld();
    if (['locate','zone','path'].includes(kind)) enhanceField();
  }

  const initialKind = new URLSearchParams(location.search).get('instrument');
  if (initialKind) setInstrumentIdentity(initialKind);

  // PLAY direct links are owned by play-runtime.js. Do not open them twice.
  const playKinds = new Set(['locate', 'zone', 'path', 'project', 'light', 'swath']);
  if (initialKind && families[initialKind] && !playKinds.has(initialKind)) {
    let attempts = 0;
    let opening = false;
    const openRequested = async () => {
      if (dialog.open || opening) return true;
      const modules = window.GeoModules;
      if (!modules?.loadInstrument) return false;
      opening = true;
      try {
        const instruments = await modules.loadInstrument(initialKind);
        if (!dialog.open) await instruments?.openByKind?.(initialKind, { updateUrl: false });
        modules.normalizeInstrumentAria?.(initialKind);
        return dialog.open;
      } catch (error) {
        console.warn(`[GeoGeek] Direct instrument ${initialKind} could not initialize yet.`, error);
        return false;
      } finally {
        opening = false;
      }
    };
    const retry = async () => {
      if (dialog.open || attempts >= 120) return;
      attempts += 1;
      if (await openRequested()) return;
      setTimeout(retry, 50);
    };
    queueMicrotask(retry);
  }

  document.addEventListener('pointerdown', event => {
    const trigger = event.target.closest?.('[data-instrument]');
    if (trigger?.dataset.instrument) setInstrumentIdentity(trigger.dataset.instrument);
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(syncInstrumentShell));
  observer.observe(stage, { childList: true, subtree: true });

  // A modal instrument is always DETAIL, including the transition where the
  // originating card loses pointer/focus after showModal().
  const scaleObserver = new MutationObserver(() => {
    if (dialog.open) setDetailScale();
  });
  scaleObserver.observe(dialog, { attributes: true, attributeFilter: ['open'] });

  dialog.addEventListener('close', () => setInstrumentIdentity(''));
  syncInstrumentShell();
})();