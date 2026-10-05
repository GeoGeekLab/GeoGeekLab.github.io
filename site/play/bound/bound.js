(() => {
  'use strict';

  const SCENARIO = {
    id:'flood-risk',
    title:'DRAW THE UNSAFE REGION',
    riskThreshold:.52,
    initialResolution:96,
    disturbedResolution:24,
    targetCoverage:.70,
    maxAreaCost:.30,
    riskPeaks:[
      [.32,.38,.88,.16,.15],
      [.63,.58,.72,.20,.17],
      [.70,.27,.42,.11,.10]
    ],
    populationPeaks:[
      [.37,.43,.92,.13,.12],
      [.58,.60,.78,.14,.13],
      [.73,.31,.48,.08,.08]
    ],
    riskTexture:.025
  };

  function pct(value) {
    return `${Math.round((Number(value)||0)*100)}%`;
  }

  async function mountBound({ signal, stage } = {}) {
    const GeoPlay=window.GeoPlay;
    if(!stage) throw new Error('Bound requires an instrument stage.');
    if(!GeoPlay?.core || !GeoPlay?.shell?.createV2 || !GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');

    await Promise.all([
      GeoPlay.core.loadScript('play/bound/bound-field.js?v=20261005a','GeoPlayBoundField'),
      GeoPlay.core.loadScript('play/bound/bound-view.js?v=20261005a','GeoPlayBoundView')
    ]);
    if(signal?.aborted) return()=>{};

    const fieldApi=window.GeoPlayBoundField;
    const viewApi=window.GeoPlayBoundView;
    if(!fieldApi?.sample || !viewApi?.create) throw new Error('Bound V2 modules incomplete.');

    GeoPlay.core.ensureStyle('play/bound/bound-v2.css?v=20261005b','bound-v2');

    const shell=GeoPlay.shell.createV2(stage,{kind:'bound',title:'BOUND'});
    const states=['drawing','ready','committed','disturbing','decision','redrawing','result'];
    const machine=GeoPlay.core.createStateMachine({initial:'drawing',states,onChange:state=>shell.setState(state)});
    shell.setState(machine.state);

    const beforeGrid=fieldApi.sample(SCENARIO,SCENARIO.initialResolution);
    const afterGrid=fieldApi.sample(SCENARIO,SCENARIO.disturbedResolution);
    const change=fieldApi.classificationChange(beforeGrid,afterGrid,{riskThreshold:SCENARIO.riskThreshold});

    let view=null;
    let boundary=[];
    let originalBoundary=[];
    let beforeMetrics=null;
    let disturbedMetrics=null;
    let finalMetrics=null;
    let decision=null;
    let traceWritten=false;
    let disturbanceTimer=null;

    function button(label,onClick,{secondary=false,disabled=false}={}) {
      const node=document.createElement('button');
      node.type='button';
      node.className=`bound-v2-action${secondary?' is-secondary':''}`;
      node.textContent=label;
      node.disabled=disabled;
      node.addEventListener('click',onClick);
      return node;
    }

    function metricMarkup(metrics) {
      const coverage=metrics?.coverage ?? 0;
      const area=metrics?.areaCost ?? 0;
      return `<div class="bound-v2-metrics"><div class="bound-v2-metric"><span>COVERAGE</span><strong>${pct(coverage)}</strong><em>TARGET ≥ ${pct(SCENARIO.targetCoverage)}</em></div><div class="bound-v2-metric"><span>AREA CLOSED</span><strong>${pct(area)}</strong><em>TARGET ≤ ${pct(SCENARIO.maxAreaCost)}</em></div></div>`;
    }

    function setHud(resolution=SCENARIO.initialResolution) {
      shell.hud.innerHTML=`<div class="bound-v2-hud-item"><span>SCENARIO</span><strong>FLOOD RISK</strong></div><div class="bound-v2-hud-item"><span>OBSERVATION</span><strong>${resolution} × ${resolution}</strong></div><div class="bound-v2-hud-item"><span>RULE</span><strong>RISK ≥ ${(SCENARIO.riskThreshold).toFixed(2)}</strong></div>`;
    }

    function evaluateCurrent(grid=beforeGrid) {
      if(boundary.length<3) return null;
      return fieldApi.evaluate(grid,boundary,{riskThreshold:SCENARIO.riskThreshold});
    }

    function setBoundary(points) {
      boundary=(points||[]).map(point=>[...point]);
      if(machine.state==='drawing' && boundary.length>=3) machine.set('ready');
      view?.setBoundary(boundary,{emit:false});
      const metrics=evaluateCurrent(machine.state==='redrawing'?afterGrid:beforeGrid);
      renderDrawingPanel(metrics);
    }

    function guided() {
      setBoundary(fieldApi.guidedBoundary());
    }

    function nudge(transform) {
      const source=boundary.length>=3?boundary:fieldApi.guidedBoundary();
      setBoundary(fieldApi.transformBoundary(source,transform));
    }

    function renderDrawingPanel(metrics=null) {
      const isRedraw=machine.state==='redrawing';
      const panel=document.createElement('div');
      panel.className='bound-v2-panel';
      panel.innerHTML=`<span>${isRedraw?'REDRAW':'DECISION'}</span><h2>${isRedraw?'MOVE THE LINE':'DRAW THE UNSAFE REGION'}</h2><p>${isRedraw?'The old line stays visible. Draw a new region under the lower-resolution observation.':'Protect at least 70% of at-risk residents while closing no more than 30% of the field.'}</p>${metrics?metricMarkup(metrics):'<div class="bound-v2-metrics"><div class="bound-v2-metric"><span>COVERAGE</span><strong>—</strong><em>DRAW A CLOSED REGION</em></div><div class="bound-v2-metric"><span>AREA CLOSED</span><strong>—</strong><em>DRAW A CLOSED REGION</em></div></div>'}`;
      const actions=document.createElement('div');
      actions.className='bound-v2-actions';
      actions.appendChild(button('RESET',()=>{
        boundary=[];
        if(machine.state==='ready') machine.set('drawing');
        view.clearBoundary({keepOld:isRedraw});
        renderDrawingPanel(null);
        view.focus();
      },{secondary:true}));
      actions.appendChild(button('GUIDED REGION',guided,{secondary:true}));
      actions.appendChild(button(isRedraw?'COMMIT NEW LINE':'COMMIT REGION',isRedraw?commitRedraw:commitInitial,{disabled:!metrics}));
      panel.appendChild(actions);
      shell.overlay.innerHTML='';
      shell.overlay.appendChild(panel);
    }

    function onBoundary(points) {
      boundary=(points||[]).map(point=>[...point]);
      if(boundary.length<3) {
        if(machine.state==='ready') machine.set('drawing');
        renderDrawingPanel(null);
        return;
      }
      if(machine.state==='drawing') machine.set('ready');
      const grid=machine.state==='redrawing'?afterGrid:beforeGrid;
      renderDrawingPanel(fieldApi.evaluate(grid,boundary,{riskThreshold:SCENARIO.riskThreshold}));
    }

    function commitInitial() {
      if(boundary.length<3 || !['drawing','ready'].includes(machine.state)) return;
      originalBoundary=boundary.map(point=>[...point]);
      beforeMetrics=fieldApi.evaluate(beforeGrid,originalBoundary,{riskThreshold:SCENARIO.riskThreshold});
      machine.set('committed');
      view.setDrawing(false);
      const panel=document.createElement('div');
      panel.className='bound-v2-panel';
      panel.innerHTML=`<span>YOUR LINE</span><h2>COMMITTED</h2>${metricMarkup(beforeMetrics)}<p>The line is fixed. Now change only the observation resolution.</p>`;
      const actions=document.createElement('div');
      actions.className='bound-v2-actions';
      actions.appendChild(button('CHANGE OBSERVATION',disturb));
      panel.appendChild(actions);
      shell.overlay.innerHTML='';
      shell.overlay.appendChild(panel);
    }

    function disturb() {
      if(machine.state!=='committed') return;
      machine.set('disturbing');
      view.setDisturbing(true);
      view.setDrawing(false);
      setHud(SCENARIO.disturbedResolution);
      shell.setStatus('OBSERVATION CHANGE');
      const panel=document.createElement('div');
      panel.className='bound-v2-panel';
      panel.innerHTML=`<span>OBSERVATION CHANGE</span><h2>${SCENARIO.initialResolution} → ${SCENARIO.disturbedResolution}</h2><p>The field source stays the same. Only sampling resolution changes.</p>`;
      shell.overlay.innerHTML='';
      shell.overlay.appendChild(panel);
      const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
      window.clearTimeout(disturbanceTimer);
      disturbanceTimer=window.setTimeout(()=>{
        view.renderGrid(afterGrid);
        view.showChangeMask(change);
        view.setDisturbing(false);
        disturbedMetrics=fieldApi.evaluate(afterGrid,originalBoundary,{riskThreshold:SCENARIO.riskThreshold});
        machine.set('decision');
        renderDecision();
      },reduced?80:850);
    }

    function renderDecision() {
      shell.setStatus('LOWER RESOLUTION');
      const panel=document.createElement('div');
      panel.className='bound-v2-panel';
      panel.innerHTML=`<span>CONSEQUENCE</span><h2>THE FIELD WAS RESAMPLED.</h2><div class="bound-v2-metrics"><div class="bound-v2-metric"><span>COVERAGE</span><strong>${pct(beforeMetrics.coverage)} → ${pct(disturbedMetrics.coverage)}</strong><em>SAME LINE</em></div><div class="bound-v2-metric"><span>CHANGED CLASS</span><strong>${pct(change.fraction)}</strong><em>WORLD SOURCE UNCHANGED</em></div></div><p>Your boundary did not move. The observation did.</p>`;
      const actions=document.createElement('div');
      actions.className='bound-v2-actions';
      actions.appendChild(button('KEEP LINE',keepLine,{secondary:true}));
      actions.appendChild(button('REDRAW',beginRedraw));
      panel.appendChild(actions);
      shell.overlay.innerHTML='';
      shell.overlay.appendChild(panel);
    }

    function keepLine() {
      if(machine.state!=='decision') return;
      decision='keep';
      finalMetrics=disturbedMetrics;
      showResult();
    }

    function beginRedraw() {
      if(machine.state!=='decision') return;
      decision='redraw';
      machine.set('redrawing');
      view.clearChangeMask();
      view.setBoundary(originalBoundary,{old:true,emit:false});
      boundary=[];
      view.setBoundary([],{emit:false});
      view.setDrawing(true);
      renderDrawingPanel(null);
      view.focus();
    }

    function commitRedraw() {
      if(machine.state!=='redrawing' || boundary.length<3) return;
      finalMetrics=fieldApi.evaluate(afterGrid,boundary,{riskThreshold:SCENARIO.riskThreshold});
      showResult();
    }

    function writeTrace(shift) {
      if(traceWritten) return;
      traceWritten=true;
      GeoPlay.trace.append({
        play:'bound',
        trialId:SCENARIO.id,
        judgment:{decision,beforeBoundary:originalBoundary,afterBoundary:decision==='redraw'?boundary:originalBoundary},
        relation:{riskThreshold:SCENARIO.riskThreshold},
        result:{before:beforeMetrics,afterObservation:disturbedMetrics,final:finalMetrics},
        conditions:{before:{resolution:SCENARIO.initialResolution},after:{resolution:SCENARIO.disturbedResolution}},
        effect:{classificationChanged:change.fraction,boundaryShift:shift}
      });
    }

    function showResult() {
      machine.set('result');
      view.setDrawing(false);
      view.clearChangeMask();
      const finalBoundary=decision==='redraw'?boundary:originalBoundary;
      if(decision==='redraw') view.setBoundary(finalBoundary,{emit:false});
      const shift=decision==='redraw'?fieldApi.boundaryShift(originalBoundary,finalBoundary):0;
      writeTrace(shift);
      const panel=document.createElement('div');
      panel.className='bound-v2-panel';
      panel.innerHTML=`<span>RESULT</span><div class="bound-v2-result">${decision==='redraw'?'YOU MOVED THE LINE':'YOU KEPT THE LINE'}<small>${decision==='redraw'?`${pct(shift)} OF THE FIELD CHANGED SIDE`:'UNDER A NEW OBSERVATION'}</small></div>${metricMarkup(finalMetrics)}<p>${pct(change.fraction)} of sampled cells changed risk class without the field source changing.</p>`;
      const actions=document.createElement('div');
      actions.className='bound-v2-actions';
      actions.appendChild(button('PLAY AGAIN',restart,{secondary:true}));
      panel.appendChild(actions);
      shell.overlay.innerHTML='';
      shell.overlay.appendChild(panel);
    }

    function restart() {
      window.clearTimeout(disturbanceTimer);
      boundary=[];
      originalBoundary=[];
      beforeMetrics=null;
      disturbedMetrics=null;
      finalMetrics=null;
      decision=null;
      traceWritten=false;
      if(machine.state!=='drawing') machine.set('drawing');
      shell.setStatus('');
      setHud(SCENARIO.initialResolution);
      view.clearChangeMask();
      view.setDisturbing(false);
      view.clearBoundary();
      view.renderGrid(beforeGrid);
      view.setDrawing(true);
      renderDrawingPanel(null);
      view.focus();
    }

    view=viewApi.create({
      shell,
      fieldApi,
      callbacks:{onBoundary,onGuided:guided,onNudge:nudge}
    });
    setHud(SCENARIO.initialResolution);
    view.renderGrid(beforeGrid);
    view.setDrawing(true);
    renderDrawingPanel(null);
    queueMicrotask(()=>view.focus());

    return()=>{
      window.clearTimeout(disturbanceTimer);
      stage.innerHTML='';
    };
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.zone=mountBound;
  }

  window.GeoPlayBound={register,mount:mountBound};
  register();
})();