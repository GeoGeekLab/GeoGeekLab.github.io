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
  let toolFrame=0;

  function positionTools(){
    toolFrame=0;
    const menu=document.getElementById('toolsMenu');
    const summary=menu?.querySelector(':scope > summary');
    const panel=menu?.querySelector(':scope > .ui-toolmenu-panel');
    if(!menu?.open||!summary||!panel) return;

    const trigger=summary.getBoundingClientRect();
    const width=panel.offsetWidth||Math.min(255,window.innerWidth-16);
    const height=panel.offsetHeight||140;
    const gutter=8;
    const left=Math.max(gutter,Math.min(window.innerWidth-width-gutter,trigger.right-width));
    const below=trigger.bottom+6;
    const above=trigger.top-height-6;
    const top=below+height<=window.innerHeight-gutter
      ?below
      :Math.max(gutter,above);

    panel.style.setProperty('--water-tools-left',left.toFixed(1)+'px');
    panel.style.setProperty('--water-tools-top',top.toFixed(1)+'px');
  }

  function scheduleTools(){
    if(toolFrame) return;
    toolFrame=requestAnimationFrame(positionTools);
  }

  function installToolOverlay(){
    const menu=document.getElementById('toolsMenu');
    if(!menu||menu.dataset.awardOverlay==='a5') return;
    menu.dataset.awardOverlay='a5';
    menu.addEventListener('toggle',scheduleTools);
    window.addEventListener('resize',scheduleTools,{passive:true});
    document.addEventListener('scroll',scheduleTools,{passive:true,capture:true});
    scheduleTools();
  }

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
    installToolOverlay();
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
