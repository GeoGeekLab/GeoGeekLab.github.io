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
      scale.removeAttribute('aria-label');
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
    const toggle = () => {
      scale.classList.toggle('is-open');
      sync();
    };

    if (disclosure.dataset.round3Bound !== '1') {
      disclosure.dataset.round3Bound = '1';

      // Keep the native button activation model intact. Enter and Space already
      // synthesize a click correctly; Round 3 owns only that click state change.
      disclosure.addEventListener('click', event => {
        event.stopPropagation();
        toggle();
      });

      document.addEventListener('click', event => {
        if (!scale.classList.contains('is-open')) return;
        if (scale.contains(event.target)) return;
        scale.classList.remove('is-open');
        sync();
      });
    }

    const observer = new MutationObserver(sync);
    observer.observe(scale, {
      attributes: true,
      attributeFilter: ['class', 'role', 'tabindex', 'aria-haspopup', 'aria-expanded', 'aria-label']
    });
    sync();
  }

  function installAtlasHitTargets() {
    const stage = $('#atlasStage');
    if (!stage) return;

    let layoutRaf = 0;
    const scheduleSeparation = () => {
      if (layoutRaf) cancelAnimationFrame(layoutRaf);
      layoutRaf = requestAnimationFrame(() => {
        layoutRaf = requestAnimationFrame(separateTargets);
      });
    };

    const enhance = root => {
      const nodes = root?.matches?.('.atlas-node') ? [root] : $$('.atlas-node', root || stage);
      nodes.forEach(node => {
        if ($(':scope > .round3-node-glyph', node)) return;
        const glyph = document.createElement('span');
        glyph.className = 'round3-node-glyph';
        glyph.setAttribute('aria-hidden', 'true');
        node.appendChild(glyph);
      });
      scheduleSeparation();
    };

    function separateTargets() {
      layoutRaf = 0;
      const nodes = $$('.atlas-node', stage).filter(node => {
        const style = getComputedStyle(node);
        return style.display !== 'none' && style.visibility !== 'hidden';
      });
      if (nodes.length < 2) return;

      const box = stage.getBoundingClientRect();
      if (!box.width || !box.height) return;

      // Base coordinates come from the graph's existing percentage positioning.
      // Only the clickable/visible node is nudged; data, ordering and relations stay intact.
      const points = nodes.map((node, index) => {
        node.style.setProperty('--round3-hit-x', '0px');
        node.style.setProperty('--round3-hit-y', '0px');
        const left = parseFloat(node.style.left);
        const top = parseFloat(node.style.top);
        const x = Number.isFinite(left) ? box.width * left / 100 : node.offsetLeft;
        const y = Number.isFinite(top) ? box.height * top / 100 : node.offsetTop;
        return { node, index, x, y, dx: 0, dy: 0 };
      });

      const minDistance = 34;
      const radius = 12.5;
      for (let pass = 0; pass < 24; pass += 1) {
        let changed = false;
        for (let i = 0; i < points.length; i += 1) {
          for (let j = i + 1; j < points.length; j += 1) {
            const a = points[i];
            const b = points[j];
            let vx = (b.x + b.dx) - (a.x + a.dx);
            let vy = (b.y + b.dy) - (a.y + a.dy);
            let distance = Math.hypot(vx, vy);
            if (distance >= minDistance) continue;
            if (distance < 0.01) {
              const angle = ((a.index * 17 + b.index * 31) % 360) * Math.PI / 180;
              vx = Math.cos(angle);
              vy = Math.sin(angle);
              distance = 1;
            }
            const push = (minDistance - distance) / 2 + 0.35;
            const ux = vx / distance;
            const uy = vy / distance;
            a.dx -= ux * push;
            a.dy -= uy * push;
            b.dx += ux * push;
            b.dy += uy * push;
            changed = true;
          }
        }

        for (const point of points) {
          const nx = Math.min(box.width - radius, Math.max(radius, point.x + point.dx));
          const ny = Math.min(box.height - radius, Math.max(radius, point.y + point.dy));
          point.dx = nx - point.x;
          point.dy = ny - point.y;
        }
        if (!changed) break;
      }

      for (const point of points) {
        point.node.style.setProperty('--round3-hit-x', `${point.dx.toFixed(2)}px`);
        point.node.style.setProperty('--round3-hit-y', `${point.dy.toFixed(2)}px`);
      }
    }

    enhance(stage);
    new MutationObserver(records => {
      records.forEach(record => record.addedNodes.forEach(node => {
        if (node.nodeType === 1) enhance(node);
      }));
    }).observe(stage, { childList: true, subtree: true });

    document.addEventListener('click', event => {
      if (event.target.closest('[data-atlas-mode], .atlas-modes button, .atlas-view-controls button, .projections [data-projection]')) scheduleSeparation();
    });
    addEventListener('resize', scheduleSeparation, { passive: true });
    addEventListener('load', scheduleSeparation, { once: true });

    const body = document.body;
    if (body) {
      new MutationObserver(scheduleSeparation).observe(body, {
        attributes: true,
        attributeFilter: ['class']
      });
    }
    setTimeout(scheduleSeparation, 240);
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
