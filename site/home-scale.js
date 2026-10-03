/* Homepage semantic scale — deterministic section ownership. */
(() => {
  'use strict';

  if (!/(?:^|\/)index\.html$/.test(location.pathname)) return;

  const SCALE = {
    SITE: '1 : 250,000',
    POSITION: '1 : 100,000',
    COLLECTION: '1 : 25,000'
  };

  const sections = [
    { id: 'origin', level: 'SITE' },
    { id: 'now', level: 'POSITION' },
    { id: 'commons', level: 'COLLECTION' }
  ].map(item => ({ ...item, node: document.getElementById(item.id) })).filter(item => item.node);

  if (!sections.length) return;

  const scaleText = document.getElementById('scaleText');
  const scaleLevel = document.getElementById('scaleLevel');
  let raf = 0;
  let lastLevel = '';
  let lastSection = '';

  function activeSection() {
    const anchor = Math.max(72, Math.min(innerHeight - 1, innerHeight * 0.42));
    const containing = sections.find(item => {
      const rect = item.node.getBoundingClientRect();
      return rect.top <= anchor && rect.bottom > anchor;
    });
    if (containing) return containing;

    let best = sections[0];
    let bestDistance = Infinity;
    for (const item of sections) {
      const rect = item.node.getBoundingClientRect();
      const distance = anchor < rect.top ? rect.top - anchor : anchor > rect.bottom ? anchor - rect.bottom : 0;
      if (distance < bestDistance) {
        best = item;
        bestDistance = distance;
      }
    }
    return best;
  }

  function apply() {
    raf = 0;
    const current = activeSection();
    if (!current) return;

    document.body.dataset.currentSection = current.id;

    if (!window.GeoScale?.apply) {
      requestAnimationFrame(schedule);
      return;
    }

    const visualMismatch =
      scaleLevel?.textContent?.trim() !== current.level ||
      scaleText?.textContent?.trim() !== SCALE[current.level];

    // GeoScale owns the visual readout and GeoSemantic active level.
    // Use a durable apply so leaving any temporary interaction restores to
    // the actual homepage section, not to an earlier observer hit.
    if (visualMismatch || current.level !== lastLevel || current.id !== lastSection) {
      window.GeoScale.apply(current.level, false);
      lastLevel = current.level;
      lastSection = current.id;
    }
  }

  function schedule() {
    if (!raf) raf = requestAnimationFrame(apply);
  }

  addEventListener('scroll', schedule, { passive: true });
  addEventListener('resize', schedule, { passive: true });
  addEventListener('pageshow', schedule, { passive: true });
  addEventListener('hashchange', schedule, { passive: true });

  // The legacy section observer can write a stale level after a threshold
  // transition. Correct any visual mismatch against the current viewport owner.
  const scaleObserver = new MutationObserver(schedule);
  if (scaleText) scaleObserver.observe(scaleText, { childList: true, characterData: true, subtree: true });
  if (scaleLevel) scaleObserver.observe(scaleLevel, { childList: true, characterData: true, subtree: true });

  // Run after the synchronous homepage scripts have initialized GeoScale.
  requestAnimationFrame(() => requestAnimationFrame(apply));
})();
