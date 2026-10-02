import {
  MIN_ZOOM, addDays, bboxArray, bboxLabel, clampDate, compareDate,
  dateBounds, day, daysBetween, esc, getInitialState, normalizeCamera,
  opacityFor, safeDate, utcDate, viewportBounds, requestDimensions
} from './model.js';
import { earthTemplate } from './template.js';
import { createMapCamera, renderGraticule } from './map-camera.js';
import { createImageLoader, frameEntries, renderStack } from './raster.js';

const WORLDVIEW = 'https://worldview.earthdata.nasa.gov/';
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

export function createEarthObservationModule(supply) {
  const dataset = supply?.get?.('nasa-gibs');
  const layers = supply?.products?.('nasa-gibs') || [];
  if (!supply?.installed || !dataset || !layers.length) return null;

  const byId = new Map(layers.map(layer => [layer.id, layer]));
  const groups = [...new Set(layers.map(layer => layer.group))];
  const contextLayer = byId.get('terra-true') || layers.find(layer => layer.renderMode === 'base') || layers[0];
  const endpoint = new URL('wms/epsg4326/best/wms.cgi', dataset.upstream).href;

  function setConditions() {
    const lab = window.GEOGEEK_DATA?.en?.ui?.lab;
    if (!lab?.conditions) return;
    lab.conditions.earth = [
      ['EXTENT', 'GLOBAL RESET / INTERACTIVE VIEWPORT · EPSG:4326'],
      ['TIME', 'DATE-CONTROLLED · PRODUCT-SPECIFIC SAFE WINDOW'],
      ['SOURCE', dataset.provider],
      ['DELIVERY', `${dataset.delivery} · DATE-SCOPED VIEWPORT WMS`]
    ];
  }

  function setInstrumentStatus(state, text, title) {
    const status = document.querySelector('.instrument-status');
    if (!status) return;
    status.dataset.state = state;
    status.textContent = text;
    status.title = title || '';
  }

  async function mount({ signal, stage } = {}) {
    if (!stage || signal?.aborted) return () => {};
    const state = getInitialState(layers, byId);
    normalizeCamera(state);
    stage.innerHTML = earthTemplate();

    const frameShell = $('#eoFrameShell', stage);
    const frame = $('#eoFrame', stage);
    const stackA = $('#eoImageA', stage);
    const stackB = $('#eoImageB', stage);
    const loading = $('#eoLoading', stage);
    const loadingText = $('#eoLoading span', stage);
    const graticule = $('#eoGraticule', stage);
    const handle = $('#eoCompareHandle', stage);
    const labelBWrap = $('#eoLabelBWrap', stage);
    const range = $('#eoRange', stage);
    const dateInput = $('#eoDate', stage);
    const playButton = $('#eoPlay', stage);
    const prevButton = $('#eoPrev', stage);
    const nextButton = $('#eoNext', stage);
    const recentButton = $('#eoLatest', stage);
    const compareButton = $('#eoCompare', stage);
    const compareState = $('#eoCompareState', stage);
    const layerList = $('#eoLayerList', stage);
    const groupList = $('#eoLayerGroups', stage);
    const opacityWrap = $('#eoOpacityWrap', stage);
    const opacity = $('#eoOpacity', stage);
    const opacityValue = $('#eoOpacityValue', stage);
    const probe = $('#eoProbe', stage);
    const probeLabel = $('#eoProbeLabel', stage);
    const probeReadout = $('#eoProbeReadout', stage);
    const gridButton = $('#eoGrid', stage);
    const clearProbeButton = $('#eoClearProbe', stage);
    const resetButton = $('#eoReset', stage);
    const zoomInButton = $('#eoZoomIn', stage);
    const zoomOutButton = $('#eoZoomOut', stage);
    const fitButton = $('#eoFit', stage);
    const zoomReadout = $('#eoZoomReadout', stage);
    const sourceLink = $('#eoSourceLink', stage);

    let activeGroup = byId.get(state.layerId)?.group || groups[0];
    let timer = null;
    let rangeCommitTimer = null;
    let loadGeneration = 0;
    let activeSupplyRequest = null;
    let comparePointer = null;
    let keyHandler = null;
    let visibilityHandler = null;
    let lastSuccessfulView = null;
    const imageLoader = createImageLoader(signal);

    const currentLayer = () => byId.get(state.layerId) || layers[0];
    const boundsFor = (layer = currentLayer()) => dateBounds(layer);
    const referenceDate = () => compareDate(state, currentLayer());
    const actualOffset = () => daysBetween(state.date, referenceDate());

    function persist() {
      const url = new URL(location.href);
      url.searchParams.set('earthLayer', state.layerId);
      url.searchParams.set('earthDate', day(state.date));
      url.searchParams.set('earthOffset', String(state.compareOffset));
      if (state.compare) {
        url.searchParams.set('earthCompare', '1');
        url.searchParams.set('earthSplit', String(Math.round(state.split)));
      } else {
        url.searchParams.delete('earthCompare');
        url.searchParams.delete('earthSplit');
      }
      if (state.zoom > MIN_ZOOM + .001) {
        url.searchParams.set('earthZ', state.zoom.toFixed(2));
        url.searchParams.set('earthLon', state.centerLon.toFixed(4));
        url.searchParams.set('earthLat', state.centerLat.toFixed(4));
      } else {
        url.searchParams.delete('earthZ');
        url.searchParams.delete('earthLon');
        url.searchParams.delete('earthLat');
      }
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }

    function worldviewLayerList(layer) {
      if (layer.renderMode !== 'overlay') return layer.layer;
      return `${contextLayer.layer},${layer.layer}(opacity=${state.overlayOpacity.toFixed(2)})`;
    }

    function worldviewUrl(layer = currentLayer()) {
      const url = new URL(WORLDVIEW);
      const bounds = viewportBounds(state);
      url.searchParams.set('p', 'geographic');
      url.searchParams.set('v', bboxArray(bounds).map(value => value.toFixed(5)).join(','));
      url.searchParams.set('l', worldviewLayerList(layer));
      url.searchParams.set('t', `${day(state.date)}T00:00:00Z`);
      if (state.compare) {
        url.searchParams.set('l1', worldviewLayerList(layer));
        url.searchParams.set('t1', `${day(referenceDate())}T00:00:00Z`);
        url.searchParams.set('ca', 'true');
        url.searchParams.set('cm', 'swipe');
        url.searchParams.set('cv', String(Math.round(state.split)));
      }
      return url.href;
    }

    function renderSupplyState() {
      const request = supply.describe('nasa-gibs')?.request;
      $('#eoSupplyState', stage).textContent = request?.status === 'requesting'
        ? 'REQUESTING'
        : request?.status === 'unavailable'
          ? 'UNAVAILABLE'
          : 'WMS · VIEWPORT';
    }

    function updateSplit() {
      stackB.style.clipPath = `inset(0 0 0 ${state.split}%)`;
      handle.style.left = `${state.split}%`;
      const value = Math.round(state.split);
      handle.setAttribute('aria-valuenow', String(value));
      handle.setAttribute('aria-valuetext', `${value} percent reveal`);
    }

    function renderGroups() {
      groupList.innerHTML = groups.map((group, index) => {
        const selected = group === activeGroup;
        return `<button id="eoLayerGroup-${index}" type="button" role="tab" aria-selected="${selected}" aria-controls="eoLayerList" tabindex="${selected ? '0' : '-1'}" class="${selected ? 'is-active' : ''}" data-group="${group}">${group}</button>`;
      }).join('');
      const selected = groupList.querySelector('[aria-selected="true"]');
      if (selected) layerList.setAttribute('aria-labelledby', selected.id);
    }

    function renderLayerList() {
      layerList.innerHTML = layers.filter(layer => layer.group === activeGroup).map(layer => `
        <button type="button" class="eo-layer ${layer.id === state.layerId ? 'is-active' : ''}" data-earth-layer="${layer.id}" aria-pressed="${layer.id === state.layerId}">
          <i></i><span><strong>${esc(layer.label)}</strong><small>${esc(layer.short)}</small></span><em>${esc(layer.resolution)}</em>
        </button>`).join('');
    }

    function renderProbe() {
      if (!state.probe) {
        probe.hidden = true;
        probeReadout.innerHTML = '<span>GEOMETRIC PROBE</span><strong>CLICK THE MAP</strong><small>No pixel-value decoding; coordinates describe location, not measurement value.</small>';
        return;
      }
      const { lon, lat, xRatio, yRatio } = state.probe;
      const lonLabel = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
      const latLabel = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      probe.hidden = false;
      probe.style.left = `${xRatio * 100}%`;
      probe.style.top = `${yRatio * 100}%`;
      probeLabel.textContent = `${latLabel} · ${lonLabel}`;
      probeReadout.innerHTML = `<span>GEOMETRIC PROBE</span><strong>${latLabel} · ${lonLabel}</strong><small>Location only. The rendered WMS image is not decoded into a numeric science value.</small>`;
    }

    function renderInspector() {
      const layer = currentLayer();
      const request = supply.describe('nasa-gibs')?.request;
      const dims = requestDimensions(frame);
      const bounds = viewportBounds(state);
      const offset = actualOffset();
      const compareValue = state.compare
        ? `${day(referenceDate())} ↔ ${day(state.date)} · ${offset} actual day${offset === 1 ? '' : 's'}${offset !== state.compareOffset ? ` · requested ${state.compareOffset}, clipped by coverage` : ''}`
        : 'OFF · one observation date';
      $('#eoInspectorTitle', stage).textContent = layer.label;
      $('#eoInspectorMeta', stage).innerHTML = [
        ['SOURCE', layer.source],
        ['TIME', `${day(state.date)} UTC view date · ${layer.cadence}`],
        ['DELIVERY', dataset.delivery],
        ['TRANSPORT', request?.transport === 'provider-raster' ? 'HTTPS WMS 1.1.1 · PROVIDER RASTER' : dataset.transport],
        ['REQUEST STATE', request?.status ? request.status.toUpperCase() : 'IDLE'],
        ['FRESHNESS', layer.freshnessSemantics],
        ['NATIVE RESOLUTION', layer.resolution],
        ['DISPLAY SAMPLE', `${dims.width} × ${dims.height} WMS viewport raster`],
        ['VIEWPORT', `BBOX ${bboxLabel(bounds)} · center ${state.centerLat.toFixed(3)}°, ${state.centerLon.toFixed(3)}° · Z ${state.zoom.toFixed(2)}`],
        ['SCOPE', request?.scope || dataset.scope],
        ['PROJECTION', 'EPSG:4326 · interactive equirectangular viewport'],
        ['COLOR', layer.color],
        ['RECENT-DATE POLICY', `Conservative T-${layer.conservativeLagDays} day request window; this is a selection guard, not a freshness timestamp.`],
        ['COMPARE', compareValue],
        ['LIMIT', layer.limit]
      ].map(([key, value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('');
      sourceLink.href = worldviewUrl(layer);
      $('#eoLayerNote', stage).textContent = layer.note;
      $('#eoLayerMode', stage).textContent = layer.group;
      opacityWrap.hidden = layer.renderMode !== 'overlay';
      opacity.value = String(Math.round(state.overlayOpacity * 100));
      opacityValue.textContent = `${opacity.value}%`;
    }

    async function renderImages() {
      if (signal?.aborted) return;
      const generation = ++loadGeneration;
      imageLoader.cancelForeground();
      activeSupplyRequest?.abort?.({ reason:'superseded' });
      const layer = currentLayer();
      const aEntries = frameEntries({ endpoint, layer, contextLayer, state, frame, dateValue:state.date });
      const bEntries = frameEntries({ endpoint, layer, contextLayer, state, frame, dateValue:referenceDate() });
      const requestedEntries = [...aEntries, ...(state.compare ? bEntries : [])];
      const view = viewportBounds(state);
      const requestToken = supply.beginRequest('nasa-gibs', {
        productId:layer.id,
        transport:'provider-raster',
        observationTime:`${day(state.date)}T00:00:00Z`,
        scope:`VIEWPORT · EPSG:4326 · BBOX ${bboxLabel(view)} · Z ${state.zoom.toFixed(2)} · ${day(state.date)} · ${state.compare ? 'COMPARE' : 'SINGLE'} VIEW`,
        requestUrl:aEntries.at(-1)?.src || null,
        purpose:'foreground-frame'
      });
      activeSupplyRequest = requestToken;
      loading.hidden = false;
      loading.dataset.state = 'loading';
      loadingText.textContent = 'REQUESTING VIEWPORT';
      setInstrumentStatus('loading', `STATUS / REQUESTING · WMS VIEWPORT · ${day(state.date)} UTC`, 'Date-scoped provider WMS request in progress. This is not a LIVE claim.');
      renderSupplyState();
      renderInspector();

      const results = await Promise.all(requestedEntries.map(entry => imageLoader.preload(entry.src)));
      if (generation !== loadGeneration || signal?.aborted || !requestToken.isCurrent()) {
        requestToken.abort({ reason:signal?.aborted ? 'instrument-abort' : 'superseded' });
        return;
      }

      const failures = results.filter(result => !result.ok);
      if (failures.length) {
        requestToken.fail('One or more provider WMS viewport images failed to load.', {
          imageCount:requestedEntries.length,
          failedCount:failures.length,
          bbox:bboxArray(view)
        });
        loading.hidden = false;
        loading.dataset.state = 'error';
        loadingText.textContent = lastSuccessfulView ? 'VIEWPORT UNAVAILABLE · PREVIOUS FRAME RETAINED' : 'VIEWPORT UNAVAILABLE';
        setInstrumentStatus('error', `STATUS / UNAVAILABLE · WMS VIEWPORT · ${day(state.date)} UTC`, 'The requested date-scoped provider viewport was unavailable. No demo data was substituted.');
      } else {
        const aImages = renderStack(stackA, aEntries, `${layer.short} ${day(state.date)}`, esc);
        const bImages = state.compare ? renderStack(stackB, bEntries, `${layer.short} ${day(referenceDate())}`, esc) : [];
        aImages.forEach((image, index) => { image.src = aEntries[index].src; });
        bImages.forEach((image, index) => { image.src = bEntries[index].src; });
        stackB.hidden = !state.compare;
        handle.hidden = !state.compare;
        labelBWrap.hidden = !state.compare;
        updateSplit();
        requestToken.succeed({ imageCount:requestedEntries.length, bbox:bboxArray(view) });
        lastSuccessfulView = { layerId:layer.id, date:day(state.date), bbox:bboxArray(view) };
        loading.hidden = true;
        loading.dataset.state = 'ready';
        setInstrumentStatus('dated', `STATUS / WMS · VIEWPORT · DATE-SCOPED · ${day(state.date)} UTC`, 'Provider WMS viewport loaded for the selected UTC date. Availability does not imply real-time freshness.');
      }
      if (activeSupplyRequest === requestToken) activeSupplyRequest = null;
      renderSupplyState();
      renderInspector();
    }

    function renderState({ images=true, url=true } = {}) {
      const layer = currentLayer();
      const { min, max } = boundsFor(layer);
      state.date = clampDate(state.date, min, max);
      const age = daysBetween(max, state.date);
      range.max = String(Math.max(1, daysBetween(max, min)));
      range.value = String(age);
      dateInput.min = day(min);
      dateInput.max = day(max);
      dateInput.value = day(state.date);
      $('#eoCoverageStart', stage).textContent = layer.availabilityStart;
      $('#eoCoverageEnd', stage).textContent = `SAFE THROUGH ${day(max)}`;
      $('#eoTimelineDate', stage).textContent = day(state.date);
      $('#eoHudLayer', stage).textContent = layer.short;
      $('#eoHudDate', stage).textContent = `${day(state.date)} UTC`;
      const offset = actualOffset();
      $('#eoHudReference', stage).textContent = state.compare ? `${day(referenceDate())} · ${offset}D${offset !== state.compareOffset ? '*' : ''}` : 'OFF';
      $('#eoLabelA', stage).textContent = day(state.date);
      $('#eoLabelB', stage).textContent = day(referenceDate());
      compareButton.classList.toggle('is-active', state.compare);
      compareButton.setAttribute('aria-pressed', String(state.compare));
      compareState.textContent = state.compare ? 'A / B' : 'OFF';
      stackB.hidden = !state.compare;
      handle.hidden = !state.compare;
      labelBWrap.hidden = !state.compare;
      nextButton.disabled = day(state.date) >= day(max);
      prevButton.disabled = day(state.date) <= day(min);
      recentButton.disabled = day(state.date) >= day(max);
      $$('#eoComparePresets [data-offset]', stage).forEach(button => {
        const selected = Number(button.dataset.offset) === state.compareOffset;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
      renderGroups();
      renderLayerList();
      camera.render();
      renderInspector();
      renderProbe();
      updateSplit();
      if (url) persist();
      if (images) renderImages();
    }

    function setDate(next, options = {}) {
      const { min, max } = boundsFor();
      state.date = clampDate(next, min, max);
      state.probe = null;
      renderState(options);
    }

    function togglePlay(force) {
      state.playing = typeof force === 'boolean' ? force : !state.playing;
      clearInterval(timer);
      playButton.classList.toggle('is-active', state.playing);
      playButton.setAttribute('aria-pressed', String(state.playing));
      playButton.textContent = state.playing ? 'PAUSE' : 'PLAY';
      if (!state.playing) return;
      timer = setInterval(() => {
        if (loading.dataset.state === 'loading') return;
        const { min, max } = boundsFor();
        const next = addDays(state.date, 1);
        setDate(next > max ? min : next);
      }, state.speed);
    }

    function selectGroup(group, { focus=false } = {}) {
      if (!groups.includes(group)) return;
      activeGroup = group;
      renderGroups();
      renderLayerList();
      if (focus) groupList.querySelector(`[data-group="${group}"]`)?.focus();
    }

    const camera = createMapCamera({
      state, stage, frameShell, frame, stackA, stackB, graticule,
      zoomIn:zoomInButton, zoomOut:zoomOutButton, fit:fitButton, zoomReadout,
      onCommit:() => { persist(); renderInspector(); renderImages(); },
      onPreview:() => { renderProbe(); renderInspector(); },
      onProbe:geo => { state.probe = geo; renderProbe(); }
    });

    stage.addEventListener('click', event => {
      const layerButton = event.target.closest?.('[data-earth-layer]');
      if (layerButton) {
        const next = byId.get(layerButton.dataset.earthLayer);
        if (!next) return;
        const previousMax = safeDate(currentLayer());
        const wasAtSafeDate = day(state.date) === day(previousMax);
        state.layerId = next.id;
        activeGroup = next.group;
        const nextBounds = boundsFor(next);
        state.date = wasAtSafeDate ? nextBounds.max : clampDate(state.date, nextBounds.min, nextBounds.max);
        state.overlayOpacity = opacityFor(next);
        state.probe = null;
        togglePlay(false);
        renderState();
        return;
      }
      const groupButton = event.target.closest?.('[data-group]');
      if (groupButton) return selectGroup(groupButton.dataset.group);
      const offsetButton = event.target.closest?.('[data-offset]');
      if (offsetButton) {
        state.compareOffset = Number(offsetButton.dataset.offset);
        state.compare = true;
        renderState();
      }
    });

    groupList.addEventListener('keydown', event => {
      const current = event.target.closest?.('[data-group]');
      if (!current) return;
      const index = groups.indexOf(current.dataset.group);
      let nextIndex = -1;
      if (event.key === 'ArrowRight') nextIndex = (index + 1) % groups.length;
      if (event.key === 'ArrowLeft') nextIndex = (index - 1 + groups.length) % groups.length;
      if (event.key === 'Home') nextIndex = 0;
      if (event.key === 'End') nextIndex = groups.length - 1;
      if (nextIndex < 0) return;
      event.preventDefault();
      selectGroup(groups[nextIndex], { focus:true });
    });

    range.addEventListener('input', () => {
      setDate(addDays(boundsFor().max, -Number(range.value)), { images:false, url:false });
      clearTimeout(rangeCommitTimer);
      rangeCommitTimer = setTimeout(() => { rangeCommitTimer = null; renderState({ images:true, url:true }); }, 140);
    });
    range.addEventListener('change', () => {
      clearTimeout(rangeCommitTimer);
      rangeCommitTimer = null;
      renderState({ images:true, url:true });
    });
    dateInput.addEventListener('change', () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) setDate(utcDate(dateInput.value));
    });
    prevButton.addEventListener('click', () => setDate(addDays(state.date, -1)));
    nextButton.addEventListener('click', () => setDate(addDays(state.date, 1)));
    recentButton.addEventListener('click', () => setDate(boundsFor().max));
    playButton.addEventListener('click', () => togglePlay());
    compareButton.addEventListener('click', () => { state.compare = !state.compare; renderState(); });
    gridButton.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      graticule.hidden = !state.showGrid;
      if (state.showGrid) renderGraticule(graticule, state);
      gridButton.classList.toggle('is-active', state.showGrid);
      gridButton.setAttribute('aria-pressed', String(state.showGrid));
    });
    opacity.addEventListener('input', () => {
      state.overlayOpacity = Number(opacity.value) / 100;
      opacityValue.textContent = `${opacity.value}%`;
      $$('[data-eo-role="observation"]', stage).forEach(image => { if (currentLayer().renderMode === 'overlay') image.style.opacity = state.overlayOpacity; });
      renderInspector();
    });
    clearProbeButton.addEventListener('click', () => { state.probe = null; renderProbe(); });
    resetButton.addEventListener('click', () => {
      const layer = layers[0];
      state.layerId = layer.id;
      activeGroup = layer.group;
      state.date = safeDate(layer);
      state.compare = false;
      state.compareOffset = 7;
      state.split = 50;
      state.overlayOpacity = opacityFor(layer);
      state.probe = null;
      state.showGrid = true;
      graticule.hidden = false;
      gridButton.classList.add('is-active');
      gridButton.setAttribute('aria-pressed', 'true');
      togglePlay(false);
      camera.fit({ immediate:false });
      renderState();
    });

    function setSplitFromPointer(event) {
      const rect = frame.getBoundingClientRect();
      if (rect.width < 1) return;
      state.split = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
      updateSplit();
      persist();
      renderInspector();
    }
    handle.addEventListener('pointerdown', event => {
      comparePointer = event.pointerId;
      handle.setPointerCapture?.(event.pointerId);
      setSplitFromPointer(event);
      event.stopPropagation();
    });
    handle.addEventListener('pointermove', event => { if (comparePointer === event.pointerId) setSplitFromPointer(event); });
    handle.addEventListener('pointerup', event => {
      if (comparePointer !== event.pointerId) return;
      comparePointer = null;
      handle.releasePointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointercancel', () => { comparePointer = null; });
    handle.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      if (event.key === 'Home') state.split = 5;
      else if (event.key === 'End') state.split = 95;
      else state.split = Math.max(5, Math.min(95, state.split + (event.key === 'ArrowLeft' ? -5 : 5)));
      updateSplit();
      persist();
      renderInspector();
    });

    keyHandler = event => {
      if (!stage.isConnected || event.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],[role="slider"]')) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
      if (event.key === 'ArrowLeft') setDate(addDays(state.date, -1));
      if (event.key === 'ArrowRight') setDate(addDays(state.date, 1));
      if (event.key.toLowerCase() === 'c') { state.compare = !state.compare; renderState(); }
      if (event.key.toLowerCase() === 'g') gridButton.click();
      if (event.key === '+' || event.key === '=') camera.zoomBy(.75);
      if (event.key === '-') camera.zoomBy(-.75);
      if (event.key === '0') camera.fit();
    };
    document.addEventListener('keydown', keyHandler);
    visibilityHandler = () => { if (document.hidden && state.playing) togglePlay(false); };
    document.addEventListener('visibilitychange', visibilityHandler);

    renderState({ images:true, url:true });
    requestAnimationFrame(camera.sizeFrame);

    return () => {
      clearInterval(timer);
      clearTimeout(rangeCommitTimer);
      loadGeneration += 1;
      activeSupplyRequest?.abort?.({ reason:'instrument-close' });
      imageLoader.cancelAll();
      camera.cleanup();
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      stage.innerHTML = '';
    };
  }

  setConditions();
  return { dataset, layers, mount };
}
