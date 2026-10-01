(() => {
  'use strict';

  const mounts = window.GeoGeekInstrumentMounts;
  const previousMount = mounts?.figure;
  if (!mounts || !previousMount || window.GeoFigureViewerV2) return;

  const SH_COMMIT = '331b300a26e8e5dc5fe8f45ab091292c48c9d320';
  const raw = path => `https://raw.githubusercontent.com/sentinel-hub/custom-scripts/${SH_COMMIT}/${path}`;
  const page = path => `https://github.com/sentinel-hub/custom-scripts/blob/${SH_COMMIT}/${path}/README.md`;
  const scenes = [
    {
      id: 'gfw-s2', title: 'Sentinel-2 · Global preview', short: 'S2 / RGB', sensor: 'Sentinel-2', mode: 'true-color preview',
      description: 'Global Fishing Watch layer-library preview. Useful as a global abstraction sample, but intentionally low-detail.',
      current: true,
      page: 'https://github.com/GlobalFishingWatch/frontend/blob/d43ab35fa2ccff9e4b5e22729190defe30e03b72/apps/platform/public/images/layer-library/sentinel2.jpg',
      credit: 'GLOBAL FISHING WATCH / SENTINEL-2'
    },
    {
      id: 'l8-rgb', title: 'Landsat 8 · Rome · True color', short: 'L8 / RGB', sensor: 'Landsat 8', mode: 'true color',
      description: 'Optical Landsat 8 scene over Rome. A stronger default for tracing urban, coast and vegetation structure.',
      src: raw('landsat-8/true-color/fig/fig1.png'), page: page('landsat-8/true-color'),
      credit: 'SENTINEL HUB / LANDSAT 8 / TRUE COLOR'
    },
    {
      id: 'l8-swir', title: 'Landsat 8 · Rome · SWIR', short: 'L8 / SWIR', sensor: 'Landsat 8', mode: 'SWIR composite',
      description: 'Short-wave infrared composite over Rome. Water, vegetation and built surfaces separate differently from RGB.',
      src: raw('landsat-8/swir/fig/fig1.png'), page: page('landsat-8/swir'),
      credit: 'SENTINEL HUB / LANDSAT 8 / SWIR'
    },
    {
      id: 'l8-ndvi', title: 'Landsat 8 · Rome · NDVI', short: 'L8 / NDVI', sensor: 'Landsat 8', mode: 'NDVI visualization',
      description: 'Rendered NDVI visualization of Rome. This is a derived visualization, not raw NIR/red bands.',
      src: raw('landsat-8/ndvi/fig/fig1.png'), page: page('landsat-8/ndvi'),
      credit: 'SENTINEL HUB / LANDSAT 8 / NDVI'
    },
    {
      id: 's1-sar', title: 'Sentinel-1 · Grand Bahama · SAR', short: 'S1 / SAR', sensor: 'Sentinel-1', mode: 'SAR false color',
      description: 'Radar view of Grand Bahama. Geometry and texture differ sharply from optical imagery, making trace behavior easier to compare.',
      src: raw('sentinel-1/sar_false_color_visualization-2/fig/fig1.png'), page: page('sentinel-1/sar_false_color_visualization-2'),
      credit: 'SENTINEL HUB / SENTINEL-1 / SAR'
    }
  ];

  function addStyle() {
    if (document.getElementById('ggFigureViewerV2Style')) return;
    const style = document.createElement('style');
    style.id = 'ggFigureViewerV2Style';
    style.textContent = `
      .instrument-dialog[data-instrument-family="transform"] .instrument-meta{min-height:52px;padding-top:6px;padding-bottom:6px}
      .instrument-dialog[data-instrument-family="transform"] #instrumentDescription{max-width:66ch}
      .figure-workbench{grid-template-columns:minmax(0,1fr) 286px!important;gap:9px!important;padding:8px!important}
      .figure-workbench .figure-stage{border-radius:14px!important}
      .figure-workbench .figure-viewport{inset:43px 8px 36px!important;overflow:hidden!important}
      .figure-workbench .figure-frame{will-change:transform;cursor:grab;transition:box-shadow .18s ease;transform-origin:center center}
      .figure-workbench .figure-frame.is-panning{cursor:grabbing;box-shadow:0 20px 60px rgba(0,0,0,.38)}
      .figure-workbench .figure-control{gap:7px!important}
      .figure-workbench .figure-card{padding:11px!important;border-radius:13px!important;gap:9px!important}
      .figure-imagery-card{order:-10}
      .figure-imagery-select{width:100%;min-height:38px;padding:0 34px 0 10px;border:1px solid rgba(241,239,231,.13);border-radius:9px;background:#0d1511;color:#f1efe7;font:700 9px/1 var(--mono);letter-spacing:.045em;appearance:auto}
      .figure-imagery-note{margin:0;color:rgba(241,239,231,.55);font:500 9.5px/1.45 var(--sans)}
      .figure-imagery-meta{display:flex;justify-content:space-between;gap:8px;color:rgba(241,239,231,.42);font:700 7px/1.3 var(--mono);letter-spacing:.06em;text-transform:uppercase}
      .figure-zoom-controls{position:absolute;z-index:9;right:13px;bottom:43px;display:flex;align-items:center;overflow:hidden;border:1px solid rgba(241,239,231,.13);border-radius:10px;background:rgba(7,12,9,.82);backdrop-filter:blur(9px)}
      .figure-zoom-controls button,.figure-zoom-controls output{height:32px;min-width:34px;border:0;border-right:1px solid rgba(241,239,231,.09);background:transparent;color:rgba(241,239,231,.7);font:700 9px/1 var(--mono)}
      .figure-zoom-controls button{cursor:pointer}.figure-zoom-controls button:hover{color:#fff;background:rgba(255,255,255,.04)}
      .figure-zoom-controls output{display:grid;place-items:center;min-width:52px;color:#f1efe7}.figure-zoom-controls>*:last-child{border-right:0}
      .figure-wipe-handle{position:absolute;z-index:8;top:0;bottom:0;width:24px;transform:translateX(-12px);cursor:ew-resize;touch-action:none;display:none}
      .figure-wipe-handle::before{content:"";position:absolute;left:11px;top:0;bottom:0;width:1px;background:rgba(241,239,231,.92);box-shadow:0 0 0 1px rgba(0,0,0,.25)}
      .figure-wipe-knob{position:absolute;left:50%;top:50%;width:34px;height:34px;display:grid;place-items:center;transform:translate(-50%,-50%);border:1px solid rgba(241,239,231,.34);border-radius:50%;background:rgba(8,14,10,.88);color:#f1efe7;font:700 11px/1 var(--mono);box-shadow:0 7px 22px rgba(0,0,0,.3)}
      .figure-workbench[data-view="compare"] .figure-wipe-handle{display:block}
      .figure-workbench[data-view="compare"] #fwSplitWrap{opacity:.45}
      .figure-nav-hint{position:absolute;z-index:7;left:50%;bottom:13px;transform:translateX(-50%);color:rgba(241,239,231,.38);font:700 7px/1 var(--mono);letter-spacing:.07em;pointer-events:none;white-space:nowrap}
      @media(max-width:1180px){.figure-workbench{grid-template-columns:minmax(0,1fr) 264px!important}}
      @media(max-width:1000px){.figure-workbench{grid-template-columns:1fr!important;grid-template-rows:minmax(500px,66vh) auto!important}.figure-workbench .figure-control{grid-template-columns:repeat(2,1fr)!important}.figure-imagery-card{grid-column:1/-1}}
      @media(max-width:680px){.figure-workbench{grid-template-rows:minmax(430px,61vh) auto!important}.figure-workbench .figure-control{grid-template-columns:1fr!important}.figure-zoom-controls{right:8px;bottom:40px}.figure-nav-hint{display:none}}
    `;
    document.head.appendChild(style);
  }

  function enhance(stage, signal) {
    const shell = stage.querySelector('.figure-workbench');
    const frame = stage.querySelector('#fwFrame');
    const viewport = stage.querySelector('#fwViewport');
    const fileInput = stage.querySelector('#fwFile');
    const split = stage.querySelector('#fwSplit');
    const splitOut = stage.querySelector('#fwSplitOut');
    const sourceLink = stage.querySelector('.figure-source');
    const inputTitle = stage.querySelector('#fwInputTitle');
    const sourceFoot = stage.querySelector('#fwSourceFoot');
    const viewButtons = [...stage.querySelectorAll('#fwViews [data-view]')];
    if (!shell || !frame || !viewport || !fileInput || !split) return () => {};

    shell.dataset.view = stage.querySelector('#fwViews .active')?.dataset.view || 'compare';

    const firstCard = stage.querySelector('.figure-card');
    const imageryCard = document.createElement('section');
    imageryCard.className = 'figure-card figure-imagery-card';
    imageryCard.innerHTML = `
      <div class="figure-card-head"><div><span>IMAGERY</span><strong>Observation preset</strong></div><em class="figure-badge">GITHUB / PINNED</em></div>
      <select class="figure-imagery-select" id="fwScene" aria-label="Imagery preset">
        ${scenes.map(s => `<option value="${s.id}">${s.title}</option>`).join('')}
      </select>
      <p class="figure-imagery-note" id="fwSceneNote">${scenes[0].description}</p>
      <div class="figure-imagery-meta"><span id="fwSceneSensor">${scenes[0].sensor}</span><span id="fwSceneMode">${scenes[0].mode}</span></div>`;
    firstCard?.parentNode?.insertBefore(imageryCard, firstCard);

    const zoomControls = document.createElement('div');
    zoomControls.className = 'figure-zoom-controls';
    zoomControls.innerHTML = '<button type="button" data-zoom="out" aria-label="Zoom out">−</button><output id="fwZoomOut">100%</output><button type="button" data-zoom="in" aria-label="Zoom in">+</button><button type="button" data-zoom="fit" aria-label="Fit image">FIT</button>';
    stage.querySelector('.figure-stage')?.appendChild(zoomControls);

    const hint = document.createElement('div');
    hint.className = 'figure-nav-hint';
    hint.textContent = 'WHEEL TO ZOOM · DRAG TO PAN · DRAG DIVIDER TO WIPE';
    stage.querySelector('.figure-stage')?.appendChild(hint);

    const wipe = document.createElement('div');
    wipe.className = 'figure-wipe-handle';
    wipe.innerHTML = '<span class="figure-wipe-knob">↔</span>';
    frame.appendChild(wipe);

    const sceneSelect = imageryCard.querySelector('#fwScene');
    const sceneNote = imageryCard.querySelector('#fwSceneNote');
    const sceneSensor = imageryCard.querySelector('#fwSceneSensor');
    const sceneMode = imageryCard.querySelector('#fwSceneMode');
    const zoomOut = zoomControls.querySelector('#fwZoomOut');

    let zoom = 1.16;
    let panX = 0;
    let panY = 0;
    let panning = false;
    let panPointer = null;
    let startX = 0;
    let startY = 0;
    let startPanX = 0;
    let startPanY = 0;
    let presetLoading = false;
    let destroyed = false;

    function clampPan() {
      const vw = viewport.clientWidth || 1;
      const vh = viewport.clientHeight || 1;
      const fw = frame.offsetWidth || 1;
      const fh = frame.offsetHeight || 1;
      const maxX = Math.max(0, (fw * zoom - vw) / 2 + 18);
      const maxY = Math.max(0, (fh * zoom - vh) / 2 + 18);
      panX = Math.max(-maxX, Math.min(maxX, panX));
      panY = Math.max(-maxY, Math.min(maxY, panY));
    }

    function applyTransform() {
      clampPan();
      frame.style.transform = `translate3d(${panX.toFixed(1)}px,${panY.toFixed(1)}px,0) scale(${zoom.toFixed(3)})`;
      zoomOut.value = `${Math.round(zoom * 100)}%`;
    }

    function setZoom(next, clientX, clientY) {
      const old = zoom;
      next = Math.max(1, Math.min(6, next));
      if (Math.abs(next - old) < 0.001) return;
      if (clientX != null && clientY != null) {
        const vr = viewport.getBoundingClientRect();
        const qx = clientX - (vr.left + vr.width / 2);
        const qy = clientY - (vr.top + vr.height / 2);
        const ratio = next / old;
        panX = qx - ratio * (qx - panX);
        panY = qy - ratio * (qy - panY);
      }
      zoom = next;
      if (zoom === 1) panX = panY = 0;
      applyTransform();
    }

    function resetNavigation(initial = false) {
      zoom = initial ? 1.16 : 1;
      panX = panY = 0;
      applyTransform();
    }

    function syncWipe() {
      const value = Number(split.value || 50);
      wipe.style.left = `${value}%`;
      splitOut.textContent = `${value}%`;
    }

    function setSplitFromPointer(clientX) {
      const rect = frame.getBoundingClientRect();
      const pct = Math.max(5, Math.min(95, ((clientX - rect.left) / rect.width) * 100));
      split.value = String(Math.round(pct));
      split.dispatchEvent(new Event('input', { bubbles: true }));
      syncWipe();
    }

    function updateSceneMeta(scene) {
      sceneNote.textContent = scene.description;
      sceneSensor.textContent = scene.sensor;
      sceneMode.textContent = scene.mode;
      if (sourceLink) {
        sourceLink.href = scene.page;
        sourceLink.textContent = `${scene.credit} ↗`;
      }
      if (inputTitle) inputTitle.textContent = scene.title;
      if (sourceFoot) sourceFoot.textContent = scene.credit;
    }

    async function loadScene(scene) {
      sceneSelect.value = scene.id;
      updateSceneMeta(scene);
      if (scene.current) {
        stage.querySelector('#fwReset')?.click();
        resetNavigation(true);
        return;
      }
      presetLoading = true;
      sceneSelect.disabled = true;
      sceneNote.textContent = `Loading ${scene.title}…`;
      try {
        const response = await fetch(scene.src, { mode: 'cors', cache: 'force-cache' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const blob = await response.blob();
        const ext = blob.type.includes('png') ? 'png' : 'jpg';
        const file = new File([blob], `${scene.id}.${ext}`, { type: blob.type || 'image/png' });
        const transfer = new DataTransfer();
        transfer.items.add(file);
        fileInput.files = transfer.files;
        fileInput.dispatchEvent(new Event('change', { bubbles: true }));
        const started = performance.now();
        const timer = setInterval(() => {
          if (destroyed || signal?.aborted || performance.now() - started > 6000) {
            clearInterval(timer);
            return;
          }
          const size = stage.querySelector('#fwSize')?.textContent || '';
          if (size && size !== '—') {
            clearInterval(timer);
            updateSceneMeta(scene);
            resetNavigation(true);
          }
        }, 120);
      } catch (error) {
        sceneNote.textContent = `Preset unavailable (${error.message}). Choose another scene or a local image.`;
      } finally {
        sceneSelect.disabled = false;
        presetLoading = false;
      }
    }

    const onWheel = event => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * 0.00125);
      setZoom(zoom * factor, event.clientX, event.clientY);
    };
    frame.addEventListener('wheel', onWheel, { passive: false });

    const onPanDown = event => {
      if (event.target.closest('.figure-wipe-handle') || zoom <= 1.001) return;
      panning = true;
      panPointer = event.pointerId;
      startX = event.clientX;
      startY = event.clientY;
      startPanX = panX;
      startPanY = panY;
      frame.classList.add('is-panning');
      frame.setPointerCapture?.(event.pointerId);
    };
    const onPanMove = event => {
      if (!panning || event.pointerId !== panPointer) return;
      panX = startPanX + event.clientX - startX;
      panY = startPanY + event.clientY - startY;
      applyTransform();
    };
    const endPan = event => {
      if (!panning || (event?.pointerId != null && event.pointerId !== panPointer)) return;
      panning = false;
      frame.classList.remove('is-panning');
      if (panPointer != null) frame.releasePointerCapture?.(panPointer);
      panPointer = null;
    };
    frame.addEventListener('pointerdown', onPanDown);
    frame.addEventListener('pointermove', onPanMove);
    frame.addEventListener('pointerup', endPan);
    frame.addEventListener('pointercancel', endPan);

    let wiping = false;
    let wipePointer = null;
    const onWipeDown = event => {
      wiping = true;
      wipePointer = event.pointerId;
      wipe.setPointerCapture?.(event.pointerId);
      setSplitFromPointer(event.clientX);
      event.stopPropagation();
    };
    const onWipeMove = event => {
      if (!wiping || event.pointerId !== wipePointer) return;
      setSplitFromPointer(event.clientX);
      event.stopPropagation();
    };
    const endWipe = event => {
      if (!wiping || (event?.pointerId != null && event.pointerId !== wipePointer)) return;
      wiping = false;
      if (wipePointer != null) wipe.releasePointerCapture?.(wipePointer);
      wipePointer = null;
    };
    wipe.addEventListener('pointerdown', onWipeDown);
    wipe.addEventListener('pointermove', onWipeMove);
    wipe.addEventListener('pointerup', endWipe);
    wipe.addEventListener('pointercancel', endWipe);

    const onScene = () => {
      const scene = scenes.find(item => item.id === sceneSelect.value);
      if (scene) loadScene(scene);
    };
    sceneSelect.addEventListener('change', onScene);

    const onFile = () => {
      if (presetLoading || !fileInput.files?.length) return;
      sceneNote.textContent = 'Local image · processed in this browser only.';
      sceneSensor.textContent = 'LOCAL';
      sceneMode.textContent = fileInput.files[0].type || 'image';
      resetNavigation(true);
    };
    fileInput.addEventListener('change', onFile);

    const onSplit = syncWipe;
    split.addEventListener('input', onSplit);

    const onView = event => {
      const button = event.currentTarget;
      shell.dataset.view = button.dataset.view || 'compare';
      requestAnimationFrame(syncWipe);
    };
    viewButtons.forEach(button => button.addEventListener('click', onView));

    const onZoomClick = event => {
      const action = event.target.closest('button')?.dataset.zoom;
      if (action === 'in') setZoom(zoom * 1.25);
      if (action === 'out') setZoom(zoom / 1.25);
      if (action === 'fit') resetNavigation(false);
    };
    zoomControls.addEventListener('click', onZoomClick);

    const ro = 'ResizeObserver' in window ? new ResizeObserver(() => applyTransform()) : null;
    ro?.observe(viewport);
    syncWipe();
    applyTransform();

    return () => {
      destroyed = true;
      ro?.disconnect();
      frame.removeEventListener('wheel', onWheel);
      frame.removeEventListener('pointerdown', onPanDown);
      frame.removeEventListener('pointermove', onPanMove);
      frame.removeEventListener('pointerup', endPan);
      frame.removeEventListener('pointercancel', endPan);
      wipe.removeEventListener('pointerdown', onWipeDown);
      wipe.removeEventListener('pointermove', onWipeMove);
      wipe.removeEventListener('pointerup', endWipe);
      wipe.removeEventListener('pointercancel', endWipe);
      sceneSelect.removeEventListener('change', onScene);
      fileInput.removeEventListener('change', onFile);
      split.removeEventListener('input', onSplit);
      viewButtons.forEach(button => button.removeEventListener('click', onView));
      zoomControls.removeEventListener('click', onZoomClick);
    };
  }

  addStyle();
  mounts.figure = async function mountFigureViewerV2(args = {}) {
    const cleanupPrevious = await previousMount(args);
    if (args.signal?.aborted || !args.stage?.isConnected) return cleanupPrevious || (() => {});
    const cleanupEnhancement = enhance(args.stage, args.signal);
    return () => {
      cleanupEnhancement?.();
      cleanupPrevious?.();
    };
  };

  window.GeoFigureViewerV2 = { version: '2026.10.01d', scenes: scenes.map(({ src, ...scene }) => scene) };
})();
