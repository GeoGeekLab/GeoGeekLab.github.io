/**
 * GeoGeek Water as Spectrum V10.2 UI foundation — native water-instrument adapter.
 * The GeoGeek host owns openByKind, URL handling, dialog close, and cancellation.
 * The same-origin iframe isolates IDs, CSS, and delegated app listeners.
 */
(() => {
  'use strict';
  const rootUrl = new URL('water/workbench-v10-2/', document.baseURI);
  const stylesheet = new URL('instrument.css?v=10.2.0-shared1', rootUrl).href;
  const awardStylesheet = new URL('award-concept.css?v=a5', rootUrl).href;
  const attentionStylesheet = new URL('water-attention.css?v=a12', rootUrl).href;
  const awardScripts = Object.freeze([
    { id: 'optical', href: new URL('award-optical.js?v=a3', rootUrl).href },
    { id: 'journey', href: new URL('award-journey.js?v=a3', rootUrl).href },
    { id: 'polish', href: new URL('award-polish.js?v=a5', rootUrl).href },
    { id: 'marker', href: new URL('award-concept.js?v=a3', rootUrl).href },
    { id: 'attention', href: new URL('water-attention.js?v=a12', rootUrl).href }
  ]);
  const frameUrl = new URL('app/index.html', rootUrl);
  const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  let sequence = 0;

  function ensureStyles() {
    if (document.querySelector('link[data-water-v102-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.dataset.waterV102Style = '1';
    document.head.appendChild(link);
  }

  function installAwardConcept(frame) {
    const doc = frame.contentDocument;
    if (!doc?.head) return;

    if (!doc.querySelector('link[data-water-award-concept]')) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = awardStylesheet;
      link.dataset.waterAwardConcept = 'a3';
      doc.head.appendChild(link);
    }

    // A11 is strictly a display-density overlay, layered after the frozen A5 concept.
    if (!doc.querySelector('link[data-water-attention-style]')) {
      const link = doc.createElement('link');
      link.rel = 'stylesheet';
      link.href = attentionStylesheet;
      link.dataset.waterAttentionStyle = 'a11';
      doc.head.appendChild(link);
    }

    for (const module of awardScripts) {
      if (doc.querySelector('script[data-water-award-module="' + module.id + '"]')) continue;
      const script = doc.createElement('script');
      script.src = module.href;
      script.async = false;
      script.dataset.waterAwardModule = module.id;
      doc.body?.appendChild(script);
    }
  }

  async function mount({ stage = document.getElementById('instrumentStage'), signal } = {}) {
    if (!stage || signal?.aborted) return () => {};
    ensureStyles();
    const dialog = stage.closest('.instrument-dialog');
    if (dialog) dialog.dataset.waterUiVersion = 'v102';
    const token = 'w' + (++sequence) + '-' + Math.random().toString(36).slice(2, 14);
    const url = new URL(frameUrl);
    url.searchParams.set('chartfix', '10.2.0-shared1');
    url.searchParams.set('embed', '1');
    url.searchParams.set('instance', token);

    const frame = document.createElement('iframe');
    frame.className = 'water-v102-frame';
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
      } else if (event.data.type === 'geogeek:water-v5:boot-error') {
        if(!settled){
          settled=true;
          clearTimeout(timeout);
          rejectReady(new Error('Water V10.2 UI stages 1–4 startup failure: '+String(event.data.message||'unknown').slice(0,180)));
        }
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

    function onFrameLoad() {
      // An iframe inserted before src assignment can emit an about:blank load.
      // Ignore that transient document so the award layer attaches only to the
      // real V10.2 application document.
      const href = frame.contentWindow?.location?.href || '';
      if (!href || href === 'about:blank') return;
      frame.removeEventListener('load', onFrameLoad);
      installAwardConcept(frame);
    }

    cleanup = () => {
      window.removeEventListener('message', onMessage);
      signal?.removeEventListener('abort', onAbort);
      frame.removeEventListener('load', onFrameLoad);
      clearTimeout(timeout);
      frame.remove();
      if(dialog?.dataset.waterUiVersion==='v102') delete dialog.dataset.waterUiVersion;
    };

    window.addEventListener('message', onMessage);
    signal?.addEventListener('abort', onAbort, { once: true });
    frame.addEventListener('load', onFrameLoad);
    frame.src = url.href;
    stage.replaceChildren(frame);
    timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      rejectReady(new Error('Water V10.2 UI stages 1–4 did not initialize within 15 seconds'));
    }, 15000);

    try {
      const ready = await loaded;
      if (!ready || signal?.aborted || !stage.contains(frame)) {
        cleanup();
        return () => {};
      }
      return cleanup;
    } catch (error) {
      cleanup();
      console.error('[GeoGeek] Water workspace startup failed:', error);
      if (signal?.aborted) return () => {};
      const panel = document.createElement('div');
      panel.className = 'instrument-error water-startup-error';
      panel.setAttribute('role', 'alert');
      const title = document.createElement('strong');
      title.textContent = 'Water workspace unavailable.';
      const message = document.createElement('p');
      message.textContent = 'The current workspace did not start. Retry or open the standalone workspace.';
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.textContent = 'Retry Water workspace';
      const standalone = document.createElement('a');
      standalone.href = frameUrl.href;
      standalone.target = '_blank';
      standalone.rel = 'noopener noreferrer';
      standalone.textContent = 'Open standalone workspace ↗';
      panel.append(title, message, retry, standalone);
      stage.replaceChildren(panel);
      const retryMount = () => {
        retry.disabled = true;
        // Let the host create a new session, reset status and own cancellation.
        window.GeoInstruments?.openByKind?.('water');
      };
      retry.addEventListener('click', retryMount, { once: true });
      return () => {
        retry.removeEventListener('click', retryMount);
        panel.remove();
      };
    }
  }

  mounts.water = mount;
  window.GeoWaterWorkbenchV102 = { version: '10.2.0-shared1', conceptVersion: 'award-a3', polishVersion: 'award-a5', mount };
})();
