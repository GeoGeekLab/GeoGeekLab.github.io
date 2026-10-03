(() => {
  'use strict';

  const modules = window.GeoModules;
  if (!modules?.loadInstrument || modules.__geoSpatialPlayRuntime) return;

  const baseLoadInstrument = modules.loadInstrument.bind(modules);
  const PLAY_KINDS = new Set(['locate', 'zone', 'path', 'project']);
  const PLAY_DOM_KIND = {
    locate: 'orient',
    zone: 'bound',
    path: 'connect',
    project: 'project'
  };
  const COMMON = [
    'play/play-core.js?v=20261002c',
    'play/play-shell.js?v=20261002c',
    'play/play-trace.js?v=20261002c'
  ];
  const PRE_SCRIPT = {
    locate: 'play/orient/orient-geometry.js?v=20261003a'
  };
  const SCRIPT = {
    locate: 'play/orient/orient.js?v=20261003a',
    zone: 'play/bound/bound.js?v=20261002c',
    path: 'play/connect/connect.js?v=20261002c',
    project: 'play/project/project.js?v=20261002c'
  };
  const REGISTER = {
    locate: () => window.GeoPlayOrient?.register?.(),
    zone: () => window.GeoPlayBound?.register?.(),
    path: () => window.GeoPlayConnect?.register?.(),
    project: () => window.GeoPlayProject?.register?.()
  };

  async function loadPlay(kind) {
    const instruments = await baseLoadInstrument(kind);
    if (!PLAY_KINDS.has(kind)) return instruments;
    for (const src of COMMON) await modules.loadScript(src);
    if (PRE_SCRIPT[kind]) await modules.loadScript(PRE_SCRIPT[kind]);
    await modules.loadScript(SCRIPT[kind]);
    REGISTER[kind]?.();
    // games.js can be loaded later for a transitional Play and will re-register
    // its legacy locate mount. Restore ORIENT whenever its implementation exists.
    if (window.GeoPlayOrient) window.GeoPlayOrient.register?.();
    return instruments || window.GeoInstruments;
  }

  function isPlayMounted(kind) {
    const stage = document.getElementById('instrumentStage');
    const domKind = PLAY_DOM_KIND[kind];
    return Boolean(stage?.querySelector(`.play-shell[data-play-kind="${domKind}"]`));
  }

  function enableSvgButtonKeyboard(root = document) {
    root.querySelectorAll('.play-shell[data-play-kind="connect"] .connect-node[role="button"]:not([data-keyboard-activation])').forEach(node => {
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

  const stage = document.getElementById('instrumentStage');
  if (stage) {
    const observer = new MutationObserver(() => queueMicrotask(enhancePlayAccessibility));
    observer.observe(stage, { childList: true, subtree: true });
    enhancePlayAccessibility();
  }

  modules.loadInstrument = loadPlay;
  modules.__geoSpatialPlayRuntime = true;

  window.addEventListener('click', async event => {
    const trigger = event.target.closest?.('[data-instrument]');
    const kind = trigger?.dataset.instrument;
    if (!PLAY_KINDS.has(kind)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const instruments = await loadPlay(kind);
      await instruments?.openByKind?.(kind, { updateUrl: true });
      modules.normalizeInstrumentAria?.(kind);
      queueMicrotask(enhancePlayAccessibility);
    } catch (error) {
      console.warn(`[GeoGeek] Play ${kind} failed to load; retry remains available.`, error);
    }
  }, true);

  // lab-page.js can begin resolving a direct ?instrument= request before this
  // runtime takes ownership. Load the requested Play first, then inspect the
  // actual mounted DOM rather than trusting the transitional instrument key:
  // legacy Locate/Zone/Path and their replacements intentionally share keys.
  const requested = new URLSearchParams(location.search).get('instrument');
  if (PLAY_KINDS.has(requested)) queueMicrotask(async () => {
    try {
      const instruments = await loadPlay(requested);
      const active = window.GeoInstruments?.getActive?.() === requested;
      if (!active || !isPlayMounted(requested)) {
        await instruments?.openByKind?.(requested, { updateUrl: false });
      }
      queueMicrotask(enhancePlayAccessibility);
    } catch (error) {
      console.warn(`[GeoGeek] Direct Play ${requested} could not initialize.`, error);
    }
  });
})();