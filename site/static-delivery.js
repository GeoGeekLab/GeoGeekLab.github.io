(() => {
  'use strict';

  // Static content is authoritative. JavaScript only enhances filtering
  // and non-critical script delivery.
  const scheduleIdle = (fn) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1800 });
    else window.setTimeout(fn, 900);
  };

  const loadIdleScripts = () => {
    const nodes = [...document.querySelectorAll('script[data-idle-src]')];
    if (!nodes.length) return;
    scheduleIdle(() => {
      let chain = Promise.resolve();
      for (const node of nodes) {
        chain = chain.then(() => new Promise(resolve => {
          const s = document.createElement('script');
          s.src = node.dataset.idleSrc;
          s.defer = true;
          s.onload = s.onerror = resolve;
          node.replaceWith(s);
        }));
      }
    });
  };

  const normalize = value => String(value || '').trim().toLowerCase();
  const initStaticFilters = () => {
    const list = document.querySelector('[data-static-note-list]');
    if (!list) return;
    const rows = [...list.querySelectorAll('[data-series]')];
    const controls = [...document.querySelectorAll('[data-filter], [data-series-filter]')];
    if (!controls.length) return;

    const apply = raw => {
      const value = normalize(raw);
      const showAll = !value || value === 'all' || value === '*';
      for (const row of rows) row.hidden = !showAll && normalize(row.dataset.series) !== value;
      for (const control of controls) {
        const own = normalize(control.dataset.filter || control.dataset.seriesFilter);
        const selected = showAll ? (own === 'all' || own === '*') : own === value;
        control.setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
    };

    for (const control of controls) {
      control.addEventListener('click', event => {
        const value = control.dataset.filter || control.dataset.seriesFilter;
        if (!value) return;
        event.preventDefault();
        apply(value);
      });
    }
  };

  loadIdleScripts();
  initStaticFilters();
})();
