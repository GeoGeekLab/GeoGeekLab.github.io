const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.186.0/+esm';
const CATALOG_URL = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON';
const LAND_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json';
const CACHE_NAME = 'geogeek-orbit-v2';
const CACHE_TS_KEY = 'geogeek.orbit.catalogFetchedAt';
const CACHE_MAX_AGE = 2 * 60 * 60 * 1000;
const EARTH_RADIUS_KM = 6371.0088;
const CLASS_COLOR = { LEO: 0xa8d7ca, MEO: 0xe1c66f, GEO: 0xdf754c, HIGH: 0xa8afd9 };

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch]));
const fmt = (value, digits = 1) => Number.isFinite(Number(value)) ? Number(value).toLocaleString(undefined, { maximumFractionDigits:digits, minimumFractionDigits:digits }) : '—';
const formatUtc = ms => Number.isFinite(Number(ms)) ? new Date(Number(ms)).toISOString().replace('T',' ').slice(0,19) + ' UTC' : '—';
const formatAge = ms => {
  if (!Number.isFinite(Number(ms))) return '—';
  const hours = Math.max(0, (Date.now() - Number(ms)) / 3600000);
  return hours < 1 ? `${Math.round(hours * 60)} min` : hours < 48 ? `${hours.toFixed(1)} h` : `${(hours / 24).toFixed(1)} d`;
};

function ensureStyle() {
  if (document.querySelector('link[data-orbit-lab-v2]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL('./orbital-lab.css?v=20261001b', import.meta.url).href;
  link.dataset.orbitLabV2 = '1';
  document.head.appendChild(link);
}

function updateDeclaredConditions() {
  const root = document.getElementById('instrumentConditions');
  if (!root) return;
  const rows = [
    ['CATALOG', 'CelesTrak active · OMM JSON'],
    ['MODEL', 'SGP4 / SDP4 · Web Worker'],
    ['TIME', 'UTC propagation · user-controlled'],
    ['RADIAL SCALE', 'Compressed / physical']
  ];
  root.innerHTML = rows.map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
}

async function readCachedCatalog() {
  if (!('caches' in window)) return null;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = await cache.match(CATALOG_URL);
    if (!response) return null;
    const records = await response.json();
    if (!Array.isArray(records) || !records.length) return null;
    const fetchedAt = Number(localStorage.getItem(CACHE_TS_KEY) || 0) || null;
    return { records, fetchedAt };
  } catch { return null; }
}

async function writeCatalogCache(records, fetchedAt) {
  try { localStorage.setItem(CACHE_TS_KEY, String(fetchedAt)); } catch {}
  if (!('caches' in window)) return;
  try {
    const cache = await caches.open(CACHE_NAME);
    const response = new Response(JSON.stringify(records), { headers:{ 'Content-Type':'application/json' } });
    await cache.put(CATALOG_URL, response);
  } catch {}
}

async function loadCatalog(signal) {
  const cached = await readCachedCatalog();
  const now = Date.now();
  if (cached?.fetchedAt && now - cached.fetchedAt < CACHE_MAX_AGE) {
    return { ...cached, mode:'cache-fresh' };
  }
  try {
    const response = await fetch(CATALOG_URL, { mode:'cors', credentials:'omit', cache:'no-store', signal, headers:{ Accept:'application/json' } });
    if (!response.ok) throw new Error(`CelesTrak HTTP ${response.status}`);
    const records = await response.json();
    if (!Array.isArray(records) || !records.length) throw new Error('Empty CelesTrak active catalog');
    const fetchedAt = Date.now();
    writeCatalogCache(records, fetchedAt);
    return { records, fetchedAt, mode:'live' };
  } catch (error) {
    if (signal?.aborted) throw error;
    if (cached) return { ...cached, mode:'cache-stale', error };
    throw error;
  }
}

function radialRadius(altKm, mode) {
  const altitude = Math.max(0, Number(altKm) || 0);
  if (mode === 'physical') return 1 + altitude / EARTH_RADIUS_KM;
  const capped = Math.min(50000, altitude);
  return 1 + 0.53 * (Math.log1p(capped / 180) / Math.log1p(42000 / 180));
}

function xyzFromRad(lon, lat, altKm, mode, out) {
  const r = radialRadius(altKm, mode);
  const cosLat = Math.cos(lat);
  out.set(r * cosLat * Math.cos(lon), r * Math.sin(lat), -r * cosLat * Math.sin(lon));
  return out;
}

function xyzFromDeg(THREE, lon, lat, radius = 1.004) {
  const lo = lon * Math.PI / 180, la = lat * Math.PI / 180, c = Math.cos(la);
  return new THREE.Vector3(radius * c * Math.cos(lo), radius * Math.sin(la), -radius * c * Math.sin(lo));
}

function makeLine(THREE, points, color, opacity = .5) {
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent:true, opacity, depthWrite:false });
  return new THREE.Line(geometry, material);
}

function makeGraticule(THREE) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color:0xb7c2ba, transparent:true, opacity:.11, depthWrite:false });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(xyzFromDeg(THREE, lon, lat));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(g, material));
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(xyzFromDeg(THREE, lon, lat));
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    group.add(new THREE.Line(g, material));
  }
  return group;
}

