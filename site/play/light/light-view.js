(() => {
  'use strict';

  function spectrumDomain(before,after) {
    const values=[...(before||[]),...(after||[])];
    if (values.some(value=>!Number.isFinite(value)||value<0)) {
      throw new Error('Light spectra require finite, nonnegative values.');
    }
    const peak=Math.max(0,...values);
    return peak>0?peak:1;
  }

  function pathD(values,width,height,domainMax,pad=12) {
    if (!values?.length) return '';
    if (!(Number.isFinite(domainMax)&&domainMax>0)) {
      throw new Error('Light spectrum requires a positive shared Y domain.');
    }
    const usableW=width-pad*2,usableH=height-pad*2;
    return values.map((value,index)=>{
      if (!Number.isFinite(value)||value<0) {
        throw new Error('Light spectra require finite, nonnegative values.');
      }
      const x=pad+(index/Math.max(1,values.length-1))*usableW;
      const y=height-pad-(value/domainMax)*usableH;
      return `${index?'L':'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    }).join(' ');
  }

  function formatValue(value,unit) {
    if (unit==='sr⁻¹') return Number(value).toExponential(2);
    return Number(value).toFixed(3);
  }

  function create({shell,content,callbacks}={}) {
    if (!shell?.viewport) throw new Error('Light view requires a V2 shell.');

    shell.viewport.innerHTML=`
      <div class="light-stage">
        <section class="light-world" aria-label="Conceptual light-path scene" aria-describedby="lightSceneSummary">
          <div class="light-sky" aria-hidden="true">
            <span class="light-sun"></span>
            <span class="light-sky-note">ATMOSPHERE</span>
          </div>
          <div class="light-horizon" aria-hidden="true"></div>
          <div class="light-ocean" aria-hidden="true">
            <div class="light-water-signal"></div>
            <div class="light-surface-reflection"></div>
            <span class="light-water-note">WATER</span>
          </div>
          <svg class="light-paths" viewBox="0 0 1000 560" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <marker id="lightArrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
                <path d="M0,0 L0,6 L7,3 z"></path>
              </marker>
            </defs>
            <path class="light-ray light-ray-direct" d="M770 70 C690 150 610 220 540 282"></path>
            <path class="light-ray light-ray-atmosphere" d="M610 150 C520 120 420 145 340 218"></path>
            <path class="light-ray light-ray-surface" d="M540 282 C645 220 735 205 835 176"></path>
            <path class="light-ray light-ray-water" d="M540 286 C520 362 500 410 465 455 C535 423 620 370 704 306"></path>
            <path class="light-ray light-ray-depth" d="M540 285 C546 354 563 406 581 499"></path>
          </svg>
          <div class="light-scene-caption"><span class="light-scene-focus">PATH UNDER TEST</span><span>ILLUSTRATIVE PATHS · NOT TO SCALE</span></div>
          <div class="light-mechanism-readout" aria-hidden="true"><span>ACTIVE VARIABLE</span><strong>—</strong></div>
          <div class="light-path-legend" aria-label="Light path status">
            <span data-path="atmosphere">SCATTERED SKY</span>
            <span data-path="surface">SURFACE REFLECTION</span>
            <span data-path="water">WATER-LEAVING</span>
            <span data-path="direct">DIRECT SUNLIGHT</span>
            <span data-path="depth">WATER ABSORPTION</span>
          </div>
          <span class="light-display-note">DISPLAY COLOR / ILLUSTRATIVE</span>
          <p class="light-scene-summary" id="lightSceneSummary"></p>
        </section>

        <section class="light-spectrum-card" aria-label="Spectral consequence">
          <header><span class="light-spectrum-title">SPECTRUM</span><strong class="light-spectrum-mode">—</strong></header>
          <svg class="light-spectrum" viewBox="0 0 520 138" preserveAspectRatio="none" role="img" aria-label="Before and after spectrum">
            <line x1="12" y1="126" x2="508" y2="126" class="light-axis"></line>
            <text x="508" y="13" text-anchor="end" class="light-spectrum-y-max">MAX —</text>
            <text x="12" y="116" class="light-spectrum-zero">0</text>
            <path class="light-spectrum-before"></path>
            <path class="light-spectrum-after"></path>
            <text x="12" y="137">400</text><text x="248" y="137">550</text><text x="482" y="137">700 nm</text>
          </svg>
          <div class="light-spectrum-readout"><span class="light-spectrum-probe">—</span><span>BEFORE <b class="light-before-value">—</b></span><span>AFTER <b class="light-after-value">—</b></span><span class="light-change-readout">Δ AFTER − BEFORE <b class="light-change-value">—</b></span></div>
        </section>
      </div>`;

    shell.hud.innerHTML=`
      <div class="light-journey">
        <div class="light-journey-head"><span class="light-journey-chapter">ACT I / THREE PATHS</span><span class="light-journey-state">01 OF 03</span></div>
        <div class="light-journey-track" role="img" aria-label="Experiment progress: 1 of 3">
          ${Array.from({length:6},(_,i)=>`<span data-stage="${i+1}" aria-hidden="true"></span>`).join('')}
        </div>
      </div>
      <div class="light-evidence-head"><small>LIGHT / OPTICAL EVIDENCE</small><strong class="light-evidence-target">Three optical mechanisms</strong></div>
      <div class="light-evidence-meta">
        <div class="light-hud-block"><span>EXPERIMENT</span><strong class="light-hud-count">01 / 03</strong></div>
        <div class="light-hud-block"><span>MODEL</span><strong class="light-model-type">PATH ABLATION</strong></div>
      </div>
      <div class="light-evidence-legend-title">PATH STATUS / CONCEPTUAL</div>
      <div class="light-evidence-legend"></div>
      <div class="light-evidence-spectrum"></div>
      <details class="light-evidence-method"><summary>MODEL SCOPE <span>VIEW LIMITS</span></summary><p class="light-evidence-limit">Scene geometry and color are illustrative. Sky and surface curves are relative teaching models. Only the water experiment shows modeled Rrs (sr⁻¹). TOA radiance is not modeled.</p></details>
      <p class="light-phase-announcement" role="status" aria-live="polite" aria-atomic="true"></p>`;

    const root=shell.root;
    // Desktop-only instrument. The notice replaces the experiments on narrow
    // screens and coarse-pointer devices without changing the science state.
    const desktopGate=document.createElement('section');
    desktopGate.className='light-desktop-gate';
    desktopGate.setAttribute('aria-labelledby','lightDesktopGateTitle');
    desktopGate.innerHTML=`
      <span class="light-desktop-gate-index">GEOGEEK / LAB / PLAY / L15</span>
      <div class="light-desktop-gate-rule" aria-hidden="true"></div>
      <p class="light-desktop-gate-kicker">DESKTOP EXPERIENCE</p>
      <h2 id="lightDesktopGateTitle">Open Light on a desktop.</h2>
      <p>Light uses a wide scene and a separate evidence panel. Please open this page on a computer to explore the optical experiments.</p>
      <p lang="zh-CN">本实验仅面向桌面端。请使用电脑浏览器打开相同链接。</p>
      <a class="light-desktop-gate-link" href="/lab.html">RETURN TO LAB <span aria-hidden="true">↗</span></a>
      <span class="light-desktop-gate-foot">SCATTERING / ABSORPTION / INTERFACE</span>`;
    root.append(desktopGate);

    const sky=root.querySelector('.light-sky');
    const ocean=root.querySelector('.light-ocean');
    const reflection=root.querySelector('.light-surface-reflection');
    const waterSignal=root.querySelector('.light-water-signal');
    const beforePath=root.querySelector('.light-spectrum-before');
    const afterPath=root.querySelector('.light-spectrum-after');
    const spectrumMode=root.querySelector('.light-spectrum-mode');
    const beforeValue=root.querySelector('.light-before-value');
    const afterValue=root.querySelector('.light-after-value');
    const changeValue=root.querySelector('.light-change-value');
    const probeLabel=root.querySelector('.light-spectrum-probe');
    const spectrumSvg=root.querySelector('.light-spectrum');
    const maxLabel=root.querySelector('.light-spectrum-y-max');
    const sceneSummary=root.querySelector('.light-scene-summary');
    const phaseAnnouncement=root.querySelector('.light-phase-announcement');
    const sceneFocus=root.querySelector('.light-scene-focus');
    const evidenceTarget=root.querySelector('.light-evidence-target');
    const evidenceScope=root.querySelector('.light-evidence-limit');
    const modelType=root.querySelector('.light-model-type');
    const progressChapter=root.querySelector('.light-journey-chapter');
    const progressState=root.querySelector('.light-journey-state');
    const progressTrack=root.querySelector('.light-journey-track');
    const mechanismReadout=root.querySelector('.light-mechanism-readout strong');
    const directPath=root.querySelector('.light-ray-direct');
    const depthPath=root.querySelector('.light-ray-depth');
    const pathForMechanism=Object.freeze({
      atmosphericScattering:'atmosphere',
      surfaceReflection:'surface',
      waterBackscatter:'water'
    });
    const pathTitle=Object.freeze({
      atmosphere:'SCATTERED SKY',
      surface:'SURFACE REFLECTION',
      water:'WATER-LEAVING SIGNAL',
      direct:'DIRECT SUNLIGHT',
      depth:'WATER ABSORPTION'
    });
    let announcedPhase=null;
    const count=root.querySelector('.light-hud-count');
    const desktopQuery=window.matchMedia('(min-width:1024px)');
    // Move existing presentation elements, not data or experiment logic.
    // The narrow-screen composition remains unchanged.
    function positionEvidence() {
      const legend=root.querySelector('.light-path-legend');
      const spectrum=root.querySelector('.light-spectrum-card');
      if (desktopQuery.matches) {
        shell.hud.querySelector('.light-evidence-legend').append(legend);
        shell.hud.querySelector('.light-evidence-spectrum').append(spectrum);
      } else {
        shell.viewport.querySelector('.light-world').append(legend);
        shell.viewport.querySelector('.light-stage').append(spectrum);
      }
    }
    desktopQuery.addEventListener('change',positionEvidence);
    positionEvidence();

    function renderSpectrum(snapshot,scene) {
      const chart=scene.chart;
      const domainMax=spectrumDomain(chart.before,chart.after);
      // The baseline is y=126 in the 138-unit SVG viewBox. Both traces
      // share the same Y domain, so removing a signal cannot rescale it.
      beforePath.setAttribute('d',pathD(chart.before,520,138,domainMax));
      afterPath.setAttribute('d',pathD(chart.after,520,138,domainMax));
      spectrumSvg.dataset.yMax=String(domainMax);
      maxLabel.textContent=`MAX ${formatValue(domainMax,chart.unit)}`;
      const revealed=snapshot.phase==='revealed'||snapshot.phase==='complete';
      root.dataset.lightCompare=revealed?'revealed':'baseline';
      spectrumSvg.setAttribute('aria-label',revealed?'Before and after spectra on the same vertical scale':'Baseline spectrum; result is hidden until reveal');
      spectrumMode.textContent=snapshot.experiment?.chartLabel || '—';
      const wavelengths=chart.wavelengthNm || [];
      const probeIndex=wavelengths.length
        ? wavelengths.reduce((best,wavelength,index)=>
          Math.abs(wavelength-550)<Math.abs(wavelengths[best]-550)?index:best,0)
        : 0;
      const probeNm=wavelengths[probeIndex]??550;
      probeLabel.textContent=`${probeNm} NM · ${chart.unit==='sr⁻¹'?'Rrs / sr⁻¹':'RELATIVE'}`;
      beforeValue.textContent=formatValue(chart.before[probeIndex]??0,chart.unit);
      afterValue.textContent=revealed?formatValue(chart.after[probeIndex]??0,chart.unit):'PENDING';
      changeValue.textContent=revealed?formatValue(chart.after[probeIndex]-chart.before[probeIndex],chart.unit):'—';
    }

    function button(label,onClick,{secondary=false,disabled=false,action=null}={}) {
      const node=document.createElement('button');
      node.type='button';
      node.className=`light-action${secondary?' is-secondary':''}`;
      node.textContent=label;
      node.disabled=disabled;
      if (action) node.dataset.lightAction=action;
      node.addEventListener('click',onClick);
      return node;
    }

    function restorePanelFocus(panel,previousAction) {
      if (!previousAction) return;
      const nextAction=previousAction==='commit'?'perturb'
        :previousAction==='perturb'?'next'
        :previousAction==='next'||previousAction==='restart'||previousAction==='begin-advanced'?'first-choice'
        :previousAction;
      if (nextAction==='first-choice') shell.overlay.scrollTop=0;
      const controls=[...panel.querySelectorAll('[data-light-action]')];
      const target=nextAction==='first-choice'
        ?controls.find(control=>control.classList.contains('light-choice'))||controls[0]
        :controls.find(control=>control.dataset.lightAction===nextAction)||controls.find(control=>!control.disabled);
      target?.focus({preventScroll:true});
    }

    function renderPanel(snapshot) {
      const exp=snapshot.experiment;
      const previousAction=shell.overlay.contains(document.activeElement)?document.activeElement?.dataset.lightAction:null;
      shell.overlay.innerHTML='';
      const panel=document.createElement('section');
      panel.className='light-panel';
      if (snapshot.phase==='complete') {
        panel.innerHTML=snapshot.advancedUnlocked?`
          <span>TRACE COMPLETE / SIX EXPERIMENTS</span>
          <h2>LIGHT MOVES THROUGH MATTER.</h2>
          <p>Scattering, absorption, surface reflection, atmospheric path length, and geometry produce different optical outcomes.</p>
          <div class="light-limit">THREE CORE EXPERIMENTS + THREE PARAMETER EXPLORATIONS · IDEALIZED MODELS</div>`:`
          <span>ACT I COMPLETE / THREE PATHS</span>
          <h2>ONE COLOR. MULTIPLE PATHS.</h2>
          <p>Sky scattering, surface reflection, and water-leaving radiance are distinct mechanisms. The next three experiments let you change path length, depth, and incidence angle.</p>
          <div class="light-limit">ACT II / THREE PARAMETER EXPLORATIONS · OPTIONAL</div>`;
        if (!snapshot.advancedUnlocked && content.EXPERIMENTS.length>3) {
          panel.appendChild(button('EXPLORE THREE MORE',callbacks.onBeginAdvanced,{action:'begin-advanced'}));
        }
        panel.appendChild(button('PLAY AGAIN',callbacks.onRestart,{secondary:!snapshot.advancedUnlocked,action:'restart'}));
        shell.overlay.appendChild(panel);
        restorePanelFocus(panel,previousAction);
        return;
      }

      panel.innerHTML=`<span>${exp.index} / ${snapshot.index<3?'CORE MECHANISM':'PROPAGATION EXPERIMENT'}</span><h2>${exp.title}</h2><p>${exp.question}</p>`;

      if (snapshot.phase==='question') {
        const choices=document.createElement('div');
        choices.className='light-choices';
        exp.choices.forEach(choice=>{
          const selected=snapshot.selection===choice.id;
          const choiceButton=button(choice.label,()=>callbacks.onSelect(choice.id),{secondary:!selected,action:`choice-${choice.id}`});
          choiceButton.classList.add('light-choice');
          choiceButton.setAttribute('aria-pressed',String(selected));
          choices.appendChild(choiceButton);
        });
        panel.appendChild(choices);
        panel.appendChild(button('COMMIT PREDICTION',callbacks.onCommit,{disabled:!snapshot.selection,action:'commit'}));
      } else if (snapshot.phase==='committed') {
        const committed=document.createElement('div');
        committed.className='light-committed';
        const selected=exp.choices.find(choice=>choice.id===snapshot.selection)?.label || '—';
        committed.innerHTML=`<small>YOUR PREDICTION</small><strong>${selected}</strong>`;
        panel.appendChild(committed);
        panel.appendChild(button(exp.action,callbacks.onPerturb,{action:'perturb'}));
      } else if (snapshot.phase==='revealed') {
        panel.classList.add(snapshot.correct?'is-correct':'is-revised');
        panel.innerHTML+=`
          <div class="light-verdict"><small>${snapshot.correct?'PREDICTION HELD':'PREDICTION REVISED'}</small><strong>${exp.revealTitle}</strong></div>
          <p>${exp.reveal}</p>
          <code>${exp.equation}</code>
          <div class="light-limit">${exp.limit}</div>`;
        if (exp.intervention) {
          const config=exp.intervention;
          const explorer=document.createElement('div');
          explorer.className='light-explorer';
          explorer.innerHTML=`
            <div class="light-explorer-top"><label for="lightExploreControl">${config.label}</label><output class="light-explore-live" for="lightExploreControl">${snapshot.exploreValue} ${config.unit}</output></div>
            <input type="range" id="lightExploreControl" min="${config.min}" max="${config.max}" step="${config.step}" value="${snapshot.exploreValue}" aria-label="${config.label}" />
            <div class="light-explorer-scale"><span>${config.min} ${config.unit}</span><span>${config.max} ${config.unit}</span></div>`;
          explorer.querySelector('input').addEventListener('input',event=>callbacks.onExplore(Number(event.target.value)));
          panel.appendChild(explorer);
        }
        panel.appendChild(button(snapshot.index===snapshot.total-1?'FINISH TRACE':'NEXT EXPERIMENT',callbacks.onNext,{action:'next'}));
      }
      shell.overlay.appendChild(panel);
      restorePanelFocus(panel,previousAction);
    }

    function render(snapshot,scene,meta={}) {
      shell.setState(snapshot.phase);
      shell.setStatus(snapshot.phase==='revealed'
        ?(snapshot.experiment?.intervention?'PARAMETER CHANGED':'MECHANISM REMOVED')
        :snapshot.phase==='complete'?'TRACE COMPLETE'
        :snapshot.phase==='committed'?'PREDICTION LOCKED':'NORMAL WORLD');
      const currentPhase=`${snapshot.index}:${snapshot.phase}`;
      if (currentPhase!==announcedPhase) {
        announcedPhase=currentPhase;
        phaseAnnouncement.textContent=snapshot.phase==='complete'
          ?(snapshot.advancedUnlocked?'All six experiments complete. Play again to restart.':'Three core experiments complete. Continue or play again.')
          :snapshot.phase==='committed'?'Prediction locked. Apply the intervention to reveal its effect.'
          :snapshot.phase==='revealed'?`${snapshot.experiment.revealTitle} Before and after spectra are now available.`
          :`Experiment ${snapshot.index+1} of ${snapshot.total}. ${snapshot.experiment.title}`;
      }
      count.textContent=`${String(Math.min(snapshot.index+1,snapshot.total)).padStart(2,'0')} / ${String(snapshot.total).padStart(2,'0')}`;
      progressChapter.textContent=snapshot.index<3?'ACT I / ORIGINS & PATHS':'ACT II / LIGHT IN MOTION';
      progressState.textContent=`${String(Math.min(snapshot.index+1,snapshot.total)).padStart(2,'0')} OF ${String(snapshot.total).padStart(2,'0')}`;
      progressTrack.setAttribute('aria-label',`Experiment ${Math.min(snapshot.index+1,snapshot.total)} of ${snapshot.total}. ${snapshot.index<3?'Core':'Advanced'} chapter.`);
      progressTrack.querySelectorAll('[data-stage]').forEach((node,index)=>{
        node.classList.toggle('is-active',index===snapshot.index && snapshot.phase!=='complete');
        node.classList.toggle('is-done',index<snapshot.index||(index===snapshot.index&&snapshot.phase==='complete'));
        node.classList.toggle('is-locked',index>=3&&!snapshot.advancedUnlocked);
      });
      modelType.textContent=snapshot.experiment?.intervention?'PATH PARAMETER':'PATH ABLATION';
      evidenceScope.textContent=`Scene geometry and display color are illustrative. TOA radiance is not modeled. ${snapshot.experiment?.limit||'The three core paths are separate teaching mechanisms.'}`;
      const mode=snapshot.experiment?.chartMode||'sky';
      root.dataset.lightPhenomenon=mode;
      root.dataset.lightIntervention=snapshot.interventionId||'none';

      root.dataset.atmosphericScattering=scene.mechanisms.atmosphericScattering?'on':'off';
      root.dataset.waterBackscatter=scene.mechanisms.waterBackscatter?'on':'off';
      root.dataset.surfaceReflection=scene.mechanisms.surfaceReflection?'on':'off';
      const modeFocus={sunset:'direct',depth:'depth',grazing:'surface'};
      const focusedPath=snapshot.phase==='complete'?'none':(modeFocus[mode]||pathForMechanism[snapshot.experiment?.mechanism]||'none');
      root.dataset.lightFocus=focusedPath;
      sceneFocus.textContent=focusedPath==='none'?'LIGHT / EXPERIMENT COMPLETE':`UNDER TEST / ${pathTitle[focusedPath]}`;
      const experimentConfig=snapshot.experiment?.intervention;
      const variableValue=snapshot.phase==='revealed'&&snapshot.interventionId?scene.visualValue:experimentConfig?.baseline;
      mechanismReadout.textContent=experimentConfig
        ?`${experimentConfig.label} / ${Number(variableValue).toFixed(experimentConfig.step<1?1:0)} ${experimentConfig.unit}`
        :`${pathTitle[focusedPath]||'THREE PATHS'} / ${snapshot.phase==='revealed'?'CHANGED':'BASELINE'}`;
      mechanismReadout.parentElement.hidden=snapshot.phase==='complete';
      evidenceTarget.textContent=focusedPath==='none'?'Three distinct optical paths':pathTitle[focusedPath];
      const reflectedSkyStatus=!scene.mechanisms.atmosphericScattering && scene.mechanisms.surfaceReflection
        ?'has no scattered-sky source'
        :(scene.mechanisms.surfaceReflection?'present':'removed');
      sceneSummary.textContent=experimentConfig
        ?`Conceptual geometry, not a solved light field. ${experimentConfig.label} is ${Number(variableValue).toFixed(experimentConfig.step<1?1:0)} ${experimentConfig.unit}. ${snapshot.experiment.limit}`
        :`Conceptual scene. Scattered sky ${scene.mechanisms.atmosphericScattering?'present':'removed'}; reflected-sky surface path ${reflectedSkyStatus}; water-leaving path ${scene.mechanisms.waterBackscatter?'present':'removed'}. Display color and geometry are illustrative.`;

      sky.classList.toggle('is-off',!scene.mechanisms.atmosphericScattering);
      ocean.style.setProperty('--light-water-color',scene.waterColor.css);
      waterSignal.style.opacity=scene.mechanisms.waterBackscatter?'1':'0.05';
      const surfaceContribution=scene.mechanisms.surfaceReflection && scene.mechanisms.atmosphericScattering;
      reflection.style.opacity=surfaceContribution?String(Math.min(.8,.18+scene.surfaceReflectance*2.3)):'0';
      directPath.setAttribute('d',mode==='grazing' && snapshot.interventionId==='grazing'
        ?'M945 185 C800 210 662 246 540 282'
        :'M770 70 C690 150 610 220 540 282');
      depthPath.classList.toggle('is-off',mode!=='depth');
      const depthLength=mode==='depth' && snapshot.interventionId==='depth'?Number(scene.visualValue):0;
      depthPath.style.opacity=mode==='depth'?String(Math.max(.24,1-depthLength/12)):'0';
      root.style.setProperty('--light-depth-strength',String(Math.min(.85,depthLength/9)));

      root.querySelector('.light-ray-atmosphere').classList.toggle('is-off',!scene.mechanisms.atmosphericScattering);
      root.querySelector('.light-ray-surface').classList.toggle('is-off',!surfaceContribution);
      root.querySelector('.light-ray-water').classList.toggle('is-off',!scene.mechanisms.waterBackscatter);
      [['atmosphere','.light-ray-atmosphere'],['surface','.light-ray-surface'],['water','.light-ray-water'],['direct','.light-ray-direct'],['depth','.light-ray-depth']]
        .forEach(([id,selector])=>root.querySelector(selector).classList.toggle('is-focus',focusedPath===id));
      [
        ['atmosphere','SCATTERED SKY',scene.mechanisms.atmosphericScattering],
        ['surface','SURFACE REFLECTION',surfaceContribution],
        ['water','WATER-LEAVING',scene.mechanisms.waterBackscatter],
        ['direct','DIRECT SUNLIGHT',true],
        ['depth','WATER ABSORPTION',true]
      ].forEach(([id,label,active])=>{
        const item=root.querySelector(`[data-path="${id}"]`);
        item.classList.toggle('is-off',!active);
        item.classList.toggle('is-focus',focusedPath===id);
        if (focusedPath===id) item.setAttribute('aria-current','step');
        else item.removeAttribute('aria-current');
        const pathStatus=id==='surface' && !scene.mechanisms.atmosphericScattering && scene.mechanisms.surfaceReflection
          ?'NO SKY SOURCE'
          :(active?'PRESENT':'REMOVED');
        item.textContent=`${label} · ${pathStatus}`;
      });

      if (snapshot.experiment) renderSpectrum(snapshot,scene);
      if (meta?.type==='explore') {
        const output=shell.overlay.querySelector('.light-explore-live');
        if (output) output.textContent=`${Number(snapshot.exploreValue).toFixed(experimentConfig?.step<1?1:0)} ${experimentConfig?.unit||''}`;
      } else renderPanel(snapshot);
    }

    return Object.freeze({
      render,
      dispose() { desktopQuery.removeEventListener('change',positionEvidence); }
    });
  }

  // Pure spectrum geometry is shared with numerical regression checks.
  window.GeoPlayLightView=Object.freeze({create,spectrumDomain,pathD});
})();
