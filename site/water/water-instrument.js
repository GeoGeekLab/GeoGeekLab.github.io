import {
  WATER_DEFAULT_STATE,
  WATER_REFERENCE_STATES,
  WATER_WAVELENGTHS_NM,
  WATER_MODEL_META,
  computeWaterOptics
} from './water-model.js';
import {
  WATER_SENSOR_DEFINITIONS,
  sampleSensorRrs
} from './sensor-observation.js';

const STYLE_URL = new URL('./water-instrument.css?v=20261007d', import.meta.url).href;

function ensureStyle(){
  if(document.querySelector('link[data-water-instrument-style]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=STYLE_URL;
  link.dataset.waterInstrumentStyle='1';
  document.head.appendChild(link);
}

const pathNotes={
  atmosphere:['ATMOSPHERE · NOT MODELED','The atmospheric path is context only. V1 does not calculate top-of-atmosphere radiance, Rayleigh/aerosol terms, or atmospheric correction.'],
  interface:['AIR–WATER INTERFACE','Subsurface rrs and above-water Rrs are distinct AOPs. V1 applies an explicit interface-transfer approximation. The dashed surface path marks glint context and is excluded from the numerical Rrs.'],
  water:['WATER COLUMN','Absorption and backscattering are IOPs. Together they condition the light field before idealized water-leaving reflectance is formed.'],
  sensor:['SENSOR CONTEXT · NOT MODELED','V1 ends at continuous above-water Rrs. Sensor spectral-response functions, band integration, and retrieval algorithms are not applied.']
};

function clamp(v,min,max){return Math.max(min,Math.min(max,v));}
function logToSlider(value,min,max){const lo=Math.log(min),hi=Math.log(max);return Math.round((Math.log(value)-lo)/(hi-lo)*1000);}
function sliderToLog(value,min,max){const lo=Math.log(min),hi=Math.log(max);return Math.exp(lo+(Number(value)/1000)*(hi-lo));}
function format(value,digits){if(value===0)return '0';if(Math.abs(value)<0.001)return value.toExponential(2);return value.toFixed(digits);}
function wavelengthIndex(wl){return clamp(Math.round(wl)-400,0,WATER_WAVELENGTHS_NM.length-1);}

function markup(){
  return `
  <div class="water-lab" data-mode="path">
    <section class="water-main">
      <section class="water-scene-panel">
        <div class="water-mini-head">
          <div><span data-role="scene-label">RADIATIVE PATH</span><strong data-role="scene-title">From illumination to idealized water-leaving reflectance.</strong></div>
          <div class="water-internal-modes" role="group" aria-label="Water observation mode">
            <button type="button" data-water-mode="path" aria-pressed="true">PATH</button>
            <button type="button" data-water-mode="iop" aria-pressed="false">IOP</button>
            <button type="button" data-water-mode="sensor" aria-pressed="false">SENSOR</button>
          </div>
        </div>
        <div class="water-scene" data-role="scene" data-path-focus="water">
          <svg viewBox="0 0 1200 390" role="img" aria-label="Conceptual light path through atmosphere, water surface and optically deep water">
            <rect class="atmosphere" x="0" y="0" width="1200" height="165"></rect>
            <rect class="water-field" x="0" y="180" width="1200" height="210"></rect>
            <line class="surface" x1="0" y1="180" x2="1200" y2="180"></line>
            <g class="sun"><circle cx="150" cy="70" r="28"></circle><line x1="150" y1="25" x2="150" y2="10"></line><line x1="105" y1="70" x2="90" y2="70"></line><line x1="195" y1="70" x2="210" y2="70"></line></g>
            <g class="sensor"><path d="M1010 42h74l17 23-17 23h-74l-17-23z"></path><circle cx="1047" cy="65" r="8"></circle></g>
            <path class="ray ray-down" d="M178 95 C 300 132, 390 148, 480 181 C 520 220, 548 260, 590 310"></path>
            <path class="ray ray-up" d="M590 310 C 660 264, 710 222, 755 181 C 830 132, 905 104, 1007 82"></path>
            <path class="ray ray-surface" d="M480 181 C 615 158, 770 139, 930 121"></path><text class="excluded" x="750" y="135">GLINT PATH · EXCLUDED</text>
            <g class="water-constituents">
              <g class="water-constituent chl"><circle cx="315" cy="250" r="9"></circle><circle cx="350" cy="278" r="6"></circle><circle cx="290" cy="306" r="5"></circle><circle cx="390" cy="320" r="8"></circle></g>
              <g class="water-constituent cdom"><path d="M710 242c28 12 53 7 75-7"></path><path d="M690 287c35 15 70 12 106-9"></path><path d="M735 330c25 8 50 5 76-8"></path></g>
              <g class="water-constituent particle"><rect x="890" y="238" width="10" height="10"></rect><rect x="925" y="270" width="7" height="7"></rect><rect x="865" y="310" width="8" height="8"></rect><rect x="948" y="330" width="11" height="11"></rect></g>
            </g>
            <text x="38" y="30">SOLAR INPUT</text><text x="38" y="150">ATMOSPHERE · NOT MODELED</text><text x="38" y="202">AIR–WATER INTERFACE</text><text x="38" y="370">OPTICALLY DEEP WATER</text><text x="988" y="108">SENSOR CONTEXT · NOT MODELED</text>
            <text class="logic" x="515" y="245">a(λ)</text><text class="logic" x="625" y="245">bb(λ)</text><text class="logic" x="518" y="360">IOPs → u(λ) → rrs(λ) → Rrs(λ)</text>
          </svg>
          <div class="water-path-steps" role="group" aria-label="Light path step">
            <button type="button" data-path-step="atmosphere">ATMOSPHERE</button>
            <button type="button" data-path-step="interface">INTERFACE</button>
            <button type="button" data-path-step="water" aria-pressed="true">WATER</button>
            <button type="button" data-path-step="sensor">SENSOR</button>
          </div>
          <div class="water-path-note"><b data-role="path-label">WATER COLUMN</b><p data-role="path-note"></p></div>
          <div class="water-sensor-scene" data-role="sensor-scene">
            <div class="water-sensor-intro">
              <span>OBSERVATION LAYER</span>
              <strong data-role="sensor-name">Sentinel-3 OLCI</strong>
              <p>Continuous idealized Rrs is averaged through simplified rectangular bandpasses. Changing the sensor never changes the water state or continuous Rrs.</p>
            </div>
            <div class="water-sensor-strip-wrap">
              <div class="water-sensor-strip-axis"><span>400</span><b>WAVELENGTH · nm</b><span>700</span></div>
              <div class="water-sensor-strip" data-role="sensor-strip" aria-label="Sensor bands from 400 to 700 nanometres"></div>
            </div>
            <div class="water-sensor-flow"><span>CONTINUOUS Rrs(λ)</span><i>→</i><span>SIMPLIFIED BANDPASS</span><i>→</i><strong data-role="sensor-count">—</strong></div>
          </div>
        </div>
      </section>

      <section class="water-spectra-panel" data-role="spectrum-panel" tabindex="0" aria-label="Linked water optical spectra">
        <div class="water-spectra-head"><span data-role="spectra-label">SYNC / ONE STATE · ONE PROBE</span><strong data-role="spectra-hint">← → 1 nm · SHIFT 10 nm</strong></div>
        <div class="water-chart-stack">
          <figure class="water-chart"><figcaption><strong>a(λ)</strong><span>ABSORPTION · m⁻¹</span><em data-role="a-probe">—</em><small data-role="a-scale">AUTO Y</small></figcaption><svg data-chart="a" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></figure>
          <figure class="water-chart"><figcaption><strong>bb(λ)</strong><span>BACKSCATTER · m⁻¹</span><em data-role="bb-probe">—</em><small data-role="bb-scale">AUTO Y</small></figcaption><svg data-chart="bb" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></figure>
          <figure class="water-chart"><figcaption><strong>Rrs(λ)</strong><span>IDEALIZED ABOVE-WATER · sr⁻¹</span><em data-role="rrs-probe">—</em><small data-role="Rrs-scale">AUTO Y</small></figcaption><svg data-chart="Rrs" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></figure>
        </div>
      </section>
    </section>

    <aside class="water-control-rail" aria-label="Water optical controls">
      <section class="water-rail-section">
        <div class="water-rail-heading"><span>REFERENCE STATES</span><small>Pedagogical states</small></div>
        <div class="water-presets">
          <button type="button" data-preset="clearOcean">CLEAR OCEAN</button><button type="button" data-preset="phytoplanktonRich">PHYTO-RICH</button>
          <button type="button" data-preset="cdomRich">CDOM-RICH</button><button type="button" data-preset="turbidParticleRich">PARTICLE-RICH</button>
        </div>
      </section>
      <section class="water-rail-section">
        <div class="water-rail-heading"><span>WATER STATE</span><small>Inputs, not satellite products</small></div>
        <label class="water-slider"><span><b>CHLOROPHYLL</b><output data-output="chl"></output></span><input data-control="chl" type="range" min="0" max="1000" step="1"><small>Chl → aph(λ) → a(λ)</small></label>
        <label class="water-slider"><span><b>CDOM · ag(440)</b><output data-output="ag440"></output></span><input data-control="ag440" type="range" min="0" max="2" step=".005"><small>ag(440) → ag(λ) → a(λ)</small></label>
        <div class="water-particle-group"><p>PARTICLES / absorption and backscatter stay independent.</p>
          <label class="water-slider"><span><b>NAP · aNAP(443)</b><output data-output="aNap443"></output></span><input data-control="aNap443" type="range" min="0" max="1" step=".002"><small>aNAP(443) → aNAP(λ)</small></label>
          <label class="water-slider"><span><b>BACKSCATTER · bbp(443)</b><output data-output="bbp443"></output></span><input data-control="bbp443" type="range" min="0" max="1000" step="1"><small>bbp(443) → bbp(λ) → bb(λ)</small></label>
        </div>
      </section>
      <section class="water-rail-section water-sensor-controls">
        <div class="water-rail-heading"><span>SENSOR OBSERVATION</span><small>Rrs sampling only</small></div>
        <div class="water-sensor-select" role="group" aria-label="Sensor">
          <button type="button" data-sensor="olci">OLCI</button>
          <button type="button" data-sensor="pace-oci">PACE OCI</button>
          <button type="button" data-sensor="s2-msi">MSI</button>
          <button type="button" data-sensor="landsat-oli">OLI</button>
        </div>
        <div class="water-sensor-contract">
          <span><small>INPUT</small><b>Idealized Rrs</b></span>
          <span><small>RESPONSE</small><b>Simplified top-hat</b></span>
          <span><small>ATMOSPHERE</small><b>Not applied</b></span>
        </div>
        <div class="water-sensor-nearest"><small>NEAREST BAND TO PROBE</small><strong data-role="sensor-nearest">—</strong></div>
        <div class="water-sensor-band-list" data-role="sensor-band-list" aria-label="Band-averaged Rrs"></div>
      </section>
      <section class="water-rail-section">
        <div class="water-rail-heading"><span>WAVELENGTH PROBE</span><strong data-role="probe-nm">443 nm</strong></div>
        <input class="water-probe-input" data-role="probe-control" type="range" min="400" max="700" step="1" value="443">
        <div class="water-probe-summary"><span><small>a</small><b data-role="probe-a">—</b></span><span><small>bb</small><b data-role="probe-bb">—</b></span><span><small>Rrs</small><b data-role="probe-Rrs">—</b></span></div>
      </section>
      <section class="water-rail-section">
        <div class="water-rail-heading"><span>COMPONENT BUDGET</span><small data-role="budget-nm">443 nm</small></div>
        <div class="water-budget-block"><strong>ABSORPTION</strong><div data-role="abs-budget"></div></div>
        <div class="water-budget-block"><strong>BACKSCATTERING</strong><div data-role="bb-budget"></div></div>
      </section>
      <section class="water-rail-section"><div class="water-rail-heading"><span>CAUSAL READOUT</span><small>Latest intervention</small></div><p class="water-causal" data-role="causal">REFERENCE STATE → IOPs → u(λ) → rrs(λ) → Rrs(λ)</p></section>
      <section class="water-rail-section water-inspect-only">
        <div class="water-rail-heading"><span>MODEL CONTRACT</span><small>Inspect</small></div>
        <div class="water-inspect-grid">
          <span><small>DOMAIN</small><b>400–700 nm · 1 nm</b></span><span><small>BASELINE</small><b>20 °C · 35 PSU</b></span>
          <span><small>Sg</small><b>0.0176 nm⁻¹ · fixed mean</b></span><span><small>SNAP</small><b>0.0123 nm⁻¹ · fixed mean</b></span>
          <span><small>η</small><b>1.0 · teaching assumption</b></span><span><small>IOP→AOP</small><b>Gordon / GIOP form</b></span>
          <span><small>INTERFACE</small><b>Lee et al. approximation</b></span><span><small>GEOMETRY</small><b>Not solved in V1</b></span>
          <span><small>rrs</small><b data-role="probe-rrs">—</b></span><span><small>u</small><b data-role="probe-u">—</b></span>
        </div>
      </section>
    </aside>
  </div>`;
}

function budgetRow(component,label,value,total){
  const pct=total>0?clamp(value/total*100,0,100):0;
  return `<div class="water-budget-row" data-component="${component}"><span>${label}</span><div class="water-budget-track"><div class="water-budget-fill" style="width:${pct.toFixed(2)}%"></div></div><output>${format(value,4)}</output></div>`;
}

export async function mountWaterInstrument({stage,signal}={}){
  ensureStyle();
  if(!stage || signal?.aborted) return ()=>{};
  stage.innerHTML=markup();
  const root=stage.querySelector('.water-lab');
  const q=(s)=>root.querySelector(s);
  const qa=(s)=>[...root.querySelectorAll(s)];
  const cleanup=[];
  const on=(node,type,handler,opts)=>{node?.addEventListener(type,handler,opts);if(node)cleanup.push(()=>node.removeEventListener(type,handler,opts));};

  let state={...WATER_DEFAULT_STATE};
  let model=computeWaterOptics(state);
  let probeNm=443;
  let preset='';
  let sensorId='olci';
  let sensorObservation=sampleSensorRrs(WATER_WAVELENGTHS_NM,model.Rrs,sensorId);
  let causal='REFERENCE STATE → IOPs → u(λ) → rrs(λ) → Rrs(λ)';

  const controls={chl:q('[data-control="chl"]'),ag440:q('[data-control="ag440"]'),aNap443:q('[data-control="aNap443"]'),bbp443:q('[data-control="bbp443"]')};

  function syncControls(){
    controls.chl.value=String(logToSlider(state.chl,.02,25));
    controls.ag440.value=String(state.ag440);
    controls.aNap443.value=String(state.aNap443);
    controls.bbp443.value=String(logToSlider(state.bbp443,.0001,.03));
    q('[data-output="chl"]').textContent=state.chl.toFixed(state.chl<1?2:1)+' mg m⁻³';
    q('[data-output="ag440"]').textContent=state.ag440.toFixed(3)+' m⁻¹';
    q('[data-output="aNap443"]').textContent=state.aNap443.toFixed(3)+' m⁻¹';
    q('[data-output="bbp443"]').textContent=state.bbp443.toFixed(4)+' m⁻¹';
  }
  function syncScene(){
    const scene=q('[data-role="scene"]');
    const chlNorm=(Math.log(state.chl)-Math.log(.02))/(Math.log(25)-Math.log(.02));
    const cdomNorm=state.ag440/2;
    const particleNorm=Math.max(state.aNap443,(Math.log(state.bbp443)-Math.log(.0001))/(Math.log(.03)-Math.log(.0001)));
    scene.style.setProperty('--chl-opacity',String(.18+.72*clamp(chlNorm,0,1)));
    scene.style.setProperty('--cdom-opacity',String(.16+.76*clamp(cdomNorm,0,1)));
    scene.style.setProperty('--particle-opacity',String(.18+.72*clamp(particleNorm,0,1)));
  }
  function renderChart(svg,values,formatter,scaleNode,{sensorOverlay=false}={}){
    const left=52,right=984,top=14,bottom=151;
    const max=Math.max(...values), yMax=max>0?max*1.08:1;
    if(scaleNode) scaleNode.textContent='AUTO Y · 0–'+formatter(yMax);
    const x=wl=>left+(wl-400)/300*(right-left);
    const y=v=>bottom-v/yMax*(bottom-top);
    const path=values.map((v,i)=>(i?'L':'M')+x(400+i).toFixed(2)+' '+y(v).toFixed(2)).join(' ');
    const area=path+' L '+right+' '+bottom+' L '+left+' '+bottom+' Z';
    const i=wavelengthIndex(probeNm), px=x(probeNm), py=y(values[i]);
    const sensorMarks=sensorOverlay && root.dataset.mode==='sensor'
      ? sensorObservation.bands.map(band=>{
          const lo=Math.max(400,band.supportNm[0]),hi=Math.min(700,band.supportNm[1]);
          if(hi<=lo) return '';
          const rect=`<rect class="water-sensor-band-window${band.status==='full'?'':' is-partial'}" x="${x(lo)}" y="${top}" width="${Math.max(1,x(hi)-x(lo))}" height="${bottom-top}"></rect>`;
          const dot=band.value==null?'':`<circle class="water-sensor-sample-dot" data-band-id="${band.id}" cx="${x(band.centerNm)}" cy="${y(band.value)}" r="3.2"></circle>`;
          return rect+dot;
        }).join('')
      : '';
    svg.innerHTML=[0,.5,1].map(t=>{const yy=bottom-t*(bottom-top);return `<line class="water-grid-line" x1="${left}" y1="${yy}" x2="${right}" y2="${yy}"></line><text class="water-axis-label" x="6" y="${yy+3}">${formatter(t*yMax)}</text>`;}).join('')+
      [400,450,500,550,600,650,700].map(wl=>{const xx=x(wl);return `<line class="water-grid-line" x1="${xx}" y1="${top}" x2="${xx}" y2="${bottom}"></line><text class="water-axis-label" text-anchor="middle" x="${xx}" y="174">${wl}</text>`;}).join('')+
      sensorMarks+
      `<path class="water-spectrum-area" d="${area}"></path><path class="water-spectrum-line" d="${path}"></path><line class="water-probe-line" x1="${px}" y1="${top}" x2="${px}" y2="${bottom}"></line><circle class="water-probe-dot" cx="${px}" cy="${py}" r="4"></circle><rect class="water-hit" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"></rect>`;
  }
  function renderProbe(){
    const i=wavelengthIndex(probeNm),a=model.absorption,bb=model.backscattering;
    q('[data-role="probe-nm"]').textContent=probeNm+' nm';
    q('[data-role="budget-nm"]').textContent=probeNm+' nm';
    q('[data-role="probe-control"]').value=String(probeNm);
    q('[data-role="probe-a"]').textContent=format(a.total[i],4)+' m⁻¹';
    q('[data-role="probe-bb"]').textContent=format(bb.total[i],5)+' m⁻¹';
    q('[data-role="probe-Rrs"]').textContent=format(model.Rrs[i],5)+' sr⁻¹';
    q('[data-role="probe-rrs"]').textContent=format(model.rrs[i],5)+' sr⁻¹';
    q('[data-role="probe-u"]').textContent=format(model.u[i],5);
    q('[data-role="a-probe"]').textContent=format(a.total[i],4)+' m⁻¹';
    q('[data-role="bb-probe"]').textContent=format(bb.total[i],5)+' m⁻¹';
    q('[data-role="rrs-probe"]').textContent=format(model.Rrs[i],5)+' sr⁻¹';
    q('[data-role="abs-budget"]').innerHTML=budgetRow('water','baseline',a.water[i],a.total[i])+budgetRow('phyto','phyto',a.phytoplankton[i],a.total[i])+budgetRow('cdom','CDOM',a.cdom[i],a.total[i])+budgetRow('nap','NAP',a.nap[i],a.total[i]);
    q('[data-role="bb-budget"]').innerHTML=budgetRow('water','baseline',bb.water[i],bb.total[i])+budgetRow('particles','particles',bb.particles[i],bb.total[i]);
  }
  function renderSensor(){
    const def=WATER_SENSOR_DEFINITIONS[sensorId];
    sensorObservation=sampleSensorRrs(WATER_WAVELENGTHS_NM,model.Rrs,sensorId);
    q('[data-role="sensor-name"]').textContent=def.label;
    q('[data-role="sensor-count"]').textContent=sensorObservation.sampledCount+' SAMPLED / '+sensorObservation.totalVisibleBands+' SHOWN';
    qa('[data-sensor]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.sensor===sensorId)));
    q('[data-role="sensor-strip"]').innerHTML=sensorObservation.bands.map(band=>{
      const lo=Math.max(400,band.supportNm[0]),hi=Math.min(700,band.supportNm[1]);
      if(hi<=lo)return '';
      const left=(lo-400)/3,width=Math.max(.45,(hi-lo)/3);
      return `<button type="button" class="water-sensor-strip-band${band.status==='full'?'':' is-partial'}" data-sensor-band="${band.id}" style="left:${left}%;width:${width}%" title="${band.label} · ${band.centerNm} nm · ${band.widthNm} nm"></button>`;
    }).join('');
    q('[data-role="sensor-band-list"]').innerHTML=sensorObservation.bands.map(band=>{
      const value=band.value==null?'DOMAIN EDGE':format(band.value,5)+' sr⁻¹';
      return `<button type="button" data-sensor-band="${band.id}" class="${band.status==='full'?'':'is-partial'}"><span>${band.label}</span><small>${band.centerNm} / ${band.widthNm} nm</small><strong>${value}</strong></button>`;
    }).join('');
    const full=sensorObservation.bands.filter(b=>b.value!=null);
    const nearest=full.reduce((best,b)=>!best||Math.abs(b.centerNm-probeNm)<Math.abs(best.centerNm-probeNm)?b:best,null);
    q('[data-role="sensor-nearest"]').textContent=nearest?nearest.label+' · '+nearest.centerNm+' nm · '+format(nearest.value,5)+' sr⁻¹':'—';
  }
  function render(){
    model=computeWaterOptics(state);
    syncControls();syncScene();renderSensor();
    renderChart(q('[data-chart="a"]'),model.absorption.total,v=>format(v,2),q('[data-role="a-scale"]'));
    renderChart(q('[data-chart="bb"]'),model.backscattering.total,v=>format(v,4),q('[data-role="bb-scale"]'));
    renderChart(q('[data-chart="Rrs"]'),model.Rrs,v=>format(v,4),q('[data-role="Rrs-scale"]'),{sensorOverlay:true});
    renderProbe();
    q('[data-role="causal"]').textContent=causal;
    qa('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));
  }
  function setProbe(value){probeNm=clamp(Math.round(Number(value)),400,700);render();}
  function setState(partial,nextCausal,nextPreset=''){state={...state,...partial};causal=nextCausal;preset=nextPreset;render();}
  function setMode(mode){
    root.dataset.mode=mode;
    qa('[data-water-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.waterMode===mode)));
    q('[data-role="scene-label"]').textContent=mode==='path'?'RADIATIVE PATH':'INHERENT → APPARENT';
    q('[data-role="scene-title"]').textContent=mode==='path'?'From illumination to water-leaving reflectance.':'Water constituents alter the spectrum through IOPs.';
    if(mode==='iop') setPath('water');
  }
  function setPath(step){
    q('[data-role="scene"]').dataset.pathFocus=step;
    qa('[data-path-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pathStep===step)));
    q('[data-role="path-label"]').textContent=pathNotes[step][0];
    q('[data-role="path-note"]').textContent=pathNotes[step][1];
  }
  function pointerProbe(event,svg){
    const rect=svg.getBoundingClientRect(), viewX=(event.clientX-rect.left)/rect.width*1000;
    setProbe(400+clamp((viewX-52)/(984-52),0,1)*300);
  }

  qa('[data-water-mode]').forEach(b=>on(b,'click',()=>setMode(b.dataset.waterMode)));
  qa('[data-path-step]').forEach(b=>on(b,'click',()=>setPath(b.dataset.pathStep)));
  qa('[data-preset]').forEach(b=>on(b,'click',()=>setState(WATER_REFERENCE_STATES[b.dataset.preset],'PRESET → component IOPs → a(λ), bb(λ) → u(λ) → Rrs(λ)',b.dataset.preset)));

  on(controls.chl,'input',()=>setState({chl:sliderToLog(controls.chl.value,.02,25)},'Chl → aph(λ) → a(λ) → u(λ) → Rrs(λ)'));
  on(controls.ag440,'input',()=>setState({ag440:Number(controls.ag440.value)},'ag(440) → ag(λ) → a(λ) → u(λ) → Rrs(λ)'));
  on(controls.aNap443,'input',()=>setState({aNap443:Number(controls.aNap443.value)},'aNAP(443) → aNAP(λ) → a(λ) → u(λ) → Rrs(λ)'));
  on(controls.bbp443,'input',()=>setState({bbp443:sliderToLog(controls.bbp443.value,.0001,.03)},'bbp(443) → bbp(λ) → bb(λ) → u(λ) → Rrs(λ)'));
  on(q('[data-role="probe-control"]'),'input',e=>setProbe(e.target.value));

  qa('.water-chart svg').forEach(svg=>{
    let dragging=false;
    on(svg,'pointerdown',e=>{dragging=true;svg.setPointerCapture?.(e.pointerId);pointerProbe(e,svg);});
    on(svg,'pointermove',e=>{if(dragging||e.pointerType==='mouse')pointerProbe(e,svg);});
    on(svg,'pointerup',e=>{dragging=false;if(svg.hasPointerCapture?.(e.pointerId))svg.releasePointerCapture(e.pointerId);});
    on(svg,'pointercancel',()=>{dragging=false;});
  });
  on(q('[data-role="spectrum-panel"]'),'keydown',e=>{
    if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;
    e.preventDefault();const step=e.shiftKey?10:1;setProbe(probeNm+(e.key==='ArrowRight'?step:-step));
  });

  if(signal) on(signal,'abort',()=>cleanup.splice(0).forEach(fn=>fn()),{once:true});
  setMode('path');setPath('water');render();

  return ()=>{cleanup.splice(0).forEach(fn=>fn());if(stage.contains(root))root.remove();};
}

window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
window.GeoGeekInstrumentMounts.water=mountWaterInstrument;
window.GeoWaterSpectrum={mount:mountWaterInstrument,modelMeta:WATER_MODEL_META};
