(() => {
  'use strict';
  const mounts = window.GeoGeekInstrumentMounts;
  const previousMount = mounts?.figure;
  if (!mounts || !previousMount || window.GeoFigureViewerV2Polish) return;

  mounts.figure = async function mountFigureViewerV2Polish(args = {}) {
    const cleanupPrevious = await previousMount(args);
    const stage = args.stage;
    if (args.signal?.aborted || !stage?.isConnected) return cleanupPrevious || (() => {});

    const frame = stage.querySelector('#fwFrame');
    const crosshair = stage.querySelector('#fwCrosshair');
    const sceneSelect = stage.querySelector('#fwScene');
    const sampleButton = stage.querySelector('#fwSample');
    const fileInput = stage.querySelector('#fwFile');
    const imageryCard = stage.querySelector('.figure-imagery-card');
    if (!frame || !crosshair || !sceneSelect || !imageryCard) return cleanupPrevious || (() => {});

    const presetLink = document.createElement('a');
    presetLink.className = 'figure-source figure-preset-source';
    presetLink.target = '_blank';
    presetLink.rel = 'noreferrer';
    imageryCard.appendChild(presetLink);

    const scenes = window.GeoFigureViewerV2?.scenes || [];
    const presetIds = new Set(scenes.map(scene => scene.id));
    let localCustom = false;

    function syncPresetLink() {
      const scene = scenes.find(item => item.id === sceneSelect.value);
      if (!scene || localCustom) {
        presetLink.hidden = true;
        return;
      }
      presetLink.hidden = false;
      presetLink.href = scene.page;
      presetLink.textContent = `${scene.credit || scene.title} · SOURCE ↗`;
    }

    const onSceneChange = () => {
      localCustom = false;
      const scene = scenes.find(item => item.id === sceneSelect.value);
      if (scene?.current) setTimeout(() => sampleButton?.click(), 0);
      syncPresetLink();
    };

    const onFileChange = () => {
      const file = fileInput?.files?.[0];
      if (!file) return;
      const stem = file.name.replace(/\.[^.]+$/, '');
      localCustom = !presetIds.has(stem);
      syncPresetLink();
    };

    const onProbeMove = event => {
      const rect = frame.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
      const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
      crosshair.style.left = `${x}%`;
      crosshair.style.top = `${y}%`;
    };

    sceneSelect.addEventListener('change', onSceneChange);
    fileInput?.addEventListener('change', onFileChange);
    frame.addEventListener('pointermove', onProbeMove);
    syncPresetLink();

    return () => {
      sceneSelect.removeEventListener('change', onSceneChange);
      fileInput?.removeEventListener('change', onFileChange);
      frame.removeEventListener('pointermove', onProbeMove);
      presetLink.remove();
      cleanupPrevious?.();
    };
  };

  window.GeoFigureViewerV2Polish = { version: '2026.10.01e' };
})();
