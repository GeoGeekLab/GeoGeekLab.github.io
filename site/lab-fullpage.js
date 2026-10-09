(() => {
  'use strict';

  if (!document.querySelector('link[data-lab-fullpage]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'lab-fullpage.css?v=20261009r3';
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
    pulse:'pulse/pulse-round6.js?v=20261009r3'
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

  // Earth Pulse has two research tasks, not three visualization-density modes.
  // The other Lab instruments retain the existing shared workspace toolbar.
  const pulseTabs = document.createElement('nav');
  pulseTabs.className = 'pulse-task-tabs';
  pulseTabs.setAttribute('aria-label', 'Earth Pulse tasks');
  pulseTabs.hidden = true;
  pulseTabs.innerHTML = ['observe','analyze'].map(task =>
    `<button type="button" data-pulse-task="${task}" aria-pressed="${task === 'observe'}">${task.toUpperCase()}</button>`
  ).join('');
  close.before(pulseTabs);

  function setPulseTask(task, {emit=true} = {}) {
    const next = task === 'analyze' ? 'analyze' : 'observe';
    dialog.dataset.pulseTask = next;
    pulseTabs.querySelectorAll('[data-pulse-task]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.pulseTask === next));
    });
    if (emit) {
      const url = new URL(location.href);
      if (next === 'analyze') url.searchParams.set('pulseTask','analyze');
      else url.searchParams.delete('pulseTask');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      document.dispatchEvent(new CustomEvent('geogeek:pulse-task',{detail:{task:next}}));
    }
  }

  pulseTabs.addEventListener('click',event => {
    const button=event.target.closest('[data-pulse-task]');
    if (button && dialog.dataset.instrumentKind === 'pulse') setPulseTask(button.dataset.pulseTask);
  });

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

  function loadPulseVisualSystem() {
    const src = new URL('pulse/pulse-ui-system.css?v=20261009r4', document.baseURI).href;
    const existing = document.querySelector('link[data-pulse-ui-system]');
    if (existing) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = src;
      link.dataset.pulseUiSystem = '1';
      link.onload = resolve;
      link.onerror = () => {
        link.remove();
        reject(new Error('Earth Pulse shared visual system could not load'));
      };
      document.head.appendChild(link);
    });
  }

  function loadRefinement(kind) {
    const src = REFINEMENTS[kind];
    if (!src) return Promise.resolve();
    if (refinementLoads.has(src)) return refinementLoads.get(src);
    const promise = import(new URL(src, document.baseURI).href)
      .then(() => kind === 'pulse'
        ? import(new URL('pulse/pulse-workflow-v1.js?v=20261009r3b', document.baseURI).href)
            .then(() => import(new URL('pulse/pulse-workflow-v2.js?v=20261009r3b', document.baseURI).href))
            .then(loadPulseVisualSystem)
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
    toolbar.hidden = !isCore || kind === 'pulse';
    pulseTabs.hidden = kind !== 'pulse';
    syncCloseControl(isCore);

    if (!isCore) {
      delete dialog.dataset.workspaceMode;
      delete dialog.dataset.pulseTask;
      return;
    }

    if (kind === 'pulse') {
      delete dialog.dataset.workspaceMode;
      const queryTask = new URL(location.href).searchParams.get('pulseTask');
      setPulseTask(dialog.dataset.pulseTask || queryTask, {emit:false});
    } else {
      delete dialog.dataset.pulseTask;
      setMode(dialog.dataset.workspaceMode || storedMode(), { persist:false });
    }
    loadRefinement(kind).catch(error => console.warn(`[GeoGeek] ${kind} refinement failed to load; base instrument remains available.`, error));
  }

  buttons.forEach(button => button.addEventListener('click', () => setMode(button.dataset.workspaceMode)));

  document.addEventListener('keydown', event => {
    if (!dialog.open || !activeKind || activeKind === 'pulse') return;
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
  dialog.addEventListener('close', () => {
    if (activeKind === 'pulse') {
      // Leaving the instrument must not leak Analyze into another Lab record.
      const url = new URL(location.href);
      url.searchParams.delete('pulseTask');
      history.replaceState(history.state, '', url.pathname + url.search + url.hash);
      delete dialog.dataset.pulseTask;
    }
    syncIdentity();
  });
  syncIdentity();
})();
