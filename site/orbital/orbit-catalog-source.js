import DataSupply from '../core/data-supply.js?v=20261002b';

const DATASET_ID = 'orbit-active';
const dataset = DataSupply.get(DATASET_ID);
const CACHE_NAME = 'geogeek-orbit-v2';
const CACHE_TS_KEY = 'geogeek.orbit.catalogFetchedAt';
const SOURCE_VERSION_KEY = 'geogeek.orbit.catalogSourceVersion';
const SOURCE_VERSION = 'unified-supply-v1';
let syncQueued = false;

const SNAPSHOT_URL = new URL(`../${dataset.snapshot}`, import.meta.url).href;
const META_URL = new URL(`../${dataset.metadata}`, import.meta.url).href;

async function deleteCatalogCache() {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(dataset.upstream);
    }
  } catch {}
  try { localStorage.removeItem(CACHE_TS_KEY); } catch {}
}

async function migrateLegacyCacheOnce() {
  let current = null;
  try { current = localStorage.getItem(SOURCE_VERSION_KEY); } catch {}
  if (current === SOURCE_VERSION) return;
  await deleteCatalogCache();
  try { localStorage.setItem(SOURCE_VERSION_KEY, SOURCE_VERSION); } catch {}
}

async function alignCacheWithSnapshot() {
  const meta = await DataSupply.metadata(DATASET_ID);
  const snapshotMs = Date.parse(String(meta?.fetchedAt || ''));
  if (!Number.isFinite(snapshotMs)) return;
  let cachedMs = NaN;
  try { cachedMs = Number(localStorage.getItem(CACHE_TS_KEY) || NaN); } catch {}
  if (Number.isFinite(cachedMs) && snapshotMs > cachedMs + 60_000) await deleteCatalogCache();
}

function setText(node, value) {
  if (node && node.textContent !== value) node.textContent = value;
}

function syncConditions() {
  const root = document.getElementById('instrumentConditions');
  if (!root) return;
  for (const row of root.querySelectorAll('div')) {
    const dt = row.querySelector('dt');
    const dd = row.querySelector('dd');
    if (dt?.textContent?.trim() === 'CATALOG' && dd) setText(dd, 'CelesTrak active · GeoGeek unified same-origin OMM snapshot');
  }
}

function syncProvenance() {
  const orbit = document.querySelector('.orbit-v2');
  if (!orbit) return;
  const info = DataSupply.describe(DATASET_ID);
  const meta = info?.metadata;
  const stale = info?.stale ?? true;
  const ageText = info?.ageLabel?.toUpperCase() || 'UNKNOWN AGE';
  const count = Number(meta?.recordCount || 0);
  const fetchedAt = meta?.fetchedAt ? new Date(meta.fetchedAt).toISOString().replace('T',' ').slice(0,19) + ' UTC' : 'UNKNOWN';

  const badge = document.querySelector('.instrument-status');
  if (badge) {
    badge.dataset.state = stale ? 'error' : 'cache';
    setText(badge, stale
      ? `STATUS / STALE SNAPSHOT · ${ageText} OLD`
      : `STATUS / SNAPSHOT · ${count.toLocaleString()} OBJECTS · UPDATED ${ageText} AGO`);
  }

  const sourceState = orbit.querySelector('#orbitSourceState');
  if (sourceState) {
    sourceState.classList.toggle('is-cache', !stale);
    sourceState.classList.toggle('is-stale', stale);
  }
  setText(orbit.querySelector('#orbitSourceText'), stale
    ? `STALE UNIFIED SNAPSHOT · ${ageText} OLD`
    : `UNIFIED SAME-ORIGIN SNAPSHOT · ${ageText} OLD`);
  setText(orbit.querySelector('#orbitEpochAge'), `Snapshot refreshed ${fetchedAt} · element epochs vary by object.`);

  const provenance = orbit.querySelector('.orbit-provenance dl');
  if (provenance && !provenance.querySelector('[data-orbit-delivery]')) {
    const row = document.createElement('div');
    row.dataset.orbitDelivery = 'snapshot';
    row.innerHTML = '<dt>DELIVERY</dt><dd>GeoGeek unified data supply · same-origin snapshot · last-known-good retained on upstream failure.</dd>';
    provenance.insertBefore(row, provenance.firstChild?.nextSibling || null);
  }

  orbit.dataset.catalogDelivery = 'snapshot';
  orbit.dataset.catalogStale = String(stale);
  document.documentElement.dataset.orbitCatalogDelivery = 'snapshot';
}

function syncUi() {
  syncQueued = false;
  syncConditions();
  syncProvenance();
}

function queueUiSync() {
  if (syncQueued) return;
  syncQueued = true;
  queueMicrotask(syncUi);
}

if (!window.GeoOrbitCatalogSource?.installed) {
  await migrateLegacyCacheOnce();
  await DataSupply.metadata(DATASET_ID);
  await alignCacheWithSnapshot();

  const observer = new MutationObserver(queueUiSync);
  observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  document.addEventListener('geogeek:data-supply', event => {
    if (event.detail?.id === DATASET_ID) queueUiSync();
  });
  window.addEventListener('pagehide', () => observer.disconnect(), { once:true });

  window.GeoOrbitCatalogSource = {
    installed:true,
    supplyId:DATASET_ID,
    upstreamUrl:dataset.upstream,
    snapshotUrl:SNAPSHOT_URL,
    metadataUrl:META_URL,
    get metadata() { return DataSupply.describe(DATASET_ID)?.metadata || null; },
    get metadataError() { return DataSupply.describe(DATASET_ID)?.metadataError || null; },
    refreshUi:queueUiSync,
  };
  queueUiSync();
}

export default window.GeoOrbitCatalogSource;
