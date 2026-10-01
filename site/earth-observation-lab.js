(() => {
  'use strict';

  const VERSION = '20261001a';
  const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const layers = [
    {
      id:'terra-true', label:'True color', short:'TERRA / TRUE COLOR', group:'VISUAL',
      layer:'MODIS_Terra_CorrectedReflectance_TrueColor', format:'image/jpeg', mode:'base', lag:2, start:'2000-02-24', resolution:'250 m nominal', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Terra / MODIS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'Cloud, atmosphere, overpass time, swath gaps, and compositing condition what is visible. A view date is not one instantaneous photograph.',
      note:'A familiar optical view. Read clouds and acquisition gaps as part of the observation, not as missing decoration.'
    },
    {
      id:'viirs-true', label:'True color', short:'SUOMI NPP / TRUE COLOR', group:'VISUAL',
      layer:'VIIRS_SNPP_CorrectedReflectance_TrueColor', format:'image/jpeg', mode:'base', lag:1, start:'2015-11-24', resolution:'250 m nominal', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Suomi NPP / VIIRS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'Cloud and orbit geometry affect coverage. Near-real-time imagery can lag the selected UTC date and may be revised upstream.',
      note:'Higher-revisit optical context from VIIRS, useful for comparing the sensor/time relationship against MODIS.'
    },
    {
      id:'false-color', label:'False color 7-2-1', short:'TERRA / BANDS 7-2-1', group:'VISUAL',
      layer:'MODIS_Terra_CorrectedReflectance_Bands721', format:'image/jpeg', mode:'base', lag:2, start:'2000-02-24', resolution:'250–500 m band-dependent', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Terra / MODIS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'False-color composites are interpretive products: displayed color is not literal visible color and depends on the band assignment.',
      note:'A deliberately non-literal composite that makes surface and burn/scar contrasts easier to inspect.'
    },
    {
      id:'surface-temp', label:'Land surface temperature', short:'NOAA-20 / LST DAY', group:'THERMAL',
      layer:'VIIRS_NOAA20_Land_Surface_Temp_Day', format:'image/png', mode:'overlay', lag:2, start:'2018-01-05', resolution:'750 m nominal product scale', cadence:'DAILY / DAYTIME', opacity:.76,
      source:'NASA EOSDIS GIBS · NOAA-20 / VIIRS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'Land-surface temperature is skin temperature, not 2 m air temperature. Clouds create retrieval gaps and local time varies with overpass.',
      note:'Thermal retrieval over land. It should not be read as weather-station air temperature.'
    },
    {
      id:'precip', label:'Precipitation rate', short:'IMERG / PRECIPITATION', group:'ATMOSPHERE',
      layer:'IMERG_Precipitation_Rate', format:'image/png', mode:'overlay', lag:3, start:'2000-06-01', resolution:'0.1° product grid', cadence:'HALF-HOURLY SOURCE / DAILY VIEW', opacity:.82,
      source:'NASA GPM IMERG via EOSDIS GIBS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'IMERG combines satellite precipitation estimates. Retrieval uncertainty varies by precipitation regime, surface, sensor availability, and latency.',
      note:'A precipitation estimate, not a rain-gauge field. The global picture is a modeled/merged observation product.'
    },
    {
      id:'aerosol', label:'Aerosol optical depth', short:'AQUA / AOD 3 KM', group:'ATMOSPHERE',
      layer:'MODIS_Aqua_Aerosol_Optical_Depth_3km', format:'image/png', mode:'overlay', lag:3, start:'2002-07-04', resolution:'3 km nominal retrieval', cadence:'DAILY / ORBIT RETRIEVAL', opacity:.76,
      source:'NASA EOSDIS GIBS · Aqua / MODIS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'AOD is column-integrated optical loading, not ground-level PM2.5. Clouds, bright surfaces, and retrieval screening create spatial gaps.',
      note:'Atmospheric optical loading. Empty areas can mean screening or no valid retrieval, not zero aerosol.'
    },
    {
      id:'snow', label:'Snow cover', short:'SUOMI NPP / NDSI', group:'CRYOSPHERE',
      layer:'VIIRS_SNPP_NDSI_Snow_Cover', format:'image/png', mode:'overlay', lag:2, start:'2012-01-19', resolution:'375 m nominal product scale', cadence:'DAILY / DAYTIME', opacity:.8,
      source:'NASA EOSDIS GIBS · Suomi NPP / VIIRS', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'NDSI snow mapping is affected by cloud, illumination, forests, terrain, and classification thresholds. It is not snow depth.',
      note:'A categorical/continuous snow signal derived from spectral contrast, distinct from depth or water equivalent.'
    },
    {
      id:'chlorophyll', label:'Chlorophyll-a', short:'PACE OCI / OCEAN COLOR', group:'OCEAN',
      layer:'OCI_PACE_Chlorophyll_a', format:'image/png', mode:'overlay', lag:3, start:'2024-03-01', resolution:'~1 km mapped product', cadence:'DAILY / OCEAN COLOR', opacity:.82,
      source:'NASA EOSDIS GIBS · PACE / OCI', sourceUrl:'https://worldview.earthdata.nasa.gov/',
      limit:'Satellite chlorophyll is an algorithmic ocean-color estimate. Clouds, aerosols, sun glint, coastal water complexity, and algorithm choice affect retrievals.',
      note:'Ocean-color estimate of chlorophyll-a, useful for reading biological patterns without treating color as direct concentration measurement.'
    }
  ];

  const byId = new Map(layers.map(layer => [layer.id, layer]));
  const groups = ['VISUAL','THERMAL','ATMOSPHERE','CRYOSPHERE','OCEAN'];

  function ensureStyle() {
    if (document.querySelector('link[data-earth-observation-lab]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = `earth-observation-lab.css?v=${VERSION}`;
    link.dataset.earthObservationLab = '1';
    document.head.appendChild(link);
  }

  const pad = n => String(n).padStart(2,'0');
  const day = date => `${date.getUTCFullYear()}-${pad(date.getUTCMonth()+1)}-${pad(date.getUTCDate())}`;
  const utcDate = value => new Date(`${value}T00:00:00Z`);
  const addDays = (date, amount) => new Date(date.getTime() + amount * 86400000);
  const clampDate = (date, min, max) => date < min ? min : date > max ? max : date;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function latestDate(layer) {
    const now = new Date();
    return utcDate(day(addDays(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())), -layer.lag)));
  }

  function getInitialState() {
    const url = new URL(location.href);
    const layer = byId.get(url.searchParams.get('earthLayer')) || layers[0];
    const latest = latestDate(layer);
    const requested = url.searchParams.get('earthDate');
    const parsed = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? utcDate(requested) : latest;
    const min = utcDate(layer.start);
    const primary = clampDate(parsed, min, latest);
    const compareOffset = Math.max(1, Math.min(365, Number(url.searchParams.get('earthOffset') || 7) || 7));
    return {
      layerId: layer.id,
      date: primary,
      compare: url.searchParams.get('earthCompare') === '1',
      compareOffset,
      split: Math.max(12, Math.min(88, Number(url.searchParams.get('earthSplit') || 50) || 50)),
      playing:false,
      speed:1100,
      showGrid:true,
      overlayOpacity:layer.opacity ?? 1,
      probe:null
    };
  }

  function wmsUrl(layerName, dateValue, { format='image/png', transparent=true, width=1600, height=800 } = {}) {
    const params = new URLSearchParams({
      service:'WMS', version:'1.1.1', request:'GetMap', layers:layerName, styles:'',
      format, transparent:String(transparent), srs:'EPSG:4326', bbox:'-180,-90,180,90',
      width:String(width), height:String(height), time:day(dateValue)
    });
    return `${GIBS_WMS}?${params.toString()}`;
  }

  function setConditions() {
    const lab = window.GEOGEEK_DATA?.en?.ui?.lab;
    if (!lab?.conditions) return;
    lab.conditions.earth = [
      ['EXTENT','GLOBAL · EPSG:4326'],
      ['TIME','DATE-CONTROLLED · UTC'],
      ['SOURCE','NASA EOSDIS GIBS'],
      ['METHOD','SWIPE COMPARE · SENSOR-AWARE']
    ];
  }

  async function mountEnhancedEarth({ signal, stage } = {}) {
    if (!stage || signal?.aborted) return () => {};
    ensureStyle();
    const state = getInitialState();
    let timer = null;
    let loadGeneration = 0;
    let keyHandler = null;
    let dragPointer = null;

    stage.innerHTML = `
      <div class="earth-observation-lab">
        <section class="earth-observation-canvas" aria-label="Temporal Earth observation">
          <header class="earth-observation-hud">
            <div><span>OBSERVATION</span><strong id="eoHudLayer">—</strong></div>
            <div><span>VIEW DATE</span><strong id="eoHudDate">—</strong></div>
            <div><span>REFERENCE</span><strong id="eoHudReference">OFF</strong></div>
            <button type="button" id="eoReset" class="eo-quiet-button">RESET</button>
          </header>

          <div class="earth-observation-frame" id="eoFrame">
            <div class="eo-image-stack eo-image-a" id="eoImageA" aria-label="Primary observation"></div>
            <div class="eo-image-stack eo-image-b" id="eoImageB" aria-label="Reference observation"></div>
            <div class="eo-loading" id="eoLoading" aria-live="polite"><i></i><span>REQUESTING OBSERVATION</span></div>
            <div class="eo-graticule" id="eoGraticule" aria-hidden="true"></div>
            <div class="eo-probe" id="eoProbe" hidden><i></i><span id="eoProbeLabel"></span></div>
            <button class="eo-compare-handle" id="eoCompareHandle" type="button" role="slider" aria-label="Comparison split" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50" hidden><span></span></button>
            <div class="eo-map-label eo-label-a"><span>A</span><b id="eoLabelA">—</b></div>
            <div class="eo-map-label eo-label-b" id="eoLabelBWrap" hidden><span>B</span><b id="eoLabelB">—</b></div>
            <div class="eo-frame-note"><span>DISPLAY / EPSG:4326</span><span>CLICK TO PROBE LON/LAT</span></div>
          </div>

          <footer class="earth-timeline" aria-label="Observation timeline">
            <div class="eo-timeline-controls">
              <button type="button" id="eoPrev" aria-label="Previous day">−1D</button>
              <button type="button" id="eoPlay" aria-pressed="false">PLAY</button>
              <button type="button" id="eoNext" aria-label="Next day">+1D</button>
              <button type="button" id="eoLatest">LATEST</button>
            </div>
            <div class="eo-timeline-track">
              <div class="eo-timeline-head"><span id="eoCoverageStart">—</span><strong id="eoTimelineDate">—</strong><span id="eoCoverageEnd">—</span></div>
              <input id="eoRange" type="range" min="0" max="120" value="0" step="1" aria-label="Days before latest available observation" />
              <div class="eo-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <label class="eo-date-input">UTC DATE<input id="eoDate" type="date" /></label>
          </footer>
        </section>

        <aside class="earth-observation-panel">
          <section class="eo-panel-card eo-layer-card">
            <div class="eo-panel-head"><div><span>OBSERVATION LAYERS</span><strong>Choose what the sensor means.</strong></div><em id="eoLayerMode">VISUAL</em></div>
            <div class="eo-layer-groups" id="eoLayerGroups" role="tablist" aria-label="Observation layer categories"></div>
            <div class="eo-layer-list" id="eoLayerList"></div>
          </section>

          <section class="eo-panel-card">
            <div class="eo-panel-head"><div><span>COMPARE</span><strong>Change requires a reference.</strong></div><em id="eoCompareState">OFF</em></div>
            <button type="button" class="eo-compare-toggle" id="eoCompare" aria-pressed="false"><i></i><span><b>SWIPE A / B</b><small>Same layer, two UTC dates</small></span></button>
            <div class="eo-compare-presets" id="eoComparePresets" aria-label="Reference date offset">
              <button type="button" data-offset="1">1 DAY</button>
              <button type="button" data-offset="7" class="is-active">7 DAYS</button>
              <button type="button" data-offset="30">30 DAYS</button>
            </div>
            <div class="eo-opacity" id="eoOpacityWrap" hidden><label for="eoOpacity">OVERLAY OPACITY</label><output id="eoOpacityValue">76%</output><input id="eoOpacity" type="range" min="15" max="100" value="76" step="1" /></div>
          </section>

          <section class="eo-panel-card">
            <div class="eo-panel-head"><div><span>MAP READING</span><strong>Separate geometry from observation.</strong></div></div>
            <div class="eo-map-tools">
              <button type="button" id="eoGrid" class="is-active" aria-pressed="true">GRATICULE</button>
              <button type="button" id="eoClearProbe">CLEAR PROBE</button>
            </div>
            <p class="eo-layer-note" id="eoLayerNote"></p>
          </section>

          <section class="eo-panel-card eo-inspector">
            <div class="eo-panel-head"><div><span>OBSERVATION CONDITIONS</span><strong id="eoInspectorTitle">—</strong></div><em>GIBS</em></div>
            <dl id="eoInspectorMeta"></dl>
            <div class="eo-probe-readout" id="eoProbeReadout"><span>GEOMETRIC PROBE</span><strong>CLICK THE MAP</strong><small>No pixel-value decoding; coordinates describe location, not measurement value.</small></div>
            <a id="eoSourceLink" target="_blank" rel="noreferrer">OPEN IN NASA WORLDVIEW ↗</a>
          </section>
        </aside>
      </div>`;

    const frame = $('#eoFrame', stage);
    const stackA = $('#eoImageA', stage);
    const stackB = $('#eoImageB', stage);
    const loading = $('#eoLoading', stage);
    const graticule = $('#eoGraticule', stage);
    const handle = $('#eoCompareHandle', stage);
    const labelBWrap = $('#eoLabelBWrap', stage);
    const range = $('#eoRange', stage);
    const dateInput = $('#eoDate', stage);
    const playButton = $('#eoPlay', stage);
    const prevButton = $('#eoPrev', stage);
    const nextButton = $('#eoNext', stage);
    const latestButton = $('#eoLatest', stage);
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
    let activeGroup = byId.get(state.layerId)?.group || 'VISUAL';

    function currentLayer() { return byId.get(state.layerId) || layers[0]; }
    function boundsFor(layer=currentLayer()) { return { min:utcDate(layer.start), max:latestDate(layer) }; }
    function compareDate() {
      const { min } = boundsFor();
      return addDays(state.date, -state.compareOffset) < min ? min : addDays(state.date, -state.compareOffset);
    }

    function persist() {
      const url = new URL(location.href);
      url.searchParams.set('earthLayer', state.layerId);
      url.searchParams.set('earthDate', day(state.date));
      if (state.compare) url.searchParams.set('earthCompare','1'); else url.searchParams.delete('earthCompare');
      url.searchParams.set('earthOffset', String(state.compareOffset));
      if (state.compare) url.searchParams.set('earthSplit', String(Math.round(state.split))); else url.searchParams.delete('earthSplit');
      history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
    }

    function frameImages(layer, dateValue) {
      const parts = [];
      if (layer.mode === 'overlay') {
        parts.push({ role:'context', src:wmsUrl('MODIS_Terra_CorrectedReflectance_TrueColor', dateValue, {format:'image/jpeg',transparent:false}), opacity:1 });
        parts.push({ role:'observation', src:wmsUrl(layer.layer, dateValue, {format:layer.format,transparent:true}), opacity:state.overlayOpacity });
      } else {
        parts.push({ role:'observation', src:wmsUrl(layer.layer, dateValue, {format:layer.format,transparent:false}), opacity:1 });
      }
      return parts;
    }

    function renderStack(container, entries, altPrefix) {
      container.innerHTML = entries.map((entry, index) => `<img data-eo-role="${entry.role}" alt="${esc(`${altPrefix}${index ? ' overlay' : ''}`)}" referrerpolicy="no-referrer" draggable="false" style="opacity:${entry.opacity}" />`).join('');
      return $$('img', container);
    }

    function preload(src) {
      return new Promise(resolve => {
        const img = new Image();
        img.referrerPolicy = 'no-referrer';
        img.onload = () => resolve({ ok:true, src });
        img.onerror = () => resolve({ ok:false, src });
        img.src = src;
      });
    }

    async function renderImages() {
      if (signal?.aborted) return;
      const generation = ++loadGeneration;
      const layer = currentLayer();
      const aEntries = frameImages(layer, state.date);
      const bEntries = frameImages(layer, compareDate());
      const sources = [...aEntries, ...(state.compare ? bEntries : [])].map(item => item.src);
      loading.hidden = false;
      loading.dataset.state = 'loading';
      const results = await Promise.all(sources.map(preload));
      if (generation !== loadGeneration || signal?.aborted) return;
      const failed = results.some(result => !result.ok);
      const aImages = renderStack(stackA, aEntries, `${layer.short} ${day(state.date)}`);
      const bImages = state.compare ? renderStack(stackB, bEntries, `${layer.short} ${day(compareDate())}`) : [];
      aImages.forEach((img, i) => { img.src = aEntries[i].src; });
      bImages.forEach((img, i) => { img.src = bEntries[i].src; });
      loading.hidden = true;
      loading.dataset.state = failed ? 'error' : 'ready';
      stackB.hidden = !state.compare;
      handle.hidden = !state.compare;
      labelBWrap.hidden = !state.compare;
      updateSplit();
      const status = document.querySelector('.instrument-status');
      if (status) {
        status.dataset.state = failed ? 'error' : 'live';
        status.textContent = failed ? 'STATUS / ERROR' : `STATUS / LIVE · UPDATED ${day(state.date)} UTC`;
      }
      const { min } = boundsFor(layer);
      const next = addDays(state.date, -1);
      if (next >= min) frameImages(layer, next).forEach(entry => { const img = new Image(); img.referrerPolicy='no-referrer'; img.src=entry.src; });
    }

    function updateSplit() {
      stackB.style.clipPath = `inset(0 0 0 ${state.split}%)`;
      handle.style.left = `${state.split}%`;
      handle.setAttribute('aria-valuenow', String(Math.round(state.split)));
    }

    function renderGroups() {
      groupList.innerHTML = groups.map(group => `<button type="button" role="tab" aria-selected="${group===activeGroup}" class="${group===activeGroup?'is-active':''}" data-group="${group}">${group}</button>`).join('');
    }

    function renderLayerList() {
      layerList.innerHTML = layers.filter(layer => layer.group === activeGroup).map(layer => `
        <button type="button" class="eo-layer ${layer.id===state.layerId?'is-active':''}" data-earth-layer="${layer.id}" aria-pressed="${layer.id===state.layerId}">
          <i></i><span><strong>${esc(layer.label)}</strong><small>${esc(layer.short)}</small></span><em>${esc(layer.resolution)}</em>
        </button>`).join('');
    }

    function renderInspector() {
      const layer = currentLayer();
      const reference = compareDate();
      $('#eoInspectorTitle',stage).textContent = layer.label;
      $('#eoInspectorMeta',stage).innerHTML = [
        ['SOURCE', layer.source],
        ['TIME', `${day(state.date)} UTC · ${layer.cadence}`],
        ['RESOLUTION', layer.resolution],
        ['PROJECTION', 'EPSG:4326 · plate carrée display'],
        ['COMPARE', state.compare ? `${day(reference)} ↔ ${day(state.date)} · ${state.compareOffset} day offset` : 'OFF · one observation date'],
        ['LIMIT', layer.limit]
      ].map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('');
      $('#eoSourceLink',stage).href = layer.sourceUrl;
      $('#eoLayerNote',stage).textContent = layer.note;
      $('#eoLayerMode',stage).textContent = layer.group;
      opacityWrap.hidden = layer.mode !== 'overlay';
      opacity.value = String(Math.round((state.overlayOpacity || layer.opacity || 1) * 100));
      opacityValue.textContent = `${opacity.value}%`;
    }

    function renderProbe() {
      if (!state.probe) {
        probe.hidden = true;
        probeReadout.innerHTML = '<span>GEOMETRIC PROBE</span><strong>CLICK THE MAP</strong><small>No pixel-value decoding; coordinates describe location, not measurement value.</small>';
        return;
      }
      const { lon, lat, xPct, yPct } = state.probe;
      const lonLabel = `${Math.abs(lon).toFixed(2)}° ${lon >= 0 ? 'E' : 'W'}`;
      const latLabel = `${Math.abs(lat).toFixed(2)}° ${lat >= 0 ? 'N' : 'S'}`;
      probe.hidden = false;
      probe.style.left = `${xPct}%`;
      probe.style.top = `${yPct}%`;
      probeLabel.textContent = `${latLabel} · ${lonLabel}`;
      probeReadout.innerHTML = `<span>GEOMETRIC PROBE</span><strong>${latLabel} · ${lonLabel}</strong><small>Location only. The rendered WMS image is not decoded into a numeric science value.</small>`;
    }

    function renderState({ images=true, url=true } = {}) {
      const layer = currentLayer();
      const { min, max } = boundsFor(layer);
      state.date = clampDate(state.date, min, max);
      const age = Math.max(0, Math.round((max - state.date) / 86400000));
      range.max = String(Math.max(120, age));
      range.value = String(age);
      dateInput.min = day(min);
      dateInput.max = day(max);
      dateInput.value = day(state.date);
      $('#eoCoverageStart',stage).textContent = layer.start;
      $('#eoCoverageEnd',stage).textContent = `LATEST ${day(max)}`;
      $('#eoTimelineDate',stage).textContent = day(state.date);
      $('#eoHudLayer',stage).textContent = layer.short;
      $('#eoHudDate',stage).textContent = `${day(state.date)} UTC`;
      $('#eoHudReference',stage).textContent = state.compare ? `${day(compareDate())} · ${state.compareOffset}D` : 'OFF';
      $('#eoLabelA',stage).textContent = day(state.date);
      $('#eoLabelB',stage).textContent = day(compareDate());
      compareButton.classList.toggle('is-active', state.compare);
      compareButton.setAttribute('aria-pressed', String(state.compare));
      compareState.textContent = state.compare ? 'A / B' : 'OFF';
      nextButton.disabled = day(state.date) >= day(max);
      prevButton.disabled = day(state.date) <= day(min);
      $$('#eoComparePresets [data-offset]',stage).forEach(button => button.classList.toggle('is-active', Number(button.dataset.offset) === state.compareOffset));
      renderGroups();
      renderLayerList();
      renderInspector();
      renderProbe();
      updateSplit();
      if (url) persist();
      if (images) renderImages();
    }

    function setDate(next, options={}) {
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
      if (state.playing) {
        timer = setInterval(() => {
          const { min, max } = boundsFor();
          const next = addDays(state.date, 1);
          setDate(next > max ? min : next);
        }, state.speed);
      }
    }

    stage.addEventListener('click', event => {
      const layerButton = event.target.closest?.('[data-earth-layer]');
      if (layerButton) {
        const next = byId.get(layerButton.dataset.earthLayer);
        if (!next) return;
        state.layerId = next.id;
        activeGroup = next.group;
        state.date = latestDate(next);
        state.overlayOpacity = next.opacity ?? 1;
        state.probe = null;
        togglePlay(false);
        renderState();
        return;
      }
      const groupButton = event.target.closest?.('[data-group]');
      if (groupButton) {
        activeGroup = groupButton.dataset.group;
        renderGroups();
        renderLayerList();
        return;
      }
      const offsetButton = event.target.closest?.('[data-offset]');
      if (offsetButton) {
        state.compareOffset = Number(offsetButton.dataset.offset);
        state.compare = true;
        renderState();
      }
    });

    range.addEventListener('input', () => {
      const max = boundsFor().max;
      setDate(addDays(max, -Number(range.value)));
    });
    dateInput.addEventListener('change', () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) setDate(utcDate(dateInput.value));
    });
    prevButton.addEventListener('click', () => setDate(addDays(state.date,-1)));
    nextButton.addEventListener('click', () => setDate(addDays(state.date,1)));
    latestButton.addEventListener('click', () => setDate(boundsFor().max));
    playButton.addEventListener('click', () => togglePlay());
    compareButton.addEventListener('click', () => { state.compare = !state.compare; renderState(); });
    gridButton.addEventListener('click', () => {
      state.showGrid = !state.showGrid;
      graticule.hidden = !state.showGrid;
      gridButton.classList.toggle('is-active', state.showGrid);
      gridButton.setAttribute('aria-pressed', String(state.showGrid));
    });
    opacity.addEventListener('input', () => {
      state.overlayOpacity = Number(opacity.value) / 100;
      opacityValue.textContent = `${opacity.value}%`;
      $$('[data-eo-role="observation"]', stage).forEach(img => { if (currentLayer().mode === 'overlay') img.style.opacity = state.overlayOpacity; });
      renderInspector();
    });
    clearProbeButton.addEventListener('click', () => { state.probe = null; renderProbe(); });
    resetButton.addEventListener('click', () => {
      const layer = layers[0];
      state.layerId = layer.id;
      activeGroup = layer.group;
      state.date = latestDate(layer);
      state.compare = false;
      state.compareOffset = 7;
      state.split = 50;
      state.overlayOpacity = 1;
      state.probe = null;
      state.showGrid = true;
      graticule.hidden = false;
      gridButton.classList.add('is-active');
      togglePlay(false);
      renderState();
    });

    frame.addEventListener('click', event => {
      if (event.target.closest?.('.eo-compare-handle')) return;
      const rect = frame.getBoundingClientRect();
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const lon = (x / rect.width) * 360 - 180;
      const lat = 90 - (y / rect.height) * 180;
      state.probe = { lon, lat, xPct:(x/rect.width)*100, yPct:(y/rect.height)*100 };
      renderProbe();
    });

    function setSplitFromPointer(event) {
      const rect = frame.getBoundingClientRect();
      state.split = Math.max(5, Math.min(95, ((event.clientX - rect.left) / rect.width) * 100));
      updateSplit();
      persist();
    }
    handle.addEventListener('pointerdown', event => {
      dragPointer = event.pointerId;
      handle.setPointerCapture?.(event.pointerId);
      setSplitFromPointer(event);
      event.stopPropagation();
    });
    handle.addEventListener('pointermove', event => { if (dragPointer === event.pointerId) setSplitFromPointer(event); });
    handle.addEventListener('pointerup', event => { if (dragPointer === event.pointerId) { dragPointer = null; handle.releasePointerCapture?.(event.pointerId); } });
    handle.addEventListener('pointercancel', () => { dragPointer = null; });
    handle.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
        event.preventDefault();
        state.split = Math.max(5, Math.min(95, state.split + (event.key === 'ArrowLeft' ? -5 : 5)));
        updateSplit();
        persist();
      }
    });

    keyHandler = event => {
      if (!stage.isConnected || event.target?.matches?.('input,textarea,select,button')) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
      if (event.key === 'ArrowLeft') setDate(addDays(state.date,-1));
      if (event.key === 'ArrowRight') setDate(addDays(state.date,1));
      if (event.key.toLowerCase() === 'c') { state.compare = !state.compare; renderState(); }
      if (event.key.toLowerCase() === 'g') { gridButton.click(); }
    };
    document.addEventListener('keydown', keyHandler);

    renderState({ images:true, url:true });

    return () => {
      clearInterval(timer);
      loadGeneration += 1;
      document.removeEventListener('keydown', keyHandler);
      stage.innerHTML = '';
    };
  }

  ensureStyle();
  setConditions();
  window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  window.GeoGeekInstrumentMounts.earth = mountEnhancedEarth;
  window.GeoEarthTemporalLab = { version:VERSION, mount:mountEnhancedEarth, layers };
})();