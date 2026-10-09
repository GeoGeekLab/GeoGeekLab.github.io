/* WATER V10.2 phase 5: uncertainty presentation only.
 * This file does not alter the V9 Fisher/Jacobian computation or schema v8. */
(function(root){
'use strict';
function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function num(value,digits=3){
 if(value===null||value===undefined||!Number.isFinite(value))return '—';
 return Math.abs(value)>0&&Math.abs(value)<.001?value.toExponential(digits):value.toFixed(digits);
}
function param(a,index){return a.definitions[index].label+' ('+a.selected[index]+')';}
function badge(label,value){return '<div class="u9-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';}
function assumptions(a){
 const src=a.source||{};
 return '<div class="u102-assumptions"><strong>Experiment assumptions — not observed retrieval accuracy</strong>'+
 '<dl><div><dt>Sensor</dt><dd>'+esc(src.sensor||'unspecified')+'</dd></div>'+
 '<div><dt>Response</dt><dd>'+esc(src.responseModel||'unspecified')+(src.platform?' · '+esc(src.platform):'')+'</dd></div>'+
 '<div><dt>Observation noise</dt><dd>Σ = σ²I; σ = '+num(a.noise.sigmaRrsSr1,6)+' sr⁻¹; independent, equal-variance, hypothetical band-averaged Rrs error</dd></div>'+
 '<div><dt>Difference step</dt><dd>'+esc(a.stepPercent)+'% of parameter or reference scale, bounded to the model domain</dd></div></dl>'+
 '<p>Fisher results assume a local linear model with fixed water and atmospheric assumptions. Neither instrument calibration nor independent field validation is included.</p></div>';
}
function weakest(a){
 return '<div class="u102-weakest"><strong>Weakest Fisher eigenmode (scaled coordinates)</strong><p>'+
 a.selected.map((id,i)=>esc(id)+' '+num(a.weakestDirection[i],3)).join(' · ')+
 '</p><small>Coefficients multiply Δparameter / reference scale. The eigenvector sign is arbitrary; a small eigenvalue marks a weakly constrained direction.</small></div>';
}
function spectrum(a){return '<section class="u9-subsection"><h4>Fisher eigenvalues (scaled coordinates)</h4><p class="u9-mono">'+a.eigenvalues.map((v,i)=>'λ'+(i+1)+' = '+num(v,3)).join(' · ')+'</p></section>';}
function summary(a){
 const pair=a.pairwiseColumnCosine;
 const formal=a.identifiable?
  '<div class="u9-uncertainty-grid">'+a.selected.map((id,i)=>
   '<div class="u9-uncertainty-item"><span>'+esc(param(a,i))+'</span><strong>± '+num(a.uncertainties[i],4)+'</strong><small>'+esc(a.definitions[i].unit)+' · conditional 1σ</small></div>').join('')+'</div>':
  '<p class="u9-alert" role="status">Rank-deficient design: a finite inverse Fisher covariance and formal parameter 1σ cannot be reported.</p>';
 return '<section class="u9-summary u102-uncertainty"><h3>Local identifiability · not retrieval error</h3>'+
 '<p class="u9-description">This is a sensitivity and information diagnostic at the current simulated state. Formal 1σ, when available, is conditional on the selected parameters, linearization, and assumed Σ = σ²I.</p>'+
 '<div class="u9-metrics">'+badge('NUMERICAL RANK',a.rank+' / '+a.numberOfParameters)+
 badge('FULL-COVERAGE BANDS',a.numberOfMeasurements)+badge('COND(Jscaled / σ)',num(a.condition,2))+
 badge('ASSUMED σ(Rrs)',num(a.noise.sigmaRrsSr1,6)+' sr⁻¹')+'</div>'+
 (a.identifiable?
 '<p class="u9-note">Full numerical rank is not proof of a stable inverse model. Noise correlations, calibration error, atmospheric model error, and nonlinear retrieval effects are excluded.</p>':
 '<p class="u9-alert" role="status">Rank '+a.rank+' of '+a.numberOfParameters+': the available band sensitivities cannot independently constrain the selected parameters.</p>')+
 '<section class="u9-subsection"><h4>Formal local 1σ by parameter</h4>'+formal+'</section>'+
 '<section class="u9-subsection"><h4>Most coupled Jacobian columns · cosine similarity</h4>'+
 '<p>'+(pair?.first?esc(pair.first)+' versus '+esc(pair.second)+' · cosine '+num(pair.cosine,4):
 'No pair of nonzero sensitivity columns is available')+'</p>'+
 '<p class="u9-description">The cosine describes similarity of spectral response columns, not correlation of estimated parameters.</p></section>'+
 weakest(a)+assumptions(a)+
 '<p class="u9-note">Numerical rank uses Fisher eigenvalues greater than max(10⁻¹², 10⁻⁹ × largest eigenvalue). A full-rank yet ill-conditioned design may still be unstable.</p></section>';
}
function table(title,rowLabel,labels,values,format){
 return '<div class="u102-matrix-scroll" role="region" tabindex="0" aria-label="'+esc(title)+'; scroll horizontally for additional parameters">'+
 '<table class="u102-matrix-table"><caption>'+esc(title)+'</caption><thead><tr><th scope="col">'+esc(rowLabel)+'</th>'+
 labels.map(s=>'<th scope="col">'+esc(s)+'</th>').join('')+'</tr></thead><tbody>'+
 values.map((row,i)=>'<tr><th scope="row">'+esc(row.label)+'</th>'+
 row.values.map((v,j)=>'<td>'+format(v,i,j)+'</td>').join('')+'</tr>').join('')+
 '</tbody></table></div>';
}
function jacobian(a){
 const k=a.selected.length;
 const magnitudes=a.observations.map(o=>o.derivatives.map((d,i)=>Math.abs(d*a.definitions[i].scale/a.noise.sigmaRrsSr1)));
 const maxima=Array.from({length:k},(_,i)=>Math.max(0,...magnitudes.map(row=>row[i])));
 const cols=a.selected.map((id,i)=>param(a,i)+' · sr⁻¹ / '+a.definitions[i].unit);
 const rows=a.observations.map(o=>({label:o.bandId+' · '+num(o.centerNm,1)+' nm',values:o.derivatives}));
 const matrix=table('Physical-unit Jacobian · ∂Rrs / ∂parameter','FULL SRF BAND',cols,rows,(v,i,j)=>{
  const normalized=maxima[j]>0?magnitudes[i][j]/maxima[j]:0;
  const percent=Math.min(100,normalized*100);
  return '<span class="u102-numeric">'+num(v,5)+'</span>'+
   '<span class="u102-heat-track" aria-hidden="true"><span class="u102-heat-fill '+(v<0?'is-negative':'is-positive')+
   '" style="width:'+percent.toFixed(1)+'%"></span></span>'+
   '<small class="u102-cell-note">column strength '+num(normalized,2)+' / 1</small>';
 });
 const steps=a.perturbations.map(p=>esc(p.parameter)+': '+esc(p.mode)+' ('+num(p.lower,4)+' → '+num(p.upper,4)+' '+esc(a.definitions.find(d=>d.id===p.parameter)?.unit||'')+')').join('; ');
 return '<section class="u9-summary u102-uncertainty"><h3>Jacobian · actual values and column-normalized intensity</h3>'+
 '<p class="u9-description">Each row is a FULL-coverage sensor band. Values are signed physical derivatives ∂Rrs/∂parameter. The header gives the unit for each column; colors are supplementary to the values.</p>'+
 '<p class="u102-formula">For each column j: intensity = |Jᵢⱼ × scaleⱼ / σ| ÷ maxᵢ |Jᵢⱼ × scaleⱼ / σ|. The denominator is computed separately for each parameter. Zero columns have intensity 0.</p>'+
 matrix+'<p class="u9-note">Reference parameter scales: '+a.definitions.map(d=>esc(d.id)+' = '+num(d.scale,3)+' '+esc(d.unit)).join('; ')+
 '. Hypothetical σ = '+num(a.noise.sigmaRrsSr1,6)+' sr⁻¹. The displayed derivatives remain in physical units, not normalized units.</p>'+
 '<p class="u9-description">Bounded finite differences: '+steps+'.</p>'+
 '<p class="u9-note">Excluded non-full-coverage bands: '+(a.dropped.length?a.dropped.map(x=>esc(x.id)+' ('+esc(x.status)+')').join(', '):'none')+'. There is no silent SRF extrapolation.</p>'+
 assumptions(a)+'</section>';
}
function columnCosines(a){
 const k=a.selected.length;
 const matrix=a.selected.map((_,i)=>a.selected.map((_,j)=>{
  let dot=0,aa=0,bb=0;
  for(const o of a.observations){
   const x=o.derivatives[i]*a.definitions[i].scale, y=o.derivatives[j]*a.definitions[j].scale;
   dot+=x*y;aa+=x*x;bb+=y*y;
  }
  return aa>0&&bb>0?Math.max(-1,Math.min(1,dot/Math.sqrt(aa*bb))):null;
 }));
 return matrix;
}
function correlations(a){
 const labels=a.selected.map((_,i)=>param(a,i));
 const cosRows=columnCosines(a).map((row,i)=>({label:labels[i],values:row}));
 const cosTable=table('Jacobian column cosine similarity · NOT parameter correlation','PARAMETER',labels,cosRows,
  v=>'<span class="u102-numeric">'+num(v,4)+'</span>');
 let fisher;
 if(!a.identifiable){
  fisher='<p class="u9-alert" role="status">The Jacobian is numerically rank deficient ('+a.rank+' / '+a.numberOfParameters+
   '). No inverse Fisher covariance or parameter correlation matrix is reported. The Jacobian cosine matrix above remains descriptive only.</p>';
 }else{
  const rows=a.correlation.map((row,i)=>({label:labels[i],values:row}));
  const corr=table('Inverse-Fisher parameter correlation · conditional on Σ = σ²I','PARAMETER',labels,rows,
   v=>'<span class="u102-numeric">'+num(v,4)+'</span>');
  const covRows=a.covariance.map((row,i)=>({label:labels[i],values:row}));
  const cov=table('Inverse-Fisher covariance · parameter units multiplied','PARAMETER',labels,covRows,
   (v,i,j)=>'<span class="u102-numeric">'+num(v,5)+'</span><small class="u102-cell-note">'+esc(a.definitions[i].unit)+' × '+esc(a.definitions[j].unit)+'</small>');
  fisher='<h4>Inverse-Fisher covariance-derived parameter correlation</h4>'+
   '<p class="u9-description">C = (JᵀΣ⁻¹J)⁻¹ after reference-scale conversion; rᵢⱼ = Cᵢⱼ / √(CᵢᵢCⱼⱼ). This matrix describes conditional parameter-estimate correlation, not cosine similarity.</p>'+
   corr+'<details class="u102-cov-details"><summary>Show conditional covariance matrix with physical parameter units</summary>'+cov+'</details>';
 }
 return '<section class="u9-summary u102-uncertainty"><h3>Two different diagnostics · do not interchange</h3>'+
 '<h4>Jacobian column cosine similarity</h4>'+
 '<p class="u9-description">The cosine compares the shapes of two scaled Rrs sensitivity columns across full-coverage bands. ±1 indicates almost parallel or antiparallel columns. It is not a statistical correlation coefficient from observations.</p>'+
 cosTable+'<section class="u9-subsection">'+fisher+'</section>'+weakest(a)+spectrum(a)+assumptions(a)+
 '<p class="u9-note">A missing matrix entry (—) indicates an undefined cosine or coefficient. The rank test uses the same Fisher eigenvalue cutoff as the scientific engine. No correlated-noise inference is made.</p></section>';
}
root.GeoGeekV102UncertaintyViews=Object.freeze({summary,jacobian,correlations,columnCosines});
})(globalThis);
