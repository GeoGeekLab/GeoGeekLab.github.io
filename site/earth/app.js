import { SOURCES, CATEGORY_ORDER } from './sources.js';

const $ = s => document.querySelector(s);
const byId = new Map(SOURCES.map(source => [source.id, source]));
const active = new Set();
const requestSlots = new Map();
const busyTokens = new Set();
const layerIds = {
  gibs: ['gg-gibs', 'gg-gibs-src'],
  emsc: ['gg-emsc', 'gg-emsc'],
  volcanoes: ['gg-volcanoes', 'gg-volcanoes'],
  aurora: ['gg-aurora', 'gg-aurora'],
  railway: ['gg-railway', 'gg-railway'],
  usgsWater: ['gg-usgs-water', 'gg-usgs-water'],
  inaturalist: ['gg-inat', 'gg-inat'],
  gbif: ['gg-gbif', 'gg-gbif']
};

const HISTORICAL_ADAPTERS = new Set(['gibs', 'emsc']);
const VIEWPORT_CURRENT_ADAPTERS = new Set(['inaturalist', 'gbif', 'usgsWater']);
const LIVE_ADAPTERS = new Set(['aurora']);
const REFERENCE_ADAPTERS = new Set(['volcanoes', 'railway']);

const pad = n => String(n).padStart(2, '0');
const day = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
const utcDay = value => new Date(`${day(value)}T00:00:00Z`);
const todayUtc = () => utcDay(new Date());
const plusDays = (date, count) => new Date(date.getTime() + count * 86400000);
const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
const text = value => value == null || value === '' ? '—' : String(value);
const number = value => Number.isFinite(Number(value)) ? new Intl.NumberFormat('en', { maximumFractionDigits: 2 }).format(Number(value)) : text(value);
const isAbort = error => error?.name === 'AbortError';

let selectedDate = todayUtc();
let moveTimer = 0;
let map = null;
let maplibregl = null;

function temporalMode(source) {
  const adapter = source?.adapter;
  if (HISTORICAL_ADAPTERS.has(adapter)) return { code: 'view-time', label: `VIEW TIME · ${day(selectedDate)} UTC` };
  if (LIVE_ADAPTERS.has(adapter)) return { code: 'live', label: 'LIVE / PROVIDER LATEST · independent of view date' };
  if (VIEWPORT_CURRENT_ADAPTERS.has(adapter)) return { code: 'current', label: 'CURRENT / RECENT · viewport-dependent, independent of view date' };
  if (REFERENCE_ADAPTERS.has(adapter)) return { code: 'reference', label: 'REFERENCE LAYER · not controlled by view date' };
  return { code: 'source', label: source?.status === 'live' ? 'QUERY-TIME DEPENDENT' : 'SEE SOURCE' };
}

function updateBusy() {
  const strip = $('#loadingStrip');
  if (strip) strip.hidden = busyTokens.size === 0;
}

function beginRequest(key) {
  const previous = requestSlots.get(key);
  previous?.controller.abort();
  const controller = new AbortController();
  const generation = (previous?.generation || 0) + 1;
  const token = Symbol(key);
  requestSlots.set(key, { controller, generation, token });
  busyTokens.add(token);
  updateBusy();
  return { controller, generation, token };
}

function finishRequest(key, generation, token) {
  busyTokens.delete(token);
  const current = requestSlots.get(key);
  if (current?.generation === generation) requestSlots.delete(key);
  updateBusy();
}

function abortRequest(key) {
  const current = requestSlots.get(key);
  if (!current) return;
  current.controller.abort();
  busyTokens.delete(current.token);
  requestSlots.delete(key);
  updateBusy();
}

async function runLatest(key, task) {
  const { controller, generation, token } = beginRequest(key);
  try {
    const result = await task(controller.signal);
    const current = requestSlots.get(key);
    if (!current || current.generation !== generation || controller.signal.aborted) throw new DOMException('Superseded request', 'AbortError');
    return result;
  } finally {
    finishRequest(key, generation, token);
  }
}

async function json(url, { timeout = 18000, signal } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  const relayAbort = () => controller.abort();
  signal?.addEventListener('abort', relayAbort, { once: true });
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener?.('abort', relayAbort);
  }
}

