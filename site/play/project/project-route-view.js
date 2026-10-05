(() => {
  'use strict';

  function create({ shell, d3, world, experiment, morph } = {}) {
    if (!shell?.viewport || !d3 || !world || !experiment || !morph) throw new Error('Project route view requires shell, D3, world data, experiment, and morph engine.');

    shell.viewport.innerHTML=`<div class="project-v2-stage"><svg class="project-v2-map" viewBox="0 0 1000 640" role="application" aria-label="Route projection experiment"></svg></div>`;
    const svg=d3.select(shell.viewport.querySelector('.project-v2-map'));
    const sphere=svg.append('path').datum({type:'Sphere'}).attr('class','project-v2-sphere');
    const graticule=svg.append('path').datum(d3.geoGraticule10()).attr('class','project-v2-graticule');
    const land=svg.append('path').datum(world.land).attr('class','project-v2-land');
    const judgment=svg.append('path').attr('class','project-v2-route-judgment');
    const geodesicSamples=d3.range(0,1.001,.02).map(t=>d3.geoInterpolate(experiment.start.coord,experiment.target.coord)(t));
    const geodesicData={type:'LineString',coordinates:geodesicSamples};
    const geodesic=svg.append('path').datum(geodesicData).attr('class','project-v2-geodesic').attr('opacity',0);
    const pointLayer=svg.append('g').attr('class','project-v2-route-points');
    const hit=svg.append('rect').attr('class','project-v2-route-hit').attr('width',1000).attr('height',640).attr('tabindex',0).attr('role','application').attr('aria-label','Route drawing field. Draw with pointer, or use arrow keys to bend a keyboard route and Enter to reveal.');

    let routeCoords=[];
    let drawing=false;
    let mode='drawing';
    let value=0;
    let revealButton=null;
    let finishButton=null;
    let progress=null;
    let onRevealCurrent=null;
    let keyboardOffset=[0,-100];

    const routeData=()=>routeCoords.length>1?{type:'LineString',coordinates:routeCoords}:null;

    function drawPoints() {
      const points=[experiment.start,experiment.target];
      const joined=pointLayer.selectAll('g.project-v2-route-point').data(points,d=>d.id).join(enter=>{
        const g=enter.append('g').attr('class','project-v2-route-point');
        g.append('circle').attr('r',7);
        g.append('text').attr('class','project-v2-route-label').attr('x',11).attr('y',-10);
        return g;
      });
      joined.attr('transform',d=>{
        const p=morph.projection(d.coord);
        return p?`translate(${p[0]},${p[1]})`:'translate(-999,-999)';
      });
      joined.select('text').text(d=>d.label);
    }

    function renderProjection(next) {
      value=morph.set(next);
      const path=morph.path;
      sphere.attr('d',path);
      graticule.attr('d',path);
      land.attr('d',path);
      const route=routeData();
      judgment.attr('d',route?path(route):null);
      geodesic.attr('d',path);
      drawPoints();
      shell.setStatus(value<.5?experiment.from.label:experiment.to.label);
      if(progress) progress.textContent=`${Math.round(value*100)}%`;
      if(finishButton) finishButton.disabled=value<.98;
      return value;
    }

    function button(label,onClick,{secondary=false,disabled=false}={}) {
      const node=document.createElement('button');
      node.type='button';
      node.className=`project-v2-action${secondary?' is-secondary':''}`;
      node.textContent=label;
      node.disabled=disabled;
      node.addEventListener('click',onClick);
      return node;
    }

    function setHud() {
      shell.hud.innerHTML=`<div class="project-v2-hud-item"><span>EXPERIMENT</span><strong>ROUTE</strong></div><div class="project-v2-hud-item"><span>RELATION</span><strong>SHORTEST ON SPHERE</strong></div>`;
    }

    function updateRevealState() {
      if(revealButton) revealButton.disabled=routeCoords.length<3;
    }

    function resetRoute() {
      routeCoords=[];
      judgment.attr('d',null);
      keyboardOffset=[0,-100];
      updateRevealState();
    }

    function buildKeyboardRoute() {
      renderProjection(0);
      const a=morph.projection(experiment.start.coord);
      const b=morph.projection(experiment.target.coord);
      if(!a || !b) return;
      const c=[(a[0]+b[0])/2+keyboardOffset[0],(a[1]+b[1])/2+keyboardOffset[1]];
      const coords=[];
      for(let i=0;i<=24;i++) {
        const t=i/24, u=1-t;
        const p=[u*u*a[0]+2*u*t*c[0]+t*t*b[0],u*u*a[1]+2*u*t*c[1]+t*t*b[1]];
        const geo=morph.projection.invert(p);
        if(geo) coords.push(geo);
      }
      if(coords.length>=3) {
        coords[0]=experiment.start.coord;
        coords[coords.length-1]=experiment.target.coord;
        routeCoords=coords;
        renderProjection(0);
        updateRevealState();
      }
    }

    hit.on('pointerdown',event=>{
      if(mode!=='drawing') return;
      drawing=true;
      routeCoords=[experiment.start.coord];
      hit.node().setPointerCapture?.(event.pointerId);
    }).on('pointermove',event=>{
      if(!drawing || mode!=='drawing') return;
      const p=d3.pointer(event,svg.node());
      const geo=morph.projection.invert(p);
      if(geo) routeCoords.push(geo);
      renderProjection(0);
      updateRevealState();
    }).on('pointerup pointercancel',event=>{
      if(!drawing) return;
      drawing=false;
      routeCoords.push(experiment.target.coord);
      hit.node().releasePointerCapture?.(event.pointerId);
      renderProjection(0);
      updateRevealState();
    }).on('keydown',event=>{
      if(mode!=='drawing') return;
      const step=event.shiftKey?45:20;
      if(event.key==='ArrowUp') keyboardOffset[1]-=step;
      else if(event.key==='ArrowDown') keyboardOffset[1]+=step;
      else if(event.key==='ArrowLeft') keyboardOffset[0]-=step;
      else if(event.key==='ArrowRight') keyboardOffset[0]+=step;
      else if(event.key==='Enter') {
        if(routeCoords.length>=3) {
          event.preventDefault();
          onRevealCurrent?.();
        }
        return;
      } else return;
      event.preventDefault();
      buildKeyboardRoute();
    });

    function addScrubber(panel,{onInput,onFinish,showFinish=true}={}) {
      const control=document.createElement('div');
      control.className='project-v2-scrub-control';
      control.innerHTML=`<div class="project-v2-scrub-labels"><span>${experiment.from.label}</span><strong class="project-v2-progress">${Math.round(value*100)}%</strong><span>${experiment.to.label}</span></div>`;
      const slider=document.createElement('input');
      slider.type='range';
      slider.min='0';
      slider.max='100';
      slider.step='1';
      slider.value=String(Math.round(value*100));
      slider.className='project-v2-scrubber project-v2-route-scrubber';
      slider.setAttribute('aria-label','Route projection transformation from Mercator to azimuthal equidistant');
      slider.addEventListener('input',()=>{
        const next=Number(slider.value)/100;
        renderProjection(next);
        onInput?.(next);
      });
      control.appendChild(slider);
      progress=control.querySelector('.project-v2-progress');
      panel.appendChild(control);
      if(showFinish) {
        finishButton=button('FINISH',()=>onFinish?.(),{disabled:value<.98});
        panel.appendChild(finishButton);
      }
    }

    function showDraw({onReveal}={}) {
      mode='drawing';
      value=0;
      revealButton=null; finishButton=null; progress=null;
      onRevealCurrent=onReveal;
      geodesic.attr('opacity',0);
      judgment.classed('is-ghost',false);
      resetRoute();
      shell.setState('routeDrawing');
      setHud();
      renderProjection(0);
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='project-v2-panel';
      panel.innerHTML=`<span>ROUTE</span><h2>${experiment.start.label} → ${experiment.target.label}</h2><p>${experiment.question}. Draw with pointer, or use arrow keys to bend a route.</p>`;
      const actions=document.createElement('div');
      actions.className='project-v2-actions';
      actions.appendChild(button('RESET',resetRoute,{secondary:true}));
      revealButton=button('REVEAL GEODESIC',()=>onReveal?.(),{disabled:true});
      actions.appendChild(revealButton);
      panel.appendChild(actions);
      shell.overlay.appendChild(panel);
      hit.node()?.focus();
    }

    function showReveal({onInput,onFinish}={}) {
      mode='transforming';
      value=0;
      revealButton=null; finishButton=null; progress=null;
      geodesic.attr('opacity',1);
      judgment.classed('is-ghost',true);
      shell.setState('routeTransforming');
      renderProjection(0);
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='project-v2-panel';
      panel.innerHTML='<span>GEODESIC</span><h2>THE SHORTEST SURFACE ROUTE</h2><p>Now change the representation. Watch the same geodesic change appearance.</p>';
      addScrubber(panel,{onInput,onFinish,showFinish:true});
      shell.overlay.appendChild(panel);
    }

    function showResult({onInput,onRestart}={}) {
      mode='result';
      finishButton=null; progress=null;
      shell.setState('routeResult');
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='project-v2-panel is-result';
      panel.innerHTML=`<span>RESULT</span><div class="project-v2-route-result">${experiment.insight[0]}<small>${experiment.insight[1]}</small></div><p>The geodesic stayed fixed on the globe while its projected shape changed.</p>`;
      addScrubber(panel,{onInput,showFinish:false});
      panel.appendChild(button('DRAW AGAIN',onRestart,{secondary:true}));
      shell.overlay.appendChild(panel);
      renderProjection(value);
    }

    renderProjection(0);
    return {
      showDraw,
      showReveal,
      showResult,
      renderProjection,
      getRoute:()=>routeCoords.map(coord=>[...coord]),
      get value(){return value;}
    };
  }

  window.GeoPlayProjectRouteView={create};
})();