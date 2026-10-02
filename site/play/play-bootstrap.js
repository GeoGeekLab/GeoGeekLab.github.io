(() => {
  'use strict';

  function alignOrientContent() {
    const root = window.GEOGEEK_DATA?.en;
    const item = root?.lab?.find(entry => entry.instrument === 'locate');
    if (item) Object.assign(item, {
      status: 'Play',
      title: 'Orient',
      tags: ['Point', 'Reference', 'Error'],
      description: 'Estimate one place from another, then reveal distance and bearing residuals in a reference-centered field.',
      coord: 'reference / bearing / distance',
      instrumentKicker: 'PLAY / POINT / REFERENCE / ERROR',
      source: 'Natural Earth · spherical great-circle model'
    });

    const lab = root?.ui?.lab;
    if (lab?.conditions) lab.conditions.locate = [
      ['FIELD', 'Reference-centered world'],
      ['PROJECTION', 'Azimuthal Equidistant'],
      ['MEASURE', 'Great-circle distance · initial bearing'],
      ['LIMIT', 'Spherical Earth · authored place pairs']
    ];
    if (lab?.games?.locate) Object.assign(lab.games.locate, {
      title: 'A coordinate locates. A relation orients.',
      prompt: 'Estimate the relation.',
      hint: 'Commit a direction and distance before the relation is revealed.'
    });

    const trigger = document.querySelector('[data-instrument="locate"]');
    const card = trigger?.closest('.project-card');
    if (!card) return;
    const meta = card.querySelectorAll('.project-meta span');
    if (meta[0]) meta[0].textContent = 'Play';
    if (meta[1]) meta[1].textContent = 'Point · Reference · Error';
    const title = card.querySelector('h2');
    const copy = card.querySelector('.project-copy > p');
    const coord = card.querySelector('.lab-coord');
    const stamp = card.querySelector('.preview-stamp');
    if (title) title.textContent = 'Orient';
    if (copy) copy.textContent = 'Estimate one place from another. Commit first; reveal the relation second.';
    if (coord) coord.textContent = 'reference / bearing / distance';
    if (stamp) stamp.textContent = 'POINT / REFERENCE / ERROR';
  }

  alignOrientContent();

  const modules = window.GeoModules;
  if (!modules?.loadInstrument || modules.__geoPlayWrapped) return;
  const baseLoadInstrument = modules.loadInstrument.bind(modules);

  modules.loadInstrument = async kind => {
    const instruments = await baseLoadInstrument(kind);

    if (kind === 'locate') {
      await modules.loadScript('play/play-core.js?v=20261002a');
      await modules.loadScript('play/play-shell.js?v=20261002a');
      await modules.loadScript('play/play-trace.js?v=20261002a');
      await modules.loadScript('play/orient/orient.js?v=20261002a');
      window.GeoPlayOrient?.register?.();
    }

    if ((kind === 'zone' || kind === 'path') && !window.GeoGeekInstrumentMounts?.[kind]) {
      await modules.loadScript('games.js');
      // Legacy games register locate too; restore the new ORIENT mount if it has been loaded.
      window.GeoPlayOrient?.register?.();
    }

    return instruments || window.GeoInstruments;
  };

  modules.__geoPlayWrapped = true;

  // Trace replaces the field contents. Restart by remounting the instrument rather
  // than attempting to reuse the detached SVG from the completed session.
  document.addEventListener('click', event => {
    const button = event.target.closest?.('.play-shell[data-play-kind="orient"][data-play-state="trace"] .play-action.is-secondary');
    if (!button || button.textContent.trim() !== 'RESTART ORIENT') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.GeoInstruments?.openByKind?.('locate', { updateUrl: false });
  }, true);
})();