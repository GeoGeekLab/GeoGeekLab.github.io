import { DATA_SUPPLY_SCHEMA_VERSION, DATASETS, DATASET_BY_ID, DATASET_BY_ADAPTER, productFor, productsFor, siteAssetUrl } from '../data/supply-registry.js';

const nativeFetch = window.fetch.bind(window);
const states = new Map();
const installedAt = Date.now();
const DAY_MS = 86400000;

const resolveDataset = idOrAdapter => DATASET_BY_ID.get(idOrAdapter) || DATASET_BY_ADAPTER.get(idOrAdapter) || null;
const stateFor = id => {
  if (!states.has(id)) states.set(id, {
    metadata:null,
    metadataError:null,
    metadataPromise:null,
    lastTransport:null,
    lastRequestAt:null,
    requestSequence:0,
    request:null
  });
  return states.get(id);
};

function normalizeUrl(input) {
  try {
    const raw = typeof input === 'string' || input instanceof URL ? input : input?.url;
    return new URL(raw, location.href);
  } catch { return null; }
}

function sameUrl(a, b) {
  try { return new URL(a).href === new URL(b).href; }
  catch { return false; }
}

function isTodayWindow(url) {
  const start = url.searchParams.get('starttime');
  const end = url.searchParams.get('endtime');
  if (!start || !end) return false;
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, '0');
  const d = String(now.getUTCDate()).padStart(2, '0');
  const today = `${y}-${m}-${d}`;
  const tomorrow = new Date(Date.UTC(y, now.getUTCMonth(), now.getUTCDate() + 1)).toISOString().slice(0, 10);
  return start.startsWith(today) && end.startsWith(tomorrow);
}

function matchDataset(url) {
  if (!url) return null;

  // Version-pinned references are exact products, not provider families.
  const reference = DATASETS.find(dataset => dataset.mode === 'reference' && sameUrl(url.href, dataset.upstream));
  if (reference) return reference;

  const host = url.hostname.toLowerCase();
  const path = url.pathname.toLowerCase();

  if (host === 'celestrak.org' && path === '/norad/elements/gp.php'
    && String(url.searchParams.get('GROUP') || '').toLowerCase() === 'active'
    && String(url.searchParams.get('FORMAT') || '').toLowerCase() === 'json') return DATASET_BY_ID.get('orbit-active');
  if (host === 'earthquake.usgs.gov' && path === '/earthquakes/feed/v1.0/summary/all_day.geojson') return DATASET_BY_ID.get('usgs-earthquakes-day');
  if (host === 'services.swpc.noaa.gov' && path === '/json/ovation_aurora_latest.json') return DATASET_BY_ID.get('noaa-aurora');
  if (host === 'webservices.volcano.si.edu' && /\/geoserver\/gvp-votw\/ows$/i.test(url.pathname)) return DATASET_BY_ID.get('smithsonian-volcanoes');
  if (host === 'www.seismicportal.eu' && path === '/fdsnws/event/1/query') return DATASET_BY_ID.get('emsc-events');
  if (host === 'gibs.earthdata.nasa.gov') return DATASET_BY_ID.get('nasa-gibs');
  if (host === 'tiles.openrailwaymap.org') return DATASET_BY_ID.get('openrailwaymap');
  if (host === 'api.inaturalist.org' && path.startsWith('/v1/observations')) return DATASET_BY_ID.get('inaturalist');
  if (host === 'api.gbif.org' && path.startsWith('/v1/occurrence/search')) return DATASET_BY_ID.get('gbif');
  if (host === 'api.waterdata.usgs.gov' && path.includes('/collections/latest-continuous/items')) return DATASET_BY_ID.get('usgs-water');
  return null;
}

function ageMs(metadata) {
  const ms = Date.parse(String(metadata?.fetchedAt || ''));
  return Number.isFinite(ms) ? Date.now() - ms : NaN;
}

function ageLabel(ms) {
  if (!Number.isFinite(ms)) return 'unknown';
  const minutes = Math.max(0, Math.round(ms / 60000));
  if (minutes < 60) return `${minutes} min`;
  const hours = ms / 3600000;
  if (hours < 48) return `${hours.toFixed(hours < 10 ? 1 : 0)} h`;
  return `${(hours / DAY_MS).toFixed(1)} d`;
}

