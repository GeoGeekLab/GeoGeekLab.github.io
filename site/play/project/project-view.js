(() => {
  'use strict';

  function create({ shell, d3, world, experiment, morph } = {}) {
    if (!shell?.viewport || !d3 || !world || !experiment || !morph) throw new Error('Project view requires shell, D3, world data, experiment, and morph engine.');

    const byId=id=>world.countries.find(feature=>String(feature.id)===String(id));
    const choices=Object.fromEntries(experiment.choices.map(choice=>[choice.id,{...choice,feature:byId(choice.atlasId)}]));

    shell.viewport.innerHTML=`<div class="project-v2-stage"><svg class="project-v2-map" viewBox="0 0 1000 640" role="img" aria-label="World map changing continuously between Mercator and Equal Earth projections"></svg><div class="project-v2-canvas-caption" aria-hidden="true"><span>01 / AREA</span><span>Representation changes · geography stays</span></div></div>`;
    const svg=d3.select(shell.viewport.querySelector('.project-v2-map'));
    const sphere=svg.append('path').datum({type:'Sphere'}).attr('class','project-v2-sphere');
    const graticule=svg.append('path').datum(d3.geoGraticule10()).attr('class','project-v2-graticule');
    const land=svg.append('path').datum(world.land).attr('class','project-v2-land');
    const greenland=svg.append('path').datum(choices.greenland.feature).attr('class','project-v2-highlight is-greenland');
    const india=svg.append('path').datum(choices.india.feature).attr('class','project-v2-highlight is-india');
    let slider=null;
    let revealButton=null;
    let progress=null;
    let apparentValue=null;

    function apparentAreaRatio() {
      const g=Math.abs(Number(morph.path.area(choices.greenland.feature)) || 0);
      const i=Math.abs(Number(morph.path.area(choices.india.feature)) || 0);
      return i>0 ? g/i : null;
    }

    function formatApparentRatio(ratio) {
      if(!Number.isFinite(ratio) || ratio<=0) return '—';
      if(ratio>=1) return `GREENLAND ${ratio.toFixed(2)}× INDIA`;
      return `INDIA ${(1/ratio).toFixed(2)}× GREENLAND`;
    }

    function updateApparentMetric() {
      const ratio=apparentAreaRatio();
      if(Number.isFinite(ratio)) shell.root.dataset.apparentAreaRatio=ratio.toFixed(4);
      else delete shell.root.dataset.apparentAreaRatio;
      if(apparentValue) apparentValue.textContent=formatApparentRatio(ratio);
    }

    function setMorphAtmosphere(value) {
      shell.root.style.setProperty('--project-morph',value.toFixed(3));
      shell.root.dataset.morphPhase=value<.08?'start':value>.92?'end':'moving';
    }

    function renderProjection(t) {
      const value=morph.set(t);
      const path=morph.path;
      sphere.attr('d',path);
      graticule.attr('d',path);
      land.attr('d',path);
      greenland.attr('d',path);
      india.attr('d',path);
      setMorphAtmosphere(value);
      updateApparentMetric();
      shell.setStatus(value < .5 ? experiment.from.label : experiment.to.label);
      if(progress) progress.textContent=`${Math.round(value*100)}%`;
      if(revealButton) revealButton.disabled=value<.98;
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

    function setHud(phase='predicting',selected='') {
      const committed=phase!=='predicting';
      const revealed=phase==='revealed';
      shell.hud.innerHTML=`
        <div class="project-v2-evidence-head"><span>FIELD NOTES / 01</span><strong>Area &amp; projection</strong></div>
        <div class="project-v2-evidence-group">
          <div class="project-v2-hud-item"><span>EXPERIMENT</span><strong>AREA</strong></div>
          <div class="project-v2-hud-item"><span>PROJECTIONS</span><strong>MERCATOR → EQUAL EARTH</strong></div>
        </div>
        <div class="project-v2-evidence-group project-v2-key">
          <span class="project-v2-evidence-label">MAP KEY</span>
          <div><i class="project-v2-swatch is-greenland"></i>Greenland</div>
          <div><i class="project-v2-swatch is-india"></i>India</div>
        </div>
        <div class="project-v2-evidence-group">
          <div class="project-v2-hud-item"><span>SURFACE AREA</span><strong>UNCHANGED</strong></div>
          <p>Only the map representation changes. The land areas remain fixed.</p>
        </div>
        ${committed?`<div class="project-v2-evidence-group project-v2-evidence-readout">
          <span class="project-v2-evidence-label">APPARENT AREA ON MAP</span>
          <strong class="project-v2-apparent-value" aria-live="polite">—</strong>
          <small>SCREEN SPACE · REPRESENTATION ONLY</small>
        </div>`:''}
        ${selected?`<div class="project-v2-evidence-group"><span class="project-v2-evidence-label">YOUR PREDICTION</span><strong class="project-v2-evidence-choice">${choices[selected]?.label||''}</strong></div>`:''}
        ${revealed?`<div class="project-v2-evidence-group project-v2-evidence-truth">
          <span class="project-v2-evidence-label">ACTUAL SURFACE AREA</span>
          <div class="project-v2-area-pair">
            <div><span>INDIA</span><strong>≈ ${(choices.india.areaKm2/1e6).toFixed(2)}M km²</strong></div>
            <div><span>GREENLAND</span><strong>≈ ${(choices.greenland.areaKm2/1e6).toFixed(2)}M km²</strong></div>
          </div>
        </div>`:''}
        <div class="project-v2-evidence-limit">A map is a representation, not the Earth's surface.</div>`;
      apparentValue=shell.hud.querySelector('.project-v2-apparent-value');
    }

    function showPrediction(onChoice) {
      slider=null; revealButton=null; progress=null; apparentValue=null;
      shell.setState('predicting');
      shell.setStatus(experiment.from.label);
      setHud('predicting');
      renderProjection(0);
      shell.overlay.innerHTML='';
      const panel=document.createElement('div');
      panel.className='project-v2-panel is-question';
      panel.innerHTML=`<span>AREA</span><h2>${experiment.question}</h2><p>Commit before changing the projection.</p>`;
      const actions=document.createElement('div');
      actions.className='project-v2-actions';
      experiment.choices.forEach(choice=>actions.appendChild(button(choice.label,()=>onChoice?.(choice.id))));
      panel.appendChild(actions);
      shell.overlay.appendChild(panel);
    }

    function addScrubber(panel,{value=0,onInput,onReveal,showReveal=true}={}) {
      const control=document.createElement('div');
      control.className='project-v2-scrub-control';
      control.innerHTML=`<div class="project-v2-scrub-labels"><span>${experiment.from.label}</span><strong class="project-v2-progress">${Math.round(value*100)}%</strong><span>${experiment.to.label}</span></div>`;
      slider=document.createElement('input');
      slider.type='range';
      slider.min='0';
      slider.max='100';
      slider.step='1';
      slider.value=String(Math.round(value*100));
      slider.className='project-v2-scrubber';
      slider.setAttribute('aria-label','Projection transformation from Mercator to Equal Earth');
      slider.addEventListener('input',()=>{
        const next=Number(slider.value)/100;
        renderProjection(next);
        onInput?.(next);
      });
      control.appendChild(slider);
      progress=control.querySelector('.project-v2-progress');
      apparentValue=shell.hud.querySelector('.project-v2-apparent-value');
      panel.appendChild(control);
      renderProjection(value);
      if(showReveal) {
        revealButton=button('REVEAL AREA',()=>onReveal?.(),{disabled:value<.98});
        panel.appendChild(revealButton);
      }
    }

    function showTransform({choice,value=0,onInput,onReveal}={}) {
      shell.setState('transforming');
      setHud('transforming',choice);
      shell.overlay.innerHTML='';
      const selected=choices[choice];
      const panel=document.createElement('div');
      panel.className='project-v2-panel';
      panel.innerHTML=`<span>YOUR PICK</span><h2>${selected?.label || ''}</h2><p>Drag the projection. Watch the same land change shape and apparent size.</p>`;
      addScrubber(panel,{value,onInput,onReveal,showReveal:true});
      shell.overlay.appendChild(panel);
      renderProjection(value);
      slider?.focus();
    }

    function showResult({choice,value=1,onInput,onRestart,onNext}={}) {
      shell.setState('revealed');
      setHud('revealed',choice);
      shell.overlay.innerHTML='';
      const selected=choices[choice];
      const larger=experiment.choices.reduce((best,item)=>item.areaKm2>best.areaKm2?item:best,experiment.choices[0]);
      const panel=document.createElement('div');
      panel.className='project-v2-panel is-result';
      panel.innerHTML=`<span>REVEAL</span><div class="project-v2-result">${larger.label}<small>IS LARGER</small></div><p>${selected?.id===larger.id?'YOUR PREDICTION HELD.':'YOUR PREDICTION DIDN\'T HOLD.'}<br>${experiment.insight[0]} ${experiment.insight[1]}</p>`;
      addScrubber(panel,{value,onInput,showReveal:false});
      const actions=document.createElement('div');
      actions.className='project-v2-actions';
      actions.appendChild(button('TRY AGAIN',onRestart,{secondary:true}));
      if(onNext) actions.appendChild(button('NEXT: ROUTE',onNext));
      panel.appendChild(actions);
      shell.overlay.appendChild(panel);
      renderProjection(value);
    }

    renderProjection(0);
    return { showPrediction, showTransform, showResult, renderProjection };
  }

  window.GeoPlayProjectView={create};
})();