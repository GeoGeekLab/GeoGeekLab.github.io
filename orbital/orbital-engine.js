/* Portions derived from Satlas. Copyright (c) 2026 Premaansh Vyas.
   MIT License: ../THIRD_PARTY_LICENSES/SATLAS-MIT.txt */

import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';

const R_EARTH_KM = 6371;
const NATURAL_EARTH = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json';
const CELESTRAK = [
  'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON'
];

const TYPE_COLORS = {
  earth: new THREE.Color('#f1efe7'),
  weather: new THREE.Color('#aebbb1'),
  navigation: new THREE.Color('#c9b86b'),
  science: new THREE.Color('#d4ddd6'),
  other: new THREE.Color('#78877e')
};
const SELECTED_COLOR = new THREE.Color('#d16339');
const HOVER_COLOR = new THREE.Color('#f2b889');
const DUMMY = new THREE.Object3D();

function classify(record) {
  const name = String(record.OBJECT_NAME || '').toUpperCase();
  if (/SENTINEL|LANDSAT|TERRA\b|AQUA\b|EARTHCARE|ICESAT|GRACE|SWOT|SMAP|SMOS|RADARSAT|COSMO|PLEIADES|WORLDVIEW|CARTOSAT|RESOURCESAT|GAOFEN|ZY-|CBERS|KOMPSAT/.test(name)) return 'earth';
  if (/NOAA|METOP|SUOMI|JPSS|FENGYUN|HIMAWARI|METEOSAT|WEATHER|METEOR-M|DMSP/.test(name)) return 'weather';
  if (/GPS|GALILEO|GLONASS|BEIDOU|NAVSTAR|QZSS|IRNSS/.test(name)) return 'navigation';
  if (/HUBBLE|JWST|XMM|CHANDRA|TESS|FERMI|NUSTAR|CHEOPS|GAIA|ASTROSAT|IXPE/.test(name)) return 'science';
  return 'other';
}

function formatCoordFromXYZ(x, y, z) {
  const r = Math.hypot(x, y, z) || 1;
  const lat = Math.asin(y / r) * 180 / Math.PI;
  const lon = Math.atan2(-z, x) * 180 / Math.PI;
  return {
    lat,
    lon,
    altKm: Math.max(0, (r - 1) * R_EARTH_KM),
    text: `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`
  };
}

function worldPoint(latDeg, lonDeg, radius = 1.002) {
  const lat = latDeg * Math.PI / 180;
  const lon = lonDeg * Math.PI / 180;
  const cosLat = Math.cos(lat);
  return new THREE.Vector3(
    radius * cosLat * Math.cos(lon),
    radius * Math.sin(lat),
    -radius * cosLat * Math.sin(lon)
  );
}

function makeGraticule() {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({ color: 0x87958b, transparent: true, opacity: 0.16 });
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(worldPoint(lat, lon, 1.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
  }
  for (let lon = -150; lon <= 180; lon += 30) {
    const pts = [];
    for (let lat = -88; lat <= 88; lat += 3) pts.push(worldPoint(lat, lon, 1.006));
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), material));
  }
  return group;
}

function addNaturalEarthBorders(group, signal) {
  fetch(NATURAL_EARTH, { mode: 'cors', signal })
    .then(response => response.ok ? response.json() : Promise.reject(new Error('Natural Earth')))
    .then(world => {
      if (signal?.aborted) return;
      const vertices = [];
      const pushRing = ring => {
        for (let i = 1; i < ring.length; i += 1) {
          const a = worldPoint(Number(ring[i - 1][1]), Number(ring[i - 1][0]), 1.008);
          const b = worldPoint(Number(ring[i][1]), Number(ring[i][0]), 1.008);
          vertices.push(a.x, a.y, a.z, b.x, b.y, b.z);
        }
      };
      (world.features || []).forEach(feature => {
        const geometry = feature.geometry || {};
        if (geometry.type === 'Polygon') geometry.coordinates.forEach(pushRing);
        if (geometry.type === 'MultiPolygon') geometry.coordinates.forEach(poly => poly.forEach(pushRing));
      });
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
      const material = new THREE.LineBasicMaterial({ color: 0xc8d0ca, transparent: true, opacity: 0.22 });
      const lines = new THREE.LineSegments(geometry, material);
      lines.name = 'natural-earth-borders';
      group.add(lines);
    })
    .catch(() => {});
}

