(() => {
  'use strict';

  const model = window.GEOGEEK_MODEL;
  if (!model) return;
  const toggle = document.getElementById('navToggle');
  if (!toggle) return;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const L = model.labels.spatial;
  const order = ['SITE', 'POSITION', 'COLLECTION', 'RECORD'];

  const dialog = document.createElement('dialog');
  dialog.className = 'site-map spatial-browser';
  dialog.id = 'siteMap';
  dialog.setAttribute('aria-labelledby', 'siteMapTitle');
  dialog.innerHTML = `
    <div class="spatial-browser-shell">
      <header class="spatial-browser-head">
        <div><span>${L.mode}</span><h2 id="siteMapTitle">${L.title}</h2></div>
        <div class="site-map-modes" aria-label="${model.locale === 'zh' ? '地图模式' : 'Map mode'}">
          <button class="is-active" type="button" data-map-mode="site" aria-pressed="true">${model.locale === 'zh' ? '全站' : 'SITE'}</button>
          <button type="button" data-map-mode="commons" aria-pressed="false">${model.locale === 'zh' ? '共域' : 'COMMONS'}</button>
        </div>
        <button class="site-map-close" type="button" aria-label="${L.close}">×</button>
      </header>
      <div class="spatial-browser-bar">
        <div class="site-map-route"><span>${L.current}</span><strong id="siteMapCurrent">${L.site}</strong></div>
        <div class="map-scale" aria-label="${L.scale}">
          ${order.map(level => `<button type="button" data-map-scale="${level}"><span>${L[level.toLowerCase()]}</span><small>${level === 'SITE' ? '1 : 250,000' : level === 'POSITION' ? '1 : 100,000' : level === 'COLLECTION' ? '1 : 25,000' : '1 : 2,500'}</small></button>`).join('')}
        </div>
      </div>
      <div class="spatial-browser-body">
        <div class="site-map-viewport" id="siteMapViewport" tabindex="0" aria-label="${L.title}">
          <div class="site-map-field spatial-map-field" id="siteMapField">
            <svg aria-hidden="true" id="siteMapLines" viewBox="0 0 100 100" preserveAspectRatio="none"></svg>
            <div class="site-map-origin-mark" aria-hidden="true"></div>
            <div class="site-map-nodes" id="siteMapNodes"></div>
          </div>
        </div>
        <aside class="map-inspector" id="mapInspector" aria-live="polite"></aside>
      </div>
      <section class="site-map-commons" id="siteMapCommons" hidden>
        <div class="site-map-commons-mount" id="siteMapCommonsMount"></div>
      </section>
      <footer class="site-map-foot spatial-browser-foot">
        <span><b>${L.hint}</b><i>${L.mobileHint}</i></span>
        <button class="site-map-lang" id="mapLangSwitch" type="button">${model.data.ui?.switchLabel || (model.locale === 'zh' ? 'EN' : '中文')}</button>
      </footer>
    </div>`;
  document.body.appendChild(dialog);

  const field = $('#siteMapField', dialog);
  const nodesLayer = $('#siteMapNodes', dialog);
  const lines = $('#siteMapLines', dialog);
  const inspector = $('#mapInspector', dialog);
  const routeNode = $('#siteMapCurrent', dialog);
  const viewport = $('#siteMapViewport', dialog);
  const commonsPanel = $('#siteMapCommons', dialog);
  const commonsMount = $('#siteMapCommonsMount', dialog);
  const siteBar = $('.spatial-browser-bar', dialog);
  const siteBody = $('.spatial-browser-body', dialog);

  const state = {
    mode: location.pathname.endsWith('commons.html') ? 'commons' : 'site',
    level: 'SITE',
    selectedRoot: null,
    selectedRef: null,
    currentRoot: null
  };

  const rootByKey = Object.fromEntries(model.pageNodes.map(node => [node.key, node]));
  const rootForCollection = collection => rootByKey[collection] || null;

  function contextToRoot(context) {
    if (context.pageKey === 'commons') return 'home';
    if (context.collection) return context.collection;
    if (context.pageKey === 'home') {
      const section = document.body.dataset.currentSection;
      if (section === 'now') return 'position';
      if (section === 'field-notes') return 'notes';
      if (section === 'lab') return 'lab';
      if (section === 'atlas') return 'atlas';
      if (section === 'elsewhere') return 'elsewhere';
      return 'home';
    }
    return context.pageKey === 'notes' ? 'notes' : context.pageKey;
  }

  function setFromContext(options = {}) {
    const context = model.currentContext();
    state.currentRoot = contextToRoot(context);
    state.selectedRoot = options.collection || context.collection || state.currentRoot || 'home';
    state.selectedRef = options.ref || context.ref || null;
    state.level = order.includes(options.level) ? options.level : (context.level === 'RECORD' ? 'RECORD' : context.level === 'COLLECTION' ? 'COLLECTION' : context.level === 'POSITION' ? 'POSITION' : 'SITE');
    if (state.level === 'RECORD' && !state.selectedRef) state.level = state.selectedRoot && ['notes', 'lab', 'elsewhere'].includes(state.selectedRoot) ? 'COLLECTION' : 'POSITION';
    if (state.level === 'COLLECTION' && !['notes', 'lab', 'atlas', 'elsewhere'].includes(state.selectedRoot)) state.level = 'POSITION';
    if (state.level === 'SITE' || state.level === 'POSITION') state.selectedRef = null;
    if (state.level === 'SITE') state.selectedRoot = state.currentRoot || 'home';
  }

  function pointForRecord(record) {
    const configs = {
      notes: { x0: 63, x1: 84, y0: 9, y1: 34, cols: 2 },
      lab: { x0: 66, x1: 91, y0: 18, y1: 80, cols: 3 },
      elsewhere: { x0: 66, x1: 78, y0: 62, y1: 84, cols: 1 }
    };
    const cfg = configs[record.kind] || { x0: 66, x1: 88, y0: 20, y1: 80, cols: 2 };
    const items = model.collections[record.kind] || [];
    const total = Math.max(1, items.length);
    const index = Math.max(0, record.order);
    const cols = Math.min(cfg.cols, total);
    const rows = Math.ceil(total / cols);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const x = cols === 1 ? cfg.x0 : cfg.x0 + (col / Math.max(1, cols - 1)) * (cfg.x1 - cfg.x0);
    const y = rows === 1 ? (cfg.y0 + cfg.y1) / 2 : cfg.y0 + (row / Math.max(1, rows - 1)) * (cfg.y1 - cfg.y0);
    return { x, y };
  }

  function visibleRecords() {
    if (state.level === 'COLLECTION' && ['notes', 'lab', 'elsewhere'].includes(state.selectedRoot)) {
      return (model.collections[state.selectedRoot] || []).map(item => model.recordIndex.get(`${state.selectedRoot}:${item.id}`)).filter(Boolean);
    }
    if (state.level === 'RECORD' && state.selectedRef) return model.siblings(state.selectedRef, 2);
    return [];
  }

  function visibleRootNodes() {
    if (state.level === 'SITE' || state.level === 'POSITION') return model.pageNodes;
    const selected = rootByKey[state.selectedRoot];
    const keys = new Set(['position', state.selectedRoot]);
    if (selected?.key === 'atlas') ['notes', 'lab', 'elsewhere'].forEach(key => keys.add(key));
    return model.pageNodes.filter(node => keys.has(node.key));
  }

  function addLine(a, b, className = '') {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', a.x);
    line.setAttribute('y1', a.y);
    line.setAttribute('x2', b.x);
    line.setAttribute('y2', b.y);
    if (className) line.setAttribute('class', className);
    lines.appendChild(line);
  }

  function nodeMarkup(node, options = {}) {
    const button = document.createElement('button');
    button.type = 'button';
    const nodeX = options.x ?? node.x;
    button.className = `site-map-node ${options.record ? 'is-record' : 'is-root'}${options.dim ? ' is-dim' : ''}${options.selected ? ' is-selected' : ''}${options.current ? ' is-current' : ''}${Number(nodeX) > 80 ? ' is-right-edge' : ''}`;
    button.dataset.mapKey = node.key || '';
    if (options.record) button.dataset.recordRef = options.record.ref;
    button.dataset.nodeType = node.type || options.record?.kind || 'record';
    button.style.setProperty('--mx', `${options.x ?? node.x}%`);
    button.style.setProperty('--my', `${options.y ?? node.y}%`);
    button.innerHTML = `<i aria-hidden="true"></i><span>${node.code || options.code || ''}</span><strong>${node.label || options.label || ''}</strong>`;
    const accessible = node.label || options.label || '';
    button.setAttribute('aria-label', accessible);
    if (options.current) button.setAttribute('aria-current', 'location');
    return button;
  }

  function summaryForRoot(key) {
    if (key === 'home') return model.locale === 'zh' ? '全站原点。' : 'The site origin.';
    if (key === 'position') return model.locale === 'zh' ? '当前研究位置。' : 'Current intellectual position.';
    if (key === 'notes') return model.locale === 'zh' ? `地记 · ${(model.collections.notes || []).length} 条` : `Field Notes · ${(model.collections.notes || []).length} records`;
    if (key === 'lab') return model.locale === 'zh' ? `作器 · ${(model.collections.lab || []).length} 条` : `Lab · ${(model.collections.lab || []).length} records`;
    if (key === 'atlas') return model.locale === 'zh' ? '同一档案的多种投影。' : 'Multiple projections of one archive.';
    if (key === 'elsewhere') return model.locale === 'zh' ? `方外 · ${(model.collections.elsewhere || []).length} 条` : `Elsewhere · ${(model.collections.elsewhere || []).length} records`;
    return '';
  }

  function renderInspector() {
    const root = rootByKey[state.selectedRoot];
    const record = state.selectedRef ? model.recordIndex.get(state.selectedRef) : null;
    if (record) {
      const parent = model.labelForCollection(record.kind);
      const detail = model.detailForRecord(record.ref);
      inspector.innerHTML = `
        <span class="map-inspector-kicker">${L.record} / ${parent}</span>
        <h3>${record.item.title}</h3>
        <p>${record.item.excerpt || record.item.description || record.item.subtitle || ''}</p>
        <dl>
          <div><dt>${L.collectionOf}</dt><dd>${parent}</dd></div>
          <div><dt>${L.currentHere}</dt><dd>${record.ref}</dd></div>
        </dl>
        <div class="map-inspector-actions">
          <a href="${model.hrefForRecord(record.ref)}">${L.open} ↗</a>
          ${detail && detail !== model.hrefForRecord(record.ref) ? `<a class="secondary" href="${detail}">${L.enterDetail} ↗</a>` : ''}
          <button type="button" data-map-action="zoom-out">${L.zoomOut}</button>
        </div>
        <div class="map-structure-list"><span>${L.siblings}</span>${model.siblings(record.ref, 2).map(item => `<button type="button" data-map-ref="${item.ref}" class="${item.ref === record.ref ? 'is-active' : ''}">${item.item.title}</button>`).join('')}</div>`;
      return;
    }

    if (root) {
      const isCollection = ['notes', 'lab', 'elsewhere'].includes(root.key);
      const canZoomIn = isCollection && state.level === 'POSITION';
      const structureList = state.level === 'COLLECTION' && isCollection
        ? visibleRecords().map(item => `<button type="button" data-map-ref="${item.ref}">${String(item.order + 1).padStart(2, '0')} · ${item.item.title}</button>`).join('')
        : visibleRootNodes().map(node => `<button type="button" data-map-root="${node.key}" class="${node.key === root.key ? 'is-active' : ''}">${node.code} · ${node.label}</button>`).join('');
      inspector.innerHTML = `
        <span class="map-inspector-kicker">${state.level === 'SITE' ? L.site : state.level === 'POSITION' ? L.position : L.collection}</span>
        <h3>${root.label}</h3>
        <p>${summaryForRoot(root.key)}</p>
        <div class="map-inspector-actions">
          ${canZoomIn ? `<button type="button" data-map-action="zoom-in">${L.zoomIn}</button>` : ''}
          <a href="${root.href}">${L.open} ↗</a>
          ${state.level !== 'SITE' ? `<button type="button" data-map-action="zoom-out">${L.zoomOut}</button>` : ''}
        </div>
        <div class="map-structure-list"><span>${L.list}</span>${structureList}</div>`;
      return;
    }

    inspector.innerHTML = `<span class="map-inspector-kicker">${L.site}</span><h3>GeoGeek</h3><p>${L.hint}</p>`;
  }

  function updateRoute() {
    const parts = [L[state.level.toLowerCase()] || state.level];
    if (state.selectedRoot && state.selectedRoot !== 'home') parts.push(rootByKey[state.selectedRoot]?.label || state.selectedRoot);
    if (state.selectedRef) parts.push(model.recordIndex.get(state.selectedRef)?.item.title || state.selectedRef);
    routeNode.textContent = parts.join(' / ');
  }

  function render() {
    nodesLayer.innerHTML = '';
    lines.innerHTML = '';

    const roots = visibleRootNodes();
    const rootKeys = new Set(roots.map(node => node.key));
    model.siteEdges.forEach(([aKey, bKey]) => {
      const a = rootByKey[aKey];
      const b = rootByKey[bKey];
      if (!a || !b || !rootKeys.has(aKey) || !rootKeys.has(bKey)) return;
      const active = state.selectedRoot && (aKey === state.selectedRoot || bKey === state.selectedRoot);
      addLine(a, b, active ? 'is-active' : '');
    });

    roots.forEach(node => {
      const dim = state.level !== 'SITE' && state.selectedRoot && node.key !== state.selectedRoot && node.key !== 'position';
      const button = nodeMarkup(node, {
        dim,
        selected: node.key === state.selectedRoot,
        current: node.key === state.currentRoot
      });
      button.addEventListener('click', () => {
        state.selectedRoot = node.key;
        state.selectedRef = null;
        state.level = state.level === 'SITE' ? 'POSITION' : state.level;
        if (state.level === 'COLLECTION' && !['notes', 'lab', 'elsewhere', 'atlas'].includes(node.key)) state.level = 'POSITION';
        render();
      });
      nodesLayer.appendChild(button);
    });

    const records = visibleRecords();
    records.forEach((record, index) => {
      const point = pointForRecord(record);
      const parent = rootForCollection(record.kind);
      if (parent) addLine(parent, point, record.ref === state.selectedRef ? 'is-active is-record-line' : 'is-record-line');
      const button = nodeMarkup({ key: record.ref, type: record.kind }, {
        record,
        x: point.x,
        y: point.y,
        code: String(record.order + 1).padStart(2, '0'),
        label: record.item.title,
        selected: record.ref === state.selectedRef
      });
      button.addEventListener('click', () => {
        state.selectedRoot = record.kind;
        state.selectedRef = record.ref;
        state.level = 'RECORD';
        render();
      });
      nodesLayer.appendChild(button);
    });

    $$('[data-map-scale]', dialog).forEach(button => {
      const level = button.dataset.mapScale;
      const canCollection = ['notes', 'lab', 'atlas', 'elsewhere'].includes(state.selectedRoot);
      const canRecord = Boolean(state.selectedRef);
      button.disabled = level === 'COLLECTION' ? !canCollection : level === 'RECORD' ? !canRecord : false;
      button.classList.toggle('is-active', level === state.level);
      button.setAttribute('aria-pressed', level === state.level ? 'true' : 'false');
      if (level === state.level) button.setAttribute('aria-current', 'true');
      else button.removeAttribute('aria-current');
    });

    updateRoute();
    renderInspector();
    window.GeoSemantic?.setActive?.(state.level);
  }

  function setLevel(level) {
    if (!order.includes(level)) return;
    if (level === 'COLLECTION' && !['notes', 'lab', 'atlas', 'elsewhere'].includes(state.selectedRoot)) return;
    if (level === 'RECORD' && !state.selectedRef) return;
    state.level = level;
    if (level === 'SITE') {
      state.selectedRef = null;
      state.selectedRoot = state.currentRoot || 'home';
    }
    if (level === 'POSITION') state.selectedRef = null;
    render();
  }

  async function setMode(mode) {
    state.mode = mode === 'commons' ? 'commons' : 'site';
    $$('[data-map-mode]', dialog).forEach(button => {
      const active = button.dataset.mapMode === state.mode;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    const commons = state.mode === 'commons';
    siteBar.hidden = commons;
    siteBody.hidden = commons;
    commonsPanel.hidden = !commons;
    if (commons) {
      routeNode.textContent = model.locale === 'zh' ? '共域 / 来访地理' : 'COMMONS / VISITOR GEOGRAPHY';
      if (!commonsMount.dataset.mounted) {
        commonsMount.dataset.mounted = 'true';
        commonsMount.innerHTML = `<div class="commons-preview-loading">${model.locale === 'zh' ? '读取共域…' : 'READING COMMON FIELD…'}</div>`;
        try {
          const commonsModule = window.GeoCommons || await window.GeoModules?.loadCommons?.();
          await commonsModule?.mountPreview?.(commonsMount);
        } catch {
          commonsMount.innerHTML = `<div class="commons-preview-loading">${model.locale === 'zh' ? '共域暂不可达。' : 'Commons unavailable.'}</div>`;
        }
      }
    } else {
      updateRoute();
    }
  }

  function open(options = {}) {
    setFromContext(options);
    render();
    setMode(options.mode || (location.pathname.endsWith('commons.html') ? 'commons' : state.mode));
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('site-map-open');
    toggle.setAttribute('aria-expanded', 'true');
    toggle.textContent = model.data.ui?.nav?.close || (model.locale === 'zh' ? '收起' : 'Close');
    window.GeoField?.pause?.();
    requestAnimationFrame(() => {
      const current = $('.site-map-node.is-selected, .site-map-node.is-current', dialog);
      current?.focus({ preventScroll: true });
      if (innerWidth < 760 && current) {
        const left = Math.max(0, current.offsetLeft - viewport.clientWidth * .38);
        viewport.scrollLeft = left;
      }
    });
  }

  function close() {
    if (dialog.open) dialog.close();
    document.body.classList.remove('site-map-open');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.textContent = model.data.ui?.nav?.map || (model.locale === 'zh' ? '图域' : 'Map');
    if (!document.body.classList.contains('instrument-open')) window.GeoField?.resume?.();
    window.GeoScale?.restore?.();
  }

  toggle.addEventListener('click', () => dialog.open ? close() : open());
  $('.site-map-close', dialog)?.addEventListener('click', close);
  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    if (state.mode === 'commons') { close(); return; }
    if (state.level !== 'SITE') setLevel(order[Math.max(0, order.indexOf(state.level) - 1)]);
    else close();
  });

  $$('[data-map-scale]', dialog).forEach(button => button.addEventListener('click', () => setLevel(button.dataset.mapScale)));

  inspector.addEventListener('click', event => {
    const root = event.target.closest('[data-map-root]');
    if (root) {
      state.selectedRoot = root.dataset.mapRoot;
      state.selectedRef = null;
      render();
      return;
    }
    const ref = event.target.closest('[data-map-ref]');
    if (ref) {
      state.selectedRef = ref.dataset.mapRef;
      state.selectedRoot = model.recordIndex.get(state.selectedRef)?.kind || state.selectedRoot;
      state.level = 'RECORD';
      render();
      return;
    }
    const action = event.target.closest('[data-map-action]')?.dataset.mapAction;
    if (action === 'zoom-in') {
      if (state.level === 'POSITION') setLevel('COLLECTION');
      else if (state.level === 'COLLECTION' && state.selectedRef) setLevel('RECORD');
    }
    if (action === 'zoom-out') setLevel(order[Math.max(0, order.indexOf(state.level) - 1)]);
  });

  $$('[data-map-mode]', dialog).forEach(button => button.addEventListener('click', () => setMode(button.dataset.mapMode)));

  $('#mapLangSwitch', dialog)?.addEventListener('click', () => {
    try { localStorage.setItem('geogeek-language', model.locale === 'zh' ? 'en' : 'zh'); } catch {}
    location.reload();
  });

  viewport.addEventListener('keydown', event => {
    if (event.key === 'Home') viewport.scrollLeft = 0;
    if (event.key === 'End') viewport.scrollLeft = viewport.scrollWidth;
  });

  window.GeoMap = { open, close, setLevel, setMode, isOpen: () => dialog.open, toggle: () => dialog.open ? close() : open(), getState: () => ({ ...state }) };
})();
