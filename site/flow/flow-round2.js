const VERSION = '20261002a';
const MODE_META = {
  field: {
    label:'FIELD', grammar:'EULERIAN FIELD', geometry:'CONTINUOUS GRID', time:'SNAPSHOT',
    question:'How is the medium moving here?',
    note:'Local vectors describe a sampled field. Advected particles reveal the field structure; they are not observed object tracks.'
  },
  od: {
    label:'OD', grammar:'AGGREGATE NETWORK', geometry:'NODES + FLOWS', time:'AGGREGATE',
    question:'How much movement connects places?',
    note:'Line width encodes aggregate connection strength. Curves are schematic relations, not literal travelled routes.'
  },
  trips: {
    label:'TRIPS', grammar:'TIMESTAMPED PATHS', geometry:'ORDERED POSITIONS', time:'SEQUENCE',
    question:'Where did an object move, and when?',
    note:'The playhead and trail window expose temporal sequence. Trail length is a visual memory window, not uncertainty.'
  },
  release: {
    label:'RELEASE', grammar:'LAGRANGIAN RELEASE', geometry:'ADVECTED PARTICLES', time:'DERIVED',
    question:'Where could material move in this frozen field?',
    note:'Particles are numerically advected through the current snapshot. This is a conditional experiment, not a forecast trajectory.'
  }
};

const NODES = {
  nyc:[-74.006,40.713], lon:[-0.128,51.507], par:[2.352,48.857], dub:[55.270,25.205],
  sin:[103.820,1.352], tok:[139.692,35.690], lax:[-118.244,34.052], mex:[-99.133,19.433],
  sao:[-46.633,-23.550], jnb:[28.047,-26.204], syd:[151.209,-33.869], del:[77.209,28.614]
};
const OD = [
  ['nyc','lon',94],['lon','par',72],['par','dub',61],['dub','del',68],['del','sin',57],['sin','tok',76],['tok','lax',89],['lax','nyc',84],
  ['mex','lax',55],['mex','nyc',47],['sao','nyc',58],['sao','jnb',32],['jnb','dub',46],['jnb','lon',41],['syd','sin',64],['syd','tok',51],
  ['dub','sin',59],['lon','nyc',88],['tok','sin',69],['par','nyc',63],['del','dub',62],['lax','tok',77],['sin','syd',56],['nyc','sao',44]
].map(([a,b,value],id)=>({a,b,value,id}));
const TRIPS = [
  [[-122.42,37.77,0],[-150,35,18],[178,34,36],[160,35,55],[139.69,35.69,72]],
  [[-74.0,40.71,3],[-50,45,18],[-28,49,34],[-10,51,49],[2.35,48.86,64]],
  [[55.27,25.2,0],[67,18,16],[78,11,31],[91,7,47],[103.82,1.35,66]],
  [[151.21,-33.87,8],[139,-27,22],[122,-20,39],[112,-10,55],[103.82,1.35,72]],
  [[-46.63,-23.55,4],[-28,-28,21],[-8,-30,39],[10,-29,55],[28.05,-26.2,73]],
  [[2.35,48.86,2],[23,48,18],[44,46,36],[62,39,52],[77.21,28.61,70]],
  [[-118.24,34.05,0],[-108,37,15],[-96,39,31],[-84,40,47],[-74,40.71,62]],
  [[77.21,28.61,10],[85,23,26],[94,16,42],[100,8,57],[103.82,1.35,71]]
];

