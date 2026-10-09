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
        <section class="light-world" aria-label="Conceptual light-path scene">
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
          </svg>
          <div class="light-path-legend">
            <span data-path="atmosphere">SCATTERED SKY</span>
            <span data-path="surface">SURFACE REFLECTION</span>
            <span data-path="water">WATER-LEAVING</span>
          </div>
          <span class="light-display-note">DISPLAY COLOR / ILLUSTRATIVE</span>
        </section>

        <section class="light-spectrum-card" aria-label="Spectral consequence">
          <header><span class="light-spectrum-title">SPECTRUM</span><strong class="light-spectrum-mode">—</strong></header>
          <svg class="light-spectrum" viewBox="0 0 520 138" preserveAspectRatio="none" role="img" aria-label="Before and after spectrum">
            <line x1="12" y1="126" x2="508" y2="126" class="light-axis"></line>
            <path class="light-spectrum-before"></path>
            <path class="light-spectrum-after"></path>
            <text x="12" y="137">400</text><text x="248" y="137">550</text><text x="482" y="137">700 nm</text>
          </svg>
          <div class="light-spectrum-readout"><span class="light-spectrum-probe">—</span><span>BEFORE <b class="light-before-value">—</b></span><span>AFTER <b class="light-after-value">—</b></span></div>
        </section>
      </div>`;

    shell.hud.innerHTML=`
      <div class="light-hud-block"><span>EXPERIMENT</span><strong class="light-hud-count">01 / 03</strong></div>
      <div class="light-hud-block"><span>MODEL</span><strong>PATH ABLATION</strong></div>`;

    const root=shell.root;
    const sky=root.querySelector('.light-sky');
    const ocean=root.querySelector('.light-ocean');
    const reflection=root.querySelector('.light-surface-reflection');
    const waterSignal=root.querySelector('.light-water-signal');
    const beforePath=root.querySelector('.light-spectrum-before');
    const afterPath=root.querySelector('.light-spectrum-after');
    const spectrumMode=root.querySelector('.light-spectrum-mode');
    const beforeValue=root.querySelector('.light-before-value');
    const afterValue=root.querySelector('.light-after-value');
    const probeLabel=root.querySelector('.light-spectrum-probe');
    const spectrumSvg=root.querySelector('.light-spectrum');
    const count=root.querySelector('.light-hud-count');

    function renderSpectrum(snapshot,scene) {
      const chart=scene.chart;
      const domainMax=spectrumDomain(chart.before,chart.after);
      // The baseline is y=126 in the 138-unit SVG viewBox. Both traces
      // share the same Y domain, so removing a signal cannot rescale it.
      beforePath.setAttribute('d',pathD(chart.before,520,138,domainMax));
      afterPath.setAttribute('d',pathD(chart.after,520,138,domainMax));
      spectrumSvg.dataset.yMax=String(domainMax);
      spectrumMode.textContent=snapshot.experiment?.chartLabel || '—';
      const wavelengths=chart.wavelengthNm || [];
      const probeIndex=wavelengths.length
        ? wavelengths.reduce((best,wavelength,index)=>
          Math.abs(wavelength-550)<Math.abs(wavelengths[best]-550)?index:best,0)
        : 0;
      const probeNm=wavelengths[probeIndex]??550;
      probeLabel.textContent=`${probeNm} NM · ${chart.unit==='sr⁻¹'?'Rrs / sr⁻¹':'RELATIVE'}`;
      beforeValue.textContent=formatValue(chart.before[probeIndex]??0,chart.unit);
      afterValue.textContent=formatValue(chart.after[probeIndex]??0,chart.unit);
    }

    function button(label,onClick,{secondary=false,disabled=false}={}) {
      const node=document.createElement('button');
      node.type='button';
      node.className=`light-action${secondary?' is-secondary':''}`;
      node.textContent=label;
      node.disabled=disabled;
      node.addEventListener('click',onClick);
      return node;
    }

    function renderPanel(snapshot) {
      const exp=snapshot.experiment;
      shell.overlay.innerHTML='';
      const panel=document.createElement('section');
      panel.className='light-panel';
      if (snapshot.phase==='complete') {
        panel.innerHTML=`
          <span>TRACE COMPLETE</span>
          <h2>ONE COLOR. MULTIPLE PATHS.</h2>
          <p>Sky scattering, surface reflection, and water-leaving radiance are different mechanisms. Removing one does not remove the others.</p>
          <div class="light-limit">WATER / QUANTITATIVE Rrs · ATMOSPHERE + SURFACE / TEACHING MODELS</div>`;
        panel.appendChild(button('PLAY AGAIN',callbacks.onRestart));
        shell.overlay.appendChild(panel);
        return;
      }

      panel.innerHTML=`<span>${exp.index} / MECHANISM</span><h2>${exp.title}</h2><p>${exp.question}</p>`;

      if (snapshot.phase==='question') {
        const choices=document.createElement('div');
        choices.className='light-choices';
        exp.choices.forEach(choice=>{
          const selected=snapshot.selection===choice.id;
          const choiceButton=button(choice.label,()=>callbacks.onSelect(choice.id),{secondary:!selected});
          choiceButton.classList.add('light-choice');
          choiceButton.setAttribute('aria-pressed',String(selected));
          choices.appendChild(choiceButton);
        });
        panel.appendChild(choices);
        panel.appendChild(button('COMMIT PREDICTION',callbacks.onCommit,{disabled:!snapshot.selection}));
      } else if (snapshot.phase==='committed') {
        const committed=document.createElement('div');
        committed.className='light-committed';
        const selected=exp.choices.find(choice=>choice.id===snapshot.selection)?.label || '—';
        committed.innerHTML=`<small>YOUR PREDICTION</small><strong>${selected}</strong>`;
        panel.appendChild(committed);
        panel.appendChild(button(exp.action,callbacks.onPerturb));
      } else if (snapshot.phase==='revealed') {
        panel.classList.add(snapshot.correct?'is-correct':'is-revised');
        panel.innerHTML+=`
          <div class="light-verdict"><small>${snapshot.correct?'PREDICTION HELD':'PREDICTION REVISED'}</small><strong>${exp.revealTitle}</strong></div>
          <p>${exp.reveal}</p>
          <code>${exp.equation}</code>
          <div class="light-limit">${exp.limit}</div>`;
        panel.appendChild(button(snapshot.index===snapshot.total-1?'FINISH TRACE':'NEXT EXPERIMENT',callbacks.onNext));
      }
      shell.overlay.appendChild(panel);
    }

    function render(snapshot,scene) {
      shell.setState(snapshot.phase);
      shell.setStatus(snapshot.phase==='revealed'?'MECHANISM REMOVED':snapshot.phase==='complete'?'TRACE COMPLETE':'NORMAL WORLD');
      count.textContent=`${String(Math.min(snapshot.index+1,snapshot.total)).padStart(2,'0')} / ${String(snapshot.total).padStart(2,'0')}`;

      root.dataset.atmosphericScattering=scene.mechanisms.atmosphericScattering?'on':'off';
      root.dataset.waterBackscatter=scene.mechanisms.waterBackscatter?'on':'off';
      root.dataset.surfaceReflection=scene.mechanisms.surfaceReflection?'on':'off';

      sky.classList.toggle('is-off',!scene.mechanisms.atmosphericScattering);
      ocean.style.setProperty('--light-water-color',scene.waterColor.css);
      waterSignal.style.opacity=scene.mechanisms.waterBackscatter?'1':'0.05';
      const surfaceContribution=scene.mechanisms.surfaceReflection && scene.mechanisms.atmosphericScattering;
      reflection.style.opacity=surfaceContribution?String(Math.min(.72,.24+scene.surfaceReflectance*10)):'0';

      root.querySelector('.light-ray-atmosphere').classList.toggle('is-off',!scene.mechanisms.atmosphericScattering);
      root.querySelector('.light-ray-surface').classList.toggle('is-off',!surfaceContribution);
      root.querySelector('.light-ray-water').classList.toggle('is-off',!scene.mechanisms.waterBackscatter);
      root.querySelector('[data-path="atmosphere"]').classList.toggle('is-off',!scene.mechanisms.atmosphericScattering);
      root.querySelector('[data-path="surface"]').classList.toggle('is-off',!surfaceContribution);
      root.querySelector('[data-path="water"]').classList.toggle('is-off',!scene.mechanisms.waterBackscatter);

      if (snapshot.experiment) renderSpectrum(snapshot,scene);
      renderPanel(snapshot);
    }

    return Object.freeze({render});
  }

  // Pure spectrum geometry is shared with numerical regression checks.
  window.GeoPlayLightView=Object.freeze({create,spectrumDomain,pathD});
})();
