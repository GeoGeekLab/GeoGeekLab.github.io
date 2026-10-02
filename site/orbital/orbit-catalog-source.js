const UPSTREAM_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON';
const SNAPSHOT_URL = new URL('./data/active.json', import.meta.url).href;
const META_URL = new URL('./data/active.meta.json', import.meta.url).href;
const CACHE_NAME = 'geogeek-orbit-v2';
const CACHE_TS_KEY = 'geogeek.orbit.catalogFetchedAt';
const SOURCE_VERSION_KEY = 'geogeek.orbit.catalogSourceVersion';
const SOURCE_VERSION = 'snapshot-v1';
const STALE_AFTER_MS = 8 * 60 * 60 * 1000;

const nativeFetch = window.fetch.bind(window);
let metadata = null;
let metadataError = null;
let metadataPromise = null;
let syncQueued = false;

function isActiveCatalogRequest(input) {
  try {
    const raw = typeof input === 'string' || input instanceof URL ? input : input?.url;
    const url = new URL(raw, location.href);
    if (url.hostname.toLowerCase() !== 'celestrak.org') return false;
    if (url.pathname.toLowerCase() !== '/norad/elements/gp.php') return false;
    return String(url.searchParams.get('GROUP') || '').toLowerCase() === 'active'
      && String(url.searchParams.get('FORMAT') || '').toLowerCase() === 'json';
  } catch {
    return false;
  }
}

function ageLabel(ms) {
  if (!Number.isFinite(ms)) return 'UNKNOWN AGE';
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} MIN`;
  const hours = ms / 3600000;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} H`;
  return `${(hours / 24).toFixed(1)} D`;
}

function metaAge() {
  const fetched = Date.parse(String(metadata?.fetchedAt || ''));
  return Number.isFinite(fetched) ? Date.now() - fetched : NaN;
}

async function loadMetadata() {
  if (metadataPromise) return metadataPromise;
  metadataPromise = nativeFetch(META_URL, {
    cache: 'no-store',
    credentials: 'same-origin',
    headers: { Accept:'application/json' },
  }).then(async response => {
    if (!response.ok) throw new Error(`Orbit snapshot metadata HTTP ${response.status}`);
    const value = await response.json();
    if (!value || value.dataset !== 'celestrak-active-gp' || !value.fetchedAt || !value.recordCount) {
      throw new Error('Orbit snapshot metadata is malformed.');
    }
    metadata = value;
    metadataError = null;
    queueUiSync();
    return value;
  }).catch(error => {
    metadataError = error;
    queueUiSync();
    return null;
  });
  return metadataPromise;
}

async function deleteCatalogCache() {
  try {
    if ('caches' in window) {
      const cache = await caches.open(CACHE_NAME);
      await cache.delete(UPSTREAM_URL);
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
  const snapshotMs = Date.parse(String(metadata?.fetchedAt || ''));
  if (!Number.isFinite(snapshotMs)) return;
  let cachedMs = NaN;
  try { cachedMs = Number(localStorage.getItem(CACHE_TS_KEY) || NaN); } catch {}
  if (!Number.isFinite(cachedMs)) return;
  if (snapshotMs > cachedMs + 60_000) await deleteCatalogCache();
}

async function fetchSnapshot(init = {}) {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const response = await nativeFetch(SNAPSHOT_URL, {
    ...init,
    mode: 'same-origin',
    credentials: 'same-origin',
    cache: 'no-store',
    headers,
  });
  if (!response.ok) throw new Error(`GeoGeek Orbit snapshot HTTP ${response.status}`);
  return response;
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
    if (dt?.textContent?.trim() === 'CATALOG' && dd) {
      setText(dd, 'CelesTrak active · GeoGeek same-origin OMM snapshot');
    }
  }
}

function syncProvenance() {
  const orbit = document.querySelector('.orbit-v2');
  if (!orbit) return;
  const age = metaAge();
  const stale = Number.isFinite(age) ? age >= STALE_AFTER_MS : true;
  const ageText = ageLabel(age);
  const count = Number(metadata?.recordCount || 0);
  const fetchedAt = metadata?.fetchedAt ? new Date(metadata.fetchedAt).toISOString().replace('T',' ').slice(0,19) + ' UTC' : 'UNKNOWN';

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
    ? `STALE SAME-ORIGIN SNAPSHOT · ${ageText} OLD`
    : `SAME-ORIGIN SNAPSHOT · ${ageText} OLD`);
  setText(orbit.querySelector('#orbitEpochAge'), `Snapshot refreshed ${fetchedAt} · element epochs vary by object.`);

  const provenance = orbit.querySelector('.orbit-provenance dl');
  if (provenance && !provenance.querySelector('[data-orbit-delivery]')) {
    const row = document.createElement('div');
    row.dataset.orbitDelivery = 'snapshot';
    row.innerHTML = '<dt>DELIVERY</dt><dd>GeoGeek same-origin snapshot · scheduled at CelesTrak’s 2-hour update cadence · last-known-good retained on fetch failure.</dd>';
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
  await loadMetadata();
  await alignCacheWithSnapshot();

  const wrappedFetch = (input, init) => isActiveCatalogRequest(input) ? fetchSnapshot(init) : nativeFetch(input, init);
  window.fetch = wrappedFetch;

  const observer = new MutationObserver(queueUiSync);
  observer.observe(document.documentElement, { childList:true, subtree:true, characterData:true });
  window.addEventListener('pagehide', () => observer.disconnect(), { once:true });

  window.GeoOrbitCatalogSource = {
    installed: true,
    upstreamUrl: UPSTREAM_URL,
    snapshotUrl: SNAPSHOT_URL,
    metadataUrl: META_URL,
    get metadata() { return metadata; },
    get metadataError() { return metadataError; },
    refreshUi: queueUiSync,
  };
  queueUiSync();
}

export default window.GeoOrbitCatalogSource;
