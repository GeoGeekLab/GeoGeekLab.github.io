(() => {
  'use strict';

  const SVG_NS='http://www.w3.org/2000/svg';
  const fmtKm=v=>v>=100?Math.round(v).toLocaleString():v.toFixed(1);
  const fmtM=v=>v>=100?Math.round(v).toLocaleString():v.toFixed(1);
  const fmtRatio=v=>`${v.toFixed(2)}×`;
  const pct=(before,after)=>((after/before-1)*100);

  const SURFACE=Object.freeze({
    centerX:500,
    vertexY:455,
    curvature:0.00042
  });

  function surfaceY(x){
    return SURFACE.vertexY+SURFACE.curvature*(x-SURFACE.centerX)**2;
  }

  function surfacePath(x0,x1,steps=24){
    const points=[];
    for(let i=0;i<=steps;i++){
      const x=x0+(x1-x0)*(i/steps);
      points.push(`${i?'L':'M'}${x.toFixed(2)},${surfaceY(x).toFixed(2)}`);
    }
    return points.join(' ');
  }

  function create({shell,content,physics,callbacks}={}) {
    if(!shell?.viewport) throw new Error('SWATH view requires a V2 shell.');
    if(!content||!physics) throw new Error('SWATH view requires content and physics.');

    shell.viewport.innerHTML=`
      <div class="swath-stage">
        <section class="swath-geometry" aria-label="Satellite swath geometry">
          <svg class="swath-svg" viewBox="0 0 1000 620" preserveAspectRatio="xMidYMid meet" role="img">
            <defs>
              <linearGradient id="swathBeam" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="rgba(224,107,63,.04)"/>
                <stop offset="1" stop-color="rgba(224,107,63,.24)"/>
              </linearGradient>
            </defs>
            <path class="swath-earth"></path>
            <path class="swath-earth-line"></path>
            <g class="swath-before-geometry" aria-hidden="true">
              <path class="swath-before-beam"></path>
              <line class="swath-before-left"/>
              <line class="swath-before-right"/>
              <path class="swath-before-footprint"></path>
            </g>
            <path class="swath-beam"></path>
            <line class="swath-ray swath-ray-left"></line>
            <line class="swath-ray swath-ray-nadir"></line>
            <line class="swath-ray swath-ray-right"></line>
            <g class="swath-satellite" transform="translate(500 120)" aria-hidden="true">
              <rect x="-31" y="-13" width="62" height="26" rx="5"></rect>
              <rect x="-90" y="-8" width="50" height="16" rx="2"></rect>
              <rect x="40" y="-8" width="50" height="16" rx="2"></rect>
              <line x1="-40" y1="0" x2="-31" y2="0"></line>
              <line x1="31" y1="0" x2="40" y2="0"></line>
            </g>
            <path class="swath-footprint"></path>
            <g class="swath-pixels"></g>
            <text class="swath-label swath-width-label" x="500" y="548" text-anchor="middle">GROUND SWATH</text>
            <text class="swath-label swath-sample-label" x="500" y="572" text-anchor="middle">REPRESENTATIVE GROUND SAMPLES</text>
          </svg>

          <aside class="swath-metrics" aria-label="Current sensor measurements" aria-live="polite">
            <div><span>SWATH</span><strong data-metric="swath">—</strong><small>km</small></div>
            <div><span>NADIR GSD</span><strong data-metric="gsd">—</strong><small>m</small></div>
            <div><span>EDGE GSD</span><strong data-metric="edge">—</strong><small>m</small></div>
            <div><span>ORBIT PERIOD</span><strong data-metric="period">—</strong><small>min</small></div>
          </aside>

          <div class="swath-scene-meta" aria-hidden="true">
            <span>ALTITUDE <b data-scene="altitude">—</b></span>
            <span>FOV <b data-scene="fov">—</b></span>
            <span>SAMPLES <b data-scene="samples">—</b></span>
          </div>
          <span class="swath-not-scale">CURVATURE-AWARE SCHEMATIC / ALTITUDE NOT TO SCALE</span>
        </section>
      </div>`;

    shell.hud.innerHTML=`
      <div class="swath-hud"><span>MODE</span><strong class="swath-mode">GUIDED</strong></div>
      <div class="swath-hud"><span>EXPERIMENT</span><strong class="swath-count">01 / 03</strong></div>
      <div class="swath-hud"><span>MODEL</span><strong>SPHERICAL EARTH</strong></div>`;

    const root=shell.root;
    const svg=root.querySelector('.swath-svg');
    const earth=root.querySelector('.swath-earth');
    const earthLine=root.querySelector('.swath-earth-line');
    const satellite=root.querySelector('.swath-satellite');
    const beam=root.querySelector('.swath-beam');
    const left=root.querySelector('.swath-ray-left');
    const right=root.querySelector('.swath-ray-right');
    const nadir=root.querySelector('.swath-ray-nadir');
    const footprint=root.querySelector('.swath-footprint');
    const beforeBeam=root.querySelector('.swath-before-beam');
    const beforeLeft=root.querySelector('.swath-before-left');
    const beforeRight=root.querySelector('.swath-before-right');
    const beforeFootprint=root.querySelector('.swath-before-footprint');
    const pixels=root.querySelector('.swath-pixels');
    const count=root.querySelector('.swath-count');
    const mode=root.querySelector('.swath-mode');

    const earthCurve=surfacePath(-80,1080,48);
    earthLine.setAttribute('d',earthCurve);
    earth.setAttribute('d',`${earthCurve} L1080,700 L-80,700 Z`);

    const baseline=physics.compute(content.FREE_DEFAULT);

    function button(label,onClick,{secondary=false,disabled=false,className=''}={}){
      const node=document.createElement('button');
      node.type='button';
      node.className=`swath-action${secondary?' is-secondary':''}${className?` ${className}`:''}`;
      node.textContent=label;
      node.disabled=disabled;
      node.addEventListener('click',onClick);
      return node;
    }

    function sceneGeometry(result){
      const altNorm=(result.config.altitudeKm-physics.RANGES.altitudeKm[0])/(physics.RANGES.altitudeKm[1]-physics.RANGES.altitudeKm[0]);
      const satY=168-altNorm*82;
      const width=Math.max(115,Math.min(790,95+result.swathKm*1.48));
      const centerX=SURFACE.centerX;
      const leftX=centerX-width/2;
      const rightX=centerX+width/2;
      return Object.freeze({
        satY,centerX,leftX,rightX,
        centerY:surfaceY(centerX),
        leftY:surfaceY(leftX),
        rightY:surfaceY(rightX)
      });
    }

    function setLine(node,x1,y1,x2,y2){
      node.setAttribute('x1',x1);
      node.setAttribute('y1',y1);
      node.setAttribute('x2',x2);
      node.setAttribute('y2',y2);
    }

    const beamPath=g=>`M${g.centerX},${g.satY+12} L${g.leftX},${g.leftY} ${surfacePath(g.leftX,g.rightX,18).replace(/^M[^ ]+ /,'')} Z`;

    function representativeSampleCount(detectorPixels){
      const [min,max]=physics.RANGES.detectorPixels;
      const t=Math.log(detectorPixels/min)/Math.log(max/min);
      return Math.max(8,Math.min(42,Math.round(8+t*34)));
    }

    function renderPixels(g,result){
      pixels.innerHTML='';
      const shown=representativeSampleCount(result.config.detectorPixels);
      for(let i=0;i<shown;i++){
        const x0=g.leftX+(i/shown)*(g.rightX-g.leftX);
        const x1=g.leftX+((i+1)/shown)*(g.rightX-g.leftX);
        const y0=surfaceY(x0);
        const y1=surfaceY(x1);
        const cell=document.createElementNS(SVG_NS,'path');
        cell.setAttribute('class','swath-pixel-cell');
        cell.setAttribute('d',`M${x0.toFixed(2)},${y0.toFixed(2)} L${x1.toFixed(2)},${y1.toFixed(2)} L${x1.toFixed(2)},${(y1+13).toFixed(2)} L${x0.toFixed(2)},${(y0+13).toFixed(2)} Z`);
        if(i%2===0) cell.classList.add('is-alt');
        pixels.appendChild(cell);
      }
      pixels.dataset.detectorPixels=String(result.config.detectorPixels);
      pixels.dataset.visualSamples=String(shown);
    }

    function clearBefore(){
      beforeBeam.setAttribute('d','');
      beforeFootprint.setAttribute('d','');
      setLine(beforeLeft,0,0,0,0);
      setLine(beforeRight,0,0,0,0);
      root.dataset.compare='off';
    }

    function renderGeometry(current,before=null){
      const g=sceneGeometry(current);
      satellite.setAttribute('transform',`translate(500 ${g.satY})`);
      beam.setAttribute('d',beamPath(g));
      setLine(left,g.centerX,g.satY+12,g.leftX,g.leftY);
      setLine(nadir,g.centerX,g.satY+12,g.centerX,g.centerY);
      setLine(right,g.centerX,g.satY+12,g.rightX,g.rightY);
      footprint.setAttribute('d',surfacePath(g.leftX,g.rightX,18));
      renderPixels(g,current);

      if(before){
        const b=sceneGeometry(before);
        beforeBeam.setAttribute('d',beamPath(b));
        setLine(beforeLeft,b.centerX,b.satY+12,b.leftX,b.leftY);
        setLine(beforeRight,b.centerX,b.satY+12,b.rightX,b.rightY);
        beforeFootprint.setAttribute('d',surfacePath(b.leftX,b.rightX,18));
        root.dataset.compare='on';
      }else{
        clearBefore();
      }

      root.dataset.altitude=String(current.config.altitudeKm);
      root.dataset.fov=String(current.config.fovDeg);
      root.dataset.detectorPixels=String(current.config.detectorPixels);
      root.dataset.swathKm=current.swathKm.toFixed(3);
      root.dataset.gsdM=current.nadirGsdM.toFixed(3);

      root.querySelector('[data-metric="swath"]').textContent=fmtKm(current.swathKm);
      root.querySelector('[data-metric="gsd"]').textContent=fmtM(current.nadirGsdM);
      root.querySelector('[data-metric="edge"]').textContent=fmtM(current.edgeGsdM);
      root.querySelector('[data-metric="period"]').textContent=current.orbitalPeriodMin.toFixed(1);
      root.querySelector('[data-scene="altitude"]').textContent=`${current.config.altitudeKm.toLocaleString()} km`;
      root.querySelector('[data-scene="fov"]').textContent=`${current.config.fovDeg}°`;
      root.querySelector('[data-scene="samples"]').textContent=current.config.detectorPixels.toLocaleString();

      svg.setAttribute('aria-label',`Satellite at ${current.config.altitudeKm} kilometers with a ${current.config.fovDeg} degree field of view and ${current.config.detectorPixels} cross-track samples. Ground swath is ${fmtKm(current.swathKm)} kilometers. Nadir ground sample distance is ${fmtM(current.nadirGsdM)} meters and edge ground sample distance is ${fmtM(current.edgeGsdM)} meters.`);
    }

    function deltaRow(label,before,after,unit){
      const change=pct(before,after);
      const sign=change>=0?'+':'';
      return `<div><span>${label}</span><strong>${unit==='km'?fmtKm(after):fmtM(after)} ${unit}</strong><small>${sign}${change.toFixed(0)}%</small></div>`;
    }

    function renderGuided(snapshot,comparison){
      shell.overlay.innerHTML='';
      const exp=snapshot.experiment;
      const panel=document.createElement('section');
      panel.className='swath-panel swath-guided';
      panel.setAttribute('aria-label',`SWATH experiment ${snapshot.index+1} of ${snapshot.total}`);
      panel.innerHTML=`<span>${exp.index} / SENSOR GEOMETRY</span><h2>${exp.title}</h2><p>${exp.question}</p>`;

      if(snapshot.phase==='question'){
        const choices=document.createElement('div');
        choices.className='swath-choices';
        exp.choices.forEach(choice=>{
          const selected=snapshot.selection===choice.id;
          const node=button(choice.label,()=>callbacks.onSelect(choice.id),{secondary:!selected,className:'swath-choice'});
          node.setAttribute('aria-pressed',String(selected));
          choices.appendChild(node);
        });
        panel.appendChild(choices);
        panel.appendChild(button('COMMIT PREDICTION',callbacks.onCommit,{disabled:!snapshot.selection}));
      }else if(snapshot.phase==='committed'){
        panel.innerHTML+=`<div class="swath-config"><span>ALTITUDE <b>${exp.from.altitudeKm} km</b></span><span>FOV <b>${exp.from.fovDeg}°</b></span><span>SAMPLES <b>${exp.from.detectorPixels.toLocaleString()}</b></span></div>`;
        panel.appendChild(button(exp.action,callbacks.onPerturb));
      }else if(snapshot.phase==='revealed'){
        panel.classList.add(snapshot.correct?'is-correct':'is-revised');
        panel.innerHTML+=`
          <div class="swath-verdict">
            <small>${snapshot.correct?'PREDICTION HELD':'PREDICTION REVISED'}</small>
            <strong>${exp.revealTitle}</strong>
          </div>
          <div class="swath-deltas">
            ${deltaRow('SWATH',comparison.before.swathKm,comparison.after.swathKm,'km')}
            ${deltaRow('NADIR GSD',comparison.before.nadirGsdM,comparison.after.nadirGsdM,'m')}
          </div>
          <p>${exp.reveal}</p>
          <code>${exp.equation}</code>
          <div class="swath-limit">${exp.limit}</div>`;
        panel.appendChild(button(snapshot.index===snapshot.total-1?'OPEN SENSOR DESIGN':'NEXT EXPERIMENT',callbacks.onNext));
      }
      shell.overlay.appendChild(panel);
    }

    function rangeControl(key,label,step,value,unit){
      const [min,max]=physics.RANGES[key];
      return `
        <label class="swath-range">
          <span><b>${label}</b><output data-output="${key}">${Number(value).toLocaleString()} ${unit}</output></span>
          <input type="range" min="${min}" max="${max}" step="${step}" value="${value}" data-free="${key}">
          <small>${Number(min).toLocaleString()}${unit?' '+unit:''} <i></i> ${Number(max).toLocaleString()}${unit?' '+unit:''}</small>
        </label>`;
    }

    function relationText(value,reference,{higher,lower,same}){
      const ratio=value/reference;
      if(Math.abs(ratio-1)<0.005) return `${same} · 1.00×`;
      return `${ratio>1?higher:lower} · ${fmtRatio(ratio)}`;
    }

    function updateFreePanel(panel,result){
      if(!panel) return;
      panel.querySelectorAll('[data-free]').forEach(input=>{
        const key=input.dataset.free;
        if(document.activeElement!==input) input.value=String(result.config[key]);
      });
      panel.querySelector('[data-output="altitudeKm"]').textContent=`${result.config.altitudeKm.toLocaleString()} km`;
      panel.querySelector('[data-output="fovDeg"]').textContent=`${result.config.fovDeg} °`;
      panel.querySelector('[data-output="detectorPixels"]').textContent=result.config.detectorPixels.toLocaleString();
      panel.querySelector('[data-design="swath"]').textContent=relationText(result.swathKm,baseline.swathKm,{higher:'WIDER',lower:'NARROWER',same:'SAME'});
      panel.querySelector('[data-design="gsd"]').textContent=relationText(result.nadirGsdM,baseline.nadirGsdM,{higher:'COARSER',lower:'FINER',same:'SAME'});
      panel.querySelector('[data-design="edge"]').textContent=`${(result.edgeGsdM/result.nadirGsdM).toFixed(3)}× NADIR`;
      panel.dataset.altitude=String(result.config.altitudeKm);
      panel.dataset.fov=String(result.config.fovDeg);
      panel.dataset.detectorPixels=String(result.config.detectorPixels);
    }

    function renderFree(snapshot,result){
      shell.overlay.innerHTML='';
      const panel=document.createElement('section');
      panel.className='swath-panel swath-free';
      panel.setAttribute('aria-label','SWATH sensor design console');
      panel.innerHTML=`
        <div class="swath-free-head">
          <span>OBSERVATORY / SENSOR DESIGN</span>
          <h2>DESIGN A SENSOR</h2>
          <p>Change one variable. Coverage geometry and sampling density respond separately.</p>
        </div>

        <div class="swath-baseline">
          <span>REFERENCE SENSOR</span>
          <strong>${baseline.config.altitudeKm} km · ${baseline.config.fovDeg}° · ${baseline.config.detectorPixels.toLocaleString()} samples</strong>
        </div>

        <div class="swath-design-deltas" aria-live="polite">
          <div><span>SWATH / REFERENCE</span><strong data-design="swath">—</strong></div>
          <div><span>GSD / REFERENCE</span><strong data-design="gsd">—</strong></div>
          <div><span>EDGE SAMPLE</span><strong data-design="edge">—</strong></div>
        </div>

        <div class="swath-controls">
          ${rangeControl('altitudeKm','ALTITUDE',10,result.config.altitudeKm,'km')}
          ${rangeControl('fovDeg','FIELD OF VIEW',1,result.config.fovDeg,'°')}
          ${rangeControl('detectorPixels','CROSS-TRACK SAMPLES',128,result.config.detectorPixels,'')}
        </div>

        <details class="swath-model-details">
          <summary>MODEL BOUNDARY</summary>
          <ul>${content.MODEL_LIMITS.map(item=>`<li>${item}</li>`).join('')}</ul>
        </details>

        <div class="swath-free-actions"></div>`;

      panel.querySelectorAll('[data-free]').forEach(input=>{
        input.addEventListener('input',()=>callbacks.onFree(input.dataset.free,input.value));
      });
      const actions=panel.querySelector('.swath-free-actions');
      actions.appendChild(button('RESET SENSOR',callbacks.onResetFree,{secondary:true}));
      actions.appendChild(button('REPLAY GUIDED',callbacks.onRestart,{secondary:true}));
      shell.overlay.appendChild(panel);
      updateFreePanel(panel,result);
    }

    function render(snapshot,model){
      shell.setState(snapshot.phase);
      mode.textContent=snapshot.phase==='free'?'DESIGN':'GUIDED';
      count.textContent=snapshot.phase==='free'?'—':`${String(snapshot.index+1).padStart(2,'0')} / ${String(snapshot.total).padStart(2,'0')}`;

      if(snapshot.phase==='free'){
        shell.setStatus('SENSOR DESIGN');
        renderGeometry(model.current);
        const existing=shell.overlay.querySelector('.swath-free');
        if(existing) updateFreePanel(existing,model.current);
        else renderFree(snapshot,model.current);
        return;
      }

      const revealed=snapshot.phase==='revealed';
      shell.setStatus(revealed?'COMPARE GEOMETRY':'OBSERVE BASELINE');
      renderGeometry(revealed?model.comparison.after:model.comparison.before,revealed?model.comparison.before:null);
      renderGuided(snapshot,model.comparison);
    }

    return Object.freeze({render});
  }

  window.GeoPlaySwathView=Object.freeze({create});
})();
