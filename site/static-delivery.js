(() => {
  'use strict';

  // Static content is authoritative. JavaScript only enhances filtering
  // and non-critical script delivery.
  const scheduleIdle = (fn) => {
    if ('requestIdleCallback' in window) window.requestIdleCallback(fn, { timeout: 1800 });
    else window.setTimeout(fn, 900);
  };

  const isStaticNotes = () => !!document.querySelector('[data-static-note-list]');

  const loadScript = src => new Promise(resolve => {
    const s = document.createElement('script');
    s.src = src;
    s.defer = true;
    s.onload = s.onerror = resolve;
    document.body.appendChild(s);
  });

  const loadIdleScripts = () => {
    const nodes = [...document.querySelectorAll('script[data-idle-src]')];
    if (!nodes.length) return;

    // The Field Notes collection is complete in first-response HTML. Reloading
    // content/model/app after first paint duplicated work and re-mutated layout.
    // Keep only the lightweight mobile/navigation refinement script; filtering
    // is handled below against the authoritative static rows.
    if (isStaticNotes()) {
      const refinement = nodes.find(node => /(?:^|\/)ux-refinements\.js(?:[?#].*)?$/i.test(node.dataset.idleSrc || ''));
      nodes.forEach(node => node.remove());
      if (refinement?.dataset.idleSrc) loadScript(refinement.dataset.idleSrc);
      return;
    }

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
    const controls = [...document.querySelectorAll('[data-filter], [data-series-filter], [data-note-filter]')];
    if (!controls.length) return;

    const valueFor = control => control.dataset.filter || control.dataset.seriesFilter || control.dataset.noteFilter || '';
    const apply = raw => {
      const value = normalize(raw);
      const showAll = !value || value === 'all' || value === '*';
      for (const row of rows) row.hidden = !showAll && normalize(row.dataset.series) !== value;
      for (const control of controls) {
        const own = normalize(valueFor(control));
        const selected = showAll ? (own === 'all' || own === '*') : own === value;
        control.classList.toggle('is-active', selected);
        control.setAttribute('aria-pressed', selected ? 'true' : 'false');
      }
    };

    for (const control of controls) {
      control.addEventListener('click', event => {
        const value = valueFor(control);
        if (!value) return;
        event.preventDefault();
        apply(value);
      });
    }
    apply('all');
  };

  const initStaticNoteScale = () => {
    const list = document.querySelector('[data-static-note-list]');
    const scale = document.querySelector('.scale-ui');
    const scaleText = document.querySelector('#scaleText');
    const scaleLevel = document.querySelector('#scaleLevel');
    if (!list || !scale || !scaleText || !scaleLevel) return;

    const main = document.querySelector('main[data-scale]');
    const baseScale = main?.dataset.scale || scaleText.textContent.trim() || '1 : 25,000';
    const baseLevel = main?.dataset.scaleLevel || scaleLevel.textContent.trim() || 'COLLECTION';
    const recordScale = '1 : 2,500';
    const recordLevel = 'RECORD';
    const rows = [...list.querySelectorAll('.static-note-row')];

    const syncScaleSteps = level => {
      scale.querySelectorAll('[data-semantic-scale]').forEach(step => {
        const active = step.dataset.semanticScale === level;
        step.classList.toggle('is-active', active);
        if (active) step.setAttribute('aria-current', 'true');
        else step.removeAttribute('aria-current');
      });
    };

    const applyRecord = row => {
      scaleText.textContent = recordScale;
      scaleLevel.textContent = recordLevel;
      scale.classList.add('static-record-hover');
      scale.dataset.level = 'record';
      syncScaleSteps(recordLevel);

      // Keep the static record reference compatible with the semantic model if
      // the full interaction layer is loaded by another delivery mode.
      const ref = row.dataset.recordRef || '';
      if (ref && !ref.includes(':')) row.dataset.recordRef = `notes:${ref}`;
    };

    const restoreCollection = () => {
      scaleText.textContent = baseScale;
      scaleLevel.textContent = baseLevel;
      scale.classList.remove('static-record-hover');
      scale.dataset.level = String(baseLevel).toLowerCase();
      syncScaleSteps(baseLevel);
    };

    for (const row of rows) {
      row.addEventListener('pointerenter', () => applyRecord(row));
      row.addEventListener('pointerleave', restoreCollection);
      row.addEventListener('focusin', () => applyRecord(row));
      row.addEventListener('focusout', event => {
        if (!row.contains(event.relatedTarget)) restoreCollection();
      });
    }

    restoreCollection();
  };

  loadIdleScripts();
  initStaticFilters();
  initStaticNoteScale();
})();
