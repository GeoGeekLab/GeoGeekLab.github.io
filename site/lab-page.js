(() => {
  'use strict';

  if (!document.querySelector('link[data-lab-transform]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'lab-transform.css?v=20261001a';
    link.dataset.labTransform = '1';
    document.head.appendChild(link);
  }

  const list = document.querySelector('#labList');
  const dialog = document.querySelector('#instrumentDialog');
  const stage = document.querySelector('#instrumentStage');

  if (list) {
    const instrumentIds = new Set(['l04','l05','l06','l07','l08','l09','l10','l11','l12']);

    // The Lab collection should only show records that actually expose an instrument.
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
    locate: 'map',
    zone: 'map',
    path: 'map',
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
    if (stage.querySelector('.orbital-lab')) return 'orbit';
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

  function buildDisclosure(root, selector, label) {
    if (!root || root.querySelector('.instrument-disclosure')) return;
    const nodes = [...root.querySelectorAll(selector)].filter(node => !node.closest('.instrument-disclosure'));
    if (!nodes.length) return;
    const details = document.createElement('details');
    details.className = 'instrument-disclosure';
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
    buildDisclosure(controls, ':scope > p, :scope > .source-line', 'OBSERVATION LIMITS');
  }

  function enhanceOrbit() {
    const root = stage.querySelector('.orbital-lab');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const panel = root.querySelector('.orbital-lab-panel');
    buildDisclosure(panel, ':scope > p', 'READING NOTE');
  }

  function enhanceFigure() {
    const root = stage.querySelector('.figure-layout');
    if (!root || root.dataset.shellEnhanced === '1') return;
    root.dataset.shellEnhanced = '1';
    const controls = root.querySelector('.figure-control');
    buildDisclosure(controls, ':scope > p, :scope > .source-line', 'METHOD NOTE');
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
  }

  const initialKind = new URLSearchParams(location.search).get('instrument');
  if (initialKind) setInstrumentIdentity(initialKind);

  document.addEventListener('pointerdown', event => {
    const trigger = event.target.closest?.('[data-instrument]');
    if (trigger?.dataset.instrument) setInstrumentIdentity(trigger.dataset.instrument);
  }, true);

  const observer = new MutationObserver(() => queueMicrotask(syncInstrumentShell));
  observer.observe(stage, { childList: true, subtree: true });
  dialog.addEventListener('close', () => setInstrumentIdentity(''));
  syncInstrumentShell();
})();
