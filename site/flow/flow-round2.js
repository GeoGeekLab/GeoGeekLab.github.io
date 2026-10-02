const VERSION = '20261002c';

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

function normalizeFlowCopy() {
  const root = stage?.querySelector('.flow-lab');
  if (!root) return;
  rewriteText(root);
  const status = root.querySelector('#flStatus');
  if (status?.textContent.trim().toUpperCase() === 'DEMO') status.textContent = 'REFERENCE';
}

function syncLifecycle() {
  if (!stage) return;
  const hasFlow = Boolean(stage.querySelector('.flow-lab'));
  if (!hasFlow && hadFlow) {
    stage._flowRound2Cleanup?.();
    delete stage._flowRound2Cleanup;
    delete stage.dataset.flowRound2;
  }
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
  characterData:true
});

window.addEventListener('pagehide', () => {
  observer.disconnect();
  stage?._flowRound2Cleanup?.();
  if (frame) cancelAnimationFrame(frame);
}, { once:true });

window.GeoFlowRound2Entry = { version:VERSION };
