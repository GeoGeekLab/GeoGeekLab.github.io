(() => {
  'use strict';

  const GROUPS = {
    observatory: {
      label: 'OBSERVATORY',
      copy: 'Observe changing systems through declared sources, time windows, models, and spatial extents.'
    },
    studies: {
      label: 'STUDIES',
      copy: 'Compare representations and transformations to see what each method preserves, changes, or removes.'
    },
    play: {
      label: 'PLAY / SPATIAL REASONING',
      copy: 'Practice location, boundary, adjacency, and path reasoning through direct geographic feedback.'
    }
  };

  const KIND_GROUP = {
    orbit: 'observatory',
    earth: 'observatory',
    flow: 'observatory',
    pulse: 'observatory',
    figure: 'studies',
    world: 'studies',
    locate: 'play',
    zone: 'play',
    path: 'play'
  };

  const MODE_HELP = {
    focus: 'Visualization only',
    work: 'Primary controls',
    inspect: 'Full context + provenance'
  };

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const dialog = document.getElementById('instrumentDialog');
  const list = document.getElementById('labList');
  let lastInstrumentTrigger = null;

  function setEntryCopy() {
    const intro = document.querySelector('.page-title .page-intro');
    if (intro) {
      intro.textContent = 'Interactive geographic instruments for observing change, comparing representations, and reasoning through space.';
    }

    const method = document.querySelector('.lab-method-note');
    if (method) method.textContent = 'Built to expose scale, assumptions, sources, and limits.';

    const principle = document.getElementById('labPrinciple');
    if (principle) principle.textContent = 'Every instrument declares what it can see — and what it cannot.';
  }

  function explainScale() {
    const scale = document.querySelector('.scale-ui');
    if (!scale) return;
    let explainer = document.getElementById('scaleExplainer');
    if (!explainer) {
      explainer = document.createElement('p');
      explainer.id = 'scaleExplainer';
      explainer.className = 'scale-explainer';
      explainer.textContent = 'Semantic scale — changes information depth, not geographic map scale.';
      scale.appendChild(explainer);
    }
    scale.setAttribute('aria-describedby', 'scaleExplainer');
    scale.setAttribute('title', 'Semantic information scale, not a geographic map scale');
  }

  function groupKeyFor(block) {
    if (block.classList.contains('lab-group-observatory')) return 'observatory';
    if (block.classList.contains('lab-group-studies')) return 'studies';
    if (block.classList.contains('lab-group-play')) return 'play';
    const label = block.querySelector('.lab-group-label span')?.textContent?.toLowerCase() || '';
    if (label.includes('observatory')) return 'observatory';
    if (label.includes('play')) return 'play';
    return 'studies';
  }

  function addGroupPurpose(block, key) {
    if (block.querySelector('.lab-group-purpose')) return;
    const label = block.querySelector('.lab-group-label');
    if (!label || !GROUPS[key]) return;
    const copy = document.createElement('p');
    copy.className = 'lab-group-purpose';
    copy.textContent = GROUPS[key].copy;
    label.after(copy);
  }

  function addConditions(card, kind) {
    if (!kind || card.querySelector('.lab-card-conditions')) return;
    const source = window.GEOGEEK_DATA?.en?.ui?.lab?.conditions?.[kind];
    if (!Array.isArray(source) || !source.length) return;

    const preferredKeys = ['SOURCE', 'FEED', 'SENSOR', 'MODEL', 'GEOMETRY', 'INPUT', 'WINDOW', 'TIME', 'PROJECTION', 'MEASURE', 'RELATION', 'TASK'];
    const ranked = [...source].sort((a, b) => {
      const ai = preferredKeys.indexOf(String(a?.[0] || '').toUpperCase());
      const bi = preferredKeys.indexOf(String(b?.[0] || '').toUpperCase());
      return (ai < 0 ? 999 : ai) - (bi < 0 ? 999 : bi);
    }).slice(0, 2);

    const dl = document.createElement('dl');
    dl.className = 'lab-card-conditions';
    ranked.forEach(([key, value]) => {
      const item = document.createElement('div');
      const dt = document.createElement('dt');
      const dd = document.createElement('dd');
      dt.textContent = key;
      dd.textContent = value;
      item.append(dt, dd);
      dl.appendChild(item);
    });

    const description = card.querySelector('.project-copy > p');
    if (description) description.after(dl);
  }

  function makeActionsExplicit(card) {
    const record = card.querySelector('.project-link span');
    if (record) record.textContent = 'READ RECORD';

    const enter = card.querySelector('.lab-enter span');
    if (enter) enter.textContent = 'OPEN INSTRUMENT';

    const trigger = card.querySelector('[data-instrument]');
    if (trigger) {
      trigger.setAttribute('aria-label', `Open ${card.querySelector('h2, h3')?.textContent || 'instrument'} workspace`);
      addConditions(card, trigger.dataset.instrument);
    }
  }

  function enhanceCollection() {
    if (!list) return;
    const blocks = [...list.querySelectorAll('.lab-group-block')];
    if (!blocks.length) return;

    blocks.forEach(block => {
      const key = groupKeyFor(block);
      block.dataset.groupKey = key;
      addGroupPurpose(block, key);
    });

    ['observatory', 'studies', 'play'].forEach(key => {
      const block = blocks.find(item => item.dataset.groupKey === key);
      if (block) list.appendChild(block);
    });

    list.querySelectorAll('.project-card').forEach(card => makeActionsExplicit(card));
    applyHashTarget();
  }

  function applyHashTarget() {
    if (!list) return;
    list.querySelectorAll('.is-target-reveal').forEach(node => node.classList.remove('is-target-reveal'));
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (!id) return;
    const target = document.getElementById(id);
    if (!target?.classList.contains('project-card')) return;
    target.classList.add('is-target-reveal');
    target.setAttribute('data-deep-link-target', 'true');
    setTimeout(() => target.classList.remove('is-target-reveal'), reduced ? 0 : 1500);
  }

  function ensureWorkspaceBreadcrumb() {
    if (!dialog) return;
    const stack = dialog.querySelector('.instrument-head > div');
    if (!stack || stack.querySelector('.instrument-breadcrumb')) return;

    const breadcrumb = document.createElement('div');
    breadcrumb.className = 'instrument-breadcrumb';
    breadcrumb.setAttribute('aria-label', 'Instrument location');
    breadcrumb.innerHTML = '<span>LAB</span><span id="instrumentGroupLabel">INSTRUMENT</span>';
    stack.prepend(breadcrumb);
  }

  function explainWorkspaceModes() {
    document.querySelectorAll('[data-workspace-mode]').forEach(button => {
      const mode = button.dataset.workspaceMode;
      const help = MODE_HELP[mode];
      if (!help) return;
      button.dataset.modeHelp = help;
      button.title = help;
      button.setAttribute('aria-label', `${button.textContent.trim()}: ${help}`);
    });
  }

  function syncWorkspaceIdentity() {
    if (!dialog) return;
    ensureWorkspaceBreadcrumb();
    explainWorkspaceModes();

    const kind = dialog.dataset.instrumentKind || '';
    const group = KIND_GROUP[kind];
    const label = document.getElementById('instrumentGroupLabel');
    if (label) label.textContent = GROUPS[group]?.label || 'INSTRUMENT';

    const close = document.getElementById('instrumentClose');
    if (close) close.setAttribute('aria-keyshortcuts', 'Escape');
  }

  function preserveReturnContext() {
    document.addEventListener('pointerdown', event => {
      const trigger = event.target.closest?.('[data-instrument]');
      if (trigger) lastInstrumentTrigger = trigger;
    }, true);

    dialog?.addEventListener('close', () => {
      const trigger = lastInstrumentTrigger;
      if (!trigger?.isConnected) return;
      trigger.focus({ preventScroll: true });
      const card = trigger.closest('.project-card');
      if (!card) return;
      const rect = card.getBoundingClientRect();
      if (rect.bottom < 72 || rect.top > innerHeight - 72) {
        card.scrollIntoView({ block: 'center', behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  }

  function init() {
    setEntryCopy();
    explainScale();
    enhanceCollection();
    ensureWorkspaceBreadcrumb();
    explainWorkspaceModes();
    syncWorkspaceIdentity();
    preserveReturnContext();

    addEventListener('hashchange', applyHashTarget);

    if (list) {
      const listObserver = new MutationObserver(() => enhanceCollection());
      listObserver.observe(list, { childList: true });
    }

    if (dialog) {
      const dialogObserver = new MutationObserver(records => {
        if (records.some(record => record.attributeName === 'data-instrument-kind' || record.attributeName === 'open')) {
          syncWorkspaceIdentity();
        }
      });
      dialogObserver.observe(dialog, { attributes: true, attributeFilter: ['data-instrument-kind', 'open'] });
    }
  }

  init();
})();
