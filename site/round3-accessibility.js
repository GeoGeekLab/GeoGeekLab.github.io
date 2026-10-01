/* GeoGeek Round 3 — close measured serious accessibility findings without changing content. */
(() => {
  'use strict';

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function installScaleDisclosure() {
    const scale = $('.scale-ui');
    if (!scale) return;

    let normalizing = false;
    const normalizeWrapper = () => {
      if (normalizing) return;
      normalizing = true;
      scale.removeAttribute('role');
      scale.removeAttribute('tabindex');
      scale.removeAttribute('aria-haspopup');
      scale.removeAttribute('aria-expanded');
      normalizing = false;
    };

    normalizeWrapper();
    const legend = $('.scale-legend', scale);
    if (!legend) return;
    if (!legend.id) legend.id = 'informationScaleLegend';

    let disclosure = $(':scope > .scale-disclosure', scale);
    if (!disclosure) {
      disclosure = document.createElement('button');
      disclosure.type = 'button';
      disclosure.className = 'scale-disclosure';
      disclosure.setAttribute('aria-label', 'Information scale options');
      scale.insertBefore(disclosure, scale.firstChild);
    }
    disclosure.setAttribute('aria-controls', legend.id);

    const sync = () => {
      normalizeWrapper();
      disclosure.setAttribute('aria-expanded', scale.classList.contains('is-open') ? 'true' : 'false');
    };

    if (disclosure.dataset.round3Bound !== '1') {
      disclosure.dataset.round3Bound = '1';
      disclosure.addEventListener('keydown', event => {
        // Keep the legacy wrapper key handler from double-toggling the real button.
        event.stopPropagation();
      });
      disclosure.addEventListener('click', event => {
        event.preventDefault();
        event.stopPropagation();
        scale.classList.toggle('is-open');
        sync();
      });
      document.addEventListener('click', () => {
        if (!scale.classList.contains('is-open')) return;
        scale.classList.remove('is-open');
        sync();
      });
    }

    const observer = new MutationObserver(sync);
    observer.observe(scale, {
      attributes: true,
      attributeFilter: ['class', 'role', 'tabindex', 'aria-haspopup', 'aria-expanded']
    });
    sync();
  }

  function installAtlasHitTargets() {
    const stage = $('#atlasStage');
    if (!stage) return;

    const enhance = root => {
      const nodes = root?.matches?.('.atlas-node') ? [root] : $$('.atlas-node', root || stage);
      nodes.forEach(node => {
        if ($(':scope > .round3-node-glyph', node)) return;
        const glyph = document.createElement('span');
        glyph.className = 'round3-node-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        node.appendChild(glyph);
      });
    };

    enhance(stage);
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) enhance(node);
      }));
    }).observe(stage, { childList: true, subtree: true });
  }

  function installScrollableRegionSemantics() {
    const metrics = $('#commonsMetrics');
    if (!metrics) return;

    const sync = () => {
      const scrollable = metrics.scrollWidth > metrics.clientWidth + 1 || metrics.scrollHeight > metrics.clientHeight + 1;
      if (scrollable) {
        metrics.tabIndex = 0;
        metrics.dataset.round3Scrollable = 'true';
        if (!metrics.getAttribute('aria-label')) metrics.setAttribute('aria-label', 'Commons summary metrics');
      } else if (metrics.dataset.round3Scrollable === 'true') {
        metrics.removeAttribute('tabindex');
        delete metrics.dataset.round3Scrollable;
      }
    };

    sync();
    requestAnimationFrame(sync);
    addEventListener('resize', () => requestAnimationFrame(sync), { passive: true });
  }

  function restoreLabScrollPosition() {
    if (!/(?:^|\/)lab\.html$/.test(location.pathname)) return;
    try {
      const y = Number(sessionStorage.getItem('geogeek-ux-scroll-y'));
      if (!Number.isFinite(y) || y <= 0) return;
      sessionStorage.removeItem('geogeek-ux-scroll-y');
      addEventListener('load', () => requestAnimationFrame(() => scrollTo(0, y)), { once: true });
    } catch {}
  }

  const install = () => {
    installScaleDisclosure();
    installAtlasHitTargets();
    installScrollableRegionSemantics();
    restoreLabScrollPosition();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install, { once: true });
  else install();
})();
