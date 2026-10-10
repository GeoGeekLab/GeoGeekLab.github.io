(() => {
  'use strict';

  const modules = window.GeoModules;
  if (!modules?.loadInstrument || modules.__geoSpatialPlayRuntime) return;

  const baseLoadInstrument = modules.loadInstrument.bind(modules);
  const PLAY_KINDS = new Set(['locate', 'zone', 'path', 'project', 'light', 'swath']);
  const PLAY_DOM_KIND = {
    locate: 'orient',
    zone: 'bound',
    path: 'connect',
    project: 'project',
    light: 'light',
    swath: 'swath'
  };
  const COMMON = [
    'play/play-core.js?v=20261005a',
    'play/play-shell.js?v=20261008e',
    'play/play-trace.js?v=20261002c'
  ];
  const PRE_SCRIPTS = {
    locate: [
      'play/orient/orient-geometry.js?v=20261003a',
      'play/orient/orient-config.js?v=20261003b',
      'play/orient/orient-metrics.js?v=20261003b',
      'play/orient/orient-state.js?v=20261003f',
      'play/orient/orient-storage.js?v=20261003f'
    ],
    path: [
      'play/connect/connect-content.js?v=20261005a',
      'play/connect/connect-graph.js?v=20261005a',
      'play/connect/connect-game.js?v=20261005a',
      'play/connect/connect-view.js?v=20261005a'
    ],
    project: [
      'play/project/project-content.js?v=20261005c',
      'play/project/project-morph.js?v=20261008p1',
      'play/project/project-view.js?v=20261009-step05b',
      'play/project/project-route-view.js?v=20261009-step05a'
    ],
    light: [
      'play/light/light-content.js?v=20261007a',
      'play/light/light-physics.js?v=20261007a',
      'play/light/light-experiments.js?v=20261007a',
      'play/light/light-view.js?v=20261009-step06a'
    ],
    swath: [
      'play/swath/swath-content.js?v=20261007a',
      'play/swath/swath-physics.js?v=20261007a',
      'play/swath/swath-experiments.js?v=20261007a',
      'play/swath/swath-view.js?v=20261007b'
    ]
  };
  const OPTIONAL_PRE_SCRIPTS = {
    locate: [
      'play/orient/orient-content.js?v=20261003c',
      'play/orient/orient-session.js?v=20261003f',
      'play/orient/orient-adaptation-guard.js?v=20261003f'
    ]
  };
  const SCRIPT = {
    locate: 'play/orient/orient.js?v=20261003f',
    zone: 'play/bound/bound.js?v=20261005c',
    path: 'play/connect/connect.js?v=20261005c',
    project: 'play/project/project.js?v=20261009-step05a',
    light: 'play/light/light.js?v=20261010-step06b',
    swath: 'play/swath/swath.js?v=20261007a'
  };
  const OPTIONAL_POST_SCRIPTS = {
    locate: [
      'play/orient/orient-feedback.js?v=20261003g',
      'play/orient/orient-trace-view.js?v=20261003h',
      'play/orient/orient-trace-enhancer.js?v=20261003h',
      'play/orient/orient-ergonomics.js?v=20261003i',
      'play/orient/orient-v2-presentation.js?v=20261005c'
    ]
  };
  const REGISTER = {
    locate: () => window.GeoPlayOrient?.register?.(),
    zone: () => window.GeoPlayBound?.register?.(),
    path: () => window.GeoPlayConnect?.register?.(),
    project: () => window.GeoPlayProject?.register?.(),
    light: () => window.GeoPlayLight?.register?.(),
    swath: () => window.GeoPlaySwath?.register?.()
  };
  const opening = new Map();
  let entrySequence = 0;
  let warmPromise = null;
  const ENTRY_TIMEOUT_MS = 15000;

  async function warmPlayBase() {
    if (warmPromise) return warmPromise;
    warmPromise = (async () => {
      // Warm the shared instrument shell with a game-kind so games.js,
      // instruments.js and the common Play shell are ready before the user
      // reaches the Play collection.
      await baseLoadInstrument('locate');
      for (const src of COMMON) await modules.loadScript(src);
      return true;
    })().catch(error => {
      warmPromise = null;
      console.warn('[GeoGeek] Play prewarm deferred; on-demand loading remains available.', error);
      return false;
    });
    return warmPromise;
  }

  async function loadPlay(kind) {
    const instruments = await baseLoadInstrument(kind);
    if (!PLAY_KINDS.has(kind)) return instruments;
    for (const src of COMMON) await modules.loadScript(src);
    for (const src of PRE_SCRIPTS[kind] || []) await modules.loadScript(src);
    for (const src of OPTIONAL_PRE_SCRIPTS[kind] || []) {
      try {
        await modules.loadScript(src);
      } catch (error) {
        console.warn(`[GeoGeek] Optional Play domain module failed: ${src}. Runtime fallback remains available.`, error);
      }
    }
    await modules.loadScript(SCRIPT[kind]);
    if (kind === 'locate') window.GeoPlay?.core?.ensureStyle?.('play/orient/orient.css?v=20261003h', 'orient-trace');
    for (const src of OPTIONAL_POST_SCRIPTS[kind] || []) {
      try {
        await modules.loadScript(src);
      } catch (error) {
        console.warn(`[GeoGeek] Optional Play view enhancement failed: ${src}. Core instrument remains available.`, error);
      }
    }
    REGISTER[kind]?.();
    if (window.GeoPlayOrient) window.GeoPlayOrient.register?.();
    return instruments || window.GeoInstruments;
  }

  function isPlayMounted(kind) {
    const stage = document.getElementById('instrumentStage');
    const domKind = PLAY_DOM_KIND[kind];
    return Boolean(stage?.querySelector(`.play-shell[data-play-kind="${domKind}"], .play-v2-shell[data-play-kind="${domKind}"]`));
  }

  function enableSvgButtonKeyboard(root = document) {
    root.querySelectorAll('.play-shell[data-play-kind="connect"] .connect-node[role="button"]:not([data-keyboard-activation]), .play-v2-shell[data-play-kind="connect"] .connect-v2-node[role="button"]:not([data-keyboard-activation])').forEach(node => {
      node.dataset.keyboardActivation = '1';
      node.addEventListener('keydown', event => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
      });
    });
  }

  function enableProjectRouteKeyboard(root = document) {
    const shell = root.querySelector('.play-shell[data-play-kind="project"]');
    if (!shell) return;
    const hit = shell.querySelector('.project-hit');
    if (!hit) return;

    const commit = [...shell.querySelectorAll('.play-action')].find(button => button.textContent.trim() === 'COMMIT ROUTE');
    if (!commit || hit.dataset.routeKeyboard === '1') return;

    hit.dataset.routeKeyboard = '1';
    hit.setAttribute('tabindex', '0');
    hit.setAttribute('role', 'application');
    hit.setAttribute('aria-label', 'Route judgment. Use arrow keys to bend the route, then press Enter to commit.');
    hit.dataset.routeOffsetX = '0';
    hit.dataset.routeOffsetY = '-80';

    const drawKeyboardRoute = () => {
      const svg = hit.closest('svg');
      const judgment = svg?.querySelector('.project-judgment');
      const points = svg ? [...svg.querySelectorAll('.project-point')] : [];
      if (!judgment || points.length < 2) return false;
      const a = points[0];
      const b = points[1];
      const x1 = Number(a.getAttribute('cx'));
      const y1 = Number(a.getAttribute('cy'));
      const x2 = Number(b.getAttribute('cx'));
      const y2 = Number(b.getAttribute('cy'));
      if (![x1, y1, x2, y2].every(Number.isFinite)) return false;
      const ox = Number(hit.dataset.routeOffsetX || 0);
      const oy = Number(hit.dataset.routeOffsetY || -80);
      const mx = (x1 + x2) / 2 + ox;
      const my = (y1 + y2) / 2 + oy;
      judgment.setAttribute('d', `M${x1},${y1} Q${mx},${my} ${x2},${y2}`);
      judgment.removeAttribute('opacity');
      const currentCommit = [...shell.querySelectorAll('.play-action')].find(button => button.textContent.trim() === 'COMMIT ROUTE');
      if (currentCommit) currentCommit.disabled = false;
      return true;
    };

    hit.addEventListener('keydown', event => {
      const step = event.shiftKey ? 45 : 20;
      if (event.key === 'ArrowUp') hit.dataset.routeOffsetY = String(Number(hit.dataset.routeOffsetY || -80) - step);
      else if (event.key === 'ArrowDown') hit.dataset.routeOffsetY = String(Number(hit.dataset.routeOffsetY || -80) + step);
      else if (event.key === 'ArrowLeft') hit.dataset.routeOffsetX = String(Number(hit.dataset.routeOffsetX || 0) - step);
      else if (event.key === 'ArrowRight') hit.dataset.routeOffsetX = String(Number(hit.dataset.routeOffsetX || 0) + step);
      else if (event.key === 'Enter') {
        const currentCommit = [...shell.querySelectorAll('.play-action')].find(button => button.textContent.trim() === 'COMMIT ROUTE');
        if (currentCommit && !currentCommit.disabled) {
          event.preventDefault();
          currentCommit.click();
        }
        return;
      } else return;
      event.preventDefault();
      drawKeyboardRoute();
    });
  }

  function enhancePlayAccessibility() {
    const stage = document.getElementById('instrumentStage');
    if (!stage) return;
    enableSvgButtonKeyboard(stage);
    enableProjectRouteKeyboard(stage);
  }

  function entryTrigger(kind) {
    return document.querySelector(`[data-instrument="${kind}"]`);
  }

  function setEntryState(trigger, state = 'idle') {
    if (!trigger) return;
    const label = trigger.querySelector('span');
    if (label && !trigger.dataset.playEntryLabel) {
      trigger.dataset.playEntryLabel = label.textContent?.trim() || 'OPEN INSTRUMENT';
    }
    const card = trigger.closest('.project-card');
    if (state === 'opening') {
      trigger.dataset.playEntryState = 'opening';
      trigger.setAttribute('aria-busy', 'true');
      if (label) label.textContent = 'OPENING…';
      if (card) card.dataset.playEntryState = 'opening';
      return;
    }
    trigger.removeAttribute('aria-busy');
    if (state === 'error') {
      trigger.dataset.playEntryState = 'error';
      if (label) label.textContent = 'RETRY PLAY';
      if (card) card.dataset.playEntryState = 'error';
      return;
    }
    delete trigger.dataset.playEntryState;
    if (label && trigger.dataset.playEntryLabel) label.textContent = trigger.dataset.playEntryLabel;
    if (card) delete card.dataset.playEntryState;
  }

  async function openPlay(kind, { updateUrl = false, requestId = 0 } = {}) {
    if (!PLAY_KINDS.has(kind)) return null;
    if (opening.has(kind)) return opening.get(kind);
    const pending = (async () => {
      const instruments = await loadPlay(kind);
      if (requestId && requestId !== entrySequence) return instruments;
      const active = window.GeoInstruments?.getActive?.() === kind;
      if (!active || !isPlayMounted(kind)) {
        if (!instruments?.openByKind) throw new Error(`Play controller unavailable: ${kind}`);
        await instruments.openByKind(kind, { updateUrl });
      }
      const stageError = document.getElementById('instrumentStage')?.querySelector('.instrument-error');
      if (stageError) throw new Error(`Play mounted an error view: ${kind}`);
      if (!isPlayMounted(kind)) throw new Error(`Play did not mount: ${kind}`);
      modules.normalizeInstrumentAria?.(kind);
      queueMicrotask(enhancePlayAccessibility);
      return instruments;
    })();
    opening.set(kind, pending);
    try {
      return await pending;
    } finally {
      if (opening.get(kind) === pending) opening.delete(kind);
    }
  }

  const stage = document.getElementById('instrumentStage');
  if (stage) {
    const observer = new MutationObserver(() => queueMicrotask(enhancePlayAccessibility));
    observer.observe(stage, { childList: true, subtree: true });
    enhancePlayAccessibility();
  }

  modules.loadInstrument = loadPlay;
  modules.__geoSpatialPlayRuntime = true;

  const scheduleWarm = () => warmPlayBase();
  if ('requestIdleCallback' in window) {
    requestIdleCallback(scheduleWarm, { timeout: 1400 });
  } else {
    setTimeout(scheduleWarm, 350);
  }

  // Expired attempts must not be reused by later clicks.
  function abandonOpening(kind) {
    entrySequence += 1;
    opening.delete(kind);
    const stage = document.getElementById('instrumentStage');
    if (window.GeoInstruments?.getActive?.() === kind &&
        !isPlayMounted(kind) && !stage?.querySelector('.instrument-error')) {
      window.GeoInstruments?.close?.();
    }
  }

  function showStageRetry(kind) {
    const stageError = document.getElementById('instrumentStage')?.querySelector('.instrument-error');
    if (!stageError || stageError.querySelector('[data-play-retry]')) return;
    const retry = document.createElement('button');
    retry.type = 'button';
    retry.className = 'play-action';
    retry.dataset.playRetry = kind;
    retry.textContent = 'RETRY PLAY';
    retry.addEventListener('click', async () => {
      const requestId = ++entrySequence;
      opening.clear();
      retry.disabled = true;
      try {
        await withEntryTimeout(openPlay(kind, { updateUrl: true, requestId }));
        if (requestId !== entrySequence) return;
        if (!isPlayMounted(kind)) throw new Error('Play retry did not mount: ' + kind);
        setEntryState(entryTrigger(kind), 'idle');
      } catch (error) {
        if (requestId !== entrySequence) return;
        abandonOpening(kind);
        console.warn(`[GeoGeek] Play ${kind} retry failed.`, error);
        setEntryState(entryTrigger(kind), 'error');
        showStageRetry(kind);
      } finally {
        retry.disabled = false;
      }
    });
    stageError.appendChild(retry);
  }

  function withEntryTimeout(promise, ms = ENTRY_TIMEOUT_MS) {
    let timer = 0;
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error('Play startup timed out.')), ms);
    });
    return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
  }

  window.addEventListener('click', async event => {
    const trigger = event.target.closest?.('[data-instrument]');
    const kind = trigger?.dataset.instrument;
    if (!PLAY_KINDS.has(kind)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (trigger.dataset.playEntryState === 'opening') return;

    const requestId = ++entrySequence;
    // New user intent supersedes every pending Play opening, even the same kind.
    opening.clear();
    document.querySelectorAll('[data-play-entry-state="opening"]').forEach(node => {
      if (node !== trigger) setEntryState(node, 'idle');
    });
    setEntryState(trigger, 'opening');

    try {
      await withEntryTimeout(openPlay(kind, { updateUrl: true, requestId }));
      if (requestId !== entrySequence) return;
      setEntryState(trigger, 'idle');
    } catch (error) {
      if (requestId !== entrySequence) return;
      const dialog = document.getElementById('instrumentDialog');
      if (dialog?.open && window.GeoInstruments?.getActive?.() === kind && isPlayMounted(kind)) {
        setEntryState(trigger, 'idle');
        return;
      }
      abandonOpening(kind);
      console.warn(`[GeoGeek] Play ${kind} failed to open or mount.`, error);
      setEntryState(trigger, 'error');
      // Keep the failure visible and retryable. Do not navigate in a loop
      // while scripts are still loading or the current instrument already matches.
      const status = document.getElementById('instrumentReadout');
      if (status) status.textContent = `PLAY / ${kind.toUpperCase()} / LOAD FAILED · RETRY PLAY`;
      showStageRetry(kind);
    }
  }, true);

  const requested = new URLSearchParams(location.search).get('instrument');
  if (PLAY_KINDS.has(requested)) queueMicrotask(async () => {
    const requestId = ++entrySequence;
    opening.clear();
    const trigger = entryTrigger(requested);
    setEntryState(trigger, 'opening');
    try {
      await withEntryTimeout(openPlay(requested, { updateUrl: false, requestId }));
      if (requestId !== entrySequence) return;
      setEntryState(trigger, 'idle');
    } catch (error) {
      if (requestId !== entrySequence) return;
      abandonOpening(requested);
      console.warn(`[GeoGeek] Direct Play ${requested} could not initialize.`, error);
      setEntryState(trigger, 'error');
      showStageRetry(requested);
    }
  });
})();