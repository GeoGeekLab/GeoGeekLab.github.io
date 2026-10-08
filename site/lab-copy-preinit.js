(() => {
  'use strict';

  // Lab-specific copy and collection contracts must exist before app.js renders.
  // Keep this layer small: it aligns the authored archive with the Lab entry model.
  const root = window.GEOGEEK_DATA?.en;
  const ui = root?.ui;
  if (!root || !ui) return;

  const OBSERVATORY_IDS = ['l04', 'l05', 'l06', 'l10', 'l11', 'l12', 'l13'];
  const PLAY_IDS = ['l07', 'l08', 'l09', 'l14', 'l15', 'l16'];
  const OBSERVATORY_KINDS = new Set(['orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'water']);
  const PLAY_KINDS = new Set(['locate', 'zone', 'path', 'project', 'light', 'swath']);

  if (ui.pages?.lab) {
    ui.pages.lab.intro = 'Observe, compare, and reason through space.';
  }

  if (ui.lab) {
    ui.lab.principle = 'Every instrument declares what it can see — and what it cannot.';
    ui.lab.enter = 'OPEN INSTRUMENT';
  }

  // Project is a first-class Play record. The interactive runtime still owns its
  // instrument behavior, but the record must exist before the site model is built.
  if (Array.isArray(root.lab) && !root.lab.some(item => item.id === 'l14')) {
    root.lab.push({
      id: 'l14',
      group: 'play',
      visual: 'project',
      featured: false,
      instrument: 'project',
      type: 'Play',
      status: 'Play',
      title: 'Project',
      tags: ['Surface', 'Projection', 'Distortion'],
      description: 'Make a spatial judgment before the representation is declared, then change projection or viewpoint and inspect which relation moved.',
      coord: 'surface / projection / distortion',
      instrumentKicker: 'PLAY / SURFACE / PROJECTION / DISTORTION',
      source: 'Natural Earth 1:110m · D3 geographic projections'
    });
  }

  function ensureRecordAction(card, id) {
    const actions = card?.querySelector('.project-actions');
    if (!actions) return;

    let link = card.querySelector('.project-link');
    if (!link) {
      link = document.createElement('a');
      link.className = 'project-cta project-link';
      link.dataset.recordRef = `lab:${id}`;
      link.dataset.transitionSource = '';
      link.innerHTML = '<span>READ RECORD</span><b>↗</b>';
      actions.prepend(link);
    }

    const href = `records/lab-${id}.html`;
    if (link.getAttribute('href') !== href) link.href = href;
    if (link.dataset.recordRef !== `lab:${id}`) link.dataset.recordRef = `lab:${id}`;
    const label = link.querySelector('span');
    const arrow = link.querySelector('b');
    if (label?.textContent !== 'READ RECORD') label.textContent = 'READ RECORD';
    if (arrow?.textContent !== '↗') arrow.textContent = '↗';
    const title = card.querySelector('h2, h3')?.textContent?.trim() || id;
    const ariaLabel = `Read ${title} record`;
    if (link.getAttribute('aria-label') !== ariaLabel) link.setAttribute('aria-label', ariaLabel);
  }

  function bindProjectScale(card) {
    if (!card || card.dataset.labProjectScaleBound === '1') return;
    card.dataset.labProjectScaleBound = '1';
    const enter = () => {
      if (!document.getElementById('instrumentDialog')?.open) window.GeoScale?.apply?.('RECORD');
    };
    const leave = () => {
      if (document.getElementById('instrumentDialog')?.open) window.GeoScale?.apply?.('DETAIL');
      else window.GeoScale?.restore?.();
    };
    card.addEventListener('pointerenter', enter);
    card.addEventListener('focusin', enter);
    card.addEventListener('pointerleave', leave);
    card.addEventListener('focusout', event => {
      if (!card.contains(event.relatedTarget)) leave();
    });
  }

  let normalizingCollection = false;
  function normalizeCollection() {
    if (normalizingCollection) return;
    const list = document.getElementById('labList');
    if (!list) return;
    normalizingCollection = true;

    try {
      const observatoryCard = document.getElementById('l04');
      const observatoryBlock = observatoryCard?.closest('.lab-group-block');
      const observatoryGrid = observatoryBlock?.querySelector('.project-grid');

      if (observatoryBlock && observatoryGrid) {
        ['l11', 'l12'].forEach(id => {
          const card = document.getElementById(id);
          if (card && card.parentElement !== observatoryGrid) observatoryGrid.appendChild(card);
        });

        if (observatoryBlock.classList.contains('lab-group-studies')) observatoryBlock.classList.remove('lab-group-studies');
        if (!observatoryBlock.classList.contains('lab-group-observatory')) observatoryBlock.classList.add('lab-group-observatory');
        if (observatoryBlock.dataset.groupKey !== 'observatory') observatoryBlock.dataset.groupKey = 'observatory';
        const label = observatoryBlock.querySelector('.lab-group-label span');
        if (label && label.textContent !== 'OBSERVATORY') label.textContent = 'OBSERVATORY';
        const purpose = observatoryBlock.querySelector('.lab-group-purpose');
        const purposeText = 'Observe changing systems and representations through declared sources, models, projections, time windows, and spatial extents.';
        if (purpose && purpose.textContent !== purposeText) purpose.textContent = purposeText;
      }

      list.querySelectorAll('.lab-group-block').forEach(block => {
        if (!block.querySelector('.project-card')) block.remove();
      });

      const playBlock = document.getElementById('l07')?.closest('.lab-group-block');
      if (playBlock) {
        if (playBlock.classList.contains('lab-group-studies')) playBlock.classList.remove('lab-group-studies');
        if (!playBlock.classList.contains('lab-group-play')) playBlock.classList.add('lab-group-play');
        if (playBlock.dataset.groupKey !== 'play') playBlock.dataset.groupKey = 'play';
        const label = playBlock.querySelector('.lab-group-label span');
        if (label && label.textContent !== 'PLAY / SPATIAL REASONING') label.textContent = 'PLAY / SPATIAL REASONING';
      }

      if (observatoryBlock && playBlock && observatoryBlock.nextElementSibling !== playBlock) {
        list.insertBefore(observatoryBlock, playBlock);
      }

      [...OBSERVATORY_IDS, ...PLAY_IDS].forEach(id => ensureRecordAction(document.getElementById(id), id));
      bindProjectScale(document.getElementById('l14'));
    } finally {
      normalizingCollection = false;
    }
  }

  // app.js, lab-page.js, and play-bootstrap.js each touch the same collection.
  // Normalize after each mutation checkpoint so lab-optimization.js sees the final contract.
  const labList = document.getElementById('labList');
  const collectionObserver = labList ? new MutationObserver(normalizeCollection) : null;
  collectionObserver?.observe(labList, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class']
  });

  function syncWorkspaceGroupLabel() {
    const dialog = document.getElementById('instrumentDialog');
    const label = document.getElementById('instrumentGroupLabel');
    if (!dialog || !label) return;
    const kind = dialog.dataset.instrumentKind || '';
    if (OBSERVATORY_KINDS.has(kind)) label.textContent = 'OBSERVATORY';
    else if (PLAY_KINDS.has(kind)) label.textContent = 'PLAY / SPATIAL REASONING';
  }


  document.addEventListener('DOMContentLoaded', () => {
    normalizeCollection();
    collectionObserver?.disconnect();
    syncWorkspaceGroupLabel();

    const dialog = document.getElementById('instrumentDialog');
    if (dialog) {
      const observer = new MutationObserver(() => queueMicrotask(syncWorkspaceGroupLabel));
      observer.observe(dialog, { attributes: true, attributeFilter: ['data-instrument-kind', 'open'] });
    }

  });
})();
