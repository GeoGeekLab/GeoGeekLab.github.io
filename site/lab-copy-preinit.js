(() => {
  'use strict';

  // Lab-specific copy and collection contracts must exist before app.js renders.
  // Keep this layer small: it aligns the authored archive with the Lab entry model.
  const root = window.GEOGEEK_DATA?.en;
  const ui = root?.ui;
  if (!root || !ui) return;

  const OBSERVATORY_IDS = ['l04', 'l05', 'l06', 'l10', 'l11', 'l12'];
  const PLAY_IDS = ['l07', 'l08', 'l09', 'l13'];
  const OBSERVATORY_KINDS = new Set(['orbit', 'earth', 'flow', 'pulse', 'figure', 'world']);
  const PLAY_KINDS = new Set(['locate', 'zone', 'path', 'project']);

  if (ui.pages?.lab) {
    ui.pages.lab.intro = 'Observe, compare, and reason through space.';
  }

  if (ui.lab) {
    ui.lab.principle = 'Every instrument declares what it can see — and what it cannot.';
    ui.lab.enter = 'OPEN INSTRUMENT';
  }

  // Project is a first-class Play record. The interactive runtime still owns its
  // instrument behavior, but the record must exist before the site model is built.
  if (Array.isArray(root.lab) && !root.lab.some(item => item.id === 'l13')) {
    root.lab.push({
      id: 'l13',
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

    link.href = `records/lab-${id}.html`;
    link.dataset.recordRef = `lab:${id}`;
    const label = link.querySelector('span');
    const arrow = link.querySelector('b');
    if (label) label.textContent = 'READ RECORD';
    if (arrow) arrow.textContent = '↗';
    const title = card.querySelector('h2, h3')?.textContent?.trim() || id;
    link.setAttribute('aria-label', `Read ${title} record`);
  }

  function normalizeCollection() {
    const list = document.getElementById('labList');
    if (!list) return;

    const observatoryCard = document.getElementById('l04');
    const observatoryBlock = observatoryCard?.closest('.lab-group-block');
    const observatoryGrid = observatoryBlock?.querySelector('.project-grid');

    if (observatoryBlock && observatoryGrid) {
      ['l11', 'l12'].forEach(id => {
        const card = document.getElementById(id);
        if (card && card.parentElement !== observatoryGrid) observatoryGrid.appendChild(card);
      });

      observatoryBlock.classList.remove('lab-group-studies');
      observatoryBlock.classList.add('lab-group-observatory');
      observatoryBlock.dataset.groupKey = 'observatory';
      const label = observatoryBlock.querySelector('.lab-group-label span');
      if (label) label.textContent = 'OBSERVATORY';
      const purpose = observatoryBlock.querySelector('.lab-group-purpose');
      if (purpose) {
        purpose.textContent = 'Observe changing systems and representations through declared sources, models, projections, time windows, and spatial extents.';
      }
    }

    list.querySelectorAll('.lab-group-block').forEach(block => {
      if (!block.querySelector('.project-card')) block.remove();
    });

    const playBlock = document.getElementById('l07')?.closest('.lab-group-block');
    if (playBlock) {
      playBlock.classList.remove('lab-group-studies');
      playBlock.classList.add('lab-group-play');
      playBlock.dataset.groupKey = 'play';
      const label = playBlock.querySelector('.lab-group-label span');
      if (label) label.textContent = 'PLAY / SPATIAL REASONING';
    }

    if (observatoryBlock && playBlock && observatoryBlock.nextElementSibling !== playBlock) {
      list.insertBefore(observatoryBlock, playBlock);
    }

    [...OBSERVATORY_IDS, ...PLAY_IDS].forEach(id => ensureRecordAction(document.getElementById(id), id));
  }

  function syncWorkspaceGroupLabel() {
    const dialog = document.getElementById('instrumentDialog');
    const label = document.getElementById('instrumentGroupLabel');
    if (!dialog || !label) return;
    const kind = dialog.dataset.instrumentKind || '';
    if (OBSERVATORY_KINDS.has(kind)) label.textContent = 'OBSERVATORY';
    else if (PLAY_KINDS.has(kind)) label.textContent = 'PLAY / SPATIAL REASONING';
  }

  async function openDirectProject() {
    if (!document.getElementById('labList')) return;
    if (new URLSearchParams(location.search).get('instrument') !== 'project') return;

    const dialog = document.getElementById('instrumentDialog');
    const stage = document.getElementById('instrumentStage');
    if (dialog?.open) return;
    if (dialog) {
      dialog.dataset.instrumentKind = 'project';
      dialog.dataset.instrumentFamily = 'field';
    }
    if (stage) stage.dataset.instrumentKind = 'project';

    let attempts = 0;
    const retry = async () => {
      if (dialog?.open || attempts >= 120) return;
      attempts += 1;
      const modules = window.GeoModules;
      if (!modules?.loadInstrument) {
        setTimeout(retry, 50);
        return;
      }
      try {
        const instruments = await modules.loadInstrument('project');
        if (!dialog?.open) await instruments?.openByKind?.('project', { updateUrl: false });
        modules.normalizeInstrumentAria?.('project');
        syncWorkspaceGroupLabel();
      } catch (error) {
        console.warn('[GeoGeek] Direct Project instrument could not initialize yet.', error);
      }
    };
    retry();
  }

  document.addEventListener('DOMContentLoaded', () => {
    normalizeCollection();
    syncWorkspaceGroupLabel();

    const dialog = document.getElementById('instrumentDialog');
    if (dialog) {
      const observer = new MutationObserver(() => queueMicrotask(syncWorkspaceGroupLabel));
      observer.observe(dialog, { attributes: true, attributeFilter: ['data-instrument-kind', 'open'] });
    }

    openDirectProject();
  });
})();
