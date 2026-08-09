(() => {
  'use strict';
  const Data = window.GeoCommonsData;
  const Geo = window.GeoCommonsGeo;
  const cfg = window.GEOGEEK_COMMONS_CONFIG || {};
  if (!Data || !Geo) return;

  const readLocale = () => { try { return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; } catch { return 'en'; } };
  const locale = readLocale();
  const ui = window.GEOGEEK_DATA?.[locale]?.ui?.commons || {};
  const host = { lat:Number(cfg.host?.lat ?? 30.59), lon:Number(cfg.host?.lon ?? 114.30), timezone:cfg.host?.timezone || 'Asia/Shanghai', label:cfg.host?.label?.[locale] || (locale === 'zh' ? '中国 · 武汉' : 'Wuhan, China') };
  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));

  const state = {
    backend:'demo', snapshot:null, world:null, user:null, publicPlace:null, selected:null,
    horizon:'30d', timeMode:'accumulated', hour:12, timeRef:'utc',
    layers:{ visits:true, observations:true, now:true, relations:true }, presence:[], stopPresence:null
  };

  const loadScript = async (src, globalName) => {
    if (window[globalName]) return window[globalName];
    if (window.GeoModules?.loadScript) { await window.GeoModules.loadScript(src); return window[globalName]; }
    await new Promise((resolve,reject)=>{ const s=document.createElement('script'); s.src=src; s.onload=resolve; s.onerror=reject; document.head.appendChild(s); });
    return window[globalName];
  };

  async function loadWorld() {
    if (state.world) return state.world;
    await loadScript('https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js','d3');
    await loadScript('https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js','topojson');
    const response = await fetch('https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json');
    if (!response.ok) throw new Error(`world-atlas ${response.status}`);
    const topology = await response.json();
    const countries = window.topojson.feature(topology, topology.objects.countries);
    state.world = { d3:window.d3, countries };
    return state.world;
  }

  function cutoffDate() {
    const now = Date.now();
    if (state.horizon === '24h') return new Date(now - 24*3600000);
    if (state.horizon === '7d') return new Date(now - 7*86400000);
    if (state.horizon === '30d') return new Date(now - 30*86400000);
    return new Date(0);
  }

  function eventHour(iso, place) {
    const date = new Date(iso);
    if (state.timeRef === 'utc') return date.getUTCHours();
    try {
      return Number(new Intl.DateTimeFormat('en-US',{ timeZone:place.timezone || 'UTC', hour:'2-digit', hourCycle:'h23' }).format(date));
    } catch { return date.getUTCHours(); }
  }

  function filteredPlaces() {
    const snapshot = state.snapshot || { places:[] };
    const cutoff = cutoffDate();
    return (snapshot.places || []).map(place => {
      let visits = Number(place.visits || 0);
      if (Array.isArray(place.events)) {
        const events = place.events.filter(iso => new Date(iso) >= cutoff);
        visits = state.timeMode === 'hourly' ? events.filter(iso => eventHour(iso, place) === state.hour).length : events.length;
      } else {
        if (state.horizon !== 'all' && place.lastSeen && new Date(place.lastSeen) < cutoff) visits = 0;
        if (state.timeMode === 'hourly' && Array.isArray(place.hourly)) visits = Number(place.hourly[state.hour] || 0);
      }
      return { ...place, visibleVisits:visits };
    }).filter(place => place.visibleVisits > 0 || (state.layers.observations && Number(place.observations || 0) > 0) || place.active);
  }

  function filteredObservations() {
    const cutoff = cutoffDate();
    return (state.snapshot?.observations || []).filter(o => {
      if (new Date(o.createdAt) < cutoff) return false;
      if (state.timeMode !== 'hourly') return true;
      const place = (state.snapshot?.places || []).find(p => p.id === o.placeId) || {};
      return eventHour(o.createdAt, place) === state.hour;
    });
  }

  function localizedPlace(place) { return locale === 'zh' ? (place.zh || place.label || place.id) : (place.label || place.zh || place.id); }
  function localizedObservation(o) { return typeof o.text === 'string' ? o.text : (o.text?.[locale] || o.text?.en || o.text?.zh || ''); }
  function countFormat(value) { return Number(value || 0).toLocaleString(locale === 'zh' ? 'zh-CN' : 'en-US'); }
  function relativeTime(iso) {
    const ms = Date.now() - new Date(iso).getTime();
    const h = Math.max(0, Math.round(ms / 3600000));
    if (locale === 'zh') return h < 24 ? `${h} 小时前` : `${Math.round(h/24)} 天前`;
    return h < 24 ? `${h}h ago` : `${Math.round(h/24)}d ago`;
  }

  function applyCommonsLocale() {
    if (!$('#commonsMap')) return;
    const page = window.GEOGEEK_DATA?.[locale]?.ui?.pages?.commons;
    if (page) {
      $('.page-title .eyebrow').textContent = page.eyebrow;
      $('.page-title h1').textContent = page.heading;
      $('.page-title .page-intro').textContent = page.intro;
      document.title = page.title;
    }
    $('#commonsDefinition').textContent = ui.definitions || '';
    const metricKeys = ['visits','located','places','observations','active'];
    $$('#commonsMetrics article span').forEach((n,i)=>n.textContent = ui.metrics?.[metricKeys[i]] || metricKeys[i].toUpperCase());
    $$('[data-commons-layer]').forEach(b => b.textContent = ui.layers?.[b.dataset.commonsLayer] || b.dataset.commonsLayer.toUpperCase());
    $$('.commons-time-controls > span')[0].textContent = ui.time?.label || 'TIME';
    $$('[data-horizon]').forEach(b => b.textContent = ui.time?.horizons?.[b.dataset.horizon] || b.dataset.horizon.toUpperCase());
    $$('[data-time-mode]').forEach(b => b.textContent = ui.time?.modes?.[b.dataset.timeMode] || b.dataset.timeMode.toUpperCase());
    $$('[data-time-ref]').forEach(b => b.textContent = b.dataset.timeRef === 'utc' ? (ui.time?.utc || 'UTC') : (ui.time?.local || 'LOCAL'));
    $('#commonsHourControl label').childNodes[0].textContent = `${ui.time?.hour || 'HOUR'} `;
    $('#commonsMapStatus').textContent = ui.map?.loading || 'READING COMMON FIELD…';
    $('#commonsMapSource').textContent = ui.map?.source || '';
    $('.commons-map-legend span:nth-child(1) b').textContent = ui.layers?.visits || 'VISITS';
    $('.commons-map-legend span:nth-child(2) b').textContent = ui.layers?.observations || 'OBSERVATIONS';
    $('.commons-map-legend span:nth-child(3) b').textContent = ui.layers?.now || 'NOW';
    $('.commons-map-legend span:nth-child(4) b').textContent = ui.map?.host || 'HOST';
    $('#commonsLocate').textContent = ui.actions?.locate || 'LOCATE ME';
    $('#commonsLight').textContent = ui.actions?.light || 'LIGHT THIS PLACE';
    $('#commonsClearLocation').textContent = ui.actions?.clear || 'CLEAR LOCAL POSITION';
    $('#commonsPrivacyText').textContent = ui.privacy?.body || '';
    const participateHeads = $$('.commons-block-head');
    if (participateHeads[0]) { $('span',participateHeads[0]).textContent = locale === 'zh' ? '你 ↔ 武汉' : 'YOU ↔ HOST'; $('h2',participateHeads[0]).textContent = locale === 'zh' ? '精确位置先只属于你。' : 'Your position stays private until you choose otherwise.'; }
    if (participateHeads[1]) { $('span',participateHeads[1]).textContent = ui.actions?.observe || 'OBSERVATION'; $('h2',participateHeads[1]).textContent = locale === 'zh' ? '从你所在之处，留下一则短观。' : 'Leave one short observation from where you are.'; }
    const form = $('#commonsObservationForm');
    if (form) {
      const labels = $$('label > span',form); if(labels[0]) labels[0].textContent=ui.form?.place||'PLACE'; if(labels[1]) labels[1].textContent=ui.form?.name||'NAME / OPTIONAL'; if(labels[2]) labels[2].textContent=ui.form?.observation||'OBSERVATION';
      $('#observationText').placeholder = ui.form?.placeholder || '';
      $('#observationSubmit').textContent = ui.actions?.submit || 'CONTRIBUTE';
      if (!state.user) $('#observationPlace').value = locale === 'zh' ? '请先定位' : 'Locate first';
    }
    $('.commons-summary')?.setAttribute('aria-label', locale === 'zh' ? '共域统计' : 'Commons summary');
    $('.commons-layer-controls')?.setAttribute('aria-label', locale === 'zh' ? '地图图层' : 'Map layers');
    $('.commons-horizon')?.setAttribute('aria-label', locale === 'zh' ? '时间范围' : 'Time range');
    $('.commons-time-modes')?.setAttribute('aria-label', locale === 'zh' ? '时间表示' : 'Temporal representation');
    $('#commonsMap')?.setAttribute('aria-label', locale === 'zh' ? '匿名访问者粗略来处世界地图' : 'World map of anonymous visitor places');
    renderYouHost();
  }

  function setStatus(mode, error = false) {
    const node = $('#commonsStatus');
    if (!node) return;
    const live = mode === 'live' && !error;
    node.dataset.state = live ? 'live' : error ? 'error' : 'demo';
    node.textContent = live ? (ui.statusLive || 'LIVE COMMONS') : error ? (ui.statusError || 'UNAVAILABLE') : (ui.statusDemo || 'DEMO FIELD');
  }

  function aggregateMetrics(places, observations) {
    const located = places.reduce((sum,p)=>sum+Number(p.visibleVisits || 0),0);
    let visits = located;
    if (state.snapshot?.mode === 'live' && Number.isFinite(state.snapshot.totalVisits)) visits = state.snapshot.totalVisits;
    else if (Array.isArray(state.snapshot?.unlocatedEvents)) {
      const cutoff = cutoffDate();
      let extra = state.snapshot.unlocatedEvents.filter(iso => new Date(iso) >= cutoff);
      if (state.timeMode === 'hourly') extra = extra.filter(iso => new Date(iso).getUTCHours() === state.hour);
      visits += extra.length;
    } else if (state.horizon === 'all' && Number.isFinite(state.snapshot?.totalVisits)) visits = state.snapshot.totalVisits;
    const active = state.presence.length || Number(state.snapshot?.activeCount || 0);
    return { visits, located, places:places.filter(p=>p.visibleVisits>0).length, observations:observations.length, active };
  }

  function renderMetrics() {
    const places = filteredPlaces(), obs = filteredObservations(), m = aggregateMetrics(places,obs);
    $('#metricVisits').textContent = countFormat(m.visits);
    $('#metricLocated').textContent = countFormat(m.located);
    $('#metricPlaces').textContent = countFormat(m.places);
    $('#metricObservations').textContent = countFormat(m.observations);
    $('#metricActive').textContent = countFormat(m.active);
  }

  function timeOffsetLabel(aTz,bTz) {
    const a = Geo.timeZoneOffsetMinutes(aTz), b = Geo.timeZoneOffsetMinutes(bTz);
    if (a == null || b == null) return '—';
    const diff = (b-a)/60;
    return `${diff > 0 ? '+' : ''}${Number.isInteger(diff) ? diff : diff.toFixed(1)} h`;
  }

  function daylightLabel(point) { return Geo.solarAltitude(point,new Date()) >= -0.833 ? (ui.relation?.day || 'DAY') : (ui.relation?.night || 'NIGHT'); }

  function relationHTML(source, target, sourceLabel, targetLabel) {
    const d = Geo.distanceKm(source,target), b = Geo.initialBearing(source,target);
    const sourceTime = Geo.localTime(source.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone, new Date(), locale);
    const targetTime = Geo.localTime(target.timezone || 'UTC', new Date(), locale);
    return `<span class="commons-inspector-kicker">${escapeHTML(ui.relation?.title || 'RELATION')}</span>
      <h2>${escapeHTML(sourceLabel)} ↔ ${escapeHTML(targetLabel)}</h2>
      <dl>
        <div><dt>${escapeHTML(ui.relation?.distance || 'DISTANCE')}</dt><dd>${escapeHTML(Geo.formatDistance(d))}</dd></div>
        <div><dt>${escapeHTML(ui.relation?.bearing || 'INITIAL BEARING')}</dt><dd>${Math.round(b)}° · ${Geo.cardinal(b)}</dd></div>
        <div><dt>${escapeHTML(ui.relation?.timeOffset || 'TIME OFFSET')}</dt><dd>${escapeHTML(timeOffsetLabel(source.timezone,target.timezone))}</dd></div>
        <div><dt>${escapeHTML(ui.relation?.localTime || 'LOCAL TIME')}</dt><dd>${escapeHTML(sourceTime)} / ${escapeHTML(targetTime)}</dd></div>
        <div><dt>${escapeHTML(ui.relation?.daylight || 'DAYLIGHT')}</dt><dd>${escapeHTML(daylightLabel(source))} / ${escapeHTML(daylightLabel(target))}</dd></div>
      </dl>`;
  }

  function renderInspector() {
    const inspector = $('#commonsInspector');
    if (!inspector) return;
    const selected = state.selected;
    if (!selected) {
      inspector.innerHTML = `<span class="commons-inspector-kicker">${escapeHTML(ui.relation?.title || 'RELATION')}</span><h2>${escapeHTML(ui.relation?.host || 'WUHAN / HOST')}</h2><p>${escapeHTML(ui.map?.none || '')}</p><small>${escapeHTML(ui.map?.locatedNote || '')}</small>`;
      return;
    }
    const source = state.user ? { ...state.user, timezone:state.user.timezone } : host;
    const sourceLabel = state.user ? (ui.map?.you || 'YOU') : host.label;
    const targetLabel = localizedPlace(selected);
    const obs = filteredObservations().filter(o => o.placeId === selected.id).slice(0,5);
    inspector.innerHTML = relationHTML(source, selected, sourceLabel, targetLabel) + `
      <div class="commons-place-meta"><span>${escapeHTML(ui.visitor?.visits || 'VISITS')} · ${countFormat(selected.visibleVisits ?? selected.visits ?? 0)}</span><span>${escapeHTML(ui.visitor?.lastSeen || 'LAST SEEN')} · ${escapeHTML(relativeTime(selected.lastSeen || new Date().toISOString()))}</span></div>
      ${obs.length ? `<div class="commons-observation-list">${obs.map(o=>`<article><time>${escapeHTML(relativeTime(o.createdAt))}</time><p>${escapeHTML(localizedObservation(o))}</p>${o.displayName ? `<small>${escapeHTML(o.displayName)}</small>`:''}</article>`).join('')}</div>` : ''}`;
  }

  function renderYouHost() {
    const readout = $('#youHostReadout');
    if (!readout) return;
    const boxes = $$(':scope > div',readout);
    if (!boxes.length) return;
    boxes[0].innerHTML = `<span>${escapeHTML(ui.relation?.host || 'HOST')}</span><strong>${escapeHTML(host.label)}</strong><small>${Math.abs(host.lat).toFixed(2)}° N · ${Math.abs(host.lon).toFixed(2)}° E</small>`;
    if (!state.user) {
      boxes[1].innerHTML = `<span>${escapeHTML(ui.relation?.you || 'YOU')}</span><strong>${locale==='zh'?'尚未定位':'NOT LOCATED'}</strong><small>${escapeHTML(ui.privacy?.private || 'DEVICE ONLY')}</small>`;
      boxes[2].innerHTML = `<span>${escapeHTML(ui.relation?.distance || 'DISTANCE')}</span><strong>—</strong><small>${locale==='zh'?'大圆距离':'GREAT-CIRCLE'}</small>`;
      boxes[3].innerHTML = `<span>${escapeHTML(ui.relation?.bearing || 'INITIAL BEARING')}</span><strong>—</strong><small>${locale==='zh'?'你 → 武汉':'YOU → WUHAN'}</small>`;
      return;
    }
    const d=Geo.distanceKm(state.user,host), b=Geo.initialBearing(state.user,host);
    boxes[1].innerHTML = `<span>${escapeHTML(ui.relation?.you || 'YOU')}</span><strong>${state.user.lat.toFixed(4)}°, ${state.user.lon.toFixed(4)}°</strong><small>${escapeHTML(ui.privacy?.private || 'DEVICE ONLY')}</small>`;
    boxes[2].innerHTML = `<span>${escapeHTML(ui.relation?.distance || 'DISTANCE')}</span><strong>${escapeHTML(Geo.formatDistance(d))}</strong><small>${locale==='zh'?'大圆距离':'GREAT-CIRCLE'}</small>`;
    boxes[3].innerHTML = `<span>${escapeHTML(ui.relation?.bearing || 'INITIAL BEARING')}</span><strong>${Math.round(b)}° · ${Geo.cardinal(b)}</strong><small>${locale==='zh'?'你 → 武汉':'YOU → WUHAN'}</small>`;
  }

  function buildProjection(d3) { return d3.geoEqualEarth().fitExtent([[30,26],[1170,650]], {type:'Sphere'}); }

  async function renderMap() {
    const svgNode = $('#commonsMap');
    if (!svgNode) return;
    let world;
    try { world = await loadWorld(); }
    catch (error) { $('#commonsMapStatus').textContent = ui.map?.unavailable || 'World geometry unavailable.'; $('#commonsMapStatus').classList.add('is-error'); return; }
    const { d3, countries } = world;
    const svg = d3.select(svgNode); svg.selectAll('*').remove();
    const projection = buildProjection(d3), path = d3.geoPath(projection);
    svg.append('path').datum({type:'Sphere'}).attr('class','commons-sphere').attr('d',path);
    if (state.timeMode === 'daynight') {
      const sun = Geo.subsolar(new Date());
      const night = d3.geoCircle().center([Geo.normLon(sun.lon+180), -sun.lat]).radius(90).precision(2)();
      svg.append('path').datum(night).attr('class','commons-night').attr('d',path);
    }
    svg.append('path').datum(d3.geoGraticule10()).attr('class','commons-graticule').attr('d',path);
    svg.append('g').attr('class','commons-countries').selectAll('path').data(countries.features).join('path').attr('d',path);

    const places = filteredPlaces();
    const maxVisits = Math.max(1,...places.map(p=>p.visibleVisits||0));
    if (state.layers.visits) {
      svg.append('g').attr('class','commons-visits').selectAll('button').data(places.filter(p=>p.visibleVisits>0)).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0] ?? -20).attr('cy',d=>projection([d.lon,d.lat])?.[1] ?? -20)
        .attr('r',d=>3.2 + 8*Math.sqrt((d.visibleVisits||0)/maxVisits)).attr('tabindex',0).attr('role','button')
        .attr('aria-label',d=>`${localizedPlace(d)} · ${d.visibleVisits} ${ui.metrics?.visits || 'visits'}`)
        .on('click keydown',(event,d)=>{ if(event.type==='keydown' && !['Enter',' '].includes(event.key)) return; event.preventDefault(); state.selected=d; renderInspector(); renderMap(); });
    }
    if (state.layers.observations) {
      const obsPlaces = places.filter(p=>filteredObservations().some(o=>o.placeId===p.id));
      svg.append('g').attr('class','commons-observation-marks').selectAll('circle').data(obsPlaces).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0] ?? -20).attr('cy',d=>projection([d.lon,d.lat])?.[1] ?? -20).attr('r',d=>14).attr('tabindex',0).attr('role','button')
        .attr('aria-label',d=>`${localizedPlace(d)} · ${d.observations || 0} ${ui.metrics?.observations || 'observations'}`)
        .on('click keydown',(event,d)=>{ if(event.type==='keydown' && !['Enter',' '].includes(event.key)) return; event.preventDefault(); state.selected=d; renderInspector(); renderMap(); });
    }

    const presencePlaces = state.presence.filter(p=>p.located && p.place).map(p=>p.place);
    if (state.layers.now && presencePlaces.length) {
      svg.append('g').attr('class','commons-now-marks').selectAll('circle').data(presencePlaces).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0] ?? -20).attr('cy',d=>projection([d.lon,d.lat])?.[1] ?? -20).attr('r',5);
    }

    const hostPoint = projection([host.lon,host.lat]);
    if (hostPoint) svg.append('g').attr('class','commons-host-mark').append('circle').attr('cx',hostPoint[0]).attr('cy',hostPoint[1]).attr('r',6);
    if (state.user) {
      const up = projection([state.user.lon,state.user.lat]);
      if (up) svg.append('g').attr('class','commons-you-mark').append('circle').attr('cx',up[0]).attr('cy',up[1]).attr('r',6);
    }
    if (state.layers.relations && state.selected) {
      const source = state.user || host;
      svg.append('path').datum({type:'LineString',coordinates:[[source.lon,source.lat],[state.selected.lon,state.selected.lat]]}).attr('class','commons-relation-line').attr('d',path);
      const p=projection([state.selected.lon,state.selected.lat]); if(p) svg.append('circle').attr('class','commons-selected-ring').attr('cx',p[0]).attr('cy',p[1]).attr('r',18);
    }
    $('#commonsMapStatus').textContent = state.snapshot?.mode === 'demo' ? (ui.map?.demo || 'Demo field') : '';
    $('#commonsMapStatus').classList.toggle('is-demo', state.snapshot?.mode === 'demo');
  }

  async function refresh() {
    state.snapshot = await Data.snapshot({ horizon:state.horizon, mode:state.timeMode, hour:state.hour, timeRef:state.timeRef });
    setStatus(state.snapshot.mode || state.backend, Boolean(state.snapshot.backendError));
    if (state.selected) {
      state.selected = (state.snapshot.places || []).find(p=>p.id===state.selected.id) || null;
      if (state.selected && !filteredPlaces().some(p=>p.id===state.selected.id)) state.selected = null;
    }
    renderMetrics(); renderInspector(); await renderMap();
  }

  function setButtons(selector, key, value) {
    $$(selector).forEach(b => { const active=b.dataset[key]===value; b.classList.toggle('is-active',active); b.setAttribute('aria-pressed',active?'true':'false'); });
  }

  function bindControls() {
    $$('[data-commons-layer]').forEach(b=>b.addEventListener('click',()=>{ const k=b.dataset.commonsLayer; state.layers[k]=!state.layers[k]; b.classList.toggle('is-active',state.layers[k]); b.setAttribute('aria-pressed',state.layers[k]?'true':'false'); renderMap(); }));
    $$('[data-horizon]').forEach(b=>b.addEventListener('click',()=>{ state.horizon=b.dataset.horizon; setButtons('[data-horizon]','horizon',state.horizon); refresh(); }));
    $$('[data-time-mode]').forEach(b=>b.addEventListener('click',()=>{ state.timeMode=b.dataset.timeMode; setButtons('[data-time-mode]','timeMode',state.timeMode); $('#commonsHourControl').hidden=state.timeMode!=='hourly'; refresh(); }));
    $$('[data-time-ref]').forEach(b=>b.addEventListener('click',()=>{ state.timeRef=b.dataset.timeRef; setButtons('[data-time-ref]','timeRef',state.timeRef); refresh(); }));
    $('#commonsHour')?.addEventListener('input',event=>{ state.hour=Number(event.target.value); $('#commonsHourOutput').textContent=`${String(state.hour).padStart(2,'0')}:00 ${state.timeRef==='utc'?'UTC':(ui.time?.local||'LOCAL')}`; refresh(); });

    $('#commonsLocate')?.addEventListener('click',()=>{
      const btn=$('#commonsLocate');
      if (!navigator.geolocation) { $('#observationFeedback').textContent = locale==='zh'?'此浏览器不支持定位。':'Geolocation is unavailable in this browser.'; return; }
      btn.disabled=true; btn.textContent=ui.actions?.locating || 'LOCATING…';
      navigator.geolocation.getCurrentPosition(pos=>{
        state.user={ lat:pos.coords.latitude, lon:pos.coords.longitude, accuracy:pos.coords.accuracy, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC' };
        const snapped=Geo.snap(state.user, cfg.privacy?.coarseDegrees || .25);
        state.publicPlace={ id:`cell-${snapped.lat.toFixed(2)}-${snapped.lon.toFixed(2)}`, ...snapped, label:`${snapped.lat.toFixed(2)}°, ${snapped.lon.toFixed(2)}°`, zh:`${snapped.lat.toFixed(2)}°, ${snapped.lon.toFixed(2)}°`, timezone:state.user.timezone, country:null };
        btn.disabled=false; btn.textContent=ui.actions?.locate || 'LOCATE ME';
        const blocked = Data.isLive() && !cfg.allowContributions;
        $('#commonsLight').disabled=blocked; $('#commonsClearLocation').hidden=false; $('#observationPlace').value=state.publicPlace.label; $('#observationSubmit').disabled=blocked;
        if (blocked) $('#observationFeedback').textContent = ui.form?.backend || 'Public contribution is disabled.';
        renderYouHost(); renderInspector(); renderMap();
      },err=>{
        btn.disabled=false; btn.textContent=ui.actions?.locate || 'LOCATE ME';
        $('#observationFeedback').textContent = err.code===1 ? (locale==='zh'?'定位权限未授予。':'Location permission was not granted.') : (locale==='zh'?'暂无法取得位置。':'Unable to read location.');
      },{ enableHighAccuracy:false, timeout:10000, maximumAge:300000 });
    });

    $('#commonsLight')?.addEventListener('click',async()=>{
      if (!state.publicPlace) return;
      const btn=$('#commonsLight'); btn.disabled=true;
      try {
        const result=await Data.light(state.publicPlace);
        btn.textContent=ui.actions?.lit || 'PLACE LIT';
        $('#observationFeedback').textContent=result.localOnly ? (locale==='zh'?'示意模式：只在此浏览器中点亮。':'Demo mode: lit in this browser only.') : '';
        await refresh();
      } catch { btn.disabled=false; $('#observationFeedback').textContent=ui.form?.backend || 'Backend required.'; }
    });

    $('#commonsClearLocation')?.addEventListener('click',()=>{
      state.user=null; state.publicPlace=null; state.selected=null;
      try { localStorage.removeItem('geogeek-commons-public-place'); } catch {}
      $('#commonsLight').disabled=true; $('#commonsLight').textContent=ui.actions?.light || 'LIGHT THIS PLACE'; $('#commonsClearLocation').hidden=true; $('#observationPlace').value=locale==='zh'?'请先定位':'Locate first'; $('#observationSubmit').disabled=true;
      renderYouHost(); renderInspector(); renderMap(); Data.updatePresence(null);
    });

    $('#observationText')?.addEventListener('input',event=>{ $('#observationCount').textContent=`${event.target.value.length} / ${cfg.privacy?.observationMaxLength || 180}`; });
    $('#commonsObservationForm')?.addEventListener('submit',async event=>{
      event.preventDefault(); if(!state.publicPlace) { $('#observationFeedback').textContent=ui.form?.needLocation || ''; return; }
      const text=$('#observationText').value.trim(); if(!text) return;
      const btn=$('#observationSubmit'); btn.disabled=true; btn.textContent=ui.actions?.submitting || 'SENDING…';
      try {
        const result=await Data.observe(state.publicPlace,text,$('#observationName').value);
        $('#observationFeedback').textContent=result.status==='pending' ? (ui.form?.pending || '') : result.localOnly ? (locale==='zh'?'示意模式：所见只保存在此浏览器。':'Demo mode: observation stays in this browser.') : (ui.form?.success || '');
        $('#observationText').value=''; $('#observationCount').textContent=`0 / ${cfg.privacy?.observationMaxLength || 180}`; await refresh();
      } catch { $('#observationFeedback').textContent=ui.form?.backend || 'Backend required.'; }
      finally { btn.disabled=false; btn.textContent=ui.actions?.submit || 'CONTRIBUTE'; }
    });
  }

  async function initPage() {
    if (!$('#commonsMap')) return;
    applyCommonsLocale(); bindControls();
    const status = await Data.init(); state.backend=status.mode; setStatus(status.mode,status.status==='error');
    state.stopPresence = await Data.startPresence(presence=>{ state.presence=presence; renderMetrics(); renderMap(); });
    await Data.recordVisit({path:location.pathname}).catch(()=>{});
    await refresh();
    window.addEventListener('pagehide',()=>state.stopPresence?.(),{once:true});
  }

  async function mountPreview(container, options = {}) {
    if (!container) return;
    const localUI = window.GEOGEEK_DATA?.[locale]?.ui?.commons || ui;
    const variant = options.variant || 'siteMap';
    const horizon = options.horizon || '30d';
    const home = variant === 'home';
    if (home) {
      container.innerHTML = `<div class="commons-preview-map-status">${escapeHTML(localUI.map?.loading || 'READING COMMON FIELD…')}</div><svg class="commons-preview-map" viewBox="0 0 1200 585" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${escapeHTML(locale==='zh'?'匿名来访世界地图':'World map of anonymous visitor places')}"></svg><div class="home-commons-map-legend" aria-label="${escapeHTML(locale==='zh'?'图例':'Map legend')}"><span><i class="visit-dot"></i><b>${escapeHTML(localUI.layers?.visits || 'VISITS')}</b></span><span><i class="observation-dot"></i><b>${escapeHTML(localUI.layers?.observations || 'OBSERVATIONS')}</b></span><span><i class="now-dot"></i><b>${escapeHTML(localUI.layers?.now || 'NOW')}</b></span><span><i class="host-dot"></i><b>${escapeHTML(locale==='zh'?'主位':'HOST')}</b></span></div><div class="home-commons-map-source">Natural Earth / world-atlas · ${escapeHTML(locale==='zh'?'匿名粗略位置':'anonymous coarse locations')}</div>`;
    } else {
      container.innerHTML = `<div class="commons-preview-head"><div><span>${escapeHTML(locale==='zh'?'共域 / 地理来访':'COMMONS / GEOGRAPHIC VISITS')}</span><h3>${escapeHTML(localUI.title || 'Commons')}</h3></div><a href="commons.html">${escapeHTML(locale==='zh'?'入共域 ↗':'ENTER COMMONS ↗')}</a></div><div class="commons-preview-map-status">${escapeHTML(localUI.map?.loading || 'READING COMMON FIELD…')}</div><svg class="commons-preview-map" viewBox="0 0 900 440" role="img" aria-label="${escapeHTML(locale==='zh'?'共域来访地图':'Commons visitor map')}"></svg><div class="commons-preview-stats"></div>`;
    }
    const status = await Data.init();
    const snap = await Data.snapshot({ horizon, mode:'accumulated' });
    state.snapshot = snap;
    const now = Date.now();
    const horizonMs = horizon === '24h' ? 86400000 : horizon === '7d' ? 7 * 86400000 : horizon === '30d' ? 30 * 86400000 : Infinity;
    const withinHorizon = iso => horizonMs === Infinity || (iso && now - new Date(iso).getTime() <= horizonMs);
    const places = (snap.places || []).map(place => {
      const previewVisits = Array.isArray(place.events) ? place.events.filter(withinHorizon).length : Number(place.visits || 0);
      return { ...place, previewVisits };
    }).filter(place => place.previewVisits > 0);
    const observations = (snap.observations || []).filter(item => withinHorizon(item.createdAt));
    const activePlaces = places.filter(place => place.active);
    const locatedVisits = places.reduce((sum,place)=>sum + Number(place.previewVisits || 0),0);
    const unlocatedVisits = Array.isArray(snap.unlocatedEvents) ? snap.unlocatedEvents.filter(withinHorizon).length : Math.max(0, Number(snap.totalVisits || 0) - Number(snap.locatedVisits || 0));
    const previewTotalVisits = locatedVisits + unlocatedVisits;
    if (home) {
      const rootNode = container.closest('.home-commons') || document;
      const setMetric = (selector, value) => { const node = $(selector, rootNode); if (node) node.textContent = countFormat(value); };
      setMetric('#homeCommonsVisits', previewTotalVisits);
      setMetric('#homeCommonsPlaces', places.length);
      setMetric('#homeCommonsObservations', observations.length);
      setMetric('#homeCommonsActive', snap.activeCount ?? activePlaces.length);
    }
    try {
      const { d3, countries } = await loadWorld();
      const svg = d3.select($('.commons-preview-map', container));
      const box = home ? { w:1200, h:585, insetX:26, insetY:22 } : { w:900, h:440, insetX:20, insetY:18 };
      const projection = d3.geoEqualEarth().fitExtent([[box.insetX,box.insetY],[box.w-box.insetX,box.h-box.insetY]],{type:'Sphere'});
      const path = d3.geoPath(projection);
      svg.append('path').datum({type:'Sphere'}).attr('class','commons-sphere').attr('d',path);
      svg.append('path').datum(d3.geoGraticule10()).attr('class','commons-graticule').attr('d',path);
      svg.append('g').attr('class','commons-countries').selectAll('path').data(countries.features).join('path').attr('d',path);
      const max = Math.max(1,...places.map(p=>p.previewVisits||0));
      svg.append('g').attr('class','commons-visits').selectAll('circle').data(places).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0]??-20).attr('cy',d=>projection([d.lon,d.lat])?.[1]??-20)
        .attr('r',d=>(home?3.1:2.5)+(home?7.2:6)*Math.sqrt((d.previewVisits||0)/max));
      const observedPlaceIds = new Set(observations.map(item => item.placeId));
      const observed = places.filter(p => observedPlaceIds.has(p.id));
      svg.append('g').attr('class','commons-observation-marks').selectAll('circle').data(observed).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0]??-20).attr('cy',d=>projection([d.lon,d.lat])?.[1]??-20)
        .attr('r',d=>(home?8.5:7)+Math.min(5,Math.sqrt(Number(d.observations||0))));
      const active = places.filter(p=>p.active);
      svg.append('g').attr('class','commons-now-marks').selectAll('circle').data(active).join('circle')
        .attr('cx',d=>projection([d.lon,d.lat])?.[0]??-20).attr('cy',d=>projection([d.lon,d.lat])?.[1]??-20).attr('r',home?3.8:3.2);
      const hp=projection([host.lon,host.lat]);
      if(hp) svg.append('circle').attr('class','commons-host-preview').attr('cx',hp[0]).attr('cy',hp[1]).attr('r',home?5.6:5);
      const statusNode=$('.commons-preview-map-status',container);
      statusNode.textContent=snap.mode==='demo'?(localUI.statusDemo||'DEMO FIELD'):(localUI.statusLive||'LIVE COMMONS');
      statusNode.classList.toggle('is-demo', snap.mode==='demo');
      if (!home) $('.commons-preview-stats',container).textContent=`${countFormat(previewTotalVisits)} ${localUI.metrics?.visits||'VISITS'} · ${countFormat(places.length)} ${localUI.metrics?.places||'PLACES'}`;
    } catch {
      const statusNode=$('.commons-preview-map-status',container);
      statusNode.textContent=localUI.map?.unavailable||'World geometry unavailable.';
      statusNode.classList.add('is-error');
    }
    return { mode:status.mode, snapshot:snap };
  }

  window.GeoCommons = { mountPreview, initPage };
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initPage,{once:true}); else initPage();
})();
