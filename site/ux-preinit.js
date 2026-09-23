/* GeoGeek UX v4 — early state bootstrap. */
(() => {
  'use strict';
  document.documentElement.lang = 'en';

  try {
    const y = Number(sessionStorage.getItem('geogeek-ux-scroll-y'));
    if (Number.isFinite(y) && y > 0) {
      sessionStorage.removeItem('geogeek-ux-scroll-y');
      addEventListener('load', () => requestAnimationFrame(() => scrollTo(0, y)), { once: true });
    }
  } catch {}
})();
