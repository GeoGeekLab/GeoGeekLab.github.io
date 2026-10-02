const VERSION = '20261002d';

await import(new URL('../flow-lab-round2.js?v=20261002a', import.meta.url).href);

function rewriteText(root) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    if (node.parentElement?.closest('script,style')) continue;
    const next = String(node.nodeValue || '')
      .replace(/\bDEMONSTRATION\b/g, 'TEACHING REFERENCE')
      .replace(/\bDemonstration\b/g, 'Teaching reference')
      .replace(/\bdemonstration\b/g, 'teaching reference')
      .replace(/\bDEMO\b/g, 'REFERENCE')
      .replace(/\bDemo\b/g, 'Reference')
      .replace(/\bdemo\b/g, 'reference');
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

const stage = document.getElementById('instrumentStage');
let hadFlow = Boolean(stage?.querySelector('.flow-lab'));
let tripTimer = 0;
let controlledTripPlaying = false;
let allowNativeTripToggle = false;

function stopControlledTrip() {
  if (tripTimer) clearInterval(tripTimer);
  tripTimer = 0;
  controlledTripPlaying = false;
  const button = stage?.querySelector('#flTripPlay');
  if (button) button.textContent = '▶';
}

function stepControlledTrip() {
  const root = stage?.querySelector('.flow-lab');
  if (!root || root.dataset.mode !== 'trips') {
    stopControlledTrip();
    return;
  }
  const range = root.querySelector('#flTripTime');
  if (!range) return;
  const max = Number(range.max || 75);
  const min = Number(range.min || 0);
  const current = Number(range.value || min);
  range.value = String(current >= max ? min : current + 1);
  range.dispatchEvent(new Event('input', { bubbles:true }));
}

function stabilizeTripPlayback(root) {
  if (!root || root.dataset.mode !== 'trips') return;
  const button = root.querySelector('#flTripPlay');
  if (!button || button.dataset.flowRound2Playback === '1') return;

  // The base Flow renderer animates TRIPS by rebuilding its SVG every animation
  // frame. Round 2 adds a geodesic/antimeridian overlay that also observes that
  // SVG, so 60 fps replacement can starve the overlay's coalesced paint. Pause
  // the base loop once, then drive the existing time input at a deliberate
  // teaching cadence. The original time state and renderer remain authoritative.
  if (button.textContent.trim() === 'Ⅱ') {
    allowNativeTripToggle = true;
    button.click();
    allowNativeTripToggle = false;
  }
  button.dataset.flowRound2Playback = '1';
  button.textContent = controlledTripPlaying ? 'Ⅱ' : '▶';
}

function onTripControlClick(event) {
  const button = event.target.closest?.('#flTripPlay');
  if (!button || allowNativeTripToggle) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  controlledTripPlaying = !controlledTripPlaying;
  button.textContent = controlledTripPlaying ? 'Ⅱ' : '▶';
  if (tripTimer) clearInterval(tripTimer);
  tripTimer = controlledTripPlaying ? setInterval(stepControlledTrip, 140) : 0;
}

stage?.addEventListener('click', onTripControlClick, true);

function normalizeFlowCopy() {
  const root = stage?.querySelector('.flow-lab');
  if (!root) return;
  rewriteText(root);
  const status = root.querySelector('#flStatus');
  if (status?.textContent.trim().toUpperCase() === 'DEMO') status.textContent = 'REFERENCE';
  stabilizeTripPlayback(root);
}

function syncLifecycle() {
  if (!stage) return;
  const hasFlow = Boolean(stage.querySelector('.flow-lab'));
  if (!hasFlow && hadFlow) {
    stopControlledTrip();
    stage._flowRound2Cleanup?.();
    delete stage._flowRound2Cleanup;
    delete stage.dataset.flowRound2;
  }
  if (hasFlow && stage.querySelector('.flow-lab')?.dataset.mode !== 'trips' && controlledTripPlaying) stopControlledTrip();
  hadFlow = hasFlow;
  if (hasFlow) normalizeFlowCopy();
}

syncLifecycle();
let frame = 0;
const observer = new MutationObserver(() => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    syncLifecycle();
  });
});
observer.observe(stage || document.documentElement, {
  childList:true,
  subtree:true,
  characterData:true,
  attributes:true,
  attributeFilter:['data-mode']
});

window.addEventListener('pagehide', () => {
  observer.disconnect();
  stopControlledTrip();
  stage?.removeEventListener('click', onTripControlClick, true);
  stage?._flowRound2Cleanup?.();
  if (frame) cancelAnimationFrame(frame);
}, { once:true });

window.GeoFlowRound2Entry = { version:VERSION };
