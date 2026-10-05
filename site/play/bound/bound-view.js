(() => {
  'use strict';

  function create({ shell, fieldApi, callbacks = {}, size = 640 } = {}) {
    if(!shell?.viewport || !fieldApi) throw new Error('Bound view requires shell and field API.');

    shell.viewport.innerHTML=`<div class="bound-v2-stage"><canvas class="bound-v2-field" width="${size}" height="${size}"></canvas><canvas class="bound-v2-change" width="${size}" height="${size}" aria-hidden="true"></canvas><svg class="bound-v2-overlay" viewBox="0 0 ${size} ${size}" role="application" aria-label="Boundary drawing field. Draw with pointer. For keyboard use guided region, arrow keys to move it, plus or minus to resize it."><path class="bound-v2-old-line"></path><path class="bound-v2-line"></path><rect class="bound-v2-hit" width="${size}" height="${size}" tabindex="0"></rect></svg></div>`;
    const stage=shell.viewport.querySelector('.bound-v2-stage');
    const canvas=shell.viewport.querySelector('.bound-v2-field');
    const changeCanvas=shell.viewport.querySelector('.bound-v2-change');
    const svg=shell.viewport.querySelector('.bound-v2-overlay');
    const hit=svg.querySelector('.bound-v2-hit');
    const line=svg.querySelector('.bound-v2-line');
    const oldLine=svg.querySelector('.bound-v2-old-line');
    const ctx=canvas.getContext('2d');
    const changeCtx=changeCanvas.getContext('2d');
    let boundary=[];
    let oldBoundary=[];
    let drawing=false;
    let enabled=true;

    function polygonPath(points) {
      if(!points?.length) return '';
      const coords=points.map(([x,y])=>[x*size,y*size]);
      return `M${coords.map(([x,y])=>`${x.toFixed(1)},${y.toFixed(1)}`).join(' L')} Z`;
    }

    function setBoundary(points,{old=false,emit=false}={}) {
      const next=(points||[]).map(([x,y])=>[fieldApi.clamp(x),fieldApi.clamp(y)]);
      if(old) {
        oldBoundary=next;
        oldLine.setAttribute('d',polygonPath(oldBoundary));
      } else {
        boundary=next;
        line.setAttribute('d',polygonPath(boundary));
        if(emit) callbacks.onBoundary?.(boundary.map(point=>[...point]));
      }
    }

    function clearBoundary({keepOld=false}={}) {
      boundary=[];
      line.setAttribute('d','');
      if(!keepOld) {
        oldBoundary=[];
        oldLine.setAttribute('d','');
      }
      callbacks.onBoundary?.([]);
    }

    function canvasPoint(event) {
      const rect=svg.getBoundingClientRect();
      const x=(event.clientX-rect.left)/rect.width;
      const y=(event.clientY-rect.top)/rect.height;
      return [fieldApi.clamp(x),fieldApi.clamp(y)];
    }

    function appendPoint(point) {
      const previous=boundary.at(-1);
      if(previous) {
        const dx=(point[0]-previous[0])*size;
        const dy=(point[1]-previous[1])*size;
        if(Math.hypot(dx,dy)<3) return;
      }
      boundary.push(point);
      line.setAttribute('d',polygonPath(boundary));
    }

    hit.addEventListener('pointerdown',event=>{
      if(!enabled) return;
      drawing=true;
      boundary=[];
      appendPoint(canvasPoint(event));
      hit.setPointerCapture?.(event.pointerId);
    });
    hit.addEventListener('pointermove',event=>{
      if(!enabled||!drawing) return;
      appendPoint(canvasPoint(event));
    });
    const finishPointer=event=>{
      if(!drawing) return;
      drawing=false;
      hit.releasePointerCapture?.(event.pointerId);
      if(boundary.length<3) {
        clearBoundary({keepOld:true});
        return;
      }
      line.setAttribute('d',polygonPath(boundary));
      callbacks.onBoundary?.(boundary.map(point=>[...point]));
    };
    hit.addEventListener('pointerup',finishPointer);
    hit.addEventListener('pointercancel',finishPointer);
    hit.addEventListener('keydown',event=>{
      if(!enabled) return;
      const step=event.shiftKey?.035:.018;
      if(event.key.toLowerCase()==='g') {
        event.preventDefault();
        callbacks.onGuided?.();
        return;
      }
      if(event.key==='ArrowLeft') callbacks.onNudge?.({dx:-step,dy:0,scale:1});
      else if(event.key==='ArrowRight') callbacks.onNudge?.({dx:step,dy:0,scale:1});
      else if(event.key==='ArrowUp') callbacks.onNudge?.({dx:0,dy:-step,scale:1});
      else if(event.key==='ArrowDown') callbacks.onNudge?.({dx:0,dy:step,scale:1});
      else if(event.key==='+'||event.key==='=') callbacks.onNudge?.({dx:0,dy:0,scale:1.06});
      else if(event.key==='-'||event.key==='_') callbacks.onNudge?.({dx:0,dy:0,scale:.94});
      else return;
      event.preventDefault();
    });

    function renderGrid(grid) {
      const n=grid.n;
      const image=ctx.createImageData(n,n);
      for(let i=0;i<n*n;i++) {
        const risk=grid.risk[i];
        const pop=grid.population[i];
        const r=Math.round(15+risk*150+pop*28);
        const g=Math.round(22+risk*75+pop*38);
        const b=Math.round(19+risk*42+pop*28);
        image.data[i*4]=Math.min(255,r);
        image.data[i*4+1]=Math.min(255,g);
        image.data[i*4+2]=Math.min(255,b);
        image.data[i*4+3]=255;
      }
      const off=document.createElement('canvas');
      off.width=n;off.height=n;
      off.getContext('2d').putImageData(image,0,0);
      ctx.clearRect(0,0,size,size);
      ctx.imageSmoothingEnabled=true;
      ctx.drawImage(off,0,0,size,size);
    }

    function showChangeMask(change) {
      if(!change?.mask) return;
      const n=change.size;
      const image=changeCtx.createImageData(n,n);
      for(let i=0;i<n*n;i++) {
        if(change.mask[i]) {
          image.data[i*4]=224;
          image.data[i*4+1]=107;
          image.data[i*4+2]=63;
          image.data[i*4+3]=88;
        }
      }
      const off=document.createElement('canvas');
      off.width=n;off.height=n;
      off.getContext('2d').putImageData(image,0,0);
      changeCtx.clearRect(0,0,size,size);
      changeCtx.imageSmoothingEnabled=true;
      changeCtx.drawImage(off,0,0,size,size);
      changeCanvas.classList.add('is-visible');
    }

    function clearChangeMask() {
      changeCanvas.classList.remove('is-visible');
      changeCtx.clearRect(0,0,size,size);
    }

    function setDrawing(next) {
      enabled=Boolean(next);
      hit.setAttribute('tabindex',enabled?'0':'-1');
      hit.setAttribute('aria-disabled',enabled?'false':'true');
      hit.style.pointerEvents=enabled?'auto':'none';
    }

    function setDisturbing(next) {
      stage.classList.toggle('is-disturbing',Boolean(next));
    }

    function focus() { try{hit.focus({preventScroll:true});}catch(_){hit.focus();} }

    return {
      renderGrid,
      showChangeMask,
      clearChangeMask,
      setBoundary,
      clearBoundary,
      setDrawing,
      setDisturbing,
      focus,
      getBoundary:()=>boundary.map(point=>[...point]),
      getOldBoundary:()=>oldBoundary.map(point=>[...point])
    };
  }

  window.GeoPlayBoundView={create};
})();