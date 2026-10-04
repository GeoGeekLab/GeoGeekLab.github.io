const ROOT = 'https://geogeeklab.github.io';
const RELEASE = '20261004a';
const loadedScripts = new Map();
const loadedStyles = new Set();

const asset = path => `${ROOT}/${String(path).replace(/^\/+/, '')}?v=${RELEASE}`;

function loadStyle(path, marker) {
  const href = asset(path);
  if (loadedStyles.has(href) || [...document.styleSheets].some(sheet => sheet.href === href)) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  if (marker) link.dataset[marker] = '1';
  document.head.appendChild(link);
  loadedStyles.add(href);
}

function loadScript(path) {
  const src = asset(path);
  if (loadedScripts.has(src)) return loadedScripts.get(src);
  const promise = new Promise((resolve, reject) => {
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing?.dataset.loaded === 'true') return resolve(true);
    const script = existing || document.createElement('script');
    const finish = () => { script.dataset.loaded = 'true'; resolve(true); };
    const fail = () => { loadedScripts.delete(src); if (!existing) script.remove(); reject(new Error(`Failed to load ${path}`)); };
    script.addEventListener('load', finish, { once: true });
    script.addEventListener('error', fail, { once: true });
    if (!existing) {
      script.src = src;
      script.async = true;
      document.head.appendChild(script);
    }
  });
  loadedScripts.set(src, promise);
  return promise;
}

async function prepareProviders() {
  return import(asset('core/provider-stability.js'));
}

async function mountOrbit(stage, signal, statusCallback) {
  await import(asset('orbital/orbit-catalog-source.js'));
  const runtime = await import(asset('orbital/orbital-engine.js'));
  if (!runtime?.mountOrbitalLab) throw new Error('Orbital production module did not bind.');
  return runtime.mountOrbitalLab({ container: stage, signal, statusCallback });
}

async function mountEarth(stage, signal) {
  loadStyle('earth-observation-lab.css', 'earthObservationLab');
  loadStyle('earth-observation-v3.css', 'earthObservationV3');
  await import(asset('earth-observation-lab-v3.js'));
  if (!window.GeoEarthTemporalLab?.mount) throw new Error('Earth production module did not bind.');
  return window.GeoEarthTemporalLab.mount({ stage, signal });
}

async function mountFlow(stage, signal) {
  await loadScript('flow-lab.js');
  await loadScript('flow-lab-polish.js');
  if (!window.GeoFlowLab?.mount) throw new Error('Flow production module did not bind.');
  return window.GeoFlowLab.mount({ stage, signal });
}

async function mountPulse(stage, signal) {
  loadStyle('pulse-observation-lab.css', 'pulseObservationLab');
  loadStyle('pulse-observation-round4.css', 'pulseRound4');
  loadStyle('pulse-observation-round5.css', 'pulseRound5');
  await loadScript('pulse-observation-lab-v2.js');
  await loadScript('pulse-observation-lab-v3.js');
  await loadScript('pulse-observation-lab-v4.js');
  if (!window.GeoPulseObservationLab?.mount) throw new Error('Pulse production module did not bind.');
  return window.GeoPulseObservationLab.mount({ stage, signal });
}

async function mountFigure(stage, signal) {
  await loadScript('figure-analysis-workbench.js');
  if (!window.GeoFigureWorkbench?.mount) throw new Error('Image → Trace production module did not bind.');
  return window.GeoFigureWorkbench.mount({ stage, signal });
}

async function mountWorld(stage, signal) {
  await loadScript('world-projection-lab.js');
  if (!window.GeoProjectionLab?.mount) throw new Error('World projection production module did not bind.');
  return window.GeoProjectionLab.mount({ stage, signal });
}

export async function mountObservatoryInstrument(kind, { stage, signal, statusCallback } = {}) {
  if (!stage) throw new Error('Instrument stage is required.');
  await prepareProviders();
  switch (kind) {
    case 'orbit': return mountOrbit(stage, signal, statusCallback);
    case 'earth': return mountEarth(stage, signal);
    case 'flow': return mountFlow(stage, signal);
    case 'pulse': return mountPulse(stage, signal);
    case 'figure': return mountFigure(stage, signal);
    case 'world': return mountWorld(stage, signal);
    default: throw new Error(`Unknown Observatory instrument: ${kind}`);
  }
}

export const OBSERVATORY_ENTRY_RELEASE = RELEASE;
export const OBSERVATORY_ROOT = ROOT;
