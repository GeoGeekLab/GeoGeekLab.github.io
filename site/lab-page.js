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

  const list = document.querySelector('#labList');
  const dialog = document.querySelector('#instrumentDialog');
  const stage = document.querySelector('#instrumentStage');

  if (list) {
    const instrumentIds = new Set(['l04','l05','l06','l07','l08','l09','l10','l11','l12']);

    list.querySelectorAll('.project-card').forEach(card => {
      if (!instrumentIds.has(card.id) || !card.querySelector('[data-instrument]')) {
        card.remove();
        return;
      }
      const trigger = card.querySelector('[data-instrument]');
      if (trigger?.dataset.instrument) card.dataset.instrumentKind = trigger.dataset.instrument;
    });

    list.querySelectorAll('.lab-group-block').forEach(block => {
      const cards = [...block.querySelectorAll('.project-card')];
      if (!cards.length) {
        block.remove();
        return;
      }

      const ids = new Set(cards.map(card => card.id));
      if (ids.has('l11') || ids.has('l12')) block.classList.add('lab-group-studies');
      else if (ids.has('l04') || ids.has('l05') || ids.has('l06') || ids.has('l10')) block.classList.add('lab-group-observatory');
      else if (ids.has('l07') || ids.has('l08') || ids.has('l09')) block.classList.add('lab-group-play');
    });
  }

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
    figure: 'transform'
  };

  function setInstrumentIdentity(kind = '') {
    if (!kind) {
      delete dialog.dataset.instrumentKind;
      delete dialog.dataset.instrumentFamily;
      delete stage.dataset.instrumentKind;
      return;
    }
    dialog.dataset.instrumentKind = kind;
    dialog.dataset.instrumentFamily = families[kind] || 'field';
    stage.dataset.instrumentKind = kind;
  }

  function detectKind() {
    if (stage.querySelector('.earth-layout')) return 'earth';
    if (stage.querySelector('.orbital-lab, .orbit-v2')) return 'orbit';
    if (stage.querySelector('.flow-layout')) return 'flow';
    if (stage.querySelector('.pulse-layout')) return 'pulse';
    if (stage.querySelector('.world-layout')) return 'world';
    if (stage.querySelector('.figure-layout')) return 'figure';
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

  // Direct instrument URLs are a first-class route. Production optimizers defer
  // the Lab runtime, so do not rely on one script happening to read the query at
  // the right instant: wait for the module loader and open the requested field once.
  if (initialKind && families[initialKind]) {
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
  dialog.addEventListener('close', () => setInstrumentIdentity(''));
  syncInstrumentShell();
})();
