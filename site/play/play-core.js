(() => {
  'use strict';

  const GeoPlay = window.GeoPlay = window.GeoPlay || {};
  const STATES = Object.freeze(['observe', 'judge', 'commit', 'reveal', 'compare', 'perturb', 'trace']);

  function ensureStyle(href, key = href) {
    const token = `geo-play-style-${String(key).replace(/[^a-z0-9_-]/gi, '-')}`;
    if (document.getElementById(token)) return;
    const link = document.createElement('link');
    link.id = token;
    link.rel = 'stylesheet';
    link.href = href;
    document.head.appendChild(link);
  }

  function createStateMachine({ initial = 'observe', onChange } = {}) {
    let state = STATES.includes(initial) ? initial : 'observe';
    const listeners = new Set();
    const notify = (previous, meta) => {
      onChange?.(state, previous, meta);
      listeners.forEach(listener => listener(state, previous, meta));
    };
    return {
      get state() { return state; },
      set(next, meta = null) {
        if (!STATES.includes(next)) throw new Error(`Unknown GeoPlay state: ${next}`);
        if (next === state) return state;
        const previous = state;
        state = next;
        notify(previous, meta);
        return state;
      },
      subscribe(listener) {
        listeners.add(listener);
        return () => listeners.delete(listener);
      }
    };
  }

  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    const url = new URL(src, document.baseURI).href;
    const existing = [...document.scripts].find(script => script.src === url);
    if (existing) {
      if (!globalName || window[globalName]) return Promise.resolve(globalName ? window[globalName] : true);
      return new Promise((resolve, reject) => {
        existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
        existing.addEventListener('error', reject, { once: true });
      });
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(globalName ? window[globalName] : true);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  GeoPlay.core = {
    STATES,
    ensureStyle,
    createStateMachine,
    loadScript,
    clamp
  };
})();