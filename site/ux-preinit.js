/* GeoGeek UX v4 — early state bootstrap. */
(() => {
  'use strict';
  document.documentElement.lang = 'en';

  // Editorial layout refinements load after the page stylesheet so short title
  // statements can use available desktop measure before wrapping.
  const editorialStyle = document.createElement('link');
  editorialStyle.rel = 'stylesheet';
  editorialStyle.href = '/editorial-layout.css?v=20260930a';
  editorialStyle.dataset.editorialLayout = 'style';
  document.head.appendChild(editorialStyle);

  // Global Geo interaction layer. Versioned explicitly so Pages/browser caches
  // cannot hide interaction or contract updates behind a stale bootstrap.
  const interactionStyle = document.createElement('link');
  interactionStyle.rel = 'stylesheet';
  interactionStyle.href = '/geo-interactions.css?v=20260930g';
  interactionStyle.dataset.geoInteraction = 'style';
  document.head.appendChild(interactionStyle);

  const loadInteractions = () => {
    if (document.querySelector('script[data-geo-interaction="script"]')) return;
    const script = document.createElement('script');
    script.src = '/geo-interactions.js?v=20260930g';
    script.dataset.geoInteraction = 'script';
    script.async = false;
    document.head.appendChild(script);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadInteractions, { once: true });
  else loadInteractions();

  try {
    const y = Number(sessionStorage.getItem('geogeek-ux-scroll-y'));
    if (Number.isFinite(y) && y > 0) {
      sessionStorage.removeItem('geogeek-ux-scroll-y');
      addEventListener('load', () => requestAnimationFrame(() => scrollTo(0, y)), { once: true });
    }
  } catch {}
})();
