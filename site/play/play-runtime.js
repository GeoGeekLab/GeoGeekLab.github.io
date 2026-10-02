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
  const SCRIPT = {
    locate: 'play/orient/orient.js?v=20261002c',
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
    } catch (error) {
      console.warn(`[GeoGeek] Direct Play ${requested} could not initialize.`, error);
    }
  });
})();