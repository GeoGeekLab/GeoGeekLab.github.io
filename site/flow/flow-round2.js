const VERSION = '20261002b';

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

function normalizeFlowCopy() {
  const root = document.querySelector('#instrumentStage .flow-lab');
  if (!root) return;
  rewriteText(root);
  const status = root.querySelector('#flStatus');
  if (status?.textContent.trim().toUpperCase() === 'DEMO') status.textContent = 'REFERENCE';
}

normalizeFlowCopy();
let frame = 0;
const observer = new MutationObserver(() => {
  if (frame) return;
  frame = requestAnimationFrame(() => {
    frame = 0;
    normalizeFlowCopy();
  });
});
observer.observe(document.getElementById('instrumentStage') || document.documentElement, {
  childList:true,
  subtree:true,
  characterData:true
});

window.addEventListener('pagehide', () => {
  observer.disconnect();
  if (frame) cancelAnimationFrame(frame);
}, { once:true });

window.GeoFlowRound2Entry = { version:VERSION };
