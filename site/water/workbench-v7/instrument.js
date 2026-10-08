/**
 * GeoGeek Water as Spectrum V7 — native water-instrument adapter.
 * The GeoGeek host owns openByKind, URL handling, dialog close, and cancellation.
 * The same-origin iframe isolates IDs, CSS, and delegated app listeners.
 */
(() => {
  'use strict';
  const rootUrl = new URL('water/workbench-v7/', document.baseURI);
  const stylesheet = new URL('instrument.css?v=7.0.0', rootUrl).href;
  const frameUrl = new URL('app/index.html', rootUrl);
  const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  let sequence = 0;

  function ensureStyles() {
    if (document.querySelector('link[data-water-v7-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.dataset.waterV7Style = '1';
    document.head.appendChild(link);
  }

  async function mount({ stage = document.getElementById('instrumentStage'), signal } = {}) {
    if (!stage || signal?.aborted) return () => {};
    ensureStyles();
    const token = 'w' + (++sequence) + '-' + Math.random().toString(36).slice(2, 14);
    const url = new URL(frameUrl);
    url.searchParams.set('chartfix', '7.1.0');
    url.searchParams.set('embed', '1');
    url.searchParams.set('instance', token);

    const frame = document.createElement('iframe');
    frame.className = 'water-v7-frame';
    frame.title = 'Water as Spectrum — ocean-color radiative transfer workbench';
    frame.setAttribute('aria-label', frame.title);
    frame.setAttribute('loading', 'eager');
    frame.setAttribute('referrerpolicy', 'same-origin');
    // Trusted same-origin application. Top-level navigation is not permitted.
    frame.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-downloads allow-modals');

    let settled = false, timeout = null, resolveReady, rejectReady;
    let cleanup = () => {};
    const loaded = new Promise((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });

    function onMessage(event) {
      if (event.source !== frame.contentWindow || event.origin !== location.origin) return;
      if (event.data?.instance !== token) return;
      if (event.data.type === 'geogeek:water-v5:ready') {
        if (!settled) { settled = true; clearTimeout(timeout); resolveReady(true); }
      } else if (event.data.type === 'geogeek:water-v5:escape') {
        if (document.getElementById('instrumentDialog')?.open &&
            window.GeoInstruments?.getActive?.() === 'water') {
          window.GeoInstruments.close();
        }
      }
    }

    function onAbort() {
      if (!settled) { settled = true; clearTimeout(timeout); resolveReady(false); }
      cleanup();
    }

    cleanup = () => {
      window.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', onAbort);
      clearTimeout(timeout);
      frame.remove();
    };

    window.addEventListener('message', onMessage);
    signal?.addEventListener('abort', onAbort, { once: true });
    stage.replaceChildren(frame);
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectReady(new Error('Water V5 did not initialize within 15 seconds'));
    }, 15000);
    frame.src = url.href;

    try {
      const ready = await loaded;
      if (!ready || signal?.aborted || !stage.contains(frame)) {
        cleanup();
        return () => {};
      }
      return cleanup;
    } catch (error) {
      cleanup();
      throw error;
    }
  }

  mounts.water = mount;
  window.GeoWaterWorkbenchV7 = { version: '7.0.0', mount };
})();
