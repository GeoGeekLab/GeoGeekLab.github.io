/* Water as Spectrum — Award Polish A5
 * Coordinates presentation transitions only.
 * It never writes model parameters or invokes a scientific computation.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.waterAwardPolish==='a5') return;
  root.dataset.waterAwardPolish='a5';

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let lastWorkspace='';
  let lastProbe='';
  let timer=0;

  function currentWorkspace(){
    return document.querySelector('#mainNav [data-tab][aria-selected="true"]')?.dataset.tab||'';
  }

  function currentProbe(){
    return document.getElementById('probeValue')?.textContent?.trim()||'';
  }

  function pulse(kind){
    if(reduced?.matches) return;
    clearTimeout(timer);
    delete root.dataset.waterAwardTransition;
    requestAnimationFrame(()=>{
      root.dataset.waterAwardTransition=kind;
      timer=window.setTimeout(()=>{
        delete root.dataset.waterAwardTransition;
      },320);
    });
  }

  function reconcile(){
    const workspace=currentWorkspace();
    const probe=currentProbe();

    if(lastWorkspace && workspace && workspace!==lastWorkspace) pulse('workspace');
    else if(lastProbe && probe && probe!==lastProbe) pulse('probe');

    if(workspace) lastWorkspace=workspace;
    if(probe) lastProbe=probe;
  }

  const observer=new MutationObserver(reconcile);
  observer.observe(document.body,{
    subtree:true,
    childList:true,
    characterData:true,
    attributes:true,
    attributeFilter:['aria-selected']
  });

  document.addEventListener('input',event=>{
    if(event.target?.id==='probeRange') reconcile();
  },{passive:true});

  reconcile();

  window.GeoWaterAwardPolish=Object.freeze({
    version:'a5',
    concept:'a3',
    scientificWorkbench:'10.2.0-quiet2'
  });
})();
