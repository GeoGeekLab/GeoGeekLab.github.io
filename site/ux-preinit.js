/* GeoGeek UX v4 — early state bootstrap. */
(() => {
  'use strict';

  // /index.html is the canonical home artifact. GitHub Pages can cache `/` and
  // `/index.html` under separate CDN keys, so normalize the root path before
  // any page-state bootstrap runs and preserve deep-link query/hash state.
  if (location.pathname === '/') {
    location.replace('/index.html' + location.search + location.hash);
    return;
  }

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

  // Homepage-only viewport fit. Load this after shared layout/interaction styles
  // so Coordinates and Commons can consume one desktop viewport without
  // changing the design system or any inner page.
  const isHome = /(?:^|\/)index\.html$/.test(location.pathname);
  if (isHome) {
    const homeViewportStyle = document.createElement('link');
    homeViewportStyle.rel = 'stylesheet';
    homeViewportStyle.href = '/home-viewport-fit.css?v=20261003f';
    homeViewportStyle.dataset.homeViewportFit = 'style';
    document.head.appendChild(homeViewportStyle);

    // The homepage uses section ownership for its semantic scale. The generic
    // IntersectionObserver can report only threshold-changing entries, which can
    // leave Commons stuck at POSITION. Run a deterministic viewport-anchor pass
    // after parsing so SITE → POSITION → COLLECTION always follows the section.
    const homeScaleScript = document.createElement('script');
    homeScaleScript.src = '/home-scale.js?v=20261004a';
    homeScaleScript.defer = true;
    homeScaleScript.dataset.homeScale = 'script';
    document.head.appendChild(homeScaleScript);
  }

  const isLab = /(?:^|\/)lab\.html$/.test(location.pathname);
  if (isLab) {
    const labPreviewStyle = document.createElement('link');
    labPreviewStyle.rel = 'stylesheet';
    labPreviewStyle.href = '/lab-real-previews.css?v=20260930i';
    labPreviewStyle.dataset.labRealPreviews = 'style';
    document.head.appendChild(labPreviewStyle);
  }

  // Coordinates originally used the section-head component while Commons used
  // page-title. Normalize the Coordinates title band before the interaction
  // layer initializes so both sections share typography, border, reveal motion,
  // and page-title behavior without changing either section's content logic.
  const normalizeHomeConceptHeaders = () => {
    if (!isHome) return;
    const coordinatesHeader = document.querySelector('#now .coordinates-head');
    if (!coordinatesHeader) return;

    coordinatesHeader.classList.add('page-title', 'coordinates-home-title');

    const label = coordinatesHeader.querySelector('.section-label');
    if (label) label.classList.add('eyebrow');

    const intro = coordinatesHeader.querySelector('.concept-section-intro');
    if (intro) intro.classList.add('page-intro');
  };

  const loadInteractions = () => {
    normalizeHomeConceptHeaders();

    if (!document.querySelector('script[data-geo-interaction="script"]')) {
      const script = document.createElement('script');
      script.src = '/geo-interactions.js?v=20260930g';
      script.dataset.geoInteraction = 'script';
      script.async = false;
      document.head.appendChild(script);
    }

    if (isLab && !document.querySelector('script[data-lab-real-previews="script"]')) {
      const previewScript = document.createElement('script');
      previewScript.src = '/lab-real-previews.js?v=20260930i';
      previewScript.dataset.labRealPreviews = 'script';
      previewScript.async = false;
      document.head.appendChild(previewScript);
    }
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
