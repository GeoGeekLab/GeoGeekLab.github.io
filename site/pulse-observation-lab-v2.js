(() => {
  'use strict';

  const VERSION = '20261002b';
  const QUAKE_ID = 'usgs-earthquakes-day';
  const LAND_ID = 'natural-earth-land-110m';
  const NS = 'http://www.w3.org/2000/svg';
  const WINDOW_MINUTES = 24 * 60;
  const DENSITY_THRESHOLD = 300;
  const DENSITY_LON_DEGREES = 12;
  const DENSITY_LAT_DEGREES = 10;
  const $ = (selector, root = document) => root.querySelector(selector);
  const supply = window.GeoDataSupply;
  const quakeDataset = supply?.get?.(QUAKE_ID);
  const landDataset = supply?.get?.(LAND_ID);

  if (!supply?.installed || !quakeDataset || !landDataset) {
    console.error('[GeoGeek] Pulse requires the unified USGS snapshot and Natural Earth reference contracts.');
    return;
  }

  function ensureStyle() {
    if (!document.querySelector('link[data-pulse-observation-lab]')) {
      const base = document.createElement('link');
      base.rel = 'stylesheet';
      base.href = 'pulse-observation-lab.css?v=20261002a';
      base.dataset.pulseObservationLab = '1';
      document.head.appendChild(base);
    }
    if (!document.querySelector('link[data-pulse-round4]')) {
      const round4 = document.createElement('link');
      round4.rel = 'stylesheet';
      round4.href = `pulse-observation-round4.css?v=${VERSION}`;
      round4.dataset.pulseRound4 = '1';
      document.head.appendChild(round4);
    }
  }

  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#39;', '"':'&quot;' }[c]));
  const finite = value => value == null || value === '' ? null : Number.isFinite(Number(value)) ? Number(value) : null;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
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
      item.tags = ['Seismicity', '24 h timeline', 'USGS'];
      item.source = 'USGS Earthquake Hazards Program · GeoGeek validated snapshot';
      item.description = 'Scrub, filter, and spatially aggregate one validated rolling 24-hour USGS snapshot without treating it as a historical archive or hazard model.';
    }
    const lab = root?.ui?.lab;
    if (lab?.conditions) lab.conditions.pulse = [
      ['SOURCE', 'USGS Earthquake Hazards Program'],
      ['DELIVERY', 'GeoGeek same-origin snapshot'],
      ['TIME', 'Snapshot-internal event-origin cutoff'],
      ['LIMIT', 'Count grid ≠ hazard · snapshot ≠ archive']
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
    let segmentOpen = false;
    for (const coordinate of ring || []) {
      const lon = finite(coordinate?.[0]);
      const lat = finite(coordinate?.[1]);
      if (lon == null || lat == null) continue;
      const [x, y] = project(lon, lat);
      const discontinuity = previousLon != null && Math.abs(lon - previousLon) > 180;
      if (discontinuity && segmentOpen) d += 'Z ';
      d += `${!segmentOpen || discontinuity ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)} `;
      segmentOpen = true;
      previousLon = lon;
    }
    if (segmentOpen) d += 'Z';
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
      status:String(p.status || 'unknown').toLowerCase(),
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

  function optionLabel(value) {
    if (value === 'all') return 'ALL';
    if (value === 'unknown') return 'UNKNOWN';
    return String(value).toUpperCase();
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
    const windowStart = generatedTime - WINDOW_MINUTES * 60000;
    const events = (quakes?.features || []).map(eventFromFeature).filter(Boolean);
    const observedCount = Number.isFinite(Number(metadata.providerCount)) ? Number(metadata.providerCount) : Number.isFinite(Number(quakes?.metadata?.count)) ? Number(quakes.metadata.count) : events.length;
    const finiteMagnitudes = events.map(event => event.mag).filter(Number.isFinite);
    const maximumMagnitude = finiteMagnitudes.length ? Math.max(...finiteMagnitudes) : null;
    const medianDepth = median(events.map(event => event.depth));
    const latest = events.slice().sort((a, b) => b.time - a.time)[0] || null;
    const landFeatures = Array.isArray(land?.features) ? land.features : [];
    const statuses = [...new Set(events.map(event => event.status).filter(Boolean))].sort();

    setStatus(quakeState);

    stage.innerHTML = `
      <div class="pulse-observation-lab pulse-layout" data-state="ready" data-representation="events">
        <section class="pulse-map-wrap" aria-label="Seismic event field">
          <div class="pulse-map-frame">
            <svg class="pulse-map" viewBox="0 0 1000 500" preserveAspectRatio="xMidYMid meet" role="group" aria-label="Global earthquake events in an equirectangular 2 to 1 geographic frame"></svg>
            <div class="pulse-map-badge pulse-map-badge-left">EQUIRECTANGULAR · LON/LAT · 2:1</div>
            <div class="pulse-map-badge pulse-map-badge-right" id="pulseReferenceBadge">${land ? 'LAND · NATURAL EARTH 1:110m · VERSION-PINNED' : 'LAND REFERENCE · UNAVAILABLE'}</div>
            <div class="pulse-map-badge pulse-map-view-badge" id="pulseViewBadge">EVENTS · FULL SNAPSHOT</div>
          </div>
        </section>

        <aside class="pulse-panel" tabindex="0" role="complementary" aria-label="Earth Pulse controls and event details">
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

          <section class="pulse-panel-section pulse-temporal-controls" aria-labelledby="pulseTimelineTitle">
            <div class="orbit-panel-label">TEMPORAL CONTROL</div>
            <div class="pulse-control-heading">
              <strong id="pulseTimelineTitle">24 H SNAPSHOT PLAYBACK</strong>
              <span id="pulseTimelineClock">${shortUtc(generatedTime)}</span>
            </div>
            <label class="pulse-range-label" for="pulseTimeline">
              <span>EVENT-ORIGIN CUTOFF</span>
              <span id="pulseTimelineState">FULL SNAPSHOT</span>
            </label>
            <input id="pulseTimeline" type="range" min="0" max="${WINDOW_MINUTES}" step="30" value="${WINDOW_MINUTES}" aria-describedby="pulseTimelineHelp">
            <div class="pulse-timeline-axis" aria-hidden="true"><span>−24 H</span><span>−12 H</span><span>FEED</span></div>
            <div class="pulse-control-row">
              <button type="button" id="pulsePlay" class="pulse-control-button">PLAY FROM START</button>
              <button type="button" id="pulseFull" class="pulse-control-button">FULL SNAPSHOT</button>
            </div>
            <p id="pulseTimelineHelp">The timeline never requests historical data. It changes the event-origin cutoff inside the currently delivered rolling 24-hour snapshot.</p>
          </section>

          <section class="pulse-panel-section pulse-filter-controls" aria-labelledby="pulseFilterTitle">
            <div class="orbit-panel-label">VISIBLE SET</div>
            <strong id="pulseFilterTitle">FILTER + REPRESENTATION</strong>
            <div class="pulse-filter-grid">
              <label>MIN MAG
                <select id="pulseMagnitudeFilter">
                  <option value="all">ALL MAGNITUDES</option>
                  <option value="2">M ≥ 2</option>
                  <option value="4">M ≥ 4</option>
                  <option value="6">M ≥ 6</option>
                </select>
              </label>
              <label>DEPTH
                <select id="pulseDepthFilter">
                  <option value="all">ALL DEPTHS</option>
                  <option value="shallow">SHALLOW · &lt;70 km</option>
                  <option value="intermediate">INTERMEDIATE · 70–300 km</option>
                  <option value="deep">DEEP · &gt;300 km</option>
                  <option value="unknown">UNKNOWN</option>
                </select>
              </label>
              <label>STATUS
                <select id="pulseStatusFilter">
                  <option value="all">ALL STATUSES</option>
                  ${statuses.map(status => `<option value="${esc(status)}">${esc(optionLabel(status))}</option>`).join('')}
                </select>
              </label>
            </div>
            <div class="pulse-visible-summary" aria-live="polite">
              <strong id="pulseVisibleCount">${events.length.toLocaleString('en-US')} VISIBLE</strong>
              <span id="pulseRepresentationState">AUTO → EVENTS</span>
            </div>
            <div class="pulse-representation-group" role="group" aria-label="Seismic field representation">
              <button type="button" data-pulse-representation="auto" aria-pressed="true">AUTO</button>
              <button type="button" data-pulse-representation="events" aria-pressed="false">EVENTS</button>
              <button type="button" data-pulse-representation="density" aria-pressed="false">COUNT GRID</button>
            </div>
            <p>COUNT GRID aggregates visible events into 12° × 10° geographic cells. It is not equal-area, not area-normalized, and is not a hazard, intensity, or occurrence-rate surface.</p>
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
            <a class="pulse-method-link" href="/records/lab-l10.html">METHOD, SOURCE &amp; LIMITS ↗</a>
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
    const timeline = $('#pulseTimeline', root);
    const timelineClock = $('#pulseTimelineClock', root);
    const timelineState = $('#pulseTimelineState', root);
    const playButton = $('#pulsePlay', root);
    const fullButton = $('#pulseFull', root);
    const magnitudeFilter = $('#pulseMagnitudeFilter', root);
    const depthFilter = $('#pulseDepthFilter', root);
    const statusFilter = $('#pulseStatusFilter', root);
    const visibleCount = $('#pulseVisibleCount', root);
    const representationState = $('#pulseRepresentationState', root);
    const viewBadge = $('#pulseViewBadge', root);
    const representationButtons = [...root.querySelectorAll('[data-pulse-representation]')];

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
      line.setAttribute('x1', x.toFixed(2));
      line.setAttribute('x2', x.toFixed(2));
      line.setAttribute('y1', '0');
      line.setAttribute('y2', '500');
      grid.appendChild(line);
    }
    for (let lat = -60; lat <= 60; lat += 30) {
      const [, y] = project(0, lat);
      const line = document.createElementNS(NS, 'line');
      line.setAttribute('x1', '0');
      line.setAttribute('x2', '1000');
      line.setAttribute('y1', y.toFixed(2));
      line.setAttribute('y2', y.toFixed(2));
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

    const densityGroup = document.createElementNS(NS, 'g');
    densityGroup.setAttribute('class', 'pulse-density-grid');
    densityGroup.setAttribute('aria-hidden', 'true');
    svg.appendChild(densityGroup);

    const eventGroup = document.createElementNS(NS, 'g');
    eventGroup.setAttribute('class', 'pulse-events');
    svg.appendChild(eventGroup);

    let lockedEvent = null;
    let playbackTimer = 0;
    const nodeById = new Map();
    const state = {
      cutoffMinutes: WINDOW_MINUTES,
      magnitude:'all',
      depth:'all',
      status:'all',
      representation:'auto',
      playing:false
    };

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

    function clearSelection() {
      lockedEvent = null;
      nodeById.forEach(node => {
        node.classList.remove('is-selected');
        node.setAttribute('aria-pressed', 'false');
      });
      clearInspector();
    }

    function lock(event) {
      if (lockedEvent?.id === event.id) {
        clearSelection();
        return;
      }
      lockedEvent = event;
      nodeById.forEach((node, id) => {
        const selected = event.id === id;
        node.classList.toggle('is-selected', selected);
        node.setAttribute('aria-pressed', String(selected));
      });
      inspect(event);
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
      group.setAttribute('data-visible', 'true');
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

    function matchesFilters(event, cutoffTime) {
      if (event.time < windowStart || event.time > cutoffTime) return false;
      if (state.magnitude !== 'all') {
        const threshold = Number(state.magnitude);
        if (!Number.isFinite(event.mag) || event.mag < threshold) return false;
      }
      if (state.depth !== 'all' && depthClass(event.depth) !== state.depth) return false;
      if (state.status !== 'all' && event.status !== state.status) return false;
      return true;
    }

    function drawDensity(visibleEvents) {
      densityGroup.replaceChildren();
      if (!visibleEvents.length) return;
      const lonBins = Math.ceil(360 / DENSITY_LON_DEGREES);
      const latBins = Math.ceil(180 / DENSITY_LAT_DEGREES);
      const cells = new Map();
      for (const event of visibleEvents) {
        const ix = clamp(Math.floor((event.lon + 180) / DENSITY_LON_DEGREES), 0, lonBins - 1);
        const iy = clamp(Math.floor((event.lat + 90) / DENSITY_LAT_DEGREES), 0, latBins - 1);
        const key = `${ix}:${iy}`;
        cells.set(key, (cells.get(key) || 0) + 1);
      }
      const maximum = Math.max(...cells.values());
      const cellWidth = 1000 / lonBins;
      const cellHeight = 500 / latBins;
      for (const [key, count] of cells) {
        const [ix, iy] = key.split(':').map(Number);
        const rect = document.createElementNS(NS, 'rect');
        rect.setAttribute('class', 'pulse-density-cell');
        rect.setAttribute('x', (ix * cellWidth).toFixed(2));
        rect.setAttribute('y', ((latBins - 1 - iy) * cellHeight).toFixed(2));
        rect.setAttribute('width', cellWidth.toFixed(2));
        rect.setAttribute('height', cellHeight.toFixed(2));
        rect.setAttribute('data-count', String(count));
        rect.style.setProperty('--pulse-density', String((0.14 + 0.72 * Math.sqrt(count / maximum)).toFixed(3)));
        const title = document.createElementNS(NS, 'title');
        title.textContent = `${count} visible event${count === 1 ? '' : 's'} in this ${DENSITY_LON_DEGREES}° × ${DENSITY_LAT_DEGREES}° geographic cell`;
        rect.appendChild(title);
        densityGroup.appendChild(rect);
      }
    }

    function effectiveRepresentation(count) {
      if (state.representation === 'events') return 'events';
      if (state.representation === 'density') return 'density';
      return count >= DENSITY_THRESHOLD ? 'density' : 'events';
    }

    function stopPlayback() {
      if (playbackTimer) window.clearInterval(playbackTimer);
      playbackTimer = 0;
      state.playing = false;
      playButton.textContent = state.cutoffMinutes >= WINDOW_MINUTES ? 'PLAY FROM START' : 'PLAY';
      playButton.setAttribute('aria-pressed', 'false');
    }

    function render() {
      const cutoffTime = windowStart + state.cutoffMinutes * 60000;
      const visibleEvents = events.filter(event => matchesFilters(event, cutoffTime));
      const visibleIds = new Set(visibleEvents.map(event => event.id));
      const representation = effectiveRepresentation(visibleEvents.length);
      const densityActive = representation === 'density';

      root.dataset.representation = representation;
      eventGroup.style.display = densityActive ? 'none' : '';
      densityGroup.style.display = densityActive ? '' : 'none';

      nodeById.forEach((node, id) => {
        const visible = visibleIds.has(id) && !densityActive;
        node.style.display = visible ? '' : 'none';
        node.setAttribute('data-visible', visibleIds.has(id) ? 'true' : 'false');
        node.setAttribute('tabindex', visible ? '0' : '-1');
        node.setAttribute('aria-hidden', visible ? 'false' : 'true');
      });

      drawDensity(visibleEvents);

      if (lockedEvent && (!visibleIds.has(lockedEvent.id) || densityActive)) clearSelection();

      timeline.value = String(state.cutoffMinutes);
      timeline.setAttribute('aria-valuetext', state.cutoffMinutes >= WINDOW_MINUTES ? 'Full current snapshot' : `Events with origin time through ${utc(cutoffTime)}`);
      timelineClock.textContent = shortUtc(cutoffTime);
      timelineState.textContent = state.cutoffMinutes >= WINDOW_MINUTES ? 'FULL SNAPSHOT' : `${Math.round(state.cutoffMinutes / 60)} H FROM WINDOW START`;
      visibleCount.textContent = `${visibleEvents.length.toLocaleString('en-US')} VISIBLE`;
      representationState.textContent = `${state.representation.toUpperCase()} → ${representation === 'density' ? 'COUNT GRID' : 'EVENTS'}`;
      viewBadge.textContent = `${representation === 'density' ? 'COUNT GRID' : 'EVENTS'} · ${state.cutoffMinutes >= WINDOW_MINUTES ? 'FULL SNAPSHOT' : shortUtc(cutoffTime)}`;

      representationButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(button.dataset.pulseRepresentation === state.representation));
      });
    }

    timeline.addEventListener('input', () => {
      stopPlayback();
      state.cutoffMinutes = clamp(Number(timeline.value) || 0, 0, WINDOW_MINUTES);
      render();
    });

    playButton.addEventListener('click', () => {
      if (state.playing) {
        stopPlayback();
        return;
      }
      if (state.cutoffMinutes >= WINDOW_MINUTES) state.cutoffMinutes = 0;
      state.playing = true;
      playButton.textContent = 'PAUSE';
      playButton.setAttribute('aria-pressed', 'true');
      render();
      playbackTimer = window.setInterval(() => {
        if (!root.isConnected) return stopPlayback();
        state.cutoffMinutes = Math.min(WINDOW_MINUTES, state.cutoffMinutes + 60);
        render();
        if (state.cutoffMinutes >= WINDOW_MINUTES) stopPlayback();
      }, 350);
    });

    fullButton.addEventListener('click', () => {
      stopPlayback();
      state.cutoffMinutes = WINDOW_MINUTES;
      render();
    });

    magnitudeFilter.addEventListener('change', () => {
      state.magnitude = magnitudeFilter.value;
      render();
    });
    depthFilter.addEventListener('change', () => {
      state.depth = depthFilter.value;
      render();
    });
    statusFilter.addEventListener('change', () => {
      state.status = statusFilter.value;
      render();
    });

    representationButtons.forEach(button => button.addEventListener('click', () => {
      state.representation = button.dataset.pulseRepresentation || 'auto';
      render();
    }));

    const visibilityHandler = () => {
      if (document.hidden) stopPlayback();
    };
    document.addEventListener('visibilitychange', visibilityHandler);

    const dialog = document.getElementById('instrumentDialog');
    const cancelHandler = event => {
      if (!lockedEvent || !root.isConnected) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      clearSelection();
    };
    dialog?.addEventListener('cancel', cancelHandler, true);

    clearInspector();
    render();

    return () => {
      stopPlayback();
      document.removeEventListener('visibilitychange', visibilityHandler);
      dialog?.removeEventListener('cancel', cancelHandler, true);
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
    projection:'equirectangular-2:1',
    timeline:'snapshot-internal-origin-cutoff',
    density:`${DENSITY_LON_DEGREES}x${DENSITY_LAT_DEGREES}-degree-count-grid`
  };
})();