// V9 uncertainty workspace; authored ESM and bundled into V9's self-contained app.
const {TABS,plots,CFG,DATA}=require("core/config.js");
const {makeSensorObservation}=require("model/geogeek-adapter.js");
const {responseButtons}=require("workspaces/sensor.js");
const E=globalThis.GeoGeekV9Engine;
function run(state,models){
 return E.analyze({models,params:state.params,bounds:CFG,selected:state.uncertaintyParameters,
  noiseSigma:state.uncertaintySigma,stepPercent:state.uncertaintyStep,
  sample:d=>makeSensorObservation(d,state.sensor,'rrs',{responseMode:state.responseMode,srfPlatform:state.srfPlatform})});
}
function num(v,d=3){return v===null||!Number.isFinite(v)?'—':Math.abs(v)>0&&Math.abs(v)<.001?v.toExponential(d):v.toFixed(d);}
function cell(text,extra=''){return '<div class="u9-cell '+extra+'">'+text+'</div>';}
function badge(label,text){return '<div class="u9-stat"><small>'+label+'</small><strong>'+text+'</strong></div>';}
function summary(a){
 const warning=a.identifiable?'<p class="u9-note">Full rank does not imply robust retrieval. Formal local σ uses a user-assumed independent Gaussian noise model, no aerosol uncertainty, and a local linear approximation.</p>':
  '<p class="u9-alert" role="alert">RANK DEFICIENT — formal finite covariance is unavailable. '+a.numberOfMeasurements+' usable bands cannot resolve all '+a.numberOfParameters+' selected parameters, or their spectral response columns are dependent.</p>';
 const pair=a.pairwiseColumnCosine;
 const weakest=a.selected.map((id,i)=>id+': '+num(a.weakestDirection[i],3)).join(' · ');
 const formal=a.identifiable?'<div class="u9-uncertainty-grid">'+a.selected.map((id,i)=>
  '<div class="u9-uncertainty-item"><span>'+id+'</span><strong>± '+num(a.uncertainties[i],4)+'</strong><small>'+a.definitions[i].unit+' · conditional 1σ</small></div>').join('')+'</div>':
  '<p class="u9-null">No parameter uncertainties reported for a rank-deficient design.</p>';
 return '<div class="u9-summary"><h3>Local information diagnostics</h3><p class="u9-description">Whitened, scale-normalized Jacobian evaluated at the current simulated water state. Estimates refer to hypothetical independent noise in band-averaged Rrs, not measured sensor SNR.</p>'+
 '<div class="u9-metrics">'+badge('MATRIX RANK',a.rank+' / '+a.numberOfParameters)+badge('VALID BANDS',a.numberOfMeasurements+' bands')+badge('CONDITION OF J/σ',num(a.condition,2))+badge('ASSUMED σ(Rrs)',num(a.noise.sigmaRrsSr1,6)+' sr⁻¹')+'</div>'+warning+
 '<div class="u9-subsection"><h4>Formal 1σ parameter uncertainty</h4>'+formal+'</div>'+
 '<div class="u9-subsection"><h4>Most similar sensitivity columns</h4><p>'+ (pair.first?pair.first+' vs '+pair.second+' · cosine '+num(pair.cosine,4):'Requires at least two nonzero columns')+'</p>'+
 '<h4>Weakest eigenmode (scaled parameter coordinates)</h4><p class="u9-mono">'+weakest+'</p></div>'+
 '<div class="u9-note">Jacobian rank cutoff: max(1×10⁻¹², 10⁻⁹ × largest Fisher eigenvalue). High condition numbers indicate fragile estimates even if full rank.</div></div>';
}
function jacobian(a){
 const max=Math.max(1e-30,...a.observations.flatMap(o=>o.derivatives.map((d,i)=>Math.abs(d*a.definitions[i].scale/a.noise.sigmaRrsSr1))));
 const header='<div class="u9-matrix-row head">'+cell('BAND')+a.selected.map(id=>cell('∂Rrs/∂'+id)).join('')+'</div>';
 const rows=a.observations.map(o=>'<div class="u9-matrix-row">'+cell(o.bandId+'<small>'+num(o.centerNm,1)+' nm</small>')+o.derivatives.map((d,i)=>{
  const scaled=Math.abs(d*a.definitions[i].scale/a.noise.sigmaRrsSr1);
  const alpha=Math.min(.75,scaled/max*.75);
  return cell(num(d,3),'u9-heat') .replace('class="u9-cell u9-heat"','class="u9-cell u9-heat" style="background:rgba(125,187,159,'+alpha.toFixed(3)+')"');
 }).join('')+'</div>').join('');
 return '<div class="u9-summary"><h3>Multi-parameter Jacobian · Rrs per parameter unit</h3><p class="u9-description">Rows are only FULL-coverage sensor bands. Physical-unit derivatives use bounded finite differences; shading is proportional to |scale × derivative / assumed σ|.</p><div class="u9-matrix" style="--u9-cols:'+a.selected.length+'">'+header+rows+'</div><p class="u9-note">Excluded bands: '+(a.dropped.length?a.dropped.map(x=>x.id+' ('+x.status+')').join(', '):'none')+'. No SRF extrapolation or silent nominal replacement.</p></div>';
}
function correlations(a){
 if(!a.identifiable)return '<div class="u9-summary"><h3>Covariance and parameter correlation</h3><p class="u9-alert" role="alert">Covariance withheld: the Jacobian has insufficient numerical rank for the selected parameter subset. Remove parameters or choose an observation configuration with more independent full-coverage bands.</p>'+spectrum(a)+'</div>';
 const cols=a.selected.length;
 const table='<div class="u9-matrix"><div class="u9-corr-row head">'+cell('PARAMETER')+a.selected.map(id=>cell(id)).join('')+'</div>'+
 a.selected.map((id,i)=>'<div class="u9-corr-row">'+cell(id)+a.correlation[i].map(value=>{
  const abs=Math.abs(value),alpha=.12+.62*abs;
  return cell(num(value,3)).replace('class="u9-cell "','"class="u9-cell " style="background:rgba('+(value<0?'213,133,113':'126,190,164')+','+alpha.toFixed(3)+')"');
 }).join('')+'</div>').join('')+'</div>';
 return '<div class="u9-summary"><h3>Local parameter correlation matrix</h3><p class="u9-description">Conditional covariance C = (JᵀΣ⁻¹J)⁻¹ exists only for full-rank parameter subsets. Off-diagonal ±1 indicates strongly coupled estimates; it is not a field-data correlation.</p><div class="u9-corr-table" style="--u9-cols:'+cols+'">'+table+'</div>'+spectrum(a)+'</div>';
}
function spectrum(a){return '<div class="u9-subsection"><h4>Fisher eigenvalues</h4><p class="u9-mono">'+a.eigenvalues.map((x,i)=>'λ'+(i+1)+'='+num(x,3)).join(' · ')+'</p></div>';}
const uncertaintyWorkspace={
 ...TABS[7],plots:plots.uncertainty,
 renderChart({state,models}){
  const a=run(state,models);
  const body=state.plot==='jacobian'?jacobian(a):state.plot==='correlation'?correlations(a):summary(a);
  return '<div class="u9-container" role="region" aria-label="Uncertainty and identifiability analysis">'+body+'</div>';
 },
 renderControls({state,controls}){
  const {csection,adv,param}=controls;
  const params=E.PARAMETERS.map(p=>'<button type="button" class="switch u9-select" data-u9-parameter="'+p.id+'" aria-pressed="'+state.uncertaintyParameters.includes(p.id)+'">'+p.label+'</button>').join('');
  const sigma=E.SIGMAS.map(v=>'<button type="button" class="switch" data-u9-sigma="'+v+'" aria-pressed="'+(state.uncertaintySigma===v)+'">'+(v*1e6).toFixed(0)+' × 10⁻⁶ sr⁻¹</button>').join('');
  const steps=E.STEPS.map(v=>'<button type="button" class="switch" data-u9-step="'+v+'" aria-pressed="'+(state.uncertaintyStep===v)+'">'+v+'%</button>').join('');
  const sensors=Object.keys(DATA).map(id=>'<button type="button" class="switch" data-sensor="'+id+'" aria-pressed="'+(state.sensor===id)+'">'+id.toUpperCase()+'</button>').join('');
  return csection('OBSERVATION MODEL','sensor and SRF','<div class="switch-row">'+sensors+'</div>'+responseButtons(state))+
   csection('SELECT PARAMETERS',state.uncertaintyParameters.length+' / 5','<div class="u9-choice-list">'+params+'</div><p class="aside-note">Each selected parameter is independently perturbed within its physical bounds. The reference state is unchanged.</p>')+
   csection('HYPOTHETICAL BAND NOISE','not a mission specification','<div class="switch-row">'+sigma+'</div><p class="aside-note">Assume independent equal-variance, zero-mean Gaussian errors on band-averaged Rrs. Real radiometric/AC errors are typically correlated and signal dependent.</p>')+
   csection('JACOBIAN FINITE DIFFERENCE','bounded perturbation','<div class="switch-row">'+steps+'</div><p class="aside-note">Near parameter bounds, unequal or one-sided differences are identified explicitly.</p>')+
   csection('DIAGNOSTICS','science export','<button type="button" class="ghost-btn u9-export" data-export="u9jacobian">↓ Export Jacobian CSV</button><button type="button" class="ghost-btn u9-export" data-export="json">↓ Export Experiment + Fisher JSON</button>')+
   adv(param('chl')+param('ag')+param('anap')+param('bbp')+param('eta')+'<p class="aside-note">The displayed 1σ values are local linearized estimates under the chosen noise assumptions. They are not uncertainty budgets, inverse-model validation, or retrieval certification.</p>');
 }
};
export {uncertaintyWorkspace,run};
