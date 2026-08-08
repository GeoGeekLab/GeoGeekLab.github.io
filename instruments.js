(() => {
  'use strict';

  const DATA_ROOT = window.GEOGEEK_DATA || {};
  const readLocale = () => {
    try { return localStorage.getItem('geogeek-language') === 'zh' ? 'zh' : 'en'; }
    catch { return 'en'; }
  };
  const locale = readLocale();
  const data = DATA_ROOT[locale] || DATA_ROOT.en || {};
  const ui = data.ui || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const dialog = $('#instrumentDialog');
  const stage = $('#instrumentStage');
  if (!dialog || !stage) return;

  const closeButton = $('#instrumentClose');
  const title = $('#instrumentTitle');
  const kicker = $('#instrumentKicker');
  const description = $('#instrumentDescription');
  const source = $('#instrumentSource');
  const readout = $('#instrumentReadout');
  const boundary = $('#instrumentBoundary');
  const principle = $('#labPrinciple');
  let cleanup = null;
  let activeInstrument = null;
  let instrumentSession = 0;
  let activeController = null;

  const labUI = ui.lab || {};
  if (principle) principle.textContent = labUI.principle || principle.textContent;
  if (closeButton) closeButton.setAttribute('aria-label', labUI.close || 'Close');
  if (boundary) boundary.textContent = labUI.boundary || boundary.textContent;

  function loadScript(src, globalName) {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    const existing = [...document.scripts].find(script => script.src === src);
    if (existing) return new Promise((resolve, reject) => {
      if (!globalName || window[globalName]) return resolve(globalName ? window[globalName] : true);
      existing.addEventListener('load', () => resolve(globalName ? window[globalName] : true), { once: true });
      existing.addEventListener('error', reject, { once: true });
    });
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve(globalName ? window[globalName] : true);
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  function setStageLoading(message) {
    stage.innerHTML = `<div class="instrument-loading"><span>⌁</span><strong>${message}</strong></div>`;
  }

  function dateString(date) {
    return date.toISOString().slice(0, 10);
  }

  async function mountOrbit({ signal } = {}) {
    setStageLoading(labUI.loadingOrbit || 'Reading the orbital field…');
    try {
      const module = await import('./orbital/orbital-engine.js');
      if (signal?.aborted) return () => {};
      return await module.mountOrbitalLab({ container: stage, locale, signal, labels: labUI.orbit || {} });
    } catch (error) {
      if (signal?.aborted) return () => {};
      stage.innerHTML = `<div class="instrument-error"><strong>${labUI.networkTitle || 'Live instrument unavailable.'}</strong><p>${labUI.networkHint || 'The orbital renderer could not be initialized.'}</p></div>`;
      return () => {};
    }
  }

  function mountEarth({ signal } = {}) {
    const now = new Date();
    const maxAge = 18;
    let age = 2;
    let playing = false;
    let timer = null;

    stage.innerHTML = `
      <div class="earth-layout">
        <div class="earth-image-wrap">
          <img id="earthImage" alt="NASA Earth observation imagery" referrerpolicy="no-referrer" />
          <div class="earth-grid" aria-hidden="true"></div>
          <span class="earth-stamp" id="earthStamp"></span>
        </div>
        <aside class="earth-controls">
          <div class="orbit-panel-label">${labUI.earth?.panel || 'TEMPORAL OBSERVATION'}</div>
          <strong>${labUI.earth?.title || 'Earth is not the same image twice.'}</strong>
          <label>${labUI.earth?.date || 'DATE'} <output id="earthDate"></output></label>
          <input id="earthRange" type="range" min="0" max="${maxAge}" value="${age}" step="1" />
          <button id="earthPlay" type="button">${labUI.earth?.play || 'PLAY CHANGE'}</button>
          <p>${labUI.earth?.note || 'Move through recent observations. Each frame is conditioned by sensor, orbit, atmosphere, and acquisition time.'}</p>
          <span class="source-line">NASA GIBS · MODIS TERRA · WMS</span>
        </aside>
      </div>`;

    const image = $('#earthImage', stage);
    const range = $('#earthRange', stage);
    const output = $('#earthDate', stage);
    const stamp = $('#earthStamp', stage);
    const play = $('#earthPlay', stage);

    function currentDate() {
      const d = new Date(now);
      d.setUTCDate(d.getUTCDate() - age);
      return dateString(d);
    }

    function render() {
      if (signal?.aborted) return;
      const date = currentDate();
      output.textContent = date;
      stamp.textContent = `MODIS / ${date}`;
      const params = new URLSearchParams({
        service: 'WMS', version: '1.1.1', request: 'GetMap',
        layers: 'MODIS_Terra_CorrectedReflectance_TrueColor', styles: '',
        format: 'image/jpeg', transparent: 'false', srs: 'EPSG:4326',
        bbox: '-180,-90,180,90', width: '1600', height: '800', time: date
      });
      image.classList.add('is-loading');
      image.src = `https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi?${params.toString()}`;
    }

    image.addEventListener('load', () => image.classList.remove('is-loading'));
    image.addEventListener('error', () => image.classList.remove('is-loading'));
    range.addEventListener('input', () => { age = Number(range.value); render(); });
    play.addEventListener('click', () => {
      playing = !playing;
      play.classList.toggle('is-active', playing);
      play.textContent = playing ? (labUI.earth?.pause || 'PAUSE') : (labUI.earth?.play || 'PLAY CHANGE');
      clearInterval(timer);
      if (playing) timer = setInterval(() => {
        age = age <= 0 ? maxAge : age - 1;
        range.value = String(age);
        render();
      }, 1300);
    });
    render();

    return () => { playing = false; clearInterval(timer); image.src = ''; };
  }

  function mountFlow({ signal } = {}) {
    const src = 'https://embed.windy.com/embed2.html?lat=31&lon=112&zoom=3&level=surface&overlay=wind&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&detailLat=31&detailLon=112&metricWind=default&metricTemp=default&radarRange=-1';
    if (signal?.aborted) return () => {};
    stage.innerHTML = `
      <div class="flow-layout">
        <iframe title="Wind flow field" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" src="${src}"></iframe>
        <div class="flow-caption"><span>${labUI.flow?.caption || 'WIND / FLOW'}</span><strong>${labUI.flow?.title || 'What appears still is already moving.'}</strong></div>
      </div>`;
    return () => { const frame = $('iframe', stage); if (frame) frame.src = 'about:blank'; };
  }



  async function mountPulse({ signal } = {}) {
    const TOPO_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
    const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
    try {
      await loadScript(TOPO_CDN, 'topojson');
      if (signal?.aborted) return () => {};
      const [worldRes, quakeRes] = await Promise.all([
        fetch(WORLD_ATLAS, { mode: 'cors', signal }),
        fetch('https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson', { mode: 'cors', signal })
      ]);
      if (!worldRes.ok || !quakeRes.ok) throw new Error('feed');
      const [world, quakes] = await Promise.all([worldRes.json(), quakeRes.json()]);
      if (signal?.aborted) return () => {};
      const collection = window.topojson.feature(world, world.objects.countries);
      const features = collection.features || [];
      const events = (quakes.features || []).slice(0, 180).map(f => ({
        mag: Number(f.properties?.mag || 0),
        place: f.properties?.place || '—',
        time: f.properties?.time || Date.now(),
        depth: Array.isArray(f.geometry?.coordinates) ? Number(f.geometry.coordinates[2] || 0) : 0,
        lon: Array.isArray(f.geometry?.coordinates) ? Number(f.geometry.coordinates[0] || 0) : 0,
        lat: Array.isArray(f.geometry?.coordinates) ? Number(f.geometry.coordinates[1] || 0) : 0
      }));
      stage.innerHTML = `<div class="pulse-layout"><div class="pulse-map-wrap"><svg class="pulse-map" viewBox="0 0 1000 540" role="img" aria-label="Earth Pulse map"></svg></div><aside class="pulse-panel"><div class="orbit-panel-label">${locale === 'zh' ? '地脉读数' : 'PULSE READOUT'}</div><strong id="pulseHeadline">${events.length} ${locale === 'zh' ? '次 / 过去 24 时' : 'events / past 24 hours'}</strong><dl><div><dt>${locale === 'zh' ? '最大震级' : 'MAX MAG'}</dt><dd id="pulseMax">—</dd></div><div><dt>${locale === 'zh' ? '最近事件' : 'LATEST'}</dt><dd id="pulseLatest">—</dd></div><div><dt>${locale === 'zh' ? '平均深度' : 'MEAN DEPTH'}</dt><dd id="pulseDepth">—</dd></div></dl><p>${locale === 'zh' ? '地有微动，图有所应。震级以大小见，深度以线示，新近以明暗示。' : 'The ground moves before the map does. Magnitude grows the circle, depth adds a stem, recency alters brightness.'}</p></aside></div>`;
      const svg = $('.pulse-map', stage);
      const maxNode = $('#pulseMax', stage);
      const latestNode = $('#pulseLatest', stage);
      const depthNode = $('#pulseDepth', stage);
      const headline = $('#pulseHeadline', stage);
      const NS = 'http://www.w3.org/2000/svg';
      const project = (lat, lon) => [((lon + 180) / 360) * 1000, ((90 - lat) / 180) * 540];
      const pathFor = geometry => {
        const rings = geometry.type === 'Polygon' ? [geometry.coordinates] : geometry.coordinates;
        return rings.map(poly => poly.map((ring, idx) => ring.map(([lon, lat], i) => `${(i===0 && idx===0)?'M':'L'}${project(lat, lon)[0].toFixed(2)},${project(lat, lon)[1].toFixed(2)}`).join(' ') + ' Z').join(' ')).join(' ');
      };
      const back = document.createElementNS(NS, 'rect'); back.setAttribute('width','1000'); back.setAttribute('height','540'); back.setAttribute('fill','rgba(11,16,13,.92)'); svg.appendChild(back);
      const grid = document.createElementNS(NS, 'g'); grid.setAttribute('stroke', 'rgba(241,239,231,.08)'); grid.setAttribute('stroke-width', '1');
      for (let i=1;i<12;i++){ const v=document.createElementNS(NS,'line'); v.setAttribute('x1', String(i*83.33)); v.setAttribute('x2', String(i*83.33)); v.setAttribute('y1','0'); v.setAttribute('y2','540'); grid.appendChild(v);} ;
      for (let i=1;i<6;i++){ const h=document.createElementNS(NS,'line'); h.setAttribute('x1','0'); h.setAttribute('x2','1000'); h.setAttribute('y1', String(i*90)); h.setAttribute('y2', String(i*90)); grid.appendChild(h);} ;
      svg.appendChild(grid);
      const landGroup = document.createElementNS(NS, 'g'); landGroup.setAttribute('fill', 'rgba(120,132,123,.42)'); landGroup.setAttribute('stroke', 'rgba(241,239,231,.18)'); landGroup.setAttribute('stroke-width', '0.9');
      features.forEach(f => { const p=document.createElementNS(NS,'path'); p.setAttribute('d', pathFor(f.geometry)); landGroup.appendChild(p); });
      svg.appendChild(landGroup);
      const eventGroup = document.createElementNS(NS, 'g'); svg.appendChild(eventGroup);
      const now = Date.now();
      events.forEach((e, idx) => {
        const [x, y] = project(e.lat, e.lon);
        const ageH = Math.max(0, (now - e.time) / 3600000);
        const alpha = Math.max(.22, 1 - ageH / 24);
        const stem = document.createElementNS(NS, 'line');
        stem.setAttribute('x1', x); stem.setAttribute('x2', x); stem.setAttribute('y1', y + 4); stem.setAttribute('y2', y + Math.min(16, 4 + e.depth / 25));
        stem.setAttribute('stroke', `rgba(241,239,231,${(0.16 + alpha * 0.28).toFixed(3)})`); stem.setAttribute('stroke-width', '1');
        const circle = document.createElementNS(NS, 'circle');
        circle.setAttribute('cx', x); circle.setAttribute('cy', y); circle.setAttribute('r', String(Math.max(2, 2 + e.mag * 1.2)));
        circle.setAttribute('fill', `rgba(166,70,36,${(0.28 + alpha * 0.45).toFixed(3)})`);
        circle.setAttribute('stroke', 'rgba(241,239,231,.72)'); circle.setAttribute('stroke-width', '0.7');
        circle.addEventListener('mouseenter', () => { headline.textContent = `${e.place}`; maxNode.textContent = `M ${e.mag.toFixed(1)}`; latestNode.textContent = `${Math.max(1, Math.round(ageH * 60))} ${locale === 'zh' ? '分钟前' : 'min ago'}`; depthNode.textContent = `${Math.round(e.depth)} km`; });
        eventGroup.appendChild(stem); eventGroup.appendChild(circle);
      });
      const mags = events.map(e => e.mag).filter(n => Number.isFinite(n));
      const meanDepth = events.reduce((sum, e) => sum + e.depth, 0) / Math.max(1, events.length);
      maxNode.textContent = `M ${Math.max(...mags).toFixed(1)}`;
      const latest = events.slice().sort((a,b) => b.time - a.time)[0];
      latestNode.textContent = latest ? latest.place : '—';
      depthNode.textContent = `${Math.round(meanDepth)} km`;
      return () => { stage.innerHTML = ''; };
    } catch (error) {
      if (signal?.aborted) return () => {};
      stage.innerHTML = `<div class="instrument-error"><strong>${locale === 'zh' ? '地震源暂不可达。' : 'Earthquake feed unavailable.'}</strong><p>USGS Earthquake GeoJSON</p></div>`;
      return () => {};
    }
  }

  function mountFigure({ signal } = {}) {
    if (signal?.aborted) return () => {};
    stage.innerHTML = `<div class="figure-layout"><div class="figure-stage"><canvas class="figure-canvas" width="520" height="360"></canvas><svg class="figure-svg" viewBox="0 0 520 360"></svg></div><aside class="figure-control"><div class="orbit-panel-label">${locale === 'zh' ? '抽象参数' : 'ABSTRACTION'}</div><label><span>${locale === 'zh' ? '阈值' : 'THRESHOLD'}</span><input id="figureThreshold" type="range" min="40" max="210" value="118"></label><label><span>${locale === 'zh' ? '线层' : 'CONTOUR LEVELS'}</span><input id="figureLevels" type="range" min="3" max="9" value="5"></label><label><span>${locale === 'zh' ? '简化' : 'SIMPLIFY'}</span><input id="figureSimplify" type="range" min="2" max="12" value="5"></label><p>${locale === 'zh' ? '去其文，何者尚存？一幅图像减去纹理、色与细屑，边界、区域与线迹便开始出现。' : 'At what point does an image become a map? Remove texture, color, and incidental detail; edge, region, and trace begin to appear.'}</p></aside></div>`;
    const canvas = $('.figure-canvas', stage);
    const svg = $('.figure-svg', stage);
    const ctx = canvas.getContext('2d');
    const NS = 'http://www.w3.org/2000/svg';
    const threshold = $('#figureThreshold', stage);
    const levels = $('#figureLevels', stage);
    const simplify = $('#figureSimplify', stage);
    const w = canvas.width, h = canvas.height;
    function field(x, y) {
      const nx = x / w, ny = y / h;
      const a = Math.sin(nx * 8.4 + ny * 5.6) * .5 + .5;
      const b = Math.sin(nx * 17.3 - ny * 9.2) * .5 + .5;
      const c = Math.cos(Math.hypot(nx - .62, ny - .48) * 18) * .5 + .5;
      return (a * .45 + b * .28 + c * .27) * 255;
    }
    function drawRaster() {
      const image = ctx.createImageData(w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const value = field(x, y);
          const i = (y * w + x) * 4;
          image.data[i] = value * .92;
          image.data[i + 1] = value * .96;
          image.data[i + 2] = value;
          image.data[i + 3] = 255;
        }
      }
      ctx.putImageData(image, 0, 0);
      ctx.fillStyle = 'rgba(12,17,14,.28)';
      ctx.fillRect(0,0,w,h);
    }
    function drawVector() {
      svg.innerHTML = '';
      const lvl = Number(levels.value);
      const step = Number(simplify.value) * 2;
      const thr = Number(threshold.value);
      for (let l = 0; l < lvl; l++) {
        const target = thr + (l - (lvl - 1) / 2) * 12;
        const path = document.createElementNS(NS, 'path');
        let d = '';
        for (let y = step; y < h; y += step) {
          let active = false;
          for (let x = step; x < w; x += step) {
            const v = field(x, y);
            if (Math.abs(v - target) < 5) {
              d += `${active ? 'L' : 'M'}${x},${y} `;
              active = true;
            } else if (active) { active = false; }
          }
        }
        path.setAttribute('d', d.trim());
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', l === Math.floor(lvl / 2) ? 'rgba(166,70,36,.92)' : 'rgba(241,239,231,.52)');
        path.setAttribute('stroke-width', l === Math.floor(lvl / 2) ? '1.8' : '1.1');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(path);
      }
      const region = document.createElementNS(NS, 'path');
      region.setAttribute('d', `M40,270 C90,160 180,120 260,150 C330,178 380,140 452,82 L520,80 L520,360 L0,360 L0,322 C48,316 85,302 134,278 C178,257 212,266 256,290 C308,318 382,322 520,290`);
      region.setAttribute('fill', 'rgba(166,70,36,.16)');
      svg.appendChild(region);
    }
    function render() { drawRaster(); drawVector(); }
    [threshold, levels, simplify].forEach(input => input.addEventListener('input', render));
    render();
    return () => { stage.innerHTML = ''; };
  }



  async function mountWorld({ signal } = {}) {
    const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
    const DATA_URL = 'https://raw.githubusercontent.com/martynafford/natural-earth-geojson/master/110m/cultural/ne_110m_admin_0_countries.json';
    setStageLoading(locale === 'zh' ? '正在重绘世界…' : 'Reprojecting the world…');
    try {
      await loadScript(D3_CDN, 'd3');
      const res = await fetch(DATA_URL, { mode:'cors', signal });
      if (!res.ok) throw new Error('Natural Earth');
      const world = await res.json();
      if (signal?.aborted) return () => {};
      stage.innerHTML = `
        <div class="world-layout">
          <div class="world-map-wrap"><svg class="world-map" viewBox="0 0 1000 610" role="img" aria-label="World as Relation"></svg><div class="world-hover" id="worldHover"></div></div>
          <aside class="world-panel">
            <div class="orbit-panel-label">${locale === 'zh' ? '图法' : 'PROJECTION'}</div>
            <div class="world-controls" role="group" aria-label="Projection">
              <button type="button" class="is-active" data-projection="equal">${locale === 'zh' ? '等地观' : 'EQUAL EARTH'}</button>
              <button type="button" data-projection="mercator">MERCATOR</button>
              <button type="button" data-projection="ortho">${locale === 'zh' ? '正射' : 'ORTHOGRAPHIC'}</button>
            </div>
            <dl>
              <div><dt>${locale === 'zh' ? '所守' : 'VISIBLE RELATION'}</dt><dd id="worldRelation">${locale === 'zh' ? '整体面积关系较均衡' : 'Area relationships remain comparatively legible'}</dd></div>
              <div><dt>${locale === 'zh' ? '所指' : 'SELECTED'}</dt><dd id="worldSelected">—</dd></div>
              <div><dt>${locale === 'zh' ? '同域' : 'SUBREGION'}</dt><dd id="worldRegion">—</dd></div>
            </dl>
            <p>${locale === 'zh' ? '世界不是一个既定的底图。换一种投影，所显的距离、面积与形状关系便随之改写。悬停一地，可见其名；点击一地，则同一分区之地相互显现。' : 'The world is not a neutral basemap. Change the projection and the visible relations among area, shape, and distance change with it. Hover to read a place; click to expose its subregional affinity.'}</p>
            <span class="source-line">Natural Earth · 1:110m · CC0</span>
          </aside>
        </div>`;
      const svg=d3.select($('.world-map',stage));
      const hover=$('#worldHover',stage), selected=$('#worldSelected',stage), region=$('#worldRegion',stage), relation=$('#worldRelation',stage);
      const features=world.features || [];
      const graticule=d3.geoGraticule10();
      let mode='equal', chosen=null, rotate=[-10,-12];
      const projectionFor=()=>{
        if(mode==='mercator') return d3.geoMercator().fitExtent([[34,28],[966,582]],world);
        if(mode==='ortho') return d3.geoOrthographic().rotate(rotate).clipAngle(90).fitExtent([[44,36],[956,574]],{type:'Sphere'});
        return d3.geoEqualEarth().fitExtent([[32,28],[968,582]],world);
      };
      function visibleFeature(f, projection){
        if(mode!=='ortho') return true;
        const c=d3.geoCentroid(f); const p=projection(c); return p && Number.isFinite(p[0]) && Number.isFinite(p[1]);
      }
      function draw(){
        const projection=projectionFor(), path=d3.geoPath(projection);
        svg.selectAll('*').remove();
        svg.append('rect').attr('width',1000).attr('height',610).attr('fill','rgba(8,12,10,.98)');
        svg.append('path').datum({type:'Sphere'}).attr('d',path).attr('fill','rgba(18,26,21,.88)').attr('stroke','rgba(241,239,231,.22)').attr('stroke-width',1.1);
        svg.append('path').datum(graticule).attr('d',path).attr('fill','none').attr('stroke','rgba(241,239,231,.075)').attr('stroke-width','.8');
        const countries=svg.append('g').selectAll('path').data(features.filter(f=>visibleFeature(f,projection))).join('path')
          .attr('d',path).attr('fill',f=> chosen && f.properties?.SUBREGION===chosen ? 'rgba(166,70,36,.32)' : 'rgba(150,161,152,.28)')
          .attr('stroke','rgba(241,239,231,.24)').attr('stroke-width','.65')
          .on('pointerenter',(event,f)=>{ const pr=f.properties||{}; hover.textContent=pr.NAME || pr.ADMIN || '—'; hover.style.opacity='1'; selected.textContent=pr.NAME_LONG || pr.NAME || '—'; region.textContent=pr.SUBREGION || pr.CONTINENT || '—'; })
          .on('pointermove',event=>{ const r=stage.getBoundingClientRect(); hover.style.left=`${event.clientX-r.left+16}px`; hover.style.top=`${event.clientY-r.top+14}px`; })
          .on('pointerleave',()=>{hover.style.opacity='0';})
          .on('click',(event,f)=>{ chosen=f.properties?.SUBREGION || null; draw(); selected.textContent=f.properties?.NAME_LONG || f.properties?.NAME || '—'; region.textContent=chosen || '—'; });
        if(mode==='ortho') countries.attr('stroke-width','.8');
      }
      const relations={ equal: locale==='zh'?'整体面积关系较均衡':'Area relationships remain comparatively legible', mercator: locale==='zh'?'局部方向与角度较直观，极区面积显著放大':'Local direction and angle stay familiar while polar area expands', ortho: locale==='zh'?'由一观察点见半球，远近受视点支配':'One viewpoint reveals one hemisphere; distance is conditioned by the observer' };
      $$('.world-controls button',stage).forEach(btn=>btn.addEventListener('click',()=>{ mode=btn.dataset.projection; chosen=null; $$('.world-controls button',stage).forEach(b=>b.classList.toggle('is-active',b===btn)); relation.textContent=relations[mode]; draw(); }));
      const mapWrap=$('.world-map-wrap',stage); let dragging=false,lastX=0,lastY=0;
      mapWrap.addEventListener('pointerdown',e=>{ if(mode!=='ortho')return; dragging=true;lastX=e.clientX;lastY=e.clientY;mapWrap.setPointerCapture(e.pointerId); });
      mapWrap.addEventListener('pointermove',e=>{ if(!dragging||mode!=='ortho')return; rotate=[rotate[0]+(e.clientX-lastX)*.35, Math.max(-80,Math.min(80,rotate[1]-(e.clientY-lastY)*.28))];lastX=e.clientX;lastY=e.clientY;draw(); });
      mapWrap.addEventListener('pointerup',()=>dragging=false); mapWrap.addEventListener('pointercancel',()=>dragging=false);
      draw();
      return ()=>{stage.innerHTML='';};
    } catch(error){
      if(signal?.aborted) return ()=>{};
      stage.innerHTML=`<div class="instrument-error"><strong>${locale==='zh'?'世界几何暂不可达。':'World geometry unavailable.'}</strong><p>Natural Earth GeoJSON · CC0</p></div>`;
      return ()=>{};
    }
  }

  const mounts = window.GeoGeekInstrumentMounts = window.GeoGeekInstrumentMounts || {};
  Object.assign(mounts, { orbit: mountOrbit, earth: mountEarth, flow: mountFlow, pulse: mountPulse, figure: mountFigure, world: mountWorld });

  async function openInstrument(kind, item) {
    if (!mounts[kind]) return;

    const session = ++instrumentSession;
    activeController?.abort();
    activeController = new AbortController();
    const { signal } = activeController;

    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    activeInstrument = kind;
    stage.innerHTML = '';
    title.textContent = item?.title || kind;
    kicker.textContent = item?.instrumentKicker || labUI.instrument || 'INSTRUMENT';
    description.textContent = item?.description || '';
    source.textContent = item?.source || '';
    readout.textContent = `${ui.scale?.levels?.DETAIL || 'DETAIL'} / 1 : 500`;
    if (!dialog.open) dialog.showModal();
    document.body.classList.add('instrument-open');
    window.GeoField?.pause?.();
    window.GeoScale?.apply?.('DETAIL');

    try {
      const nextCleanup = await mounts[kind]({ signal, stage, ui, labUI, data, locale, item });
      if (session !== instrumentSession || signal.aborted || !dialog.open) {
        try { nextCleanup?.(); } catch {}
        return;
      }
      cleanup = nextCleanup || null;
    } catch (error) {
      if (signal.aborted || session !== instrumentSession) return;
      stage.innerHTML = `<div class="instrument-error"><strong>${labUI.networkTitle || 'Live instrument unavailable.'}</strong><p>${labUI.networkHint || 'The live source could not be initialized.'}</p></div>`;
    }
  }

  function closeInstrument() {
    instrumentSession += 1;
    activeController?.abort();
    activeController = null;
    if (cleanup) { try { cleanup(); } catch {} cleanup = null; }
    activeInstrument = null;
    stage.innerHTML = '';
    if (dialog.open) dialog.close();
    document.body.classList.remove('instrument-open');
    window.GeoField?.resume?.();
    window.GeoScale?.restore?.();
  }

  document.addEventListener('click', event => {
    const button = event.target.closest('[data-instrument]');
    if (!button) return;
    const kind = button.dataset.instrument;
    const item = (data.lab || []).find(entry => entry.instrument === kind);
    openInstrument(kind, item);
  });

  closeButton?.addEventListener('click', closeInstrument);
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeInstrument(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) closeInstrument(); });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && activeInstrument) window.GeoField?.pause?.();
  });
})();