async function metadata(id, { refresh = false } = {}) {
  const dataset = DATASET_BY_ID.get(id);
  if (!dataset?.metadata) return null;
  const state = stateFor(id);
  if (refresh) state.metadataPromise = null;
  if (state.metadataPromise) return state.metadataPromise;
  state.metadataPromise = nativeFetch(siteAssetUrl(dataset.metadata), {
    cache: 'no-store', credentials: 'same-origin', headers: { Accept:'application/json' }
  }).then(async response => {
    if (!response.ok) throw new Error(`metadata HTTP ${response.status}`);
    const value = await response.json();
    if (!value?.sha256) throw new Error('metadata is missing sha256');
    if (dataset.mode === 'reference') {
      if (!value?.version || !value?.source) throw new Error('reference metadata is missing version/source');
    } else if (!value?.fetchedAt || !Number.isFinite(Date.parse(String(value.fetchedAt)))) {
      throw new Error('metadata is missing a valid fetchedAt');
    }
    if (dataset.metadataDataset && value.dataset !== dataset.metadataDataset && value.supplyId !== dataset.id) {
      throw new Error(`metadata dataset mismatch: ${value.dataset || 'unknown'}`);
    }
    if (!dataset.metadataDataset && value.supplyId && value.supplyId !== dataset.id) throw new Error(`metadata supplyId mismatch: ${value.supplyId}`);
    state.metadata = value;
    state.metadataError = null;
    emit(dataset.id);
    return value;
  }).catch(error => {
    state.metadata = null;
    state.metadataError = error;
    emit(dataset.id);
    return null;
  });
  return state.metadataPromise;
}

function snapshotEligible(dataset, url, meta) {
  if (!dataset?.snapshot || !meta) return false;
  const age = ageMs(meta);
  if (dataset.id === 'emsc-events') {
    if (!isTodayWindow(url)) return false;
    const windowStart = String(meta.window?.start || '');
    if (!windowStart || windowStart.slice(0, 10) !== new Date().toISOString().slice(0, 10)) return false;
    return Number.isFinite(age) && age <= dataset.staleAfterMs;
  }
  if (dataset.fallback === 'last-known-good') return true;
  if (!Number.isFinite(age)) return false;
  return !Number.isFinite(dataset.staleAfterMs) || age <= dataset.staleAfterMs;
}

async function sameOriginResponse(path, init = {}) {
  const headers = new Headers(init?.headers || {});
  if (!headers.has('Accept')) headers.set('Accept', 'application/json');
  const response = await nativeFetch(siteAssetUrl(path), {
    ...init,
    mode: 'same-origin',
    credentials: 'same-origin',
    cache: 'no-store',
    headers
  });
  if (!response.ok) throw new Error(`same-origin data HTTP ${response.status}`);
  return response;
}

function snapshotResponse(dataset, init = {}) {
  return sameOriginResponse(dataset.snapshot, init);
}

function referenceResponse(dataset, init = {}) {
  return sameOriginResponse(dataset.reference, init);
}

function record(dataset, transport) {
  if (!dataset) return;
  const state = stateFor(dataset.id);
  state.lastTransport = transport;
  state.lastRequestAt = new Date().toISOString();
  emit(dataset.id);
}

function beginRequest(idOrAdapter, details = {}) {
  const dataset = resolveDataset(idOrAdapter);
  if (!dataset) throw new Error(`Unknown data-supply dataset: ${idOrAdapter}.`);
  const state = stateFor(dataset.id);
  const sequence = ++state.requestSequence;
  const requestedAt = new Date().toISOString();
  const transport = details.transport || (dataset.mode === 'tile' ? 'provider-raster' : 'provider-query');
  const request = {
    sequence,
    status:'requesting',
    transport,
    productId:details.productId || null,
    scope:details.scope || dataset.scope,
    observationTime:details.observationTime || null,
    requestUrl:details.requestUrl || null,
    purpose:details.purpose || 'foreground',
    requestedAt,
    completedAt:null,
    error:null
  };
  state.request = request;
  state.lastTransport = transport;
  state.lastRequestAt = requestedAt;
  emit(dataset.id);

  const finish = (status, extra = {}) => {
    if (state.requestSequence !== sequence) return false;
    const error = extra.error instanceof Error ? extra.error.message : extra.error || null;
    state.request = {
      ...request,
      ...extra,
      error,
      status,
      completedAt:new Date().toISOString()
    };
    emit(dataset.id);
    return true;
  };

  return Object.freeze({
    datasetId:dataset.id,
    sequence,
    isCurrent:() => state.requestSequence === sequence,
    succeed:extra => finish('available', extra),
    fail:(error, extra = {}) => finish('unavailable', { ...extra, error }),
    abort:extra => extra?.reason === 'superseded' ? false : finish('aborted', extra)
  });
}

