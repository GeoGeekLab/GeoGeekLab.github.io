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

  function start() {
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
