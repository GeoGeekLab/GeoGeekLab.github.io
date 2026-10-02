import { createEarthObservationModule } from './earth-observation-v3/mount.js';

const VERSION = '20261002e';
const supply = window.GeoDataSupply;
const module = createEarthObservationModule(supply);

if (!module) {
  console.error('[GeoGeek] L05 requires the unified nasa-gibs data-supply contract.');
} else {
  if (!document.querySelector('link[data-earth-observation-lab]')) {
    const base = document.createElement('link');
    base.rel = 'stylesheet';
    base.href = 'earth-observation-lab.css?v=20261002c';
    base.dataset.earthObservationLab = '1';
    document.head.appendChild(base);
  }
  if (!document.querySelector('link[data-earth-observation-v3]')) {
    const v3 = document.createElement('link');
    v3.rel = 'stylesheet';
    v3.href = `earth-observation-v3.css?v=${VERSION}`;
    v3.dataset.earthObservationV3 = '1';
    document.head.appendChild(v3);
  }
  window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  window.GeoGeekInstrumentMounts.earth = module.mount;
  window.GeoEarthTemporalLab = { version:VERSION, mount:module.mount, datasetId:'nasa-gibs', layers:module.layers };
}
