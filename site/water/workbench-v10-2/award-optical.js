/* Water as Spectrum — award optical module A3
 * Presentation-only enhancement.
 * It reads existing DOM state and exposes visual CSS variables.
 * It does not write model parameters, calculate new science, or dispatch model actions.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.waterAwardOptical==='a3') return;
  root.dataset.waterAwardOptical='a3';

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let pointerFrame=0;
  let reconcileFrame=0;

  function clamp(value,min,max){return Math.max(min,Math.min(max,value));}

  function wavelengthToRgb(nm){
    const w=clamp(Number(nm)||490,380,700);
    let r=0,g=0,b=0;
    if(w<440){r=-(w-440)/(440-380);b=1;}
    else if(w<490){g=(w-440)/(490-440);b=1;}
    else if(w<510){g=1;b=-(w-510)/(510-490);}
    else if(w<580){r=(w-510)/(580-510);g=1;}
    else if(w<645){r=1;g=-(w-645)/(645-580);}
    else{r=1;}
    const factor=w<420?.35+.65*(w-380)/40:w>645?.35+.65*(700-w)/55:1;
    const gamma=.8;
    return [r,g,b].map(c=>Math.round(255*Math.pow(clamp(c*factor,0,1),gamma)));
  }

  function selectedNumber(selector,attribute,fallback){
    const selected=document.querySelector(selector+'[aria-pressed="true"]');
    const value=Number(selected?.getAttribute(attribute));
    return Number.isFinite(value)?value:fallback;
  }

  function currentWavelength(){
    const rt=selectedNumber('[data-rt-wl]','data-rt-wl',NaN);
    if(Number.isFinite(rt)) return rt;
    const probe=document.getElementById('probeValue');
    const match=probe?.textContent?.match(/(\d+(?:\.\d+)?)\s*nm/i);
    return match?Number(match[1]):490;
  }

  function currentDepth(){
    return selectedNumber('[data-rt-depth]','data-rt-depth',0);
  }

  function currentSun(){
    return selectedNumber('[data-rt-sun]','data-rt-sun',0);
  }

  function setVisualVariables(){
    const nm=currentWavelength();
    const [r,g,b]=wavelengthToRgb(nm);
    const probeX=clamp((nm-400)/300*100,0,100);
    const depth=currentDepth();
    const sun=currentSun();
    const depthButtons=[...document.querySelectorAll('[data-rt-depth]')];
    const depthValues=depthButtons.map(button=>Number(button.dataset.rtDepth)).filter(Number.isFinite);
    const minDepth=depthValues.length?Math.min(...depthValues):0;
    const maxDepth=depthValues.length?Math.max(...depthValues):20;
    const depthT=maxDepth===minDepth?0:(depth-minDepth)/(maxDepth-minDepth);

    root.style.setProperty('--water-spectrum-rgb',r+','+g+','+b);
    root.style.setProperty('--water-probe-x',probeX.toFixed(3)+'%');
    root.style.setProperty('--water-depth-y',(30+clamp(depthT,0,1)*52).toFixed(2)+'%');
    root.style.setProperty('--water-rt-depth-y',(18+clamp(depthT,0,1)*66).toFixed(2)+'%');
    root.style.setProperty('--water-sun-angle',(-clamp(sun,0,75)).toFixed(2)+'deg');
    root.dataset.waterSpectralBand=nm<470?'violet-blue':nm<530?'cyan-green':nm<590?'green-yellow':nm<645?'orange':'red';

    const active=document.querySelector('.tab[aria-selected="true"]');
    const workspace=active?.dataset?.tab||active?.dataset?.workspace||'';
    if(workspace) root.dataset.waterWorkspace=workspace;
  }

  function ensureAmbientField(){
    const main=document.querySelector('.main-space');
    if(!main||main.querySelector(':scope > .award-water-field')) return;
    const field=document.createElement('div');
    field.className='award-water-field';
    field.setAttribute('aria-hidden','true');
    main.prepend(field);

    main.addEventListener('pointermove',event=>{
      if(reduced?.matches) return;
      if(pointerFrame) cancelAnimationFrame(pointerFrame);
      pointerFrame=requestAnimationFrame(()=>{
        const rect=main.getBoundingClientRect();
        if(!rect.width||!rect.height) return;
        const x=clamp((event.clientX-rect.left)/rect.width*100,0,100);
        const y=clamp((event.clientY-rect.top)/rect.height*100,0,100);
        root.style.setProperty('--water-pointer-x',x.toFixed(2)+'%');
        root.style.setProperty('--water-pointer-y',y.toFixed(2)+'%');
      });
    },{passive:true});

    main.addEventListener('pointerleave',()=>{
      root.style.setProperty('--water-pointer-x','50%');
      root.style.setProperty('--water-pointer-y','36%');
    },{passive:true});
  }

  function createSpectrumRuler(){
    const ruler=document.createElement('section');
    ruler.className='award-spectrum-ruler';
    ruler.setAttribute('role','group');
    ruler.setAttribute('aria-label','Active wavelength position across the modeled 400 to 700 nanometer spectrum');
    ruler.innerHTML=
      '<div class="award-spectrum-ruler-head">'+
        '<span>ACTIVE WAVELENGTH</span><strong data-award-spectrum-value>—</strong>'+
      '</div>'+
      '<div class="award-spectrum-track" aria-hidden="true">'+
        '<i class="award-spectrum-marker"></i>'+
        '<span style="--x:0%">400</span>'+
        '<span style="--x:33.333%">500</span>'+
        '<span style="--x:66.667%">600</span>'+
        '<span style="--x:100%">700 nm</span>'+
      '</div>';
    return ruler;
  }

  function ensureOpticsInstrument(){
    const optics=document.querySelector('.p6-optics');
    if(!optics) return;
    optics.classList.add('award-optics-a2');

    let ruler=optics.querySelector(':scope > .award-spectrum-ruler');
    if(!ruler){
      ruler=createSpectrumRuler();
      const intro=optics.querySelector(':scope > .p6-optics-intro');
      if(intro) intro.after(ruler);
      else optics.prepend(ruler);
    }
    const value=ruler.querySelector('[data-award-spectrum-value]');
    if(value) value.textContent=Math.round(currentWavelength())+' nm';

    const spectra=[...optics.querySelectorAll('.p6-optics-plots > .p6-spectrum')];
    for(const card of spectra){
      const title=card.querySelector('h4')?.textContent||'';
      card.classList.toggle('award-spectrum-primary',/Rrs/.test(title));
      card.classList.toggle('award-spectrum-support',!/Rrs/.test(title));
    }
  }

  function createRtGeometry(){
    const aside=document.createElement('aside');
    aside.className='award-rt-geometry';
    aside.setAttribute('aria-label','Current reference selection geometry. This is a control summary, not a radiance field or photon path.');
    aside.innerHTML=
      '<div class="award-rt-geometry-head">'+
        '<span>SELECTION GEOMETRY</span><strong>NOT A RADIANCE FIELD</strong>'+
      '</div>'+
      '<div class="award-rt-diagram" aria-hidden="true">'+
        '<div class="award-rt-surface"><span>0−</span></div>'+
        '<div class="award-rt-sun"><i></i><span data-award-rt-sun>θs —</span></div>'+
        '<div class="award-rt-depth"><i></i><span data-award-rt-depth>z —</span></div>'+
        '<div class="award-rt-wavelength"><i></i><span data-award-rt-wavelength>λ —</span></div>'+
        '<span class="award-rt-axis-label">DEPTH ↓</span>'+
      '</div>';
    return aside;
  }

  function ensureRtGeometry(){
    const hero=document.querySelector('.rt-science-hero');
    if(!hero) return;
    let copy=hero.querySelector(':scope > .award-rt-copy');
    if(!copy){
      copy=document.createElement('div');
      copy.className='award-rt-copy';
      const content=[...hero.children].filter(node=>!node.classList.contains('award-rt-geometry'));
      content.forEach(node=>copy.appendChild(node));
      hero.prepend(copy);
    }

    let geometry=hero.querySelector(':scope > .award-rt-geometry');
    if(!geometry){
      geometry=createRtGeometry();
      hero.appendChild(geometry);
    }

    const nm=currentWavelength();
    const depth=currentDepth();
    const sun=currentSun();
    const sunNode=geometry.querySelector('[data-award-rt-sun]');
    const depthNode=geometry.querySelector('[data-award-rt-depth]');
    const wavelengthNode=geometry.querySelector('[data-award-rt-wavelength]');
    if(sunNode) sunNode.textContent='θs '+sun+'°';
    if(depthNode) depthNode.textContent='z '+depth+' m';
    if(wavelengthNode) wavelengthNode.textContent='λ '+nm+' nm';
  }

  function reconcile(){
    reconcileFrame=0;
    ensureAmbientField();
    setVisualVariables();
    ensureOpticsInstrument();
    ensureRtGeometry();
  }

  function scheduleReconcile(){
    if(reconcileFrame) return;
    reconcileFrame=requestAnimationFrame(reconcile);
  }

  const observer=new MutationObserver(scheduleReconcile);

  function start(){
    reconcile();
    observer.observe(document.body,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['aria-pressed','aria-selected']
    });
    document.addEventListener('input',event=>{
      if(event.target?.id==='probeRange') scheduleReconcile();
    },{passive:true});
    document.addEventListener('change',scheduleReconcile,{passive:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
