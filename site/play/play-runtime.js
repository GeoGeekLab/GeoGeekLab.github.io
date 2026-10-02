(() => {
  'use strict';

  const modules = window.GeoModules;
  if (!modules?.loadInstrument || modules.__geoSpatialPlayRuntime) return;

  const baseLoadInstrument = modules.loadInstrument.bind(modules);
  const PLAY_KINDS = new Set(['locate', 'zone', 'path', 'project']);
  const COMMON = [
    'play/play-core.js?v=20261002b',
    'play/play-shell.js?v=20261002b',
    'play/play-trace.js?v=20261002b'
  ];
  const SCRIPT = {
    locate: 'play/orient/orient.js?v=20261002b',
    zone: 'play/bound/bound.js?v=20261002b',
    path: 'play/connect/connect.js?v=20261002b',
    project: 'play/project/project.js?v=20261002b'
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
    // Legacy games may have registered locate while loading Zone/Path.
    if (window.GeoPlayOrient) window.GeoPlayOrient.register?.();
    return instruments || window.GeoInstruments;
  }

  modules.loadInstrument = loadPlay;
  modules.__geoSpatialPlayRuntime = true;

  // Window capture runs before the older document-level instrument handlers.
  // Spatial Play owns these four keys while the rest of Lab keeps the existing router.
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
})();