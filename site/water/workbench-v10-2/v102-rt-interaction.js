/**
 * WATER RT V10.2 — discrete scientific chart interaction.
 *
 * The RT reference remains a fixed archived grid. This layer never interpolates
 * or solves new values. Pointer/keyboard interaction only inspects existing SVG
 * nodes and, for depth/wavelength axes, activates the existing discrete controls.
 */
(()=>{
  'use strict';

  const main=document.getElementById('mainContent');
  if(!main)return;

  const SELECTOR='svg.rt-science-plot';
  const NUMBER='([+-]?(?:\\d+(?:\\.\\d+)?|\\.\\d+))';
  const NODE_RE=new RegExp('\\bat\\s+'+NUMBER+'\\s+(m|nm|\\|μ\\|):','i');
  let readoutSerial=0;
  let pendingFocus=null;
  let lastDirection=null;

  const finite=value=>Number.isFinite(value);
  const nearly=(a,b)=>Math.abs(a-b)<=1e-8*Math.max(1,Math.abs(a),Math.abs(b));

  function parseCircle(circle){
    const title=circle.querySelector('title')?.textContent?.trim()||'';
    const match=title.match(NODE_RE);
    if(!match)return null;
    const value=Number(match[1]);
    if(!finite(value))return null;
    const unit=match[2];
    const axis=unit==='m'?'depth':unit==='nm'?'wavelength':'direction';
    return {
      circle,
      title,
      value,
      unit,
      axis,
      cx:Number(circle.getAttribute('cx')),
      cy:Number(circle.getAttribute('cy'))
    };
  }

  function model(svg){
    const nodes=[...svg.querySelectorAll('circle')].map(parseCircle).filter(Boolean);
    if(!nodes.length)return null;
    const axis=nodes[0].axis;
    if(nodes.some(node=>node.axis!==axis))return null;

    const groups=[];
    for(const node of nodes){
      let group=groups.find(item=>nearly(item.value,node.value));
      if(!group){
        group={value:node.value,unit:node.unit,axis,nodes:[]};
        groups.push(group);
      }
      group.nodes.push(node);
    }
    groups.sort((a,b)=>a.value-b.value);
    return {axis,groups};
  }

  function currentValue(axis){
    if(axis==='depth'){
      return Number(document.querySelector('[data-rt-depth][aria-pressed="true"]')?.dataset.rtDepth);
    }
    if(axis==='wavelength'){
      return Number(document.querySelector('[data-rt-wl][aria-pressed="true"]')?.dataset.rtWl);
    }
    return lastDirection;
  }

  function currentGroup(data){
    const value=currentValue(data.axis);
    if(!finite(value))return data.groups[0];
    return data.groups.reduce((best,group)=>
      Math.abs(group.value-value)<Math.abs(best.value-value)?group:best,data.groups[0]);
  }

  function ensureReadout(svg,data){
    let node=svg.parentElement?.querySelector(':scope > [data-rt-chart-readout]');
    if(node)return node;

    node=document.createElement('div');
    node.className='rt-chart-readout';
    node.dataset.rtChartReadout='1';
    node.id='rt-chart-readout-'+(++readoutSerial);
    node.setAttribute('role','status');
    node.setAttribute('aria-live','polite');
    node.setAttribute('aria-atomic','true');
    svg.insertAdjacentElement('afterend',node);
    svg.setAttribute('aria-describedby',node.id);
    return node;
  }

  function labelFor(group){
    if(group.axis==='depth')return group.value+' m';
    if(group.axis==='wavelength')return group.value+' nm';
    return '|μ| '+Number(group.value).toFixed(4);
  }

  function show(svg,data,group,{announce=true}={}){
    if(!group)return;
    for(const item of data.groups){
      const on=item===group;
      for(const node of item.nodes)node.circle.classList.toggle('is-inspected',on);
    }
    const readout=ensureReadout(svg,data);
    readout.replaceChildren();

    const key=document.createElement('strong');
    key.textContent=labelFor(group);
    readout.appendChild(key);

    const values=document.createElement('span');
    values.className='rt-chart-readout-values';
    for(const node of group.nodes){
      const value=document.createElement('span');
      value.textContent=node.title;
      values.appendChild(value);
    }
    readout.appendChild(values);
    if(!announce)readout.setAttribute('aria-live','off');
    else readout.setAttribute('aria-live','polite');
  }

  function localPoint(svg,event){
    const matrix=svg.getScreenCTM?.();
    if(matrix&&svg.createSVGPoint){
      const point=svg.createSVGPoint();
      point.x=event.clientX;
      point.y=event.clientY;
      return point.matrixTransform(matrix.inverse());
    }
    const rect=svg.getBoundingClientRect();
    const box=svg.viewBox?.baseVal;
    if(!box||!rect.width||!rect.height)return {x:0,y:0};
    return {
      x:box.x+(event.clientX-rect.left)/rect.width*box.width,
      y:box.y+(event.clientY-rect.top)/rect.height*box.height
    };
  }

  function nearest(data,point){
    const coordinate=data.axis==='depth'?'cy':'cx';
    const target=data.axis==='depth'?point.y:point.x;
    return data.groups.reduce((best,group)=>{
      const sample=group.nodes[0][coordinate];
      const bestSample=best.nodes[0][coordinate];
      return Math.abs(sample-target)<Math.abs(bestSample-target)?group:best;
    },data.groups[0]);
  }

  function clickExistingControl(group){
    const attr=group.axis==='depth'?'rtDepth':group.axis==='wavelength'?'rtWl':null;
    if(!attr)return false;
    const selector=group.axis==='depth'?'[data-rt-depth]':'[data-rt-wl]';
    const button=[...document.querySelectorAll(selector)].find(node=>
      nearly(Number(node.dataset[attr]),group.value));
    if(!button)return false;
    button.click();
    return true;
  }

  function activate(svg,data,group){
    if(data.axis==='direction'){
      lastDirection=group.value;
      show(svg,data,group);
      return;
    }
    pendingFocus=[...main.querySelectorAll(SELECTOR)].indexOf(svg);
    if(!clickExistingControl(group))show(svg,data,group);
  }

  function keyboard(svg,data,event){
    const keys=['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home','End'];
    if(!keys.includes(event.key))return;
    const active=currentGroup(data);
    let index=Math.max(0,data.groups.indexOf(active));
    if(event.key==='Home')index=0;
    else if(event.key==='End')index=data.groups.length-1;
    else if(event.key==='ArrowRight'||event.key==='ArrowDown')index=Math.min(data.groups.length-1,index+1);
    else index=Math.max(0,index-1);
    event.preventDefault();
    activate(svg,data,data.groups[index]);
  }

  function bind(svg){
    if(svg.dataset.rtInteractive)return;
    const data=model(svg);
    if(!data)return;

    svg.dataset.rtInteractive=data.axis;
    svg.tabIndex=0;
    svg.setAttribute('aria-keyshortcuts','ArrowLeft ArrowRight ArrowUp ArrowDown Home End');
    const original=svg.getAttribute('aria-label')||'WATER RT chart';
    svg.setAttribute('aria-label',original+' Interactive discrete nodes: use pointer or arrow keys to inspect; Home and End jump to the first or last node.');

    show(svg,data,currentGroup(data),{announce:false});

    svg.addEventListener('pointermove',event=>{
      if(event.pointerType==='touch')return;
      show(svg,data,nearest(data,localPoint(svg,event)),{announce:false});
    });
    svg.addEventListener('pointerleave',()=>{
      show(svg,data,currentGroup(data),{announce:false});
    });
    svg.addEventListener('click',event=>{
      activate(svg,data,nearest(data,localPoint(svg,event)));
    });
    svg.addEventListener('keydown',event=>keyboard(svg,data,event));
    svg.addEventListener('focus',()=>show(svg,data,currentGroup(data),{announce:false}));
  }

  function refresh(){
    const svgs=[...main.querySelectorAll(SELECTOR)];
    for(const svg of svgs)bind(svg);
    if(pendingFocus!==null&&svgs[pendingFocus]){
      const target=svgs[pendingFocus];
      pendingFocus=null;
      requestAnimationFrame(()=>target.focus({preventScroll:true}));
    }
  }

  new MutationObserver(records=>{
    if(records.some(record=>record.type==='childList'))refresh();
  }).observe(main,{childList:true,subtree:true});

  refresh();
})();
