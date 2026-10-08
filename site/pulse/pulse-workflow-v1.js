/* Earth Pulse · professional data workflow v1.
 * The public 24-hour observation instrument is preserved unmodified.
 * Historical queries are explicit; no demo data or unreported truncation.
 */
(() => {
  'use strict';

  if (window.GeoPulseWorkflowV1) return;
  const SVG = 'http://www.w3.org/2000/svg';
  const QUERY_ENDPOINT = 'https://earthquake.usgs.gov/fdsnws/event/1/query';
  const FEED_ENDPOINT = 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson';
  const style = document.createElement('link');
  style.rel = 'stylesheet';
  style.href = new URL('./pulse-workflow-v1.css?v=20261008a', import.meta.url).href;
  style.setAttribute('data-pulse-workflow-style', '1');
  if (!document.querySelector('link[data-pulse-workflow-style]')) document.head.appendChild(style);

  const MAX_EVENTS = 10000;
  const MAX_DAYS = 31;
  const DAY = 86400000;
  const select = (selector, root = document) => root.querySelector(selector);
  const number = value => value == null || value === '' || !Number.isFinite(Number(value)) ? null : Number(value);
  const escapeHtml = value => String(value == null ? '' : value).replace(/[&<>"']/g, symbol => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[symbol]));
  const iso = value => Number.isFinite(value) ? new Date(value).toISOString() : '—';
  const utcDate = time => new Date(time).toISOString().slice(0, 10);
  const dateMillis = value => /^\d{4}-\d{2}-\d{2}$/.test(value || '') ? Date.parse(value + 'T00:00:00.000Z') : NaN;
  const filenameTime = () => new Date().toISOString().replace(/[:.]/g, '-');
  const fmtNumber = value => value == null ? '—' : Number(value).toLocaleString('en-US', {maximumFractionDigits:2});
  const project = (lon, lat) => [1000 * (lon + 180) / 360, 500 * (90 - lat) / 180];
  const toLonLat = (x, y) => [(x / 1000) * 360 - 180, 90 - (y / 500) * 180];
  const active = new WeakMap();

  function normalize(feature) {
    const coordinates = feature && feature.geometry && feature.geometry.coordinates;
    const p = feature && feature.properties || {};
    if (!Array.isArray(coordinates) || feature.geometry.type !== 'Point') return null;
    const lon = number(coordinates[0]);
    const lat = number(coordinates[1]);
    const time = number(p.time);
    if (lon == null || lat == null || time == null || lon < -180 || lon > 180 || lat < -90 || lat > 90) return null;
    return {
      id:String(feature.id || ''), lon, lat, time,
      depth:number(coordinates[2]), mag:number(p.mag),
      status:String(p.status || 'unknown').toLowerCase(),
      eventType:String(p.type || 'unknown').toLowerCase(),
      magType:String(p.magType || ''),
      place:String(p.place || 'Location unavailable'),
      updated:number(p.updated), url:typeof p.url === 'string' && /^https:\/\/earthquake\.usgs\.gov\//i.test(p.url) ? p.url : '',
      original:feature
    };
  }

  function median(items) {
    const sorted = items.filter(Number.isFinite).sort((a,b) => a-b);
    if (!sorted.length) return null;
    const middle = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[middle] : (sorted[middle-1]+sorted[middle])/2;
  }

  function inside(event, roi) {
    if (!roi) return true;
    const longitude = roi.west <= roi.east
      ? event.lon >= roi.west && event.lon <= roi.east
      : event.lon >= roi.west || event.lon <= roi.east;
    return longitude && event.lat >= roi.south && event.lat <= roi.north;
  }

  function buildSvg(tag, attributes) {
    const node = document.createElementNS(SVG, tag);
    Object.entries(attributes || {}).forEach(([key,value]) => node.setAttribute(key, String(value)));
    return node;
  }

  function download(content, mime, name) {
    const blob = new Blob([content], {type:mime});
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function csvCell(value) {
    if (value == null) return '""';
    let text = String(value);
    if (typeof value === 'string' && /^[=+\-@\t\r\n]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function init(stage, base) {
    if (active.has(stage) || !base || !base.isConnected) return;
    const panel = select('.pulse-panel', base);
    const baseMap = select('.pulse-map', base);
    if (!panel || !baseMap) return;

    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'pulse-workflow-launch';
    toggle.textContent = 'OPEN DATA WORKFLOW ↗';
    toggle.setAttribute('aria-label', 'Open professional data workflow for Earth Pulse');
    panel.prepend(toggle);

    const workspace = document.createElement('section');
    workspace.className = 'pulse-workflow';
    workspace.hidden = true;
    workspace.setAttribute('aria-label', 'Earth Pulse professional data workflow');
    workspace.innerHTML = [
      '<div class="pw-head">',
        '<div><small>EARTH PULSE / RESEARCH WORKFLOW</small><strong>DATA · ROI · ANALYSIS · EXPORT</strong></div>',
        '<button type="button" data-pw="return">RETURN TO PULSE</button>',
      '</div>',
      '<div class="pw-layout">',
        '<section class="pw-map-column">',
          '<div class="pw-banner" role="status" aria-live="polite">Open the workflow to load the verified 24-hour snapshot.</div>',
          '<div class="pw-map-container"><svg class="pw-map" viewBox="0 0 1000 500" role="img" aria-label="Global earthquake map with drag-to-select study area"></svg></div>',
          '<div class="pw-map-foot"><span data-pw="map-caption">Global event map · equirectangular lon/lat</span><span data-pw="roi-caption">ROI: WORLD</span></div>',
          '<div class="pw-selected" aria-live="polite">Select a mapped event to inspect its USGS record.</div>',
          '<p class="pw-limit">A selected area limits the displayed and exported set. Geographic event counts are not earthquake hazard or long-term occurrence rates.</p>',
        '</section>',
        '<aside class="pw-side">',
          '<section class="pw-section">',
            '<h3>01 · DATA SOURCE</h3>',
            '<div class="pw-actions"><button type="button" data-pw="snapshot">LOAD 24 H SNAPSHOT</button></div>',
            '<p>Snapshot uses the GeoGeek same-origin USGS feed, including its stale-data policy.</p>',
            '<div class="pw-fields pw-three">',
              '<label>START DATE · UTC<input data-pw="start" type="date"></label>',
              '<label>END DATE · UTC<input data-pw="end" type="date"></label>',
              '<label>QUERY MIN M<input data-pw="query-mag" type="number" min="-1" max="9" step="0.1" value="2.5"></label>',
            '</div>',
            '<div class="pw-actions"><button type="button" data-pw="history">QUERY HISTORY</button><span>Up to 31 UTC dates · max 10,000 events</span></div>',
            '<p class="pw-provenance" data-pw="provenance">No data loaded.</p>',
          '</section>',
          '<section class="pw-section">',
            '<h3>02 · SPATIAL REGION (ROI)</h3>',
            '<div class="pw-actions"><button type="button" data-pw="draw" aria-pressed="false">DRAW RECTANGLE</button><button type="button" data-pw="reset-roi">WORLD</button></div>',
            '<div class="pw-fields pw-four">',
              '<label>WEST °<input data-pw="west" type="number" min="-180" max="180" step="0.01" value="-180"></label>',
              '<label>EAST °<input data-pw="east" type="number" min="-180" max="180" step="0.01" value="180"></label>',
              '<label>SOUTH °<input data-pw="south" type="number" min="-90" max="90" step="0.01" value="-90"></label>',
              '<label>NORTH °<input data-pw="north" type="number" min="-90" max="90" step="0.01" value="90"></label>',
            '</div>',
            '<div class="pw-actions"><button type="button" data-pw="apply-roi">APPLY BOUNDS</button><span>West &gt; East crosses the date line.</span></div>',
          '</section>',
          '<section class="pw-section">',
            '<h3>03 · FILTER + STATISTICS</h3>',
            '<div class="pw-fields pw-three">',
              '<label>VIEW MIN M<input data-pw="view-mag" type="number" step="0.1" placeholder="ALL"></label>',
              '<label>DEPTH CLASS<select data-pw="depth"><option value="all">ALL</option><option value="shallow">SHALLOW &lt;70 KM</option><option value="intermediate">70–300 KM</option><option value="deep">≥300 KM</option><option value="unknown">UNKNOWN</option></select></label>',
              '<label>REVIEW STATUS<select data-pw="status"><option value="all">ALL</option><option value="reviewed">REVIEWED</option><option value="automatic">AUTOMATIC</option><option value="unknown">UNKNOWN</option></select></label>',
            '</div>',
            '<div class="pw-stats">',
              '<div><small>LOADED CATALOGUE</small><strong data-pw="loaded">—</strong></div>',
              '<div><small>FILTERED / ROI</small><strong data-pw="visible">—</strong></div>',
              '<div><small>VISIBLE MAX M</small><strong data-pw="max-mag">—</strong></div>',
              '<div><small>VISIBLE MEDIAN DEPTH</small><strong data-pw="median-depth">—</strong></div>',
            '</div>',
            '<p data-pw="stats-detail">Statistics update from the filtered event set, not the full catalogue.</p>',
          '</section>',
          '<section class="pw-section">',
            '<h3>04 · EXPORT</h3>',
            '<div class="pw-actions"><button type="button" data-pw="geojson" disabled>GEOJSON</button><button type="button" data-pw="csv" disabled>CSV</button><button type="button" data-pw="manifest" disabled>MANIFEST JSON</button></div>',
            '<p>Exports include the visible records only. The manifest records the source request, UTC dates, ROI, filters and fetch time. Save both the data and the manifest to reproduce the selection.</p>',
          '</section>',
        '</aside>',
      '</div>'
    ].join('');
    stage.appendChild(workspace);
    const el = key => select('[data-pw="' + key + '"]', workspace);
    const svg = select('.pw-map', workspace);
    const mapColumn = select('.pw-map-column', workspace);
    const banner = select('.pw-banner', workspace);
    const selected = select('.pw-selected', workspace);
    const mapCaption = el('map-caption');
    const roiCaption = el('roi-caption');

    const background = buildSvg('rect', {x:0,y:0,width:1000,height:500,fill:'#0c1613'});
    svg.appendChild(background);
    const originalGrid = select('.pulse-graticule', baseMap);
    const originalLand = select('.pulse-land', baseMap);
    if (originalGrid) { const copy = originalGrid.cloneNode(true); copy.setAttribute('class','pw-graticule'); svg.appendChild(copy); }
    if (originalLand) { const copy = originalLand.cloneNode(true); copy.setAttribute('class','pw-land'); svg.appendChild(copy); }
    const dots = buildSvg('g', {'class':'pw-dots'});
    const shapes = buildSvg('g', {'class':'pw-roi-shapes'});
    const hit = buildSvg('rect', {'class':'pw-draw-hit',x:0,y:0,width:1000,height:500});
    svg.append(dots, shapes, hit);

    const state = {
      open:false, busy:false, abort:null, source:null, url:null, fetchedAt:null,
      scope:null, events:[], visible:[], invalid:0, roi:null, drawing:false, drag:null,
      queryMin:null, loadedStart:null, loadedEnd:null
    };
    const today = Date.now();
    el('start').value = utcDate(today - 6*DAY);
    el('end').value = utcDate(today);
    el('start').max = utcDate(today);
    el('end').max = utcDate(today);

    function message(value, error) {
      banner.textContent = value;
      banner.dataset.error = error ? 'true' : 'false';
    }

    function setBusy(busy) {
      state.busy = busy;
      ['snapshot','history'].forEach(name => el(name).disabled = busy);
    }

    function renderRoi() {
      shapes.replaceChildren();
      const roi = state.roi;
      roiCaption.textContent = roi
        ? 'ROI: ' + roi.west.toFixed(2) + '° / ' + roi.east.toFixed(2) + '° · ' + roi.south.toFixed(2) + '° / ' + roi.north.toFixed(2) + '°'
        : 'ROI: WORLD';
      if (!roi) return;
      const bands = roi.west <= roi.east ? [[roi.west, roi.east]] : [[roi.west,180],[-180,roi.east]];
      bands.forEach(band => {
        const topLeft = project(band[0], roi.north);
        const rightBottom = project(band[1], roi.south);
        shapes.appendChild(buildSvg('rect', {
          x:topLeft[0],y:topLeft[1],width:Math.max(0,rightBottom[0]-topLeft[0]),
          height:Math.max(0,rightBottom[1]-topLeft[1]),'class':'pw-roi-rect'
        }));
      });
    }

    function syncBounds() {
      const roi = state.roi || {west:-180,east:180,south:-90,north:90};
      ['west','east','south','north'].forEach(key => el(key).value = roi[key].toFixed(2));
      renderRoi();
    }

    function depthClass(depth) {
      return depth == null ? 'unknown' : depth < 70 ? 'shallow' : depth < 300 ? 'intermediate' : 'deep';
    }

    function filtered() {
      const minMag = number(el('view-mag').value);
      return state.events.filter(event => inside(event,state.roi) &&
        (minMag == null || event.mag != null && event.mag >= minMag) &&
        (el('depth').value === 'all' || depthClass(event.depth) === el('depth').value) &&
        (el('status').value === 'all' || event.status === el('status').value));
    }

    function render() {
      state.visible = filtered();
      el('loaded').textContent = state.source ? fmtNumber(state.events.length) : '—';
      el('visible').textContent = state.source ? fmtNumber(state.visible.length) : '—';
      const magnitudes = state.visible.map(event => event.mag).filter(Number.isFinite);
      const depths = state.visible.map(event => event.depth);
      el('max-mag').textContent = magnitudes.length ? 'M ' + Math.max(...magnitudes).toFixed(1) : '—';
      const medianDepth = median(depths);
      el('median-depth').textContent = medianDepth == null ? '—' : fmtNumber(medianDepth) + ' km';
      const first = state.visible.length ? Math.min(...state.visible.map(event => event.time)) : null;
      const last = state.visible.length ? Math.max(...state.visible.map(event => event.time)) : null;
      el('stats-detail').textContent = state.source
        ? 'Loaded ' + state.events.length + ' valid records (' + state.invalid + ' invalid discarded). Visible origin span: ' + (first == null ? 'none' : iso(first) + ' – ' + iso(last)) + '.'
        : 'Statistics update from the filtered set, not the full catalogue.';
      ['geojson','csv','manifest'].forEach(name => el(name).disabled = !state.source || state.busy);
      dots.replaceChildren();
      const fragment = document.createDocumentFragment();
      state.visible.forEach((event, index) => {
        const xy = project(event.lon, event.lat);
        const radius = event.mag == null ? 2.3 : Math.max(1.8,Math.min(5.8,2.1 + (event.mag + 1)*0.38));
        const group = buildSvg('g', {
          'class':'pw-event','data-event-id':event.id,'data-pw-index':index,
          'transform':'translate(' + xy[0].toFixed(2) + ' ' + xy[1].toFixed(2) + ')',
          'role':'button','tabindex':'0',
          'aria-label':event.place + ', M ' + (event.mag == null ? 'unknown' : event.mag)
        });
        const hit = buildSvg('circle', {'class':'pw-event-hit',r:Math.max(11,radius + 6)});
        const marker = buildSvg('circle', {'class':'pw-event-marker',r:radius.toFixed(2)});
        const tip = buildSvg('title');
        tip.textContent = event.place + ' · M ' + (event.mag == null ? '?' : event.mag) + ' · ' + iso(event.time);
        group.append(hit,marker,tip);
        group.addEventListener('click', () => inspect(event));
        group.addEventListener('keydown', key => {
          if (key.key !== 'Enter' && key.key !== ' ') return;
          key.preventDefault();
          inspect(event);
        });
        fragment.appendChild(group);
      });
      dots.appendChild(fragment);
      mapCaption.textContent = (state.source === 'history' ? 'HISTORICAL QUERY' : '24 H SNAPSHOT') +
        ' · ' + state.visible.length.toLocaleString('en-US') + ' displayed records · EQUIRECTANGULAR';
      renderRoi();
    }

    function inspect(event) {
      selected.replaceChildren();
      const summary = document.createElement('span');
      summary.textContent = event.place + ' · M ' + (event.mag == null ? '?' : event.mag.toFixed(1)) +
        ' · depth ' + (event.depth == null ? '?' : event.depth) + ' km · ' + iso(event.time) + ' · ' + event.status;
      selected.appendChild(summary);
      if (event.url) {
        const link = document.createElement('a');
        link.href = event.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'USGS RECORD ↗';
        selected.appendChild(link);
      }
    }

    async function request(url) {
      if (state.abort) state.abort.abort();
      const controller = new AbortController();
      state.abort = controller;
      const timer = window.setTimeout(() => controller.abort(), 30000);
      try {
        const response = await fetch(url, {signal:controller.signal,headers:{Accept:'application/geo+json, application/json'}});
        if (response.status === 204) return {type:'FeatureCollection',features:[],metadata:{count:0}};
        if (!response.ok) throw new Error('USGS request returned HTTP ' + response.status);
        const data = await response.json();
        if (!data || !Array.isArray(data.features)) throw new Error('Source response is not a GeoJSON FeatureCollection.');
        return data;
      } finally {
        window.clearTimeout(timer);
        if (state.abort === controller) state.abort = null;
      }
    }

    function installData(data, provenance) {
      const features = data.features || [];
      if (features.length > MAX_EVENTS || Number(data.metadata && data.metadata.count) > MAX_EVENTS) {
        throw new Error('Query exceeds 10,000 events. Narrow the dates, magnitude or study area before analysis. No partial results were used.');
      }
      const normalized = features.map(normalize).filter(Boolean);
      state.invalid = features.length - normalized.length;
      state.events = normalized;
      state.source = provenance.mode;
      state.url = provenance.url;
      state.fetchedAt = provenance.fetchedAt;
      state.scope = provenance.scope;
      state.queryMin = provenance.queryMin;
      state.loadedStart = provenance.start;
      state.loadedEnd = provenance.end;
      el('view-mag').value = '';
      selected.textContent = 'Select a mapped event to inspect its USGS record.';
      el('provenance').textContent = 'PROVIDER: USGS · MODE: ' + provenance.mode.toUpperCase() +
        ' · FETCHED: ' + provenance.fetchedAt + ' · ' + provenance.scope +
        ' · SOURCE: ' + provenance.url;
      render();
      message(normalized.length + ' USGS records loaded. Adjust the filters, draw a study area, or export the visible set.',false);
    }

    async function loadSnapshot() {
      if (state.busy) return;
      setBusy(true);
      message('Loading GeoGeek same-origin USGS 24-hour snapshot…',false);
      try {
        const data = await request(FEED_ENDPOINT);
        const supply = window.GeoDataSupply && window.GeoDataSupply.describe('usgs-earthquakes-day');
        installData(data,{
          mode:'snapshot',url:FEED_ENDPOINT,
          fetchedAt:supply && supply.metadata && supply.metadata.fetchedAt || new Date().toISOString(),
          scope:'Rolling USGS past-day feed. Source revisions and stale snapshot policy apply.',
          queryMin:null,start:null,end:null
        });
        if (supply && supply.stale) message('STALE SNAPSHOT: showing last-known-good data. Validate its age before analysis.',true);
      } catch (error) {
        if (error.name !== 'AbortError') message(error.message || String(error),true);
      } finally {
        setBusy(false);
        render();
      }
    }

    async function loadHistory() {
      if (state.busy) return;
      const start = dateMillis(el('start').value);
      const end = dateMillis(el('end').value);
      const minimum = number(el('query-mag').value);
      const days = (end-start)/DAY + 1;
      if (!Number.isFinite(start) || !Number.isFinite(end) || days < 1 || days > MAX_DAYS || end > dateMillis(utcDate(Date.now()))) {
        message('Select a valid UTC date range of 1–31 dates, ending no later than today.',true);
        return;
      }
      if (minimum == null || minimum < -1 || minimum > 9) {
        message('The USGS query minimum magnitude must be between -1 and 9.',true);
        return;
      }
      const url = new URL(QUERY_ENDPOINT);
      url.searchParams.set('format','geojson');
      url.searchParams.set('starttime',utcDate(start));
      url.searchParams.set('endtime',new Date(end + DAY - 1).toISOString());
      url.searchParams.set('minmagnitude',String(minimum));
      url.searchParams.set('orderby','time');
      url.searchParams.set('limit',String(MAX_EVENTS + 1));
      setBusy(true);
      message('Querying the USGS FDSN historical catalogue (UTC)…',false);
      try {
        const data = await request(url.href);
        installData(data,{
          mode:'history',url:url.href,fetchedAt:new Date().toISOString(),
          scope:'Historical FDSN query, UTC inclusive calendar dates; min M ' + minimum,
          queryMin:minimum,start:utcDate(start),end:utcDate(end)
        });
      } catch (error) {
        if (error.name !== 'AbortError') message(error.message || String(error),true);
      } finally {
        setBusy(false);
        render();
      }
    }

    function applyRoi(bounds) {
      const {west,east,south,north} = bounds;
      if ([west,east,south,north].some(v=>v==null) ||
        west < -180 || west > 180 || east < -180 || east > 180 ||
        south < -90 || north > 90 || south >= north) {
        message('Invalid ROI. Longitude must be -180 to 180, latitude -90 to 90, and south < north.',true);
        return;
      }
      state.roi = bounds;
      syncBounds();
      render();
    }

    function pointerLocation(event) {
      const bounds = svg.getBoundingClientRect();
      return {
        x:Math.max(0,Math.min(1000,(event.clientX-bounds.left)*1000/bounds.width)),
        y:Math.max(0,Math.min(500,(event.clientY-bounds.top)*500/bounds.height))
      };
    }

    function finishDrag(event) {
      if (!state.drag) return;
      const initial = state.drag;
      const current = pointerLocation(event);
      state.drag = null;
      state.drawing = false;
      el('draw').setAttribute('aria-pressed','false');
      workspace.classList.remove('pw-drawing');
      if (Math.abs(initial.x-current.x) < 3 || Math.abs(initial.y-current.y) < 3) {
        message('Draw a larger rectangle or enter precise ROI coordinates.',true);
        renderRoi();
        return;
      }
      const low = toLonLat(Math.min(initial.x,current.x),Math.max(initial.y,current.y));
      const high = toLonLat(Math.max(initial.x,current.x),Math.min(initial.y,current.y));
      applyRoi({west:low[0],east:high[0],south:low[1],north:high[1]});
    }

    function manifest() {
      return {
        schema:'geogeek-pulse-workflow/1',createdAt:new Date().toISOString(),
        provider:'USGS Earthquake Hazards Program',sourceMode:state.source,
        sourceUrl:state.url,sourceFetchTime:state.fetchedAt,
        sourceScope:state.scope,queryMinimumMagnitude:state.queryMin,
        queryDatesUTC:{start:state.loadedStart,end:state.loadedEnd},
        loadedValidRecords:state.events.length,discardedInvalidRecords:state.invalid,
        visibleRecords:state.visible.length,
        roi:state.roi,viewFilters:{
          minMagnitude:number(el('view-mag').value),
          depthClass:el('depth').value,status:el('status').value
        },
        limitations:[
          'A rolling snapshot is not a permanent historical archive.',
          'Magnitude estimates and event origins may be revised.',
          'Catalogue completeness varies by location and magnitude.',
          'An event count is neither a seismic hazard model nor a long-term rate.'
        ]
      };
    }

    function exportVisible(format) {
      if (!state.source || state.busy) return;
      const name = 'pulse-' + state.source + '-' + filenameTime();
      if (format === 'manifest') {
        download(JSON.stringify(manifest(),null,2)+'\n','application/json;charset=utf-8',name+'-manifest.json');
      } else if (format === 'geojson') {
        download(JSON.stringify({type:'FeatureCollection',metadata:manifest(),features:state.visible.map(e=>e.original)},null,2)+'\n',
          'application/geo+json;charset=utf-8',name+'.geojson');
      } else if (format === 'csv') {
        const columns = ['id','origin_utc','updated_utc','longitude','latitude','depth_km','magnitude','mag_type','status','event_type','place','usgs_url'];
        const rows = state.visible.map(e => [
          e.id,iso(e.time),e.updated==null ? '' : iso(e.updated),e.lon,e.lat,e.depth,e.mag,e.magType,e.status,e.eventType,e.place,e.url
        ]);
        const csv = [columns.join(',')].concat(rows.map(row=>row.map(csvCell).join(','))).join('\r\n')+'\r\n';
        download('\ufeff'+csv,'text/csv;charset=utf-8',name+'.csv');
      }
    }

    const listeners = [];
    const listen = (target,kind,handler,options) => {
      target.addEventListener(kind,handler,options);
      listeners.push(() => target.removeEventListener(kind,handler,options));
    };
    function close() {
      if (state.abort) state.abort.abort();
      state.open = false;
      workspace.hidden = true;
      base.removeAttribute('data-workflow-suspended');
      toggle.focus();
    }

    listen(toggle,'click',() => {
      state.open = true;
      workspace.hidden = false;
      base.dataset.workflowSuspended = 'true';
      if (!state.source && !state.busy) void loadSnapshot();
    });
    listen(el('return'),'click',close);
    listen(el('snapshot'),'click',() => void loadSnapshot());
    listen(el('history'),'click',() => void loadHistory());
    listen(el('draw'),'click',() => {
      state.drawing = !state.drawing;
      workspace.classList.toggle('pw-drawing',state.drawing);
      el('draw').setAttribute('aria-pressed',String(state.drawing));
      message(state.drawing ? 'Drag a rectangle on the map. You can also enter exact coordinates.' : 'Rectangle drawing cancelled.',false);
    });
    listen(el('reset-roi'),'click',() => {state.roi=null;syncBounds();render();});
    listen(el('apply-roi'),'click',() => applyRoi({
      west:number(el('west').value),east:number(el('east').value),
      south:number(el('south').value),north:number(el('north').value)
    }));
    ['view-mag','depth','status'].forEach(name => listen(el(name),'change',render));
    ['geojson','csv','manifest'].forEach(name => listen(el(name),'click',() => exportVisible(name)));
    listen(hit,'pointerdown',event => {
      if (!state.drawing || event.button !== 0) return;
      event.preventDefault();
      state.drag = pointerLocation(event);
      hit.setPointerCapture(event.pointerId);
    });
    listen(hit,'pointermove',event => {
      if (!state.drag) return;
      const point = pointerLocation(event);
      const low = toLonLat(Math.min(state.drag.x,point.x),Math.max(state.drag.y,point.y));
      const high = toLonLat(Math.max(state.drag.x,point.x),Math.min(state.drag.y,point.y));
      shapes.replaceChildren(buildSvg('rect',{
        x:Math.min(state.drag.x,point.x),y:Math.min(state.drag.y,point.y),
        width:Math.abs(state.drag.x-point.x),height:Math.abs(state.drag.y-point.y),'class':'pw-roi-rect'
      }));
      roiCaption.textContent = 'DRAWING: ' + low[0].toFixed(1) + '° to ' + high[0].toFixed(1) + '°';
    });
    listen(hit,'pointerup',finishDrag);
    listen(hit,'pointercancel',() => {state.drag=null;renderRoi();});
    syncBounds();

    const cleanup = () => {
      if (state.abort) state.abort.abort();
      listeners.forEach(stop=>stop());
      workspace.remove();
      toggle.remove();
      base.removeAttribute('data-workflow-suspended');
      active.delete(stage);
    };
    active.set(stage,{cleanup,base});
  }

  function scan() {
    const stage = select('#instrumentStage');
    if (!stage) return;
    const base = select('.pulse-observation-lab[data-state="ready"]',stage);
    const current = active.get(stage);
    if (current && (!base || current.base !== base)) current.cleanup();
    if (base && !active.has(stage)) init(stage,base);
  }

  const stage = select('#instrumentStage');
  const observer = new MutationObserver(scan);
  observer.observe(stage || document.documentElement,{childList:true,subtree:true});
  scan();
  window.addEventListener('pagehide',() => {observer.disconnect();const current=active.get(stage);if(current)current.cleanup();},{once:true});
  window.GeoPulseWorkflowV1 = {version:'20261008a',maxEvents:MAX_EVENTS,maxDays:MAX_DAYS};
})();