(() => {
  'use strict';

  const list = document.querySelector('#labList');
  if (!list) return;

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
})();
