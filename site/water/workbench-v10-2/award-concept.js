/* Water as Spectrum — award concept A1
 * Presentation-only enhancement. Reads existing DOM state and exposes visual
 * CSS variables. It does not write model parameters or dispatch model actions.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.waterAwardConcept==='a1') return;
  root.dataset.waterAwardConcept='a1';

  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)');
  let frame=0;

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

  function currentWavelength(){
    const rt=document.querySelector('[data-rt-wl][aria-pressed="true"]');
    if(rt){
      const n=Number(rt.dataset.rtWl);
      if(Number.isFinite(n)) return n;
    }
    const probe=document.getElementById('probeValue');
    const match=probe?.textContent?.match(/(\d+(?:\.\d+)?)\s*nm/i);
    return match?Number(match[1]):490;
  }

  function updateDepth(){
    const buttons=[...document.querySelectorAll('[data-rt-depth]')];
    if(!buttons.length) return;
    const values=buttons.map(button=>Number(button.dataset.rtDepth)).filter(Number.isFinite);
    const selected=buttons.find(button=>button.getAttribute('aria-pressed')==='true');
    const depth=Number(selected?.dataset.rtDepth);
    if(!values.length||!Number.isFinite(depth)) return;
    const min=Math.min(...values),max=Math.max(...values);
    const t=max===min?0:(depth-min)/(max-min);
    root.style.setProperty('--water-depth-y',(30+t*52).toFixed(2)+'%');
  }

  function updateVisualState(){
    const nm=currentWavelength();
    const [r,g,b]=wavelengthToRgb(nm);
    root.style.setProperty('--water-spectrum-rgb',r+','+g+','+b);
    root.dataset.waterSpectralBand=nm<470?'violet-blue':nm<530?'cyan-green':nm<590?'green-yellow':nm<645?'orange':'red';
    const active=document.querySelector('.tab[aria-selected="true"]');
    if(active?.dataset?.tab) root.dataset.waterWorkspace=active.dataset.tab;
    else if(active?.dataset?.workspace) root.dataset.waterWorkspace=active.dataset.workspace;
    updateDepth();
  }

  function ensureField(){
    const main=document.querySelector('.main-space');
    if(!main||main.querySelector(':scope > .award-water-field')) return;
    const field=document.createElement('div');
    field.className='award-water-field';
    field.setAttribute('aria-hidden','true');
    main.prepend(field);

    main.addEventListener('pointermove',event=>{
      if(reduced?.matches) return;
      if(frame) cancelAnimationFrame(frame);
      frame=requestAnimationFrame(()=>{
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

  const observer=new MutationObserver(()=>{
    ensureField();
    updateVisualState();
  });

  function start(){
    ensureField();
    updateVisualState();
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-pressed','aria-selected'],characterData:true});
    document.addEventListener('input',event=>{
      if(event.target?.id==='probeRange') updateVisualState();
    },{passive:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();
