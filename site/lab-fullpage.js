(() => {
  'use strict';

  if (!document.querySelector('link[data-lab-fullpage]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'lab-fullpage.css?v=20261008e';
    link.dataset.labFullpage = '1';
    document.head.appendChild(link);
  }

  if (!document.querySelector('link[data-lab-close-control]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'lab-close-control.css?v=20261002a';
    link.dataset.labCloseControl = '1';
    document.head.appendChild(link);
  }

  const dialog = document.getElementById('instrumentDialog');
  const head = dialog?.querySelector('.instrument-head');
  const close = document.getElementById('instrumentClose');
  if (!dialog || !head || !close) return;

  const CORE = new Set(['world', 'figure', 'orbit', 'earth', 'flow', 'pulse', 'water']);
  const MODES = ['focus', 'work', 'inspect'];
  const STORAGE = 'geogeek.lab.workspaceMode';
  const REFINEMENTS = {
    orbit:'orbital/orbit-round2.js?v=20261002a',
    earth:'earth-observation-v3/earth-round2.js?v=20261002a',
    flow:'flow/flow-round2.js?v=20261002d',
    pulse:'pulse/pulse-round6.js?v=20261002a'
  };
  const refinementLoads = new Map();
  let activeKind = '';

  const toolbar = document.createElement('div');
  toolbar.className = 'instrument-workspace-modes';
  toolbar.setAttribute('role', 'group');
  toolbar.setAttribute('aria-label', 'Workspace density');
  toolbar.hidden = true;
  toolbar.innerHTML = MODES.map(mode => (
    `<button type="button" data-workspace-mode="${mode}" aria-pressed="${mode === 'work'}" title="${mode === 'focus' ? 'Visualization only' : mode === 'inspect' ? 'Show full context and provenance' : 'Visualization with primary controls'}">${mode.toUpperCase()}</button>`
  )).join('');
  close.before(toolbar);

  const buttons = [...toolbar.querySelectorAll('[data-workspace-mode]')];

  function storedMode() {
    try {
      const value = localStorage.getItem(STORAGE);
      return MODES.includes(value) ? value : 'work';
    } catch {
      return 'work';
    }
  }

  function setMode(mode, { persist = true } = {}) {
    const next = MODES.includes(mode) ? mode : 'work';
    dialog.dataset.workspaceMode = next;
    buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.workspaceMode === next)));
    if (persist) {
      try { localStorage.setItem(STORAGE, next); } catch {}
    }
    document.dispatchEvent(new CustomEvent('geogeek:workspace-mode', { detail:{ kind:activeKind, mode:next } }));
  }

  function loadRefinement(kind) {
    const src = REFINEMENTS[kind];
    if (!src) return Promise.resolve();
    if (refinementLoads.has(src)) return refinementLoads.get(src);
    const promise = import(new URL(src, document.baseURI).href)
      .then(() => kind === 'pulse'
        ? import(new URL('pulse/pulse-workflow-v1.js?v=20261008b', document.baseURI).href)
            .then(() => import(new URL('pulse/pulse-workflow-v2.js?v=20261008b', document.baseURI).href))
        : undefined)
      .catch(error => {
      refinementLoads.delete(src);
      throw error;
    });
    refinementLoads.set(src, promise);
    return promise;
  }

  function syncCloseControl(isCore) {
    close.textContent = '×';
    if (!isCore) {
      delete close.dataset.labExit;
      close.setAttribute('aria-label', 'Close');
      close.setAttribute('title', 'Close');
      return;
    }
    close.dataset.labExit = 'true';
    close.setAttribute('aria-label', 'Return to Lab Index');
    close.setAttribute('title', 'Lab Index');
  }

  const closeLabelObserver = new MutationObserver(() => {
    const expected = CORE.has(dialog.dataset.instrumentKind || '') ? 'Return to Lab Index' : 'Close';
    if (close.getAttribute('aria-label') !== expected) close.setAttribute('aria-label', expected);
  });
  closeLabelObserver.observe(close, {attributes:true,attributeFilter:['aria-label']});

  function syncIdentity() {
    const kind = dialog.dataset.instrumentKind || '';
    const isCore = CORE.has(kind);
    activeKind = isCore ? kind : '';
    dialog.dataset.labWorkspace = isCore ? 'true' : 'false';
    toolbar.hidden = !isCore;
    syncCloseControl(isCore);

    if (!isCore) {
      delete dialog.dataset.workspaceMode;
      return;
    }

    setMode(dialog.dataset.workspaceMode || storedMode(), { persist:false });
    loadRefinement(kind).catch(error => console.warn(`[GeoGeek] ${kind} refinement failed to load; base instrument remains available.`, error));
  }

  buttons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.workspaceMode)));

  document.addEventListener('keydown', event => {
    if (!dialog.open || !activeKind) return;
    const target = event.target;
    if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable) return;
    if (!event.altKey) return;
    const index = ['1','2','3'].indexOf(event.key);
    if (index < 0) return;
    event.preventDefault();
    setMode(MODES[index]);
  });

  const observer = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-instrument-kind' || record.attributeName === 'open')) syncIdentity();
  });
  observer.observe(dialog, { attributes:true, attributeFilter:['data-instrument-kind', 'open'] });
  dialog.addEventListener('close', syncIdentity);
  syncIdentity();
})();
