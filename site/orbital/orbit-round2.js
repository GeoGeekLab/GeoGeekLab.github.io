(() => {
  'use strict';

  const ENHANCED = 'orbitRound2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function ensureStyle() {
    if (document.querySelector('link[data-orbit-round2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./orbit-round2.css?v=20261002a', import.meta.url).href;
    link.dataset.orbitRound2 = '1';
    document.head.appendChild(link);
  }

  function setSection(card, name) {
    if (!card) return;
    card.dataset.orbitSection = name;
    card.id ||= `orbit-section-${name}`;
  }

  function classifyCards(root) {
    const panel = $('.orbit-panel', root);
    if (!panel) return {};
    const catalog = $('#orbitSearch', panel)?.closest('.orbit-card');
    const view = $('#orbitScaleBadge', panel)?.closest('.orbit-card');
    const ground = $('#orbitGroundMap', panel)?.closest('.orbit-card');
    const object = $('.orbit-inspector', panel);
    const source = $('.orbit-provenance', panel);
    setSection(catalog, 'catalog');
    setSection(view, 'view');
    setSection(ground, 'ground');
    setSection(object, 'object');
    setSection(source, 'source');
    return { panel, catalog, view, ground, object, source };
  }

  function consolidateView(root, sections) {
    const extra = $('.orbit-enhancement-card', root);
    if (!extra || !sections.view || extra === sections.view) return;
    const controls = document.createElement('div');
    controls.className = 'orbit-view-advanced';
    while (extra.firstChild) controls.appendChild(extra.firstChild);
    sections.view.appendChild(controls);
    extra.remove();
  }

  function activateWorkspaceMode(mode) {
    const dialog = $('#instrumentDialog');
    const button = $(`[data-workspace-mode="${mode}"]`, dialog || document);
    if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
  }

  function scrollSection(card, panel) {
    if (!card || !panel) return;
    card.scrollIntoView({ block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  function installRailNav(root, sections) {
    const { panel } = sections;
    if (!panel || $('.orbit-rail-nav', panel)) return;
    const nav = document.createElement('nav');
    nav.className = 'orbit-rail-nav';
    nav.setAttribute('aria-label', 'Orbit workspace sections');
    nav.innerHTML = `
      <button type="button" data-orbit-jump="catalog" aria-pressed="true">CATALOG</button>
      <button type="button" data-orbit-jump="view" aria-pressed="false">VIEW</button>
      <button type="button" data-orbit-jump="ground" aria-pressed="false">GROUND</button>
      <button type="button" data-orbit-jump="object" aria-pressed="false">OBJECT</button>
      <button type="button" data-orbit-jump="source" aria-pressed="false">SOURCE</button>`;
    panel.prepend(nav);

    const map = {
      catalog:sections.catalog,
      view:sections.view,
      ground:sections.ground,
      object:sections.object,
      source:sections.source,
    };

    const setActive = name => {
      $$('[data-orbit-jump]', nav).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.orbitJump === name)));
    };

    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-orbit-jump]');
      if (!button) return;
      const name = button.dataset.orbitJump;
      if (name === 'source') activateWorkspaceMode('inspect');
      if (name === 'object' && ($('#orbitSelectedName', root)?.textContent || '').trim() === 'NONE') {
        $('#orbitSearch', root)?.focus();
        setActive('catalog');
        return;
      }
      setActive(name);
      setTimeout(() => scrollSection(map[name], panel), name === 'source' ? 80 : 0);
    });

    let raf = 0;
    panel.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = panel.scrollTop + nav.offsetHeight + 20;
        let current = 'catalog';
        for (const name of ['catalog','view','ground','object','source']) {
          const card = map[name];
          if (card && card.offsetParent !== null && card.offsetTop <= y) current = name;
        }
        setActive(current);
      });
    }, { passive:true });
  }

  function installSearchKeyboard(root) {
    const search = $('#orbitSearch', root);
    const results = $('#orbitSearchResults', root);
    if (!search || !results || search.dataset.keyboardEnhanced === '1') return;
    search.dataset.keyboardEnhanced = '1';
    let active = -1;

    const buttons = () => $$('[data-search-index]', results);
    const sync = next => {
      const list = buttons();
      if (!list.length) { active = -1; return; }
      active = Math.max(0, Math.min(list.length - 1, next));
      list.forEach((button, index) => button.classList.toggle('is-key-active', index === active));
      list[active]?.scrollIntoView({ block:'nearest' });
    };

    search.addEventListener('input', () => { active = -1; });
    search.addEventListener('keydown', event => {
      const list = buttons();
      if (event.key === 'ArrowDown' && list.length) {
        event.preventDefault();
        sync(active < 0 ? 0 : active + 1);
      } else if (event.key === 'ArrowUp' && list.length) {
        event.preventDefault();
        sync(active < 0 ? list.length - 1 : active - 1);
      } else if (event.key === 'Enter' && active >= 0 && list[active]) {
        event.preventDefault();
        list[active].click();
      } else if (event.key === 'Escape') {
        active = -1;
        search.value = '';
        search.dispatchEvent(new Event('input', { bubbles:true }));
      }
    });
  }

  function installSelectionBar(root, sections) {
    const stage = $('.orbit-stage', root);
    if (!stage || $('.orbit-selection-bar', stage)) return;
    const bar = document.createElement('div');
    bar.className = 'orbit-selection-bar';
    bar.hidden = true;
    bar.setAttribute('aria-live', 'polite');
    bar.innerHTML = `
      <div class="orbit-selection-copy">
        <span>SELECTED OBJECT</span>
        <strong data-selection-name>—</strong>
        <small><b data-selection-class>—</b><i aria-hidden="true">·</i><span data-selection-altitude>—</span><i aria-hidden="true">·</i><span data-selection-look>NO OBSERVER</span></small>
      </div>
      <div class="orbit-selection-actions">
        <button type="button" data-selection-focus>FOCUS</button>
        <button type="button" data-selection-details>DETAILS</button>
        <button type="button" data-selection-clear aria-label="Clear selected object">CLEAR</button>
      </div>`;
    stage.appendChild(bar);

    const selectedName = $('#orbitSelectedName', root);
    const selectedClass = $('#orbitSelectedClass', root);
    const altitude = $('#orbitAltitude', root);
    const elevation = $('#orbitElevation', root);
    const horizon = $('#orbitHorizonState', root);
    const navObject = $('[data-orbit-jump="object"]', sections.panel);

    const render = () => {
      const name = (selectedName?.textContent || '').trim();
      const hasSelection = Boolean(name && name !== 'NONE');
      bar.hidden = !hasSelection;
      navObject?.classList.toggle('has-selection', hasSelection);
      if (!hasSelection) return;
      $('[data-selection-name]', bar).textContent = name;
      $('[data-selection-class]', bar).textContent = (selectedClass?.textContent || '—').trim();
      $('[data-selection-altitude]', bar).textContent = (altitude?.textContent || '—').trim();
      const look = (elevation?.textContent || '—').trim();
      const horizonText = (horizon?.textContent || '').trim();
      $('[data-selection-look]', bar).textContent = look !== '—' ? `${look} ELEVATION · ${horizonText}` : 'NO OBSERVER RELATION';
    };

    const observer = new MutationObserver(render);
    [selectedName, selectedClass, altitude, elevation, horizon].filter(Boolean).forEach(node => observer.observe(node, { childList:true, characterData:true, subtree:true }));
    root._orbitRound2SelectionObserver = observer;
    render();

    bar.addEventListener('click', event => {
      if (event.target.closest('[data-selection-focus]')) $('#orbitFocus', root)?.click();
      if (event.target.closest('[data-selection-details]')) {
        activateWorkspaceMode('work');
        setTimeout(() => scrollSection(sections.object, sections.panel), 60);
      }
      if (event.target.closest('[data-selection-clear]')) {
        $('.orbit-canvas', root)?.dispatchEvent(new MouseEvent('dblclick', { bubbles:true, cancelable:true }));
      }
    });
  }

  function installWorkspaceSemantics(root, sections) {
    const dialog = root.closest('.instrument-dialog');
    if (!dialog || dialog.dataset.orbitRound2Semantics === '1') return;
    dialog.dataset.orbitRound2Semantics = '1';
    const sync = () => {
      const mode = dialog.dataset.workspaceMode || 'work';
      root.dataset.orbitDensity = mode;
      if (mode === 'work') sections.source?.setAttribute('aria-hidden', 'true');
      else sections.source?.removeAttribute('aria-hidden');
    };
    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes:true, attributeFilter:['data-workspace-mode'] });
    root._orbitRound2WorkspaceObserver = observer;
    sync();
  }

  function refine(root) {
    if (!root || root.dataset[ENHANCED] === '1') return;
    const stage = $('.orbit-stage', root);
    const panel = $('.orbit-panel', root);
    if (!stage || !panel) return;
    root.dataset[ENHANCED] = '1';
    ensureStyle();

    const sections = classifyCards(root);
    consolidateView(root, sections);
    const normalized = classifyCards(root);
    installRailNav(root, normalized);
    installSearchKeyboard(root);
    installSelectionBar(root, normalized);
    installWorkspaceSemantics(root, normalized);

    const panelObserver = new MutationObserver(() => {
      const current = classifyCards(root);
      consolidateView(root, current);
    });
    panelObserver.observe(panel, { childList:true });
    root._orbitRound2PanelObserver = panelObserver;
  }

  function scan() {
    $$('.orbit-v2').forEach(refine);
  }

  ensureStyle();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList:true, subtree:true });

  window.addEventListener('pagehide', () => {
    observer.disconnect();
    $$('.orbit-v2').forEach(root => {
      root._orbitRound2SelectionObserver?.disconnect?.();
      root._orbitRound2WorkspaceObserver?.disconnect?.();
      root._orbitRound2PanelObserver?.disconnect?.();
    });
  }, { once:true });
})();
