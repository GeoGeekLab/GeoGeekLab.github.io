/* Water as Spectrum — award observation module A3
 * Read-only presentation of the existing model topology.
 * It does not change tabs, parameters, model state, or numerical results.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.waterAwardJourney==='a3') return;
  root.dataset.waterAwardJourney='a3';

  let scheduled=0;

  const TOPOLOGY=Object.freeze({
    atm:{
      active:'atmosphere',
      state:'FORWARD PATH',
      title:'From modeled water signal to idealized TOA reflectance',
      input:'Modeled water Rrs(λ), aerosol state, pressure, and observation geometry',
      output:'Idealized first-order TOA reflectance proxy ρ*(λ)',
      limit:'First-order additive teaching model. This is not measured satellite radiance.',
      edges:['water-atm']
    },
    sensor:{
      active:'sensor',
      state:'SRF WEIGHTING',
      title:'From a modeled spectrum to response-weighted band samples',
      input:'Selected modeled Rrs(λ) or idealized TOA ρ*(λ) source spectrum',
      output:'Supported SRF-weighted sensor-band samples',
      limit:'Band weighting only. Incomplete or out-of-domain SRF support produces no band value.',
      edges:[]
    },
    ac:{
      active:'correction',
      state:'INVERSE HYPOTHESIS',
      title:'From idealized TOA reflectance to a recovered water spectrum',
      input:'Idealized TOA ρ*(λ) plus an independently adjustable assumed aerosol state',
      output:'Recovered Rrs(λ) inside the same first-order model family',
      limit:'A matched solution can close by construction. This is not independent correction validation.',
      edges:['water-atm','atm-correction']
    }
  });

  function activeWorkspace(){
    return document.querySelector('#mainNav [data-tab][aria-selected="true"]')?.dataset.tab||'';
  }

  function sensorUsesRrs(){
    const sensor=document.querySelector('.p6b-sensor');
    if(!sensor) return false;
    return /above-water\s+Rrs/i.test(sensor.textContent||'');
  }

  function topologySvg(active,edges){
    const edge=(id,d)=>'<path class="gg-lab-topology-edge'+(edges.includes(id)?' is-active':'')+
      '" data-edge="'+id+'" d="'+d+'"/>';
    const node=(id,x,y,kicker,title,quantity)=>{
      const on=id===active;
      return '<g class="gg-lab-topology-node'+(on?' is-active':'')+'" data-node="'+id+
        '" transform="translate('+x+' '+y+')">'+
        '<rect width="190" height="76" rx="2"/>'+
        '<text class="gg-node-kicker" x="16" y="22">'+kicker+'</text>'+
        '<text class="gg-node-title" x="16" y="47">'+title+'</text>'+
        '<text class="gg-node-quantity" x="16" y="67">'+quantity+'</text>'+
      '</g>';
    };
    return '<svg class="gg-lab-topology-svg" viewBox="0 0 1000 230" aria-hidden="true" focusable="false">'+
      edge('water-atm','M210 116 C245 116 248 116 282 116')+
      edge('water-sensor','M210 94 C405 30 520 42 700 63')+
      edge('atm-sensor','M472 101 C565 65 615 62 700 63')+
      edge('atm-correction','M472 132 C565 171 615 172 700 171')+
      '<path d="M272 110 L282 116 L272 122" fill="none" stroke="currentColor" opacity=".32"/>'+
      '<path d="M690 57 L700 63 L689 68" fill="none" stroke="currentColor" opacity=".32"/>'+
      '<path d="M690 165 L700 171 L689 176" fill="none" stroke="currentColor" opacity=".32"/>'+
      node('water',20,78,'SOURCE','Water optics','Rrs(λ)')+
      node('atmosphere',282,78,'FORWARD','Atmosphere','ρ*TOA(λ)')+
      node('sensor',700,25,'OBSERVE','Sensor','band samples')+
      node('correction',700,133,'INVERSE','Correction','Rrs_est(λ)')+
    '</svg>';
  }

  function makeTopology(workspace){
    const def=TOPOLOGY[workspace];
    if(!def) return null;

    let edges=[...def.edges];
    let input=def.input;
    if(workspace==='sensor'){
      const rrs=sensorUsesRrs();
      edges=[rrs?'water-sensor':'atm-sensor'];
      input=rrs?'Modeled above-water Rrs(λ) source spectrum':
        'Idealized TOA ρ*(λ) source spectrum';
    }

    const section=document.createElement('section');
    section.className='gg-lab-topology award-model-topology';
    section.setAttribute('aria-label','Model topology for the active Water workspace');

    section.innerHTML=
      '<header class="gg-lab-topology-head">'+
        '<div><span class="gg-lab-topology-kicker">MODEL TOPOLOGY · READ-ONLY</span>'+
        '<strong>'+def.title+'</strong></div>'+
        '<span class="gg-lab-topology-state">'+def.state+'</span>'+
      '</header>'+
      '<div class="gg-lab-topology-canvas">'+topologySvg(def.active,edges)+'</div>'+
      '<dl class="gg-lab-topology-readout">'+
        '<div><dt>INPUT</dt><dd>'+input+'</dd></div>'+
        '<div><dt>OUTPUT</dt><dd>'+def.output+'</dd></div>'+
        '<div><dt>INTERPRETATION LIMIT</dt><dd>'+def.limit+'</dd></div>'+
      '</dl>';
    return section;
  }

  function install(){
    scheduled=0;
    const workspace=activeWorkspace();
    root.dataset.waterWorkspace=workspace;
    if(!TOPOLOGY[workspace]) return;

    const selector=workspace==='atm'?'.p6b-atmosphere':
      workspace==='sensor'?'.p6b-sensor':'.p7-ac';
    const view=document.querySelector('#mainContent '+selector);
    if(!view) return;

    view.classList.add('award-observation-a3');
    const signature=workspace==='sensor'
      ?workspace+':' + (sensorUsesRrs()?'rrs':'toa')
      :workspace;
    const existing=view.querySelector(':scope > .award-model-topology');
    if(existing?.dataset.topologySignature===signature) return;

    const topology=makeTopology(workspace);
    if(topology){
      topology.dataset.topologySignature=signature;
      if(existing) existing.replaceWith(topology);
      else view.prepend(topology);
    }
  }

  function schedule(){
    if(scheduled) return;
    scheduled=requestAnimationFrame(install);
  }

  const observer=new MutationObserver(schedule);

  function start(){
    install();
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['aria-selected','aria-pressed']
    });
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
