(() => {
  'use strict';

  const root = window.GeoPlay = window.GeoPlay || {};
  const orient = root.orient = root.orient || {};
  if (orient.ergonomics?.version === 'orient-ergonomics-1') return;
  root.core?.ensureStyle?.('play/orient/orient-ergonomics.css?v=20261003i', 'orient-ergonomics');

  const VERSION = 'orient-ergonomics-1';
  const INPUT_HELP_ID = 'orientInputHelp';
  const PRIMER_HELP_ID = 'orientPrimerHelp';
  const FINE_STEPS = [
    { key: 'ArrowLeft', label: '2° CCW', aria: 'Adjust bearing 2 degrees counterclockwise' },
    { key: 'ArrowRight', label: '2° CW', aria: 'Adjust bearing 2 degrees clockwise' },
    { key: 'ArrowDown', label: '−250 KM', aria: 'Reduce estimated distance by 250 kilometres' },
    { key: 'ArrowUp', label: '+250 KM', aria: 'Increase estimated distance by 250 kilometres' }
  ];

  function ensureHelp(shell, id, text) {
    let node = shell.querySelector(`#${id}`);
    if (node) return node;
    node = document.createElement('p');
    node.id = id;
    node.className = 'orient-sr-only';
    node.textContent = text;
    shell.querySelector('.play-field')?.appendChild(node);
    return node;
  }

  function enhanceLiveRegions(shell) {
    const fieldNote = shell.querySelector('.play-field-note');
    const readout = shell.querySelector('.play-readout');
    if (fieldNote) {
      fieldNote.removeAttribute('aria-live');
      fieldNote.setAttribute('aria-hidden', 'true');
    }
    if (readout) {
      readout.setAttribute('role', 'status');
      readout.setAttribute('aria-live', 'polite');
      readout.setAttribute('aria-atomic', 'false');
      readout.setAttribute('aria-relevant', 'additions text');
    }
  }

  function enhanceMaps(shell) {
    const map = shell.querySelector('svg.orient-map:not(.orient-primer-map)');
    if (map) {
      ensureHelp(shell, INPUT_HELP_ID, 'Spatial judgment field. Drag from the reference point for a coarse estimate. For keyboard input, left and right adjust bearing, up and down adjust distance, Shift makes larger steps, keys 1 2 and 3 set confidence, Enter commits, and R resets. On small screens, fine adjustment buttons provide the same small bearing and distance steps.');
      map.setAttribute('role', 'group');
      map.setAttribute('aria-describedby', INPUT_HELP_ID);
      map.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown 1 2 3 Enter R');
      map.setAttribute('aria-label', 'ORIENT spatial judgment field');
      map.dataset.orientAccessibleInput = VERSION;
    }

    const primer = shell.querySelector('svg.orient-primer-map');
    if (primer) {
      ensureHelp(shell, PRIMER_HELP_ID, 'Practice vector input. Drag from the centre, or use arrow keys. Left and right change direction. Up and down change distance. This practice is not recorded.');
      primer.setAttribute('role', 'group');
      primer.setAttribute('aria-describedby', PRIMER_HELP_ID);
      primer.setAttribute('aria-keyshortcuts', 'ArrowLeft ArrowRight ArrowUp ArrowDown');
      primer.setAttribute('aria-label', 'ORIENT practice vector input');
      primer.dataset.orientAccessibleInput = VERSION;
    }
  }

  function hasEstimate(shell) {
    const point = shell.querySelector('svg.orient-map:not(.orient-primer-map) .orient-judgment-point');
    if (!point) return false;
    const opacity = Number(point.getAttribute('opacity'));
    return Number.isFinite(opacity) ? opacity > 0 : true;
  }

  function dispatchFineStep(shell, key) {
    const map = shell.querySelector('svg.orient-map:not(.orient-primer-map)');
    if (!map || shell.dataset.playState !== 'judge' || !hasEstimate(shell)) return false;
    try { map.focus({ preventScroll: true }); } catch (_) { map.focus(); }
    return map.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }));
  }

  function syncFineControls(shell) {
    const controls = shell.querySelector('.orient-fine-controls');
    if (!controls) return;
    const enabled = shell.dataset.playState === 'judge' && hasEstimate(shell);
    controls.hidden = shell.dataset.playState !== 'judge';
    controls.querySelectorAll('button').forEach(button => { button.disabled = !enabled; });
    const note = controls.querySelector('.orient-fine-note');
    const nextNote = enabled ? 'FINE ADJUST · SAME STEPS AS ARROW KEYS' : 'DRAG OR USE ARROWS FIRST';
    if (note && note.textContent !== nextNote) note.textContent = nextNote;
  }

  function ensureFineControls(shell) {
    const task = shell.querySelector('.play-task');
    if (!task?.querySelector('.orient-confidence')) return;
    let controls = task.querySelector('.orient-fine-controls');
    if (!controls) {
      controls = document.createElement('div');
      controls.className = 'orient-fine-controls';
      controls.setAttribute('aria-label', 'Fine spatial adjustment');
      controls.innerHTML = `<span class="orient-fine-note">DRAG OR USE ARROWS FIRST</span><div class="orient-fine-grid">${FINE_STEPS.map(step => `<button type="button" data-orient-fine-key="${step.key}" aria-label="${step.aria}">${step.label}</button>`).join('')}</div>`;
      controls.querySelectorAll('button').forEach(button => {
        button.addEventListener('click', () => {
          dispatchFineStep(shell, button.dataset.orientFineKey);
          queueMicrotask(() => syncFineControls(shell));
        });
      });
      task.appendChild(controls);
    }
    syncFineControls(shell);
  }

  function ensureRecovery(shell) {
    const errorTitle = shell.querySelector('.instrument-error strong')?.textContent?.trim();
    if (errorTitle !== 'FIELD UNAVAILABLE') return;
    const actions = shell.querySelector('.play-actions');
    const readout = shell.querySelector('.play-readout');
    if (!actions) return;

    if (readout && !readout.textContent.trim()) {
      readout.innerHTML = '<div class="play-kicker">RECOVERY</div><p>The field could not load. Any committed judgments remain in local Spatial Trace. Retry reloads this field with the same URL and seed.</p>';
    }

    if (![...actions.querySelectorAll('button')].some(button => button.textContent.trim() === 'RETRY FIELD')) {
      const retry = document.createElement('button');
      retry.type = 'button';
      retry.className = 'play-action';
      retry.textContent = 'RETRY FIELD';
      retry.addEventListener('click', () => location.reload());
      actions.prepend(retry);
    }

    if (![...actions.querySelectorAll('button')].some(button => button.textContent.trim() === 'RETURN TO LAB')) {
      const back = document.createElement('button');
      back.type = 'button';
      back.className = 'play-action is-secondary';
      back.textContent = 'RETURN TO LAB';
      back.addEventListener('click', () => document.getElementById('instrumentClose')?.click());
      actions.appendChild(back);
    }
    shell.dataset.orientRecoveryVersion = VERSION;
  }

  function enhanceShell(shell) {
    if (!shell?.isConnected) return false;
    enhanceLiveRegions(shell);
    enhanceMaps(shell);
    ensureFineControls(shell);
    syncFineControls(shell);
    ensureRecovery(shell);
    shell.dataset.orientErgonomicsVersion = VERSION;
    return true;
  }

  function sweep() {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.play-shell[data-play-kind="orient"]').forEach(enhanceShell);
  }

  let observer = null;
  let queued = false;
  function scheduleSweep() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      sweep();
    });
  }

  function install() {
    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined' || observer) return;
    observer = new MutationObserver(scheduleSweep);
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-play-state', 'opacity']
    });
    scheduleSweep();
  }

  orient.ergonomics = Object.freeze({
    version: VERSION,
    enhanceShell,
    dispatchFineStep,
    install
  });

  install();
})();