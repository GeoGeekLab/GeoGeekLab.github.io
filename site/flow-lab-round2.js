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

  const NODES = {
    nyc:[-74.006,40.713,'New York'], lon:[-0.128,51.507,'London'], par:[2.352,48.857,'Paris'], dub:[55.270,25.205,'Dubai'],
    sin:[103.820,1.352,'Singapore'], tok:[139.692,35.690,'Tokyo'], lax:[-118.244,34.052,'Los Angeles'], mex:[-99.133,19.433,'Mexico City'],
    sao:[-46.633,-23.550,'São Paulo'], jnb:[28.047,-26.204,'Johannesburg'], syd:[151.209,-33.869,'Sydney'], del:[77.209,28.614,'Delhi']
  };
  const OD = [
    ['nyc','lon',94],['lon','par',72],['par','dub',61],['dub','del',68],['del','sin',57],['sin','tok',76],['tok','lax',89],['lax','nyc',84],
    ['mex','lax',55],['mex','nyc',47],['sao','nyc',58],['sao','jnb',32],['jnb','dub',46],['jnb','lon',41],['syd','sin',64],['syd','tok',51],
    ['dub','sin',59],['lon','nyc',88],['tok','sin',69],['par','nyc',63],['del','dub',62],['lax','tok',77],['sin','syd',56],['nyc','sao',44]
  ].map(([a,b,value], id) => ({ id, a, b, value }));
  const TRIPS = [
    {name:'Pacific corridor A',color:'warm',pts:[[-122.42,37.77,0],[-150,35,18],[178,34,36],[160,35,55],[139.69,35.69,72]]},
    {name:'Atlantic corridor B',color:'pale',pts:[[-74.0,40.71,3],[-50,45,18],[-28,49,34],[-10,51,49],[2.35,48.86,64]]},
    {name:'Indian Ocean C',color:'warm',pts:[[55.27,25.2,0],[67,18,16],[78,11,31],[91,7,47],[103.82,1.35,66]]},
    {name:'Southern corridor D',color:'pale',pts:[[151.21,-33.87,8],[139,-27,22],[122,-20,39],[112,-10,55],[103.82,1.35,72]]},
    {name:'South Atlantic E',color:'warm',pts:[[-46.63,-23.55,4],[-28,-28,21],[-8,-30,39],[10,-29,55],[28.05,-26.2,73]]},
    {name:'Eurasia F',color:'pale',pts:[[2.35,48.86,2],[23,48,18],[44,46,36],[62,39,52],[77.21,28.61,70]]},
    {name:'North America G',color:'warm',pts:[[-118.24,34.05,0],[-108,37,15],[-96,39,31],[-84,40,47],[-74,40.71,62]]},
    {name:'SE Asia H',color:'pale',pts:[[77.21,28.61,10],[85,23,26],[94,16,42],[100,8,57],[103.82,1.35,71]]}
  ];

  function ensureStyle() {
    if (document.querySelector('link[data-flow-round2]')) return;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = new URL('./flow-lab-round2.css?v=20261002a', import.meta.url).href;
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

  function geoTripPoint(trip, t) {
    const pts = trip.pts;
    if (t <= pts[0][2]) return pts[0];
    if (t >= pts.at(-1)[2]) return pts.at(-1);
    for (let i = 1; i < pts.length; i += 1) {
      if (t > pts[i][2]) continue;
      const a = pts[i-1], b = pts[i], f = (t-a[2])/(b[2]-a[2]);
      const p = sphericalInterpolate(a, b, f);
      return [p[0], p[1], t];
    }
    return pts.at(-1);
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
    const ax = rect.width * z / 360, ay = -rect.height * z / 180;
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
      worldWidth:rect.width*z,
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
    map.appendChild(strip);

    const projectionReadout = document.createElement('div');
    projectionReadout.className = 'flow-projection-readout';
    projectionReadout.innerHTML = '<span>PLATE CARRÉE / DISPLAY</span><strong data-flow-ew-scale>EW SCALE ×1.00 @ 0°</strong>';
    map.appendChild(projectionReadout);

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

    let odGeometry = new URL(location.href).searchParams.get('flowGeometry') === 'geodesic' ? 'geodesic' : 'schematic';
    let selectedNode = new URL(location.href).searchParams.get('flowNode') || '';
    let selectedTrip = new URL(location.href).searchParams.get('flowTrip') || '';
    let overlayRaf = 0;

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
        overlay.appendChild(circle);
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

    function renderOverlay() {
      cancelAnimationFrame(overlayRaf);
      overlayRaf = requestAnimationFrame(() => {
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
      const outgoing = OD.filter(edge => edge.a === id).reduce((sum, edge) => sum + edge.value, 0);
      const incoming = OD.filter(edge => edge.b === id).reduce((sum, edge) => sum + edge.value, 0);
      const inspect = $('#flInspect', root);
      if (inspect) inspect.innerHTML = `
        <div><dt>PLACE</dt><dd>${node[2]}</dd></div>
        <div><dt>OUT</dt><dd>${outgoing} normalized units</dd></div>
        <div><dt>IN</dt><dd>${incoming} normalized units</dd></div>
        <div><dt>GEOMETRY</dt><dd>${odGeometry === 'geodesic' ? 'Great-circle display relation' : 'Schematic connection'}</dd></div>
        <div><dt>LIMIT</dt><dd>OD magnitude is illustrative; connection geometry is not an observed route.</dd></div>`;
    }

    function inspectSelectedTrip(id) {
      const trip = TRIPS[Number(id)], inspect = $('#flInspect', root);
      if (!trip || !inspect) return;
      inspect.innerHTML = `
        <div><dt>TRACK</dt><dd>${trip.name}</dd></div>
        <div><dt>TIME</dt><dd>${Number($('#flTripTime', root)?.value || 0).toFixed(0)}</dd></div>
        <div><dt>INTERPOLATION</dt><dd>Shortest great-circle between supplied teaching samples</dd></div>
        <div><dt>LIMIT</dt><dd>Interpolated display positions are not additional observations.</dd></div>`;
    }

    function syncMode() {
      syncTabs(); syncSummary(); ensureOdGeometryControl();
      if (mode() !== 'od') selectedNode = '';
      if (mode() !== 'trips') selectedTrip = '';
      renderOverlay();
    }

    nav.addEventListener('click', event => {
      const button = event.target.closest('[data-flow-jump]');
      if (!button) return;
      const name = button.dataset.flowJump;
      $$('[data-flow-jump]', nav).forEach(item => item.setAttribute('aria-pressed', String(item === button)));
      if (name === 'source') activateWorkspaceMode('inspect');
      const target = name === 'control' ? controlCard : name === 'read' ? readCard : sourceCard;
      setTimeout(() => target?.scrollIntoView({ block:'start', behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }), name === 'source' ? 80 : 0);
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
    });

    svg.addEventListener('click', event => {
      const node = event.target.closest('[data-type="node"]');
      if (!node || mode() !== 'od') return;
      selectedNode = selectedNode === node.dataset.id ? '' : node.dataset.id;
      updateUrl({ flowNode:selectedNode || null });
      inspectSelectedNode(selectedNode);
      renderOverlay();
    });

    overlay.addEventListener('click', event => {
      const trip = event.target.closest('[data-flow-trip]');
      if (!trip) return;
      selectedTrip = selectedTrip === trip.dataset.flowTrip ? '' : trip.dataset.flowTrip;
      updateUrl({ flowTrip:selectedTrip || null });
      if (selectedTrip) inspectSelectedTrip(selectedTrip);
      renderOverlay();
    });

    map.addEventListener('pointermove', () => {
      requestAnimationFrame(() => {
        if (!['field','release'].includes(mode())) return;
        const row = $$('.flow-inspect div', root).find(div => $('dt', div)?.textContent === 'POSITION');
        const text = row ? $('dd', row)?.textContent || '' : '';
        const match = text.match(/(-?\d+(?:\.\d+)?)°/);
        if (!match) return;
        const lat = Number(match[1]), stretch = 1 / Math.max(.15, Math.cos(rad(Math.abs(lat))));
        $('[data-flow-ew-scale]', projectionReadout).textContent = `EW SCALE ×${stretch.toFixed(2)} @ ${Math.abs(lat).toFixed(0)}°${lat >= 0 ? 'N' : 'S'}`;
      });
    }, { passive:true });

    map.addEventListener('wheel', () => setTimeout(renderOverlay, 0), { passive:true });
    map.addEventListener('pointerup', () => setTimeout(renderOverlay, 0));
    dynamic.addEventListener('input', () => setTimeout(renderOverlay, 0));
    dynamic.addEventListener('click', () => setTimeout(() => { ensureOdGeometryControl(); renderOverlay(); }, 0));

    document.addEventListener('keydown', event => {
      if (event.key !== 'Escape' || !root.isConnected) return;
      selectedNode = ''; selectedTrip = '';
      updateUrl({ flowNode:null, flowTrip:null });
      renderOverlay();
    });

    const shellObserver = new MutationObserver(records => {
      if (records.some(record => record.attributeName === 'data-mode')) syncMode();
    });
    shellObserver.observe(shell, { attributes:true, attributeFilter:['data-mode'] });
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

    root._flowRound2Cleanup = () => {
      shellObserver.disconnect(); svgObserver.disconnect(); workspaceObserver.disconnect(); resizeObserver?.disconnect();
      cancelAnimationFrame(overlayRaf);
    };
  }

  function scan() {
    $$('.instrument-stage').forEach(stage => {
      const flow = $('.flow-lab', stage);
      if (flow) refine(stage);
    });
  }

  ensureStyle(); scan();
  const observer = new MutationObserver(scan);
  observer.observe(document.documentElement, { childList:true, subtree:true });
  window.addEventListener('pagehide', () => {
    observer.disconnect();
    $$('.instrument-stage').forEach(stage => stage._flowRound2Cleanup?.());
  }, { once:true });
})();