function setFatal(message) {
  const mapNode = $('#map');
  if (mapNode) mapNode.innerHTML = `<div class="earth-fatal" role="alert"><strong>MAP RENDERER UNAVAILABLE</strong><p>${esc(message)}</p><small>The source catalogue remains available. Retry or use the provider links in the inspector.</small></div>`;
  const readout = $('#mapReadout');
  if (readout) readout.textContent = 'MAP / DEGRADED MODE';
  $('#timeReadout').textContent = `${day(selectedDate)} · historical layers only`;
}

async function loadMapLibre() {
  const candidates = [
    'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs',
    'https://cdn.jsdelivr.net/npm/maplibre-gl@6.6.0/dist/maplibre-gl.mjs'
  ];
  let lastError = null;
  for (const url of candidates) {
    try {
      return await import(url);
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('MapLibre could not be loaded from either CDN.');
}

function sourceStateLabel(source) {
  const temporal = temporalMode(source);
  if (source.status !== 'live') return source.status.toUpperCase();
  if (temporal.code === 'view-time') return 'DATE';
  if (temporal.code === 'live') return 'LIVE';
  if (temporal.code === 'current') return 'NOW';
  if (temporal.code === 'reference') return 'REF';
  return 'LIVE';
}

function renderSources(query = '') {
  const q = query.trim().toLowerCase();
  const list = $('#sourceList');
  if (!list) return;
  list.innerHTML = CATEGORY_ORDER.map(category => {
    const rows = SOURCES.filter(source => source.category === category && (!q || `${source.name} ${source.summary} ${source.category}`.toLowerCase().includes(q)));
    if (!rows.length) return '';
    return `<section class="source-group"><h3>${esc(category)}</h3>${rows.map(source => {
      const canonical = source.aliasOf || source.id;
      const on = active.has(canonical);
      return `<button class="source-item${on ? ' is-active' : ''}" data-source="${esc(source.id)}" type="button" aria-pressed="${on}"><span class="source-index">${pad(source.n)}</span><span class="source-copy"><strong>${esc(source.name)}</strong><small>${esc(source.summary)}</small></span><span class="source-state ${source.status}">${esc(sourceStateLabel(source))}</span></button>`;
    }).join('')}</section>`;
  }).join('') || '<div class="panel-foot"><small>No matching sources.</small></div>';
}

function inspect(source, observation = {}, error = '') {
  const temporal = temporalMode(source);
  $('#inspectorKicker').textContent = observation.title ? 'OBSERVATION' : source.status === 'live' ? 'DATA LAYER' : source.status === 'config' ? 'CONFIGURABLE SOURCE' : 'SOURCE REFERENCE';
  $('#inspectorTitle').textContent = observation.title || source.name;
  $('#inspectorDescription').textContent = error || observation.description || source.summary;
  $('#inspectorDescription').className = error ? 'layer-error' : source.status === 'config' ? 'layer-config' : '';
  const values = [
    ['SOURCE', observation.source || source.name],
    ['TIME', observation.time || temporal.label],
    ['RESOLUTION', observation.resolution || source.resolution],
    ['LIMIT', observation.limit || source.limit]
  ];
  $('#inspectorMeta').innerHTML = values.map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(text(value))}</dd></div>`).join('');
  const link = $('#inspectorLink');
  link.href = observation.url || source.url;
  link.textContent = source.status === 'config' && !observation.title ? 'CONFIGURE / SOURCE ↗' : 'SOURCE ↗';
  $('#inspector').classList.add('is-open');
}

function updateActive() {
  $('#activeCount').textContent = [...active].filter(id => !byId.get(id)?.aliasOf).length;
}

function updateTime() {
  const today = todayUtc();
  if (selectedDate > today) selectedDate = today;
  const value = day(selectedDate);
  const input = $('#dateInput');
  input.value = value;
  input.max = day(today);
  $('#timeReadout').textContent = `${value} · VIEW TIME / historical layers`;
  $('#nextDay').disabled = value >= day(today);
  renderSources($('#sourceSearch')?.value || '');
}

function remove(adapter) {
  if (!map) return;
  const [layerId, sourceId] = layerIds[adapter] || [];
  if (layerId && map.getLayer(layerId)) map.removeLayer(layerId);
  if (sourceId && map.getSource(sourceId)) map.removeSource(sourceId);
}

function upsert(id, data, paint, type = 'circle') {
  if (!map) return;
  if (map.getSource(id)) {
    map.getSource(id).setData(data);
    return;
  }
  map.addSource(id, { type: 'geojson', data });
  map.addLayer({ id, source: id, type, paint });
}

function bbox() {
  const bounds = map.getBounds();
  let west = Math.max(-179.999, bounds.getWest());
  let east = Math.min(179.999, bounds.getEast());
  const south = Math.max(-85, bounds.getSouth());
  const north = Math.min(85, bounds.getNorth());
  if (west >= east) { west = -179.999; east = 179.999; }
  return [west, south, east, north];
}

const adapters = {
  async gibs() {
    const [id, src] = layerIds.gibs;
    remove('gibs');
    map.addSource(src, {
      type: 'raster',
      tiles: [`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${day(selectedDate)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],
      tileSize: 256,
      maxzoom: 9,
      attribution: 'NASA EOSDIS GIBS'
    });
    const before = map.getStyle().layers.find(layer => layer.type === 'symbol')?.id;
    map.addLayer({ id, type: 'raster', source: src, paint: { 'raster-opacity': .72, 'raster-fade-duration': 250 } }, before);
  },
  async railway() {
    const id = layerIds.railway[0];
    if (map.getLayer(id)) return;
    map.addSource(id, { type: 'raster', tiles: ['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'], tileSize: 256, minzoom: 2, maxzoom: 19, attribution: 'OpenRailwayMap · OpenStreetMap contributors' });
    map.addLayer({ id, type: 'raster', source: id, paint: { 'raster-opacity': .72 } });
  },
  async emsc() {
    const id = layerIds.emsc[0];
    const queryDate = new Date(selectedDate);
    const data = await runLatest('adapter:emsc', async signal => {
      const end = plusDays(queryDate, 1);
      const url = `https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${encodeURIComponent(day(queryDate) + 'T00:00:00')}&endtime=${encodeURIComponent(day(end) + 'T00:00:00')}&orderby=time-desc`;
      return json(url, { signal });
    });
    upsert(id, data?.type === 'FeatureCollection' ? data : { type: 'FeatureCollection', features: data?.features || [] }, {
      'circle-radius': ['interpolate', ['linear'], ['coalesce', ['get', 'mag'], ['get', 'magnitude'], 3.5], 3.5, 3, 5, 7, 7, 13],
      'circle-color': ['interpolate', ['linear'], ['coalesce', ['get', 'depth'], 10], 0, '#fff3b0', 70, '#ff9f68', 300, '#ff5e64'],
      'circle-opacity': .82,
      'circle-stroke-color': 'rgba(17,18,15,.8)',
      'circle-stroke-width': 1
    });
  },
  async volcanoes() {
    const id = layerIds.volcanoes[0];
    if (map.getSource(id)) return;
    const data = await runLatest('adapter:volcanoes', signal => json('https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW%3ASmithsonian_VOTW_Holocene_Volcanoes&outputFormat=application%2Fjson&maxFeatures=2000', { timeout: 24000, signal }));
    upsert(id, data, { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2.5, 6, 5, 10, 7], 'circle-color': '#ff756e', 'circle-opacity': .76, 'circle-stroke-color': 'rgba(255,255,255,.85)', 'circle-stroke-width': .7 });
  },
  async aurora() {
    const id = layerIds.aurora[0];
    const data = await runLatest('adapter:aurora', signal => json('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json', { timeout: 24000, signal }));
    const features = (data?.coordinates || []).filter(row => Number(row?.[2]) >= 8).map(row => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [+row[0], +row[1]] }, properties: { intensity: +row[2] } }));
    upsert(id, { type: 'FeatureCollection', features }, { 'circle-radius': ['interpolate', ['linear'], ['get', 'intensity'], 8, 1, 30, 2.6, 70, 5, 100, 7], 'circle-color': ['interpolate', ['linear'], ['get', 'intensity'], 8, '#6aa4ff', 35, '#73f7bd', 70, '#d7ff61', 100, '#fff5b1'], 'circle-opacity': ['interpolate', ['linear'], ['get', 'intensity'], 8, .12, 50, .45, 100, .78], 'circle-blur': .45 });
  },
  async inaturalist() {
    const id = layerIds.inaturalist[0];
    const bounds = bbox();
    const data = await runLatest('adapter:inaturalist', signal => {
      const [west, south, east, north] = bounds;
      return json(`https://api.inaturalist.org/v1/observations?geo=true&quality_grade=research&order=desc&order_by=created_at&per_page=200&swlat=${south}&swlng=${west}&nelat=${north}&nelng=${east}`, { signal });
    });
    const features = (data?.results || []).flatMap(record => {
      const coordinates = record?.geojson?.coordinates;
      if (!Array.isArray(coordinates)) return [];
      return [{ type: 'Feature', geometry: { type: 'Point', coordinates }, properties: { title: record.taxon?.preferred_common_name || record.taxon?.name || record.species_guess || 'iNaturalist observation', scientificName: record.taxon?.name || '', observed: record.observed_on_string || record.observed_on || '', uri: record.uri || `https://www.inaturalist.org/observations/${record.id}` } }];
    });
    upsert(id, { type: 'FeatureCollection', features }, { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 2, 8, 4.5, 13, 7], 'circle-color': '#d7ff61', 'circle-opacity': .78, 'circle-stroke-color': '#11120f', 'circle-stroke-width': 1 });
  },
  async gbif() {
    const id = layerIds.gbif[0];
    const bounds = bbox();
    const data = await runLatest('adapter:gbif', signal => {
      const [west, south, east, north] = bounds;
      const geom = `POLYGON((${west} ${south},${east} ${south},${east} ${north},${west} ${north},${west} ${south}))`;
      return json(`https://api.gbif.org/v1/occurrence/search?hasCoordinate=true&hasGeospatialIssue=false&occurrenceStatus=PRESENT&limit=200&geometry=${encodeURIComponent(geom)}`, { signal });
    });
    const features = (data?.results || []).flatMap(record => Number.isFinite(+record.decimalLongitude) && Number.isFinite(+record.decimalLatitude) ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [+record.decimalLongitude, +record.decimalLatitude] }, properties: { title: record.species || record.scientificName || 'GBIF occurrence', eventDate: record.eventDate || record.year || '', datasetTitle: record.datasetTitle || '', uncertainty: record.coordinateUncertaintyInMeters ?? '', url: `https://www.gbif.org/occurrence/${record.key}` } }] : []);
    upsert(id, { type: 'FeatureCollection', features }, { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 1.8, 8, 4, 13, 6], 'circle-color': '#72c9ff', 'circle-opacity': .62, 'circle-stroke-color': 'rgba(17,18,15,.75)', 'circle-stroke-width': .8 });
  },
  async usgsWater() {
    const id = layerIds.usgsWater[0];
    const bounds = bbox();
    const data = await runLatest('adapter:usgsWater', signal => {
      const [west, south, east, north] = bounds;
      return json(`https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&limit=250&bbox=${west},${south},${east},${north}`, { timeout: 24000, signal });
    });
    upsert(id, { type: 'FeatureCollection', features: data?.features || [] }, { 'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 1.8, 8, 4, 13, 6], 'circle-color': '#58b7ff', 'circle-opacity': .72, 'circle-stroke-color': 'rgba(255,255,255,.75)', 'circle-stroke-width': .6 });
  }
};

async function enable(source) {
  const canonical = byId.get(source.aliasOf || source.id) || source;
  if (!canonical.adapter || !map) { inspect(source); return; }
  active.add(canonical.id);
  renderSources($('#sourceSearch').value);
  updateActive();
  try {
    await adapters[canonical.adapter](canonical);
    if (active.has(canonical.id)) inspect(canonical);
  } catch (error) {
    if (isAbort(error)) return;
    console.error(error);
    active.delete(canonical.id);
    renderSources($('#sourceSearch').value);
    updateActive();
    inspect(canonical, {}, `Layer could not be loaded from the provider: ${error.message}`);
  }
}

function disable(source) {
  const canonical = byId.get(source.aliasOf || source.id) || source;
  active.delete(canonical.id);
  abortRequest(`adapter:${canonical.adapter}`);
  remove(canonical.adapter);
  renderSources($('#sourceSearch').value);
  updateActive();
}

function toggle(source) {
  if (source.status !== 'live' || !source.adapter || !map) { inspect(source); return; }
  const canonical = source.aliasOf || source.id;
  active.has(canonical) ? disable(source) : enable(source);
}

async function refreshViewport() {
  if (!map) return;
  const jobs = [];
  for (const id of active) {
    const source = byId.get(id);
    if (VIEWPORT_CURRENT_ADAPTERS.has(source?.adapter)) jobs.push(adapters[source.adapter](source).catch(error => { if (!isAbort(error)) console.warn(error); }));
  }
  await Promise.allSettled(jobs);
}

async function refreshTime() {
  updateTime();
  if (!map) return;
  const jobs = [];
  for (const id of active) {
    const source = byId.get(id);
    if (!HISTORICAL_ADAPTERS.has(source?.adapter)) continue;
    if (source.adapter === 'gibs') remove('gibs');
    jobs.push(adapters[source.adapter](source).catch(error => { if (!isAbort(error)) console.warn(error); }));
  }
  await Promise.allSettled(jobs);
}

function syncPanel(open) {
  $('#sourcePanel').classList.toggle('is-open', open);
  $('#sidebarToggle').setAttribute('aria-expanded', String(open));
}

function clampDate(date) {
  const today = todayUtc();
  return date > today ? today : date;
}

function bindUi() {
  $('#sourceCount').textContent = SOURCES.length;
  updateTime();
  renderSources();
  $('#sourceList').addEventListener('click', event => {
    const button = event.target.closest('[data-source]');
    if (button) toggle(byId.get(button.dataset.source));
  });
  $('#sourceSearch').addEventListener('input', event => renderSources(event.target.value));
  $('#sidebarToggle').addEventListener('click', () => syncPanel(!$('#sourcePanel').classList.contains('is-open')));
  $('#panelClose').addEventListener('click', () => syncPanel(false));
  $('#inspectorClose').addEventListener('click', () => $('#inspector').classList.remove('is-open'));
  $('#prevDay').addEventListener('click', async () => { selectedDate = plusDays(selectedDate, -1); await refreshTime(); });
  $('#nextDay').addEventListener('click', async () => { selectedDate = clampDate(plusDays(selectedDate, 1)); await refreshTime(); });
  $('#todayButton').addEventListener('click', async () => { selectedDate = todayUtc(); await refreshTime(); });
  $('#dateInput').addEventListener('change', async event => {
    const parsed = new Date(`${event.target.value}T00:00:00Z`);
    if (!Number.isNaN(parsed.getTime())) {
      selectedDate = clampDate(parsed);
      await refreshTime();
    }
  });
  syncPanel(innerWidth > 760);
}

function bindMapEvents() {
  map.on('mousemove', event => {
    $('#mapReadout').textContent = `LAT ${event.lngLat.lat.toFixed(3)} · LON ${event.lngLat.lng.toFixed(3)} · ZOOM ${map.getZoom().toFixed(2)}`;
    const layers = ['gg-emsc', 'gg-volcanoes', 'gg-aurora', 'gg-inat', 'gg-gbif', 'gg-usgs-water'].filter(id => map.getLayer(id));
    map.getCanvas().style.cursor = layers.length && map.queryRenderedFeatures(event.point, { layers }).length ? 'pointer' : '';
  });
  map.on('moveend', () => {
    clearTimeout(moveTimer);
    moveTimer = setTimeout(refreshViewport, 350);
  });
  map.on('click', event => {
    const clickable = ['gg-emsc', 'gg-volcanoes', 'gg-aurora', 'gg-inat', 'gg-gbif', 'gg-usgs-water'].filter(id => map.getLayer(id));
    if (!clickable.length) return;
    const feature = map.queryRenderedFeatures(event.point, { layers: clickable })[0];
    if (!feature) return;
    const properties = feature.properties || {};
    const id = feature.layer.id;
    if (id === 'gg-emsc') { const source = byId.get('emsc'); inspect(source, { title: `M ${number(properties.mag ?? properties.magnitude)} earthquake`, description: `${text(properties.flynn_region ?? properties.place ?? properties.region ?? 'Earthquake event')} · depth ${number(properties.depth)} km`, source: 'EMSC / SeismicPortal', time: properties.time || properties.datetime || `${day(selectedDate)} catalogue`, resolution: 'Preliminary event solution', url: source.url }); }
    if (id === 'gg-volcanoes') { const source = byId.get('smithsonian-gvp'); inspect(source, { title: properties.Volcano_Name || properties.volcano_name || properties.name || 'Holocene volcano', description: `${text(properties.Country || properties.country)} · ${text(properties.Primary_Volcano_Type || properties.primary_volcano_type)}`, source: 'Smithsonian Global Volcanism Program', time: 'Reference database record · independent of view date', resolution: 'Volcano location', url: source.url }); }
    if (id === 'gg-aurora') { const source = byId.get('noaa-swpc'); inspect(source, { title: `Auroral probability ${number(properties.intensity)}%`, description: 'NOAA SWPC OVATION modeled auroral intensity at this grid point.', source: 'NOAA SWPC OVATION', time: 'Provider latest forecast · independent of view date', resolution: 'Global OVATION grid', url: source.url }); }
    if (id === 'gg-inat') { const source = byId.get('inaturalist'); inspect(source, { title: properties.title || 'iNaturalist observation', description: properties.scientificName || source.summary, source: 'iNaturalist', time: properties.observed || 'Recent observation · independent of view date', resolution: 'Observation coordinate', url: properties.uri || source.url }); }
    if (id === 'gg-gbif') { const source = byId.get('gbif'); inspect(source, { title: properties.title || 'GBIF occurrence', description: properties.datasetTitle || source.summary, source: 'GBIF occurrence API', time: properties.eventDate || 'Occurrence record · independent of view date', resolution: properties.uncertainty ? `Coordinate uncertainty ${properties.uncertainty} m` : 'Occurrence coordinate', url: properties.url || source.url }); }
    if (id === 'gg-usgs-water') { const source = byId.get('usgs-water'); inspect(source, { title: properties.monitoring_location_name || properties.monitoring_location_id || properties.site_no || 'USGS water observation', description: `${text(properties.parameter_name || properties.parameter_code || 'Continuous water observation')} · ${text(properties.value ?? properties.result)}`, source: 'USGS Water Data', time: properties.time || properties.datetime || properties.observation_time || 'Latest continuous value · independent of view date', resolution: 'Monitoring station', url: source.url }); }
  });
}

async function initMap() {
  try {
    maplibregl = await loadMapLibre();
  } catch (error) {
    setFatal(error?.message || 'Map renderer failed to load.');
    return;
  }

  map = new maplibregl.Map({
    container: 'map',
    style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [8, 22],
    zoom: 1.35,
    minZoom: .5,
    maxZoom: 18,
    attributionControl: false
  });
  map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right');
  bindMapEvents();

  let loaded = false;
  const fallbackTimer = setTimeout(() => {
    if (loaded || !map) return;
    try {
      map.setStyle({
        version: 8,
        sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, attribution: '© OpenStreetMap contributors' } },
        layers: [{ id: 'osm-base', type: 'raster', source: 'osm' }]
      });
    } catch {}
  }, 8000);

  map.on('load', async () => {
    loaded = true;
    clearTimeout(fallbackTimer);
    await Promise.allSettled([enable(byId.get('nasa-worldview')), enable(byId.get('emsc'))]);
  });
}

bindUi();
initMap();

addEventListener('pagehide', () => {
  clearTimeout(moveTimer);
  for (const key of [...requestSlots.keys()]) abortRequest(key);
  map?.remove?.();
}, { once: true });
