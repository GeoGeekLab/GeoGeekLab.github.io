/* Water V10.2 · Stage 7. Science-first explanations built from existing arrays.
 * Only presentation and scenario actions; no correction, finite-difference, or
 * forward-model algorithm is modified. */
(function(root){
'use strict';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmt(x,n=6){return Number.isFinite(x)?(x!==0&&Math.abs(x)<.0001?x.toExponential(3):x.toFixed(n)):'—';}
const wavelengths=probe=>{const samples=[400,425,450,475,500,525,550,575,600,625,650,675,700];if(Number.isInteger(probe)&&probe>=400&&probe<=700&&!samples.includes(probe))samples.push(probe);return samples.sort((a,b)=>a-b);};
function table({id,title,note,headers,rows}){
 return '<details class="p7-data" id="'+esc(id)+'"><summary>'+esc(title)+'</summary><p>'+esc(note)+'</p>'+
 '<div class="p7-table-scroll" role="region" tabindex="0" aria-label="'+esc(title)+'">'+
 '<table><caption>'+esc(note)+'</caption><thead><tr>'+headers.map(h=>'<th scope="col">'+esc(h)+'</th>').join('')+
 '</tr></thead><tbody>'+rows.map(row=>'<tr'+(row.active?' class="p7-probe-row"':'')+'><th scope="row">'+esc(row.nm)+'</th>'+
 row.values.map(x=>'<td>'+esc(x)+'</td>').join('')+'</tr>').join('')+'</tbody></table></div></details>';
}
function acSummary(state,data){
 const p=state.params,matched=Math.abs(p.corrAot-p.aot)<1e-12&&Math.abs(p.corrAlpha-p.alpha)<1e-12;
 const residual=data.corrected.map((v,i)=>v-data.rrs[i]);
 const rmse=Math.sqrt(residual.reduce((sum,d)=>sum+d*d,0)/residual.length);
 const bias=residual.reduce((sum,d)=>sum+d,0)/residual.length;
 return {matched,residual,rmse,bias,negativeCount:data.corrected.filter(x=>x<0).length};
}
function ac(state,data,existingChart){
 const p=state.params,stat=acSummary(state,data),idx=state.probe-400;
 const mode=stat.matched?'MATCHED FORWARD / INVERSE ASSUMPTIONS':'PERTURBED ASSUMED ATMOSPHERE';
 const domain='This is a self-consistency and model-perturbation experiment. Independent atmospheric-correction validation requires measured or independently simulated observations, which are not present here.';
 const rows=wavelengths(state.probe).map(nm=>{const i=nm-400;return {nm,active:nm===state.probe,values:[fmt(data.rrs[i],8),fmt(data.corrected[i],8),fmt(stat.residual[i],8)]};});
 return '<div class="p7-workspace p7-ac">'+
 '<section class="p7-panel p7-principle" aria-labelledby="p7-ac-heading"><span class="p7-kicker">ATMOSPHERIC CORRECTION · SAME FORWARD AND INVERSE MODEL</span>'+
 '<h3 id="p7-ac-heading">Correction is not independent validation</h3>'+
 '<p>'+domain+'</p><div class="p7-steps" role="list">'+
 '<div role="listitem"><b>01 · Forward model</b><span>Generate idealized TOA ρ* from a modeled water Rrs and assumed atmosphere; no satellite measurement.</span></div>'+
 '<div role="listitem"><b>02 · Inverse hypothesis</b><span>Apply first-order correction using independently adjustable assumed AOT and Ångström exponent, but the same model family.</span></div>'+
 '<div role="listitem"><b>03 · Conditional comparison</b><span>Compare recovered Rrs against its own forward-model reference. Matched assumptions can close by construction.</span></div>'+
 '<div role="listitem" class="p7-no-validation"><b>04 · Independent validation</b><span>NOT PERFORMED: no independent RT solver, field matchup, or instrument L1/L2 observation.</span></div></div></section>'+
 '<section class="p7-panel" aria-labelledby="p7-ac-state"><h4 id="p7-ac-state">Current experiment · '+mode+'</h4>'+
 '<div class="p7-metrics">'+
 '<div><span>Forward-model AOT(550)</span><strong>'+fmt(p.aot,4)+'</strong><small>unitless</small></div>'+
 '<div><span>Assumed inverse AOT(550)</span><strong>'+fmt(p.corrAot,4)+'</strong><small>unitless</small></div>'+
 '<div><span>Forward / inverse α</span><strong>'+fmt(p.alpha,3)+' / '+fmt(p.corrAlpha,3)+'</strong><small>Ångström exponent · unitless</small></div>'+
 '<div><span>Δ AOT / Δ α (assumed − forward)</span><strong>'+fmt(p.corrAot-p.aot,4)+' / '+fmt(p.corrAlpha-p.alpha,3)+'</strong><small>not external errors</small></div>'+
 '<div><span>Internal spectral RMSE</span><strong>'+fmt(stat.rmse,8)+'</strong><small>sr⁻¹ · 301 wavelengths</small></div>'+
 '<div><span>Signed mean residual</span><strong>'+fmt(stat.bias,8)+'</strong><small>sr⁻¹ · recovered − reference</small></div>'+
 '<div><span>Negative corrected wavelengths</span><strong>'+stat.negativeCount+'</strong><small>not clipped or hidden</small></div>'+
 '<div><span>Selected probe residual</span><strong>'+fmt(stat.residual[idx],8)+'</strong><small>sr⁻¹ at '+state.probe+' nm</small></div></div>'+
 '<p class="p7-interpret" role="note">'+(stat.matched?'Matched inverse assumptions: small internal residuals indicate same-model algebraic closure, not accuracy on measured data.':
 'Perturbed assumptions: the displayed residual is sensitivity to aerosol-parameter mismatch inside the same first-order model, not an empirical correction error.')+'</p></section>'+
 '<section class="p7-plot" aria-label="Original atmospheric correction chart and OC4 diagnostic">'+existingChart+'</section>'+
 table({id:'p7-ac-values',title:'Read reference, corrected Rrs and signed residual as numbers',note:'400–700 nm · same-model simulation · all quantities in sr⁻¹; full data in existing CSV export.',headers:['λ (nm)','Reference Rrs (sr⁻¹)','Recovered Rrs (sr⁻¹)','Recovered − reference (sr⁻¹)'],rows})+
 '</div>';
}
const fields=[['chl','Chl-a','mg m⁻³'],['ag','CDOM a_g(440)','m⁻¹'],['anap','NAP a_NAP(443)','m⁻¹'],['bbp','Particle b_bp(443)','m⁻¹']];
function snapshotLabel(snapshot,fallback){
 return esc(snapshot?.name||fallback)+(snapshot?.savedAt?' · saved '+esc(snapshot.savedAt):'');
}
function compareSummary(state,models){
 const a=state.baseline?.params,bStored=state.snapshotB;
 const usingSaved=state.compareBSource==='saved'&&Boolean(bStored);
 const b=usingSaved?bStored.params:state.params;
 const A=models.run(a),B=models.run(b);
 const residual=B.rrs.map((x,i)=>x-A.rrs[i]);
 const rmse=Math.sqrt(residual.reduce((sum,v)=>sum+v*v,0)/residual.length);
 return {usingSaved,A,B,residual,rmse};
}
function compare(state,models,existingChart){
 const stat=compareSummary(state,models);
 const a=state.baseline,selected=stat.usingSaved?state.snapshotB:null;
 const bName=stat.usingSaved?snapshotLabel(selected,'Saved B'):'Live working state · not a saved snapshot';
 const compared=fields.map(([key,label,unit])=>'<tr><th scope="row">'+esc(label)+'</th><td>'+fmt(a.params[key],5)+'</td><td>'+fmt((selected?.params||state.params)[key],5)+'</td><td>'+esc(unit)+'</td></tr>').join('');
 const rows=wavelengths(state.probe).map(nm=>{const i=nm-400;return {nm,active:nm===state.probe,values:[fmt(stat.A.rrs[i],8),fmt(stat.B.rrs[i],8),fmt(stat.residual[i],8)]};});
 return '<div class="p7-workspace p7-compare"><section class="p7-panel p7-principle" aria-labelledby="p7-compare-heading">'+
 '<span class="p7-kicker">SAVED REFERENCE VS SELECTED SCENARIO · SAME FORWARD MODEL</span>'+
 '<h3 id="p7-compare-heading">Which spectra are compared?</h3>'+
 '<div class="p7-identity-grid"><div><span>SCENARIO A · SNAPSHOT</span><strong>'+snapshotLabel(a,'Reference A')+'</strong><small>Fixed until Save current as A or Reset A to defaults.</small></div>'+
 '<div><span>SCENARIO B · '+(stat.usingSaved?'SAVED SNAPSHOT':'LIVE CURRENT STATE')+'</span><strong>'+bName+'</strong>'+
 '<small>'+(stat.usingSaved?'Frozen values; adjusting working controls does not change the plotted B.':
 'Updating current parameters immediately changes B; a saved B may exist but is not currently plotted.')+'</small></div></div>'+
 '<p>Both use the same 400–700 nm numerical forward model; ΔRrs = B − A (sr⁻¹). Saved scenarios preserve their parameter identities in schema v8 JSON exports; they are not measurements or field observations.</p>'+
 (state.snapshotB&&!stat.usingSaved?'<p class="p7-note">A saved B exists ('+snapshotLabel(state.snapshotB,'B')+'), but the chart currently uses live B.</p>':'')+
 '</section><section class="p7-panel" aria-labelledby="p7-compare-values"><h4 id="p7-compare-values">A and selected B · primary IOP assumptions</h4>'+
 '<div class="p7-table-scroll p7-param-table" role="region" tabindex="0" aria-label="Current A and B parameter comparison">'+
 '<table><caption>Inputs to the same optical forward model</caption><thead><tr><th scope="col">Parameter</th><th scope="col">A fixed</th><th scope="col">B '+(stat.usingSaved?'saved':'live')+'</th><th scope="col">Unit</th></tr></thead><tbody>'+compared+'</tbody></table></div>'+
 '<p class="p7-interpret">Spectral RMS(B − A): '+fmt(stat.rmse,8)+' sr⁻¹ · comparison only, not an uncertainty estimate.</p>'+
 '<div class="p7-actionrow" aria-label="Explicit comparison reset actions">'+
 '<button type="button" class="ghost-btn" data-compare-reset="live">Return B to live current state</button>'+
 '<button type="button" class="ghost-btn" data-compare-reset="clear-b" '+(!state.snapshotB?'disabled':'')+'>Clear saved B snapshot</button>'+
 '<button type="button" class="ghost-btn" data-compare-reset="defaults">Reset A to model defaults</button></div>'+
 '<p class="p7-note">Clearing saved B or resetting A changes only scenario state. It does not reset the working optical parameters or change the saved JSON schema.</p>'+
 '</section><section class="p7-plot" aria-label="Original A/B comparison spectrum">'+existingChart+'</section>'+
 table({id:'p7-compare-spectrum',title:'Read A, B and signed B − A spectral values',note:'Same model and wavelength grid, no observations · sr⁻¹. Existing CSV export contains all wavelengths.',headers:['λ (nm)','A Rrs (sr⁻¹)','B Rrs (sr⁻¹)','B − A (sr⁻¹)'],rows})+
 '</div>';
}
function sensitivity(state,result,existingChart){
 const r=result,param=r.parameter,step=r.stepPercent,idx=state.probe-400;
 const stepLo=fmt(r.baseParameter-r.lowerParameter,6),stepHi=fmt(r.upperParameter-r.baseParameter,6);
 const oneSided=r.derivativeScheme==='one-sided',isAsymmetric=r.derivativeScheme==='asymmetric two-sided';
 const rows=wavelengths(state.probe).map(nm=>{const i=nm-400;return {nm,active:nm===state.probe,values:[fmt(r.derivative[i],8),fmt(r.delta[i],8),r.elasticity[i]==null?'undefined':fmt(r.elasticity[i],6)]};});
 return '<div class="p7-workspace p7-sensitivity"><section class="p7-panel p7-principle" aria-labelledby="p7-sens-heading">'+
 '<span class="p7-kicker">LOCAL FINITE DIFFERENCE · NUMERICAL DIAGNOSTIC, NOT AN INVERSION</span>'+
 '<h3 id="p7-sens-heading">What does a parameter perturbation mean?</h3>'+
 '<p>Only <strong>'+esc(param)+'</strong> changes; all other water-state parameters remain fixed. A derivative is a change in simulated Rrs per unit change of that parameter. A finite positive-step ΔRrs is a reflectance difference, not a derivative or observed noise.</p>'+
 '<div class="p7-metrics">'+
 '<div><span>Parameter & baseline</span><strong>'+esc(param)+' = '+fmt(r.baseParameter,6)+'</strong><small>'+esc(r.derivativeUnit.replace(/^sr⁻¹ per /,''))+'</small></div>'+
 '<div><span>Requested relative numerical step</span><strong>'+step+'%</strong><small>not measurement uncertainty</small></div>'+
 '<div><span>Actual lower / upper parameter</span><strong>'+fmt(r.lowerParameter,6)+' / '+fmt(r.upperParameter,6)+'</strong><small>within configured parameter domain</small></div>'+
 '<div><span>Actual − / + step</span><strong>'+stepLo+' / '+stepHi+'</strong><small>units of '+esc(param)+'</small></div>'+
 '<div><span>Finite difference scheme</span><strong>'+esc(r.derivativeScheme)+'</strong><small>'+(oneSided?'parameter bound prevents a two-sided step':isAsymmetric?'bounds make the two-sided offsets unequal':'symmetric offsets within bounds')+'</small></div>'+
 '<div><span>Local derivative at '+state.probe+' nm</span><strong>'+fmt(r.derivative[idx],8)+'</strong><small>'+esc(r.derivativeUnit)+'</small></div>'+
 '<div><span>Positive-step ΔRrs at '+state.probe+' nm</span><strong>'+fmt(r.delta[idx],8)+'</strong><small>sr⁻¹ · upper − baseline</small></div>'+
 '<div><span>Dimensionless elasticity</span><strong>'+(r.elasticity[idx]==null?'undefined':fmt(r.elasticity[idx],5))+'</strong><small>(p / Rrs) × ∂Rrs/∂p</small></div></div>'+
 '<p class="p7-interpret">'+(oneSided?'ONE-SIDED BOUNDARY: the finite-difference stencil cannot extend below or above the parameter limit.':
 isAsymmetric?'ASYMMETRIC BOUNDARY: the two offsets differ due to the bounded parameter interval.':
 'CENTERED DIFFERENCE: numerical offsets are symmetric at this parameter state.')+
 ' Elasticity is dimensionless only where p &gt; 0 and baseline Rrs is not near zero; otherwise it is undefined.</p>'+
 '</section><section class="p7-plot" aria-label="Original local sensitivity spectra and sensor-band result">'+existingChart+'</section>'+
 table({id:'p7-sens-spectrum',title:'Read physical derivatives, positive-step differences, and elasticity',note:'Numerical finite differences of the existing semi-analytical model · not inverse accuracy or observation noise.',headers:['λ (nm)','∂Rrs/∂'+param+' ('+r.derivativeUnit+')','ΔRrs positive step (sr⁻¹)','Elasticity (unitless)'],rows})+
 '</div>';
}
root.GeoGeekV102AnalysisViews=Object.freeze({ac,acSummary,compare,compareSummary,sensitivity,table,wavelengths});
})(globalThis);
