(() => {
  'use strict';

  const stage = document.getElementById('atlasStage');
  if (!stage) return;

  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  if (reduced || !finePointer) return;

  let frame = 0;
  let latestEvent = null;

  const paint = () => {
    frame = 0;
    if (!latestEvent) return;
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = Math.max(0, Math.min(100, ((latestEvent.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((latestEvent.clientY - rect.top) / rect.height) * 100));
    stage.style.setProperty('--atlas-pointer-x', `${x.toFixed(2)}%`);
    stage.style.setProperty('--atlas-pointer-y', `${y.toFixed(2)}%`);
    stage.classList.add('is-pointer-active');
  };

  stage.addEventListener('pointermove', event => {
    latestEvent = event;
    if (!frame) frame = requestAnimationFrame(paint);
  }, { passive: true });

  stage.addEventListener('pointerenter', () => stage.classList.add('is-pointer-active'), { passive: true });
  stage.addEventListener('pointerleave', () => {
    latestEvent = null;
    stage.classList.remove('is-pointer-active');
  }, { passive: true });
})();
