/* GeoGeek site-wide visual readiness and navigation handoff. */
(() => {
  'use strict';

  const root = document.documentElement;
  const status = document.getElementById('geogeek-boot-status');
  let revealTimer = 0;
  let revealed = false;

  const setState = state => {
    root.dataset.geogeekBoot = state;
  };

  const nextFrames = (count = 2) => new Promise(resolve => {
    const step = () => {
      if (--count <= 0) resolve();
      else requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });

  const withTimeout = (promise, ms) => Promise.race([
    promise,
    new Promise(resolve => setTimeout(resolve, ms))
  ]);

  const waitForLocalStyles = () => {
    const pending = [...document.querySelectorAll('link[rel="stylesheet"]')]
      .filter(link => {
        if (link.media === 'print') return false;
        try {
          const url = new URL(link.href, location.href);
          return url.origin === location.origin && !link.sheet;
        } catch {
          return false;
        }
      });
    if (!pending.length) return Promise.resolve();
    return withTimeout(
      Promise.all(pending.map(link => new Promise(resolve => {
        const done = () => resolve();
        link.addEventListener('load', done, { once: true });
        link.addEventListener('error', done, { once: true });
      }))),
      1800
    );
  };

  const waitForPreinitEnhancements = () => {
    const hasPreinit = [...document.scripts].some(script => /(?:^|\/)ux-preinit\.js(?:\?|$)/.test(script.src || ''));
    if (!hasPreinit || window.__GEOGEEK_PREINIT_READY__ === true) return Promise.resolve();
    return withTimeout(new Promise(resolve => {
      addEventListener('geogeek:preinit-ready', resolve, { once: true });
    }), 1800);
  };

  const waitForFonts = () => {
    if (!document.fonts?.ready) return Promise.resolve();
    return withTimeout(document.fonts.ready.catch(() => {}), 800);
  };

  const settle = async () => {
    // CSS, DOM-critical enhancement scripts, and primary fonts can all alter the
    // first rendered geometry. Wait for them together, then give the browser two
    // complete layout frames before removing the cover.
    await Promise.all([
      waitForLocalStyles(),
      waitForPreinitEnhancements(),
      waitForFonts(),
    ]);
    await nextFrames(2);
  };

  const reveal = async ({ restored = false } = {}) => {
    clearTimeout(revealTimer);
    await settle();
    revealed = true;
    setState('ready');
    root.dataset.geogeekBootRestored = restored ? 'true' : 'false';
    window.__GEOGEEK_VISUAL_READY__ = true;
    window.__GEOGEEK_VISUAL_READY_AT__ = performance.now();
    dispatchEvent(new CustomEvent('geogeek:visual-ready', { detail: { restored } }));
  };

  const beginLeave = (label = '') => {
    clearTimeout(revealTimer);
    if (status) status.textContent = label || 'Changing scale…';
    setState('leaving');
    window.__GEOGEEK_VISUAL_READY__ = false;
  };

  const sameDocumentTarget = url =>
    url.pathname === location.pathname && url.search === location.search && url.hash;

  const eligibleInternalLink = event => {
    if (event.defaultPrevented || event.button !== 0) return null;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return null;
    const anchor = event.target?.closest?.('a[href]');
    if (!anchor || anchor.hasAttribute('download')) return null;
    const target = (anchor.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return null;
    const raw = anchor.getAttribute('href');
    if (!raw || raw.startsWith('#') || /^(?:mailto:|tel:|javascript:)/i.test(raw)) return null;
    let url;
    try { url = new URL(anchor.href, location.href); }
    catch { return null; }
    if (url.origin !== location.origin) return null;
    if (sameDocumentTarget(url)) return null;
    return { anchor, url };
  };

  // Bubble phase is intentional: page-specific handlers get the first chance to
  // cancel a click. Only a navigation that remains eligible receives the cover.
  document.addEventListener('click', event => {
    const nav = eligibleInternalLink(event);
    if (!nav) return;
    beginLeave();
  });

  // Freeze every outgoing document behind the neutral cover. If the page enters
  // BFCache, that covered state is the snapshot restored by Back/Forward. If it
  // does not enter BFCache, the same cover bridges programmatic navigation such
  // as the Origin wheel/keyboard handoff.
  addEventListener('pagehide', event => {
    if (event.persisted) {
      if (status) status.textContent = 'Restoring view…';
      setState('frozen');
    } else if (root.dataset.geogeekBoot !== 'leaving') {
      beginLeave();
    }
    window.__GEOGEEK_VISUAL_READY__ = false;
  });

  addEventListener('pageshow', event => {
    if (!event.persisted) return;
    setState('restoring');
    reveal({ restored: true });
  });

  // Initial cold navigation. DOMContentLoaded is enough for markup; styles,
  // critical enhancements, fonts, and two layout frames are awaited separately.
  const start = () => reveal({ restored: false });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }

  // A broken enhancement must not create a permanent blank page. The timeout
  // reveals the authoritative static HTML while preserving the no-old-frame
  // contract during the normal path.
  revealTimer = setTimeout(() => {
    if (revealed) return;
    if (status) status.textContent = 'Opening GeoGeek…';
    reveal({ restored: false });
  }, 3000);

  window.GeoGeekVisualReadiness = Object.freeze({
    beginLeave,
    reveal,
    state: () => root.dataset.geogeekBoot || 'unknown'
  });
})();
