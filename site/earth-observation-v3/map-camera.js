import {
  MIN_ZOOM, MAX_ZOOM, cameraSpans, clamp, normalizeCamera,
  requestDimensions, screenToGeo, viewportBounds
} from './model.js';

const WHEEL_COMMIT_DELAY_MS = 320;

function niceStep(span, targetLines = 6) {
  const target = span / Math.max(2, targetLines);
  const steps = [.25, .5, 1, 2, 5, 10, 15, 30, 45, 60, 90];
  return steps.find(step => step >= target) || 90;
}

function degreeLabel(value, axis) {
  if (Math.abs(value) < 1e-9) return '0°';
  const abs = Math.abs(value);
  const numeric = abs < 1 ? abs.toFixed(1) : Number.isInteger(abs) ? String(abs) : abs.toFixed(1);
  return `${numeric}°${axis === 'lon' ? (value > 0 ? 'E' : 'W') : (value > 0 ? 'N' : 'S')}`;
}

export function renderGraticule(svg, state) {
  if (!svg || !state.showGrid) return;
  const bounds = viewportBounds(state);
  const lonStep = niceStep(bounds.lonSpan, 7);
  const latStep = niceStep(bounds.latSpan, 5);
  const parts = [];
  const firstLon = Math.ceil(bounds.west / lonStep) * lonStep;
  for (let lon = firstLon; lon <= bounds.east + 1e-9; lon += lonStep) {
    const x = ((lon - bounds.west) / bounds.lonSpan) * 100;
    if (x < .5 || x > 99.5) continue;
    parts.push(`<line x1="${x.toFixed(3)}" x2="${x.toFixed(3)}" y1="0" y2="100"></line>`);
    parts.push(`<text x="${Math.min(97, x + .8).toFixed(3)}" y="97">${degreeLabel(lon, 'lon')}</text>`);
  }
  const firstLat = Math.ceil(bounds.south / latStep) * latStep;
  for (let lat = firstLat; lat <= bounds.north + 1e-9; lat += latStep) {
    const y = ((bounds.north - lat) / bounds.latSpan) * 100;
    if (y < .5 || y > 99.5) continue;
    parts.push(`<line x1="0" x2="100" y1="${y.toFixed(3)}" y2="${y.toFixed(3)}"></line>`);
    parts.push(`<text x="1.2" y="${Math.max(4, y - 1).toFixed(3)}">${degreeLabel(lat, 'lat')}</text>`);
  }
  svg.innerHTML = parts.join('');
}

