/* GeoGeek global interaction layer — spatial feedback without false geography. */
(() => {
  'use strict';

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches && matchMedia('(hover: hover)').matches;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  document.documentElement.classList.add('geo-ui');

  const reactiveSelectors = [
    '.hero',
    '.page-title',
    '.coordinates-workbench',
    '.commons-summary',
    '.commons-map-layout',
    '.note-row',
    '.lab-build-row',
    '.project-card',
    '.lab-row',
    '.atlas-reader',
    '.atlas-workspace',
    '.elsewhere-card',
    '.record-heading',
    '.record-conditions',
    '.record-detail',
    '.earth-preview-link',
    '.instrument-shell'
  ];

  const revealSelectors = [
    '.page-title',
    '.commons-summary',
    '.lab-builds',
    '.lab-group-block',
    '.atlas-reader',
    '.atlas-key',
    '.record-heading',
    '.record-conditions',
    '.record-detail',
    '.elsewhere-grid'
  ];

  const attachReactive = element => {
    if (!element || element.dataset.geoBound === '1') return;
    element.dataset.geoBound = '1';
    element.classList.add('geo-reactive');

    const mark = document.createElement('span');
    mark.className = 'geo-field-mark';
    mark.setAttribute('aria-hidden', 'true');
    element.appendChild(mark);

    const update = event => {
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Number.isFinite(event?.clientX) ? event.clientX : rect.left + rect.width / 2;
      const y = Number.isFinite(event?.clientY) ? event.clientY : rect.top + rect.height / 2;
      const localX = Math.max(0, Math.min(100, ((x - rect.left) / rect.width) * 100));
      const localY = Math.max(0, Math.min(100, ((y - rect.top) / rect.height) * 100));
      element.style.setProperty('--geo-local-x', `${localX.toFixed(2)}%`);
      element.style.setProperty('--geo-local-y', `${localY.toFixed(2)}%`);
      element.classList.add('is-geo-active');
    };

    element.addEventListener('pointerenter', update, { passive: true });
    element.addEventListener('pointermove', update, { passive: true });
    element.addEventListener('focusin', update);
    const clear = () => element.classList.remove('is-geo-active');
    element.addEventListener('pointerleave', clear, { passive: true });
    element.addEventListener('focusout', clear);
  };

  const bindReactive = root => {
    reactiveSelectors.forEach(selector => {
      if (root?.matches?.(selector)) attachReactive(root);
      $$(selector, root || document).forEach(attachReactive);
    });
  };
  bindReactive(document);

  // App-rendered notes, lab cards and inspectors can arrive after first paint.
  const dynamicObserver = new MutationObserver(records => {
    records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === 1) bindReactive(node);
    }));
  });
  dynamicObserver.observe(document.body, { childList: true, subtree: true });

  // Resolve major blocks into view with a small positional correction.
  if (!reduced && 'IntersectionObserver' in window) {
    const revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-geo-visible');
        revealObserver.unobserve(entry.target);
      });
    }, { threshold: .08, rootMargin: '0px 0px -5% 0px' });

    revealSelectors.forEach(selector => $$(selector).forEach((element, index) => {
      if (element.dataset.geoReveal === '1') return;
      element.dataset.geoReveal = '1';
      element.classList.add('geo-reveal');
      element.style.transitionDelay = `${Math.min(index, 4) * 28}ms`;
      revealObserver.observe(element);
    }));
  }

  // Instrument-scale changes get a short, consistent survey pulse.
  const scale = $('.scale-ui');
  if (scale) {
    let pulseTimer = 0;
    const pulseScale = () => {
      clearTimeout(pulseTimer);
      scale.classList.remove('geo-scale-change');
      void scale.offsetWidth;
      scale.classList.add('geo-scale-change');
      pulseTimer = setTimeout(() => scale.classList.remove('geo-scale-change'), 430);
    };
    ['#scaleText', '#scaleLevel'].forEach(selector => {
      const node = $(selector);
      if (node) new MutationObserver(pulseScale).observe(node, { childList: true, characterData: true, subtree: true });
    });
  }

  if (!finePointer || reduced) return;

  const xAxis = document.createElement('i');
  const yAxis = document.createElement('i');
  const readout = document.createElement('div');
  xAxis.className = 'geo-screen-axis geo-screen-axis-x';
  yAxis.className = 'geo-screen-axis geo-screen-axis-y';
  readout.className = 'geo-survey-readout';
  readout.setAttribute('aria-hidden', 'true');
  document.body.append(xAxis, yAxis, readout);

  let targetX = innerWidth * .5;
  let targetY = innerHeight * .5;
  let x = targetX;
  let y = targetY;
  let pointerTimer = 0;
  let raf = 0;
  let lastReadout = 0;

  const depth = () => {
    const max = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    return Math.max(0, Math.min(100, scrollY / max * 100));
  };

  const pageLabel = () => {
    const kind = document.body.dataset.pageKind;
    if (kind === 'field-notes') return 'NOTES';
    if (kind === 'lab') return 'LAB';
    if (kind === 'atlas') return 'ATLAS';
    if (kind === 'elsewhere') return 'ELSEWHERE';
    if (kind === 'record') return 'RECORD';
    return 'FIELD';
  };

  const updateReadout = now => {
    if (now - lastReadout < 90) return;
    lastReadout = now;
    const nx = Math.max(0, Math.min(100, x / Math.max(1, innerWidth) * 100));
    const ny = Math.max(0, Math.min(100, y / Math.max(1, innerHeight) * 100));
    readout.textContent = `${pageLabel()} / X ${nx.toFixed(1)} · Y ${ny.toFixed(1)} · DEPTH ${depth().toFixed(0)}% · RELATIVE`;
  };

  const render = now => {
    raf = 0;
    x += (targetX - x) * .22;
    y += (targetY - y) * .22;
    document.documentElement.style.setProperty('--geo-screen-x', `${x.toFixed(2)}px`);
    document.documentElement.style.setProperty('--geo-screen-y', `${y.toFixed(2)}px`);
    updateReadout(now);
    if (Math.abs(targetX - x) + Math.abs(targetY - y) > .5) raf = requestAnimationFrame(render);
  };

  const wake = () => {
    document.body.classList.add('geo-pointer-active');
    clearTimeout(pointerTimer);
    pointerTimer = setTimeout(() => document.body.classList.remove('geo-pointer-active'), 1100);
  };

  addEventListener('pointermove', event => {
    targetX = event.clientX;
    targetY = event.clientY;
    wake();
    if (!raf) raf = requestAnimationFrame(render);
  }, { passive: true });

  addEventListener('scroll', () => {
    if (document.body.classList.contains('geo-pointer-active')) updateReadout(performance.now());
  }, { passive: true });

  addEventListener('resize', () => {
    targetX = Math.min(targetX, innerWidth);
    targetY = Math.min(targetY, innerHeight);
  }, { passive: true });
})();
