const $ = selector => document.querySelector(selector);

const pad = value => String(value).padStart(2, '0');
const today = new Date();
const utcDay = `${today.getUTCFullYear()}-${pad(today.getUTCMonth() + 1)}-${pad(today.getUTCDate())}`;

const input = $('#dateInput');
if (input) {
  input.value = utcDay;
  input.max = utcDay;
}
const readout = $('#timeReadout');
if (readout) readout.textContent = `${utcDay} · VIEW TIME / historical layers`;
const nextDay = $('#nextDay');
if (nextDay) nextDay.disabled = true;

const sourceList = $('#sourceList');
if (sourceList && !sourceList.children.length) {
  sourceList.innerHTML = '<div class="earth-source-preboot">The source catalogue and MapLibre renderer load only when the interactive map is activated. This keeps the first view lightweight and avoids spending CPU, network, and battery before the instrument is used.</div>';
}

const button = $('#earthActivate');
let activation = null;

function loadMapLibreCss() {
  if (document.querySelector('link[data-maplibre-runtime]')) return Promise.resolve();
  return new Promise(resolve => {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.css';
    link.dataset.maplibreRuntime = 'primary';
    link.onload = resolve;
    link.onerror = () => {
      link.href = 'https://cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.css';
      link.dataset.maplibreRuntime = 'fallback';
      link.onload = link.onerror = resolve;
    };
    document.head.appendChild(link);
  });
}

async function activateEarth() {
  if (activation) return activation;
  if (button) {
    button.disabled = true;
    button.textContent = 'LOADING MAP…';
  }
  document.documentElement.classList.add('earth-is-activating');
  activation = loadMapLibreCss()
    .then(() => import('./runtime.js?v=20261002a'))
    .then(() => {
      $('#earthBoot')?.remove();
      document.documentElement.classList.remove('earth-is-activating');
      document.documentElement.classList.add('earth-is-active');
    })
    .catch(error => {
      activation = null;
      document.documentElement.classList.remove('earth-is-activating');
      if (button) {
        button.disabled = false;
        button.textContent = 'RETRY INTERACTIVE MAP';
      }
      const copy = $('#earthBootStatus');
      if (copy) copy.textContent = `The interactive renderer could not start: ${error?.message || 'unknown error'}`;
      throw error;
    });
  return activation;
}

button?.addEventListener('click', () => activateEarth().catch(console.error));

// Deterministic activation hook for browser tests and any future preview tool.
window.GeoGeekEarth = { activate: activateEarth };