export function createMapCamera({ state, stage, frameShell, frame, stackA, stackB, graticule, zoomIn, zoomOut, fit, zoomReadout, onCommit, onProbe, onPreview }) {
  let pointer = null;
  let pan = null;
  let moved = false;
  let wheelTimer = null;
  let resizeObserver = null;
  let resizeHandler = null;

  function sizeFrame() {
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

  function render() {
    normalizeCamera(state);
    const bounds = viewportBounds(state);
    const viewText = state.zoom <= 1.001
      ? 'GLOBAL · Z 1.0'
      : `${state.centerLat.toFixed(1)}°, ${state.centerLon.toFixed(1)}° · Z ${state.zoom.toFixed(1)}`;
    stage.querySelector('#eoHudView').textContent = viewText;
    zoomReadout.value = `Z ${state.zoom.toFixed(1)}`;
    zoomReadout.textContent = `Z ${state.zoom.toFixed(1)}`;
    zoomIn.disabled = state.zoom >= MAX_ZOOM - .01;
    zoomOut.disabled = state.zoom <= MIN_ZOOM + .01;
    fit.classList.toggle('is-active', state.zoom <= MIN_ZOOM + .01);
    frame.dataset.zoom = state.zoom.toFixed(2);
    frame.dataset.bbox = [bounds.west, bounds.south, bounds.east, bounds.north].map(value => value.toFixed(4)).join(',');
    renderGraticule(graticule, state);
  }

  function clearPreview() {
    [stackA, stackB, graticule].forEach(node => { if (node) node.style.transform = ''; });
  }

  function commitSoon(delay = WHEEL_COMMIT_DELAY_MS) {
    clearTimeout(wheelTimer);
    wheelTimer = setTimeout(() => {
      wheelTimer = null;
      onCommit?.();
    }, delay);
  }

  function setZoomAt(nextZoom, clientX = null, clientY = null, { immediate=false } = {}) {
    const oldBounds = viewportBounds(state);
    const rect = frame.getBoundingClientRect();
    const x = clientX == null ? rect.width / 2 : clientX - rect.left;
    const y = clientY == null ? rect.height / 2 : clientY - rect.top;
    const anchor = screenToGeo(state, x, y, rect, oldBounds);
    const zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM);
    const spans = cameraSpans(zoom);
    state.zoom = zoom;
    state.centerLon = anchor.lon - (anchor.xRatio - .5) * spans.lonSpan;
    state.centerLat = anchor.lat + (anchor.yRatio - .5) * spans.latSpan;
    state.probe = null;
    normalizeCamera(state);
    render();
    onPreview?.();
    if (immediate) {
      clearTimeout(wheelTimer);
      wheelTimer = null;
      onCommit?.();
    } else {
      commitSoon();
    }
  }

  function fitWorld({ immediate=true } = {}) {
    state.zoom = MIN_ZOOM;
    state.centerLon = 0;
    state.centerLat = 0;
    state.probe = null;
    render();
    onPreview?.();
    if (immediate) {
      clearTimeout(wheelTimer);
      wheelTimer = null;
      onCommit?.();
    }
  }

  const onPointerDown = event => {
    if (event.target.closest?.('.eo-compare-handle,.eo-nav-controls')) return;
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;
    clearTimeout(wheelTimer);
    wheelTimer = null;
    pointer = event.pointerId;
    moved = false;
    pan = {
      startX:event.clientX,
      startY:event.clientY,
      startLon:state.centerLon,
      startLat:state.centerLat,
      bounds:viewportBounds(state),
      rect
    };
    frame.setPointerCapture?.(event.pointerId);
    frame.classList.add('is-panning');
  };

  const onPointerMove = event => {
    if (pointer !== event.pointerId || !pan) return;
    const dx = event.clientX - pan.startX;
    const dy = event.clientY - pan.startY;
    if (Math.abs(dx) + Math.abs(dy) > 4) moved = true;
    state.centerLon = pan.startLon - (dx / pan.rect.width) * pan.bounds.lonSpan;
    state.centerLat = pan.startLat + (dy / pan.rect.height) * pan.bounds.latSpan;
    normalizeCamera(state);
    [stackA, stackB, graticule].forEach(node => { if (node) node.style.transform = `translate(${dx}px, ${dy}px)`; });
    stage.querySelector('#eoHudView').textContent = `${state.centerLat.toFixed(1)}°, ${state.centerLon.toFixed(1)}° · Z ${state.zoom.toFixed(1)}`;
  };

  const finishPointer = event => {
    if (pointer !== event.pointerId) return;
    try { frame.releasePointerCapture?.(event.pointerId); } catch {}
    frame.classList.remove('is-panning');
    clearPreview();
    pointer = null;
    const didMove = moved;
    moved = false;
    pan = null;
    normalizeCamera(state);
    if (didMove) {
      state.probe = null;
      render();
      onPreview?.();
      onCommit?.();
      return;
    }
    const rect = frame.getBoundingClientRect();
    const geo = screenToGeo(state, clamp(event.clientX - rect.left, 0, rect.width), clamp(event.clientY - rect.top, 0, rect.height), rect);
    onProbe?.(geo);
  };

  const cancelPointer = event => {
    if (pointer !== event.pointerId) return;
    frame.classList.remove('is-panning');
    clearPreview();
    pointer = null;
    pan = null;
    moved = false;
    render();
  };

  const onWheel = event => {
    if (event.target.closest?.('.eo-compare-handle,.eo-nav-controls')) return;
    event.preventDefault();
    const delta = clamp(-event.deltaY * .0022, -.8, .8);
    if (Math.abs(delta) < .01) return;
    setZoomAt(state.zoom + delta, event.clientX, event.clientY);
  };

  frame.addEventListener('pointerdown', onPointerDown);
  frame.addEventListener('pointermove', onPointerMove);
  frame.addEventListener('pointerup', finishPointer);
  frame.addEventListener('pointercancel', cancelPointer);
  frame.addEventListener('wheel', onWheel, { passive:false });
  zoomIn.addEventListener('click', () => setZoomAt(state.zoom + .75, null, null, { immediate:true }));
  zoomOut.addEventListener('click', () => setZoomAt(state.zoom - .75, null, null, { immediate:true }));
  fit.addEventListener('click', () => fitWorld());

  const resize = () => { sizeFrame(); render(); };
  if ('ResizeObserver' in window) {
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frameShell);
  } else {
    resizeHandler = resize;
    window.addEventListener('resize', resizeHandler, { passive:true });
  }
  sizeFrame();
  render();

  return {
    render,
    sizeFrame,
    zoomBy:(delta, immediate=true) => setZoomAt(state.zoom + delta, null, null, { immediate }),
    fit:fitWorld,
    dimensions:() => requestDimensions(frame),
    cleanup() {
      clearTimeout(wheelTimer);
      resizeObserver?.disconnect();
      if (resizeHandler) window.removeEventListener('resize', resizeHandler);
      frame.removeEventListener('pointerdown', onPointerDown);
      frame.removeEventListener('pointermove', onPointerMove);
      frame.removeEventListener('pointerup', finishPointer);
      frame.removeEventListener('pointercancel', cancelPointer);
      frame.removeEventListener('wheel', onWheel);
    }
  };
}
