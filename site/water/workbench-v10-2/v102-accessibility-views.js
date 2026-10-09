/* Water V10.2 Stage 8: presentation-only accessible chart equivalents and exports.
 * Reads existing plotted series (the exact arrays handed to SVG) without
 * altering model, sensor integration, RT reference or schema-v8 experiments. */
(function(root){
'use strict';
const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const csvCell=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
const fmt=x=>Number.isFinite(x)?Number(x).toPrecision(10):'undefined';
const TERMS=Object.freeze([
 ['Rrs(λ)','Above-water remote-sensing reflectance. Defined as water-leaving radiance divided by downwelling irradiance, in sr⁻¹; the workbench uses a simulated Rrs.'],
 ['rrs(λ)','Subsurface remote-sensing reflectance in sr⁻¹. It is not interchangeable with above-water Rrs.'],
 ['a(λ)','Total inherent absorption coefficient in m⁻¹. It describes absorption, not a remote-sensing reflectance.'],
 ['b(λ)','Total inherent scattering coefficient in m⁻¹. The displayed bb is backscattering only; bb is not total b.'],
 ['bb(λ)','Inherent backscattering coefficient in m⁻¹, covering only scattering into the backward hemisphere.'],
 ['ρ*TOA(λ)','First-order simulated top-of-atmosphere reflectance proxy, dimensionless. Not calibrated radiance or satellite L1/L2 observation.'],
 ['Atmospheric correction','Recovery with an assumed atmosphere within this same model. Matched model closure cannot validate retrieval accuracy against independent observations.'],
 ['SRF','Spectral response function. Nominal top-hat and published 1-nm measured response are different integration assumptions; incomplete bands have no fabricated value.'],
 ['Numerical sensitivity','Finite-difference ∂Rrs/∂p is in sr⁻¹ per unit p; positive-step ΔRrs is in sr⁻¹ and normalized elasticity is dimensionless.'],
 ['RT reference','Fixed archived in-water radiative-transfer sample grid. It is not a run of an arbitrary-angle solver and is not independently cross-validated here.']
]);
function glossary(){
 return '<details class="v102-sci-glossary" id="v102ScienceGlossary">'+
 '<summary>Scientific terms, quantities and model limits</summary>'+
 '<div class="v102-glossary-body"><p>The same wavelength can have different physically defined quantities and units. These are model outputs, not measurements.</p>'+
 '<dl>'+TERMS.map(([t,d])=>'<div><dt>'+escapeHTML(t)+'</dt><dd>'+escapeHTML(d)+'</dd></div>').join('')+'</dl></div></details>';
}
function chartSeries(registry,tab,plot,probe){
 if(!Array.isArray(registry))return [];
 const valid=[];
 registry.forEach((entry,i)=>{
  if(!entry||!Array.isArray(entry.series)||!entry.series.length)return;
  const series=entry.series.filter(q=>Array.isArray(q.values)&&q.values.length===301); // Preserve non-finite evidence explicitly as undefined, never silently drop the trace.
  if(!series.length)return;
  valid.push({chartIndex:i,mode:entry.mode,unit:entry.unit||'',tab,plot,probe,
   series:series.map(({label,values})=>({label:String(label),values:[...values]}))});
 });
 return valid;
}
function semanticTable(chart,id){
 const samples=[400,425,450,475,500,525,550,575,600,625,650,675,700];
 if(Number.isInteger(chart.probe)&&chart.probe>=400&&chart.probe<=700&&!samples.includes(chart.probe))samples.push(chart.probe);
 samples.sort((a,b)=>a-b);
 const unit=chart.unit||'see labeled quantity';
 const rows=samples.map(nm=>'<tr'+(nm===chart.probe?' class="v102-probe-row"':'')+'><th scope="row">'+nm+'</th>'+
  chart.series.map(s=>'<td>'+escapeHTML(fmt(s.values[nm-400]))+'</td>').join('')+'</tr>').join('');
 return '<details class="v102-chart-equivalent" id="'+id+'">'+
 '<summary>Read chart values as a numerical table ('+escapeHTML(chart.mode)+')</summary>'+
 '<p>All 301 plotted 1 nm samples are available in the current-view CSV/JSON exports. Below are 400–700 nm sample rows and the selected probe. The actual plotted units are '+escapeHTML(unit)+'. A negative sign and an exact zero are retained; undefined is never displayed as zero.</p>'+
 '<div class="v102-table-scroll" role="region" tabindex="0" aria-label="Numerical values for '+escapeHTML(chart.mode)+'">'+
 '<table><caption>'+escapeHTML(chart.mode)+' · model output, not field data · '+escapeHTML(unit)+'</caption>'+
 '<thead><tr><th scope="col">λ (nm)</th>'+chart.series.map(q=>'<th scope="col">'+escapeHTML(q.label)+' ('+escapeHTML(unit)+')</th>').join('')+
 '</tr></thead><tbody>'+rows+'</tbody></table></div></details>';
}
function enhance(container,registry,state){
 if(!container)return {charts:0};
 const charts=chartSeries(registry,state.tab,state.plot,state.probe);
 for(const chart of charts){
  const el=container.querySelector('svg[data-chart-ref="'+chart.chartIndex+'"]');
  if(!el)continue;
  const id='v102-chart-equivalent-'+chart.chartIndex;
  el.setAttribute('aria-describedby',id+'-description');
  el.setAttribute('aria-label','Simulated '+chart.mode+' spectrum. '+chart.series.map(x=>x.label).join(', ')+
   '. 400 to 700 nanometers, 1 nm spacing, '+(chart.unit||'see series units')+'. Use arrow keys for the probe; a numerical table immediately follows.');
  const fragment=document.createElement('div');
  fragment.className='v102-chart-access';
  fragment.innerHTML='<p id="'+id+'-description" class="v102-chart-help">Values for every plotted trace can be read numerically and exported at native 1 nm resolution. Colors are redundant with legend names, signed numbers, and table headers.</p>'+semanticTable(chart,id);
  const parent=el.closest('.hero-plot')||el.parentElement;
  parent.insertAdjacentElement('afterend',fragment);
 }
 const toolbar=container.querySelector('.v102-current-view-actions');
 toolbar?.remove();
 if(charts.length){
  const el=document.createElement('div');
  el.className='v102-current-view-actions';
  el.setAttribute('role','group');
  el.setAttribute('aria-label','Export currently displayed modeled spectral traces');
  el.innerHTML='<span>Plot-derived values, not raw satellite data · 301 wavelengths · explicit units</span>'+
   '<button type="button" class="ghost-btn" data-export-view="csv">Export this plot CSV</button>'+
   '<button type="button" class="ghost-btn" data-export-view="json">Export this plot JSON</button>';
  container.insertBefore(el,container.firstChild);
 }
 container.insertAdjacentHTML('beforeend',glossary());
 return {charts:charts.length};
}
function exportView(registry,state,format,meta={}){
 if(!['csv','json'].includes(format))throw new RangeError('Unsupported export format');
 const charts=chartSeries(registry,state.tab,state.plot,state.probe);
 if(!charts.length)return null;
 const data={kind:'water-v102-current-view',schemaVersion:1,sourceExperimentSchema:8,
  source:'GeoGeek simulated forward-model chart series, not measured L1/L2, field validation or a new RT simulation',
  waterModel:meta.modelVersion||null,workspace:state.tab,plot:state.plot,
  probeWavelengthNm:state.probe,wavelength_nm:Array.from({length:301},(_,i)=>400+i),
  charts:charts.map(c=>({mode:c.mode,unit:c.unit||'quantity-specific; see plotted legend',series:c.series}))};
 const basename='water_v102_'+String(state.tab).replace(/[^a-z0-9_-]/gi,'')+'_'+String(state.plot).replace(/[^a-z0-9_-]/gi,'')+'_current_view';
 if(format==='json')return {filename:basename+'.json',mime:'application/json;charset=utf-8',content:JSON.stringify(data,null,2)};
 const lines=['# water-v102-current-view schema=1, sourceExperimentSchema=8',
  '# source=GeoGeek first-order model simulation; not measured observations or independently validated retrieval',
  '# workspace='+data.workspace+';plot='+data.plot+';probe_nm='+data.probeWavelengthNm+';model='+String(data.waterModel||'unspecified')];
 for(const c of charts){
  lines.push('# chart='+c.chartIndex+';mode='+c.mode+';unit='+c.unit.replace(/[\r\n,]/g,' '));
  lines.push(['wavelength_nm',...c.series.map(s=>s.label+' ('+(c.unit||'unit unspecified')+')')].map(csvCell).join(','));
  for(let i=0;i<301;i++)lines.push([400+i,...c.series.map(s=>Number.isFinite(s.values[i])?String(s.values[i]):'')].map(csvCell).join(','));
 }
 return {filename:basename+'.csv',mime:'text/csv;charset=utf-8',content:lines.join('\n')};
}
root.GeoGeekV102A11y=Object.freeze({TERMS,chartSeries,glossary,semanticTable,enhance,exportView});
})(globalThis);
