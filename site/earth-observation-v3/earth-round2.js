(() => {
  'use strict';

  const ENHANCED = 'earthRound2';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function ensureStyle() {
    if (document.querySelector('link[data-earth-round2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./earth-round2.css?v=20261002a', import.meta.url).href;
    link.dataset.earthRound2 = '1';
    document.head.appendChild(link);
  }

  function activateWorkspaceMode(mode) {
    const dialog = $('#instrumentDialog');
    const button = $(`.instrument-workspace-modes button[data-workspace-mode="${mode}"]`, dialog || document);
    if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
  }

  function setSection(card, name) {
    if (!card) return;
    card.dataset.earthSection = name;
    card.id ||= `earth-section-${name}`;
  }

  function classify(root) {
    const panel = $('.earth-observation-panel', root);
    if (!panel) return {};
    const product = $('.eo-layer-card', panel);
    const compare = $('#eoCompare', panel)?.closest('.eo-panel-card');
    const reading = $('#eoGrid', panel)?.closest('.eo-panel-card');
    const source = $('.eo-inspector', panel);
    setSection(product, 'product');
    setSection(compare, 'compare');
    setSection(reading, 'read');
    setSection(source, 'source');
    return { panel, product, compare, reading, source };
  }

  function installRailNav(root, sections) {
    const { panel } = sections;
    if (!panel || $('.earth-rail-nav', panel)) return;
    const nav = document.createElement('nav');
    nav.className = 'earth-rail-nav';
    nav.setAttribute('aria-label', 'Earth observation workspace sections');
    nav.innerHTML = `
      <button type="button" data-earth-jump="product" aria-pressed="true">PRODUCT</button>
      <button type="button" data-earth-jump="time" aria-pressed="false">TIME</button>
      <button type="button" data-earth-jump="compare" aria-pressed="false">COMPARE</button>
      <button type="button" data-earth-jump="read" aria-pressed="false">READ</button>
      <button type="button" data-earth-jump="source" aria-pressed="false">SOURCE</button>`;
    panel.prepend(nav);

    const map = {
      product:sections.product,
      compare:sections.compare,
      read:sections.reading,
      source:sections.source,
    };
    const setActive = name => $$('[data-earth-jump]', nav).forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.earthJump === name));
    });

    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-earth-jump]');
      if (!button) return;
      const name = button.dataset.earthJump;
      setActive(name);
      if (name === 'time') {
        $('#eoRange', root)?.focus({ preventScroll:true });
        $('.earth-timeline', root)?.scrollIntoView({ block:'nearest', behavior:'smooth' });
        return;
      }
      if (name === 'source') activateWorkspaceMode('inspect');
      const target = map[name];
      setTimeout(() => target?.scrollIntoView({ block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), name === 'source' ? 80 : 0);
    });

    let raf = 0;
    panel.addEventListener('scroll', () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = panel.scrollTop + nav.offsetHeight + 28;
        let current = 'product';
        for (const name of ['product','compare','read','source']) {
          const card = map[name];
          if (card && card.offsetParent !== null && card.offsetTop <= y) current = name;
        }
        setActive(current);
      });
    }, { passive:true });
  }

  function installObservationSummary(root, sections) {
    const panel = sections.panel;
    if (!panel || $('.earth-observation-summary', panel)) return;
    const summary = document.createElement('section');
    summary.className = 'earth-observation-summary';
    summary.setAttribute('aria-live', 'polite');
    summary.innerHTML = `
      <span>ACTIVE OBSERVATION</span>
      <strong data-earth-summary-title>—</strong>
      <div class="earth-summary-meta">
        <b data-earth-summary-group>—</b>
        <i aria-hidden="true">·</i>
        <span data-earth-summary-date>—</span>
        <i aria-hidden="true">·</i>
        <span data-earth-summary-view>—</span>
      </div>
      <div class="earth-summary-state"><i></i><span data-earth-summary-state>REQUEST STATE / —</span></div>`;
    $('.earth-rail-nav', panel)?.after(summary);

    const title = $('#eoInspectorTitle', root);
    const group = $('#eoLayerMode', root);
    const date = $('#eoTimelineDate', root);
    const view = $('#eoHudView', root);
    const supply = $('#eoSupplyState', root);
    const render = () => {
      $('[data-earth-summary-title]', summary).textContent = (title?.textContent || '—').trim();
      $('[data-earth-summary-group]', summary).textContent = (group?.textContent || '—').trim();
      $('[data-earth-summary-date]', summary).textContent = `${(date?.textContent || '—').trim()} UTC`;
      $('[data-earth-summary-view]', summary).textContent = (view?.textContent || '—').trim();
      const requestState = (supply?.textContent || '—').trim();
      $('[data-earth-summary-state]', summary).textContent = `REQUEST / ${requestState}`;
      summary.dataset.requestState = requestState.toLowerCase().includes('unavailable') ? 'unavailable' : requestState.toLowerCase().includes('request') ? 'requesting' : 'available';
    };
    const observer = new MutationObserver(render);
    [title, group, date, view, supply].filter(Boolean).forEach(node => observer.observe(node, { childList:true, characterData:true, subtree:true }));
    root._earthRound2SummaryObserver = observer;
    render();
  }

  function installTemporalRelation(root) {
    const frame = $('#eoFrame', root);
    if (!frame || $('.earth-temporal-relation', frame)) return;
    const relation = document.createElement('div');
    relation.className = 'earth-temporal-relation';
    relation.hidden = true;
    relation.setAttribute('aria-live', 'polite');
    relation.innerHTML = `
      <span>TIME RELATION</span>
      <strong><b data-earth-primary-date>—</b><i>↔</i><b data-earth-reference-date>—</b></strong>
      <small data-earth-delta>REFERENCE ENABLED</small>
      <button type="button" data-earth-relation-off>COMPARE OFF</button>`;
    frame.appendChild(relation);

    const compare = $('#eoCompare', root);
    const primary = $('#eoLabelA', root);
    const reference = $('#eoLabelB', root);
    const hudReference = $('#eoHudReference', root);
    const render = () => {
      const enabled = compare?.getAttribute('aria-pressed') === 'true';
      relation.hidden = !enabled;
      if (!enabled) return;
      $('[data-earth-primary-date]', relation).textContent = (primary?.textContent || '—').trim();
      $('[data-earth-reference-date]', relation).textContent = (reference?.textContent || '—').trim();
      $('[data-earth-delta]', relation).textContent = `REFERENCE / ${(hudReference?.textContent || '—').trim()}`;
    };
    const observer = new MutationObserver(render);
    [compare, primary, reference, hudReference].filter(Boolean).forEach(node => observer.observe(node, { attributes:true, attributeFilter:['aria-pressed'], childList:true, characterData:true, subtree:true }));
    root._earthRound2RelationObserver = observer;

    const offButton = $('[data-earth-relation-off]', relation);
    offButton?.addEventListener('pointerdown', event => event.stopPropagation());
    offButton?.addEventListener('click', event => {
      event.preventDefault();
      event.stopPropagation();
      compare?.click();
    });
    render();
  }

  function installLayerKeyboard(root) {
    const list = $('#eoLayerList', root);
    if (!list || list.dataset.keyboardEnhanced === '1') return;
    list.dataset.keyboardEnhanced = '1';
    list.addEventListener('keydown', event => {
      const current = event.target.closest?.('[data-earth-layer]');
      if (!current || !['ArrowDown','ArrowUp','Home','End'].includes(event.key)) return;
      const buttons = $$('[data-earth-layer]', list).filter(button => button.offsetParent !== null);
      const index = buttons.indexOf(current);
      if (index < 0 || !buttons.length) return;
      event.preventDefault();
      let next = index;
      if (event.key === 'ArrowDown') next = Math.min(buttons.length - 1, index + 1);
      if (event.key === 'ArrowUp') next = Math.max(0, index - 1);
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = buttons.length - 1;
      buttons[next]?.focus();
    });
  }

  function installTimelineSemantics(root) {
    const timeline = $('.earth-timeline', root);
    if (!timeline || timeline.dataset.round2 === '1') return;
    timeline.dataset.round2 = '1';
    const range = $('#eoRange', root);
    const date = $('#eoTimelineDate', root);
    if (range) range.setAttribute('aria-describedby', 'earthTimelineHint');
    if (!$('#earthTimelineHint', timeline)) {
      const hint = document.createElement('small');
      hint.id = 'earthTimelineHint';
      hint.className = 'earth-timeline-hint';
      hint.textContent = 'OBSERVATION DATE · DRAG TO PREVIEW · RELEASE TO REQUEST';
      $('.eo-timeline-track', timeline)?.appendChild(hint);
    }
    const sync = () => timeline.dataset.date = (date?.textContent || '').trim();
    const observer = new MutationObserver(sync);
    if (date) observer.observe(date, { childList:true, characterData:true,subtree:true });
    root._earthRound2TimelineObserver = observer;
    sync();
  }

  function installWorkspaceSemantics(root, sections) {
    const dialog = root.closest('.instrument-dialog');
    if (!dialog || dialog.dataset.earthRound2Semantics === '1') return;
    dialog.dataset.earthRound2Semantics = '1';
    const sync = () => {
      const mode = dialog.dataset.workspaceMode || 'work';
      root.dataset.earthDensity = mode;
      if (mode === 'work') sections.source?.setAttribute('aria-hidden', 'true');
      else sections.source?.removeAttribute('aria-hidden');
    };
    const observer = new MutationObserver(sync);
    observer.observe(dialog, { attributes:true, attributeFilter:['data-workspace-mode'] });
    root._earthRound2WorkspaceObserver = observer;
    sync();
  }

  function refine(root) {
    if (!root || root.dataset[ENHANCED] === '1') return;
    const panel = $('.earth-observation-panel', root);
    const frame = $('#eoFrame', root);
    if (!panel || !frame) return;
    root.dataset[ENHANCED] = '1';
    ensureStyle();
    const sections = classify(root);
    installRailNav(root, sections);
    installObservationSummary(root, sections);
    installTemporalRelation(root);
    installLayerKeyboard(root);
    installTimelineSemantics(root);
    installWorkspaceSemantics(root, sections);
  }

  function scan() {
    $$('.earth-observation-lab').forEach(refine);
  }

  ensureStyle();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    $$('.earth-observation-lab').forEach(root => {
      root._earthRound2SummaryObserver?.disconnect?.();
      root._earthRound2RelationObserver?.disconnect?.();
      root._earthRound2TimelineObserver?.disconnect?.();
      root._earthRound2WorkspaceObserver?.disconnect?.();
    });
  }, { once:true });
})();