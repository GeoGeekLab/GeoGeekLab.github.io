(() => {
  'use strict';

  const mounts = window.GeoGeekInstrumentMounts;
  if (!mounts) return;

  const LOCAL_IMAGE = 'assets/lab/sentinel2.jpg';
  const REMOTE_IMAGE = 'https://raw.githubusercontent.com/GlobalFishingWatch/frontend/d43ab35fa2ccff9e4b5e22729190defe30e03b72/apps/platform/public/images/layer-library/sentinel2.jpg';
  const SOURCE_PAGE = 'https://github.com/GlobalFishingWatch/frontend/blob/d43ab35fa2ccff9e4b5e22729190defe30e03b72/apps/platform/public/images/layer-library/sentinel2.jpg';
  const NS = 'http://www.w3.org/2000/svg';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

  function loadImage(image, src) {
    return new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load raster: ${src}`));
      image.src = src;
    });
  }

  function edgePoint(edge, x, y, step, v0, v1, v2, v3, target) {
    const interpolate = (a, b, va, vb) => {
      const delta = vb - va;
      const t = Math.abs(delta) < 1e-6 ? .5 : clamp((target - va) / delta, 0, 1);
      return a + (b - a) * t;
    };
    if (edge === 0) return [interpolate(x, x + step, v0, v1), y];
    if (edge === 1) return [x + step, interpolate(y, y + step, v1, v2)];
    if (edge === 2) return [interpolate(x + step, x, v2, v3), y + step];
    return [x, interpolate(y + step, y, v3, v0)];
  }

  function segmentsForCase(index, center, target) {
    const cases = [
      [], [[3, 0]], [[0, 1]], [[3, 1]],
      [[1, 2]], null, [[0, 2]], [[3, 2]],
      [[2, 3]], [[0, 2]], null, [[1, 2]],
      [[1, 3]], [[0, 1]], [[3, 0]], []
    ];
    if (index === 5) {
      return center >= target ? [[0, 1], [2, 3]] : [[3, 0], [1, 2]];
    }
    if (index === 10) {
      return center >= target ? [[3, 0], [1, 2]] : [[0, 1], [2, 3]];
    }
    return cases[index] || [];
  }

  mounts.figure = async function mountFigure({ signal, stage } = {}) {
    if (!stage || signal?.aborted) return () => {};

    stage.innerHTML = `
      <div class="figure-layout">
        <div class="figure-stage">
          <canvas class="figure-canvas" width="520" height="360" aria-label="Sentinel-2 image with extracted luminance contours"></canvas>
          <svg class="figure-svg" viewBox="0 0 520 360" aria-hidden="true"></svg>
          <div class="figure-raster-status">SENTINEL-2 / TRUE-COLOR PREVIEW</div>
        </div>
        <aside class="figure-control">
          <div class="orbit-panel-label">RASTER → TRACE</div>
          <label><span>THRESHOLD <output id="figureThresholdValue">118</output></span><input id="figureThreshold" type="range" min="24" max="232" value="118" step="1"></label>
          <label><span>CONTOUR LEVELS <output id="figureLevelsValue">5</output></span><input id="figureLevels" type="range" min="1" max="9" value="5" step="1"></label>
          <label><span>SAMPLING <output id="figureSamplingValue">6 px</output></span><input id="figureSampling" type="range" min="3" max="14" value="6" step="1"></label>
          <p>At what point does an image become a map? Threshold the observed luminance, then let equal-value traces expose structure while texture recedes.</p>
          <a class="source-line" href="${SOURCE_PAGE}" target="_blank" rel="noreferrer">SENTINEL-2 · SOURCE / GLOBAL FISHING WATCH ↗</a>
        </aside>
      </div>`;

    const canvas = stage.querySelector('.figure-canvas');
    const svg = stage.querySelector('.figure-svg');
    const threshold = stage.querySelector('#figureThreshold');
    const levels = stage.querySelector('#figureLevels');
    const sampling = stage.querySelector('#figureSampling');
    const thresholdValue = stage.querySelector('#figureThresholdValue');
    const levelsValue = stage.querySelector('#figureLevelsValue');
    const samplingValue = stage.querySelector('#figureSamplingValue');
    const conditions = document.querySelector('#instrumentConditions');
    const ctx = canvas?.getContext('2d', { willReadFrequently: true });
    if (!canvas || !svg || !ctx || !threshold || !levels || !sampling) return () => {};

    if (conditions) {
      conditions.innerHTML = [
        ['INPUT', 'Sentinel-2 image preview'],
        ['OUTPUT', 'Marching Squares · SVG isolines'],
        ['CONTROL', 'Threshold · levels · sampling'],
        ['SPACE', 'Image coordinates']
      ].map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`).join('');
    }

    const width = canvas.width;
    const height = canvas.height;
    let luminance = null;
    let stopped = false;
    const image = new Image();
    image.decoding = 'async';
    image.crossOrigin = 'anonymous';

    try {
      try {
        await loadImage(image, LOCAL_IMAGE);
      } catch (localError) {
        if (signal?.aborted) return () => {};
        await loadImage(image, REMOTE_IMAGE);
      }
    } catch (error) {
      if (signal?.aborted) return () => {};
      stage.innerHTML = '<div class="instrument-error"><strong>Sentinel-2 raster unavailable.</strong><p>The local deployment asset and its pinned source could not be loaded.</p></div>';
      return () => {};
    }

    if (signal?.aborted || stopped) return () => {};

    const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const offsetX = (width - drawWidth) / 2;
    const offsetY = (height - drawHeight) / 2;

    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(image, offsetX, offsetY, drawWidth, drawHeight);
    const sourcePixels = ctx.getImageData(0, 0, width, height).data;
    luminance = new Float32Array(width * height);
    for (let i = 0, p = 0; i < sourcePixels.length; i += 4, p += 1) {
      luminance[p] = sourcePixels[i] * .2126 + sourcePixels[i + 1] * .7152 + sourcePixels[i + 2] * .0722;
    }
    ctx.fillStyle = 'rgba(7, 11, 9, .20)';
    ctx.fillRect(0, 0, width, height);

    const sample = (x, y) => {
      const sx = clamp(Math.round(x), 0, width - 1);
      const sy = clamp(Math.round(y), 0, height - 1);
      return luminance[sy * width + sx];
    };

    function drawContours() {
      if (!luminance || signal?.aborted || stopped) return;
      svg.innerHTML = '';
      const count = Number(levels.value);
      const step = Number(sampling.value);
      const centerThreshold = Number(threshold.value);

      thresholdValue.textContent = String(centerThreshold);
      levelsValue.textContent = String(count);
      samplingValue.textContent = `${step} px`;

      for (let level = 0; level < count; level += 1) {
        const target = clamp(centerThreshold + (level - (count - 1) / 2) * 12, 1, 254);
        let d = '';

        for (let y = 0; y < height - step; y += step) {
          for (let x = 0; x < width - step; x += step) {
            const v0 = sample(x, y);
            const v1 = sample(x + step, y);
            const v2 = sample(x + step, y + step);
            const v3 = sample(x, y + step);
            const index = (v0 >= target ? 1 : 0) |
              (v1 >= target ? 2 : 0) |
              (v2 >= target ? 4 : 0) |
              (v3 >= target ? 8 : 0);
            if (index === 0 || index === 15) continue;

            const center = (v0 + v1 + v2 + v3) / 4;
            const segments = segmentsForCase(index, center, target);
            for (const [a, b] of segments) {
              const p1 = edgePoint(a, x, y, step, v0, v1, v2, v3, target);
              const p2 = edgePoint(b, x, y, step, v0, v1, v2, v3, target);
              d += `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}L${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
            }
          }
        }

        const path = document.createElementNS(NS, 'path');
        const central = level === Math.floor(count / 2);
        path.setAttribute('d', d);
        path.setAttribute('fill', 'none');
        path.setAttribute('stroke', central ? 'rgba(209,99,57,.98)' : 'rgba(241,239,231,.62)');
        path.setAttribute('stroke-width', central ? '1.45' : '.72');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('vector-effect', 'non-scaling-stroke');
        svg.appendChild(path);
      }
    }

    const onInput = () => drawContours();
    [threshold, levels, sampling].forEach(input => input.addEventListener('input', onInput));
    drawContours();

    return () => {
      stopped = true;
      [threshold, levels, sampling].forEach(input => input.removeEventListener('input', onInput));
      image.onload = null;
      image.onerror = null;
      image.src = '';
      if (stage.isConnected) stage.innerHTML = '';
    };
  };
})();
