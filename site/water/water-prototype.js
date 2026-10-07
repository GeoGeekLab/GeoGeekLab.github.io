import {
  WATER_DEFAULT_STATE,
  WATER_REFERENCE_STATES,
  WATER_WAVELENGTHS_NM,
  computeWaterOptics
} from "./water-model.js";

const $ = (selector, root=document) => root.querySelector(selector);
const $$ = (selector, root=document) => Array.from(root.querySelectorAll(selector));

const workbench=$("#waterWorkbench");
const scene=$("#waterScene");
const probeControl=$("#probeControl");
const spectrumPanel=$("#spectrumPanel");

const controls={
  chl:$("#chlControl"),
  ag440:$("#cdomControl"),
  aNap443:$("#napControl"),
  bbp443:$("#bbpControl")
};

const outputs={
  chl:$("#chlOutput"),
  ag440:$("#cdomOutput"),
  aNap443:$("#napOutput"),
  bbp443:$("#bbpOutput")
};

const pathNotes={
  atmosphere:{
    label:"ATMOSPHERE · NOT MODELED",
    text:"The atmosphere strongly conditions satellite water-colour observations. V1 shows this path as context only; it does not calculate top-of-atmosphere radiance, aerosol/Rayleigh terms, or atmospheric correction."
  },
  interface:{
    label:"AIR–WATER INTERFACE",
    text:"Subsurface rrs and above-water Rrs are different AOPs. V1 uses an explicit interface-transfer approximation. The dashed surface path marks glint context and is excluded from numerical Rrs."
  },
  water:{
    label:"WATER COLUMN",
    text:"Absorption and backscattering are inherent optical properties. They determine how the in-water light field changes before light leaves the surface."
  },
  sensor:{
    label:"SENSOR CONTEXT · NOT MODELED",
    text:"V1 ends at continuous above-water Rrs. Spectral response functions, band integration, and retrieval algorithms are not applied."
  }
};

let state={...WATER_DEFAULT_STATE};
let model=computeWaterOptics(state);
let probeNm=443;
let activePreset="";
let lastCausal="REFERENCE STATE → IOPs → u(λ) → rrs(λ) → Rrs(λ)";

function clamp(value,min,max){return Math.max(min,Math.min(max,value));}
function logToSlider(value,min,max){
  const lo=Math.log(min),hi=Math.log(max);
  return Math.round((Math.log(value)-lo)/(hi-lo)*1000);
}
function sliderToLog(value,min,max){
  const lo=Math.log(min),hi=Math.log(max);
  return Math.exp(lo+(Number(value)/1000)*(hi-lo));
}
function format(value,digits){
  if(value===0)return "0";
  if(Math.abs(value)<0.001)return value.toExponential(2);
  return value.toFixed(digits);
}
function indexForWavelength(wl){return clamp(Math.round(wl)-400,0,WATER_WAVELENGTHS_NM.length-1);}

