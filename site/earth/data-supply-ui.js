import DataSupply from '../core/data-supply.js';
import { SOURCES } from './sources.js';

const sourceById = new Map(SOURCES.map(source => [source.id, source]));
let currentSource = null;
let syncToken = 0;

function sourceForButton(button) {
  const source = sourceById.get(button?.dataset?.source || '');
  if (!source) return null;
  return sourceById.get(source.aliasOf || source.id) || source;
}

function deliveryLabel(info) {
  if (!info) return 'PROVIDER';
  if (info.transport === 'same-origin-snapshot') return 'GEOGEEK SNAPSHOT';
  if (info.transport === 'provider-fallback') return 'PROVIDER FALLBACK';
  if (info.mode === 'tile') return 'PROVIDER TILES';
  if (info.mode === 'query') return 'PROVIDER QUERY';
  if (info.mode === 'hybrid') return 'SNAPSHOT + QUERY';
  return info.mode?.toUpperCase() || 'PROVIDER';
}

async function sync() {
  const token = ++syncToken;
  const meta = document.getElementById('inspectorMeta');
  if (!meta || !currentSource) return;
  const dataset = DataSupply.byAdapter(currentSource.adapter);
  meta.querySelectorAll('[data-supply-row]').forEach(row => row.remove());
  if (!dataset) return;
  if (dataset.metadata) await DataSupply.metadata(dataset.id);
  if (token !== syncToken) return;
  const info = DataSupply.describe(dataset.id);
  if (!info) return;

  const delivery = document.createElement('div');
  delivery.dataset.supplyRow = 'delivery';
  delivery.innerHTML = `<dt>DELIVERY</dt><dd>${deliveryLabel(info)}</dd>`;
  const freshness = document.createElement('div');
  freshness.dataset.supplyRow = 'freshness';
  freshness.innerHTML = `<dt>FRESHNESS</dt><dd>${info.metadata ? `${info.stale ? 'STALE · ' : ''}${info.ageLabel.toUpperCase()} OLD` : info.mode === 'tile' || info.mode === 'query' ? 'REQUEST-TIME' : 'PROVIDER FALLBACK'}</dd>`;
  meta.append(delivery, freshness);
  document.documentElement.dataset.earthSupply = info.transport;
}

document.addEventListener('click', event => {
  const button = event.target.closest?.('[data-source]');
  if (!button) return;
  currentSource = sourceForButton(button);
  queueMicrotask(sync);
  setTimeout(sync, 0);
}, true);

document.addEventListener('geogeek:data-supply', () => sync());

const inspector = document.getElementById('inspector');
if (inspector) new MutationObserver(() => sync()).observe(inspector, { childList:true, subtree:true, characterData:true });

window.GeoEarthDataSupply = { sync, get currentSource() { return currentSource; } };
