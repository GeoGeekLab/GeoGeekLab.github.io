/* GeoGeek UX v4 — early state bootstrap. */
(() => {
  'use strict';

  // GitHub Pages already serves the same index artifact for `/` and
  // `/index.html`. Do not perform a client-side redirect: it creates a second
  // navigation and can expose a stale first frame on entry/return.
  document.documentElement.lang = 'en';

  // The site-wide visual-readiness gate waits for this bootstrap to finish its
  // DOM-critical enhancement scripts before revealing the document. This keeps
  // Home scale, Geo interactions, and Lab previews from causing a second visible
  // layout immediately after the boot cover disappears.
  window.__GEOGEEK_PREINIT_READY__ = false;
  const signalPreinitReady = () => {
    if (window.__GEOGEEK_PREINIT_READY__) return;
    window.__GEOGEEK_PREINIT_READY__ = true;
    dispatchEvent(new CustomEvent('geogeek:preinit-ready'));
  };
  const appendTrackedScript = ({ selector, src, datasetKey }) => {
    if (document.querySelector(selector)) return Promise.resolve();
    return new Promise(resolve => {
      const script = document.createElement('script');
      script.src = src;
      script.dataset[datasetKey] = 'script';
      script.async = false;
      const done = () => {
        script.dataset.geogeekReady = 'true';
        resolve();
      };
      script.addEventListener('load', done, { once: true });
      script.addEventListener('error', done, { once: true });
      document.head.appendChild(script);
    });
  };

  // Shared primary navigation sizing. Keep the 72px bar geometry unchanged,
  // but make the brand mark, brand name, and primary destinations more legible.
  const navScaleStyle = document.createElement('style');
  navScaleStyle.dataset.siteNavScale = '20261004a';
  navScaleStyle.textContent = `
    .site-nav .brand {
      gap: 12px;
      font-size: 18px;
    }
    .site-nav .brand > span:last-child {
      font-size: 18px !important;
      line-height: 1;
    }
    .site-nav .brand-mark {
      width: 18px;
      height: 18px;
      flex: 0 0 18px;
      background: radial-gradient(circle at center, var(--signal) 0 2.5px, transparent 3px);
    }
    .site-nav .brand-mark::before {
      left: 8px;
      height: 18px;
    }
    .site-nav .brand-mark::after {
      top: 8px;
      width: 18px;
    }
    .site-nav .nav-links a {
      min-height: 44px;
      display: inline-flex;
      align-items: center;
      font-size: 15px;
      line-height: 1;
    }
    .site-nav .nav-toggle {
      min-height: 42px;
      font-size: 14px;
    }
    @media (max-width: 760px) {
      .site-nav .brand {
        gap: 10px;
      }
      .site-nav .brand > span:last-child {
        font-size: 16px !important;
      }
      .site-nav .brand-mark {
        width: 17px;
        height: 17px;
        flex-basis: 17px;
      }
      .site-nav .brand-mark::before {
        left: 7px;
        height: 17px;
      }
      .site-nav .brand-mark::after {
        top: 7px;
        width: 17px;
      }
    }
  `;
  document.head.appendChild(navScaleStyle);

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
  const isHome = location.pathname === '/' || /(?:^|\/)index\.html$/.test(location.pathname);
  if (isHome) {
    const homeViewportStyle = document.createElement('link');
    homeViewportStyle.rel = 'stylesheet';
    homeViewportStyle.href = '/home-viewport-fit.css?v=20261003f';
    homeViewportStyle.dataset.homeViewportFit = 'style';
    document.head.appendChild(homeViewportStyle);
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
    const pending = [];

    pending.push(appendTrackedScript({
      selector: 'script[data-geo-interaction="script"]',
      src: '/geo-interactions.js?v=20260930g',
      datasetKey: 'geoInteraction',
    }));

    // The homepage uses section ownership for its semantic scale. Load this
    // after the DOM and synchronous page scripts are complete so GeoScale and
    // all three homepage sections already exist.
    if (isHome) {
      pending.push(appendTrackedScript({
        selector: 'script[data-home-scale="script"]',
        src: '/home-scale.js?v=20261004a',
        datasetKey: 'homeScale',
      }));
    }

    if (isLab) {
      pending.push(appendTrackedScript({
        selector: 'script[data-lab-real-previews="script"]',
        src: '/lab-real-previews.js?v=20260930i',
        datasetKey: 'labRealPreviews',
      }));
    }

    Promise.allSettled(pending).then(signalPreinitReady);
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
