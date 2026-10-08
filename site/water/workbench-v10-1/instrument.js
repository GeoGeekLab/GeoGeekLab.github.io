/**
 * GeoGeek Water as Spectrum V10 — native water-instrument adapter.
 * The GeoGeek host owns openByKind, URL handling, dialog close, and cancellation.
 * The same-origin iframe isolates IDs, CSS, and delegated app listeners.
 */
(() => {
  'use strict';
  const rootUrl = new URL('water/workbench-v10-1/', document.baseURI);
  const stylesheet = new URL('instrument.css?v=10.1.0', rootUrl).href;
  const frameUrl = new URL('app/index.html', rootUrl);
  const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  let sequence = 0;

  function ensureStyles() {
    if (document.querySelector('link[data-water-v101-style]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = stylesheet;
    link.dataset.waterV101Style = '1';
    document.head.appendChild(link);
  }

  async function mount({ stage = document.getElementById('instrumentStage'), signal } = {}) {
    if (!stage || signal?.aborted) return () => {};
    ensureStyles();
    const token = 'w' + (++sequence) + '-' + Math.random().toString(36).slice(2, 14);
    const url = new URL(frameUrl);
    url.searchParams.set('chartfix', '10.1.0');
    url.searchParams.set('embed', '1');
    url.searchParams.set('instance', token);

    const frame = document.createElement('iframe');
    frame.className = 'water-v101-frame';
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
          rejectReady(new Error('Water V10.1 startup failure: '+String(event.data.message||'unknown').slice(0,180)));
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
      rejectReady(new Error('Water V10.1 did not initialize within 15 seconds'));
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
      console.error('[GeoGeek] Water V10.1 startup failed; attempting V10.0 recovery:',error);
      // V9 remains a complete independent instrument. Do not mislabel V9 as V10.
      const old=mounts.water;
      try{
        if(!window.GeoWaterWorkbenchV10?.mount){
          await new Promise((resolve,reject)=>{
            const script=document.createElement('script');
            script.src=new URL('water/workbench-v10/instrument.js?v=10.0.0',document.baseURI).href;
            script.onload=resolve;
            script.onerror=()=>reject(new Error('Water V10.0 fallback adapter could not load'));
            document.head.appendChild(script);
          });
        }
        const fallback=window.GeoWaterWorkbenchV10?.mount||mounts.water;
        if(typeof fallback!=='function'||fallback===mount)throw new Error('Fallback mount unavailable');
        const close=await fallback({stage,signal});
        mounts.water=old;
        const notice=document.createElement('div');
        notice.setAttribute('role','status');
        notice.textContent='V10 unavailable · showing V10.0 fallback (without V10 custom-slope and contract features)';
        notice.style.cssText='position:absolute;top:0;left:12px;z-index:12;padding:5px 9px;color:#f3ddc2;background:#493226;border:1px solid #bd8b5f;border-radius:0 0 5px 5px;font:11px monospace';
        stage.appendChild(notice);
        return ()=>{notice.remove();if(typeof close==='function')close();};
      }catch(fallbackError){
        mounts.water=old;
        console.error('[GeoGeek] Water V10.0 recovery also failed:',fallbackError);
        throw new Error('Water V10.1 and V9 could not initialize',{cause:error});
      }
    }
  }

  mounts.water = mount;
  window.GeoWaterWorkbenchV101 = { version: '10.1.0', mount };
})();
