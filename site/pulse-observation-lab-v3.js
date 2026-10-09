(() => {
  'use strict';

  const VERSION = '20261002c';
  const BASE_SRC = 'pulse-observation-lab-v2.js?v=20261009fixed1';
  const PARAMS = {
    cutoff:'pulseCutoff',
    magnitude:'pulseMag',
    depth:'pulseDepth',
    status:'pulseStatus',
    view:'pulseView'
  };
  const DEFAULTS = {
    cutoff:'1440',
    magnitude:'all',
    depth:'all',
    status:'all',
    view:'auto'
  };
  const OWN_KEYS = Object.values(PARAMS);
  const previous = window.GeoPulseObservationLab;
  let basePromise = null;
  let baseMount = previous?.version === '20261002b' ? previous.mount : null;
  let baseMeta = previous?.version === '20261002b' ? previous : null;

  function canonicalCutoff(value) {
    const number = Number(value);
    if (!Number.isFinite(number)) return DEFAULTS.cutoff;
    return String(Math.max(0, Math.min(1440, Math.round(number / 30) * 30)));
  }

  function selectValue(select, requested, fallback = 'all') {
    if (!select) return fallback;
    return [...select.options].some(option => option.value === requested) ? requested : fallback;
  }

  function parsedState(root) {
    const params = new URL(location.href).searchParams;
    const magnitude = params.get(PARAMS.magnitude) || DEFAULTS.magnitude;
    const depth = params.get(PARAMS.depth) || DEFAULTS.depth;
    const status = params.get(PARAMS.status) || DEFAULTS.status;
    const view = params.get(PARAMS.view) || DEFAULTS.view;
    return {
      cutoff:canonicalCutoff(params.get(PARAMS.cutoff) || DEFAULTS.cutoff),
      magnitude:selectValue(root.querySelector('#pulseMagnitudeFilter'), magnitude),
      depth:selectValue(root.querySelector('#pulseDepthFilter'), depth),
      status:selectValue(root.querySelector('#pulseStatusFilter'), status),
      view:['auto','events','density'].includes(view) ? view : DEFAULTS.view
    };
  }

  function currentState(root) {
    return {
      cutoff:canonicalCutoff(root.querySelector('#pulseTimeline')?.value || DEFAULTS.cutoff),
      magnitude:root.querySelector('#pulseMagnitudeFilter')?.value || DEFAULTS.magnitude,
      depth:root.querySelector('#pulseDepthFilter')?.value || DEFAULTS.depth,
      status:root.querySelector('#pulseStatusFilter')?.value || DEFAULTS.status,
      view:root.querySelector('[data-pulse-representation][aria-pressed="true"]')?.dataset.pulseRepresentation || DEFAULTS.view
    };
  }

  function writeState(root) {
    if (!root?.isConnected) return;
    const state = currentState(root);
    const url = new URL(location.href);
    for (const [key, param] of Object.entries(PARAMS)) {
      const value = state[key];
      if (value === DEFAULTS[key]) url.searchParams.delete(param);
      else url.searchParams.set(param, value);
    }
    const next = `${url.pathname}${url.search}${url.hash}`;
    const current = `${location.pathname}${location.search}${location.hash}`;
    if (next !== current) history.replaceState(history.state, '', next);
  }

  function clearOwnState() {
    const url = new URL(location.href);
    let changed = false;
    OWN_KEYS.forEach(key => {
      if (!url.searchParams.has(key)) return;
      url.searchParams.delete(key);
      changed = true;
    });
    if (changed) history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function applyState(root) {
    const state = parsedState(root);
    const timeline = root.querySelector('#pulseTimeline');
    const magnitude = root.querySelector('#pulseMagnitudeFilter');
    const depth = root.querySelector('#pulseDepthFilter');
    const status = root.querySelector('#pulseStatusFilter');
    if (magnitude) {
      magnitude.value = state.magnitude;
      magnitude.dispatchEvent(new Event('change', { bubbles:true }));
    }
    if (depth) {
      depth.value = state.depth;
      depth.dispatchEvent(new Event('change', { bubbles:true }));
    }
    if (status) {
      status.value = state.status;
      status.dispatchEvent(new Event('change', { bubbles:true }));
    }
    if (timeline) {
      timeline.value = state.cutoff;
      timeline.dispatchEvent(new Event('input', { bubbles:true }));
    }
    root.querySelector(`[data-pulse-representation="${CSS.escape(state.view)}"]`)?.click();
  }

  function installDeepLink(stage) {
    const root = stage?.querySelector('.pulse-observation-lab[data-state="ready"]');
    if (!root) return () => {};

    applyState(root);
    writeState(root);

    const controls = [
      root.querySelector('#pulseTimeline'),
      root.querySelector('#pulseMagnitudeFilter'),
      root.querySelector('#pulseDepthFilter'),
      root.querySelector('#pulseStatusFilter'),
      ...root.querySelectorAll('[data-pulse-representation]')
    ].filter(Boolean);
    const sync = () => queueMicrotask(() => writeState(root));
    controls.forEach(control => {
      control.addEventListener('input', sync);
      control.addEventListener('change', sync);
      control.addEventListener('click', sync);
    });

    const timelineState = root.querySelector('#pulseTimelineState');
    const playbackObserver = timelineState ? new MutationObserver(sync) : null;
    if (timelineState) playbackObserver.observe(timelineState, { childList:true, subtree:true, characterData:true });

    const dialog = document.getElementById('instrumentDialog');
    const closeHandler = () => clearOwnState();
    dialog?.addEventListener('close', closeHandler);

    return () => {
      playbackObserver?.disconnect();
      controls.forEach(control => {
        control.removeEventListener('input', sync);
        control.removeEventListener('change', sync);
        control.removeEventListener('click', sync);
      });
      dialog?.removeEventListener('close', closeHandler);
      clearOwnState();
    };
  }

  function ensureBase() {
    if (baseMount) return Promise.resolve(baseMount);
    if (basePromise) return basePromise;
    basePromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = BASE_SRC;
      script.async = true;
      script.dataset.pulseRound4Base = '1';
      script.addEventListener('load', () => {
        const loaded = window.GeoPulseObservationLab;
        if (!loaded?.mount || loaded.mount === enhancedMount) {
          reject(new Error('Pulse Round 4 base renderer did not bind.'));
          return;
        }
        baseMeta = loaded;
        baseMount = loaded.mount;
        bindEnhanced();
        resolve(baseMount);
      }, { once:true });
      script.addEventListener('error', () => reject(new Error(`Failed to load ${BASE_SRC}`)), { once:true });
      document.head.appendChild(script);
    });
    return basePromise;
  }

  async function enhancedMount(context = {}) {
    const mount = await ensureBase();
    const baseCleanup = await mount(context);
    const stateCleanup = installDeepLink(context.stage || document.getElementById('instrumentStage'));
    return () => {
      stateCleanup();
      baseCleanup?.();
    };
  }

  function bindEnhanced() {
    const metadata = baseMeta || {};
    window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
    window.GeoGeekInstrumentMounts.pulse = enhancedMount;
    window.GeoPulseObservationLab = {
      ...metadata,
      version:VERSION,
      mount:enhancedMount,
      deepLink:['pulseCutoff','pulseMag','pulseDepth','pulseStatus','pulseView']
    };
  }

  bindEnhanced();
})();