async function makeCoastlines(THREE, signal) {
  try {
    const response = await fetch(LAND_URL, { mode:'cors', signal, headers:{ Accept:'application/json' } });
    if (!response.ok) throw new Error(String(response.status));
    const geo = await response.json();
    const positions = [];
    const rings = [];
    const pushRing = ring => {
      if (!Array.isArray(ring) || ring.length < 2) return;
      rings.push(ring);
      for (let i = 1; i < ring.length; i++) {
        const a = xyzFromDeg(THREE, ring[i - 1][0], ring[i - 1][1], 1.006);
        const b = xyzFromDeg(THREE, ring[i][0], ring[i][1], 1.006);
        positions.push(a.x,a.y,a.z,b.x,b.y,b.z);
      }
    };
    for (const feature of geo.features || []) {
      const g = feature.geometry;
      if (!g) continue;
      if (g.type === 'Polygon') g.coordinates.forEach(pushRing);
      if (g.type === 'MultiPolygon') g.coordinates.forEach(poly => poly.forEach(pushRing));
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({ color:0xd8ddd8, transparent:true, opacity:.28, depthWrite:false });
    const lines = new THREE.LineSegments(geometry, material);
    lines.userData.rings = rings;
    return lines;
  } catch { return null; }
}

function shellMesh(THREE, radius, color, opacity) {
  return new THREE.Mesh(
    new THREE.SphereGeometry(radius, 32, 18),
    new THREE.MeshBasicMaterial({ color, wireframe:true, transparent:true, opacity, depthWrite:false })
  );
}

function setCameraFromState(camera, state) {
  const cp = Math.cos(state.camera.pitch), sp = Math.sin(state.camera.pitch);
  const cy = Math.cos(state.camera.yaw), sy = Math.sin(state.camera.yaw);
  const d = state.camera.distance;
  camera.position.set(d * cp * sy, d * sp, d * cp * cy);
  camera.lookAt(0,0,0);
}

function simulationNow(state) {
  if (!state.time.running) return state.time.baseMs;
  return state.time.baseMs + (performance.now() - state.time.perfBase) * state.time.rate;
}

function setSimulationTime(state, ms, { keepRunning = state.time.running } = {}) {
  state.time.baseMs = Number(ms);
  state.time.perfBase = performance.now();
  state.time.running = Boolean(keepRunning);
}

function setRate(state, rate) {
  const now = simulationNow(state);
  state.time.rate = Number(rate);
  setSimulationTime(state, now, { keepRunning:true });
}

function medianEpoch(meta) {
  const values = meta.map(item => Number(item.epochMs)).filter(Number.isFinite).sort((a,b) => a-b);
  return values.length ? values[Math.floor(values.length / 2)] : null;
}

function classText(meta, counts) {
  return ['LEO','MEO','GEO','HIGH'].map(key => `${key} ${(counts[key] || 0).toLocaleString()}`).join(' · ');
}

function renderLayout(container, sourceMode) {
  const sourceClass = sourceMode === 'live' ? '' : sourceMode === 'cache-fresh' ? ' is-cache' : ' is-stale';
  container.innerHTML = `
  <div class="orbit-layout orbit-v2">
    <section class="orbit-stage" id="orbitStageV2" aria-label="Interactive orbital field">
      <canvas class="orbit-canvas" id="orbitCanvasV2"></canvas>
      <div class="orbit-hud">
        <div class="orbit-hud-main"><i class="orbit-live-dot${sourceMode === 'live' ? '' : ' is-cache'}" id="orbitLiveDot"></i><strong id="orbitHudStatus">ORBITAL FIELD</strong></div>
        <span id="orbitHudReadout">INITIALIZING PROPAGATION…</span>
        <button type="button" id="orbitResetView">RESET VIEW</button>
      </div>
      <div class="orbit-object-label" id="orbitObjectLabel"><strong></strong><small></small></div>
      <div class="orbit-tooltip" id="orbitTooltip"></div>
      <div class="orbit-class-legend"><span class="leo"><i></i>LEO</span><span class="meo"><i></i>MEO</span><span class="geo"><i></i>GEO</span><span class="high"><i></i>HIGH</span></div>
      <div class="orbit-time-dock">
        <button type="button" id="orbitPlay">PAUSE</button>
        <div class="orbit-speed"><button type="button" id="orbitNow">NOW</button><button type="button" data-rate="1" class="is-active">1×</button><button type="button" data-rate="60">60×</button><button type="button" data-rate="600">600×</button></div>
        <input id="orbitTimeRange" type="range" min="-12" max="12" value="0" step="0.25" aria-label="Propagation time offset from now in hours">
        <div class="orbit-time-readout"><strong id="orbitTimeUtc">—</strong><small id="orbitTimeOffset">NOW</small></div>
      </div>
    </section>
    <aside class="orbit-panel">
      <section class="orbit-card">
        <div class="orbit-card-head"><div><span>ORBITAL CATALOG</span><strong>Find an object, then read its relations.</strong></div><em id="orbitCatalogCount">—</em></div>
        <div class="orbit-search-wrap"><input class="orbit-search" id="orbitSearch" type="search" placeholder="Name or NORAD catalog ID…" autocomplete="off" spellcheck="false"><div class="orbit-search-results" id="orbitSearchResults"></div></div>
        <div class="orbit-filter-row" id="orbitFilters"><button type="button" data-filter="ALL" class="is-active">ALL</button><button type="button" data-filter="LEO">LEO</button><button type="button" data-filter="MEO">MEO</button><button type="button" data-filter="GEO">GEO</button><button type="button" data-filter="HIGH">HIGH</button></div>
        <div class="orbit-filter-counts" id="orbitFilterCounts">—</div>
      </section>
      <section class="orbit-card">
        <div class="orbit-card-head"><div><span>FIELD VIEW</span><strong>Change representation, not the orbit.</strong></div><em id="orbitScaleBadge">COMPRESSED</em></div>
        <div class="orbit-scale-row"><button type="button" data-scale="compressed" class="is-active">COMPRESSED</button><button type="button" data-scale="physical">PHYSICAL</button></div>
        <div class="orbit-view-row"><button type="button" data-view="equator" class="is-active">EQUATOR</button><button type="button" data-view="polar">POLAR</button></div>
        <div class="orbit-toggle-grid"><button type="button" data-layer="graticule" class="is-active">GRATICULE</button><button type="button" data-layer="shells" class="is-active">ORBIT SHELLS</button><button type="button" data-layer="orbit" class="is-active">ORBIT TRACE</button><button type="button" data-layer="ground" class="is-active">GROUND TRACE</button></div>
      </section>
      <section class="orbit-card">
        <div class="orbit-card-head"><div><span>GROUND RELATION</span><strong id="orbitObserverTitle">Place an observer on Earth.</strong></div><em id="orbitHorizonState">NO STATION</em></div>
        <div class="orbit-ground-wrap" id="orbitGroundWrap"><canvas class="orbit-ground-map" id="orbitGroundMap"></canvas><span class="orbit-ground-hint">CLICK MAP TO SET OBSERVER</span></div>
        <div class="orbit-ground-stats"><div><span>AZIMUTH</span><strong id="orbitAzimuth">—</strong></div><div><span>ELEVATION</span><strong id="orbitElevation">—</strong></div><div><span>RANGE</span><strong id="orbitRange">—</strong></div></div>
        <div class="orbit-pass" id="orbitPass"><span>NEXT GEOMETRIC PASS</span><strong>Select an object and set an observer.</strong></div>
      </section>
      <section class="orbit-card orbit-inspector">
        <div class="orbit-card-head"><div><span>SELECTED OBJECT</span><strong id="orbitSelectedName">NONE</strong></div><em id="orbitSelectedClass">—</em></div>
        <p class="orbit-empty" id="orbitInspectorEmpty">Select a point or search the catalog. Position is propagated for the current simulation time.</p>
        <dl id="orbitInspectorDl" hidden>
          <div><dt>NORAD / ID</dt><dd id="orbitNorad">—</dd></div><div><dt>POSITION</dt><dd id="orbitPosition">—</dd></div><div><dt>ALTITUDE</dt><dd id="orbitAltitude">—</dd></div><div><dt>VELOCITY</dt><dd id="orbitVelocity">—</dd></div><div><dt>INCLINATION</dt><dd id="orbitInclination">—</dd></div><div><dt>PERIOD</dt><dd id="orbitPeriod">—</dd></div><div><dt>ECCENTRICITY</dt><dd id="orbitEccentricity">—</dd></div><div><dt>ELEMENT EPOCH</dt><dd id="orbitEpoch">—</dd></div>
        </dl>
        <div class="orbit-actions" id="orbitActions" hidden><button type="button" id="orbitFocus">FOCUS OBJECT</button><a id="orbitSourceObject" href="https://celestrak.org/" target="_blank" rel="noreferrer">SOURCE ELEMENT ↗</a></div>
      </section>
      <section class="orbit-card orbit-provenance">
        <div class="orbit-card-head"><div><span>OBSERVATION CONDITIONS</span><strong>What this field can and cannot mean.</strong></div><em>DECLARED</em></div>
        <div class="orbit-source-state${sourceClass}" id="orbitSourceState"><i></i><span id="orbitSourceText">${sourceMode === 'live' ? 'LIVE CATALOG' : sourceMode === 'cache-fresh' ? 'CACHED ≤ 2 H' : 'STALE CACHE'}</span></div>
        <dl><div><dt>SOURCE</dt><dd><a href="https://celestrak.org/NORAD/elements/" target="_blank" rel="noreferrer">CelesTrak active GP elements ↗</a></dd></div><div><dt>FORMAT</dt><dd>OMM JSON — avoids the legacy TLE catalog-number ceiling.</dd></div><div><dt>MODEL</dt><dd>SGP4 / SDP4 via satellite.js 6.0.2 in a Web Worker.</dd></div><div><dt>TIME</dt><dd id="orbitEpochAge">Element-set age —</dd></div><div><dt>SCALE</dt><dd id="orbitScaleLimit">Altitude is visually compressed; radial distance is not metric.</dd></div><div><dt>LIMIT</dt><dd>These are model-propagated positions from general perturbation elements, not precision ephemerides. Catalog activity and element quality vary by object.</dd></div></dl>
      </section>
    </aside>
  </div>`;
}

function drawGroundMap(canvas, state, coastRings) {
  const rect = canvas.getBoundingClientRect();
  if (!rect.width || !rect.height) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const width = Math.round(rect.width * dpr), height = Math.round(rect.height * dpr);
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr,0,0,dpr,0,0);
  const w = rect.width, h = rect.height;
  ctx.clearRect(0,0,w,h);
  ctx.fillStyle = '#070b09'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle = 'rgba(241,239,231,.075)'; ctx.lineWidth = 1;
  for (let lon=-150; lon<=180; lon+=30) { const x=(lon+180)/360*w; ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke(); }
  for (let lat=-60; lat<=60; lat+=30) { const y=(90-lat)/180*h;ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke(); }
  if (coastRings?.length) {
    ctx.strokeStyle='rgba(241,239,231,.28)';ctx.lineWidth=.75;
    for (const ring of coastRings) {
      ctx.beginPath(); let lastX=null;
      for (let i=0;i<ring.length;i++) {
        const x=(ring[i][0]+180)/360*w,y=(90-ring[i][1])/180*h;
        if (i===0 || (lastX!=null && Math.abs(x-lastX)>w*.5)) ctx.moveTo(x,y); else ctx.lineTo(x,y);
        lastX=x;
      }
      ctx.stroke();
    }
  }
  const frame = state.lastFrame;
  if (frame?.indices && frame?.values) {
    const count = frame.indices.length, stride = Math.max(1,Math.floor(count/1100));
    for (let i=0;i<count;i+=stride) {
      const index=frame.indices[i], meta=state.meta[index], o=i*4;
      if (!meta) continue;
      const lon=frame.values[o]*180/Math.PI,lat=frame.values[o+1]*180/Math.PI;
      const x=(lon+180)/360*w,y=(90-lat)/180*h;
      const color=meta.orbitClass==='LEO'?'rgba(168,215,202,.45)':meta.orbitClass==='MEO'?'rgba(225,198,111,.5)':meta.orbitClass==='GEO'?'rgba(223,117,76,.55)':'rgba(168,175,217,.45)';
      ctx.fillStyle=color;ctx.fillRect(x-1,y-1,2,2);
    }
  }
  if (state.layers.ground && state.trace?.values) {
    ctx.strokeStyle='rgba(241,239,231,.65)';ctx.lineWidth=1.25;ctx.beginPath();
    let lastX=null;
    for (let i=0;i<state.trace.values.length/3;i++) {
      const lon=state.trace.values[i*3]*180/Math.PI,lat=state.trace.values[i*3+1]*180/Math.PI,x=(lon+180)/360*w,y=(90-lat)/180*h;
      if (i===0 || (lastX!=null&&Math.abs(x-lastX)>w*.45)) ctx.moveTo(x,y); else ctx.lineTo(x,y);lastX=x;
    }ctx.stroke();
  }
  if (state.selectedState) {
    const x=(state.selectedState.lon+180)/360*w,y=(90-state.selectedState.lat)/180*h;
    ctx.strokeStyle='#d16339';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.stroke();
  }
  if (state.observer) {
    const x=(state.observer.lon+180)/360*w,y=(90-state.observer.lat)/180*h;
    ctx.strokeStyle='#f1efe7';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x+5,y);ctx.moveTo(x,y-5);ctx.lineTo(x,y+5);ctx.stroke();
  }
}

