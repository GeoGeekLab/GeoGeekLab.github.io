import {NODES,OD,TRIPS,OD_UNIT,TRIP_TIME_UNIT,sortedEdges,odNodeTotals,odNetworkTotals,odPairTotals,tripMetrics,tripPosition,greatCircleKm} from './flow/v3/core/movement.mjs';
(() => {
  'use strict';

  const MODES = ['field', 'od', 'trips', 'release'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const rad = value => value * Math.PI / 180;
  const deg = value => value * 180 / Math.PI;

  const META = {
    field: { attached:'SPACE', time:'SNAPSHOT', encodes:'VELOCITY VECTOR', valid:'LOCAL MOTION', question:'How is the medium moving here?', forbid:'particle trail ≠ forecast / object track' },
    od: { attached:'PLACE PAIRS', time:'AGGREGATE', encodes:'FLOW MAGNITUDE', valid:'CONNECTIVITY VOLUME', question:'How much movement connects A and B?', forbid:'arc ≠ literal route / trajectory' },
    trips: { attached:'MOVING ENTITY', time:'SEQUENCE', encodes:'ORDERED POSITIONS', valid:'WHERE + WHEN', question:'Where did an entity move, and when?', forbid:'interpolation ≠ additional observation' },
    release: { attached:'PARTICLE ENSEMBLE', time:'DERIVED', encodes:'ADVECTION', valid:'IF FIELD FROZE', question:'Where could material move in a frozen field?', forbid:'release ≠ forecast / uncertainty envelope' }
  };

  // All directed connections and teaching samples come from the shared movement core.

  function ensureStyle() {
    if (document.querySelector('link[data-flow-round2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./flow-lab-round2.css?v=20261114-flow-v3-s5', import.meta.url).href;
    link.dataset.flowRound2 = '1';
    document.head.appendChild(link);
  }

  function cartesian(lon, lat) {
    const la = rad(lat), lo = rad(lon), c = Math.cos(la);
    return [c * Math.cos(lo), c * Math.sin(lo), Math.sin(la)];
  }

  function sphericalInterpolate(a, b, t) {
    const A = cartesian(a[0], a[1]), B = cartesian(b[0], b[1]);
    const dot = clamp(A[0]*B[0] + A[1]*B[1] + A[2]*B[2], -1, 1);
    const omega = Math.acos(dot);
    if (omega < 1e-7) return [a[0] + (b[0]-a[0])*t, a[1] + (b[1]-a[1])*t];
    const sinOmega = Math.sin(omega);
    const w0 = Math.sin((1-t)*omega) / sinOmega;
    const w1 = Math.sin(t*omega) / sinOmega;
    const x = A[0]*w0 + B[0]*w1, y = A[1]*w0 + B[1]*w1, z = A[2]*w0 + B[2]*w1;
    return [deg(Math.atan2(y, x)), deg(Math.atan2(z, Math.hypot(x, y)))];
  }

  function linearTripPoint(trip, t) {
    const pts = trip.pts;
    if (t <= pts[0][2]) return pts[0];
    if (t >= pts.at(-1)[2]) return pts.at(-1);
    for (let i = 1; i < pts.length; i += 1) {
      if (t > pts[i][2]) continue;
      const a = pts[i-1], b = pts[i], f = (t-a[2])/(b[2]-a[2]);
      return [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f, t];
    }
    return pts.at(-1);
  }

  function geoTripPoint(trip,t){
    const result=tripPosition(trip,t);
    return [result.position[0],result.position[1],result.time];
  }

  function geoTripTrail(trip, t, trail) {
    const start = Math.max(trip.pts[0][2], t - trail);
    const points = [];
    for (let q = start; q < t; q += 1) points.push(geoTripPoint(trip, q));
    points.push(geoTripPoint(trip, t));
    return points;
  }

  function greatCircle(a, b, steps = 40) {
    return Array.from({ length:steps+1 }, (_, i) => sphericalInterpolate(a, b, i/steps));
  }

  function currentZoom(root) {
    const n = parseFloat($('#flZoom', root)?.textContent || '100');
    return Number.isFinite(n) ? n / 100 : 1;
  }

  function projectionFromAnchor(root, mode) {
    const map = $('#flMap', root), svg = $('#flSvg', root);
    if (!map || !svg) return null;
    const rect = map.getBoundingClientRect(), z = currentZoom(root);
    const worldWidth = Math.min(rect.width, rect.height*2)*z;
    const ax = worldWidth / 360, ay = -worldWidth / 360;
    let anchorNode = null, geo = null;
    if (mode === 'od') {
      anchorNode = $('[data-type="node"]', svg);
      geo = anchorNode ? NODES[anchorNode.dataset.id] : null;
    } else if (mode === 'trips') {
      anchorNode = $$(':scope > circle:not([data-type])', svg)[0];
      const t = Number($('#flTripTime', root)?.value || 30);
      geo = anchorNode ? linearTripPoint(TRIPS[0], t) : null;
    }
    if (!anchorNode || !geo) return null;
    const x = Number(anchorNode.getAttribute('cx')), y = Number(anchorNode.getAttribute('cy'));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return {
      ax, ay,
      bx:x - ax*geo[0], by:y - ay*geo[1],
      worldWidth,
      project(lon, lat) { return [ax*lon + this.bx, ay*lat + this.by]; }
    };
  }

  function pathD(points, projection) {
    let d = '', lastX = null;
    for (const point of points) {
      const [x, y] = projection.project(point[0], point[1]);
      const split = lastX !== null && Math.abs(x-lastX) > projection.worldWidth*.46;
      d += `${lastX === null || split ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)} `;
      lastX = x;
    }
    return d.trim();
  }

  function updateUrl(updates = {}) {
    const url = new URL(location.href);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === undefined || value === '') url.searchParams.delete(key);
      else url.searchParams.set(key, String(value));
    });
    history.replaceState(history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }

  function activateWorkspaceMode(mode) {
    const dialog = $('#instrumentDialog');
    const button = $(`.instrument-workspace-modes button[data-workspace-mode="${mode}"]`, dialog || document);
    if (button && button.getAttribute('aria-pressed') !== 'true') button.click();
  }

  function refine(root) {
    if (!root || root.dataset.flowRound2 === '1') return;
    const shell = $('.flow-lab', root), map = $('#flMap', root), rail = $('.flow-rail', root), tabs = $('.flow-tabs', root), svg = $('#flSvg', root), dynamic = $('#flDynamic', root);
    if (!shell || !map || !rail || !tabs || !svg || !dynamic) return;
    root.dataset.flowRound2 = '1';
    shell.dataset.flowRound2 = '1';
    ensureStyle();
    // Put persistent controls in document flow, outside projected geography.
    const main=document.createElement('div');
    main.className='flow-main';
    const bar=document.createElement('header');
    bar.className='flow-workbar';
    bar.setAttribute('aria-label','Flow representation and playback controls');
    const footer=document.createElement('footer');
    footer.className='flow-map-footer';
    footer.setAttribute('aria-label','Map legend, projection and navigation');
    shell.insertBefore(main,map);
    main.append(bar,map,footer);
    const hud=$('.flow-hud',map);
    if(hud)bar.append(tabs,hud);
    const legend=$('.flow-legend',map),zoom=$('.flow-zoom',map);
    if(legend)footer.append(legend);
    if(zoom)footer.append(zoom);

    const cards = $$('.flow-card', rail);
    const controlCard = cards[0], readCard = cards[1], sourceCard = cards[2];
    if (controlCard) controlCard.dataset.flowSection = 'control';
    if (readCard) readCard.dataset.flowSection = 'read';
    if (sourceCard) sourceCard.dataset.flowSection = 'source';

    const nav = document.createElement('nav');
    nav.className = 'flow-rail-nav';
    nav.setAttribute('aria-label', 'Flow workspace sections');
    nav.innerHTML = `
      <button type="button" data-flow-jump="control" aria-pressed="true">CONTROL</button>
      <button type="button" data-flow-jump="read" aria-pressed="false">READ</button>
      <button type="button" data-flow-jump="source" aria-pressed="false">SOURCE</button>`;
    rail.prepend(nav);

    const summary = document.createElement('section');
    summary.className = 'flow-active-summary';
    summary.setAttribute('aria-live', 'polite');
    summary.innerHTML = `
      <span>ACTIVE GRAMMAR</span>
      <strong data-flow-summary-title>—</strong>
      <p data-flow-summary-question>—</p>
      <small>DO NOT INFER · <b data-flow-summary-forbid>—</b></small>`;
    nav.after(summary);

    const strip = document.createElement('div');
    strip.className = 'flow-grammar-strip';
    strip.setAttribute('aria-label', 'Movement grammar');
    strip.innerHTML = `
      <div><span>ATTACHED TO</span><strong data-flow-attach>—</strong></div>
      <div><span>TIME</span><strong data-flow-time>—</strong></div>
      <div><span>ENCODES</span><strong data-flow-encodes>—</strong></div>
      <div><span>VALID INFERENCE</span><strong data-flow-valid>—</strong></div>`;
    summary.after(strip);

    const projectionReadout = document.createElement('div');
    projectionReadout.className = 'flow-projection-readout';
    projectionReadout.innerHTML = '<span>PLATE CARRÉE · 2:1 FIT</span><strong data-flow-ew-scale>EW / NS ×1.00 @ 0°</strong>';
    footer.insertBefore(projectionReadout,zoom||null);
    const pinned=$('#flSampleReadout',map);
    if(pinned)footer.insertBefore(pinned,projectionReadout);

    const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    overlay.setAttribute('class', 'flow-geo-overlay');
    overlay.setAttribute('aria-hidden', 'true');
    map.appendChild(overlay);

    if (sourceCard && !$('.flow-r2-provenance', sourceCard)) {
      const p = document.createElement('div');
      p.className = 'flow-r2-provenance';
      p.innerHTML = `
        <div><span>PROJECTION</span><strong>Plate Carrée · geographic display frame</strong></div>
        <div><span>INTERPOLATION</span><strong>TRIPS · shortest great-circle between supplied teaching samples</strong></div>
        <div><span>BOUNDARY</span><strong>Geodesic display ≠ observed route · frozen-field release ≠ forecast</strong></div>`;
      sourceCard.appendChild(p);
    }

    const analysis=document.createElement('section');
    analysis.id='flMovementAnalysis';
    analysis.className='flow-movement-analysis';
    analysis.setAttribute('aria-label','OD or TRIPS quantitative analysis');
    dynamic.after(analysis);
    let odGeometry = new URL(location.href).searchParams.get('flowGeometry') === 'geodesic' ? 'geodesic' : 'schematic';
    let selectedNode = new URL(location.href).searchParams.get('flowNode') || '';
    if(!Object.hasOwn(NODES,selectedNode))selectedNode='';
    let selectedTrip = new URL(location.href).searchParams.get('flowTrip') || '';
    if(!/^[0-7]$/.test(selectedTrip))selectedTrip='';
    let odPeer = new URL(location.href).searchParams.get('flowPeer') || 'lon';
    if(!Object.hasOwn(NODES,odPeer))odPeer='lon';
    let overlayRaf=0, pointerRaf=0, overlayFrames=0;
    const ownedTimeouts=new Set();
    function deferOverlay(fn,delay=0){
      const id=setTimeout(()=>{ownedTimeouts.delete(id);if(root.isConnected)fn();},delay);
      ownedTimeouts.add(id);
    }

    function mode() { return shell.dataset.mode || 'field'; }

    function syncTabs() {
      const active = mode();
      $$('.flow-tabs button[data-mode]', root).forEach(button => {
        button.setAttribute('role', 'tab');
        const on = button.dataset.mode === active;
        button.setAttribute('aria-selected', String(on));
        button.setAttribute('tabindex', on ? '0' : '-1');
      });
      tabs.setAttribute('role', 'tablist');
      tabs.setAttribute('aria-label', 'Movement representation');
    }

    const fmt=value=>Number(value).toLocaleString('en-US',{maximumFractionDigits:1});
    function renderOdAnalysis(){
      const nodeId=selectedNode||'nyc';
      if(odPeer===nodeId)odPeer=Object.keys(NODES).find(id=>id!==nodeId);
      const total=odNodeTotals(nodeId),visible=sortedEdges(OD,
        Number($('#flTop',root)?.value||12));
      const displayed=odNodeTotals(nodeId,visible);
      const pair=odPairTotals(nodeId,odPeer);
      const totalNet=odNetworkTotals();
      analysis.innerHTML=`<div class="flow-analysis-head"><strong>DIRECTED OD · TEACHING REFERENCE</strong>
        <small>Normalized units · not observed movement or actual routes</small></div>
        <div class="flow-analysis-metrics">
          <div><span>OUT · ALL</span><strong data-od-out>${fmt(total.out)}</strong></div>
          <div><span>IN · ALL</span><strong data-od-in>${fmt(total.in)}</strong></div>
          <div><span>NET · ALL</span><strong data-od-net>${total.net>0?'+':''}${fmt(total.net)}</strong></div>
        </div>
        <p class="flow-analysis-note">Selected: ${NODES[nodeId][2]}. ${visible.length}/${OD.length} highest-weight edges displayed.
        Visible OUT ${fmt(displayed.out)} / IN ${fmt(displayed.in)}.
        Total directed network weight: ${fmt(totalNet.total)} normalized units.</p>
        <label class="flow-analysis-peer-label">COMPARE WITH
          <select data-flow-peer aria-label="Compare directed flows with another place">
          ${Object.keys(NODES).filter(id=>id!==nodeId).map(id=>
            `<option value="${id}" ${odPeer===id?'selected':''}>${NODES[id][2]}</option>`).join('')}
          </select>
        </label>
        <div class="flow-pair-table" aria-label="Directed pair comparison">
          <div><span>${NODES[nodeId][2]} → ${NODES[odPeer][2]}</span>
            <strong data-od-forward>${fmt(pair.forward)} units</strong>
            <span class="flow-pair-bar"><i style="width:${pair.total?100*pair.forward/pair.total:0}%"></i></span></div>
          <div><span>${NODES[odPeer][2]} → ${NODES[nodeId][2]}</span>
            <strong data-od-reverse>${fmt(pair.reverse)} units</strong>
            <span class="flow-pair-bar"><i style="width:${pair.total?100*pair.reverse/pair.total:0}%"></i></span></div>
        </div>
        <div class="flow-analysis-note">PAIR NET · <b data-od-pair-net>${pair.net>0?'+':''}${fmt(pair.net)} normalized units</b>
        toward ${pair.net>=0?NODES[odPeer][2]:NODES[nodeId][2]} when nonzero. The two arrows are distinct directed edges.</div>`;
    }
    function renderTripAnalysis(){
      const id=selectedTrip===''?0:Number(selectedTrip),trip=TRIPS[id];
      if(!trip)return;
      const stats=tripMetrics(trip);
      const value=Number(shell.dataset.tripTime||$('#flTripTime',root)?.value||30);
      const current=tripPosition(trip,value);
      const sampleState=current.clamped?'OUTSIDE SAMPLE WINDOW':current.sampled?'AUTHORED SAMPLE':'INTERPOLATED DISPLAY POSITION';
      analysis.innerHTML=`<div class="flow-analysis-head"><strong>TRIPS · TEACHING SAMPLES</strong>
        <small>Time = relative authored units · never UTC</small></div>
        <div class="flow-analysis-metrics">
          <div><span>SAMPLES</span><strong data-trip-samples>${stats.samples}</strong></div>
          <div><span>ARC DISTANCE</span><strong data-trip-distance>${fmt(stats.totalDistanceKm)} km</strong></div>
          <div><span>TIME SPAN</span><strong data-trip-duration>${fmt(stats.durationUnits)} units</strong></div>
        </div>
        <p class="flow-analysis-note">Track: ${trip.name}. Relative time ${fmt(value)}.
          <strong data-trip-position-kind>${sampleState}</strong>.
          Display position ${current.position[1].toFixed(2)}° latitude,
          ${current.position[0].toFixed(2)}° longitude.</p>
        <p class="flow-analysis-note">Sample spacing: average
          <b data-trip-spacing>${fmt(stats.averageSamplingGapUnits)}</b>,
          maximum ${fmt(stats.maxSamplingGapUnits)} time units.
          Geodesic arc length is a calculation between authored samples, not a measured distance traveled.</p>
        <div class="flow-segment-list" aria-label="Sample-to-sample geodesic segments">
          ${stats.segments.map(seg=>`<div><span>S${seg.from} → S${seg.to}</span>
          <strong>${fmt(seg.distanceKm)} km</strong><small>Δt ${fmt(seg.durationUnits)} units</small></div>`).join('')}
        </div>
        <p class="flow-analysis-note">Solid track = geodesic interpolation.
          Hollow circles = supplied teaching samples.
          Filled head = current display time. Neither interpolation nor arc length adds observations.</p>`;
    }
    function syncMovementAnalysis(){
      if(mode()==='od'){analysis.hidden=false;renderOdAnalysis();}
      else if(mode()==='trips'){analysis.hidden=false;renderTripAnalysis();}
      else{analysis.hidden=true;analysis.replaceChildren();}
    }

    function syncSummary() {
      const active = mode(), meta = META[active] || META.field;
      $('[data-flow-summary-title]', summary).textContent = `${active.toUpperCase()} · ${meta.encodes} ATTACHED TO ${meta.attached}`;
      $('[data-flow-summary-question]', summary).textContent = meta.question;
      $('[data-flow-summary-forbid]', summary).textContent = meta.forbid;
      $('[data-flow-attach]', strip).textContent = meta.attached;
      $('[data-flow-time]', strip).textContent = meta.time;
      $('[data-flow-encodes]', strip).textContent = meta.encodes;
      $('[data-flow-valid]', strip).textContent = meta.valid;
      updateUrl({ flowMode:active });
    }

    function syncWorkspace() {
      const dialog = root.closest('.instrument-dialog');
      const workspace = dialog?.dataset.workspaceMode || 'work';
      shell.dataset.flowDensity = workspace;
      if (sourceCard) {
        if (workspace === 'inspect') sourceCard.removeAttribute('aria-hidden');
        else sourceCard.setAttribute('aria-hidden', 'true');
      }
      // Focus has no inspector rail. Keep the accessible OD/TRIPS selection
      // in the visible workbar instead of hiding the only keyboard alternative.
      if(workspace==='focus'&&['od','trips'].includes(mode())){
        if(access.parentElement!==bar)bar.append(access);
      }else if(controlCard&&access.parentElement!==controlCard){
        controlCard.append(access);
      }
      // Move the SAME native timeline; never clone it or start a second clock.
      const activeTimeline=dynamic.querySelector('.flow-timeline');
      const docked=bar.querySelector('.flow-timeline');
      if(mode()!=='trips'){docked?.remove();}
      else if(workspace==='focus'){
        if(activeTimeline){docked?.remove();bar.append(activeTimeline);}
      }else if(docked)dynamic.prepend(docked);
    }

    function restoreBaseGeometry() {
      $$('[data-flow-r2-hidden="1"]', svg).forEach(node => {
        node.style.opacity = '';
        node.style.pointerEvents = '';
        delete node.dataset.flowR2Hidden;
      });
      overlay.replaceChildren();
    }

    function hideBase(nodes) {
      nodes.forEach(node => {
        node.dataset.flowR2Hidden = '1';
        node.style.opacity = '0';
        node.style.pointerEvents = 'none';
      });
    }

    function appendPath(d, attrs = {}) {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', d);
      path.setAttribute('fill', 'none');
      Object.entries(attrs).forEach(([key, value]) => path.setAttribute(key, String(value)));
      overlay.appendChild(path);
      return path;
    }

    function renderTripsOverlay() {
      const projection = projectionFromAnchor(root, 'trips');
      if (!projection) return;
      const basePaths = $$('[data-type="trip"]', svg);
      const baseHeads = $$(':scope > circle:not([data-type])', svg);
      hideBase([...basePaths, ...baseHeads]);
      const time = Number($('#flTripTime', root)?.value || 30), trail = Number($('#flTrail', root)?.value || 22);
      TRIPS.forEach((trip, id) => {
        const points = geoTripTrail(trip, time, trail);
        const path = appendPath(pathD(points, projection), {
          class:'flow-r2-trip-path',
          stroke:trip.color === 'warm' ? 'rgba(209,99,57,.92)' : 'rgba(241,239,231,.72)',
          'stroke-width':2.2,
          'stroke-linecap':'round',
          'data-flow-trip':id
        });
        if (String(id) !== selectedTrip && selectedTrip) path.classList.add('is-dim');
        const headGeo = geoTripPoint(trip, time), head = projection.project(headGeo[0], headGeo[1]);
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', head[0]); circle.setAttribute('cy', head[1]); circle.setAttribute('r', '3');
        circle.setAttribute('fill', trip.color === 'warm' ? '#e57449' : '#f1efe7');
        circle.setAttribute('data-flow-trip-head', id);
        if (String(id) !== selectedTrip && selectedTrip) circle.classList.add('is-dim');
        const status=tripPosition(trip,time);
        circle.dataset.flowPositionKind=status.sampled?'sampled':status.clamped?'clamped':'interpolated';
        overlay.appendChild(circle);
        // Distinct hollow markers are authored teaching samples, never interpolated points.
        if(!selectedTrip||String(id)===selectedTrip){
          trip.pts.forEach((sample,index)=>{
            const xy=projection.project(sample[0],sample[1]);
            const marker=document.createElementNS('http://www.w3.org/2000/svg','circle');
            marker.setAttribute('cx',xy[0]);marker.setAttribute('cy',xy[1]);
            marker.setAttribute('r',String(selectedTrip?4.6:3.2));
            marker.setAttribute('class','flow-r2-sample-marker');
            marker.setAttribute('data-flow-sample',String(index));
            marker.setAttribute('data-flow-sample-trip',String(id));
            marker.setAttribute('fill','#07120d');
            marker.setAttribute('stroke',trip.color==='warm'?'#efa277':'#c9f0e5');
            marker.setAttribute('stroke-width','1.3');
            marker.style.pointerEvents='none';
            overlay.appendChild(marker);
          });
        }
      });
    }

    function renderOdOverlay() {
      if (odGeometry !== 'geodesic') return;
      const projection = projectionFromAnchor(root, 'od');
      if (!projection) return;
      const basePaths = $$('[data-type="od"]', svg);
      hideBase(basePaths);
      basePaths.forEach(basePath => {
        const id = Number(basePath.dataset.id), edge = OD[id];
        if (!edge) return;
        const a = NODES[edge.a], b = NODES[edge.b];
        const path = appendPath(pathD(greatCircle(a, b), projection), {
          class:'flow-r2-od-path',
          stroke:'rgba(209,99,57,.72)',
          'stroke-width':1.2 + edge.value/34,
          'stroke-linecap':'round',
          'marker-end':'url(#flOdArrow)',
          'data-flow-direction':edge.a+'-to-'+edge.b,
          'data-flow-od':id
        });
        if (selectedNode && edge.a !== selectedNode && edge.b !== selectedNode) path.classList.add('is-dim');
      });
    }

    function applyBaseOdFocus() {
      $$('[data-type="od"]', svg).forEach(path => {
        const edge = OD[Number(path.dataset.id)];
        path.classList.toggle('flow-r2-dim', Boolean(selectedNode && edge && edge.a !== selectedNode && edge.b !== selectedNode));
      });
      $$('[data-type="node"]', svg).forEach(node => node.classList.toggle('flow-r2-selected', node.dataset.id === selectedNode));
    }

    function renderOverlay(){
      cancelAnimationFrame(overlayRaf);
      overlayRaf=requestAnimationFrame(()=>{
        overlayFrames++;
        shell.dataset.flowOverlayRenders=String(overlayFrames);
        restoreBaseGeometry();
        const active = mode();
        if (active === 'trips') renderTripsOverlay();
        if (active === 'od') {
          applyBaseOdFocus();
          renderOdOverlay();
        }
      });
    }

    function ensureOdGeometryControl() {
      const active = mode();
      let group = $('.flow-geometry-choice', controlCard || root);
      if (active !== 'od') {
        group?.remove();
        return;
      }
      if (!group) {
        group = document.createElement('div');
        group.className = 'flow-geometry-choice';
        group.setAttribute('role', 'group');
        group.setAttribute('aria-label', 'OD connection geometry');
        group.innerHTML = '<span>CONNECTION GEOMETRY</span><div><button type="button" data-flow-geometry="schematic">SCHEMATIC</button><button type="button" data-flow-geometry="geodesic">GEODESIC</button></div><small>Network relation and geographic path are different objects.</small>';
        dynamic.after(group);
      }
      $$('[data-flow-geometry]', group).forEach(button => button.setAttribute('aria-pressed', String(button.dataset.flowGeometry === odGeometry)));
    }

    function inspectSelectedNode(id) {
      const node = NODES[id];
      if (!node) return;
      const totals=odNodeTotals(id);
      const inspect = $('#flInspect', root);
      if (inspect) inspect.innerHTML = `
        <div><dt>PLACE</dt><dd>${node[2]}</dd></div>
        <div><dt>OUT</dt><dd>${totals.out} normalized units</dd></div>
        <div><dt>IN</dt><dd>${totals.in} normalized units</dd></div>
        <div><dt>NET</dt><dd>${totals.net>0?'+':''}${totals.net} normalized units</dd></div>
        <div><dt>GEOMETRY</dt><dd>${odGeometry === 'geodesic' ? 'Great-circle display relation' : 'Schematic connection'}</dd></div>
        <div><dt>LIMIT</dt><dd>OD magnitude is illustrative; connection geometry is not an observed route.</dd></div>`;
    }

    function inspectSelectedTrip(id) {
      const trip=TRIPS[Number(id)],inspect=$('#flInspect',root);
      if(!trip||!inspect)return;
      const time=Number(shell.dataset.tripTime||$('#flTripTime',root)?.value||30);
      const position=tripPosition(trip,time),metrics=tripMetrics(trip);
      const kind=position.clamped?'OUTSIDE SAMPLE WINDOW':position.sampled?'AUTHORED TEACHING SAMPLE':'INTERPOLATED DISPLAY POSITION';
      inspect.innerHTML=`
        <div><dt>TRACK</dt><dd>${trip.name}</dd></div>
        <div><dt>TIME</dt><dd>${time.toFixed(1)} relative teaching units, not UTC</dd></div>
        <div><dt>STATUS</dt><dd>${kind}</dd></div>
        <div><dt>SAMPLES</dt><dd>${metrics.samples} authored teaching points</dd></div>
        <div><dt>DISTANCE</dt><dd>${metrics.totalDistanceKm.toFixed(0)} km calculated geodesic arc</dd></div>
        <div><dt>INTERPOLATION</dt><dd>Shortest great-circle between supplied teaching samples</dd></div>
        <div><dt>LIMIT</dt><dd>Interpolated positions are not additional observations; calculated arc distance is not measured travel.</dd></div>`;
    }

    function syncTripLegend(){
      let key=footer.querySelector('.flow-trip-sample-legend');
      if(mode()!=='trips'){key?.remove();return;}
      if(!key){
        key=document.createElement('div');
        key.className='flow-trip-sample-legend';
        footer.insertBefore(key,projectionReadout);
      }
      key.innerHTML='<span>○ authored teaching sample</span>'+
        '<span>● current display head</span>'+
        '<span>— interpolated great-circle segment · not measured movement</span>';
    }
    function syncMode(){
      syncTabs();syncSummary();ensureOdGeometryControl();
      const active=mode(),cleanup={};
      if(active==='od'){
        const requested=new URL(location.href).searchParams;
        if(requested.has('flowNode')&&!selectedNode)cleanup.flowNode=null;
        if(requested.has('flowPeer')&&
          (!Object.hasOwn(NODES,requested.get('flowPeer'))||
            requested.get('flowPeer')===(selectedNode||'nyc')))cleanup.flowPeer=null;
      }
      if(active==='trips'){
        const requested=new URL(location.href).searchParams;
        if(requested.has('flowTrip')&&!selectedTrip)cleanup.flowTrip=null;
      }
      if(active!=='od'){
        selectedNode='';
        if(new URL(location.href).searchParams.has('flowNode'))cleanup.flowNode=null;
        if(new URL(location.href).searchParams.has('flowPeer'))cleanup.flowPeer=null;
      }
      if(active!=='trips'){
        selectedTrip='';
        if(new URL(location.href).searchParams.has('flowTrip'))cleanup.flowTrip=null;
      }
      if(Object.keys(cleanup).length)updateUrl(cleanup);
      syncAccessibleSelection();syncWorkspace();syncMovementAnalysis();
      syncTripLegend();renderOverlay();
    }

    // Native form controls make aria-hidden SVG selections keyboard-accessible.
    const access=document.createElement('section');
    access.className='flow-accessible-selection';
    access.setAttribute('aria-label','Choose a place or teaching track');
    access.innerHTML=`<label data-flow-place-row>PLACE <select data-flow-place aria-label="Select origin or destination place">
      <option value="">Choose place</option>
      ${Object.entries(NODES).map(([key,node])=>`<option value="${key}">${node[2]}</option>`).join('')}
    </select></label><label data-flow-trip-row>TEACHING TRACK <select data-flow-trip-select aria-label="Select teaching trajectory">
      <option value="">Choose track</option>
      ${TRIPS.map((trip,i)=>`<option value="${i}">${trip.name}</option>`).join('')}
    </select></label>`;
    controlCard?.append(access);
    function syncAccessibleSelection(){
      const active=mode();
      const place=$('[data-flow-place]',access),trip=$('[data-flow-trip-select]',access);
      $('[data-flow-place-row]',access).hidden=active!=='od';
      $('[data-flow-trip-row]',access).hidden=active!=='trips';
      access.hidden=active!=='od'&&active!=='trips';
      if(place)place.value=selectedNode;
      if(trip)trip.value=selectedTrip;
    }
    function chooseNode(id){
      selectedNode=(id&&id!==selectedNode&&Object.hasOwn(NODES,id))?id:'';
      const updates={flowNode:selectedNode||null};
      const primary=selectedNode||'nyc';
      if(odPeer===primary){
        odPeer=Object.keys(NODES).find(node=>node!==primary);
        updates.flowPeer=null;
      }
      updateUrl(updates);
      if(selectedNode)inspectSelectedNode(selectedNode);
      syncAccessibleSelection();syncMovementAnalysis();renderOverlay();
    }
    function chooseTrip(id){
      selectedTrip=(id&&id!==selectedTrip&&/^[0-7]$/.test(id))?id:'';
      updateUrl({flowTrip:selectedTrip||null});
      if(selectedTrip)inspectSelectedTrip(selectedTrip);
      syncAccessibleSelection();syncMovementAnalysis();renderOverlay();
    }
    analysis.addEventListener('change',event=>{
      if(!event.target.matches('[data-flow-peer]'))return;
      const candidate=event.target.value;
      if(Object.hasOwn(NODES,candidate)&&candidate!==(selectedNode||'nyc')){
        odPeer=candidate;updateUrl({flowPeer:odPeer});
        syncMovementAnalysis();renderOverlay();
      }
    });
    access.addEventListener('change',event=>{
      if(event.target.matches('[data-flow-place]')){
        const id=event.target.value;
        selectedNode='';chooseNode(id);
      }else if(event.target.matches('[data-flow-trip-select]')){
        const id=event.target.value;
        selectedTrip='';chooseTrip(id);
      }
    });
    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-flow-jump]');
      if (!button) return;
      const name = button.dataset.flowJump;
      $$('[data-flow-jump]', nav).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      if (name === 'source') activateWorkspaceMode('inspect');
      const target = name === 'control' ? controlCard : name === 'read' ? readCard : sourceCard;
      deferOverlay(()=>target?.scrollIntoView({
        block:'start',
        behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'
      }),name==='source'?80:0);
    });

    tabs.addEventListener('keydown', event => {
      const current = event.target.closest('[data-mode]');
      if (!current || !['ArrowRight','ArrowLeft','Home','End'].includes(event.key)) return;
      event.preventDefault();
      const index = MODES.indexOf(current.dataset.mode);
      let next = index;
      if (event.key === 'ArrowRight') next = (index+1) % MODES.length;
      if (event.key === 'ArrowLeft') next = (index-1+MODES.length) % MODES.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = MODES.length-1;
      const button = $(`[data-mode="${MODES[next]}"]`, tabs);
      button?.focus(); button?.click();
    });

    rail.addEventListener('click', event => {
      const geometry = event.target.closest('[data-flow-geometry]');
      if (!geometry) return;
      odGeometry = geometry.dataset.flowGeometry;
      updateUrl({ flowGeometry:odGeometry });
      ensureOdGeometryControl(); renderOverlay();
      if (selectedNode) inspectSelectedNode(selectedNode);
      syncMovementAnalysis();
    });

    svg.addEventListener('click', event => {
      const node = event.target.closest('[data-type="node"]');
      if (!node || mode() !== 'od') return;
      chooseNode(node.dataset.id);
    });

    overlay.addEventListener('click', event => {
      const trip = event.target.closest('[data-flow-trip]');
      if (!trip) return;
      chooseTrip(trip.dataset.flowTrip);
    });

    map.addEventListener('pointermove',()=>{
      if(pointerRaf)return;
      pointerRaf=requestAnimationFrame(()=>{
        pointerRaf=0;
        if(!root.isConnected||!['field','release'].includes(mode()))return;
        const row = $$('.flow-inspect div', root).find(div => $('dt', div)?.textContent === 'POSITION');
        const text = row ? $('dd', row)?.textContent || '' : '';
        const match = text.match(/(-?\d+(?:\.\d+)?)°/);
        if(!match){
          $('[data-flow-ew-scale]',projectionReadout).textContent='EW / NS · SELECT LATITUDE';
          return;
        }
        const lat=Number(match[1]),stretch=1/Math.max(.01,Math.cos(rad(Math.abs(lat))));
        $('[data-flow-ew-scale]',projectionReadout).textContent=
          `EW / NS ×${stretch.toFixed(2)} @ ${Math.abs(lat).toFixed(0)}°${lat>=0?'N':'S'}`;
      });
    }, { passive:true });

    map.addEventListener('wheel',()=>deferOverlay(renderOverlay),{passive:true});
    map.addEventListener('pointerup',()=>deferOverlay(renderOverlay));
    dynamic.addEventListener('input',()=>deferOverlay(()=>{
      syncMovementAnalysis();renderOverlay();
      if(selectedTrip&&mode()==='trips')inspectSelectedTrip(selectedTrip);
    }));
    dynamic.addEventListener('click',()=>deferOverlay(()=>{
      ensureOdGeometryControl();syncMovementAnalysis();renderOverlay();
    }));

    function onEscape(event){
      if(event.key!=='Escape'||event.defaultPrevented||!root.isConnected||
         !root.closest('.instrument-dialog[open]'))return;
      if(!selectedNode&&!selectedTrip)return;
      event.preventDefault();selectedNode='';selectedTrip='';
      updateUrl({flowNode:null,flowTrip:null,flowPeer:null});
      syncAccessibleSelection();syncMovementAnalysis();renderOverlay();
    }
    document.addEventListener('keydown',onEscape);

    const shellObserver = new MutationObserver(records => {
      if(records.some(record=>record.attributeName==='data-mode'))syncMode();
      else if(records.some(record=>record.attributeName==='data-trip-time')&&mode()==='trips'){
        syncMovementAnalysis();
        if(selectedTrip)inspectSelectedTrip(selectedTrip);
      }
    });
    shellObserver.observe(shell, {attributes:true,attributeFilter:['data-mode','data-trip-time']});
    const svgObserver = new MutationObserver(() => renderOverlay());
    svgObserver.observe(svg, { childList:true });
    const dialog = root.closest('.instrument-dialog');
    const workspaceObserver = new MutationObserver(syncWorkspace);
    if (dialog) workspaceObserver.observe(dialog, { attributes:true, attributeFilter:['data-workspace-mode'] });
    const resizeObserver = 'ResizeObserver' in window ? new ResizeObserver(renderOverlay) : null;
    resizeObserver?.observe(map);

    const initial = new URL(location.href);
    const initialMode = initial.searchParams.get('flowMode');
    if (MODES.includes(initialMode) && initialMode !== mode()) $(`[data-mode="${initialMode}"]`, tabs)?.click();
    syncMode(); syncWorkspace();

    let cleaned=false;
    root._flowRound2Cleanup=()=>{
      if(cleaned)return;
      cleaned=true;
      shellObserver.disconnect();svgObserver.disconnect();
      workspaceObserver.disconnect();resizeObserver?.disconnect();
      document.removeEventListener('keydown',onEscape);
      cancelAnimationFrame(overlayRaf);
      cancelAnimationFrame(pointerRaf);
      for(const timer of ownedTimeouts)clearTimeout(timer);
      ownedTimeouts.clear();
      root.dataset.flowRound2Cleanup='complete';
      root.dataset.flowRefinementDisposedCount=String(1+Number(root.dataset.flowRefinementDisposedCount||0));
    };
  }

  function scan() {
    $$('.instrument-stage').forEach(stage => {
      const flow = $('.flow-lab', stage);
      if (flow) refine(stage);
    });
  }

  ensureStyle(); scan();
  let scanRaf=0;
  const observer=new MutationObserver(()=>{
    if(scanRaf)return;
    scanRaf=requestAnimationFrame(()=>{scanRaf=0;scan();});
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener('pagehide',()=>{
    observer.disconnect();
    if(scanRaf)cancelAnimationFrame(scanRaf);
    $('.instrument-stage').forEach(stage=>stage._flowRound2Cleanup?.());
  },{once:true});
})();
