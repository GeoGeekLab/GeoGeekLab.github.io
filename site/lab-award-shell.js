/* GeoGeek Lab — Award Shell A4
 * Read-only host orientation for the seven Observatory instruments.
 * It does not mount instruments, change parameters, or replace instrument tasks.
 */
const CORE=Object.freeze(['orbit','earth','flow','pulse','figure','world','water']);
const META=Object.freeze({
  world:{index:'06',field:'PROJECTION FIELD',quantity:'DISTORTION / RELATION'},
  figure:{index:'05',field:'IMAGE → TRACE',quantity:'ABSTRACTION / CONTOUR'},
  orbit:{index:'01',field:'ORBITAL FIELD',quantity:'TRACKS / STATIONS'},
  earth:{index:'02',field:'EARTH OBSERVATION',quantity:'LAYERS / COMPARE'},
  flow:{index:'03',field:'FLOW FIELD',quantity:'VECTOR / REPRESENTATION'},
  pulse:{index:'04',field:'SEISMIC FIELD',quantity:'EVENTS / TIME'},
  water:{index:'07',field:'SPECTRAL WATER',quantity:'400–700 NM / RT'}
});

const dialog=document.getElementById('instrumentDialog');
const head=dialog?.querySelector('.instrument-head');
if(dialog&&head){
  document.documentElement.dataset.labAwardShell='a4';

  function ensureContext(){
    let context=head.querySelector(':scope > .instrument-award-context');
    if(context) return context;
    context=document.createElement('section');
    context.className='instrument-award-context';
    context.setAttribute('aria-label','Observatory instrument context');
    const first=head.querySelector(':scope > div:first-child');
    if(first) first.after(context);
    else head.prepend(context);
    return context;
  }

  function modeFor(kind){
    if(kind==='pulse') return (dialog.dataset.pulseTask||'observe').toUpperCase();
    if(kind==='orbit') return 'FIELD';
    if(kind==='water') return 'INTERNAL WORKSPACE';
    return (dialog.dataset.workspaceMode||'work').toUpperCase();
  }

  function render(){
    const kind=dialog.dataset.instrumentKind||'';
    const active=CORE.includes(kind);
    if(!active){
      delete dialog.dataset.labAwardShell;
      head.querySelector(':scope > .instrument-award-context')?.remove();
      return;
    }

    dialog.dataset.labAwardShell='a4';
    const meta=META[kind];
    const context=ensureContext();
    context.dataset.instrumentKind=kind;
    context.innerHTML=
      '<div class="instrument-award-context-line">'+
        '<span class="instrument-award-context-kicker">OBSERVATORY · '+meta.index+'</span>'+
        '<span class="instrument-award-context-mode">'+modeFor(kind)+'</span>'+
      '</div>'+
      '<strong>'+meta.field+'</strong>'+
      '<small>'+meta.quantity+'</small>'+
      '<div class="instrument-award-axis" aria-hidden="true">'+
        CORE.map(name=>'<i class="'+(name===kind?'is-active':'')+'"></i>').join('')+
      '</div>';
  }

  const observer=new MutationObserver(records=>{
    if(records.some(record=>[
      'data-instrument-kind','data-workspace-mode','data-pulse-task','open'
    ].includes(record.attributeName))) render();
  });
  observer.observe(dialog,{attributes:true,attributeFilter:[
    'data-instrument-kind','data-workspace-mode','data-pulse-task','open'
  ]});

  document.addEventListener('geogeek:workspace-mode',render);
  document.addEventListener('geogeek:pulse-task',render);
  render();

  window.GeoGeekLabAwardShell=Object.freeze({
    version:'a4',
    baselineRelease:'20261011v107watercache1',
    instruments:CORE.slice()
  });
}