function ensureStyle() {
  if (document.querySelector('link[data-flow-round2]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = new URL(`./flow-round2.css?v=${VERSION}`, import.meta.url).href;
  link.dataset.flowRound2 = '1';
  document.head.appendChild(link);
}

function replaceReferenceWords(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(node => {
    if (node.parentElement?.closest('script,style')) return;
    const next = node.nodeValue
      .replace(/\bdemonstration\b/gi, 'teaching reference')
      .replace(/\bdemo\b/gi, 'reference');
    if (next !== node.nodeValue) node.nodeValue = next;
  });
}

function nearestLon(lon, reference) {
  let value = lon;
  while (value - reference > 180) value -= 360;
  while (value - reference < -180) value += 360;
  return value;
}

function unwrapTrip(points) {
  if (!points.length) return [];
  const out = [[points[0][0], points[0][1], points[0][2]]];
  for (let i=1; i<points.length; i++) {
    const prev = out[i-1][0];
    out.push([nearestLon(points[i][0], prev), points[i][1], points[i][2]]);
  }
  return out;
}

function tripPoint(points, t) {
  if (t <= points[0][2]) return points[0];
  if (t >= points.at(-1)[2]) return points.at(-1);
  for (let i=1; i<points.length; i++) {
    if (t > points[i][2]) continue;
    const a = points[i-1], b = points[i];
    const f = (t-a[2]) / (b[2]-a[2]);
    return [a[0] + (b[0]-a[0])*f, a[1] + (b[1]-a[1])*f, t];
  }
  return points.at(-1);
}

function enhance(root) {
  if (!root || root.dataset.flowRound2 === 'true') return;
  root.dataset.flowRound2 = 'true';
  ensureStyle();

  const dialog = document.getElementById('instrumentDialog');
  const map = root.querySelector('.flow-map-shell');
  const rail = root.querySelector('.flow-rail');
  const tabs = root.querySelector('.flow-tabs');
  const sourceSvg = root.querySelector('.flow-svg');
  const cards = [...root.querySelectorAll('.flow-rail > .flow-card')];
  if (!dialog || !map || !rail || !tabs || !sourceSvg || cards.length < 3) return;

  cards[0].id = 'flRound2Controls';
  cards[1].id = 'flRound2Read';
  cards[2].id = 'flRound2Source';
  cards[2].classList.add('flow-round2-context');

  const nav = document.createElement('nav');
  nav.className = 'flow-round2-nav';
  nav.setAttribute('aria-label', 'Flow task navigation');
  nav.innerHTML = `
    <button type="button" data-flow-target="grammar" class="is-active">GRAMMAR</button>
    <button type="button" data-flow-target="controls">CONTROLS</button>
    <button type="button" data-flow-target="read">READ</button>
    <button type="button" data-flow-target="source">SOURCE</button>`;

  const summary = document.createElement('section');
  summary.className = 'flow-round2-summary';
  summary.id = 'flRound2Grammar';
  summary.innerHTML = `
    <div class="flow-round2-eyebrow">MOVEMENT GRAMMAR</div>
    <div class="flow-round2-summary-head">
      <div><strong id="flRound2Mode">FIELD</strong><span id="flRound2GrammarLabel">EULERIAN FIELD</span></div>
      <span id="flRound2Time">SNAPSHOT</span>
    </div>
    <p id="flRound2Question">How is the medium moving here?</p>
    <dl class="flow-round2-facts">
      <div><dt>GEOMETRY</dt><dd id="flRound2Geometry">CONTINUOUS GRID</dd></div>
      <div><dt>READ AS</dt><dd id="flRound2ReadAs">LOCAL VECTOR</dd></div>
    </dl>`;

  rail.prepend(summary);
  rail.prepend(nav);
  summary.appendChild(tabs);

  const modeButtons = [...tabs.querySelectorAll('[data-mode]')];
  tabs.setAttribute('aria-label', 'Movement grammar');
  modeButtons.forEach(button => {
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', 'flRound2Controls');
  });

  tabs.addEventListener('keydown', event => {
    const current = modeButtons.indexOf(document.activeElement);
    if (current < 0) return;
    let next = current;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (current + 1) % modeButtons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (current - 1 + modeButtons.length) % modeButtons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = modeButtons.length - 1;
    else return;
    event.preventDefault();
    modeButtons[next].focus();
    modeButtons[next].click();
  });

  const overlay = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  overlay.classList.add('flow-round2-geo');
  overlay.setAttribute('aria-hidden', 'true');
  map.appendChild(overlay);

  let overlayFrame = 0;
  let textFrame = 0;

  function currentMode() {
    return root.dataset.mode || 'field';
  }

  function enterInspect() {
    const button = document.querySelector('.instrument-workspace-modes button[data-workspace-mode="inspect"]');
    if (dialog.dataset.workspaceMode !== 'inspect') button?.click();
  }

  function scrollToTarget(target) {
    const node = target === 'grammar' ? summary : target === 'controls' ? cards[0] : target === 'read' ? cards[1] : cards[2];
    if (target === 'source') enterInspect();
    node?.scrollIntoView({ block:'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
    nav.querySelectorAll('button').forEach(button => button.classList.toggle('is-active', button.dataset.flowTarget === target));
  }

  nav.addEventListener('click', event => {
    const button = event.target.closest('[data-flow-target]');
    if (button) scrollToTarget(button.dataset.flowTarget);
  });

  function updateSummary() {
    const mode = currentMode();
    const meta = MODE_META[mode] || MODE_META.field;
    summary.querySelector('#flRound2Mode').textContent = meta.label;
    summary.querySelector('#flRound2GrammarLabel').textContent = meta.grammar;
    summary.querySelector('#flRound2Time').textContent = meta.time;
    summary.querySelector('#flRound2Question').textContent = meta.question;
    summary.querySelector('#flRound2Geometry').textContent = meta.geometry;
    summary.querySelector('#flRound2ReadAs').textContent = mode === 'field' ? 'LOCAL VECTOR' : mode === 'od' ? 'CONNECTION STRENGTH' : mode === 'trips' ? 'TEMPORAL PATH' : 'CONDITIONAL PATH';
    summary.dataset.mode = mode;
    modeButtons.forEach(button => {
      const active = button.dataset.mode === mode;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
    });
    cards[0].setAttribute('aria-label', `${meta.label} controls · ${meta.question}`);
    const status = root.querySelector('#flStatus');
    if (status?.textContent.trim().toUpperCase() === 'DEMO') status.textContent = 'REFERENCE';
    replaceReferenceWords(root);
    scheduleOverlay();
  }

  function projectionState(mode) {
    const rect = map.getBoundingClientRect();
    const W = Math.max(1, rect.width), H = Math.max(1, rect.height);
    const zoom = Math.max(.75, (parseFloat(root.querySelector('#flZoom')?.value || '100') || 100) / 100);
    const worldW = W * zoom, worldH = H * zoom;
    let left = (W-worldW)/2, top = (H-worldH)/2;

    if (mode === 'od') {
      const circle = sourceSvg.querySelector('circle[data-type="node"]');
      const geo = circle && NODES[circle.dataset.id];
      if (circle && geo) {
        left = Number(circle.getAttribute('cx')) - ((geo[0]+180)/360)*worldW;
        top = Number(circle.getAttribute('cy')) - ((90-geo[1])/180)*worldH;
      }
    } else if (mode === 'trips') {
      const circle = sourceSvg.querySelector('circle');
      const t = Number(root.querySelector('#flTripOut')?.textContent || 0);
      if (circle && Number.isFinite(t)) {
        const point = tripPoint(unwrapTrip(TRIPS[0]), t);
        left = Number(circle.getAttribute('cx')) - ((point[0]+180)/360)*worldW;
        top = Number(circle.getAttribute('cy')) - ((90-point[1])/180)*worldH;
      }
    }

    return { W,H,worldW,worldH,left,top, project:(lon,lat,shift=0) => [left + ((lon+180)/360)*worldW + shift, top + ((90-lat)/180)*worldH] };
  }

  function quadratic(a, b, curve=.16) {
    const dx=b[0]-a[0], dy=b[1]-a[1], mx=(a[0]+b[0])/2, my=(a[1]+b[1])/2;
    const length=Math.hypot(dx,dy)||1;
    const cx=mx-dy/length*length*curve, cy=my+dx/length*length*curve;
    return `M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`;
  }

  function hideNativePaths(type, hide) {
    sourceSvg.querySelectorAll(`path[data-type="${type}"]`).forEach(path => {
      if (hide) path.style.strokeOpacity = '0.001';
      else path.style.removeProperty('stroke-opacity');
    });
  }

  function drawOD(state) {
    const paths = [...sourceSvg.querySelectorAll('path[data-type="od"]')];
    if (!paths.length) return;
    hideNativePaths('od', true);
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = '<marker id="flRound2Arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="5" markerHeight="5" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="rgba(224,124,79,.82)"/></marker>';
    overlay.appendChild(defs);
    paths.forEach(nativePath => {
      const edge = OD[Number(nativePath.dataset.id)];
      if (!edge) return;
      const A = NODES[edge.a], B0 = NODES[edge.b];
      const bLon = nearestLon(B0[0], A[0]);
      [-state.worldW,0,state.worldW].forEach(shift => {
        const a = state.project(A[0],A[1],shift), b = state.project(bLon,B0[1],shift);
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d', quadratic(a,b));
        path.setAttribute('fill','none');
        path.setAttribute('stroke','rgba(209,99,57,.72)');
        path.setAttribute('stroke-width', String(1.2 + edge.value/34));
        path.setAttribute('stroke-linecap','round');
        path.setAttribute('marker-end','url(#flRound2Arrow)');
        overlay.appendChild(path);
      });
    });
  }

  function drawTrips(state) {
    const nativePaths = [...sourceSvg.querySelectorAll('path[data-type="trip"]')];
    if (!nativePaths.length) return;
    hideNativePaths('trip', true);
    const t = Number(root.querySelector('#flTripOut')?.textContent || 0);
    const trail = Number(root.querySelector('#flTrailOut')?.textContent || 22);
    nativePaths.forEach(nativePath => {
      const id = Number(nativePath.dataset.id), points = unwrapTrip(TRIPS[id] || []);
      if (points.length < 2) return;
      const start = Math.max(points[0][2], t-trail);
      const samples = [];
      for (let q=start; q<t; q+=2.5) samples.push(tripPoint(points,q));
      samples.push(tripPoint(points,t));
      [-state.worldW,0,state.worldW].forEach(shift => {
        const d = samples.map((point,index) => {
          const p = state.project(point[0],point[1],shift);
          return `${index ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`;
        }).join(' ');
        const path = document.createElementNS('http://www.w3.org/2000/svg','path');
        path.setAttribute('d',d);
        path.setAttribute('fill','none');
        path.setAttribute('stroke', id % 2 === 0 ? 'rgba(209,99,57,.88)' : 'rgba(241,239,231,.68)');
        path.setAttribute('stroke-width','2');
        path.setAttribute('stroke-linecap','round');
        path.setAttribute('stroke-linejoin','round');
        overlay.appendChild(path);
      });
    });
  }

  function renderOverlay() {
    overlayFrame = 0;
    const mode = currentMode();
    hideNativePaths('od', mode !== 'od' ? false : true);
    hideNativePaths('trip', mode !== 'trips' ? false : true);
    overlay.innerHTML = '';
    const state = projectionState(mode);
    overlay.setAttribute('viewBox', `0 0 ${state.W} ${state.H}`);
    if (mode === 'od') drawOD(state);
    else if (mode === 'trips') drawTrips(state);
  }

  function scheduleOverlay() {
    if (overlayFrame) return;
    overlayFrame = requestAnimationFrame(renderOverlay);
  }

  const modeObserver = new MutationObserver(records => {
    if (records.some(record => record.attributeName === 'data-mode')) updateSummary();
  });
  modeObserver.observe(root,{attributes:true,attributeFilter:['data-mode']});

  const svgObserver = new MutationObserver(scheduleOverlay);
  svgObserver.observe(sourceSvg,{subtree:true,childList:true,attributes:true,attributeFilter:['d','cx','cy']});

  const textObserver = new MutationObserver(() => {
    if (textFrame) return;
    textFrame = requestAnimationFrame(() => { textFrame=0; replaceReferenceWords(root); });
  });
  textObserver.observe(root,{subtree:true,childList:true,characterData:true});

  const resizeObserver = new ResizeObserver(scheduleOverlay);
  resizeObserver.observe(map);
  map.addEventListener('wheel', scheduleOverlay, { passive:true });
  map.addEventListener('pointermove', scheduleOverlay, { passive:true });

  updateSummary();
  scheduleOverlay();
  window.GeoFlowRound2 = { version:VERSION, root };
}

function boot() {
  ensureStyle();
  const stage = document.getElementById('instrumentStage');
  if (!stage) return;
  const existing = stage.querySelector('.flow-lab');
  if (existing) return enhance(existing);
  const observer = new MutationObserver(() => {
    const root = stage.querySelector('.flow-lab');
    if (!root) return;
    observer.disconnect();
    enhance(root);
  });
  observer.observe(stage,{childList:true,subtree:true});
}

boot();