function setMode(mode){
  workbench.dataset.mode=mode;
  $$("[data-water-mode]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.waterMode===mode)));
  if(mode==="path"){
    $("#sceneModeLabel").textContent="RADIATIVE PATH";
    $("#sceneTitle").textContent="From illumination to idealized water-leaving reflectance.";
    $("#sceneBoundary").textContent="Atmosphere is conceptual in V1. Quantitative output begins with water IOPs.";
  }else{
    $("#sceneModeLabel").textContent="INHERENT → APPARENT";
    $("#sceneTitle").textContent="Water constituents alter the spectrum through IOPs.";
    $("#sceneBoundary").textContent="The same computed state drives the scene, spectra, probe, and component budgets.";
    setPathFocus("water");
  }
}

function setPathFocus(step){
  scene.dataset.pathFocus=step;
  $$("[data-path-step]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.pathStep===step)));
  const note=pathNotes[step];
  $("#pathNoteLabel").textContent=note.label;
  $("#pathNote").textContent=note.text;
}

function syncControlPositions(){
  controls.chl.value=String(logToSlider(state.chl,0.02,25));
  controls.ag440.value=String(state.ag440);
  controls.aNap443.value=String(state.aNap443);
  controls.bbp443.value=String(logToSlider(state.bbp443,0.0001,0.03));
  outputs.chl.textContent=state.chl.toFixed(state.chl<1?2:1)+" mg m⁻³";
  outputs.ag440.textContent=state.ag440.toFixed(3)+" m⁻¹";
  outputs.aNap443.textContent=state.aNap443.toFixed(3)+" m⁻¹";
  outputs.bbp443.textContent=state.bbp443.toFixed(4)+" m⁻¹";
}

function syncSceneIntensity(){
  const chlNorm=(Math.log(state.chl)-Math.log(0.02))/(Math.log(25)-Math.log(0.02));
  const cdomNorm=state.ag440/2;
  const particleNorm=Math.max(state.aNap443/1,(Math.log(state.bbp443)-Math.log(0.0001))/(Math.log(0.03)-Math.log(0.0001)));
  scene.style.setProperty("--chl-opacity",String(0.18+0.72*clamp(chlNorm,0,1)));
  scene.style.setProperty("--cdom-opacity",String(0.16+0.76*clamp(cdomNorm,0,1)));
  scene.style.setProperty("--particle-opacity",String(0.18+0.72*clamp(particleNorm,0,1)));
}

function chartPath(values,yMax){
  const left=54,right=982,top=18,bottom=160;
  const x=wl=>left+(wl-400)/300*(right-left);
  const y=v=>bottom-(v/yMax)*(bottom-top);
  return values.map((v,i)=>(i===0?"M":"L")+x(400+i).toFixed(2)+" "+y(v).toFixed(2)).join(" ");
}

function renderChart(svg,values,unitFormatter,scaleNode){
  const left=54,right=982,top=18,bottom=160;
  const maxValue=Math.max(...values);
  const yMax=maxValue>0?maxValue*1.08:1;
  if(scaleNode) scaleNode.textContent='AUTO Y · 0–'+unitFormatter(yMax);
  const x=wl=>left+(wl-400)/300*(right-left);
  const y=v=>bottom-(v/yMax)*(bottom-top);
  const idx=indexForWavelength(probeNm);
  const probeX=x(probeNm);
  const probeY=y(values[idx]);
  const path=chartPath(values,yMax);
  const area=path+" L "+right+" "+bottom+" L "+left+" "+bottom+" Z";
  const xTicks=[400,450,500,550,600,650,700];
  const yTicks=[0,0.5,1];

  svg.innerHTML=
    yTicks.map(function(t){
      const yy=bottom-t*(bottom-top);
      return '<line class="water-grid-line" x1="'+left+'" y1="'+yy+'" x2="'+right+'" y2="'+yy+'"></line>'+
        '<text class="water-axis-label" x="8" y="'+(yy+3)+'">'+unitFormatter(t*yMax)+'</text>';
    }).join("")+
    xTicks.map(function(wl){
      const xx=x(wl);
      return '<line class="water-grid-line" x1="'+xx+'" y1="'+top+'" x2="'+xx+'" y2="'+bottom+'"></line>'+
        '<text class="water-axis-label" text-anchor="middle" x="'+xx+'" y="181">'+wl+'</text>';
    }).join("")+
    '<path class="water-spectrum-area" d="'+area+'"></path>'+
    '<path class="water-spectrum-line" d="'+path+'"></path>'+
    '<line class="water-probe-line" x1="'+probeX+'" y1="'+top+'" x2="'+probeX+'" y2="'+bottom+'"></line>'+
    '<circle class="water-probe-dot" cx="'+probeX+'" cy="'+probeY+'" r="4.5"></circle>'+
    '<rect class="water-hit" data-water-chart-hit x="'+left+'" y="'+top+'" width="'+(right-left)+'" height="'+(bottom-top)+'"></rect>';
}

function budgetRow(component,label,value,total){
  const pct=total>0?clamp(value/total*100,0,100):0;
  return '<div class="water-budget-row" data-component="'+component+'">'+
    '<span>'+label+'</span>'+
    '<div class="water-budget-track"><div class="water-budget-fill" style="width:'+pct.toFixed(2)+'%"></div></div>'+
    '<output>'+format(value,4)+' m⁻¹</output>'+
    '</div>';
}

function renderProbe(){
  const i=indexForWavelength(probeNm);
  const a=model.absorption;
  const bb=model.backscattering;

  $("#probeWavelength").textContent=probeNm+" nm";
  $("#budgetWavelength").textContent=probeNm+" nm";
  $("#waterFooterReadout").textContent="PROBE "+probeNm+" nm";
  probeControl.value=String(probeNm);

  $("#probeATotal").textContent=format(a.total[i],4)+" m⁻¹";
  $("#probeBbTotal").textContent=format(bb.total[i],5)+" m⁻¹";
  $("#probeRrsTotal").textContent=format(model.Rrs[i],5)+" sr⁻¹";

  $("#absorptionProbeValue").textContent=format(a.total[i],4)+" m⁻¹";
  $("#backscatterProbeValue").textContent=format(bb.total[i],5)+" m⁻¹";
  $("#rrsProbeValue").textContent=format(model.Rrs[i],5)+" sr⁻¹";

  $("#absorptionBudget").innerHTML=
    budgetRow("water","baseline",a.water[i],a.total[i])+
    budgetRow("phyto","phyto",a.phytoplankton[i],a.total[i])+
    budgetRow("cdom","CDOM",a.cdom[i],a.total[i])+
    budgetRow("nap","NAP",a.nap[i],a.total[i]);

  $("#backscatterBudget").innerHTML=
    budgetRow("water","baseline",bb.water[i],bb.total[i])+
    budgetRow("particles","particles",bb.particles[i],bb.total[i]);
}

function renderAll(){
  model=computeWaterOptics(state);
  syncControlPositions();
  syncSceneIntensity();

  renderChart($("#absorptionChart"),model.absorption.total,function(v){return format(v,2);},$("#absorptionScale"));
  renderChart($("#backscatterChart"),model.backscattering.total,function(v){return format(v,4);},$("#backscatterScale"));
  renderChart($("#rrsChart"),model.Rrs,function(v){return format(v,4);},$("#rrsScale"));
  renderProbe();

  $("#causalReadout").textContent=lastCausal;
  $$("[data-preset]").forEach(button=>button.setAttribute("aria-pressed",String(button.dataset.preset===activePreset)));
}

function setProbe(wl){
  probeNm=clamp(Math.round(Number(wl)),400,700);
  renderAll();
}

function applyState(nextState,causal,preset){
  state={...state,...nextState};
  activePreset=preset||"";
  lastCausal=causal;
  renderAll();
}

function pointerToProbe(event,svg){
  const rect=svg.getBoundingClientRect();
  const viewX=(event.clientX-rect.left)/rect.width*1000;
  const left=54,right=982;
  const fraction=clamp((viewX-left)/(right-left),0,1);
  setProbe(400+fraction*300);
}

$$("[data-water-mode]").forEach(button=>button.addEventListener("click",function(){setMode(button.dataset.waterMode);}));
$$("[data-path-step]").forEach(button=>button.addEventListener("click",function(){setPathFocus(button.dataset.pathStep);}));

$$("[data-preset]").forEach(button=>button.addEventListener("click",function(){
  const key=button.dataset.preset;
  applyState(WATER_REFERENCE_STATES[key],"PRESET → component IOPs → a(λ), bb(λ) → u(λ) → Rrs(λ)",key);
}));

controls.chl.addEventListener("input",function(){
  applyState({chl:sliderToLog(controls.chl.value,0.02,25)},"CHL → aph(λ) → a(λ) → u(λ) → Rrs(λ)");
});
controls.ag440.addEventListener("input",function(){
  applyState({ag440:Number(controls.ag440.value)},"ag(440) → ag(λ) → a(λ) → u(λ) → Rrs(λ)");
});
controls.aNap443.addEventListener("input",function(){
  applyState({aNap443:Number(controls.aNap443.value)},"aNAP(443) → aNAP(λ) → a(λ) → u(λ) → Rrs(λ)");
});
controls.bbp443.addEventListener("input",function(){
  applyState({bbp443:sliderToLog(controls.bbp443.value,0.0001,0.03)},"bbp(443) → bbp(λ) → bb(λ) → u(λ) → Rrs(λ)");
});
probeControl.addEventListener("input",function(){setProbe(probeControl.value);});

$$(".water-chart svg").forEach(function(svg){
  let dragging=false;
  svg.addEventListener("pointerdown",function(event){
    dragging=true;
    svg.setPointerCapture(event.pointerId);
    pointerToProbe(event,svg);
  });
  svg.addEventListener("pointermove",function(event){
    if(dragging || event.pointerType==="mouse") pointerToProbe(event,svg);
  });
  svg.addEventListener("pointerup",function(event){
    dragging=false;
    if(svg.hasPointerCapture(event.pointerId)) svg.releasePointerCapture(event.pointerId);
  });
  svg.addEventListener("pointercancel",function(){dragging=false;});
});

spectrumPanel.addEventListener("keydown",function(event){
  if(event.key!=="ArrowLeft" && event.key!=="ArrowRight") return;
  event.preventDefault();
  const step=event.shiftKey?10:1;
  setProbe(probeNm+(event.key==="ArrowRight"?step:-step));
});

setMode("path");
setPathFocus("water");
renderAll();
