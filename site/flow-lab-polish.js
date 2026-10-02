(() => {
  'use strict';
  if (!window.GeoFlowLab || window.GeoFlowLabPolish) return;
  const enhanced = window.GeoFlowLab.mount;
  const fallback = window.GeoFlowLab.previous;
  const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};

  if (!document.getElementById('ggFlowLabPolishStyle')) {
    const style = document.createElement('style');
    style.id = 'ggFlowLabPolishStyle';
    style.textContent = '.flow-lab .flow-fx{mix-blend-mode:screen}.flow-lab .flow-svg{isolation:isolate}';
    document.head.appendChild(style);
  }

  async function resilientMount(options) {
    try {
      return await enhanced(options);
    } catch (error) {
      console.warn('[GeoGeek] Flow Dynamics Lab enhancement failed; using the original Flow instrument.', error);
      if (typeof fallback === 'function') return fallback(options);
      throw error;
    }
  }

  mounts.flow = resilientMount;
  window.GeoFlowLab.mount = resilientMount;
  window.GeoFlowLabPolish = { version: '20261002b', mount: resilientMount };
})();