async function routedFetch(input, init) {
  const url = normalizeUrl(input);
  const dataset = matchDataset(url);
  if (!dataset) return nativeFetch(input, init);

  if (dataset.mode === 'reference') {
    const meta = await metadata(dataset.id);
    if (!meta) {
      record(dataset, 'reference-unavailable');
      throw new Error(`${dataset.label} reference metadata is unavailable.`);
    }
    try {
      const response = await referenceResponse(dataset, init);
      record(dataset, 'same-origin-reference');
      return response;
    } catch (error) {
      stateFor(dataset.id).metadataError = error;
      record(dataset, 'reference-unavailable');
      throw new Error(`${dataset.label} same-origin reference is unavailable.`);
    }
  }

  if (!dataset.snapshot) {
    record(dataset, dataset.mode === 'tile' ? 'provider-tile' : 'provider-query');
    return nativeFetch(input, init);
  }

  const meta = await metadata(dataset.id);
  if (snapshotEligible(dataset, url, meta)) {
    try {
      const response = await snapshotResponse(dataset, init);
      record(dataset, 'same-origin-snapshot');
      return response;
    } catch (error) {
      stateFor(dataset.id).metadataError = error;
      if (dataset.fallback === 'last-known-good') throw error;
    }
  }

  if (dataset.fallback === 'last-known-good') {
    record(dataset, 'snapshot-unavailable');
    throw new Error(`${dataset.label} same-origin snapshot is unavailable.`);
  }
  record(dataset, 'provider-fallback');
  return nativeFetch(input, init);
}

function describe(idOrAdapter) {
  const dataset = resolveDataset(idOrAdapter);
  if (!dataset) return null;
  const state = stateFor(dataset.id);
  const age = dataset.mode === 'reference' ? NaN : ageMs(state.metadata);
  const stale = dataset.mode === 'reference' ? false : Boolean(dataset.staleAfterMs && Number.isFinite(age) && age > dataset.staleAfterMs);
  const defaultTransport = dataset.mode === 'reference'
    ? 'same-origin-reference'
    : dataset.snapshot
      ? state.metadataError && dataset.fallback === 'upstream' ? 'provider-fallback' : 'same-origin-snapshot'
      : dataset.mode === 'tile' ? 'provider-tile' : 'provider-query';
  return {
    ...dataset,
    metadata: state.metadata,
    metadataError: state.metadataError,
    ageMs: age,
    ageLabel: dataset.mode === 'reference' ? 'version-pinned' : ageLabel(age),
    freshnessLabel: dataset.mode === 'reference' ? 'VERSION-PINNED' : ageLabel(age).toUpperCase(),
    stale,
    transport: state.lastTransport || defaultTransport,
    request: state.request ? { ...state.request } : null,
    product: state.request?.productId ? productFor(dataset.id, state.request.productId) : null,
    installedAt
  };
}

function emit(id) {
  queueMicrotask(() => document.dispatchEvent(new CustomEvent('geogeek:data-supply', { detail: describe(id) })));
}

if (!window.GeoDataSupply?.installed) {
  window.fetch = routedFetch;
  window.GeoDataSupply = {
    installed: true,
    schemaVersion: DATA_SUPPLY_SCHEMA_VERSION,
    datasets: DATASETS,
    get: id => DATASET_BY_ID.get(id) || null,
    byAdapter: adapter => DATASET_BY_ADAPTER.get(adapter) || null,
    products: productsFor,
    product: productFor,
    classify: input => matchDataset(normalizeUrl(input)),
    metadata,
    describe,
    beginRequest,
    refreshMetadata: id => metadata(id, { refresh:true }),
    nativeFetch
  };
}

export default window.GeoDataSupply;
