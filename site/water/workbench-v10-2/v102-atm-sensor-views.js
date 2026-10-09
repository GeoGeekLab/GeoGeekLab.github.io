/* WATER V10.2 / Phase 6B: atmosphere and sensor scientific presentation.
 * No changes to numeric models, sample integrators, scientific bounds, or schema v8. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
function fmt(v,d=5){return Number.isFinite(v)?(v!==0&&Math.abs(v)<.0001?v.toExponential(3):v.toFixed(d)):'—';}
function numeric(v,unit){return '<strong>'+fmt(v)+'</strong> <span>'+esc(unit)+'</span>';}
const ATM_LINES=Object.freeze([
 {key:'ray',title:'Rayleigh path',meaning:'Model-estimated molecular-scattering path contribution'},
 {key:'aeros',title:'Aerosol path',meaning:'Model-estimated aerosol-scattering path contribution'},
 {key:'water',title:'Transmitted water',meaning:'Modeled water signal after approximate atmospheric transmission'}
]);
function atmosphereClosure(data){
 let maxResidual=0,maxScale=0;
 for(let i=0;i<data.w.length;i++){
  const values=[data.toa[i],data.ray[i],data.aeros[i],data.water[i]];
  if(!values.every(Number.isFinite))return {status:'invalid',maxResidual:null};
  const sum=data.ray[i]+data.aeros[i]+data.water[i];
  maxResidual=Math.max(maxResidual,Math.abs(data.toa[i]-sum));
  maxScale=Math.max(maxScale,Math.abs(data.toa[i]),Math.abs(sum));
 }
 return {status:maxResidual<=1e-11*Math.max(1,maxScale)?'agree':'mismatch',maxResidual};
}
function atmosphereTable(data,probe){
 const grid=[400,425,450,475,500,525,550,575,600,625,650,675,700];
 if(Number.isInteger(probe)&&probe>=400&&probe<=700&&!grid.includes(probe))grid.push(probe);
 grid.sort((a,b)=>a-b);
 return '<details class="p6b-data" id="p6b-atmosphere-values"><summary>Read atmospheric contributions as numbers</summary>'+
  '<p>Values are first-order simulated reflectance terms, not measured radiance. The full 301-wavelength simulation is in the existing CSV export.</p>'+
  '<div class="p6b-table-scroll" role="region" tabindex="0" aria-label="Atmosphere spectral contribution values">'+
  '<table><caption>First-order simulated TOA reflectance ρ* and additive model terms · dimensionless</caption>'+
  '<thead><tr><th scope="col">λ (nm)</th><th scope="col">Rayleigh</th><th scope="col">Aerosol</th>'+
  '<th scope="col">Water transmitted</th><th scope="col">Sum</th><th scope="col">ρ* TOA</th></tr></thead><tbody>'+
  grid.map(nm=>{const i=nm-400,sum=data.ray[i]+data.aeros[i]+data.water[i];
   return '<tr'+(nm===probe?' class="p6b-current-row"':'')+'><th scope="row">'+nm+'</th>'+
    [data.ray[i],data.aeros[i],data.water[i],sum,data.toa[i]].map(v=>'<td>'+fmt(v,7)+'</td>').join('')+'</tr>';
  }).join('')+'</tbody></table></div></details>';
}
function atmosphere(state,data,charts){
 const key=['toa','ray','aeros','water'].includes(state.plot)?state.plot:'toa';
 const idx=Math.round(state.probe)-400;
 const closure=atmosphereClosure(data);
 const selected=key==='toa'?'toa':key;
 const entries=key==='toa'?
  [{label:'ρ* TOA (sum)',values:data.toa},{label:'Rayleigh path',values:data.ray},{label:'Aerosol path',values:data.aeros},{label:'Water transmitted',values:data.water}]:
  [{label:ATM_LINES.find(x=>x.key===key)?.title||key,values:data[selected]}];
 const title=key==='toa'?'First-order simulated TOA ρ*(λ)':ATM_LINES.find(x=>x.key===key).title+' (λ)';
 const chart=charts.chartFrame(title,'IDEALIZED MODEL REFLECTANCE PROXY · DIMENSIONLESS',entries,selected,[],{unit:'dimensionless'});
 const p=state.params;
 return '<div class="p6b-atmosphere" aria-label="Atmosphere model assumptions and spectrum">'+
 '<section class="p6b-section p6b-hero"><div class="p6b-kicker">FIRST-ORDER SIMULATED TOA REFLECTANCE · NOT A SATELLITE MEASUREMENT</div>'+
 '<h3>Atmospheric path and transmitted water</h3>'+
 '<p>ρ*TOA = ρ*Rayleigh + ρ*aerosol + ρ*transmitted-water. These are dimensionless reflectance-proxy components from one teaching model, not measured top-of-atmosphere radiance or an operational L1/L2 product.</p>'+
 '<p class="p6b-warning">Single-scattering/first-order atmospheric approximation. No gas absorption, multiple scattering, polarization, sunglint, or validated real-sensor calibration is represented.</p></section>'+
 '<section class="p6b-section" aria-labelledby="p6b-path-title"><h4 id="p6b-path-title">1 · Additive path contributions at '+esc(state.probe)+' nm</h4>'+
 '<div class="p6b-reading-grid">'+ATM_LINES.map(x=>'<div class="p6b-reading"><span>'+esc(x.title)+'</span>'+
 numeric(data[x.key][idx],'dimensionless')+'<small>'+esc(x.meaning)+'</small></div>').join('')+
 '<div class="p6b-reading p6b-total"><span>Simulated ρ* TOA</span>'+numeric(data.toa[idx],'dimensionless')+
 '<small>The sum of the three approximate model terms</small></div></div>'+
 '<p class="p6b-equation">Additive closure over 301 wavelengths: max |ρ*TOA − (Rayleigh + aerosol + water)| = '+
 fmt(closure.maxResidual,9)+'. '+(closure.status==='agree'?'Components agree at the stated floating-point tolerance.':
 'Components cannot be confirmed at the stated tolerance.')+' This is an algebraic check, not independent validation.</p></section>'+
 '<section class="p6b-section" aria-labelledby="p6b-geometry-title"><h4 id="p6b-geometry-title">2 · Geometry and atmosphere inputs</h4>'+
 '<dl class="p6b-conditions"><div><dt>Solar zenith</dt><dd>'+fmt(p.sza,1)+'°</dd></div>'+
 '<div><dt>Viewing zenith</dt><dd>'+fmt(p.vza,1)+'°</dd></div>'+
 '<div><dt>Relative azimuth</dt><dd>'+fmt(p.raz,1)+'°</dd></div>'+
 '<div><dt>Aerosol optical depth τa(550)</dt><dd>'+fmt(p.aot,4)+' (unitless)</dd></div>'+
 '<div><dt>Ångström exponent α</dt><dd>'+fmt(p.alpha,3)+' (unitless)</dd></div>'+
 '<div><dt>Surface pressure</dt><dd>'+fmt(p.pressure,1)+' hPa</dd></div></dl>'+
 '<p class="p6b-muted">Solar and viewing zenith angles refer to the local vertical. Relative azimuth is the angle between the solar and viewing directions.</p></section>'+
 '<section class="p6b-chart-section" aria-label="First-order atmospheric spectrum">'+chart+'</section>'+
 atmosphereTable(data,state.probe)+'</div>';
}
function sourceInfo(current,requestedMode){
 const actual=current.actualResponseMode||'nominal';
 const measured=actual==='measured';
 const meta=current.provenance;
 return {
  kind:measured?'PUBLISHED MEASURED SRF':actual==='unavailable'?'MEASURED SRF UNAVAILABLE':'NOMINAL RECTANGULAR RESPONSE',
  detail:measured?'Published 1-nm relative spectral response, weighted integration only where complete SRF support lies in 400–700 nm.':
   actual==='unavailable'?'Requested measured response is unavailable. No nominal fallback or surrogate band value was inserted.':
   'Declared band centre and width define a top-hat average. This is an educational approximation, not a measured mission SRF.',
  provenance:meta?'Publisher: '+esc(meta.publisher||'unspecified')+' · Source: '+esc(meta.sourceFile||'unknown')+
    ' · Git blob SHA: '+esc(meta.gitBlobSHA||'unavailable')+'. Original agency release is not independently confirmed.':
    requestedMode==='measured'?'No verified SRF source for this selection.':'Nominal band definitions; no published measured SRF table is used.'
 };
}
function bandStatus(b){
 return b.status==='full'?'FULL · supported':b.status==='out_of_model_domain'?'OUT OF MODEL DOMAIN':
  b.status==='partial'?'PARTIAL · no band value':'UNAVAILABLE · no band value';
}
function sensorTable(current,nominal,isRrs){
 const name=isRrs?'Rrs (sr⁻¹)':'ρ* TOA (dimensionless)';
 const rows=current.bands.map(b=>{
  const n=nominal.bands.find(x=>x.id===b.id);
  const measuredDelta=b.status==='full'&&n?.status==='full'&&Number.isFinite(b.value)&&Number.isFinite(n.value)?
  b.value-n.value:null;
  return '<tr data-srf-status="'+esc(b.status)+'"><th scope="row">'+esc(b.id)+'</th>'+
  '<td>'+fmt(b.centerNm,2)+'</td><td>'+fmt(b.widthNm,2)+'</td>'+
  '<td>'+esc(bandStatus(b))+(b.centerNm>700?' · centre above 700 nm':'')+'</td>'+
  '<td>'+(b.coverageFraction==null?'—':fmt(b.coverageFraction*100,2)+'%')+'</td>'+
  '<td>'+(b.status==='full'&&Number.isFinite(b.value)?fmt(b.value,8):'—')+'</td>'+
  '<td>'+(measuredDelta===null?'—':fmt(measuredDelta,8))+'</td></tr>';
 }).join('');
 return '<details class="p6b-data" id="p6b-sensor-table" open>'+
  '<summary>Band-integrated samples, SRF coverage and measurement status</summary>'+
  '<p>Band centre identifies the nominal band; it is not an interpolated reflectance sample. FULL coverage is required for a numeric band result. A partial, unavailable, or out-of-domain response never becomes a zero signal.</p>'+
  '<div class="p6b-table-scroll" role="region" tabindex="0" aria-label="Sensor integration values and coverage">'+
  '<table><caption>'+name+' for the selected response · 400–700 nm model domain; Δ = selected − nominal</caption>'+
  '<thead><tr><th scope="col">Band</th><th scope="col">Nominal centre (nm)</th>'+
  '<th scope="col">Nominal width (nm)</th><th scope="col">Coverage status</th>'+
  '<th scope="col">SRF coverage</th><th scope="col">'+name+'</th><th scope="col">Δ vs nominal</th></tr></thead>'+
  '<tbody>'+rows+'</tbody></table></div></details>';
}
function sensor(state,data,charts,current,nominal,legacyProfile){
 const isRrs=state.plot==='rrsBands',profile=state.plot==='srfProfile',mode=isRrs?'rrs':'toa';
 const source=sourceInfo(current,state.responseMode);
 const quantity=isRrs?'above-water Rrs (sr⁻¹)':'idealized TOA ρ* reflectance (dimensionless)';
 const complete=current.bands.filter(b=>b.status==='full'&&Number.isFinite(b.value));
 const title='Sensor-band integration and response provenance';
 const header='<section class="p6b-section p6b-hero"><div class="p6b-kicker">SENSOR · SRF SELECTION · NO EXTRAPOLATION</div>'+
  '<h3>'+title+'</h3><p>Interpret the source spectrum, spectral response function (SRF), and band-integrated samples separately. The selected quantity is '+quantity+'. No actual satellite level-1 radiance or measurement is simulated.</p>'+
  '<dl class="p6b-source"><div><dt>Sensor</dt><dd>'+esc(current.sensor?.label||current.sensor||state.sensor)+'</dd></div>'+
  '<div><dt>SRF classification</dt><dd>'+source.kind+'</dd></div>'+
  '<div><dt>Platform</dt><dd>'+esc(current.platform||'nominal teaching definition')+'</dd></div>'+
  '<div><dt>Complete bands</dt><dd>'+complete.length+' / '+current.bands.length+'</dd></div></dl>'+
  '<p class="p6b-muted">'+source.detail+'</p><p class="p6b-provenance">'+source.provenance+'</p></section>';
 const stages='<section class="p6b-section p6b-stages"><h4>Three layers of the sensor observation</h4>'+
  '<ol><li><strong>Source spectrum:</strong> 400–700 nm model grid, 1 nm samples; no values beyond the water-model domain.</li>'+
  '<li><strong>Band response:</strong> '+source.kind+'. Nonnegative nominal or published SRF weights, not a value at the band centre.</li>'+
  '<li><strong>Band integration:</strong> response-weighted mean of supported samples; normalized by the response weight integral. Incomplete SRF support gives no band value.</li></ol></section>';
 let graph;
 if(profile){
  graph='<section class="p6b-section"><h4>SRF profile preview</h4>'+
   '<p class="p6b-muted">The published measured SRF profile is an external source preview. It does not override the active response selection unless the measured mode is chosen.</p>'+
   legacyProfile+'</section>';
 }else{
  graph='<section class="p6b-chart-section" aria-label="Source spectrum with supported sensor bands">'+
   charts.chartFrame(isRrs?'Rrs source spectrum with bands':'Simulated TOA reflectance spectrum with bands',
    'SENSOR WEIGHTED RESPONSE · '+source.kind,
    [{label:quantity,values:data[mode]}],mode,
    [{label:'ACTIVE RESPONSE',value:source.kind,unit:'not interchangeable with other SRFs'},
     {label:'FULL BANDS',value:complete.length+' / '+current.bands.length,unit:'no extrapolation'},
     {label:'MODELED DOMAIN',value:'400–700 nm',unit:'no wavelengths outside model bounds'}],
    {bands:current.bands.map(b=>({c:b.centerNm,w:b.widthNm,status:b.status})),
     samples:complete.map(b=>({c:b.centerNm,value:b.value})),unit:isRrs?'sr⁻¹':'dimensionless'})+'</section>';
 }
 return '<div class="p6b-sensor">'+header+stages+graph+sensorTable(current,nominal,isRrs)+'</div>';
}
root.GeoGeekV102AtmSensor=Object.freeze({atmosphere,atmosphereClosure,atmosphereTable,sourceInfo,bandStatus,sensorTable,sensor});
})(globalThis);
