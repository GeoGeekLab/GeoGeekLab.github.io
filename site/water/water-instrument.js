import {
  WATER_DEFAULT_STATE,
  WATER_REFERENCE_STATES,
  WATER_WAVELENGTHS_NM,
  WATER_MODEL_META,
  computeWaterOptics
} from './water-model.js';
import {
  WATER_SENSOR_DEFINITIONS,
  sampleSensorSpectrum
} from './sensor-observation.js';
import {
  ATMOSPHERE_DEFAULT_STATE,
  ATMOSPHERE_MODEL_META,
  computeAtmosphereObservation
} from './atmosphere-model.js';
import {
  buildCorrectionExperiment
} from './atmosphere-correction.js';

const STYLE_URL = new URL('./water-instrument.css?v=20261007m', import.meta.url).href;

function ensureStyle(){
  if(document.querySelector('link[data-water-instrument-style]')) return;
  const link=document.createElement('link');
  link.rel='stylesheet';
  link.href=STYLE_URL;
  link.dataset.waterInstrumentStyle='1';
  document.head.appendChild(link);
}

const pathNotes={
  overview:['RADIATIVE PATH','Select a stage to zoom the conceptual path. The overview keeps only the geometry; detailed labels appear only for the selected stage.'],
  atmosphere:['ATMOSPHERE','Incoming and outgoing light are modified by Rayleigh scattering, aerosol scattering, and transmission before a sensor receives the signal.'],
  interface:['AIR–WATER INTERFACE','Subsurface rrs and above-water Rrs are distinct AOPs. The interface transfer is modeled explicitly; the dashed glint path is context only and is excluded numerically.'],
  water:['WATER COLUMN','Absorption a(λ) and backscattering bb(λ) are IOPs. Together they determine u(λ), subsurface rrs(λ), and idealized above-water Rrs(λ).'],
  sensor:['SENSOR OBSERVATION','The sensor does not see a continuous spectrum. It integrates the pedagogical TOA reflectance through finite spectral bandpasses.']
};

const pathViews={
  overview:'0 0 1200 390',
  atmosphere:'55 0 1050 175',
  interface:'350 120 520 145',
  water:'215 170 770 215',
  sensor:'720 20 420 170'
};

