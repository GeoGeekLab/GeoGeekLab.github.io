/* Water V10.2 / A11 attention switch.
 * One workbench, one scientific state. This changes display density only.
 * Native buttons expose the two presentation modes to keyboard and AT users.
 */
(() => {
  'use strict';
  const root=document.documentElement;
  if(root.dataset.waterAttentionInstalled==='a11') return;
  root.dataset.waterAttentionInstalled='a11';
  root.dataset.waterAttention='focus';
  const allowed=new Set(['focus','detail']);

  function syncButtons(group) {
    const mode=root.dataset.waterAttention;
    for(const button of group.querySelectorAll('button[data-attention-mode]')){
      button.setAttribute('aria-pressed',String(button.dataset.attentionMode===mode));
    }
  }

  function setMode(next,group) {
    if(!allowed.has(next)) return;
    root.dataset.waterAttention=next;
    syncButtons(group);
  }

  function installSwitch() {
    const strip=document.querySelector('.water-scope-strip');
    if(!strip) return false;
    if(strip.querySelector('.water-attention-switch')) return true;

    const group=document.createElement('div');
    group.className='water-attention-switch';
    group.setAttribute('role','group');
    group.setAttribute('aria-label','Information density. Focus puts charts first; full detail shows the complete reference layout.');
    group.innerHTML=
      '<span class="water-attention-label" aria-hidden="true">VIEW</span>'+
      '<button type="button" data-attention-mode="focus" aria-pressed="true" title="Show the chart first">Focus</button>'+
      '<button type="button" data-attention-mode="detail" aria-pressed="false" title="Show complete scientific context">Full detail</button>';
    group.addEventListener('click',event=>{
      const button=event.target.closest('button[data-attention-mode]');
      if(button&&group.contains(button)) setMode(button.dataset.attentionMode,group);
    });
    strip.insertBefore(group,strip.querySelector('.water-scope-more'));
    syncButtons(group);
    return true;
  }


  // A12: explicit, keyboard-accessible navigation replaces decorative edge masks.
  // Tabs, selected workspace, and the scientific application remain unchanged.
  function installNavControls() {
    const nav=document.querySelector('.appnav');
    const scroller=nav?.querySelector('#mainNav.nav-scroll');
    if(!scroller || nav.querySelector('.water-nav-controls')) return;
    const controls=document.createElement('div');
    controls.className='water-nav-controls';
    controls.setAttribute('role','group');
    controls.setAttribute('aria-label','Navigate nine analysis workspaces');
    controls.innerHTML=
      '<button type="button" class="water-nav-arrow" data-water-nav-prev aria-label="Previous workspaces" title="Previous workspaces">‹</button>'+
      '<span class="water-nav-position" aria-hidden="true"></span>'+
      '<button type="button" class="water-nav-arrow" data-water-nav-next aria-label="Next workspaces" title="Next workspaces">›</button>';
    nav.appendChild(controls);
    const prev=controls.querySelector('[data-water-nav-prev]');
    const next=controls.querySelector('[data-water-nav-next]');
    const position=controls.querySelector('.water-nav-position');
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation=0;
    const update=()=>{
      animation=0;
      const max=Math.max(0,scroller.scrollWidth-scroller.clientWidth);
      controls.hidden=max<3;
      prev.disabled=scroller.scrollLeft<=2;
      next.disabled=scroller.scrollLeft>=max-2;
      const tabs=[...scroller.querySelectorAll('[role="tab"][data-tab]')];
      const index=tabs.findIndex(tab=>tab.getAttribute('aria-selected')==='true');
      position.textContent=String(Math.max(0,index+1)).padStart(2,'0')+
        ' / '+String(tabs.length).padStart(2,'0');
    };
    const schedule=()=>{
      if(animation) return;
      animation=requestAnimationFrame(update);
    };
    const move=direction=>{
      scroller.scrollBy({
        left:direction*Math.max(180,scroller.clientWidth*.65),
        behavior:reduce.matches?'instant':'smooth'
      });
    };
    prev.addEventListener('click',()=>move(-1));
    next.addEventListener('click',()=>move(1));
    const reveal=target=>{
      const tab=target?.closest?.('[role="tab"][data-tab]');
      if(!tab || !scroller.contains(tab)) return;
      requestAnimationFrame(()=>{
        const box=tab.getBoundingClientRect();
        const edge=scroller.getBoundingClientRect();
        const delta=box.left-edge.left-(edge.width-box.width)/2;
        if(Math.abs(delta)>8) scroller.scrollBy({left:delta,behavior:reduce.matches?'instant':'smooth'});
      });
    };
    scroller.addEventListener('click',event=>reveal(event.target));
    scroller.addEventListener('focusin',event=>reveal(event.target));
    scroller.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    new MutationObserver(schedule).observe(scroller,{
      childList:true,subtree:true,attributes:true,attributeFilter:['aria-selected']
    });
    if('ResizeObserver' in window) new ResizeObserver(schedule).observe(scroller);
    schedule();
  }

  function start() {
    installNavControls();
    if(installSwitch()) return;
    const observer=new MutationObserver(()=>{
      if(installSwitch()) observer.disconnect();
    });
    observer.observe(document.body,{subtree:true,childList:true});
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',start,{once:true});
  }else{
    start();
  }
})();
