(() => {
  'use strict';

  const model = window.GEOGEEK_MODEL;
  if (!model) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const SCALE = {
    SITE: '1 : 250,000',
    POSITION: '1 : 100,000',
    COLLECTION: '1 : 25,000',
    RECORD: '1 : 2,500',
    DETAIL: '1 : 500'
  };
  const order = ['SITE', 'POSITION', 'COLLECTION', 'RECORD', 'DETAIL'];
  const ui = model.data.ui || {};
  const scale = $('.scale-ui');
  if (!scale) return;
  const legend = $('.scale-legend', scale);
  if (!legend) return;

  const labels = ui.scale?.levels || {};
  const state = {
    activeLevel: model.currentContext().level || 'SITE',
    collection: model.currentContext().collection || null,
    ref: model.currentContext().ref || null,
    detailHref: model.currentContext().ref ? model.detailForRecord(model.currentContext().ref) : null
  };

  const levelName = level => labels[level] || level;

  // Convert the static legend to one accessible scale control without changing its visual grammar.
  const rows = $$(':scope > i', legend);
  rows.forEach((row, index) => {
    const level = order[index];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'scale-step';
    button.dataset.semanticScale = level;
    button.innerHTML = row.innerHTML;
    button.setAttribute('aria-label', `${levelName(level)} · ${SCALE[level]}`);
    row.replaceWith(button);
  });

  const previous = document.createElement('button');
  previous.type = 'button';
  previous.className = 'scale-nudge scale-nudge-prev';
  previous.setAttribute('aria-label', model.locale === 'zh' ? '缩小信息尺度' : 'Zoom information scale out');
  previous.textContent = '‹';

  const next = document.createElement('button');
  next.type = 'button';
  next.className = 'scale-nudge scale-nudge-next';
  next.setAttribute('aria-label', model.locale === 'zh' ? '放大信息尺度' : 'Zoom information scale in');
  next.textContent = '›';

  scale.insertBefore(previous, scale.firstChild);
  scale.appendChild(next);
  scale.setAttribute('role', 'group');

  const buttons = $$('.scale-step', legend);

  function routeFor(level) {
    if (level === 'SITE' || level === 'POSITION') return { kind: 'map', level };
    if (level === 'COLLECTION') {
      if (state.collection) return { kind: 'map', level: 'COLLECTION', collection: state.collection };
      return { kind: 'map', level: 'COLLECTION' };
    }
    if (level === 'RECORD') {
      if (state.ref) return { kind: 'map', level: 'RECORD', collection: state.collection, ref: state.ref };
      return null;
    }
    if (level === 'DETAIL') {
      const href = state.detailHref || (state.ref ? model.detailForRecord(state.ref) : null);
      return href ? { kind: 'href', href } : null;
    }
    return null;
  }

  function refresh() {
    $('#scaleText').textContent = SCALE[state.activeLevel] || SCALE.COLLECTION;
    $('#scaleLevel').textContent = levelName(state.activeLevel);
    buttons.forEach(button => {
      const level = button.dataset.semanticScale;
      const route = routeFor(level);
      button.disabled = !route;
      button.classList.toggle('is-active', level === state.activeLevel);
      if (level === state.activeLevel) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });
    const index = order.indexOf(state.activeLevel);
    previous.disabled = index <= 0;
    next.disabled = index < 0 || index >= order.length - 1 || !routeFor(order[index + 1]);
    scale.dataset.level = state.activeLevel.toLowerCase();
  }

  async function navigate(level) {
    const route = routeFor(level);
    if (!route) return;
    scale.classList.remove('is-open');
    if (route.kind === 'map') {
      const map = window.GeoMap || await window.GeoModules?.loadMap?.();
      map?.open?.({
        level: route.level,
        collection: route.collection || state.collection,
        ref: route.ref || state.ref
      });
      return;
    }
    const href = route.href;
    if (!href) return;
    if (href.startsWith('#')) {
      const target = $(href);
      target?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      history.replaceState(null, '', href);
      return;
    }
    const here = location.pathname.split('/').pop() || 'index.html';
    if (href === here) {
      $('#main')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      return;
    }
    location.assign(href);
  }

  buttons.forEach(button => button.addEventListener('click', event => {
    event.stopPropagation();
    navigate(button.dataset.semanticScale);
  }));

  previous.addEventListener('click', event => {
    event.stopPropagation();
    const index = order.indexOf(state.activeLevel);
    if (index > 0) navigate(order[index - 1]);
  });
  next.addEventListener('click', event => {
    event.stopPropagation();
    const index = order.indexOf(state.activeLevel);
    if (index >= 0 && index < order.length - 1) navigate(order[index + 1]);
  });

  scale.addEventListener('click', event => {
    if (event.target.closest('.scale-step, .scale-nudge')) return;
    scale.classList.toggle('is-open');
  });
  scale.addEventListener('keydown', event => {
    if (event.key === 'Escape') scale.classList.remove('is-open');
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      const index = order.indexOf(state.activeLevel);
      if (index > 0) navigate(order[index - 1]);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      const index = order.indexOf(state.activeLevel);
      if (index >= 0 && index < order.length - 1) navigate(order[index + 1]);
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!scale.contains(event.target)) scale.classList.remove('is-open');
  });

  function focus(ref, options = {}) {
    if (!model.recordIndex.has(ref)) return;
    const record = model.recordIndex.get(ref);
    state.ref = ref;
    state.collection = record.kind;
    state.detailHref = options.detailHref || model.detailForRecord(ref);
    refresh();
  }
  function setCollection(kind) {
    state.collection = kind || null;
    if (state.ref && model.recordIndex.get(state.ref)?.kind !== kind) {
      state.ref = null;
      state.detailHref = null;
    }
    refresh();
  }
  function setActive(level) {
    if (!order.includes(level)) return;
    state.activeLevel = level;
    refresh();
  }

  const capture = event => {
    const target = event.target.closest?.('[data-record-ref]');
    if (!target) return;
    focus(target.dataset.recordRef, { detailHref: target.dataset.detailHref || null });
  };
  document.addEventListener('pointerover', capture, { passive: true });
  document.addEventListener('focusin', capture);

  window.GeoSemantic = {
    focus,
    setCollection,
    setActive,
    navigate,
    routeFor,
    recordUrl: model.hrefForRecord,
    detailUrl: model.detailForRecord,
    getState: () => ({ ...state })
  };

  refresh();
})();