async function fetchCatalog(signal) {
  let source = null;
  for (const endpoint of CELESTRAK) {
    try {
      const response = await fetch(endpoint, { mode: 'cors', signal });
      if (!response.ok) continue;
      const json = await response.json();
      if (Array.isArray(json) && json.length) { source = json; break; }
    } catch (error) {
      if (signal?.aborted) throw error;
    }
  }
  if (!source) throw new Error('Catalog unavailable');

  const seen = new Set();
  return source.filter(item => {
    const key = String(item.NORAD_CAT_ID || item.OBJECT_NAME || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(item => ({ ...item, __kind: classify(item) }));
}

function makeDemoRecords(count) {
  return Array.from({ length: count }, (_, i) => ({
    OBJECT_NAME: `DEMO FIELD ${String(i + 1).padStart(3, '0')}`,
    NORAD_CAT_ID: `D${i + 1}`,
    __kind: i % 8 === 0 ? 'earth' : i % 11 === 0 ? 'weather' : 'other',
    __demo: true,
    __phase: (i / count) * Math.PI * 2,
    __inclination: ((i * 37) % 98) * Math.PI / 180,
    __radius: 1.07 + ((i * 29) % 19) / 300
  }));
}

function demoPositions(records, time) {
  const buffer = new Float32Array(records.length * 3);
  const t = time * 0.000035;
  records.forEach((record, i) => {
    const angle = record.__phase + t * (0.75 + (i % 7) * .04);
    const r = record.__radius;
    const inc = record.__inclination;
    const x0 = Math.cos(angle) * r;
    const z0 = Math.sin(angle) * r;
    buffer[i * 3] = x0;
    buffer[i * 3 + 1] = Math.sin(angle * .93) * Math.sin(inc) * r;
    buffer[i * 3 + 2] = z0 * Math.cos(inc);
  });
  return buffer;
}

function makeLine(buffer, color, opacity, renderOrder = 4) {
  if (!buffer || buffer.length < 6) return null;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(buffer, 3));
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const line = new THREE.Line(geometry, material);
  line.renderOrder = renderOrder;
  return line;
}

export class GeoOrbitalField {
  constructor(options) {
    this.options = options;
    this.container = options.container;
    this.canvas = options.canvas || document.createElement('canvas');
    this.mode = options.mode || 'threshold';
    this.locale = options.locale === 'zh' ? 'zh' : 'en';
    this.signal = options.signal;
    this.onStatus = options.onStatus || (() => {});
    this.onHover = options.onHover || (() => {});
    this.onSelect = options.onSelect || (() => {});
    this.onDatum = options.onDatum || (() => {});
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.mobile = matchMedia('(max-width: 760px)').matches;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.worldGroup = null;
    this.earth = null;
    this.mesh = null;
    this.records = [];
    this.positions = null;
    this.worker = null;
    this.tickTimer = null;
    this.raf = null;
    this.active = false;
    this.selectedIndex = -1;
    this.hoverIndex = -1;
    this.orbitLine = null;
    this.groundLine = null;
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(99, 99);
    this.rotationTarget = null;
    this.dragging = false;
    this.dragStart = null;
    this.dragRotationStart = null;
    this.lastHoverAt = 0;
    this.demo = false;
    this.abort = new AbortController();
    if (this.signal) this.signal.addEventListener('abort', () => this.destroy(), { once: true });
  }

  async init() {
    this.initScene();
    this.bindInteraction();
    this.installDemoField();
    this.resize();
    addNaturalEarthBorders(this.worldGroup, this.abort.signal);
    fetchCatalog(this.abort.signal)
      .then(records => {
        if (!this.abort.signal.aborted) this.installLiveField(records);
      })
      .catch(() => {
        if (!this.abort.signal.aborted) {
          this.demo = true;
          this.onStatus({ live: false, count: this.records.length, source: 'DEMO' });
        }
      });
    return this;
  }

  initScene() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(36, 1, 0.05, 30);
    this.camera.position.set(0, 0.18, this.mode === 'threshold' ? 3.25 : 3.0);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, this.mobile ? 1.0 : 1.5));
    this.renderer.setClearColor(0x000000, 0);

    this.worldGroup = new THREE.Group();
    this.worldGroup.rotation.x = -0.10;
    this.worldGroup.rotation.y = -0.42;
    this.scene.add(this.worldGroup);

    const earthGeometry = new THREE.SphereGeometry(1, 72, 48);
    const earthMaterial = new THREE.MeshPhongMaterial({ color: 0x17231d, emissive: 0x050806, shininess: 8, specular: 0x29372e });
    this.earth = new THREE.Mesh(earthGeometry, earthMaterial);
    this.earth.name = 'earth';
    this.worldGroup.add(this.earth);
    this.worldGroup.add(makeGraticule());

    const atmosphere = new THREE.Mesh(
      new THREE.SphereGeometry(1.035, 56, 36),
      new THREE.MeshBasicMaterial({ color: 0xbecac0, transparent: true, opacity: 0.065, side: THREE.BackSide })
    );
    this.worldGroup.add(atmosphere);

    const ambient = new THREE.AmbientLight(0xc8d5cc, 0.58);
    const key = new THREE.DirectionalLight(0xf4f0df, 1.35);
    key.position.set(3, 2, 4);
    const rim = new THREE.DirectionalLight(0x8da99a, 0.5);
    rim.position.set(-4, -1, -2);
    this.scene.add(ambient, key, rim);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = this.mobile ? 250 : 650;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i += 1) {
      const phi = Math.acos(2 * ((i * 0.61803398875) % 1) - 1);
      const theta = i * 2.3999632297;
      const r = 8 + (i % 9) * .22;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0xc9d1cb, size: 0.012, transparent: true, opacity: 0.34, depthWrite: false }));
    this.scene.add(stars);
  }

  installDemoField() {
    const count = this.mobile ? 180 : 320;
    this.demo = true;
    this.records = makeDemoRecords(count);
    this.positions = demoPositions(this.records, performance.now());
    this.replaceMesh(count);
    this.updateMesh(this.positions);
    this.onStatus({ live: false, count, source: 'DEMO' });
  }

  installLiveField(records) {
    this.demo = false;
    this.records = records;
    this.positions = new Float32Array(records.length * 3);
    this.replaceMesh(records.length);

    if (this.worker) this.worker.terminate();
    this.worker = new Worker(new URL('./propagation.worker.js', import.meta.url));
    this.worker.onmessage = event => {
      const msg = event.data || {};
      if (msg.type === 'ready') {
        this.onStatus({ live: true, count: msg.count, source: 'CELESTRAK' });
        this.requestTick();
      } else if (msg.type === 'positions') {
        this.positions = msg.buffer;
        this.updateMesh(this.positions);
      } else if (msg.type === 'trace' && msg.index === this.selectedIndex) {
        this.setTrace(msg.orbit, msg.ground);
      }
    };
    this.worker.postMessage({ type: 'init', records: records.map(({ __kind, ...record }) => record) });
    this.startTicking();
  }

  replaceMesh(count) {
    if (this.mesh) {
      this.worldGroup.remove(this.mesh);
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    const pointSize = this.mode === 'threshold' ? (this.mobile ? 0.0063 : 0.0076) : (this.mobile ? 0.0058 : 0.0068);
    const geometry = new THREE.IcosahedronGeometry(pointSize, 0);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.86, depthWrite: false });
    this.mesh = new THREE.InstancedMesh(geometry, material, count);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    for (let i = 0; i < count; i += 1) this.mesh.setColorAt(i, TYPE_COLORS[this.records[i]?.__kind] || TYPE_COLORS.other);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.mesh.renderOrder = 5;
    this.worldGroup.add(this.mesh);
  }

  projectDisplayPosition(x, y, z) {
    const r = Math.hypot(x, y, z);
    if (!Number.isFinite(r) || r < 0.2) return null;
    if (this.mode !== 'threshold') return [x, y, z];
    const altitudeRatio = Math.max(0, r - 1);
    const t = Math.log1p(Math.min(18, altitudeRatio) * 2) / Math.log1p(36);
    const displayRadius = 1.045 + 0.72 * t;
    const scale = displayRadius / r;
    return [x * scale, y * scale, z * scale];
  }

  compressTrace(buffer) {
    if (this.mode !== 'threshold' || !buffer?.length) return buffer;
    const out = new Float32Array(buffer.length);
    for (let i = 0; i < buffer.length; i += 3) {
      const p = this.projectDisplayPosition(buffer[i], buffer[i + 1], buffer[i + 2]);
      if (!p) continue;
      out[i] = p[0]; out[i + 1] = p[1]; out[i + 2] = p[2];
    }
    return out;
  }

  updateMesh(buffer) {
    if (!this.mesh || !buffer) return;
    const count = Math.min(this.mesh.count, Math.floor(buffer.length / 3));
    for (let i = 0; i < count; i += 1) {
      const p = this.projectDisplayPosition(buffer[i * 3], buffer[i * 3 + 1], buffer[i * 3 + 2]);
      const hidden = !p;
      DUMMY.position.set(hidden ? 0 : p[0], hidden ? 0 : p[1], hidden ? 0 : p[2]);
      const kind = this.records[i]?.__kind;
      const scale = hidden ? 0 : (kind === 'earth' ? 1.18 : kind === 'weather' ? 1.08 : 0.92);
      DUMMY.scale.setScalar(scale);
      DUMMY.updateMatrix();
      this.mesh.setMatrixAt(i, DUMMY.matrix);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  requestTick() {
    if (this.worker && !this.demo) this.worker.postMessage({ type: 'tick', timestamp: Date.now() });
  }

  startTicking() {
    clearInterval(this.tickTimer);
    if (!this.active || this.demo || !this.worker) return;
    this.requestTick();
    const cadence = this.reduced ? 2600 : (this.mobile ? 1500 : 1000);
    this.tickTimer = setInterval(() => this.requestTick(), cadence);
  }

  setActive(active) {
    this.active = !!active;
    if (this.active) {
      this.startTicking();
      if (!this.raf) this.animate();
    } else {
      clearInterval(this.tickTimer);
      this.tickTimer = null;
      if (this.raf) cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  setTrace(orbit, ground) {
    if (this.orbitLine) {
      this.worldGroup.remove(this.orbitLine);
      this.orbitLine.geometry.dispose();
      this.orbitLine.material.dispose();
    }
    if (this.groundLine) {
      this.worldGroup.remove(this.groundLine);
      this.groundLine.geometry.dispose();
      this.groundLine.material.dispose();
    }
    this.orbitLine = makeLine(this.compressTrace(orbit), 0xd16339, 0.92, 9);
    this.groundLine = makeLine(ground, 0xe8e2d6, 0.48, 8);
    if (this.orbitLine) this.worldGroup.add(this.orbitLine);
    if (this.groundLine) this.worldGroup.add(this.groundLine);
  }

  select(index) {
    if (!Number.isInteger(index) || index < 0 || index >= this.records.length || !this.positions) return;
    this.selectedIndex = index;
    for (let i = 0; i < this.mesh.count; i += 1) {
      const color = i === index ? SELECTED_COLOR : TYPE_COLORS[this.records[i]?.__kind] || TYPE_COLORS.other;
      this.mesh.setColorAt(i, color);
    }
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;

    const offset = index * 3;
    const x = this.positions[offset];
    const y = this.positions[offset + 1];
    const z = this.positions[offset + 2];
    const geo = formatCoordFromXYZ(x, y, z);
    const record = this.records[index];
    this.onSelect({ index, record, ...geo });

    if (!this.demo && this.worker) {
      this.worker.postMessage({ type: 'trace', index, timestamp: Date.now(), beforeMinutes: 35, afterMinutes: 85, stepMinutes: 2 });
    } else {
      const orbit = [];
      const ground = [];
      for (let s = 0; s <= 120; s += 2) {
        const t = (s - 35) / 120 * Math.PI * 2 + record.__phase;
        const r = record.__radius;
        const inc = record.__inclination;
        const px = Math.cos(t) * r;
        const py = Math.sin(t * .93) * Math.sin(inc) * r;
        const pz = Math.sin(t) * r * Math.cos(inc);
        const len = Math.hypot(px, py, pz) || 1;
        orbit.push(px, py, pz);
        ground.push(px / len * 1.004, py / len * 1.004, pz / len * 1.004);
      }
      this.setTrace(new Float32Array(orbit), new Float32Array(ground));
    }

    this.rotationTarget = Math.atan2(-x, z);
    const radius = Math.hypot(x, y, z);
    if (this.mode === 'lab' && Number.isFinite(radius)) {
      const distance = THREE.MathUtils.clamp(radius * 1.42, 2.35, 7.5);
      this.camera.position.setLength(distance);
    }
  }

  bindInteraction() {
    const canvas = this.canvas;
    const updatePointer = event => {
      const rect = canvas.getBoundingClientRect();
      this.pointer.x = ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
      this.pointer.y = -((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 + 1;
    };

    canvas.addEventListener('pointermove', event => {
      updatePointer(event);
      if (this.dragging && this.dragStart) {
        const dx = (event.clientX - this.dragStart.x) / Math.max(1, canvas.clientWidth);
        const dy = (event.clientY - this.dragStart.y) / Math.max(1, canvas.clientHeight);
        this.worldGroup.rotation.y = this.dragRotationStart.y + dx * Math.PI * 2;
        this.worldGroup.rotation.x = THREE.MathUtils.clamp(this.dragRotationStart.x + dy * Math.PI, -0.75, 0.75);
        this.rotationTarget = null;
      }
      if (this.mobile) return;
      const now = performance.now();
      if (now - this.lastHoverAt < 80) return;
      this.lastHoverAt = now;
      this.pick(false);
    });
    canvas.addEventListener('pointerdown', event => {
      canvas.setPointerCapture?.(event.pointerId);
      this.dragging = true;
      this.dragStart = { x: event.clientX, y: event.clientY };
      this.dragRotationStart = { x: this.worldGroup.rotation.x, y: this.worldGroup.rotation.y };
    });
    canvas.addEventListener('pointerup', event => {
      const moved = this.dragStart ? Math.hypot(event.clientX - this.dragStart.x, event.clientY - this.dragStart.y) : 0;
      this.dragging = false;
      this.dragStart = null;
      if (moved < 9) {
        if (this.mobile) { updatePointer(event); this.pick(true); }
        else if (this.hoverIndex >= 0) this.select(this.hoverIndex);
      }
    });
    canvas.addEventListener('pointerleave', () => {
      this.dragging = false;
      this.hoverIndex = -1;
      this.onHover(null);
    });
    canvas.addEventListener('wheel', event => {
      event.preventDefault();
      const z = this.camera.position.length();
      const next = THREE.MathUtils.clamp(z + event.deltaY * 0.0025, 2.1, this.mode === 'threshold' ? 4.2 : 7.5);
      this.camera.position.setLength(next);
    }, { passive: false });
    window.addEventListener('resize', () => this.resize(), { signal: this.abort.signal });
  }

  pick(selectOnHit = false) {
    if (!this.camera || !this.mesh) return;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const satHits = this.raycaster.intersectObject(this.mesh, false);
    if (satHits.length && Number.isInteger(satHits[0].instanceId)) {
      const index = satHits[0].instanceId;
      if (index !== this.hoverIndex) {
        if (this.hoverIndex >= 0 && this.hoverIndex !== this.selectedIndex) this.mesh.setColorAt(this.hoverIndex, TYPE_COLORS[this.records[this.hoverIndex]?.__kind] || TYPE_COLORS.other);
        this.hoverIndex = index;
        if (index !== this.selectedIndex) this.mesh.setColorAt(index, HOVER_COLOR);
        if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
      }
      const o = index * 3;
      const geo = formatCoordFromXYZ(this.positions?.[o] || 0, this.positions?.[o + 1] || 0, this.positions?.[o + 2] || 0);
      if (selectOnHit) this.select(index);
      else this.onHover({ index, record: this.records[index], ...geo });
      return index;
    }
    if (this.hoverIndex >= 0 && this.hoverIndex !== this.selectedIndex) {
      this.mesh.setColorAt(this.hoverIndex, TYPE_COLORS[this.records[this.hoverIndex]?.__kind] || TYPE_COLORS.other);
      if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    }
    this.hoverIndex = -1;
    if (!this.mobile) this.onHover(null);

    const earthHits = this.raycaster.intersectObject(this.earth, false);
    if (earthHits.length) {
      const local = this.worldGroup.worldToLocal(earthHits[0].point.clone()).normalize();
      const lat = Math.asin(local.y) * 180 / Math.PI;
      const lon = Math.atan2(-local.z, local.x) * 180 / Math.PI;
      this.onDatum({ lat, lon, text: `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'} · ${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}` });
    }
  }

  resize() {
    if (!this.renderer || !this.camera) return;
    const rect = this.container.getBoundingClientRect();
    const width = Math.max(1, Math.floor(rect.width));
    const height = Math.max(1, Math.floor(rect.height));
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  animate = () => {
    if (!this.active) { this.raf = null; return; }
    if (this.demo && this.records.length) {
      this.positions = demoPositions(this.records, performance.now());
      this.updateMesh(this.positions);
    }
    if (!this.dragging && !this.reduced && this.rotationTarget == null) this.worldGroup.rotation.y += this.mode === 'threshold' ? 0.00085 : 0.00055;
    if (this.rotationTarget != null) {
      const current = this.worldGroup.rotation.y;
      const delta = Math.atan2(Math.sin(this.rotationTarget - current), Math.cos(this.rotationTarget - current));
      this.worldGroup.rotation.y += delta * 0.06;
      if (Math.abs(delta) < 0.008) this.rotationTarget = null;
    }
    this.renderer.render(this.scene, this.camera);
    this.raf = requestAnimationFrame(this.animate);
  };

  destroy() {
    if (this.abort.signal.aborted) return;
    this.abort.abort();
    clearInterval(this.tickTimer);
    if (this.raf) cancelAnimationFrame(this.raf);
    this.worker?.terminate();
    this.worker = null;
    if (this.mesh) {
      this.mesh.geometry.dispose();
      this.mesh.material.dispose();
    }
    this.orbitLine?.geometry.dispose();
    this.orbitLine?.material.dispose();
    this.groundLine?.geometry.dispose();
    this.groundLine?.material.dispose();
    this.renderer?.dispose();
    this.container = null;
  }
}

export async function mountOrbitalLab({ container, locale = 'en', signal, labels = {} }) {
  const isZh = locale === 'zh';
  container.innerHTML = `
    <div class="orbital-lab">
      <div class="orbital-lab-stage" id="orbitalLabStage">
        <canvas class="orbital-lab-canvas" id="orbitalLabCanvas" aria-label="${isZh ? '实时轨道场' : 'Live orbital field'}"></canvas>
        <div class="orbital-lab-status" id="orbitalLabStatus">${isZh ? '正在读取星目…' : 'READING CATALOG…'}</div>
        <div class="orbital-lab-hover" id="orbitalLabHover" hidden></div>
      </div>
      <aside class="orbital-lab-panel">
        <div class="orbit-panel-label">${isZh ? '所观之星' : 'SELECTED OBJECT'}</div>
        <strong id="orbitalLabName">${isZh ? '择一星而观' : 'Select an object'}</strong>
        <dl>
          <div><dt>${isZh ? '所在' : 'POSITION'}</dt><dd id="orbitalLabPosition">—</dd></div>
          <div><dt>${isZh ? '离地' : 'ALTITUDE'}</dt><dd id="orbitalLabAltitude">—</dd></div>
          <div><dt>${isZh ? '类别' : 'FIELD'}</dt><dd id="orbitalLabType">—</dd></div>
        </dl>
        <div class="orbital-trace-legend"><span><i class="trace-orbit"></i>${isZh ? '天之迹' : 'TRACE IN ORBIT'}</span><span><i class="trace-ground"></i>${isZh ? '地之迹' : 'TRACE ON EARTH'}</span></div>
        <p>${isZh ? '择一星，查看当前位置、天之迹与地之迹。' : 'Select an object to inspect its current position, orbit trace, and ground trace.'}</p>
      </aside>
    </div>`;

  const stage = container.querySelector('#orbitalLabStage');
  const canvas = container.querySelector('#orbitalLabCanvas');
  const status = container.querySelector('#orbitalLabStatus');
  const hover = container.querySelector('#orbitalLabHover');
  const name = container.querySelector('#orbitalLabName');
  const pos = container.querySelector('#orbitalLabPosition');
  const alt = container.querySelector('#orbitalLabAltitude');
  const type = container.querySelector('#orbitalLabType');

  const engine = new GeoOrbitalField({
    container: stage,
    canvas,
    mode: 'lab',
    locale,
    signal,
    onStatus: state => { status.textContent = state.live ? `${state.count.toLocaleString()} ${isZh ? '星目 · 活动星目' : 'SATELLITES · ACTIVE CATALOG'}` : `${state.count} · DEMO FIELD`; },
    onHover: info => {
      if (!info) { hover.hidden = true; return; }
      hover.hidden = false;
      hover.textContent = `${info.record.OBJECT_NAME || '—'} · ${Math.round(info.altKm)} km`;
    },
    onSelect: info => {
      name.textContent = info.record.OBJECT_NAME || '—';
      pos.textContent = info.text;
      alt.textContent = `${Math.round(info.altKm)} km`;
      type.textContent = String(info.record.__kind || 'other').toUpperCase();
    }
  });
  await engine.init();
  engine.setActive(true);
  return () => engine.destroy();
}
