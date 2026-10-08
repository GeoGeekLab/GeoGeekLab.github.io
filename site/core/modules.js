(() => {
  'use strict';

  const loaded = new Map();
  const scriptUrl = src => new URL(src, document.baseURI).href;
  const ORBIT_CATALOG_SOURCE = 'orbital/orbit-catalog-source.js?v=20261004a';
  const ORBIT_ENHANCEMENT = 'orbital/orbital-enhancements-v3.js?v=20261002c';
  const PROVIDER_STABILITY_RUNTIME = 'core/provider-stability.js?v=20261004b';
  const EARTH_OBSERVATION_LAB = 'earth-observation-lab-v3.js?v=20261002e';
  const PULSE_OBSERVATION_LAB = 'pulse-observation-lab-v4.js?v=20261002e';
  const WATER_INSTRUMENT = 'water/water-instrument.js?v=20261007o';
  const WATER_WORKBENCH_V5 = 'water/workbench-v5/instrument.js?v=5.0.0';
  const WATER_WORKBENCH_V6 = 'water/workbench-v6/instrument.js?v=6.0.0';
  const WATER_WORKBENCH_V7 = 'water/workbench-v7/instrument.js?v=7.1.0';
  const WATER_WORKBENCH_V8 = 'water/workbench-v8/instrument.js?v=8.0.0';
  const observatoryKinds = new Set(['orbit', 'world', 'earth', 'pulse', 'flow', 'figure']);

  function alignPulseContract() {
    const root = window.GEOGEEK_DATA?.en;
    const item = root?.lab?.find(entry => entry.instrument === 'pulse');
    if (item) Object.assign(item, {
      status:'Instrument',
      tags:['Seismicity', '24 h timeline', 'USGS'],
      description:'Scrub, filter, and spatially aggregate one validated rolling 24-hour USGS snapshot without treating it as a historical archive or hazard model.',
      source:'USGS Earthquake Hazards Program · GeoGeek validated snapshot'
    });
    const lab = root?.ui?.lab;
    if (lab?.conditions) lab.conditions.pulse = [
      ['SOURCE', 'USGS Earthquake Hazards Program'],
      ['DELIVERY', 'GeoGeek same-origin snapshot'],
      ['TIME', 'Snapshot-internal event-origin cutoff'],
      ['LIMIT', 'Count grid ≠ hazard · snapshot ≠ archive']
    ];

    const card = document.querySelector('#l10');
    if (!card) return;
    const meta = card.querySelectorAll('.project-meta span');
    if (meta[0]) meta[0].textContent = 'Instrument';
    if (meta[1]) meta[1].textContent = 'Seismicity · 24 h timeline · USGS';
    const copy = card.querySelector('.project-copy > p');
    const coord = card.querySelector('.lab-coord');
    const stamp = card.querySelector('.preview-stamp');
    if (copy) copy.textContent = 'Scrub event-origin time, filter the current snapshot, and switch between individual events and an explicitly bounded count grid.';
    if (coord) coord.textContent = 'lon / lat / depth / time';
    if (stamp) stamp.textContent = 'USGS / 24 H / FILTER / GRID';
  }

  alignPulseContract();

  function cache(url, promise) {
    const guarded = promise.catch(error => {
      loaded.delete(url);
      throw error;
    });
    loaded.set(url, guarded);
    return guarded;
  }

  function loadScript(src) {
    const url = scriptUrl(src);
    if (loaded.has(url)) return loaded.get(url);
    const existing = [...document.scripts].find(script => script.src === url && script.dataset.loadFailed !== 'true');
    if (existing?.dataset.loaded === 'true') return Promise.resolve(true);
    const promise = new Promise((resolve, reject) => {
      const script = existing || document.createElement('script');
      const finish = () => {
        script.dataset.loaded = 'true';
        script.dataset.loadFailed = 'false';
        resolve(true);
      };
      const fail = () => {
        script.dataset.loadFailed = 'true';
        if (!existing) script.remove();
        reject(new Error(`Failed to load ${src}`));
      };
      script.addEventListener('load', finish, { once: true });
      script.addEventListener('error', fail, { once: true });
      if (!existing) {
        script.src = src;
        script.async = true;
        document.head.appendChild(script);
      } else if (existing.readyState === 'complete') finish();
    });
    return cache(url, promise);
  }

  function loadModule(src) {
    const url = scriptUrl(src);
    if (loaded.has(url)) return loaded.get(url);
    return cache(url, import(url));
  }

  async function loadMap() {
    if (!window.GeoMap) await loadScript('map/site-map.js');
    return window.GeoMap;
  }

  async function loadCommons() {
    if (!window.GEOGEEK_COMMONS_CONFIG) await loadScript('commons/config.js');
    if (!window.GeoCommonsGeo) await loadScript('commons/geo.js');
    if (!window.GeoCommonsDemo) await loadScript('commons/demo-data.js');
    if (!window.GeoCommonsData) await loadScript('commons/commons-data.js');
    if (!window.GeoCommons) await loadScript('commons/commons.js');
    return window.GeoCommons;
  }

  function normalizeInstrumentAria(kind, root = document.getElementById('instrumentStage')) {
    if (!root) return;
    if (kind === 'earth') {
      root.querySelectorAll(
        '.earth-observation-lab div[aria-label]:not([role]), .earth-observation-lab footer[aria-label]:not([role])'
      ).forEach(node => node.setAttribute('role', 'group'));
    }
    if (kind === 'pulse') {
      root.querySelectorAll('.pulse-observation-lab .pulse-map-wrap[aria-label]').forEach(node => {
        if (!node.hasAttribute('tabindex')) node.setAttribute('tabindex', '0');
      });
    }
  }

  function quarantineLegacyPulseMount() {
    const mounts = window.GeoGeekInstrumentMounts;
    if (!mounts || window.GeoPulseObservationLab) return;
    mounts.pulse = ({ stage = document.getElementById('instrumentStage') } = {}) => {
      if (stage) stage.innerHTML = '<div class="instrument-error"><strong>Pulse enhancement unavailable.</strong><p>The legacy browser-direct USGS/CDN path is disabled. GeoGeek will not bypass the unified data-supply contract.</p></div>';
      return () => {};
    };
  }

  const gameKinds = new Set(['locate', 'zone', 'path']);
  async function loadInstrument(kind) {
    if (observatoryKinds.has(kind)) await loadModule(PROVIDER_STABILITY_RUNTIME);
    if (!window.GeoInstruments) {
      if (gameKinds.has(kind)) await loadScript('games.js');
      await loadScript('instruments.js?v=20261008a');
      quarantineLegacyPulseMount();
      await loadScript('figure-instrument.js?v=20261001a');
    } else {
      quarantineLegacyPulseMount();
    }
    if (kind === 'orbit') {
      await loadModule(ORBIT_CATALOG_SOURCE);
      await loadModule(ORBIT_ENHANCEMENT);
    }
    if (kind === 'world' && !window.GeoProjectionLab) await loadScript('world-projection-lab.js?v=20261001a');
    if (kind === 'earth' && !window.GeoEarthTemporalLab) {
      await loadModule(EARTH_OBSERVATION_LAB);
      if (!window.GeoEarthTemporalLab) throw new Error('Earth observation Lab failed to bind the unified data-supply contract.');
    }
    if (kind === 'pulse' && !window.GeoPulseObservationLab) {
      await loadScript(PULSE_OBSERVATION_LAB);
      if (!window.GeoPulseObservationLab) throw new Error('Pulse observation Lab failed to bind the unified data-supply contract.');
    }
    if (kind === 'figure' && !window.GeoFigureWorkbench) await loadScript('figure-analysis-workbench.js?v=20261001c');
    if (kind === 'figure' && !window.GeoFigureViewerV2) await loadScript('figure-viewer-v2.js?v=20261001d');
    if (kind === 'figure' && !window.GeoFigureViewerV2Polish) await loadScript('figure-viewer-v2-polish.js?v=20261001e');
    if (kind === 'flow' && !window.GeoFlowLab) await loadScript('flow-lab.js?v=20261002a');
    if (kind === 'flow' && !window.GeoFlowLabPolish) await loadScript('flow-lab-polish.js?v=20261002b');
    if (kind === 'water' && !window.GeoGeekInstrumentMounts?.water) {
      try {
        await loadModule(WATER_WORKBENCH_V8);
      } catch (v8Error) {
        console.warn('[GeoGeek] Water V8 import unavailable; falling back to V7.', v8Error);
        try { await loadModule(WATER_WORKBENCH_V7); }
        catch (v7Failure) {
          console.warn('[GeoGeek] Water V7 import unavailable; falling back to V6.', v7Failure);
          try { await loadModule(WATER_WORKBENCH_V6); }
          catch (v6Failure) {
            console.warn('[GeoGeek] Water V6 import unavailable; falling back to V5.', v6Failure);
            try { await loadModule(WATER_WORKBENCH_V5); }
            catch { await loadModule(WATER_INSTRUMENT); }
          }
        }
      }
    }
    return window.GeoInstruments;
  }

  window.GeoModules = {
    loadScript,
    loadModule,
    loadMap,
    loadCommons,
    loadInstrument,
    normalizeInstrumentAria
  };

  const mapToggle = document.getElementById('navToggle');
  mapToggle?.addEventListener('click', async event => {
    if (window.GeoMap) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const map = await loadMap();
      map?.open?.();
    } catch (error) {
      console.warn('[GeoGeek] Site index failed to load; retry is available.', error);
    }
  }, true);

  document.addEventListener('click', async event => {
    const button = event.target.closest?.('[data-instrument]');
    if (!button) return;
    const kind = button.dataset.instrument;
    const orbitEnhancementNeeded = kind === 'orbit' && (
      !loaded.has(scriptUrl(ORBIT_CATALOG_SOURCE)) || !loaded.has(scriptUrl(ORBIT_ENHANCEMENT))
    );
    const enhancementNeeded =
      orbitEnhancementNeeded ||
      (kind === 'world' && !window.GeoProjectionLab) ||
      (kind === 'earth' && !window.GeoEarthTemporalLab) ||
      (kind === 'pulse' && !window.GeoPulseObservationLab) ||
      (kind === 'flow' && (!window.GeoFlowLab || !window.GeoFlowLabPolish)) ||
      (kind === 'figure' && (!window.GeoFigureWorkbench || !window.GeoFigureViewerV2 || !window.GeoFigureViewerV2Polish)) ||
      (kind === 'water' && !window.GeoGeekInstrumentMounts?.water);
    if (window.GeoInstruments && !enhancementNeeded) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    try {
      const instruments = await loadInstrument(kind);
      await instruments?.openByKind?.(kind, { updateUrl: true });
      normalizeInstrumentAria(kind);
    } catch (error) {
      console.warn(`[GeoGeek] Instrument ${kind} failed to load; retry is available.`, error);
    }
  }, true);

  const homeCommonsMount = document.getElementById('homeCommonsMapMount');
  if (homeCommonsMount) {
    let started = false;
    let horizon = '30d';
    const buttons = [...document.querySelectorAll('[data-home-commons-horizon]')];
    const render = async () => {
      const commons = await loadCommons();
      await commons?.mountPreview?.(homeCommonsMapMount, { variant:'home', horizon });
    };
    buttons.forEach(button => button.addEventListener('click', async () => {
      horizon = button.dataset.homeCommonsHorizon || '30d';
      buttons.forEach(item => {
        const active = item === button;
        item.classList.toggle('is-active', active);
        item.setAttribute('aria-pressed', String(active));
      });
      if (started) {
        try { await render(); }
        catch (error) { console.warn('[GeoGeek] Commons preview failed; retry remains available.', error); }
      }
    }));
    const start = () => {
      if (started) return;
      started = true;
      render().catch(error => {
        started = false;
        console.warn('[GeoGeek] Commons preview failed; retry remains available.', error);
      });
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        start();
      }, { rootMargin:'520px 0px' });
      observer.observe(homeCommonsMount);
    } else start();
  }
})();
