export const DAY_MS = 86400000;
export const MIN_ZOOM = 1;
export const MAX_ZOOM = 8;

export const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
export const cleanNumber = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback;
export const pad = value => String(value).padStart(2, '0');
export const day = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;
export const utcDate = value => new Date(`${value}T00:00:00Z`);
export const addDays = (date, amount) => new Date(date.getTime() + amount * DAY_MS);
export const daysBetween = (later, earlier) => Math.max(0, Math.round((later - earlier) / DAY_MS));
export const clampDate = (date, min, max) => date < min ? min : date > max ? max : date;
export const esc = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[char]));
export const opacityFor = layer => layer.defaultOpacity ?? 1;

export function safeDate(layer) {
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return addDays(today, -layer.conservativeLagDays);
}

export function getInitialState(layers, byId) {
  const url = new URL(location.href);
  const layer = byId.get(url.searchParams.get('earthLayer')) || layers[0];
  const recent = safeDate(layer);
  const requested = url.searchParams.get('earthDate');
  const parsed = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? utcDate(requested) : recent;
  const min = utcDate(layer.availabilityStart);
  return {
    layerId:layer.id,
    date:clampDate(parsed, min, recent),
    compare:url.searchParams.get('earthCompare') === '1',
    compareOffset:clamp(cleanNumber(url.searchParams.get('earthOffset'), 7), 1, 365),
    split:clamp(cleanNumber(url.searchParams.get('earthSplit'), 50), 12, 88),
    playing:false,
    speed:1300,
    showGrid:true,
    overlayOpacity:opacityFor(layer),
    probe:null,
    zoom:clamp(cleanNumber(url.searchParams.get('earthZ'), MIN_ZOOM), MIN_ZOOM, MAX_ZOOM),
    centerLon:cleanNumber(url.searchParams.get('earthLon'), 0),
    centerLat:cleanNumber(url.searchParams.get('earthLat'), 0)
  };
}

export function dateBounds(layer) {
  return { min:utcDate(layer.availabilityStart), max:safeDate(layer) };
}

export function compareDate(state, layer) {
  const { min } = dateBounds(layer);
  const requested = addDays(state.date, -state.compareOffset);
  return requested < min ? min : requested;
}

export function cameraSpans(zoom) {
  const factor = 2 ** (clamp(zoom, MIN_ZOOM, MAX_ZOOM) - MIN_ZOOM);
  return { lonSpan:360 / factor, latSpan:180 / factor };
}

export function normalizeCamera(state) {
  state.zoom = clamp(cleanNumber(state.zoom, MIN_ZOOM), MIN_ZOOM, MAX_ZOOM);
  const { lonSpan, latSpan } = cameraSpans(state.zoom);
  state.centerLon = clamp(cleanNumber(state.centerLon, 0), -180 + lonSpan / 2, 180 - lonSpan / 2);
  state.centerLat = clamp(cleanNumber(state.centerLat, 0), -90 + latSpan / 2, 90 - latSpan / 2);
  if (state.zoom <= MIN_ZOOM + 0.0001) {
    state.centerLon = 0;
    state.centerLat = 0;
  }
  return state;
}

export function viewportBounds(state) {
  normalizeCamera(state);
  const { lonSpan, latSpan } = cameraSpans(state.zoom);
  return {
    west:state.centerLon - lonSpan / 2,
    south:state.centerLat - latSpan / 2,
    east:state.centerLon + lonSpan / 2,
    north:state.centerLat + latSpan / 2,
    lonSpan,
    latSpan
  };
}

export const bboxArray = bounds => [bounds.west, bounds.south, bounds.east, bounds.north];
export const bboxLabel = bounds => bboxArray(bounds).map(value => value.toFixed(3)).join(', ');

export function screenToGeo(state, x, y, rect, bounds = viewportBounds(state)) {
  const xRatio = rect.width ? clamp(x / rect.width, 0, 1) : .5;
  const yRatio = rect.height ? clamp(y / rect.height, 0, 1) : .5;
  return {
    lon:bounds.west + xRatio * bounds.lonSpan,
    lat:bounds.north - yRatio * bounds.latSpan,
    xRatio,
    yRatio
  };
}

export function requestDimensions(frame) {
  const cssWidth = frame.clientWidth || Math.min(window.innerWidth || 1200, 1200);
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  const width = Math.round(clamp(cssWidth * dpr, 720, 1600));
  return { width, height:Math.round(width / 2) };
}

export function wmsUrl(endpoint, layerName, dateValue, { format='image/png', transparent=true, width=1600, height=800, bbox=[-180,-90,180,90] } = {}) {
  const params = new URLSearchParams({
    service:'WMS', version:'1.1.1', request:'GetMap', layers:layerName, styles:'',
    format, transparent:String(transparent), srs:'EPSG:4326',
    bbox:bbox.map(value => Number(value).toFixed(6)).join(','),
    width:String(width), height:String(height), time:day(dateValue)
  });
  return `${endpoint}?${params.toString()}`;
}