const pathFocusData={
  overview:{equation:'SUN → ATMOSPHERE → INTERFACE → WATER → SENSOR',tags:['SELECT A STAGE','ARROW KEYS NAVIGATE']},
  atmosphere:{equation:'ρTOA* = ρR + ρA + T↓T↑ · πRrs',tags:['RAYLEIGH','AEROSOL','TRANSMISSION']},
  interface:{equation:'rrs → Rrs',tags:['INTERFACE TRANSFER','GLINT EXCLUDED']},
  water:{equation:'a(λ), bb(λ) → u(λ) → rrs(λ) → Rrs(λ)',tags:['ABSORPTION','BACKSCATTER','OPTICALLY DEEP']},
  sensor:{equation:'ρTOA*(λ) → BANDPASS → BAND-AVERAGED OBSERVATION',tags:['FINITE BANDS','MISSION RESPONSE','NO RETRIEVAL HERE']}
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
            <button type="button" data-water-mode="atmosphere" aria-pressed="false">ATM</button>
            <button type="button" data-water-mode="sensor" aria-pressed="false">SENSOR</button>
            <button type="button" data-water-mode="correction" aria-pressed="false">AC</button>
          </div>
        </div>
        <div class="water-scene" data-role="scene" data-path-focus="overview" tabindex="0" aria-label="Interactive radiative path. Use stage buttons or left and right arrow keys.">
          <svg data-role="path-svg" viewBox="0 0 1200 390" role="img" aria-label="Conceptual light path through atmosphere, water surface and optically deep water">
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
            <text data-path-label="atmosphere" x="38" y="30">SOLAR INPUT</text><text data-path-label="atmosphere" x="38" y="150">ATMOSPHERE · FIRST-ORDER MODEL</text><text data-path-label="interface" x="38" y="202">AIR–WATER INTERFACE</text><text data-path-label="water" x="38" y="370">OPTICALLY DEEP WATER</text><text data-path-label="sensor" x="988" y="108">SENSOR · SAMPLES ρTOA*</text>
            <text data-path-label="water" class="logic" x="515" y="245">a(λ)</text><text data-path-label="water" class="logic" x="625" y="245">bb(λ)</text><text data-path-label="water" class="logic" x="518" y="360">IOPs → u(λ) → rrs(λ) → Rrs(λ)</text>
            <g class="water-path-hotspots" aria-hidden="true">
              <rect data-path-hotspot="atmosphere" x="0" y="0" width="1200" height="165"></rect>
              <rect data-path-hotspot="interface" x="0" y="156" width="1200" height="62"></rect>
              <rect data-path-hotspot="water" x="0" y="218" width="1200" height="172"></rect>
              <rect data-path-hotspot="sensor" x="965" y="25" width="170" height="105"></rect>
            </g>
          </svg>
          <div class="water-path-dock">
            <div class="water-path-steps" role="group" aria-label="Radiative path stage">
              <button type="button" data-path-step="overview" aria-pressed="true">OVERVIEW</button>
              <button type="button" data-path-step="atmosphere">ATM</button>
              <button type="button" data-path-step="interface">INTERFACE</button>
              <button type="button" data-path-step="water">WATER</button>
              <button type="button" data-path-step="sensor">SENSOR</button>
            </div>
            <div class="water-path-context">
              <div class="water-path-note"><b data-role="path-label">RADIATIVE PATH</b><p data-role="path-note"></p></div>
              <div class="water-path-focus-summary">
                <strong data-role="path-equation">SUN → ATMOSPHERE → INTERFACE → WATER → SENSOR</strong>
                <div data-role="path-tags"></div>
              </div>
            </div>
          </div>
          <div class="water-atmosphere-scene" data-role="atmosphere-scene">
            <div class="water-atmosphere-intro">
              <div class="water-atmosphere-title">
                <span>ATMOSPHERE BUDGET · <b data-role="atm-probe-nm">—</b></span>
                <strong>Rrs <i>→</i> ρTOA*</strong>
              </div>
              <div class="water-atmosphere-dominant">
                <small>DOMINANT TERM</small>
                <b data-role="atm-dominant">—</b>
                <em data-role="atm-dominant-share">—</em>
              </div>
              <p>Rayleigh and aerosol path scattering are added to the directly transmitted water signal. The forward layer is deliberately first-order.</p>
            </div>
            <div class="water-atmosphere-equation" aria-label="Top of atmosphere teaching reflectance equation">
              <span>ρR</span><i>+</i><span>ρA</span><i>+</i><span>T↓T↑ · πRrs</span><i>=</i><strong>ρTOA*</strong>
            </div>
            <div class="water-atmosphere-budget">
              <div>
                <span>RAYLEIGH PATH</span><b data-role="atm-rayleigh">—</b><small data-role="atm-rayleigh-pct">—</small>
                <i><em data-role="atm-rayleigh-bar"></em></i>
              </div>
              <div>
                <span>AEROSOL PATH</span><b data-role="atm-aerosol">—</b><small data-role="atm-aerosol-pct">—</small>
                <i><em data-role="atm-aerosol-bar"></em></i>
              </div>
              <div>
                <span>WATER TRANSMITTED</span><b data-role="atm-water">—</b><small data-role="atm-water-pct">—</small>
                <i><em data-role="atm-water-bar"></em></i>
              </div>
            </div>
            <div class="water-atmosphere-meta">
              <span data-role="atm-geometry">—</span>
              <span data-role="atm-fraction">—</span>
            </div>
            <div class="water-atmosphere-scope">
              <span>EXCLUDED</span>
              <b>MULTIPLE SCATTERING · GASES · FOAM · ADJACENCY · GLINT</b>
            </div>
          </div>
          <div class="water-sensor-scene" data-role="sensor-scene">
            <div class="water-sensor-intro">
              <span>OBSERVATION LAYER</span>
              <strong data-role="sensor-name">Sentinel-3 OLCI</strong>
              <p>The pedagogical TOA reflectance is averaged through simplified rectangular bandpasses. Changing the sensor never changes the water or atmosphere state.</p>
            </div>
            <div class="water-sensor-strip-wrap">
              <div class="water-sensor-strip-axis"><span>400</span><b>WAVELENGTH · nm</b><span>700</span></div>
              <div class="water-sensor-strip" data-role="sensor-strip" aria-label="Sensor bands from 400 to 700 nanometres"></div>
            </div>
            <div class="water-sensor-flow"><span>CONTINUOUS ρTOA*(λ)</span><i>→</i><span>SIMPLIFIED BANDPASS</span><i>→</i><strong data-role="sensor-count">—</strong></div>
          </div>
          <div class="water-correction-scene" data-role="correction-scene">
            <div class="water-correction-intro">
              <span>ATMOSPHERIC CORRECTION EXPERIMENT</span>
              <strong>ρTOA* → Rrs_est</strong>
              <p>Subtract an assumed atmospheric path, then divide by assumed two-way transmission. Pressure and geometry are treated as known; aerosol AOT and spectral slope may be wrong.</p>
            </div>
            <div class="water-correction-equation">
              <strong>Rrs_est</strong><i>=</i><span>[ρTOA* − ρR(est) − ρA(est)]</span><i>/</i><span>[π · T↓(est)T↑(est)]</span>
            </div>
            <div class="water-correction-state">
              <div><span>TRUE AEROSOL</span><b data-role="corr-true-aerosol">—</b></div>
              <i>≠?</i>
              <div><span>ASSUMED AEROSOL</span><b data-role="corr-assumed-aerosol">—</b></div>
            </div>
            <div class="water-correction-metrics">
              <div><span>Rrs RMSE</span><b data-role="corr-rmse">—</b></div>
              <div><span>NEGATIVE λ</span><b data-role="corr-negative">—</b></div>
              <div><span>OC4 TRUE-Rrs</span><b data-role="corr-oc4-true">—</b></div>
              <div><span>OC4 CORRECTED</span><b data-role="corr-oc4-est">—</b></div>
              <div><span>OC4 Δ</span><b data-role="corr-oc4-bias">—</b></div>
            </div>
          </div>
        </div>
      </section>

      <section class="water-spectra-panel" data-role="spectrum-panel" tabindex="0" aria-label="Linked water optical spectra">
        <div class="water-spectra-head"><span data-role="spectra-label">SYNC / ONE STATE · ONE PROBE</span><strong data-role="spectra-hint">← → 1 nm · SHIFT 10 nm</strong></div>
        <div class="water-chart-stack">
          <figure class="water-chart" data-spectrum="absorption">
            <figcaption><strong>a(λ)</strong><span>ABSORPTION · m⁻¹</span><em data-role="a-probe">—</em><small data-role="a-scale">AUTO Y</small></figcaption>
            <div class="water-chart-plot"><svg data-chart="a" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></div>
            <aside class="water-chart-sidecar" data-sidecar="a" aria-label="Absorption spectrum diagnostics"></aside>
          </figure>
          <figure class="water-chart" data-spectrum="backscatter">
            <figcaption><strong>bb(λ)</strong><span>BACKSCATTER · m⁻¹</span><em data-role="bb-probe">—</em><small data-role="bb-scale">AUTO Y</small></figcaption>
            <div class="water-chart-plot"><svg data-chart="bb" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></div>
            <aside class="water-chart-sidecar" data-sidecar="bb" aria-label="Backscatter spectrum diagnostics"></aside>
          </figure>
          <figure class="water-chart water-chart-primary" data-spectrum="output">
            <figcaption><strong data-role="third-title">Rrs(λ)</strong><span data-role="third-subtitle">IDEALIZED ABOVE-WATER · sr⁻¹</span><em data-role="rrs-probe">—</em><small data-role="Rrs-scale">AUTO Y</small></figcaption>
            <div class="water-chart-plot"><svg data-chart="Rrs" viewBox="0 0 1000 180" preserveAspectRatio="none"></svg></div>
            <aside class="water-chart-sidecar water-output-sidecar" data-sidecar="output" aria-label="Output spectrum diagnostics"></aside>
          </figure>
        </div>
      </section>
    </section>

    <aside class="water-control-rail" aria-label="Water optical controls">
      <section class="water-rail-section water-primary-controls water-reference-controls">
        <div class="water-rail-heading"><span>REFERENCE STATES</span><small>Pedagogical states</small></div>
        <div class="water-presets">
          <button type="button" data-preset="clearOcean">CLEAR OCEAN</button><button type="button" data-preset="phytoplanktonRich">PHYTO-RICH</button>
          <button type="button" data-preset="cdomRich">CDOM-RICH</button><button type="button" data-preset="turbidParticleRich">PARTICLE-RICH</button>
        </div>
      </section>
      <section class="water-rail-section water-primary-controls water-state-controls">
        <div class="water-rail-heading"><span>WATER STATE</span><small>Inputs, not satellite products</small></div>
        <label class="water-slider"><span><b>CHLOROPHYLL</b><output data-output="chl"></output></span><input data-control="chl" type="range" min="0" max="1000" step="1"><small>Chl → aph(λ) → a(λ)</small></label>
        <label class="water-slider"><span><b>CDOM · ag(440)</b><output data-output="ag440"></output></span><input data-control="ag440" type="range" min="0" max="2" step=".005"><small>ag(440) → ag(λ) → a(λ)</small></label>
        <div class="water-particle-group"><p>PARTICLES / absorption and backscatter stay independent.</p>
          <label class="water-slider"><span><b>NAP · aNAP(443)</b><output data-output="aNap443"></output></span><input data-control="aNap443" type="range" min="0" max="1" step=".002"><small>aNAP(443) → aNAP(λ)</small></label>
          <label class="water-slider"><span><b>BACKSCATTER · bbp(443)</b><output data-output="bbp443"></output></span><input data-control="bbp443" type="range" min="0" max="1000" step="1"><small>bbp(443) → bbp(λ) → bb(λ)</small></label>
        </div>
      </section>
      <section class="water-rail-section water-atmosphere-controls">
        <div class="water-rail-heading"><span>ATMOSPHERE</span><small>First-order forward model</small></div>
        <label class="water-slider"><span><b>AOT · τa(550)</b><output data-atm-output="aot"></output></span><input data-atm-control="aot" type="range" min="0" max="0.5" step="0.005"><small>τa(λ) = τa(550) · (λ/550)^−α</small></label>
        <label class="water-slider"><span><b>ÅNGSTRÖM · α</b><output data-atm-output="alpha"></output></span><input data-atm-control="alpha" type="range" min="0" max="2.5" step="0.05"><small>Spectral aerosol optical-depth slope</small></label>
        <label class="water-slider"><span><b>SURFACE PRESSURE</b><output data-atm-output="pressure"></output></span><input data-atm-control="pressure" type="range" min="800" max="1050" step="1"><small>Scales Rayleigh optical thickness</small></label>
        <div class="water-atm-geometry-grid">
          <label><span>SUN ZENITH</span><output data-atm-output="sza"></output><input data-atm-control="sza" type="range" min="0" max="65" step="1"></label>
          <label><span>VIEW ZENITH</span><output data-atm-output="vza"></output><input data-atm-control="vza" type="range" min="0" max="50" step="1"></label>
          <label><span>REL AZIMUTH</span><output data-atm-output="raz"></output><input data-atm-control="raz" type="range" min="0" max="180" step="1"></label>
        </div>
        <div class="water-atmosphere-contract">
          <span><small>AEROSOL SSA</small><b>0.95 fixed</b></span>
          <span><small>HG g</small><b>0.70 fixed</b></span>
          <span><small>GASES / MULTI</small><b>Excluded</b></span>
        </div>
      </section>
      <section class="water-rail-section water-sensor-controls">
        <div class="water-rail-heading"><span>SENSOR OBSERVATION</span><small>TOA* sampling only</small></div>
        <div class="water-sensor-select" role="group" aria-label="Sensor">
          <button type="button" data-sensor="olci">OLCI</button>
          <button type="button" data-sensor="pace-oci">PACE OCI</button>
          <button type="button" data-sensor="s2-msi">MSI</button>
          <button type="button" data-sensor="landsat-oli">OLI</button>
        </div>
        <div class="water-sensor-contract">
          <span><small>INPUT</small><b>ρTOA*</b></span>
          <span><small>RESPONSE</small><b>Simplified top-hat</b></span>
          <span><small>ATMOSPHERE</small><b>First-order applied</b></span>
        </div>
        <div class="water-sensor-nearest"><small>NEAREST BAND TO PROBE</small><strong data-role="sensor-nearest">—</strong></div>
        <div class="water-sensor-band-list" data-role="sensor-band-list" aria-label="Band-averaged pedagogical TOA reflectance"></div>
      </section>
      <section class="water-rail-section water-correction-controls">
        <div class="water-rail-heading"><span>CORRECTION ASSUMPTION</span><small>Aerosol uncertainty only</small></div>
        <div class="water-correction-truth">
          <span><small>TRUE AOT / α</small><b data-role="corr-true-rail">—</b></span>
          <button type="button" data-correction-match>MATCH TRUE</button>
        </div>
        <label class="water-slider"><span><b>ASSUMED AOT · τa(550)</b><output data-corr-output="aot"></output></span><input data-corr-control="aot" type="range" min="0" max="0.5" step="0.005"><small>Wrong path amplitude can over- or under-subtract atmosphere.</small></label>
        <label class="water-slider"><span><b>ASSUMED ÅNGSTRÖM · α</b><output data-corr-output="alpha"></output></span><input data-corr-control="alpha" type="range" min="0" max="2.5" step="0.05"><small>Wrong spectral slope redistributes correction error by wavelength.</small></label>
        <div class="water-correction-presets">
          <button type="button" data-corr-preset="lowAot">AOT −0.05</button>
          <button type="button" data-corr-preset="highAot">AOT +0.05</button>
          <button type="button" data-corr-preset="lowAlpha">α −0.5</button>
          <button type="button" data-corr-preset="highAlpha">α +0.5</button>
        </div>
        <div class="water-correction-contract">
          <span><small>KNOWN</small><b>Pressure + geometry</b></span>
          <span><small>INVERSE</small><b>Same first-order physics</b></span>
          <span><small>NOT INCLUDED</small><b>NIR/SWIR aerosol retrieval</b></span>
        </div>
        <p class="water-correction-note">OC4 is a sensitivity diagnostic using NASA OLCI coefficients. It is compared against OC4 from the true Rrs, not against the model Chl control.</p>
      </section>
      <section class="water-rail-section water-readout-controls">
        <div class="water-rail-heading"><span>WAVELENGTH PROBE</span><strong data-role="probe-nm">443 nm</strong></div>
        <input class="water-probe-input" data-role="probe-control" type="range" min="400" max="700" step="1" value="443">
        <div class="water-probe-summary"><span><small>a</small><b data-role="probe-a">—</b></span><span><small>bb</small><b data-role="probe-bb">—</b></span><span><small>Rrs</small><b data-role="probe-Rrs">—</b></span><span><small>ρTOA*</small><b data-role="probe-toa">—</b></span><span class="water-correction-probe"><small>Rrs_est</small><b data-role="probe-Rrs-est">—</b></span></div>
      </section>
      <section class="water-rail-section water-budget-controls">
        <div class="water-rail-heading"><span>COMPONENT BUDGET</span><small data-role="budget-nm">443 nm</small></div>
        <div class="water-budget-block"><strong>ABSORPTION</strong><div data-role="abs-budget"></div></div>
        <div class="water-budget-block"><strong>BACKSCATTERING</strong><div data-role="bb-budget"></div></div>
      </section>
      <section class="water-rail-section water-causal-controls"><div class="water-rail-heading"><span>CAUSAL READOUT</span><small>Latest intervention</small></div><p class="water-causal" data-role="causal">REFERENCE STATE → IOPs → u(λ) → rrs(λ) → Rrs(λ)</p></section>
      <section class="water-rail-section water-inspect-only">
        <div class="water-rail-heading"><span>MODEL CONTRACT</span><small>Inspect</small></div>
        <div class="water-inspect-grid">
          <span><small>DOMAIN</small><b>400–700 nm · 1 nm</b></span><span><small>BASELINE</small><b>20 °C · 35 PSU</b></span>
          <span><small>Sg</small><b>0.0176 nm⁻¹ · fixed mean</b></span><span><small>SNAP</small><b>0.0123 nm⁻¹ · fixed mean</b></span>
          <span><small>η</small><b>1.0 · teaching assumption</b></span><span><small>IOP→AOP</small><b>Gordon / GIOP form</b></span>
          <span><small>INTERFACE</small><b>Lee et al. approximation</b></span><span><small>ATMOSPHERE</small><b>First-order · not correction</b></span>
          <span><small>RAYLEIGH</small><b>Hansen–Travis τR</b></span><span><small>AEROSOL</small><b>Ångström + HG phase</b></span>
          <span><small>GASES / MULTI</small><b>Excluded</b></span><span><small>GEOMETRY</small><b>Sun / view interactive</b></span>
          <span><small>AC INVERSE</small><b>Manual aerosol assumption</b></span><span><small>RETRIEVAL</small><b>OLCI OC4 · diagnostic only</b></span>
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
  let atmosphereState={...ATMOSPHERE_DEFAULT_STATE};
  let atmosphere=computeAtmosphereObservation(WATER_WAVELENGTHS_NM,model.Rrs,atmosphereState);
  let correctionAssumption={
    aerosolOpticalDepth550:ATMOSPHERE_DEFAULT_STATE.aerosolOpticalDepth550,
    angstromExponent:ATMOSPHERE_DEFAULT_STATE.angstromExponent
  };
  let correctionMatched=true;
  let correction=buildCorrectionExperiment(
    WATER_WAVELENGTHS_NM,
    model.Rrs,
    atmosphere.reflectance.toaApprox,
    atmosphereState,
    correctionAssumption
  );
  let probeNm=443;
  let preset='';
  let sensorId='olci';
  let sensorObservation=sampleSensorSpectrum(WATER_WAVELENGTHS_NM,atmosphere.reflectance.toaApprox,sensorId,'rhoTOA*');
  let causal='REFERENCE STATE → IOPs → u(λ) → rrs(λ) → Rrs(λ)';

  const controls={chl:q('[data-control="chl"]'),ag440:q('[data-control="ag440"]'),aNap443:q('[data-control="aNap443"]'),bbp443:q('[data-control="bbp443"]')};
  const atmControls={
    aot:q('[data-atm-control="aot"]'),
    alpha:q('[data-atm-control="alpha"]'),
    pressure:q('[data-atm-control="pressure"]'),
    sza:q('[data-atm-control="sza"]'),
    vza:q('[data-atm-control="vza"]'),
    raz:q('[data-atm-control="raz"]')
  };
  const corrControls={
    aot:q('[data-corr-control="aot"]'),
    alpha:q('[data-corr-control="alpha"]')
  };

  function syncControls(){
    controls.chl.value=String(logToSlider(state.chl,.02,25));
    controls.ag440.value=String(state.ag440);
    controls.aNap443.value=String(state.aNap443);
    controls.bbp443.value=String(logToSlider(state.bbp443,.0001,.03));
    q('[data-output="chl"]').textContent=state.chl.toFixed(state.chl<1?2:1)+' mg m⁻³';
    q('[data-output="ag440"]').textContent=state.ag440.toFixed(3)+' m⁻¹';
    q('[data-output="aNap443"]').textContent=state.aNap443.toFixed(3)+' m⁻¹';
    q('[data-output="bbp443"]').textContent=state.bbp443.toFixed(4)+' m⁻¹';

    atmControls.aot.value=String(atmosphereState.aerosolOpticalDepth550);
    atmControls.alpha.value=String(atmosphereState.angstromExponent);
    atmControls.pressure.value=String(atmosphereState.pressureHpa);
    atmControls.sza.value=String(atmosphereState.solarZenithDeg);
    atmControls.vza.value=String(atmosphereState.viewZenithDeg);
    atmControls.raz.value=String(atmosphereState.relativeAzimuthDeg);
    q('[data-atm-output="aot"]').textContent=atmosphereState.aerosolOpticalDepth550.toFixed(3);
    q('[data-atm-output="alpha"]').textContent=atmosphereState.angstromExponent.toFixed(2);
    q('[data-atm-output="pressure"]').textContent=Math.round(atmosphereState.pressureHpa)+' hPa';
    q('[data-atm-output="sza"]').textContent=Math.round(atmosphereState.solarZenithDeg)+'°';
    q('[data-atm-output="vza"]').textContent=Math.round(atmosphereState.viewZenithDeg)+'°';
    q('[data-atm-output="raz"]').textContent=Math.round(atmosphereState.relativeAzimuthDeg)+'°';

    corrControls.aot.value=String(correctionAssumption.aerosolOpticalDepth550);
    corrControls.alpha.value=String(correctionAssumption.angstromExponent);
    q('[data-corr-output="aot"]').textContent=correctionAssumption.aerosolOpticalDepth550.toFixed(3);
    q('[data-corr-output="alpha"]').textContent=correctionAssumption.angstromExponent.toFixed(2);
    q('[data-role="corr-true-rail"]').textContent=
      atmosphereState.aerosolOpticalDepth550.toFixed(3)+' / '+atmosphereState.angstromExponent.toFixed(2);
    q('[data-correction-match]').textContent=correctionMatched?'MATCHED':'MATCH TRUE';
    q('[data-correction-match]').setAttribute('aria-pressed',String(correctionMatched));
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
  function renderChart(svg,series,formatter,scaleNode,{sensorOverlay=false,showXAxis=false,allowNegative=false}={}){
    const left=52,right=984,top=12,bottom=158;
    const primary=series.find(item=>item.role==='primary')||series[0];
    const allValues=series.flatMap(item=>item.values);
    const rawMin=Math.min(...allValues);
    const rawMax=Math.max(...allValues);
    const yMin=allowNegative&&rawMin<0?rawMin*1.08:0;
    const yMax=rawMax>0?rawMax*1.08:(allowNegative?1e-6:1);
    const span=Math.max(1e-12,yMax-yMin);

    if(scaleNode) scaleNode.textContent='AUTO Y · '+formatter(yMin)+'–'+formatter(yMax);

    const x=wl=>left+(wl-400)/300*(right-left);
    const y=v=>bottom-(v-yMin)/span*(bottom-top);
    const makePath=values=>values.map((v,i)=>(i?'L':'M')+x(400+i).toFixed(2)+' '+y(v).toFixed(2)).join(' ');
    const primaryPath=makePath(primary.values);
    const zeroY=y(0);
    const area=primaryPath+' L '+right+' '+zeroY+' L '+left+' '+zeroY+' Z';
    const i=wavelengthIndex(probeNm),px=x(probeNm),py=y(primary.values[i]);

    const featureTicks=[443,490,510,560,665];
    const verticalGuides=[400,...featureTicks,700].map(wl=>{
      const xx=x(wl);
      const cls=featureTicks.includes(wl)?'water-feature-line':'water-grid-line';
      return `<line class="${cls}" x1="${xx}" y1="${top}" x2="${xx}" y2="${bottom}"></line>`;
    }).join('');

    const xLabels=showXAxis
      ? [400,...featureTicks,700].map(wl=>`<text class="water-axis-label water-axis-label-x" text-anchor="middle" x="${x(wl)}" y="176">${wl}</text>`).join('')
      : '';

    const horizontalGrid=[0,.5,1].map(t=>{
      const value=yMin+t*span;
      const yy=y(value);
      return `<line class="water-grid-line" x1="${left}" y1="${yy}" x2="${right}" y2="${yy}"></line><text class="water-axis-label" x="5" y="${yy+3}">${formatter(value)}</text>`;
    }).join('');

    const componentPaths=series.filter(item=>item!==primary).map(item=>{
      const role=item.role==='reference'?' water-spectrum-reference':' water-spectrum-component';
      return `<path class="${role.trim()} water-series-${item.id}" d="${makePath(item.values)}"></path>`;
    }).join('');

    const zeroLine=allowNegative&&yMin<0&&yMax>0
      ? `<line class="water-zero-line" x1="${left}" y1="${zeroY}" x2="${right}" y2="${zeroY}"></line>`
      : '';

    const sensorMarks=sensorOverlay&&root.dataset.mode==='sensor'
      ? sensorObservation.bands.map(band=>{
          const lo=Math.max(400,band.supportNm[0]),hi=Math.min(700,band.supportNm[1]);
          if(hi<=lo)return '';
          const rect=`<rect class="water-sensor-band-window${band.status==='full'?'':' is-partial'}" x="${x(lo)}" y="${top}" width="${Math.max(1,x(hi)-x(lo))}" height="${bottom-top}"></rect>`;
          const dot=band.value==null?'':`<circle class="water-sensor-sample-dot" cx="${x(band.centerNm)}" cy="${y(band.value)}" r="3.2"></circle>`;
          return rect+dot;
        }).join('')
      : '';

    svg.innerHTML=
      horizontalGrid+
      verticalGuides+
      xLabels+
      sensorMarks+
      `<path class="water-spectrum-area" d="${area}"></path>`+
      zeroLine+
      componentPaths+
      `<path class="water-spectrum-line water-series-${primary.id}" d="${primaryPath}"></path>`+
      `<line class="water-probe-line" x1="${px}" y1="${top}" x2="${px}" y2="${bottom}"></line>`+
      `<circle class="water-probe-dot" cx="${px}" cy="${py}" r="4"></circle>`+
      `<rect class="water-hit" x="${left}" y="${top}" width="${right-left}" height="${bottom-top}"></rect>`;
  }

  function sidecarRow(label,value,{tone='',share=''}={}){
    return `<div class="water-sidecar-row ${tone}"><span>${label}</span><strong>${value}</strong>${share?`<em>${share}</em>`:''}</div>`;
  }

  function share(value,total){
    return total>0?(value/total*100).toFixed(1)+'%':'—';
  }

  function spectralPeak(values){
    let index=0;
    for(let i=1;i<values.length;i++) if(values[i]>values[index]) index=i;
    return Object.freeze({wavelength:400+index,value:values[index]});
  }

  function renderSidecars(){
    const i=wavelengthIndex(probeNm);
    const a=model.absorption;
    const bb=model.backscattering;

    q('[data-sidecar="a"]').innerHTML=
      `<div class="water-sidecar-head"><b>${probeNm} nm</b><span>COMPONENTS</span></div>`+
      sidecarRow('TOTAL',format(a.total[i],4),{tone:'is-total'})+
      sidecarRow('water',format(a.water[i],4),{tone:'is-water',share:share(a.water[i],a.total[i])})+
      sidecarRow('phyto',format(a.phytoplankton[i],4),{tone:'is-phyto',share:share(a.phytoplankton[i],a.total[i])})+
      sidecarRow('CDOM',format(a.cdom[i],4),{tone:'is-cdom',share:share(a.cdom[i],a.total[i])})+
      sidecarRow('NAP',format(a.nap[i],4),{tone:'is-nap',share:share(a.nap[i],a.total[i])})+
      `<div class="water-sidecar-unit">m⁻¹</div>`;

    q('[data-sidecar="bb"]').innerHTML=
      `<div class="water-sidecar-head"><b>${probeNm} nm</b><span>COMPONENTS</span></div>`+
      sidecarRow('TOTAL',format(bb.total[i],5),{tone:'is-total'})+
      sidecarRow('water',format(bb.water[i],5),{tone:'is-water',share:share(bb.water[i],bb.total[i])})+
      sidecarRow('particles',format(bb.particles[i],5),{tone:'is-particles',share:share(bb.particles[i],bb.total[i])})+
      sidecarRow('bbp slope η','1.00',{tone:'is-meta'})+
      `<div class="water-sidecar-unit">m⁻¹</div>`;

    const mode=root.dataset.mode;
    const output=q('[data-sidecar="output"]');

    if(mode==='atmosphere'){
      const r=atmosphere.reflectance;
      const total=r.toaApprox[i];
      output.innerHTML=
        `<div class="water-sidecar-head"><b>${probeNm} nm</b><span>TOA DECOMPOSITION</span></div>`+
        sidecarRow('ρTOA*',format(total,5),{tone:'is-total'})+
        sidecarRow('Rayleigh',format(r.rayleighPath[i],5),{tone:'is-rayleigh',share:share(r.rayleighPath[i],total)})+
        sidecarRow('aerosol',format(r.aerosolPath[i],5),{tone:'is-aerosol',share:share(r.aerosolPath[i],total)})+
        sidecarRow('water',format(r.waterTransmitted[i],5),{tone:'is-water',share:share(r.waterTransmitted[i],total)})+
        sidecarRow('atm path',(atmosphere.atmosphereFraction[i]*100).toFixed(1)+'%',{tone:'is-meta'});
      return;
    }

    if(mode==='sensor'){
      const full=sensorObservation.bands.filter(b=>b.value!=null);
      const nearest=full.reduce((best,b)=>!best||Math.abs(b.centerNm-probeNm)<Math.abs(best.centerNm-probeNm)?b:best,null);
      output.innerHTML=
        `<div class="water-sidecar-head"><b>${WATER_SENSOR_DEFINITIONS[sensorId].shortLabel}</b><span>NEAREST BAND</span></div>`+
        (nearest
          ? sidecarRow(nearest.label,nearest.centerNm+' nm',{tone:'is-total'})+
            sidecarRow('band ρTOA*',format(nearest.value,5))+
            sidecarRow('Δλ',nearest.widthNm+' nm')+
            sidecarRow('probe Δ',Math.abs(nearest.centerNm-probeNm).toFixed(1)+' nm',{tone:'is-meta'})
          : sidecarRow('band','DOMAIN EDGE',{tone:'is-meta'}));
      return;
    }

    if(mode==='correction'){
      const truth=model.Rrs[i];
      const est=correction.correction.estimatedRrs[i];
      const delta=est-truth;
      const rel=Math.abs(truth)>1e-8?delta/truth:null;
      output.innerHTML=
        `<div class="water-sidecar-head"><b>${probeNm} nm</b><span>AC ERROR</span></div>`+
        `<div class="water-sidecar-legend"><span><i class="is-est"></i>Rrs_est</span><span><i class="is-true"></i>true Rrs</span><span><i class="is-probe"></i>probe</span></div>`+
        sidecarRow('TRUE',format(truth,5),{tone:'is-total'})+
        sidecarRow('EST',format(est,5),{tone:est<0?'is-negative':''})+
        sidecarRow('ΔRrs',(delta>=0?'+':'')+format(delta,5))+
        sidecarRow('relative',rel==null?'—':(rel>=0?'+':'')+(rel*100).toFixed(1)+'%')+
        sidecarRow('negative λ',correction.diagnostics.negativeCount+' / '+WATER_WAVELENGTHS_NM.length,{tone:'is-meta'})+
        sidecarRow('RMSE',format(correction.diagnostics.rmse,6),{tone:'is-meta'})+
        sidecarRow('OC4 Δ',correction.oc4RelativeBias==null?'INVALID':(correction.oc4RelativeBias>=0?'+':'')+(correction.oc4RelativeBias*100).toFixed(1)+'%',{tone:'is-meta'});
      return;
    }

    const peak=spectralPeak(model.Rrs);
    output.innerHTML=
      `<div class="water-sidecar-head"><b>${probeNm} nm</b><span>WATER SIGNAL</span></div>`+
      sidecarRow('Rrs',format(model.Rrs[i],5),{tone:'is-total'})+
      sidecarRow('rrs',format(model.rrs[i],5))+
      sidecarRow('u',format(model.u[i],5))+
      sidecarRow('λmax',peak.wavelength+' nm',{tone:'is-meta'})+
      sidecarRow('peak Rrs',format(peak.value,5),{tone:'is-meta'})+
      `<div class="water-sidecar-unit">sr⁻¹</div>`;
  }

  function renderProbe(){
    const i=wavelengthIndex(probeNm),a=model.absorption,bb=model.backscattering;
    const toa=atmosphere.reflectance.toaApprox[i];
    const estimate=correction.correction.estimatedRrs[i];

    q('[data-role="probe-nm"]').textContent=probeNm+' nm';
    q('[data-role="budget-nm"]').textContent=probeNm+' nm';
    q('[data-role="probe-control"]').value=String(probeNm);
    q('[data-role="probe-a"]').textContent=format(a.total[i],4)+' m⁻¹';
    q('[data-role="probe-bb"]').textContent=format(bb.total[i],5)+' m⁻¹';
    q('[data-role="probe-Rrs"]').textContent=format(model.Rrs[i],5)+' sr⁻¹';
    q('[data-role="probe-toa"]').textContent=format(toa,5);
    q('[data-role="probe-Rrs-est"]').textContent=format(estimate,5)+' sr⁻¹';
    q('[data-role="probe-rrs"]').textContent=format(model.rrs[i],5)+' sr⁻¹';
    q('[data-role="probe-u"]').textContent=format(model.u[i],5);
    q('[data-role="a-probe"]').textContent=format(a.total[i],4)+' m⁻¹';
    q('[data-role="bb-probe"]').textContent=format(bb.total[i],5)+' m⁻¹';

    if(root.dataset.mode==='atmosphere'||root.dataset.mode==='sensor'){
      q('[data-role="rrs-probe"]').textContent=format(toa,5);
    }else if(root.dataset.mode==='correction'){
      q('[data-role="rrs-probe"]').textContent=format(estimate,5)+' sr⁻¹';
    }else{
      q('[data-role="rrs-probe"]').textContent=format(model.Rrs[i],5)+' sr⁻¹';
    }

    q('[data-role="abs-budget"]').innerHTML=budgetRow('water','baseline',a.water[i],a.total[i])+budgetRow('phyto','phyto',a.phytoplankton[i],a.total[i])+budgetRow('cdom','CDOM',a.cdom[i],a.total[i])+budgetRow('nap','NAP',a.nap[i],a.total[i]);
    q('[data-role="bb-budget"]').innerHTML=budgetRow('water','baseline',bb.water[i],bb.total[i])+budgetRow('particles','particles',bb.particles[i],bb.total[i]);
  }

  function renderAtmosphere(){
    const i=wavelengthIndex(probeNm);
    const r=atmosphere.reflectance;
    const total=r.toaApprox[i];
    const ray=r.rayleighPath[i];
    const aer=r.aerosolPath[i];
    const water=r.waterTransmitted[i];
    const pct=value=>total>0?clamp(value/total*100,0,100):0;

    q('[data-role="atm-rayleigh"]').textContent=format(ray,5);
    q('[data-role="atm-aerosol"]').textContent=format(aer,5);
    q('[data-role="atm-water"]').textContent=format(water,5);
    q('[data-role="atm-rayleigh-bar"]').style.width=pct(ray).toFixed(1)+'%';
    q('[data-role="atm-aerosol-bar"]').style.width=pct(aer).toFixed(1)+'%';
    q('[data-role="atm-water-bar"]').style.width=pct(water).toFixed(1)+'%';
    q('[data-role="atm-geometry"]').textContent=
      'SZA '+Math.round(atmosphereState.solarZenithDeg)+'° · VZA '+Math.round(atmosphereState.viewZenithDeg)+'° · RAZ '+Math.round(atmosphereState.relativeAzimuthDeg)+'° · Θ '+atmosphere.geometry.scatteringAngleDeg.toFixed(1)+'°';
    q('[data-role="atm-fraction"]').textContent='ATMOSPHERIC PATH '+(atmosphere.atmosphereFraction[i]*100).toFixed(1)+'% OF ρTOA* @ '+probeNm+' nm';
  }

  function renderSensor(){
    const def=WATER_SENSOR_DEFINITIONS[sensorId];
    sensorObservation=sampleSensorSpectrum(
      WATER_WAVELENGTHS_NM,
      atmosphere.reflectance.toaApprox,
      sensorId,
      'rhoTOA*'
    );
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
      const value=band.value==null?'DOMAIN EDGE':format(band.value,5);
      return `<button type="button" data-sensor-band="${band.id}" class="${band.status==='full'?'':'is-partial'}"><span>${band.label}</span><small>${band.centerNm} / ${band.widthNm} nm</small><strong>${value}</strong></button>`;
    }).join('');
    const full=sensorObservation.bands.filter(b=>b.value!=null);
    const nearest=full.reduce((best,b)=>!best||Math.abs(b.centerNm-probeNm)<Math.abs(best.centerNm-probeNm)?b:best,null);
    q('[data-role="sensor-nearest"]').textContent=nearest?nearest.label+' · '+nearest.centerNm+' nm · '+format(nearest.value,5):'—';
  }

  function renderCorrection(){
    const d=correction.diagnostics;
    const trueOc4=correction.truthOc4;
    const estOc4=correction.estimatedOc4;
    const bias=correction.oc4RelativeBias;

    q('[data-role="corr-true-aerosol"]').textContent=
      'AOT '+atmosphereState.aerosolOpticalDepth550.toFixed(3)+' · α '+atmosphereState.angstromExponent.toFixed(2);
    q('[data-role="corr-assumed-aerosol"]').textContent=
      'AOT '+correctionAssumption.aerosolOpticalDepth550.toFixed(3)+' · α '+correctionAssumption.angstromExponent.toFixed(2);
    q('[data-role="corr-rmse"]').textContent=format(d.rmse,6)+' sr⁻¹';
    q('[data-role="corr-negative"]').textContent=d.negativeCount+' / '+WATER_WAVELENGTHS_NM.length;
    q('[data-role="corr-oc4-true"]').textContent=trueOc4.valid?trueOc4.value.toFixed(3)+' mg m⁻³':'INVALID';
    q('[data-role="corr-oc4-est"]').textContent=estOc4.valid?estOc4.value.toFixed(3)+' mg m⁻³':'INVALID';
    q('[data-role="corr-oc4-bias"]').textContent=bias==null?'INVALID':(bias*100>=0?'+':'')+(bias*100).toFixed(1)+'%';
  }

  function render(){
    model=computeWaterOptics(state);
    atmosphere=computeAtmosphereObservation(WATER_WAVELENGTHS_NM,model.Rrs,atmosphereState);
    correction=buildCorrectionExperiment(
      WATER_WAVELENGTHS_NM,
      model.Rrs,
      atmosphere.reflectance.toaApprox,
      atmosphereState,
      correctionAssumption
    );

    syncControls();
    syncScene();
    renderAtmosphere();
    renderSensor();
    renderCorrection();

    renderChart(
      q('[data-chart="a"]'),
      [
        {id:'water',values:model.absorption.water,role:'component'},
        {id:'phyto',values:model.absorption.phytoplankton,role:'component'},
        {id:'cdom',values:model.absorption.cdom,role:'component'},
        {id:'nap',values:model.absorption.nap,role:'component'},
        {id:'total',values:model.absorption.total,role:'primary'}
      ],
      v=>format(v,2),
      q('[data-role="a-scale"]')
    );

    renderChart(
      q('[data-chart="bb"]'),
      [
        {id:'bb-water',values:model.backscattering.water,role:'component'},
        {id:'bb-particles',values:model.backscattering.particles,role:'component'},
        {id:'total',values:model.backscattering.total,role:'primary'}
      ],
      v=>format(v,4),
      q('[data-role="bb-scale"]')
    );

    const mode=root.dataset.mode;
    if(mode==='atmosphere'){
      q('[data-role="third-title"]').textContent='ρTOA*(λ)';
      q('[data-role="third-subtitle"]').textContent='TOA DECOMPOSITION · DIMENSIONLESS';
      renderChart(
        q('[data-chart="Rrs"]'),
        [
          {id:'rayleigh',values:atmosphere.reflectance.rayleighPath,role:'component'},
          {id:'aerosol',values:atmosphere.reflectance.aerosolPath,role:'component'},
          {id:'water-transmitted',values:atmosphere.reflectance.waterTransmitted,role:'component'},
          {id:'toa',values:atmosphere.reflectance.toaApprox,role:'primary'}
        ],
        v=>format(v,4),
        q('[data-role="Rrs-scale"]'),
        {showXAxis:true}
      );
    }else if(mode==='sensor'){
      q('[data-role="third-title"]').textContent='ρTOA*(λ)';
      q('[data-role="third-subtitle"]').textContent='CONTINUOUS + SENSOR BAND SAMPLES';
      renderChart(
        q('[data-chart="Rrs"]'),
        [{id:'toa',values:atmosphere.reflectance.toaApprox,role:'primary'}],
        v=>format(v,4),
        q('[data-role="Rrs-scale"]'),
        {sensorOverlay:true,showXAxis:true}
      );
    }else if(mode==='correction'){
      q('[data-role="third-title"]').textContent='Rrs_est(λ)';
      q('[data-role="third-subtitle"]').textContent='CORRECTED ESTIMATE · TRUE Rrs DASHED · sr⁻¹';
      renderChart(
        q('[data-chart="Rrs"]'),
        [
          {id:'truth',values:model.Rrs,role:'reference'},
          {id:'estimate',values:correction.correction.estimatedRrs,role:'primary'}
        ],
        v=>format(v,4),
        q('[data-role="Rrs-scale"]'),
        {allowNegative:true,showXAxis:true}
      );
    }else{
      q('[data-role="third-title"]').textContent='Rrs(λ)';
      q('[data-role="third-subtitle"]').textContent='IDEALIZED ABOVE-WATER · sr⁻¹';
      renderChart(
        q('[data-chart="Rrs"]'),
        [{id:'rrs',values:model.Rrs,role:'primary'}],
        v=>format(v,4),
        q('[data-role="Rrs-scale"]'),
        {showXAxis:true}
      );
    }

    renderProbe();
    renderSidecars();
    q('[data-role="causal"]').textContent=causal;
    qa('[data-preset]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.preset===preset)));
  }

  function setProbe(value){probeNm=clamp(Math.round(Number(value)),400,700);render();}
  function setState(partial,nextCausal,nextPreset=''){state={...state,...partial};causal=nextCausal;preset=nextPreset;render();}

  function setAtmosphereState(partial){
    atmosphereState={...atmosphereState,...partial};
    if(correctionMatched){
      correctionAssumption={
        aerosolOpticalDepth550:atmosphereState.aerosolOpticalDepth550,
        angstromExponent:atmosphereState.angstromExponent
      };
    }
    correctionMatched=
      Math.abs(correctionAssumption.aerosolOpticalDepth550-atmosphereState.aerosolOpticalDepth550)<1e-12 &&
      Math.abs(correctionAssumption.angstromExponent-atmosphereState.angstromExponent)<1e-12;
    causal='ATMOSPHERE CHANGE → Rrs unchanged → ρTOA* changed → correction target changed';
    render();
  }

  function setCorrectionAssumption(partial){
    correctionAssumption={...correctionAssumption,...partial};
    correctionMatched=
      Math.abs(correctionAssumption.aerosolOpticalDepth550-atmosphereState.aerosolOpticalDepth550)<1e-12 &&
      Math.abs(correctionAssumption.angstromExponent-atmosphereState.angstromExponent)<1e-12;
    causal='AEROSOL ASSUMPTION → path subtraction + transmission → Rrs_est → OC4 diagnostic';
    render();
  }

  function matchCorrectionAssumption(){
    correctionAssumption={
      aerosolOpticalDepth550:atmosphereState.aerosolOpticalDepth550,
      angstromExponent:atmosphereState.angstromExponent
    };
    correctionMatched=true;
    causal='MATCH TRUE ATMOSPHERE → first-order inverse closes → Rrs_est ≈ Rrs';
    render();
  }

  function applyCorrectionPreset(kind){
    const trueAot=atmosphereState.aerosolOpticalDepth550;
    const trueAlpha=atmosphereState.angstromExponent;
    if(kind==='lowAot') setCorrectionAssumption({aerosolOpticalDepth550:clamp(trueAot-.05,0,.5),angstromExponent:trueAlpha});
    if(kind==='highAot') setCorrectionAssumption({aerosolOpticalDepth550:clamp(trueAot+.05,0,.5),angstromExponent:trueAlpha});
    if(kind==='lowAlpha') setCorrectionAssumption({aerosolOpticalDepth550:trueAot,angstromExponent:clamp(trueAlpha-.5,0,2.5)});
    if(kind==='highAlpha') setCorrectionAssumption({aerosolOpticalDepth550:trueAot,angstromExponent:clamp(trueAlpha+.5,0,2.5)});
  }

  function setMode(mode){
    root.dataset.mode=mode;
    qa('[data-water-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.waterMode===mode)));
    if(mode==='path'){
      q('[data-role="scene-label"]').textContent='RADIATIVE PATH';
      q('[data-role="scene-title"]').textContent='From water optics through atmosphere to sensor.';
      q('[data-role="spectra-label"]').textContent='SYNC / ONE STATE · ONE PROBE';
      q('[data-role="spectra-hint"]').textContent='← → 1 nm · SHIFT 10 nm';
    }else if(mode==='iop'){
      q('[data-role="scene-label"]').textContent='INHERENT → APPARENT';
      q('[data-role="scene-title"]').textContent='Water constituents alter the spectrum through IOPs.';
      q('[data-role="spectra-label"]').textContent='SYNC / ONE STATE · ONE PROBE';
      q('[data-role="spectra-hint"]').textContent='← → 1 nm · SHIFT 10 nm';
      setPath('water');
    }else if(mode==='atmosphere'){
      q('[data-role="scene-label"]').textContent='ATMOSPHERE FORWARD LAYER';
      q('[data-role="scene-title"]').textContent='Path reflectance dominates what the sensor sees.';
      q('[data-role="spectra-label"]').textContent='Rrs BELOW / ρTOA* ABOVE THE ATMOSPHERE';
      q('[data-role="spectra-hint"]').textContent='FIRST-ORDER · NOT ATMOSPHERIC CORRECTION';
    }else if(mode==='sensor'){
      q('[data-role="scene-label"]').textContent='SENSOR OBSERVATION';
      q('[data-role="scene-title"]').textContent='Pedagogical TOA reflectance becomes band-limited.';
      q('[data-role="spectra-label"]').textContent='CONTINUOUS ρTOA* / BAND-AVERAGED OBSERVATIONS';
      q('[data-role="spectra-hint"]').textContent='SIMPLIFIED BANDPASS · MEASURED SRF NOT APPLIED';
    }else{
      q('[data-role="scene-label"]').textContent='ATMOSPHERIC CORRECTION';
      q('[data-role="scene-title"]').textContent='A small aerosol error can become a large water-signal error.';
      q('[data-role="spectra-label"]').textContent='Rrs_est SOLID / TRUE Rrs DASHED';
      q('[data-role="spectra-hint"]').textContent='NEGATIVE VALUES PRESERVED · OC4 IS A DIAGNOSTIC';
    }
    render();
  }
  function setPath(step){
    if(!pathNotes[step]) return;
    const scene=q('[data-role="scene"]');
    const svg=q('[data-role="path-svg"]');
    scene.dataset.pathFocus=step;
    svg.setAttribute('viewBox',pathViews[step]);
    qa('[data-path-step]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.pathStep===step)));
    qa('[data-path-label]').forEach(label=>{
      label.style.display=step!=='overview'&&label.dataset.pathLabel===step?'':'none';
    });
    q('[data-role="path-label"]').textContent=pathNotes[step][0];
    q('[data-role="path-note"]').textContent=pathNotes[step][1];
    q('[data-role="path-equation"]').textContent=pathFocusData[step].equation;
    q('[data-role="path-tags"]').innerHTML=pathFocusData[step].tags.map(tag=>`<span>${tag}</span>`).join('');
  }
  function pointerProbe(event,svg){
    const rect=svg.getBoundingClientRect(), viewX=(event.clientX-rect.left)/rect.width*1000;
    setProbe(400+clamp((viewX-52)/(984-52),0,1)*300);
  }

  qa('[data-water-mode]').forEach(b=>on(b,'click',()=>setMode(b.dataset.waterMode)));
  qa('[data-path-step]').forEach(b=>on(b,'click',()=>setPath(b.dataset.pathStep)));
  on(q('[data-role="scene"]'),'click',event=>{
    if(root.dataset.mode!=='path'&&root.dataset.mode!=='iop') return;
    const hotspot=event.target.closest?.('[data-path-hotspot]');
    if(hotspot) setPath(hotspot.dataset.pathHotspot);
  });
  on(q('[data-role="scene"]'),'keydown',event=>{
    if(root.dataset.mode!=='path'&&root.dataset.mode!=='iop') return;
    const stages=['overview','atmosphere','interface','water','sensor'];
    const current=q('[data-role="scene"]').dataset.pathFocus||'overview';
    if(event.key==='Escape'){
      event.preventDefault();
      setPath('overview');
      return;
    }
    if(event.key!=='ArrowLeft'&&event.key!=='ArrowRight') return;
    event.preventDefault();
    const index=stages.indexOf(current);
    const delta=event.key==='ArrowRight'?1:-1;
    setPath(stages[(index+delta+stages.length)%stages.length]);
  });
  qa('[data-preset]').forEach(b=>on(b,'click',()=>setState(WATER_REFERENCE_STATES[b.dataset.preset],'PRESET → component IOPs → a(λ), bb(λ) → u(λ) → Rrs(λ)',b.dataset.preset)));
  qa('[data-sensor]').forEach(b=>on(b,'click',()=>{sensorId=b.dataset.sensor;causal='SENSOR CHANGE → water + atmosphere unchanged → band sampling changed';render();}));
  on(root,'click',event=>{
    const target=event.target.closest?.('[data-sensor-band]');
    if(!target)return;
    const band=sensorObservation.bands.find(item=>item.id===target.dataset.sensorBand);
    if(band)setProbe(band.centerNm);
  });

  on(atmControls.aot,'input',()=>setAtmosphereState({aerosolOpticalDepth550:Number(atmControls.aot.value)}));
  on(atmControls.alpha,'input',()=>setAtmosphereState({angstromExponent:Number(atmControls.alpha.value)}));
  on(atmControls.pressure,'input',()=>setAtmosphereState({pressureHpa:Number(atmControls.pressure.value)}));
  on(atmControls.sza,'input',()=>setAtmosphereState({solarZenithDeg:Number(atmControls.sza.value)}));
  on(atmControls.vza,'input',()=>setAtmosphereState({viewZenithDeg:Number(atmControls.vza.value)}));
  on(atmControls.raz,'input',()=>setAtmosphereState({relativeAzimuthDeg:Number(atmControls.raz.value)}));

  on(corrControls.aot,'input',()=>setCorrectionAssumption({aerosolOpticalDepth550:Number(corrControls.aot.value)}));
  on(corrControls.alpha,'input',()=>setCorrectionAssumption({angstromExponent:Number(corrControls.alpha.value)}));
  on(q('[data-correction-match]'),'click',matchCorrectionAssumption);
  qa('[data-corr-preset]').forEach(button=>on(button,'click',()=>applyCorrectionPreset(button.dataset.corrPreset)));

  on(controls.chl,'input',()=>setState({chl:sliderToLog(controls.chl.value,.02,25)},'Chl → aph(λ) → a(λ) → u(λ) → Rrs(λ) → ρTOA*'));
  on(controls.ag440,'input',()=>setState({ag440:Number(controls.ag440.value)},'ag(440) → ag(λ) → a(λ) → u(λ) → Rrs(λ) → ρTOA*'));
  on(controls.aNap443,'input',()=>setState({aNap443:Number(controls.aNap443.value)},'aNAP(443) → aNAP(λ) → a(λ) → u(λ) → Rrs(λ) → ρTOA*'));
  on(controls.bbp443,'input',()=>setState({bbp443:sliderToLog(controls.bbp443.value,.0001,.03)},'bbp(443) → bbp(λ) → bb(λ) → u(λ) → Rrs(λ) → ρTOA*'));
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
  setPath('overview');render();setMode('path');

  return ()=>{cleanup.splice(0).forEach(fn=>fn());if(stage.contains(root))root.remove();};
}

window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
window.GeoGeekInstrumentMounts.water=mountWaterInstrument;
window.GeoWaterSpectrum={mount:mountWaterInstrument,modelMeta:WATER_MODEL_META,atmosphereMeta:ATMOSPHERE_MODEL_META,correction:'manual-aerosol-first-order'};
