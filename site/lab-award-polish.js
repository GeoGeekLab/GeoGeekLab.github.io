/* GeoGeek Lab — Award Polish A5
 * Read-only transition coordinator for the A4 Observatory host.
 * It reflects instrument/task changes and never changes their state.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.labAwardPolish==='a5') return;
  root.dataset.labAwardPolish='a5';

  const dialog=document.getElementById('instrumentDialog');
  if(!dialog) return;

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  const CORE=new Set(['orbit','earth','flow','pulse','figure','world','water']);
  let lastSignature='';
  let timer=0;

  function signature(){
    const kind=dialog.dataset.instrumentKind||'';
    if(!CORE.has(kind)||!dialog.open) return '';
    const state=kind==='pulse'
      ?dialog.dataset.pulseTask||'observe'
      :kind==='orbit'
        ?'field'
        :kind==='water'
          ?'internal'
          :dialog.dataset.workspaceMode||'work';
    return kind+':'+state;
  }

  function transition(){
    const next=signature();
    if(!next){
      lastSignature='';
      delete dialog.dataset.labAwardPolish;
      delete dialog.dataset.labAwardTransition;
      return;
    }

    dialog.dataset.labAwardPolish='a5';
    if(next===lastSignature) return;

    const first=!lastSignature;
    lastSignature=next;
    if(reduced?.matches) return;

    clearTimeout(timer);
    delete dialog.dataset.labAwardTransition;
    requestAnimationFrame(()=>{
      dialog.dataset.labAwardTransition=first?'enter':'state';
      timer=window.setTimeout(()=>{
        delete dialog.dataset.labAwardTransition;
      },380);
    });
  }

  const observer=new MutationObserver(records=>{
    if(records.some(record=>[
      'open','data-instrument-kind','data-workspace-mode','data-pulse-task'
    ].includes(record.attributeName))) transition();
  });
  observer.observe(dialog,{attributes:true,attributeFilter:[
    'open','data-instrument-kind','data-workspace-mode','data-pulse-task'
  ]});

  document.addEventListener('geogeek:workspace-mode',transition);
  document.addEventListener('geogeek:pulse-task',transition);
  transition();

  window.GeoGeekLabAwardPolish=Object.freeze({
    version:'a5',
    shell:'a4',
    baselineRelease:'20261011v107watercache1'
  });
})();