export async function mountOrbitalLab({ container, signal, statusCallback } = {}) {
  if (!container) throw new Error('Orbital Lab requires a container');
  ensureStyle(); updateDeclaredConditions();
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once:true });
  const innerSignal = controller.signal;
  container.innerHTML = '<div class="instrument-loading"><span>⌁</span><strong>Reading the active orbital field…</strong></div>';

  let THREE, catalog;
  try {
    [THREE, catalog] = await Promise.all([import(THREE_URL), loadCatalog(innerSignal)]);
  } catch (error) {
    if (innerSignal.aborted) return () => {};
    container.innerHTML = `<div class="instrument-error"><strong>Orbital field unavailable.</strong><p>${esc(error?.message || 'The renderer or active catalog could not be loaded.')}</p><a class="orbit-upstream" href="https://celestrak.org/NORAD/elements/" target="_blank" rel="noreferrer">OPEN CELESTRAK ↗</a></div>`;
    return () => {};
  }
  if (innerSignal.aborted) return () => {};
  renderLayout(container, catalog.mode);

  const stage = $('#orbitStageV2', container), canvas = $('#orbitCanvasV2', container), groundCanvas = $('#orbitGroundMap', container);
  const hudReadout = $('#orbitHudReadout', container), hudStatus = $('#orbitHudStatus', container), liveDot = $('#orbitLiveDot', container);
  const objectLabel = $('#orbitObjectLabel', container), tooltip = $('#orbitTooltip', container);
  const search = $('#orbitSearch', container), searchResults = $('#orbitSearchResults', container), catalogCount = $('#orbitCatalogCount', container), filterCounts = $('#orbitFilterCounts', container);
  const scaleBadge = $('#orbitScaleBadge', container), playButton = $('#orbitPlay', container), timeRange = $('#orbitTimeRange', container), timeUtc = $('#orbitTimeUtc', container), timeOffset = $('#orbitTimeOffset', container);
  const observerTitle = $('#orbitObserverTitle', container), horizonState = $('#orbitHorizonState', container), azimuthEl = $('#orbitAzimuth', container), elevationEl = $('#orbitElevation', container), rangeEl = $('#orbitRange', container), passEl = $('#orbitPass', container);
  const selectedName = $('#orbitSelectedName', container), selectedClass = $('#orbitSelectedClass', container), inspectorEmpty = $('#orbitInspectorEmpty', container), inspectorDl = $('#orbitInspectorDl', container), actions = $('#orbitActions', container);
  const noradEl = $('#orbitNorad', container), positionEl = $('#orbitPosition', container), altitudeEl = $('#orbitAltitude', container), velocityEl = $('#orbitVelocity', container), inclinationEl = $('#orbitInclination', container), periodEl = $('#orbitPeriod', container), eccentricityEl = $('#orbitEccentricity', container), epochEl = $('#orbitEpoch', container), sourceObject = $('#orbitSourceObject', container), epochAge = $('#orbitEpochAge', container), scaleLimit = $('#orbitScaleLimit', container), sourceText = $('#orbitSourceText', container);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias:true, alpha:true, powerPreference:'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1)); renderer.setClearColor(0x050806, 0);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, .02, 80);
  const state = {
    meta:[], counts:{}, filter:'ALL', query:'', selectedId:null, selectedState:null, observer:null, pass:null,
    radial:'compressed', layers:{ graticule:true, shells:true, orbit:true, ground:true },
    camera:{ yaw:.52, pitch:.22, distance:3.35 },
    time:{ baseMs:Date.now(), perfBase:performance.now(), running:true, rate:1 },
    tickPending:false, lastTickReal:0, lastTraceReal:0, hoverIndex:null, pointerMoved:false,
    lastFrame:null, trace:null, coastRings:null, selectedWorld:new THREE.Vector3(), selectedWorldVisible:false,
  };
  setCameraFromState(camera, state);

  scene.add(new THREE.AmbientLight(0x819087, 1.15));
  const keyLight = new THREE.DirectionalLight(0xf1e8d8, 1.55); keyLight.position.set(3,2,4); scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0x789c8b, .7); rimLight.position.set(-4,-1,-2); scene.add(rimLight);
  const earth = new THREE.Mesh(new THREE.SphereGeometry(1,64,36), new THREE.MeshPhongMaterial({ color:0x14231b, emissive:0x07100b, specular:0x405047, shininess:7 })); scene.add(earth);
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(1.025,48,24), new THREE.MeshBasicMaterial({ color:0x7fa594, transparent:true, opacity:.045, side:THREE.BackSide, depthWrite:false })); scene.add(atmosphere);
  const graticule = makeGraticule(THREE); scene.add(graticule);
  const shellGroup = new THREE.Group(); scene.add(shellGroup);
  const coastGroup = new THREE.Group(); scene.add(coastGroup);
  const traceGroup = new THREE.Group(); scene.add(traceGroup);

  const pointGeometry = new THREE.BufferGeometry();
  const pointMaterial = new THREE.PointsMaterial({ size:.027, vertexColors:true, transparent:true, opacity:.92, sizeAttenuation:true, depthWrite:false });
  const points = new THREE.Points(pointGeometry, pointMaterial); scene.add(points);

  function rebuildShells() {
    shellGroup.clear();
    const values = [[600, CLASS_COLOR.LEO, .045], [20200, CLASS_COLOR.MEO, .035], [35786, CLASS_COLOR.GEO, .05]];
    for (const [alt,color,opacity] of values) shellGroup.add(shellMesh(THREE, radialRadius(alt,state.radial),color,opacity));
    shellGroup.visible = state.layers.shells;
  }
  rebuildShells();

  makeCoastlines(THREE, innerSignal).then(lines => {
    if (!lines || innerSignal.aborted) return;
    coastGroup.add(lines); state.coastRings = lines.userData.rings || []; drawGroundMap(groundCanvas,state,state.coastRings);
  });

  const worker = new Worker(new URL('./orbit-worker.js?v=20261001b', import.meta.url), { type:'module' });
  worker.postMessage({ type:'init', records:catalog.records });
  catalog.records = null;
  const maxPoints = (navigator.deviceMemory && navigator.deviceMemory <= 4) || matchMedia('(max-width:680px)').matches ? 9000 : 20000;

  function renderCounts() {
    catalogCount.textContent = `${(state.counts.ALL || 0).toLocaleString()} OBJECTS`;
    filterCounts.textContent = classText(state.meta,state.counts);
    $$('[data-filter]',container).forEach(button => { const key=button.dataset.filter; button.title = `${key}: ${(state.counts[key] || state.counts.ALL || 0).toLocaleString()}`; });
  }

  function updateSourceFacts() {
    const median = medianEpoch(state.meta);
    epochAge.textContent = `Median element epoch age ${formatAge(median)} · catalog fetched ${formatAge(catalog.fetchedAt)} ago.`;
    if (catalog.mode === 'cache-stale') { sourceText.textContent = `STALE CACHE · ${formatAge(catalog.fetchedAt)} OLD`; liveDot.className = 'orbit-live-dot is-error'; }
    else if (catalog.mode === 'cache-fresh') { sourceText.textContent = `LOCAL CACHE · ${formatAge(catalog.fetchedAt)} OLD`; liveDot.className = 'orbit-live-dot is-cache'; }
  }

  function requestPositions(force=false) {
    if (state.tickPending || !state.meta.length) return;
    const nowReal = performance.now(), cadence = state.time.rate >= 60 ? 360 : 850;
    if (!force && nowReal - state.lastTickReal < cadence) return;
    state.tickPending=true; state.lastTickReal=nowReal;
    worker.postMessage({ type:'positions', timeMs:simulationNow(state), filter:state.filter, query:state.query, maxPoints, selectedId:state.selectedId, observer:state.observer });
  }

  function requestTrace(force=false) {
    if (!state.selectedId) return;
    const now=performance.now(); if(!force && now-state.lastTraceReal<2500)return;
    state.lastTraceReal=now; worker.postMessage({ type:'trace', id:state.selectedId, timeMs:simulationNow(state), samples:190 });
  }

  function requestPass() {
    state.pass=null;
    if (!state.selectedId || !state.observer) { renderPass(); return; }
    passEl.innerHTML='<span>NEXT GEOMETRIC PASS</span><strong>Computing 24 h horizon…</strong>';
    worker.postMessage({ type:'pass', id:state.selectedId, timeMs:simulationNow(state), observer:state.observer, hours:24 });
  }

  function updatePointCloud(message) {
    state.lastFrame={ indices:message.indices, values:message.values, totalVisible:message.totalVisible };
    state.selectedState=message.selectedState;
    const count=message.indices.length, pos=new Float32Array(count*3), colors=new Float32Array(count*3), v=new THREE.Vector3(), c=new THREE.Color();
    state.selectedWorldVisible=false;
    for(let i=0;i<count;i++){
      const o=i*4,index=message.indices[i],meta=state.meta[index]; if(!meta)continue;
      xyzFromRad(message.values[o],message.values[o+1],message.values[o+2],state.radial,v);
      pos[i*3]=v.x;pos[i*3+1]=v.y;pos[i*3+2]=v.z;
      c.setHex(CLASS_COLOR[meta.orbitClass]||0xd0d6d1);colors[i*3]=c.r;colors[i*3+1]=c.g;colors[i*3+2]=c.b;
      if(state.selectedId===meta.id){state.selectedWorld.copy(v);state.selectedWorldVisible=true;}
    }
    pointGeometry.setAttribute('position',new THREE.BufferAttribute(pos,3)); pointGeometry.setAttribute('color',new THREE.BufferAttribute(colors,3)); pointGeometry.computeBoundingSphere(); pointGeometry.userData.indices=message.indices;
    hudReadout.textContent=`DRAWN ${count.toLocaleString()} / MATCHED ${Number(message.totalVisible||0).toLocaleString()} · ${state.filter} · ${state.radial.toUpperCase()} RADIAL`;
    if(state.selectedId)updateInspectorDynamic();
    drawGroundMap(groundCanvas,state,state.coastRings); requestTrace();
  }

  function clearTraceObjects() { while(traceGroup.children.length){const obj=traceGroup.children.pop();obj.geometry?.dispose?.();obj.material?.dispose?.();} }
  function updateTrace(message) {
    state.trace=message; clearTraceObjects(); if(!state.selectedId||message.id!==state.selectedId)return;
    const orbitPts=[],groundPts=[],v=new THREE.Vector3();
    for(let i=0;i<message.values.length/3;i++){
      const o=i*3,lon=message.values[o],lat=message.values[o+1],alt=message.values[o+2];
      orbitPts.push(xyzFromRad(lon,lat,alt,state.radial,v.clone()));
      const c=Math.cos(lat),r=1.009;groundPts.push(new THREE.Vector3(r*c*Math.cos(lon),r*Math.sin(lat),-r*c*Math.sin(lon)));
    }
    const orbitLine=makeLine(THREE,orbitPts,0xd16339,.82);orbitLine.userData.kind='orbit';traceGroup.add(orbitLine);
    const groundLine=makeLine(THREE,groundPts,0xdfe4df,.42);groundLine.userData.kind='ground';traceGroup.add(groundLine);
    applyTraceVisibility(); drawGroundMap(groundCanvas,state,state.coastRings);
  }
  function applyTraceVisibility(){for(const child of traceGroup.children)child.visible=child.userData.kind==='orbit'?state.layers.orbit:state.layers.ground;}

  function selectByIndex(index) {
    const meta=state.meta[index]; if(!meta)return;
    state.selectedId=meta.id; state.query=''; state.filter='ALL'; search.value='';searchResults.classList.remove('is-open');$$('[data-filter]',container).forEach(b=>b.classList.toggle('is-active',b.dataset.filter==='ALL'));
    selectedName.textContent=meta.name; selectedClass.textContent=meta.orbitClass; inspectorEmpty.hidden=true;inspectorDl.hidden=false;actions.hidden=false;
    noradEl.textContent=`${meta.id}${meta.objectId?` · ${meta.objectId}`:''}`;inclinationEl.textContent=`${fmt(meta.inclination,2)}°`;periodEl.textContent=meta.periodMin?`${fmt(meta.periodMin,1)} min`:'—';eccentricityEl.textContent=Number.isFinite(meta.eccentricity)?Number(meta.eccentricity).toFixed(6):'—';epochEl.textContent=meta.epochMs?`${formatUtc(meta.epochMs)} · ${formatAge(meta.epochMs)} old`:'—';
    sourceObject.href=`https://celestrak.org/NORAD/elements/gp.php?CATNR=${encodeURIComponent(meta.id)}&FORMAT=JSON-PRETTY`;
    requestPositions(true);requestTrace(true);requestPass();
  }

  function clearSelection(){state.selectedId=null;state.selectedState=null;state.trace=null;state.selectedWorldVisible=false;clearTraceObjects();selectedName.textContent='NONE';selectedClass.textContent='—';inspectorEmpty.hidden=false;inspectorDl.hidden=true;actions.hidden=true;renderObserverRelation();renderPass();drawGroundMap(groundCanvas,state,state.coastRings);}

  function updateInspectorDynamic(){const p=state.selectedState;if(!p)return;positionEl.textContent=`${Math.abs(p.lat).toFixed(2)}° ${p.lat>=0?'N':'S'} · ${Math.abs(p.lon).toFixed(2)}° ${p.lon>=0?'E':'W'}`;altitudeEl.textContent=`${fmt(p.altitude,1)} km`;velocityEl.textContent=`${fmt(p.velocity,3)} km/s`;renderObserverRelation();}

  function renderObserverRelation(){
    const look=state.selectedState?.look;
    if(!state.observer){observerTitle.textContent='Place an observer on Earth.';horizonState.textContent='NO STATION';azimuthEl.textContent=elevationEl.textContent=rangeEl.textContent='—';return;}
    observerTitle.textContent=`${Math.abs(state.observer.lat).toFixed(2)}° ${state.observer.lat>=0?'N':'S'} · ${Math.abs(state.observer.lon).toFixed(2)}° ${state.observer.lon>=0?'E':'W'}`;
    if(!look){horizonState.textContent=state.selectedId?'CALCULATING':'SELECT OBJECT';azimuthEl.textContent=elevationEl.textContent=rangeEl.textContent='—';return;}
    azimuthEl.textContent=`${fmt(((look.azimuth % 360) + 360) % 360,1)}°`;
    elevationEl.textContent=`${fmt(look.elevation,1)}°`;rangeEl.textContent=`${fmt(look.range,0)} km`;horizonState.textContent=look.elevation>0?'ABOVE HORIZON':'BELOW HORIZON';
  }

  function renderPass(){
    if(!state.selectedId||!state.observer){passEl.innerHTML='<span>NEXT GEOMETRIC PASS</span><strong>Select an object and set an observer.</strong>';return;}
    if(!state.pass){passEl.innerHTML='<span>NEXT GEOMETRIC PASS</span><strong>No pass found in the next 24 h, or calculation pending.</strong>';return;}
    const r=state.pass;passEl.innerHTML=`<span>NEXT GEOMETRIC PASS · 0° HORIZON</span><strong>AOS ${esc(formatUtc(r.aos).slice(11,19))} · MAX ${esc(fmt(r.peak?.elevation,1))}° · LOS ${r.los?esc(formatUtc(r.los).slice(11,19)):'>24H'} UTC</strong>`;
  }

  function renderSearchResults(){const q=search.value.trim().toLowerCase();if(!q){searchResults.classList.remove('is-open');searchResults.innerHTML='';return;}const matches=[];for(let i=0;i<state.meta.length&&matches.length<9;i++){const m=state.meta[i];if(m.name.toLowerCase().includes(q)||m.id.includes(q)||m.objectId.toLowerCase().includes(q))matches.push([i,m]);}searchResults.innerHTML=matches.map(([i,m])=>`<button type="button" data-search-index="${i}"><b>${esc(m.name)}</b><small>${esc(m.orbitClass)} · ${esc(m.id)}</small></button>`).join('')||'<div class="orbit-empty">No matching object.</div>';searchResults.classList.add('is-open');}

  function applyRadialMode(mode){if(!['compressed','physical'].includes(mode))return;state.radial=mode;scaleBadge.textContent=mode.toUpperCase();scaleLimit.textContent=mode==='physical'?'Radial distance uses Earth-radius + propagated altitude; high orbits make Earth appear small.':'Altitude is visually compressed to keep LEO, MEO and GEO legible together; radial distance is not metric.';$$('[data-scale]',container).forEach(b=>b.classList.toggle('is-active',b.dataset.scale===mode));state.camera.distance=mode==='physical'?18:3.35;rebuildShells();setCameraFromState(camera,state);if(state.trace)updateTrace(state.trace);if(state.lastFrame)updatePointCloud({...state.lastFrame,selectedState:state.selectedState});}

  function setView(view){$$('[data-view]',container).forEach(b=>b.classList.toggle('is-active',b.dataset.view===view));if(view==='polar'){state.camera.yaw=.25;state.camera.pitch=1.36;}else{state.camera.yaw=.52;state.camera.pitch=.22;}setCameraFromState(camera,state);}

  function setFilter(filter){state.filter=filter;state.query='';search.value='';$$('[data-filter]',container).forEach(b=>b.classList.toggle('is-active',b.dataset.filter===filter));requestPositions(true);}

  function updateTimeUi(){const ms=simulationNow(state),offset=(ms-Date.now())/3600000;timeUtc.textContent=new Date(ms).toISOString().slice(11,19)+' UTC';timeOffset.textContent=Math.abs(offset)<.03?'NOW':`${offset>=0?'+':''}${offset.toFixed(1)} H`;if(document.activeElement!==timeRange)timeRange.value=String(clamp(offset,-12,12));playButton.textContent=state.time.running?'PAUSE':'PLAY';}

  function updateSelectedLabel(){if(!state.selectedId||!state.selectedWorldVisible){objectLabel.classList.remove('is-visible');return;}const p=state.selectedWorld.clone().project(camera);if(p.z>1||p.z<-1){objectLabel.classList.remove('is-visible');return;}const rect=stage.getBoundingClientRect(),x=(p.x*.5+.5)*rect.width,y=(-p.y*.5+.5)*rect.height;if(x<0||x>rect.width||y<0||y>rect.height){objectLabel.classList.remove('is-visible');return;}const meta=state.meta.find(m=>m.id===state.selectedId);objectLabel.style.left=`${x}px`;objectLabel.style.top=`${y}px`;objectLabel.classList.add('is-visible');$('strong',objectLabel).textContent=meta?.name||state.selectedId;$('small',objectLabel).textContent=state.selectedState?`${fmt(state.selectedState.altitude,0)} KM · ${meta?.orbitClass||''}`:(meta?.orbitClass||'');}

  worker.onmessage = event => {
    const m=event.data||{};
    if(m.type==='ready'){
      state.meta=m.meta||[];state.counts=m.counts||{};renderCounts();updateSourceFacts();hudStatus.textContent=`${state.counts.ALL.toLocaleString()} ACTIVE OBJECTS`;statusCallback?.({live:true,count:state.counts.ALL});requestPositions(true);return;
    }
    if(m.type==='positions'){state.tickPending=false;updatePointCloud(m);return;}
    if(m.type==='trace'){updateTrace(m);return;}
    if(m.type==='pass'&&m.id===state.selectedId){state.pass=m.result;renderPass();}
  };
  worker.onerror = error => {console.warn('[GeoGeek] Orbital propagation worker error',error);state.tickPending=false;hudReadout.textContent='PROPAGATION WORKER ERROR';liveDot.className='orbit-live-dot is-error';};

  const resize = () => {const r=stage.getBoundingClientRect();if(!r.width||!r.height)return;renderer.setSize(r.width,r.height,false);camera.aspect=r.width/r.height;camera.updateProjectionMatrix();drawGroundMap(groundCanvas,state,state.coastRings);};
  const observer = new ResizeObserver(resize);observer.observe(stage);resize();

  let raf=0;
  function animate(){if(innerSignal.aborted)return;raf=requestAnimationFrame(animate);updateTimeUi();requestPositions();if(state.time.rate>1)requestTrace();updateSelectedLabel();renderer.render(scene,camera);}
  animate();

  search.addEventListener('input',()=>{renderSearchResults();state.query=search.value.trim();if(!state.query){requestPositions(true);return;}requestPositions(true);});
  searchResults.addEventListener('click',e=>{const b=e.target.closest('[data-search-index]');if(b)selectByIndex(Number(b.dataset.searchIndex));});
  container.addEventListener('click',e=>{
    const filter=e.target.closest('[data-filter]');if(filter){setFilter(filter.dataset.filter);return;}
    const scale=e.target.closest('[data-scale]');if(scale){applyRadialMode(scale.dataset.scale);return;}
    const view=e.target.closest('[data-view]');if(view){setView(view.dataset.view);return;}
    const layer=e.target.closest('[data-layer]');if(layer){const key=layer.dataset.layer;state.layers[key]=!state.layers[key];layer.classList.toggle('is-active',state.layers[key]);if(key==='graticule')graticule.visible=state.layers[key];if(key==='shells')shellGroup.visible=state.layers[key];applyTraceVisibility();drawGroundMap(groundCanvas,state,state.coastRings);}
  });
  $('#orbitResetView',container).addEventListener('click',()=>setView('equator'));
  $('#orbitFocus',container).addEventListener('click',()=>{if(!state.selectedWorldVisible)return;const n=state.selectedWorld.clone().normalize();state.camera.yaw=Math.atan2(n.x,n.z);state.camera.pitch=Math.asin(clamp(n.y,-1,1));state.camera.distance=state.radial==='physical'?Math.max(2.2,state.selectedWorld.length()+1.7):2.6;setCameraFromState(camera,state);});
  playButton.addEventListener('click',()=>{const now=simulationNow(state);state.time.running=!state.time.running;setSimulationTime(state,now,{keepRunning:state.time.running});});
  $('#orbitNow',container).addEventListener('click',()=>{state.time.rate=1;setSimulationTime(state,Date.now(),{keepRunning:true});timeRange.value='0';$$('[data-rate]',container).forEach(b=>b.classList.toggle('is-active',b.dataset.rate==='1'));requestPositions(true);requestTrace(true);requestPass();});
  $$('[data-rate]',container).forEach(button=>button.addEventListener('click',()=>{setRate(state,Number(button.dataset.rate));$$('[data-rate]',container).forEach(b=>b.classList.toggle('is-active',b===button));requestPositions(true);requestPass();}));
  timeRange.addEventListener('input',()=>{setSimulationTime(state,Date.now()+Number(timeRange.value)*3600000,{keepRunning:false});requestPositions(true);requestTrace(true);requestPass();});
  timeRange.addEventListener('dblclick',()=>{setSimulationTime(state,Date.now(),{keepRunning:true});timeRange.value='0';requestPositions(true);requestTrace(true);requestPass();});

  // Pick the nearest rendered point in CSS pixels. Raycaster Points.threshold
  // uses world units and becomes inaccurate when zooming a dense orbital field.
  const pickPosition = new THREE.Vector3();
  const pickProjected = new THREE.Vector3();
  const pickDirection = new THREE.Vector3();
  const pickOcclusion = new THREE.Vector3();
  const pickRay = new THREE.Ray();
  const earthOccluder = new THREE.Sphere(new THREE.Vector3(), 1.025);
  function pickPointAt(clientX, clientY, radiusPx = 8) {
    const rect = canvas.getBoundingClientRect();
    const attribute = pointGeometry.getAttribute('position');
    const indices = pointGeometry.userData.indices;
    if (!rect.width || !rect.height || !attribute || !indices) return null;
    const x = clientX - rect.left, y = clientY - rect.top;
    if (x < 0 || x > rect.width || y < 0 || y > rect.height) return null;

    camera.updateMatrixWorld();
    let best = null, bestDistanceSq = radiusPx * radiusPx;
    for (let i = 0; i < attribute.count; i++) {
      pickPosition.fromBufferAttribute(attribute, i);
      pickProjected.copy(pickPosition).project(camera);
      if (pickProjected.z < -1 || pickProjected.z > 1) continue;
      const px = (pickProjected.x * .5 + .5) * rect.width;
      const py = (-pickProjected.y * .5 + .5) * rect.height;
      const distanceSq = (px - x) ** 2 + (py - y) ** 2;
      if (distanceSq >= bestDistanceSq) continue;

      // Do not select satellites hidden behind the solid Earth.
      pickDirection.subVectors(pickPosition, camera.position).normalize();
      pickRay.set(camera.position, pickDirection);
      const earthHit = pickRay.intersectSphere(earthOccluder, pickOcclusion);
      if (earthHit && earthHit.distanceToSquared(camera.position) + 1e-4 <
          pickPosition.distanceToSquared(camera.position)) continue;

      const index = indices[i];
      if (index == null || !state.meta[index]) continue;
      best = index;
      bestDistanceSq = distanceSq;
    }
    return best;
  }

  let dragPointer = null;
  let hoverFrame = 0;
  const clearHover = () => {
    state.hoverIndex = null;
    tooltip.classList.remove('is-visible');
  };
  canvas.addEventListener('pointerdown', e => {
    if (e.button !== 0 || dragPointer) return;
    if (hoverFrame) { cancelAnimationFrame(hoverFrame); hoverFrame = 0; }
    dragPointer = { id:e.pointerId, x:e.clientX, y:e.clientY, lastX:e.clientX, lastY:e.clientY, moved:false };
    state.pointerMoved = false;
    canvas.setPointerCapture?.(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (dragPointer) {
      if (e.pointerId !== dragPointer.id) return;
      const dx = e.clientX - dragPointer.lastX, dy = e.clientY - dragPointer.lastY;
      dragPointer.lastX = e.clientX;
      dragPointer.lastY = e.clientY;
      if (Math.hypot(e.clientX - dragPointer.x, e.clientY - dragPointer.y) > 4) {
        dragPointer.moved = true;
        state.pointerMoved = true;
      }
      if (dragPointer.moved) {
        state.camera.yaw -= dx * .006;
        state.camera.pitch = clamp(state.camera.pitch + dy * .0055, -1.48, 1.48);
        setCameraFromState(camera, state);
        stage.classList.add('is-dragging');
      }
      clearHover();
      return;
    }
    if (hoverFrame) cancelAnimationFrame(hoverFrame);
    const clientX = e.clientX, clientY = e.clientY;
    hoverFrame = requestAnimationFrame(() => {
      hoverFrame = 0;
      if (dragPointer) return;
      const index = pickPointAt(clientX, clientY, 10);
      state.hoverIndex = index;
      if (index == null) { tooltip.classList.remove('is-visible'); return; }
      const meta = state.meta[index];
      const rect = canvas.getBoundingClientRect();
      tooltip.innerHTML = `<strong>${esc(meta.name)}</strong><small>${esc(meta.orbitClass)} · NORAD ${esc(meta.id)}</small>`;
      tooltip.style.left = `${clamp(clientX - rect.left + 12, 8, Math.max(8,rect.width - 220))}px`;
      tooltip.style.top = `${clamp(clientY - rect.top + 12, 46, Math.max(46,rect.height - 70))}px`;
      tooltip.classList.add('is-visible');
    });
  });
  const finishPointer = (e, cancelled = false) => {
    if (!dragPointer || e.pointerId !== dragPointer.id) return;
    const moved = dragPointer.moved ||
      Math.hypot(e.clientX - dragPointer.x, e.clientY - dragPointer.y) > 4;
    const index = !cancelled && !moved
      ? pickPointAt(e.clientX, e.clientY, e.pointerType === 'touch' ? 14 : 8)
      : null;
    dragPointer = null;
    stage.classList.remove('is-dragging');
    if (canvas.hasPointerCapture?.(e.pointerId)) canvas.releasePointerCapture(e.pointerId);
    clearHover();
    if (index != null) selectByIndex(index);
  };
  canvas.addEventListener('pointerup', e => finishPointer(e));
  canvas.addEventListener('pointercancel', e => finishPointer(e, true));
  canvas.addEventListener('pointerleave', () => { if (!dragPointer) clearHover(); });
  canvas.addEventListener('wheel',e=>{e.preventDefault();const min=1.65,max=state.radial==='physical'?34:8;state.camera.distance=clamp(state.camera.distance*Math.exp(e.deltaY*.0012),min,max);setCameraFromState(camera,state);},{passive:false});
  canvas.addEventListener('dblclick',e=>{e.preventDefault();clearSelection();});
  groundCanvas.addEventListener('click',e=>{const r=groundCanvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width,y=(e.clientY-r.top)/r.height;state.observer={lon:x*360-180,lat:90-y*180,height:0};renderObserverRelation();drawGroundMap(groundCanvas,state,state.coastRings);requestPositions(true);requestPass();});

  graticule.visible=true;renderPass();drawGroundMap(groundCanvas,state,state.coastRings);
  return () => {
    if (hoverFrame) cancelAnimationFrame(hoverFrame);
    controller.abort();signal?.removeEventListener?.('abort',abort);cancelAnimationFrame(raf);observer.disconnect();worker.terminate();
    scene.traverse(object=>{object.geometry?.dispose?.();if(Array.isArray(object.material))object.material.forEach(m=>m?.dispose?.());else object.material?.dispose?.();});renderer.dispose();container.innerHTML='';
  };
}
