(() => {
  'use strict';

  const VERSION = '20261002b';
  const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';
  const WORLDVIEW = 'https://worldview.earthdata.nasa.gov/';
  const DAY_MS = 86400000;
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const layers = [
    {
      id:'terra-true', label:'True color', short:'TERRA / TRUE COLOR', group:'VISUAL',
      layer:'MODIS_Terra_CorrectedReflectance_TrueColor', format:'image/jpeg', mode:'base', lag:2, start:'2000-02-24', resolution:'250 m nominal', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Terra / MODIS',
      color:'RGB corrected-reflectance composite. Display color is visual context, not a single physical variable.',
      limit:'Cloud, atmosphere, overpass time, swath gaps, and compositing condition what is visible. A view date is not one instantaneous photograph.',
      note:'A familiar optical view. Read clouds and acquisition gaps as part of the observation, not as missing decoration.'
    },
    {
      id:'viirs-true', label:'True color', short:'SUOMI NPP / TRUE COLOR', group:'VISUAL',
      layer:'VIIRS_SNPP_CorrectedReflectance_TrueColor', format:'image/jpeg', mode:'base', lag:1, start:'2015-11-24', resolution:'250 m nominal', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Suomi NPP / VIIRS',
      color:'RGB corrected-reflectance composite. Display color is visual context, not a single physical variable.',
      limit:'Cloud and orbit geometry affect coverage. Near-real-time imagery can lag the selected UTC date and may be revised upstream.',
      note:'Higher-revisit optical context from VIIRS, useful for comparing the sensor/time relationship against MODIS.'
    },
    {
      id:'false-color', label:'False color 7-2-1', short:'TERRA / BANDS 7-2-1', group:'VISUAL',
      layer:'MODIS_Terra_CorrectedReflectance_Bands721', format:'image/jpeg', mode:'base', lag:2, start:'2000-02-24', resolution:'250–500 m band-dependent', cadence:'DAILY / ORBIT COMPOSITE',
      source:'NASA EOSDIS GIBS · Terra / MODIS',
      color:'False-color band assignment 7-2-1. Displayed hues are intentionally non-literal.',
      limit:'False-color composites are interpretive products: displayed color is not literal visible color and depends on the band assignment.',
      note:'A deliberately non-literal composite that makes surface and burn/scar contrasts easier to inspect.'
    },
    {
      id:'surface-temp', label:'Land surface temperature', short:'NOAA-20 / LST DAY', group:'THERMAL',
      layer:'VIIRS_NOAA20_Land_Surface_Temp_Day', format:'image/png', mode:'overlay', lag:2, start:'2018-01-05', resolution:'750 m nominal product scale', cadence:'DAILY / DAYTIME', opacity:.76,
      source:'NASA EOSDIS GIBS · NOAA-20 / VIIRS',
      color:'Provider-rendered quantitative palette. Use the NASA Worldview handoff for the authoritative color legend.',
      limit:'Land-surface temperature is skin temperature, not 2 m air temperature. Clouds create retrieval gaps and local time varies with overpass.',
      note:'Thermal retrieval over land. It should not be read as weather-station air temperature.'
    },
    {
      id:'precip', label:'Precipitation rate', short:'IMERG / PRECIPITATION', group:'ATMOSPHERE',
      layer:'IMERG_Precipitation_Rate', format:'image/png', mode:'overlay', lag:3, start:'2000-06-01', resolution:'0.1° product grid', cadence:'HALF-HOURLY SOURCE / DAILY VIEW', opacity:.82,
      source:'NASA GPM IMERG via EOSDIS GIBS',
      color:'Provider-rendered precipitation-rate palette. Use the NASA Worldview handoff for quantitative legend values.',
      limit:'IMERG combines satellite precipitation estimates. Retrieval uncertainty varies by precipitation regime, surface, sensor availability, and latency.',
      note:'A precipitation estimate, not a rain-gauge field. The global picture is a modeled/merged observation product.'
    },
    {
      id:'aerosol', label:'Aerosol optical depth', short:'AQUA / AOD 3 KM', group:'ATMOSPHERE',
      layer:'MODIS_Aqua_Aerosol_Optical_Depth_3km', format:'image/png', mode:'overlay', lag:3, start:'2002-07-04', resolution:'3 km nominal retrieval', cadence:'DAILY / ORBIT RETRIEVAL', opacity:.76,
      source:'NASA EOSDIS GIBS · Aqua / MODIS',
      color:'Provider-rendered AOD palette. Use the NASA Worldview handoff for quantitative legend values.',
      limit:'AOD is column-integrated optical loading, not ground-level PM2.5. Clouds, bright surfaces, and retrieval screening create spatial gaps.',
      note:'Atmospheric optical loading. Empty areas can mean screening or no valid retrieval, not zero aerosol.'
    },
    {
      id:'snow', label:'Snow cover', short:'SUOMI NPP / NDSI', group:'CRYOSPHERE',
      layer:'VIIRS_SNPP_NDSI_Snow_Cover', format:'image/png', mode:'overlay', lag:2, start:'2012-01-19', resolution:'375 m nominal product scale', cadence:'DAILY / DAYTIME', opacity:.8,
      source:'NASA EOSDIS GIBS · Suomi NPP / VIIRS',
      color:'Provider-rendered NDSI snow palette. Use the NASA Worldview handoff for legend semantics.',
      limit:'NDSI snow mapping is affected by cloud, illumination, forests, terrain, and classification thresholds. It is not snow depth.',
      note:'A categorical/continuous snow signal derived from spectral contrast, distinct from depth or water equivalent.'
    },
    {
      id:'chlorophyll', label:'Chlorophyll-a', short:'PACE OCI / OCEAN COLOR', group:'OCEAN',
      layer:'OCI_PACE_Chlorophyll_a', format:'image/png', mode:'overlay', lag:3, start:'2024-03-01', resolution:'~1 km mapped product', cadence:'DAILY / OCEAN COLOR', opacity:.82,
      source:'NASA EOSDIS GIBS · PACE / OCI',
      color:'Provider-rendered chlorophyll-a palette. Use the NASA Worldview handoff for quantitative legend values.',
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
  const addDays = (date, amount) => new Date(date.getTime() + amount * DAY_MS);
  const daysBetween = (later, earlier) => Math.max(0, Math.round((later - earlier) / DAY_MS));
  const clampDate = (date, min, max) => date < min ? min : date > max ? max : date;
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  function safeDate(layer) {
    const now = new Date();
    const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return addDays(today, -layer.lag);
  }

  function getInitialState() {
    const url = new URL(location.href);
    const layer = byId.get(url.searchParams.get('earthLayer')) || layers[0];
    const recent = safeDate(layer);
    const requested = url.searchParams.get('earthDate');
    const parsed = requested && /^\d{4}-\d{2}-\d{2}$/.test(requested) ? utcDate(requested) : recent;
    const min = utcDate(layer.start);
    const primary = clampDate(parsed, min, recent);
    const compareOffset = Math.max(1, Math.min(365, Number(url.searchParams.get('earthOffset') || 7) || 7));
    return {
      layerId: layer.id,
      date: primary,
      compare: url.searchParams.get('earthCompare') === '1',
      compareOffset,
      split: Math.max(12, Math.min(88, Number(url.searchParams.get('earthSplit') || 50) || 50)),
      playing:false,
      speed:1300,
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
      ['TIME','DATE-CONTROLLED · CONSERVATIVE RECENT WINDOW'],
      ['SOURCE','NASA EOSDIS GIBS'],
      ['METHOD','2:1 EQUIRECTANGULAR · SWIPE COMPARE']
    ];
  }

  async function mountEnhancedEarth({ signal, stage } = {}) {
    if (!stage || signal?.aborted) return () => {};
    ensureStyle();
    const state = getInitialState();
    let timer = null;
    let rangeCommitTimer = null;
    let loadGeneration = 0;
    let keyHandler = null;
    let visibilityHandler = null;
    let resizeHandler = null;
    let resizeObserver = null;
    let dragPointer = null;
    const foregroundLoads = new Set();
    const backgroundLoads = new Set();

    stage.innerHTML = `
      <div class="earth-observation-lab">
        <section class="earth-observation-canvas" aria-label="Temporal Earth observation">
          <header class="earth-observation-hud">
            <div><span>OBSERVATION</span><strong id="eoHudLayer">—</strong></div>
            <div><span>VIEW DATE</span><strong id="eoHudDate">—</strong></div>
            <div><span>REFERENCE</span><strong id="eoHudReference">OFF</strong></div>
            <button type="button" id="eoReset" class="eo-quiet-button">RESET</button>
          </header>

          <div class="earth-observation-frame-shell" id="eoFrameShell" style="min-height:0;display:grid;place-items:center;overflow:hidden;background:#060b08;">
            <div class="earth-observation-frame" id="eoFrame" aria-label="Global observation in EPSG:4326, displayed at a fixed two-to-one equirectangular aspect ratio">
              <div class="eo-image-stack eo-image-a" id="eoImageA" aria-label="Primary observation"></div>
              <div class="eo-image-stack eo-image-b" id="eoImageB" aria-label="Reference observation"></div>
              <div class="eo-loading" id="eoLoading" aria-live="polite"><i></i><span>REQUESTING OBSERVATION</span></div>
              <div class="eo-graticule" id="eoGraticule" aria-hidden="true"></div>
              <div class="eo-probe" id="eoProbe" hidden><i></i><span id="eoProbeLabel"></span></div>
              <button class="eo-compare-handle" id="eoCompareHandle" type="button" role="slider" aria-label="Comparison split" aria-valuemin="5" aria-valuemax="95" aria-valuenow="50" aria-valuetext="50 percent reveal" hidden><span></span></button>
              <div class="eo-map-label eo-label-a"><span>A</span><b id="eoLabelA">—</b></div>
              <div class="eo-map-label eo-label-b" id="eoLabelBWrap" hidden><span>B</span><b id="eoLabelB">—</b></div>
              <div class="eo-frame-note" id="eoProjectionNote"><span>DISPLAY / EPSG:4326 · 2:1</span><span>CLICK TO PROBE LON/LAT</span></div>
            </div>
          </div>

          <footer class="earth-timeline" aria-label="Observation timeline">
            <div class="eo-timeline-controls">
              <button type="button" id="eoPrev" aria-label="Previous day">−1D</button>
              <button type="button" id="eoPlay" aria-pressed="false">PLAY</button>
              <button type="button" id="eoNext" aria-label="Next day">+1D</button>
              <button type="button" id="eoLatest" aria-label="Jump to conservative recent observation date" title="Uses a conservative product-specific latency window; provider availability can differ.">SAFE DATE</button>
            </div>
            <div class="eo-timeline-track">
              <div class="eo-timeline-head"><span id="eoCoverageStart">—</span><strong id="eoTimelineDate">—</strong><span id="eoCoverageEnd">—</span></div>
              <input id="eoRange" type="range" min="0" max="120" value="0" step="1" aria-label="Days before conservative recent observation date" />
              <div class="eo-ticks" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>
            </div>
            <label class="eo-date-input">UTC DATE<input id="eoDate" type="date" /></label>
          </footer>
        </section>

        <aside class="earth-observation-panel">
          <section class="eo-panel-card eo-layer-card">
            <div class="eo-panel-head"><div><span>OBSERVATION LAYERS</span><strong>Choose what the sensor means.</strong></div><em id="eoLayerMode">VISUAL</em></div>
            <div class="eo-layer-groups" id="eoLayerGroups" role="tablist" aria-orientation="horizontal" aria-label="Observation layer categories"></div>
            <div class="eo-layer-list" id="eoLayerList" role="tabpanel" aria-label="Observation products in the selected category"></div>
          </section>

          <section class="eo-panel-card">
            <div class="eo-panel-head"><div><span>COMPARE</span><strong>Change requires a reference.</strong></div><em id="eoCompareState">OFF</em></div>
            <button type="button" class="eo-compare-toggle" id="eoCompare" aria-pressed="false"><i></i><span><b>SWIPE A / B</b><small>Same layer, two UTC dates</small></span></button>
            <div class="eo-compare-presets" id="eoComparePresets" aria-label="Requested reference date offset">
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
            <a id="eoSourceLink" target="_blank" rel="noreferrer">OPEN SAME VIEW IN NASA WORLDVIEW ↗</a>
          </section>
        </aside>
      </div>`;

    const frameShell = $('#eoFrameShell', stage);
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
    const sourceLink = $('#eoSourceLink', stage);
    let activeGroup = byId.get(state.layerId)?.group || 'VISUAL';

    function currentLayer() { return byId.get(state.layerId) || layers[0]; }
    function boundsFor(layer=currentLayer()) { return { min:utcDate(layer.start), max:safeDate(layer) }; }
    function compareDate() {
      const { min } = boundsFor();
      const requested = addDays(state.date, -state.compareOffset);
      return requested < min ? min : requested;
    }
    function actualCompareOffset() { return daysBetween(state.date, compareDate()); }

    function sizeProjectionFrame() {
      const rect = frameShell?.getBoundingClientRect();
      if (!rect || rect.width < 2 || rect.height < 1) return;
      let width = rect.width;
      let height = width / 2;
      if (height > rect.height) {
        height = rect.height;
        width = height * 2;
      }
      frame.style.width = `${Math.max(2, Math.floor(width))}px`;
      frame.style.height = `${Math.max(1, Math.floor(height))}px`;
    }

    if ('ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(sizeProjectionFrame);
      resizeObserver.observe(frameShell);
    } else {
      resizeHandler = sizeProjectionFrame;
      window.addEventListener('resize', resizeHandler, { passive:true });
    }
    sizeProjectionFrame();

    function requestDimensions() {
      const cssWidth = frame.clientWidth || Math.min(window.innerWidth || 1200, 1200);
      const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      const width = Math.round(Math.max(720, Math.min(1600, cssWidth * dpr)));
      return { width, height:Math.round(width / 2) };
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

    function worldviewLayerList(layer) {
      if (layer.mode !== 'overlay') return layer.layer;
      return `MODIS_Terra_CorrectedReflectance_TrueColor,${layer.layer}(opacity=${state.overlayOpacity.toFixed(2)})`;
    }

    function worldviewUrl(layer=currentLayer()) {
      const url = new URL(WORLDVIEW);
      url.searchParams.set('p', 'geographic');
      url.searchParams.set('v', '-180,-90,180,90');
      url.searchParams.set('l', worldviewLayerList(layer));
      url.searchParams.set('t', `${day(state.date)}T00:00:00Z`);
      if (state.compare) {
        url.searchParams.set('l1', worldviewLayerList(layer));
        url.searchParams.set('t1', `${day(compareDate())}T00:00:00Z`);
        url.searchParams.set('ca', 'true');
        url.searchParams.set('cm', 'swipe');
        url.searchParams.set('cv', String(Math.round(state.split)));
      }
      return url.href;
    }

    function frameImages(layer, dateValue) {
      const parts = [];
      const { width, height } = requestDimensions();
      if (layer.mode === 'overlay') {
        parts.push({ role:'context', src:wmsUrl('MODIS_Terra_CorrectedReflectance_TrueColor', dateValue, {format:'image/jpeg',transparent:false,width,height}), opacity:1 });
        parts.push({ role:'observation', src:wmsUrl(layer.layer, dateValue, {format:layer.format,transparent:true,width,height}), opacity:state.overlayOpacity });
      } else {
        parts.push({ role:'observation', src:wmsUrl(layer.layer, dateValue, {format:layer.format,transparent:false,width,height}), opacity:1 });
      }
      return parts;
    }

    function renderStack(container, entries, altPrefix) {
      container.innerHTML = entries.map((entry, index) => `<img data-eo-role="${entry.role}" alt="${esc(`${altPrefix}${index ? ' overlay' : ''}`)}" referrerpolicy="no-referrer" draggable="false" style="opacity:${entry.opacity}" />`).join('');
      return $$('img', container);
    }

    function cancelLoads(bucket) {
      [...bucket].forEach(record => record.cancel?.());
    }

    function preload(src, { timeout=15000, bucket=foregroundLoads } = {}) {
      return new Promise(resolve => {
        if (signal?.aborted) return resolve({ ok:false, src, aborted:true });
        const img = new Image();
        let settled = false;
        let timerId = 0;
        let record = null;
        const finish = (ok, extra = {}) => {
          if (settled) return;
          settled = true;
          clearTimeout(timerId);
          if (record) bucket.delete(record);
          signal?.removeEventListener?.('abort', onAbort);
          img.onload = null;
          img.onerror = null;
          resolve({ ok, src, ...extra });
        };
        const cancel = () => {
          try { img.src = ''; } catch {}
          finish(false, { aborted:true });
        };
        const onAbort = cancel;
        record = { cancel };
        bucket.add(record);
        img.referrerPolicy = 'no-referrer';
        img.onload = () => finish(true);
        img.onerror = () => finish(false);
        signal?.addEventListener?.('abort', onAbort, { once:true });
        timerId = setTimeout(() => {
          try { img.src = ''; } catch {}
          finish(false, { timeout:true });
        }, timeout);
        img.src = src;
      });
    }

    function backgroundPrefetch(entries) {
      cancelLoads(backgroundLoads);
      entries.forEach(entry => { preload(entry.src, { timeout:12000, bucket:backgroundLoads }).catch(() => {}); });
    }

    async function renderImages() {
      if (signal?.aborted) return;
      const generation = ++loadGeneration;
      cancelLoads(foregroundLoads);
      const layer = currentLayer();
      const aEntries = frameImages(layer, state.date);
      const bEntries = frameImages(layer, compareDate());
      const sources = [...aEntries, ...(state.compare ? bEntries : [])].map(item => item.src);
      loading.hidden = false;
      loading.dataset.state = 'loading';
      const results = await Promise.all(sources.map(src => preload(src)));
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
        status.textContent = failed ? 'STATUS / ERROR' : `STATUS / READY · VIEW ${day(state.date)} UTC`;
        status.title = failed ? 'One or more requested image layers failed to load.' : 'Date-controlled observation loaded. READY does not mean real-time provider latest.';
      }
      const { min, max } = boundsFor(layer);
      const adjacent = [];
      [-1, 1].forEach(delta => {
        const candidate = addDays(state.date, delta);
        if (candidate >= min && candidate <= max) adjacent.push(...frameImages(layer, candidate));
      });
      if (adjacent.length) backgroundPrefetch(adjacent);
    }

    function updateSplit() {
      stackB.style.clipPath = `inset(0 0 0 ${state.split}%)`;
      handle.style.left = `${state.split}%`;
      const rounded = Math.round(state.split);
      handle.setAttribute('aria-valuenow', String(rounded));
      handle.setAttribute('aria-valuetext', `${rounded} percent reveal`);
    }

    function renderGroups() {
      groupList.innerHTML = groups.map((group, index) => {
        const selected = group === activeGroup;
        return `<button id="eoLayerGroup-${index}" type="button" role="tab" aria-selected="${selected}" aria-controls="eoLayerList" tabindex="${selected ? '0' : '-1'}" class="${selected?'is-active':''}" data-group="${group}">${group}</button>`;
      }).join('');
      const selected = groupList.querySelector('[aria-selected="true"]');
      if (selected) layerList.setAttribute('aria-labelledby', selected.id);
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
      const actualOffset = actualCompareOffset();
      const { width, height } = requestDimensions();
      const compareValue = state.compare
        ? `${day(reference)} ↔ ${day(state.date)} · ${actualOffset} actual day${actualOffset === 1 ? '' : 's'}${actualOffset !== state.compareOffset ? ` · requested ${state.compareOffset}, clipped by coverage` : ''}`
        : 'OFF · one observation date';
      $('#eoInspectorTitle',stage).textContent = layer.label;
      $('#eoInspectorMeta',stage).innerHTML = [
        ['SOURCE', layer.source],
        ['TIME', `${day(state.date)} UTC · ${layer.cadence}`],
        ['NATIVE RESOLUTION', layer.resolution],
        ['DISPLAY SAMPLE', `${width} × ${height} WMS raster · resampled to viewport`],
        ['PROJECTION', 'EPSG:4326 · 2:1 equirectangular display'],
        ['COLOR', layer.color],
        ['RECENT-DATE POLICY', `Conservative T-${layer.lag} day request window; provider availability and upstream revisions can differ.`],
        ['COMPARE', compareValue],
        ['LIMIT', layer.limit]
      ].map(([key,value]) => `<div><dt>${esc(key)}</dt><dd>${esc(value)}</dd></div>`).join('');
      sourceLink.href = worldviewUrl(layer);
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
      const age = daysBetween(max, state.date);
      const archiveDays = Math.max(1, daysBetween(max, min));
      range.max = String(archiveDays);
      range.value = String(age);
      dateInput.min = day(min);
      dateInput.max = day(max);
      dateInput.value = day(state.date);
      $('#eoCoverageStart',stage).textContent = layer.start;
      $('#eoCoverageEnd',stage).textContent = `SAFE THROUGH ${day(max)}`;
      $('#eoTimelineDate',stage).textContent = day(state.date);
      $('#eoHudLayer',stage).textContent = layer.short;
      $('#eoHudDate',stage).textContent = `${day(state.date)} UTC`;
      const actualOffset = actualCompareOffset();
      $('#eoHudReference',stage).textContent = state.compare ? `${day(compareDate())} · ${actualOffset}D${actualOffset !== state.compareOffset ? '*' : ''}` : 'OFF';
      $('#eoLabelA',stage).textContent = day(state.date);
      $('#eoLabelB',stage).textContent = day(compareDate());
      compareButton.classList.toggle('is-active', state.compare);
      compareButton.setAttribute('aria-pressed', String(state.compare));
      compareState.textContent = state.compare ? 'A / B' : 'OFF';
      nextButton.disabled = day(state.date) >= day(max);
      prevButton.disabled = day(state.date) <= day(min);
      recentButton.disabled = day(state.date) >= day(max);
      $$('#eoComparePresets [data-offset]',stage).forEach(button => {
        const selected = Number(button.dataset.offset) === state.compareOffset;
        button.classList.toggle('is-active', selected);
        button.setAttribute('aria-pressed', String(selected));
      });
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

    function commitRangeDate() {
      clearTimeout(rangeCommitTimer);
      rangeCommitTimer = null;
      renderState({ images:true, url:true });
    }

    function togglePlay(force) {
      state.playing = typeof force === 'boolean' ? force : !state.playing;
      clearInterval(timer);
      playButton.classList.toggle('is-active', state.playing);
      playButton.setAttribute('aria-pressed', String(state.playing));
      playButton.textContent = state.playing ? 'PAUSE' : 'PLAY';
      if (state.playing) {
        timer = setInterval(() => {
          if (loading.dataset.state === 'loading') return;
          const { min, max } = boundsFor();
          const next = addDays(state.date, 1);
          setDate(next > max ? min : next);
        }, state.speed);
      }
    }

    function selectGroup(group, { focus=false } = {}) {
      if (!groups.includes(group)) return;
      activeGroup = group;
      renderGroups();
      renderLayerList();
      if (focus) groupList.querySelector(`[data-group="${group}"]`)?.focus();
    }

    stage.addEventListener('click', event => {
      const layerButton = event.target.closest?.('[data-earth-layer]');
      if (layerButton) {
        const next = byId.get(layerButton.dataset.earthLayer);
        if (!next) return;
        const previous = currentLayer();
        const previousMax = safeDate(previous);
        const wasAtSafeDate = day(state.date) === day(previousMax);
        state.layerId = next.id;
        activeGroup = next.group;
        const nextBounds = boundsFor(next);
        state.date = wasAtSafeDate ? nextBounds.max : clampDate(state.date, nextBounds.min, nextBounds.max);
        state.overlayOpacity = next.opacity ?? 1;
        state.probe = null;
        togglePlay(false);
        renderState();
        return;
      }
      const groupButton = event.target.closest?.('[data-group]');
      if (groupButton) {
        selectGroup(groupButton.dataset.group);
        return;
      }
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
      const max = boundsFor().max;
      setDate(addDays(max, -Number(range.value)), { images:false, url:false });
      clearTimeout(rangeCommitTimer);
      rangeCommitTimer = setTimeout(commitRangeDate, 140);
    });
    range.addEventListener('change', commitRangeDate);
    dateInput.addEventListener('change', () => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateInput.value)) setDate(utcDate(dateInput.value));
    });
    prevButton.addEventListener('click', () => setDate(addDays(state.date,-1)));
    nextButton.addEventListener('click', () => setDate(addDays(state.date,1)));
    recentButton.addEventListener('click', () => setDate(boundsFor().max));
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
      state.date = safeDate(layer);
      state.compare = false;
      state.compareOffset = 7;
      state.split = 50;
      state.overlayOpacity = 1;
      state.probe = null;
      state.showGrid = true;
      graticule.hidden = false;
      gridButton.classList.add('is-active');
      gridButton.setAttribute('aria-pressed', 'true');
      togglePlay(false);
      renderState();
    });

    frame.addEventListener('click', event => {
      if (event.target.closest?.('.eo-compare-handle')) return;
      const rect = frame.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = Math.max(0, Math.min(rect.width, event.clientX - rect.left));
      const y = Math.max(0, Math.min(rect.height, event.clientY - rect.top));
      const lon = (x / rect.width) * 360 - 180;
      const lat = 90 - (y / rect.height) * 180;
      state.probe = { lon, lat, xPct:(x/rect.width)*100, yPct:(y/rect.height)*100 };
      renderProbe();
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
      dragPointer = event.pointerId;
      handle.setPointerCapture?.(event.pointerId);
      setSplitFromPointer(event);
      event.stopPropagation();
    });
    handle.addEventListener('pointermove', event => { if (dragPointer === event.pointerId) setSplitFromPointer(event); });
    handle.addEventListener('pointerup', event => { if (dragPointer === event.pointerId) { dragPointer = null; handle.releasePointerCapture?.(event.pointerId); } });
    handle.addEventListener('pointercancel', () => { dragPointer = null; });
    handle.addEventListener('keydown', event => {
      if (event.key === 'ArrowLeft' || event.key === 'ArrowRight' || event.key === 'Home' || event.key === 'End') {
        event.preventDefault();
        if (event.key === 'Home') state.split = 5;
        else if (event.key === 'End') state.split = 95;
        else state.split = Math.max(5, Math.min(95, state.split + (event.key === 'ArrowLeft' ? -5 : 5)));
        updateSplit();
        persist();
        renderInspector();
      }
    });

    keyHandler = event => {
      if (!stage.isConnected || event.target?.closest?.('input,textarea,select,button,a,[contenteditable="true"],[role="slider"]')) return;
      if (event.code === 'Space') { event.preventDefault(); togglePlay(); }
      if (event.key === 'ArrowLeft') setDate(addDays(state.date,-1));
      if (event.key === 'ArrowRight') setDate(addDays(state.date,1));
      if (event.key.toLowerCase() === 'c') { state.compare = !state.compare; renderState(); }
      if (event.key.toLowerCase() === 'g') { gridButton.click(); }
    };
    document.addEventListener('keydown', keyHandler);

    visibilityHandler = () => { if (document.hidden && state.playing) togglePlay(false); };
    document.addEventListener('visibilitychange', visibilityHandler);

    renderState({ images:true, url:true });
    requestAnimationFrame(sizeProjectionFrame);

    return () => {
      clearInterval(timer);
      clearTimeout(rangeCommitTimer);
      loadGeneration += 1;
      cancelLoads(foregroundLoads);
      cancelLoads(backgroundLoads);
      resizeObserver?.disconnect();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      document.removeEventListener('keydown', keyHandler);
      document.removeEventListener('visibilitychange', visibilityHandler);
      stage.innerHTML = '';
    };
  }

  ensureStyle();
  setConditions();
  window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  window.GeoGeekInstrumentMounts.earth = mountEnhancedEarth;
  window.GeoEarthTemporalLab = { version:VERSION, mount:mountEnhancedEarth, layers };
})();