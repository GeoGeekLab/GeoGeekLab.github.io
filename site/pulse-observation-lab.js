(() => {
  'use strict';

  const VERSION = '20261002a';
  const QUAKE_ID = 'usgs-earthquakes-day';
  const LAND_ID = 'natural-earth-land-110m';
  const NS = 'http://www.w3.org/2000/svg';
  const $ = (selector, root = document) => root.querySelector(selector);
  const supply = window.GeoDataSupply;
  const quakeDataset = supply?.get?.(QUAKE_ID);
  const landDataset = supply?.get?.(LAND_ID);

  if (!supply?.installed || !quakeDataset || !landDataset) {
    console.error('[GeoGeek] Pulse requires the unified USGS snapshot and Natural Earth reference contracts.');
    return;
  }

  function ensureStyle() {
    if (document.querySelector('link[data-pulse-observation-lab]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `pulse-observation-lab.css?v=${VERSION}`;
    link.dataset.pulseObservationLab = '1';
    document.head.appendChild(link);
  }

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;
  const utc = value => {
    const ms = typeof value === 'number' ? value : Date.parse(String(value || ''));
    if (!Number.isFinite(ms)) return '—';
    return new Intl.DateTimeFormat('en-CA', {
      timeZone:'UTC', year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hourCycle:'h23'
    }).format(new Date(ms)).replace(',', '') + ' UTC';
  };
  const shortUtc = value => {
    const ms = typeof value === 'number' ? value : Date.parse(String(value || ''));
    if (!Number.isFinite(ms)) return '—';
    return new Intl.DateTimeFormat('en-GB', {
      timeZone:'UTC', hour:'2-digit', minute:'2-digit', hourCycle:'h23'
    }).format(new Date(ms)) + ' UTC';
  };
  const valueOrDash = (value, suffix = '') => value == null || value === '' || !Number.isFinite(Number(value)) ? '—' : `${Number(value).toLocaleString('en-US')}${suffix}`;

  function setConditions() {
    const root = window.GEOGEEK_DATA?.en;
    const item = root?.lab?.find(entry => entry.instrument === 'pulse');
    if (item) {
      item.status = 'Instrument';
      item.tags = ['Seismicity', '24 h snapshot', 'USGS'];
      item.source = 'USGS Earthquake Hazards Program · GeoGeek validated snapshot';
      item.description = 'A rolling 24-hour earthquake field that keeps event time, solution revision, feed generation, and GeoGeek delivery time distinct.';
    }
    const lab = root?.ui?.lab;
    if (lab?.conditions) lab.conditions.pulse = [
      ['SOURCE', 'USGS Earthquake Hazards Program'],
      ['DELIVERY', 'GeoGeek same-origin snapshot'],
      ['TIME', 'Rolling past 24 h · event origin time'],
      ['LIMIT', 'Solutions revise · completeness varies']
    ];
  }

  function depthClass(depth) {
    if (!Number.isFinite(depth)) return 'unknown';
    if (depth < 70) return 'shallow';
    if (depth < 300) return 'intermediate';
    return 'deep';
  }

  function markerRadius(magnitude) {
    if (!Number.isFinite(magnitude)) return 3.2;
    const clamped = Math.max(-1, Math.min(8.5, magnitude));
    const visualArea = 14 + (clamped + 1) * 16;
    return Math.max(2.8, Math.sqrt(visualArea / Math.PI) * 1.35);
  }

  function project(lon, lat) {
    return [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 500];
  }

  function ringPath(ring) {
    let d = '';
    let previousLon = null;
    for (const coordinate of ring || []) {
      const lon = finite(coordinate?.[0]);
      const lat = finite(coordinate?.[1]);
      if (lon == null || lat == null) continue;
      const [x, y] = project(lon, lat);
      const discontinuity = previousLon != null && Math.abs(lon - previousLon) > 180;
      d += `${!d || discontinuity ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
      previousLon = lon;
    }
    return d.trim();
  }

  function geometryPath(geometry) {
    if (!geometry) return '';
    const polygons = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.type === 'MultiPolygon' ? geometry.coordinates : [];
    return polygons.map(polygon => polygon.map(ring => ringPath(ring)).filter(Boolean).join(' ')).filter(Boolean).join(' ');
  }

  function median(values) {
    const valid = values.filter(Number.isFinite).sort((a, b) => a - b);
    if (!valid.length) return null;
    const mid = Math.floor(valid.length / 2);
    return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
  }

  function feedRecencyLabel(eventTime, generatedTime) {
    if (!Number.isFinite(eventTime) || !Number.isFinite(generatedTime)) return '—';
    const minutes = Math.max(0, Math.round((generatedTime - eventTime) / 60000));
    if (minutes < 60) return `${minutes} min before feed generation`;
    const hours = minutes / 60;
    return `${hours.toFixed(hours < 10 ? 1 : 0)} h before feed generation`;
  }

  function intensityLabel(event) {
    const mmi = finite(event.mmi);
    const cdi = finite(event.cdi);
    if (mmi != null && cdi != null) return `MMI ${mmi.toFixed(1)} · CDI ${cdi.toFixed(1)}`;
    if (mmi != null) return `MMI ${mmi.toFixed(1)}`;
    if (cdi != null) return `CDI ${cdi.toFixed(1)}`;
    return '—';
  }

  function transportLabel(state) {
    if (!state) return 'UNAVAILABLE';
    if (state.transport === 'same-origin-snapshot') return 'GEOGEEK SNAPSHOT · SAME-ORIGIN';
    if (state.transport === 'same-origin-reference') return 'GEOGEEK REFERENCE · SAME-ORIGIN';
    return String(state.transport || 'UNKNOWN').replaceAll('-', ' ').toUpperCase();
  }

  function freshnessLabel(state) {
    if (!state) return 'UNAVAILABLE';
    const age = String(state.ageLabel || 'unknown').toUpperCase();
    if (state.stale) return `STALE SNAPSHOT · ${age} OLD`;
    return `SNAPSHOT · ${age} OLD`;
  }

  function setStatus(state) {
    const badge = document.querySelector('.instrument-status');
    if (!badge) return;
    badge.dataset.state = state?.stale ? 'stale' : 'snapshot';
    badge.textContent = freshnessLabel(state);
  }

  function eventFromFeature(feature) {
    const coordinates = feature?.geometry?.coordinates;
    if (feature?.geometry?.type !== 'Point' || !Array.isArray(coordinates)) return null;
    const lon = finite(coordinates[0]);
    const lat = finite(coordinates[1]);
    const depth = finite(coordinates[2]);
    const time = finite(feature?.properties?.time);
    if (lon == null || lat == null || time == null) return null;
    const p = feature.properties || {};
    return {
      id:String(feature.id || ''),
      lon, lat, depth,
      mag:finite(p.mag),
      place:String(p.place || 'Location unavailable'),
      time,
      updated:finite(p.updated),
      status:String(p.status || 'unknown'),
      magType:String(p.magType || ''),
      sig:finite(p.sig),
      felt:finite(p.felt),
      cdi:finite(p.cdi),
      mmi:finite(p.mmi),
      tsunami:finite(p.tsunami),
      url:typeof p.url === 'string' && /^https:\/\//i.test(p.url) ? p.url : null
    };
  }

  async function requestJson(url, signal) {
    const response = await fetch(url, { signal, headers:{ Accept:'application/json, application/geo+json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function magnitudeLegend() {
    return [2, 4, 6].map(magnitude => {
      const diameter = Math.round(markerRadius(magnitude) * 2);
      return `<span><i class="pulse-mag-dot" style="--pulse-dot:${diameter}px"></i>M${magnitude}</span>`;
    }).join('');
  }

  async function mountPulseObservation({ signal, stage } = {}) {
    if (!stage || signal?.aborted) return () => {};

    stage.innerHTML = `
      <div class="pulse-observation-lab pulse-layout" data-state="loading">
        <div class="pulse-loading"><span>⌁</span><strong>Reading the seismic field…</strong><small>USGS snapshot · Natural Earth reference</small></div>
      </div>`;

    let quakes;
    try {
      quakes = await requestJson(quakeDataset.upstream, signal);
    } catch (error) {
      if (signal?.aborted) return () => {};
      const badge = document.querySelector('.instrument-status');
      if (badge) { badge.dataset.state = 'error'; badge.textContent = 'SNAPSHOT UNAVAILABLE'; }
      stage.innerHTML = `<div class="instrument-error"><strong>Earthquake snapshot unavailable.</strong><p>GeoGeek did not substitute demo events or silently bypass the declared USGS snapshot contract.</p></div>`;
      return () => {};
    }
    if (signal?.aborted) return () => {};

    let land = null;
    try { land = await requestJson(landDataset.upstream, signal); }
    catch (error) {
      if (signal?.aborted) return () => {};
      console.warn('[GeoGeek] Natural Earth reference unavailable; Pulse will retain the geographic frame without fabricated land geometry.', error);
    }
    if (signal?.aborted) return () => {};

    const quakeState = supply.describe(QUAKE_ID);
    const landState = supply.describe(LAND_ID);
    const metadata = quakeState?.metadata || {};
    const generatedTime = Date.parse(String(metadata.providerGeneratedAt || '')) || finite(quakes?.metadata?.generated) || Date.now();
    const events = (quakes?.features || []).map(eventFromFeature).filter(Boolean);
    const observedCount = Number.isFinite(Number(metadata.providerCount)) ? Number(metadata.providerCount) : Number.isFinite(Number(quakes?.metadata?.count)) ? Number(quakes.metadata.count) : events.length;
    const finiteMagnitudes = events.map(event => event.mag).filter(Number.isFinite);
    const maximumMagnitude = finiteMagnitudes.length ? Math.max(...finiteMagnitudes) : null;
    const medianDepth = median(events.map(event => event.depth));
    const latest = events.slice().sort((a, b) => b.time - a.time)[0] || null;
    const landFeatures = Array.isArray(land?.features) ? land.features : [];

    setStatus(quakeState);

    stage.innerHTML = `
      <div class="pulse-observation-lab pulse-layout" data-state="ready">
        <section class="pulse-map-wrap" aria-label="Seismic event field">
          <div class="pulse-map-frame">
            <svg class="pulse-map" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Global earthquake events in an equirectangular 2 to 1 geographic frame"></svg>
            <div class="pulse-map-badge pulse-map-badge-left">EQUIRECTANGULAR · LON/LAT · 2:1</div>
            <div class="pulse-map-badge pulse-map-badge-right" id="pulseReferenceBadge">${land ? 'LAND · NATURAL EARTH 1:110m · VERSION-PINNED' : 'LAND REFERENCE · UNAVAILABLE'}</div>
          </div>
          <div class="pulse-map-note">Recency opacity is measured against the USGS feed generation time, not the browser clock.</div>
        </section>

        <aside class="pulse-panel">
          <section class="pulse-panel-section pulse-field-summary" aria-labelledby="pulseFieldTitle">
            <div class="orbit-panel-label">SEISMIC FIELD</div>
            <strong id="pulseFieldTitle">${observedCount.toLocaleString('en-US')} EVENTS · ROLLING 24 H</strong>
            <dl class="pulse-metrics">
              <div><dt>EVENTS</dt><dd>${observedCount.toLocaleString('en-US')}</dd></div>
              <div><dt>MAX MAG</dt><dd>${maximumMagnitude == null ? '—' : `M ${maximumMagnitude.toFixed(1)}`}</dd></div>
              <div><dt>MEDIAN DEPTH</dt><dd>${medianDepth == null ? '—' : `${Math.round(medianDepth)} km`}</dd></div>
              <div><dt>LATEST ORIGIN</dt><dd>${latest ? shortUtc(latest.time) : '—'}</dd></div>
            </dl>
          </section>

          <section class="pulse-panel-section pulse-inspector" aria-labelledby="pulseInspectTitle">
            <div class="orbit-panel-label">EVENT INSPECT</div>
            <strong id="pulseInspectTitle">FOCUS OR SELECT AN EVENT</strong>
            <p class="pulse-inspect-place" id="pulseInspectPlace">Field statistics remain fixed while this inspector reads one event.</p>
            <dl class="pulse-inspect-grid">
              <div><dt>MAGNITUDE</dt><dd id="pulseEventMag">—</dd></div>
              <div><dt>DEPTH</dt><dd id="pulseEventDepth">—</dd></div>
              <div><dt>ORIGIN</dt><dd id="pulseEventOrigin">—</dd></div>
              <div><dt>REVISED</dt><dd id="pulseEventUpdated">—</dd></div>
              <div><dt>RECENCY / FEED</dt><dd id="pulseEventRecency">—</dd></div>
              <div><dt>STATUS</dt><dd id="pulseEventStatus">—</dd></div>
              <div><dt>SIGNIFICANCE</dt><dd id="pulseEventSig">—</dd></div>
              <div><dt>FELT</dt><dd id="pulseEventFelt">—</dd></div>
              <div><dt>INTENSITY</dt><dd id="pulseEventIntensity">—</dd></div>
            </dl>
            <a class="pulse-event-link" id="pulseEventLink" href="#" target="_blank" rel="noreferrer" hidden>OPEN USGS EVENT ↗</a>
          </section>

          <section class="pulse-panel-section pulse-encoding" aria-label="Visual encoding">
            <div class="orbit-panel-label">ENCODING</div>
            <div class="pulse-mag-legend"><b>MAGNITUDE / AREA</b>${magnitudeLegend()}</div>
            <div class="pulse-depth-legend">
              <b>DEPTH / RING</b>
              <span><i class="is-shallow"></i>&lt;70 km</span>
              <span><i class="is-intermediate"></i>70–300 km</span>
              <span><i class="is-deep"></i>&gt;300 km</span>
            </div>
            <p>Marker area is a readable magnitude index, not an energy-proportional symbol. Depth uses ring style rather than a false southward stem.</p>
          </section>

          <section class="pulse-panel-section pulse-provenance" aria-label="Observation conditions">
            <div class="orbit-panel-label">OBSERVATION CONDITIONS</div>
            <dl>
              <div><dt>SOURCE</dt><dd>${esc(quakeDataset.provider)}</dd></div>
              <div><dt>TIME</dt><dd>FEED GENERATED ${shortUtc(generatedTime)}</dd></div>
              <div><dt>DELIVERY</dt><dd>${esc(transportLabel(quakeState))}</dd></div>
              <div><dt>FRESHNESS</dt><dd>${esc(freshnessLabel(quakeState))}</dd></div>
              <div><dt>SCOPE</dt><dd>${esc(quakeDataset.scope)}</dd></div>
              <div><dt>LIMIT</dt><dd>${esc(quakeDataset.limit)}</dd></div>
              <div><dt>REFERENCE</dt><dd>${land ? `${esc(landDataset.provider)} · ${esc(landState?.freshnessLabel || 'VERSION-PINNED')}` : 'UNAVAILABLE · geographic frame retained'}</dd></div>
            </dl>
          </section>
        </aside>
      </div>`;

    const root = $('.pulse-observation-lab', stage);
    const svg = $('.pulse-map', root);
    const inspectTitle = $('#pulseInspectTitle', root);
    const inspectPlace = $('#pulseInspectPlace', root);
    const inspectNodes = {
      mag:$('#pulseEventMag', root), depth:$('#pulseEventDepth', root), origin:$('#pulseEventOrigin', root),
      updated:$('#pulseEventUpdated', root), recency:$('#pulseEventRecency', root), status:$('#pulseEventStatus', root),
      sig:$('#pulseEventSig', root), felt:$('#pulseEventFelt', root), intensity:$('#pulseEventIntensity', root),
      link:$('#pulseEventLink', root)
    };

    const back = document.createElementNS(NS, 'rect');
    back.setAttribute('class', 'pulse-map-background');
    back.setAttribute('width', '1000');
    back.setAttribute('height', '500');
    svg.appendChild(back);

    const grid = document.createElementNS(NS, 'g');
    grid.setAttribute('class', 'pulse-graticule');
    for (let lon = -150; lon <= 150; lon += 30) {
      const [x] = project(lon, 0);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', x.toFixed(2)); line.setAttribute('x2', x.toFixed(2)); line.setAttribute('y1', '0'); line.setAttribute('y2', '500');
      grid.appendChild(line);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = project(0, lat);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', '0'); line.setAttribute('x2', '1000'); line.setAttribute('y1', y.toFixed(2)); line.setAttribute('y2', y.toFixed(2));
      grid.appendChild(line);
    }
    svg.appendChild(grid);

    if (landFeatures.length) {
      const landGroup = document.createElementNS(NS, 'g');
      landGroup.setAttribute('class', 'pulse-land');
      for (const feature of landFeatures) {
        const d = geometryPath(feature.geometry);
        if (!d) continue;
        const path = document.createElementNS(NS, 'path');
        path.setAttribute('d', d);
        path.setAttribute('fill-rule', 'evenodd');
        landGroup.appendChild(path);
      }
      svg.appendChild(landGroup);
    }

    const eventGroup = document.createElementNS(NS, 'g');
    eventGroup.setAttribute('class', 'pulse-events');
    svg.appendChild(eventGroup);

    let lockedEvent = null;
    const nodeById = new Map();

    function clearInspector() {
      inspectTitle.textContent = 'FOCUS OR SELECT AN EVENT';
      inspectPlace.textContent = 'Field statistics remain fixed while this inspector reads one event.';
      Object.entries(inspectNodes).forEach(([key, node]) => {
        if (!node || key === 'link') return;
        node.textContent = '—';
      });
      inspectNodes.link.hidden = true;
      inspectNodes.link.removeAttribute('href');
    }

    function inspect(event) {
      if (!event) return clearInspector();
      inspectTitle.textContent = event.id ? event.id.toUpperCase() : 'EARTHQUAKE EVENT';
      inspectPlace.textContent = event.place;
      inspectNodes.mag.textContent = event.mag == null ? '—' : `M ${event.mag.toFixed(1)}${event.magType ? ` · ${event.magType}` : ''}`;
      inspectNodes.depth.textContent = event.depth == null ? '—' : `${event.depth.toFixed(event.depth < 10 ? 1 : 0)} km · ${depthClass(event.depth).toUpperCase()}`;
      inspectNodes.origin.textContent = utc(event.time);
      inspectNodes.updated.textContent = event.updated == null ? '—' : utc(event.updated);
      inspectNodes.recency.textContent = feedRecencyLabel(event.time, generatedTime);
      inspectNodes.status.textContent = event.status.toUpperCase();
      inspectNodes.sig.textContent = valueOrDash(event.sig);
      inspectNodes.felt.textContent = valueOrDash(event.felt, ' reports');
      inspectNodes.intensity.textContent = intensityLabel(event);
      if (event.url) {
        inspectNodes.link.href = event.url;
        inspectNodes.link.hidden = false;
      } else {
        inspectNodes.link.hidden = true;
        inspectNodes.link.removeAttribute('href');
      }
    }

    function lock(event) {
      lockedEvent = lockedEvent?.id === event.id ? null : event;
      nodeById.forEach((node, id) => {
        const selected = lockedEvent?.id === id;
        node.classList.toggle('is-selected', selected);
        node.setAttribute('aria-pressed', String(selected));
      });
      inspect(lockedEvent || event);
    }

    for (const event of events) {
      const [x, y] = project(event.lon, event.lat);
      const radius = markerRadius(event.mag);
      const ageHours = Math.max(0, (generatedTime - event.time) / 3600000);
      const recency = Math.max(0, Math.min(1, 1 - ageHours / 24));
      const group = document.createElementNS(NS, 'g');
      group.setAttribute('class', `pulse-event pulse-depth-${depthClass(event.depth)}`);
      group.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})`);
      group.style.setProperty('--pulse-recency', String((0.28 + recency * 0.72).toFixed(3)));
      group.setAttribute('tabindex', '0');
      group.setAttribute('role', 'button');
      group.setAttribute('aria-pressed', 'false');
      group.setAttribute('aria-label', `${event.place}; ${event.mag == null ? 'magnitude unavailable' : `magnitude ${event.mag.toFixed(1)}`}; ${event.depth == null ? 'depth unavailable' : `depth ${Math.round(event.depth)} kilometres`}`);

      const hit = document.createElementNS(NS, 'circle');
      hit.setAttribute('class', 'pulse-event-hit');
      hit.setAttribute('r', String(Math.max(10, radius + 4)));
      group.appendChild(hit);

      const marker = document.createElementNS(NS, 'circle');
      marker.setAttribute('class', 'pulse-event-marker');
      marker.setAttribute('r', radius.toFixed(2));
      group.appendChild(marker);

      const ring = document.createElementNS(NS, 'circle');
      ring.setAttribute('class', 'pulse-event-depth-ring');
      ring.setAttribute('r', (radius + 3).toFixed(2));
      group.appendChild(ring);

      group.addEventListener('pointerenter', () => inspect(event));
      group.addEventListener('pointerleave', () => inspect(lockedEvent));
      group.addEventListener('focus', () => inspect(event));
      group.addEventListener('blur', () => inspect(lockedEvent));
      group.addEventListener('click', () => lock(event));
      group.addEventListener('keydown', keyboardEvent => {
        if (!['Enter', ' '].includes(keyboardEvent.key)) return;
        keyboardEvent.preventDefault();
        lock(event);
      });
      nodeById.set(event.id, group);
      eventGroup.appendChild(group);
    }

    const keyHandler = event => {
      if (event.key !== 'Escape' || !lockedEvent || !root.isConnected) return;
      lockedEvent = null;
      nodeById.forEach(node => {
        node.classList.remove('is-selected');
        node.setAttribute('aria-pressed', 'false');
      });
      clearInspector();
    };
    document.addEventListener('keydown', keyHandler);

    clearInspector();

    return () => {
      document.removeEventListener('keydown', keyHandler);
      stage.innerHTML = '';
    };
  }

  ensureStyle();
  setConditions();
  window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  window.GeoGeekInstrumentMounts.pulse = mountPulseObservation;
  window.GeoPulseObservationLab = {
    version:VERSION,
    mount:mountPulseObservation,
    datasets:[QUAKE_ID, LAND_ID],
    projection:'equirectangular-2:1'
  };
})();
