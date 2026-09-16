(() => {
  'use strict';

  const loaded = new Map();
  const scriptUrl = src => new URL(src, document.baseURI).href;

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
    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = src;
      script.addEventListener('load', () => resolve(true), { once: true });
      script.addEventListener('error', () => {
        script.dataset.loadFailed = 'true';
        script.remove();
        reject(new Error(`Failed to load ${src}`));
      }, { once: true });
      document.head.appendChild(script);
    });
    return cache(url, promise);
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

  const gameKinds = new Set(['locate', 'zone', 'path']);
  async function loadInstrument(kind) {
    if (window.GeoInstruments) return window.GeoInstruments;
    if (gameKinds.has(kind)) await loadScript('games.js');
    await loadScript('instruments.js');
    return window.GeoInstruments;
  }

  window.GeoModules = { loadScript, loadModule, loadMap, loadCommons, loadInstrument };

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
    if (!button || window.GeoInstruments) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const kind = button.dataset.instrument;
    try {
      const instruments = await loadInstrument(kind);
      instruments?.openByKind?.(kind, { updateUrl: true });
    } catch (error) {
      console.warn(`[GeoGeek] Instrument ${kind} failed to load; retry is available.`, error);
    }
  }, true);

  const requested = new URLSearchParams(location.search).get('instrument');
  if (requested && document.getElementById('instrumentDialog')) {
    loadInstrument(requested)
      .then(instruments => instruments?.openByKind?.(requested, { updateUrl: false }))
      .catch(error => console.warn(`[GeoGeek] Requested instrument ${requested} failed to load.`, error));
  }

  const homeCommonsMount = document.getElementById('homeCommonsMapMount');
  if (homeCommonsMount) {
    let started = false;
    let horizon = '30d';
    const buttons = [...document.querySelectorAll('[data-home-commons-horizon]')];
    const render = async () => {
      const commons = await loadCommons();
      await commons?.mountPreview?.(homeCommonsMount, { variant:'home', horizon });
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

  const orbital = document.getElementById('orbital-threshold');
  if (orbital) {
    let started = false;
    const startOrbital = () => {
      if (started) return;
      started = true;
      loadModule('orbital/orbital-threshold.js').catch(error => {
        started = false;
        console.warn('[GeoGeek] Orbital field failed to load; retry remains available.', error);
      });
    };
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer.disconnect();
        startOrbital();
      }, { rootMargin: '480px 0px' });
      observer.observe(orbital);
    } else startOrbital();
  }
})();
