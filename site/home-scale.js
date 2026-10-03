/* Homepage semantic scale — deterministic section ownership. */
(() => {
  'use strict';

  if (!/(?:^|\/)index\.html$/.test(location.pathname)) return;

  const sections = [
    { id: 'origin', level: 'SITE' },
    { id: 'now', level: 'POSITION' },
    { id: 'commons', level: 'COLLECTION' }
  ].map(item => ({ ...item, node: document.getElementById(item.id) })).filter(item => item.node);

  if (!sections.length) return;

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

    // GeoScale owns the visual readout and GeoSemantic active level.
    // Use a durable apply so leaving a temporary hover state restores to
    // the actual homepage section, not to an earlier IntersectionObserver hit.
    if (current.level !== lastLevel || current.id !== lastSection) {
      window.GeoScale?.apply?.(current.level, false);
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

  // Run after the synchronous homepage scripts have initialized GeoScale.
  requestAnimationFrame(() => requestAnimationFrame(apply));
})();
