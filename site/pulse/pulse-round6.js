(() => {
  'use strict';

  const VERSION = '20261009r3';
  const R_EARTH_KM = 6371.0088;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const fmt = new Intl.NumberFormat('en-US', { maximumFractionDigits:0 });
  const fmt1 = new Intl.NumberFormat('en-US', { maximumFractionDigits:1 });

  function ensureStyle() {
    if (document.querySelector('link[data-pulse-round6]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL(`./pulse-round6.css?v=${VERSION}`, import.meta.url).href;
    link.dataset.pulseRound6 = '1';
    document.head.appendChild(link);
  }

  function updateUrl(updates = {}) {
    const url = new URL(location.href);
    Object.entries(updates).forEach(([key, value]) => {
      if (value == null || value === '' || value === 'count') url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    });
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function cellGeometry(rect) {
    const x = Number(rect.getAttribute('x')) || 0;
    const y = Number(rect.getAttribute('y')) || 0;
    const width = Number(rect.getAttribute('width')) || 0;
    const height = Number(rect.getAttribute('height')) || 0;
    const lon0 = x / 1000 * 360 - 180;
    const lon1 = (x + width) / 1000 * 360 - 180;
    const lat1 = 90 - y / 500 * 180;
    const lat0 = 90 - (y + height) / 500 * 180;
    const dLon = Math.abs((lon1 - lon0) * Math.PI / 180);
    const areaKm2 = R_EARTH_KM * R_EARTH_KM * dLon * Math.abs(Math.sin(lat1 * Math.PI / 180) - Math.sin(lat0 * Math.PI / 180));
    return { lon0, lon1, lat0, lat1, areaKm2 };
  }

  function coordinate(value, positive, negative) {
    return `${Math.abs(value).toFixed(0)}°${value >= 0 ? positive : negative}`;
  }

  function refine(stage, root) {
    if (!stage || !root || root.dataset.pulseRound6 === '1') return;
    const mapWrap = $('.pulse-map-wrap', root);
    const mapFrame = $('.pulse-map-frame', root);
    const panel = $('.pulse-panel', root);
    const densityGroup = $('.pulse-density-grid', root);
    const timeline = $('#pulseTimeline', root);
    const magnitude = $('#pulseMagnitudeFilter', root);
    const depth = $('#pulseDepthFilter', root);
    const status = $('#pulseStatusFilter', root);
    const visibleCount = $('#pulseVisibleCount', root);
    const representationState = $('#pulseRepresentationState', root);
    const provenance = $('.pulse-provenance', root);
    const sourceTitle = provenance?.querySelector('.orbit-panel-label');
    if (sourceTitle) sourceTitle.id = 'pulseSourceTitle';
    const inspector = $('.pulse-inspector', root);
    const encoding = $('.pulse-encoding', root);
    const temporal = $('.pulse-temporal-controls', root);
    const filters = $('.pulse-filter-controls', root);
    if (!mapWrap || !mapFrame || !panel || !densityGroup || !timeline || !filters) return;

    ensureStyle();
    root.dataset.pulseRound6 = '1';
    stage.dataset.pulseRound6 = '1';

    temporal?.setAttribute('data-pulse-section', 'control');
    filters?.setAttribute('data-pulse-section', 'control');
    inspector?.setAttribute('data-pulse-section', 'read');
    encoding?.setAttribute('data-pulse-section', 'read');
    provenance?.setAttribute('data-pulse-section', 'source');

    const nav = document.createElement('nav');
    nav.className = 'pulse-r6-nav';
    nav.setAttribute('aria-label', 'Pulse workspace sections');
    nav.innerHTML = `
      <a href="#pulseTimelineTitle" data-pulse-jump="control">CONTROL</a>
      <a href="#pulseR6AggregationTitle" data-pulse-jump="read">READ</a>
      <a href="#pulseSourceTitle" data-pulse-jump="source">SOURCE</a>`;
    panel.prepend(nav);

    const summary = document.createElement('section');
    summary.className = 'pulse-r6-summary';
    summary.setAttribute('aria-live', 'polite');
    summary.innerHTML = `
      <span>ACTIVE STATISTICAL OBJECT</span>
      <strong data-pulse-object>EVENT RECORDS</strong>
      <p data-pulse-question>Where and when are catalogued events in this delivered snapshot?</p>
      <small>DO NOT INFER · <b data-pulse-boundary>catalogue ≠ hazard / long-term rate</b></small>`;
    nav.after(summary);

    const chain = document.createElement('div');
    chain.className = 'pulse-inference-chain';
    chain.setAttribute('aria-label', 'Event inference chain');
    chain.innerHTML = `
      <div><span>01 · EVENT</span><strong>USGS RECORD</strong><small>lon / lat / depth / origin</small></div>
      <div><span>02 · WINDOW</span><strong data-pulse-chain-window>ROLLING 24 H</strong><small>snapshot-internal cutoff</small></div>
      <div><span>03 · FILTER</span><strong data-pulse-chain-filter>ALL EVENTS</strong><small>magnitude / depth / status</small></div>
      <div><span>04 · AGGREGATE</span><strong data-pulse-chain-aggregate>NONE</strong><small data-pulse-chain-unit>individual records</small></div>
      <div><span>05 · READ</span><strong data-pulse-chain-read>POINT PATTERN</strong><small data-pulse-chain-valid>event geography only</small></div>`;
    mapFrame.after(chain);

    const measure = document.createElement('div');
    measure.className = 'pulse-measure-choice';
    measure.setAttribute('role', 'group');
    measure.setAttribute('aria-label', 'Count grid measure');
    measure.innerHTML = `
      <span>GRID MEASURE</span>
      <div>
        <button type="button" data-pulse-measure="count" aria-pressed="true">RAW COUNT</button>
        <button type="button" data-pulse-measure="area" aria-pressed="false">AREA-NORMALIZED</button>
      </div>
      <small>Angular cells do not have equal area. Area-normalized view reports visible events per 1 million km²; it is still not an occurrence rate or hazard surface.</small>`;
    $('.pulse-representation-group', filters)?.after(measure);

    const aggregation = document.createElement('section');
    aggregation.className = 'pulse-panel-section pulse-r6-aggregation';
    aggregation.dataset.pulseSection = 'read';
    aggregation.setAttribute('aria-labelledby', 'pulseR6AggregationTitle');
    aggregation.innerHTML = `
      <div class="orbit-panel-label">AGGREGATION READOUT</div>
      <strong id="pulseR6AggregationTitle">CELL / EVENT RELATION</strong>
      <dl>
        <div><dt>OBJECT</dt><dd data-pulse-cell-object>INDIVIDUAL EVENTS</dd></div>
        <div><dt>VISIBLE SET</dt><dd data-pulse-cell-visible>—</dd></div>
        <div><dt>CELL BOUNDS</dt><dd data-pulse-cell-bounds>—</dd></div>
        <div><dt>RAW COUNT</dt><dd data-pulse-cell-count>—</dd></div>
        <div><dt>APPROX AREA</dt><dd data-pulse-cell-area>—</dd></div>
        <div><dt>SPATIAL DENSITY</dt><dd data-pulse-cell-density>—</dd></div>
      </dl>
      <p data-pulse-cell-limit>Switch to COUNT GRID to inspect the aggregation unit. Event points remain the least aggregated representation.</p>`;
    if (inspector) inspector.before(aggregation);
    else filters.after(aggregation);

    let measureMode = new URL(location.href).searchParams.get('pulseMeasure') === 'area' ? 'area' : 'count';
    let selectedCell = null;
    let scheduled = 0;

    const visibleNumber = () => Number((visibleCount?.textContent || '').replace(/[^0-9]/g, '')) || 0;
    const requestedRepresentation = () => $('[data-pulse-representation][aria-pressed="true"]', root)?.dataset.pulseRepresentation || 'auto';
    const effectiveRepresentation = () => root.dataset.representation === 'density' ? 'density' : 'events';

    function filterLabel() {
      const parts = [];
      if (magnitude?.value && magnitude.value !== 'all') parts.push(`M≥${magnitude.value}`);
      if (depth?.value && depth.value !== 'all') parts.push(depth.value.toUpperCase());
      if (status?.value && status.value !== 'all') parts.push(status.value.toUpperCase());
      return parts.length ? parts.join(' · ') : 'ALL EVENTS';
    }

    function cutoffLabel() {
      const minutes = clamp(Number(timeline.value) || 0, 0, 1440);
      if (minutes >= 1440) return 'FULL 24 H SNAPSHOT';
      if (minutes === 0) return 'WINDOW START';
      return `FIRST ${(minutes / 60).toFixed(minutes % 60 ? 1 : 0)} H`;
    }

    function resetCellReadout() {
      selectedCell = null;
      $('[data-pulse-cell-object]', aggregation).textContent = effectiveRepresentation() === 'density' ? (measureMode === 'area' ? '12° × 10° AREA-NORMALIZED CELLS' : '12° × 10° COUNT CELLS') : 'INDIVIDUAL EVENTS';
      $('[data-pulse-cell-visible]', aggregation).textContent = `${visibleNumber().toLocaleString('en-US')} visible records`;
      $('[data-pulse-cell-bounds]', aggregation).textContent = '—';
      $('[data-pulse-cell-count]', aggregation).textContent = '—';
      $('[data-pulse-cell-area]', aggregation).textContent = '—';
      $('[data-pulse-cell-density]', aggregation).textContent = '—';
      $('[data-pulse-cell-limit]', aggregation).textContent = effectiveRepresentation() === 'density'
        ? 'Focus a grid cell to inspect its angular bounds, approximate spherical area, raw count, and area-normalized spatial density.'
        : 'Switch to COUNT GRID to inspect the aggregation unit. Event points remain the least aggregated representation.';
    }

    function inspectCell(cell) {
      if (!cell) return resetCellReadout();
      selectedCell = cell;
      const count = Number(cell.dataset.count) || 0;
      const g = cellGeometry(cell);
      const densityPerM = g.areaKm2 > 0 ? count / (g.areaKm2 / 1_000_000) : 0;
      $('[data-pulse-cell-object]', aggregation).textContent = measureMode === 'area' ? 'AREA-NORMALIZED CELL' : 'RAW COUNT CELL';
      $('[data-pulse-cell-visible]', aggregation).textContent = `${visibleNumber().toLocaleString('en-US')} visible records`;
      $('[data-pulse-cell-bounds]', aggregation).textContent = `${coordinate(g.lon0, 'E', 'W')}–${coordinate(g.lon1, 'E', 'W')} · ${coordinate(g.lat0, 'N', 'S')}–${coordinate(g.lat1, 'N', 'S')}`;
      $('[data-pulse-cell-count]', aggregation).textContent = `${count.toLocaleString('en-US')} event${count === 1 ? '' : 's'}`;
      $('[data-pulse-cell-area]', aggregation).textContent = `≈ ${fmt.format(g.areaKm2)} km²`;
      $('[data-pulse-cell-density]', aggregation).textContent = `≈ ${fmt1.format(densityPerM)} events / 10⁶ km²`;
      $('[data-pulse-cell-limit]', aggregation).textContent = 'Area normalization corrects only the changing surface area of this angular cell. It does not correct catalogue completeness, tectonic exposure, observation duration, or hazard.';
    }

    function enhanceDensityCells() {
      const cells = $$('.pulse-density-cell', densityGroup);
      if (!cells.length) return;
      const records = cells.map(cell => {
        if (!cell.dataset.pulseRawDensity) cell.dataset.pulseRawDensity = cell.style.getPropertyValue('--pulse-density') || '.2';
        const count = Number(cell.dataset.count) || 0;
        const geometry = cellGeometry(cell);
        const densityPerM = geometry.areaKm2 > 0 ? count / (geometry.areaKm2 / 1_000_000) : 0;
        return { cell, count, geometry, densityPerM };
      });
      const maxDensity = Math.max(1e-9, ...records.map(item => item.densityPerM));
      const densityActive = effectiveRepresentation() === 'density';
      records.forEach(({ cell, count, geometry, densityPerM }) => {
        if (measureMode === 'area') {
          const alpha = 0.14 + 0.72 * Math.sqrt(densityPerM / maxDensity);
          cell.style.setProperty('--pulse-density', alpha.toFixed(3));
        } else {
          cell.style.setProperty('--pulse-density', cell.dataset.pulseRawDensity || '.2');
        }
        cell.setAttribute('tabindex', densityActive ? '0' : '-1');
        cell.setAttribute('role', densityActive ? 'button' : 'img');
        cell.setAttribute('aria-label', `${count} visible event${count === 1 ? '' : 's'}; ${coordinate(geometry.lon0, 'E', 'W')} to ${coordinate(geometry.lon1, 'E', 'W')}; ${coordinate(geometry.lat0, 'N', 'S')} to ${coordinate(geometry.lat1, 'N', 'S')}; approximate cell area ${fmt.format(geometry.areaKm2)} square kilometres; spatial density ${fmt1.format(densityPerM)} events per one million square kilometres`);
        const title = $('title', cell);
        if (title) title.textContent = measureMode === 'area'
          ? `${fmt1.format(densityPerM)} visible events / 1,000,000 km² · raw count ${count} · approx area ${fmt.format(geometry.areaKm2)} km²`
          : `${count} visible event${count === 1 ? '' : 's'} · 12° × 10° angular cell · approx area ${fmt.format(geometry.areaKm2)} km²`;
      });
      densityGroup.setAttribute('aria-hidden', densityActive ? 'false' : 'true');
      densityGroup.setAttribute('aria-label', densityActive ? `Interactive ${measureMode === 'area' ? 'area-normalized' : 'raw-count'} earthquake aggregation grid` : 'Hidden earthquake aggregation grid');
      densityGroup.style.pointerEvents = densityActive ? 'auto' : 'none';
      if (selectedCell && selectedCell.isConnected) inspectCell(selectedCell);
    }

    function syncMeasure() {
      const densityActive = effectiveRepresentation() === 'density';
      root.dataset.pulseMeasure = measureMode;
      measure.dataset.active = densityActive ? 'true' : 'false';
      $$('[data-pulse-measure]', measure).forEach(button => {
        const active = button.dataset.pulseMeasure === measureMode;
        button.setAttribute('aria-pressed', String(active));
        button.disabled = !densityActive;
      });
      enhanceDensityCells();
    }

    function syncInference() {
      const representation = effectiveRepresentation();
      const requested = requestedRepresentation();
      const visible = visibleNumber();
      const object = $('[data-pulse-object]', summary);
      const question = $('[data-pulse-question]', summary);
      const boundary = $('[data-pulse-boundary]', summary);
      const aggregate = $('[data-pulse-chain-aggregate]', chain);
      const unit = $('[data-pulse-chain-unit]', chain);
      const read = $('[data-pulse-chain-read]', chain);
      const valid = $('[data-pulse-chain-valid]', chain);
      $('[data-pulse-chain-window]', chain).textContent = cutoffLabel();
      $('[data-pulse-chain-filter]', chain).textContent = filterLabel();

      if (representation === 'density') {
        if (measureMode === 'area') {
          object.textContent = 'AREA-NORMALIZED ANGULAR CELLS';
          question.textContent = 'How concentrated is the current visible event set after correcting each angular cell only for its surface area?';
          boundary.textContent = 'spatial density ≠ occurrence rate / hazard';
          aggregate.textContent = '12° × 10° / AREA';
          unit.textContent = 'events per 10⁶ km²';
          read.textContent = 'SPATIAL DENSITY';
          valid.textContent = 'current visible-set concentration';
        } else {
          object.textContent = 'ANGULAR CELL COUNTS';
          question.textContent = 'How many currently visible event records fall inside each 12° × 10° geographic cell?';
          boundary.textContent = 'cell count ≠ area-normalized density / hazard';
          aggregate.textContent = '12° × 10° COUNT';
          unit.textContent = 'unequal-area angular cells';
          read.textContent = 'CELL COUNTS';
          valid.textContent = 'counts in declared cells';
        }
      } else {
        object.textContent = 'EVENT RECORDS';
        question.textContent = 'Where and when are the currently visible catalogue events in this delivered snapshot?';
        boundary.textContent = 'catalogue ≠ hazard / long-term rate';
        aggregate.textContent = 'NONE';
        unit.textContent = 'individual event records';
        read.textContent = 'POINT PATTERN';
        valid.textContent = 'event geography only';
      }

      chain.dataset.representation = representation;
      chain.dataset.measure = measureMode;
      chain.dataset.requestedRepresentation = requested;
      chain.style.setProperty('--pulse-visible-fraction', String(clamp(visible / Math.max(1, Number(($('.pulse-metrics dd', root)?.textContent || '').replace(/[^0-9]/g, '')) || visible), 0, 1)));
      syncMeasure();
      resetCellReadout();
    }

    // Data provenance is scientific content, never hidden by a layout mode.
    provenance?.removeAttribute('aria-hidden');

    function scheduleSync() {
      if (scheduled) return;
      scheduled = requestAnimationFrame(() => {
        scheduled = 0;
        syncInference();
      });
    }

    nav.addEventListener('click', event => {
      const link = event.target.closest('[data-pulse-jump]');
      if (!link) return;
      event.preventDefault();
      const name = link.dataset.pulseJump;
      const target = name === 'control' ? temporal || filters : name === 'read' ? aggregation : provenance;
      target?.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    });

    measure.addEventListener('click', event => {
      const button = event.target.closest('[data-pulse-measure]');
      if (!button || button.disabled) return;
      measureMode = button.dataset.pulseMeasure === 'area' ? 'area' : 'count';
      updateUrl({ pulseMeasure:measureMode });
      syncInference();
    });

    densityGroup.addEventListener('pointerenter', event => {
      const cell = event.target.closest('.pulse-density-cell');
      if (cell) inspectCell(cell);
    }, true);
    densityGroup.addEventListener('focusin', event => {
      const cell = event.target.closest('.pulse-density-cell');
      if (cell) inspectCell(cell);
    });
    densityGroup.addEventListener('click', event => {
      const cell = event.target.closest('.pulse-density-cell');
      if (!cell) return;
      inspectCell(cell);
      cell.focus({ preventScroll:true });
    });

    const controlHandler = () => scheduleSync();
    timeline.addEventListener('input', controlHandler);
    magnitude?.addEventListener('change', controlHandler);
    depth?.addEventListener('change', controlHandler);
    status?.addEventListener('change', controlHandler);
    filters.addEventListener('click', controlHandler);

    const densityObserver = new MutationObserver(scheduleSync);
    densityObserver.observe(densityGroup, { childList:true });
    const representationObserver = new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'data-representation')) scheduleSync();
    });
    representationObserver.observe(root, { attributes:true, attributeFilter:['data-representation'] });
    const visibleObserver = visibleCount ? new MutationObserver(scheduleSync) : null;
    if (visibleCount) visibleObserver.observe(visibleCount, { childList:true, subtree:true, characterData:true });
    syncInference();

    stage._pulseRound6Cleanup = () => {
      if (scheduled) cancelAnimationFrame(scheduled);
      densityObserver.disconnect();
      representationObserver.disconnect();
      visibleObserver?.disconnect();
      timeline.removeEventListener('input', controlHandler);
      magnitude?.removeEventListener('change', controlHandler);
      depth?.removeEventListener('change', controlHandler);
      status?.removeEventListener('change', controlHandler);
    };
  }

  function scan() {
    const stage = $('#instrumentStage');
    if (!stage) return;
    const root = $('.pulse-observation-lab[data-state="ready"]', stage);
    if (!root) {
      if (stage.dataset.pulseRound6 === '1') {
        stage._pulseRound6Cleanup?.();
        delete stage._pulseRound6Cleanup;
        delete stage.dataset.pulseRound6;
      }
      return;
    }
    refine(stage, root);
  }

  ensureStyle();
  scan();
  const observer = new MutationObserver(scan);
  observer.observe($('#instrumentStage') || document.documentElement, { childList:true, subtree:true });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    const stage = $('#instrumentStage');
    stage?._pulseRound6Cleanup?.();
  }, { once:true });
  window.GeoPulseRound6 = { version:VERSION };
})();