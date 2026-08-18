/* GeoGeek UX v4 — early locale/state bootstrap. */
(() => {
  'use strict';
  let locale = 'en';
  try {
    const fromUrl = new URLSearchParams(location.search).get('lang');
    if (fromUrl === 'zh' || fromUrl === 'en') {
      localStorage.setItem('geogeek-language', fromUrl);
      locale = fromUrl;
    } else {
      locale = localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en';
    }
  } catch {}
  document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';

  try {
    const y = Number(sessionStorage.getItem('geogeek-ux-scroll-y'));
    if (Number.isFinite(y) && y > 0) {
      sessionStorage.removeItem('geogeek-ux-scroll-y');
      addEventListener('load', () => requestAnimationFrame(() => scrollTo(0, y)), { once: true });
    }
  } catch {}
})();
