/* Water V10.2 / phase 6A: physical presentation only.
 * Uses the unchanged forward-model arrays. Not an RT photon tracing solver. */
(function(root){
'use strict';
const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function fmt(value,d=5){
 if(!Number.isFinite(value))return '—';
 return value!==0&&Math.abs(value)<.001?value.toExponential(d-1):value.toFixed(d);
}
const STEPS=Object.freeze([
 {id:'sun',number:'01',short:'Solar input',glyph:'☀',inputs:'Solar zenith angle; conceptual incident illumination',outputs:'Illumination boundary for the simplified forward model',limits:'Spectral incident irradiance and solar photons are not simulated explicitly.'},
 {id:'atm',number:'02',short:'Atmosphere',glyph:'∿',inputs:'Aerosol optical depth, pressure, solar/view geometry and modeled water signal',outputs:'Rayleigh path + aerosol path + transmitted water term',limits:'A first-order path-reflectance approximation, not an operational atmosphere or multiple-scattering solution.'},
 {id:'surface',number:'03',short:'Air–water interface',glyph:'≈',inputs:'Subsurface rrs and the approximate interface mapping',outputs:'Above-water Rrs (sr⁻¹)',limits:'The semi-analytical interface mapping is not a resolved Fresnel/refraction or sunglint radiative-transfer calculation.'},
 {id:'water',number:'04',short:'Water optics',glyph:'◉',inputs:'Absorption a(λ), backscattering bb(λ) and empirical coefficient mapping',outputs:'Subsurface rrs and modeled Rrs (sr⁻¹)',limits:'The semi-analytical IOP-to-reflectance model does not solve an angle-resolved underwater radiance field.'},
 {id:'sat',number:'05',short:'Sensor integration',glyph:'▣',inputs:'Source spectrum and selected nominal/measured spectral response',outputs:'Sensor-band weighted reflectance in SENSOR workspace',limits:'This pane reports only monochromatic values. Sensor-band integration occurs in SENSOR, not in this schematic.'}
]);
const byId=Object.fromEntries(STEPS.map(x=>[x.id,x]));
function quantity(label,value,unit,explanation){
 return '<div class="p6-value"><dt>'+escapeText(label)+'</dt><dd>'+fmt(value)+'</dd><small>'+escapeText(unit)+' · '+escapeText(explanation)+'</small></div>';
}
function path(state,data,stageData){
 const current=byId[state.stage]||byId.sun, info=stageData[current.id];
 const index=Math.round(state.probe)-400;
 const stages=STEPS.map(s=>'<button type="button" class="path-stage-card p6-step'+(s.id===current.id?' is-selected':'')+
  '" data-stage="'+s.id+'" aria-label="Inspect '+escapeText(s.short)+' stage" aria-pressed="'+(s.id===current.id)+
  '"><span class="path-stage-code">'+s.number+' / '+escapeText(s.short)+'</span>'+
  '<span class="path-stage-symbol" aria-hidden="true">'+s.glyph+'</span>'+
  '<span class="path-stage-action">'+(s.id===current.id?'SELECTED':'INSPECT')+'</span></button>').join('');
 const related=current.id==='atm'?'atm':current.id==='sat'?'sensor':current.id==='water'?'iop':current.id==='surface'?'iop':'atm';
 return '<div class="p6-path"><section class="p6-panel p6-schematic" aria-labelledby="p6-path-title">'+
  '<div class="p6-section-tag">CONCEPTUAL FLOW · SCHEMATIC ONLY</div><h3 id="p6-path-title">From illumination to sensed color</h3>'+
  '<p class="p6-explain">These five cards explain a causal sequence. They are not calculated photon trajectories, angular radiance vectors, or a rendered solution of the WATER RT reference solver.</p>'+
  '<div class="path-stage-grid p6-stage-grid" role="group" aria-label="Five conceptual radiative pathway stages">'+stages+'</div>'+
  '<div class="p6-stage-detail"><div class="p6-section-tag">SELECTED STAGE '+current.number+'</div>'+
  '<h4>'+escapeText(info.title)+'</h4><p>'+escapeText(info.text)+'</p>'+
  '<dl><div><dt>Input / conditions</dt><dd>'+escapeText(current.inputs)+'</dd></div>'+
  '<div><dt>Output / relation</dt><dd>'+escapeText(current.outputs)+'</dd></div>'+
  '<div><dt>Scientific limit</dt><dd>'+escapeText(current.limits)+'</dd></div></dl>'+
  '<p class="p6-stage-relation">'+escapeText(info.formula)+'</p>'+
  '<button type="button" class="ghost-btn" data-goto="'+related+'">Open '+(related==='atm'?'ATMOSPHERE':related==='sensor'?'SENSOR':'WATER OPTICS')+' analysis →</button></div>'+
  '<p class="p6-smallprint">Choosing a stage changes only the explanation. It does not update any physical parameter or recompute a different model.</p></section>'+
  '<section class="p6-panel p6-numeric" aria-labelledby="p6-numeric-title"><div class="p6-section-tag">ACTUAL COMPUTED MODEL VALUES · NOT A PHOTON PATH</div>'+
  '<h3 id="p6-numeric-title">Current model at '+escapeText(state.probe)+' nm</h3>'+
  '<p>These values come from the existing semi-analytical forward model at the selected wavelength. They do not come from the conceptual drawing or archived angle-resolved WATER RT samples.</p>'+
  '<dl class="p6-values">'+quantity('Absorption a(λ)',data.a?.[index],'m⁻¹','inherent optical property')+
  quantity('Backscattering bb(λ)',data.bb?.[index],'m⁻¹','inherent optical property')+
  quantity('Subsurface rrs(λ)',data.subsurfaceRrs?.[index],'sr⁻¹','approximate subsurface reflectance')+
  quantity('Above-water Rrs(λ)',data.rrs?.[index],'sr⁻¹','semi-analytical above-water reflectance')+
  quantity('Simulated TOA ρ*',data.toa?.[index],'dimensionless','idealized first-order reflectance proxy')+
  '</dl><p class="p6-limit">No independent satellite, field, or HydroLight/DISORT cross-validation is implied. A sensor-band value needs an SRF-weighted integral in the SENSOR workspace.</p></section></div>';
}
function closure(data){
 let maximumA=0,maximumBb=0;
 for(let i=0;i<data.w.length;i++){
  const a=data.absorption.water[i]+data.absorption.phytoplankton[i]+data.absorption.cdom[i]+data.absorption.nap[i];
  const bb=data.backscattering.water[i]+data.backscattering.particles[i];
  maximumA=Math.max(maximumA,Math.abs(data.a[i]-a));
  maximumBb=Math.max(maximumBb,Math.abs(data.bb[i]-bb));
 }
 return {maximumA,maximumBb};
}
const MODELS=Object.freeze({
 rrs:{title:'AOP · Rrs(λ)',description:'Above-water remote-sensing reflectance',unit:'sr⁻¹'},
 a:{title:'IOP · a(λ)',description:'Total spectral absorption',unit:'m⁻¹'},
 bb:{title:'IOP · bb(λ)',description:'Total spectral backscattering',unit:'m⁻¹'}
});
function spectralTable(data,probe){
 const grid=[400,425,450,475,500,525,550,575,600,625,650,675,700];
 if(Number.isInteger(probe)&&probe>=400&&probe<=700&&!grid.includes(probe))grid.push(probe);
 grid.sort((a,b)=>a-b);
 return '<details class="p6-data" id="p6-optics-table"><summary>Read source numeric values · 25-nm grid + active wavelength</summary>'+
  '<p>The table samples the existing 1-nm simulation. It does not interpolate new observations. Use the Tools CSV export for all 301 modeled wavelengths.</p>'+
  '<div class="p6-table-scroll" role="region" aria-label="Water optics numeric spectral values" tabindex="0">'+
  '<table><caption>Unmodified semi-analytical spectral values. All values are computed, not field measurements.</caption>'+
  '<thead><tr><th scope="col">λ (nm)</th><th scope="col">a (m⁻¹)</th><th scope="col">bb (m⁻¹)</th><th scope="col">rrs (sr⁻¹)</th><th scope="col">Rrs (sr⁻¹)</th></tr></thead><tbody>'+
  grid.map(nm=>{const i=nm-400;return '<tr'+(nm===probe?' class="p6-current-row"':'')+'><th scope="row">'+nm+'</th>'+
    [data.a[i],data.bb[i],data.subsurfaceRrs[i],data.rrs[i]].map(v=>'<td>'+fmt(v,6)+'</td>').join('')+'</tr>';}).join('')+
  '</tbody></table></div></details>';
}
function optics(state,data,charts){
 const mode=MODELS[state.plot]?state.plot:'all',idx=Math.round(state.probe)-400;
 const series={
  rrs:[{label:'Rrs above water',values:data.rrs}],
  a:[{label:'TOTAL a',values:data.a},{label:'pure water',values:data.absorption.water},{label:'phytoplankton',values:data.absorption.phytoplankton},{label:'CDOM',values:data.absorption.cdom},{label:'NAP',values:data.absorption.nap}],
  bb:[{label:'TOTAL bb',values:data.bb},{label:'pure water',values:data.backscattering.water},{label:'particles',values:data.backscattering.particles}]
 };
 const featured=mode==='all'?['a','bb','rrs']:[mode];
 const plotCards=featured.map(key=>{
  const m=MODELS[key],isAll=mode==='all';
  return '<section class="p6-spectrum" aria-label="'+m.title+' spectrum">'+
   '<header><span class="p6-section-tag">'+(key==='rrs'?'APPARENT OPTICAL PROPERTY':'INHERENT OPTICAL PROPERTY')+'</span>'+
   '<h4>'+m.title+'</h4><p>'+m.description+' · '+m.unit+'</p></header>'+
   (isAll?charts.chartSvg([{label:key==='rrs'?'Rrs':key,values:data[key]}],key,{unit:m.unit,height:220}):
    charts.chartFrame(m.title,m.description+' · '+m.unit,series[key],key,[],{unit:m.unit}))+
   '</section>';
 }).join('');
 const checks=closure(data),ok=checks.maximumA<=1e-10&&checks.maximumBb<=1e-10;
 const slopeVariant=Math.abs(state.params.sg-.0176)>1e-12||Math.abs(state.params.snap-.0123)>1e-12;
 return '<div class="p6-optics"><header class="p6-panel p6-optics-intro"><div class="p6-section-tag">400–700 nm · SEMI-ANALYTICAL · NOT FIELD VALIDATED</div>'+
  '<h3>Water optics · IOPs and AOPs</h3>'+
  '<p>Inherent optical properties (IOPs) describe absorption a and backscattering bb. Apparent optical properties (AOPs) include modeled subsurface rrs and above-water Rrs. The model maps IOPs to AOPs; it does not independently solve an angle-resolved light field.</p>'+
  '<p class="p6-limit"><strong>Quantity distinction:</strong> bb is the backscattering coefficient, not total scattering b. The scattering phase function and b are not provided by this semi-analytical workbench; neither is inferred from bb.</p>'+
  (slopeVariant?'<p class="p6-variant" role="status">EXPLORATORY SLOPE VARIANT · Current CDOM/NAP spectral slopes differ from V9-compatible defaults. Restore literature-mean slopes in Advanced parameters.</p>':
   '<p class="p6-baseline">BASELINE SLOPES · V9-compatible CDOM/NAP spectral slopes.</p>')+
  '</header><div class="p6-reading-grid" aria-label="Side-by-side IOP and AOP numerical readings">'+
  '<section class="p6-reading" aria-label="Absorption IOP"><span>IOP / ABSORPTION</span><h4>a('+state.probe+' nm)</h4><strong>'+fmt(data.a[idx])+' m⁻¹</strong><p>Pure water + phytoplankton + CDOM + NAP</p></section>'+
  '<section class="p6-reading" aria-label="Backscatter IOP"><span>IOP / BACKSCATTERING</span><h4>bb('+state.probe+' nm)</h4><strong>'+fmt(data.bb[idx])+' m⁻¹</strong><p>Pure-water + particle backscattering; not total scattering b</p></section>'+
  '<section class="p6-reading" aria-label="Reflectance AOP"><span>AOP / ABOVE-WATER REFLECTANCE</span><h4>Rrs('+state.probe+' nm)</h4><strong>'+fmt(data.rrs[idx])+' sr⁻¹</strong><p>Subsurface rrs = '+fmt(data.subsurfaceRrs[idx])+' sr⁻¹; distinct reference level</p></section></div>'+
  '<div class="p6-optics-plots'+(mode==='all'?' p6-three-panel':'')+'">'+plotCards+'</div>'+
  '<section class="p6-panel p6-closure" aria-label="Spectral component closure check"><h4>Numeric component closure · current 301-wavelength model</h4>'+
  '<p>a = a_water + a_phyto + a_CDOM + a_NAP; bb = bb_water + bb_particles. These are algebraic checks, not energy conservation or external model validation.</p>'+
  '<dl><div><dt>max |a − Σparts| (m⁻¹)</dt><dd>'+fmt(checks.maximumA,7)+'</dd></div>'+
  '<div><dt>max |bb − Σparts| (m⁻¹)</dt><dd>'+fmt(checks.maximumBb,7)+'</dd></div></dl>'+
  '<p class="'+(ok?'p6-baseline':'p6-variant')+'" role="status">'+(ok?'Component sums agree within 1×10⁻¹⁰ m⁻¹.':'Component-closure check exceeds 1×10⁻¹⁰ m⁻¹; inspect the source data.')+'</p></section>'+
  spectralTable(data,state.probe)+'</div>';
}
root.GeoGeekV102PhysicsViews=Object.freeze({path,optics,closure,spectralTable,STEPS});
})(globalThis);
