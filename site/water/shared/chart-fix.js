/** GeoGeek V7.1 chart correction. Pure presentation: no optical-model changes. */
(()=>{
 'use strict';
 const colors=['#8dbbb1','#e67c51','#cdb47a','#a1a3ed','#dd93ac'];
 const style=document.createElement('style');
 style.textContent=`
 .hero-plot{position:relative}
 svg.graph{min-height:0}
 svg.graph .graph-line{vector-effect:non-scaling-stroke}
 svg.graph .active-dot{pointer-events:none}
 .chart-hover-values{position:absolute;pointer-events:none;z-index:8;display:flex;flex-direction:column;gap:5px;max-width:min(330px,calc(100% - 10px));padding:9px 12px;background:rgba(9,24,16,.97);border:1px solid #638b75;border-radius:5px;box-shadow:0 5px 28px #000b;color:#c5d9cb;font:11px/1.45 var(--mono)}
 .chart-hover-values[hidden]{display:none!important}
 .chart-hover-values strong{font-size:12px;color:var(--accent)}
 .chart-hover-values .value-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
 .chart-hover-values .value-row i,.chart-footer .multi-values i{display:inline-block;width:8px;height:8px;border-radius:50%;flex-shrink:0}
 .chart-hover-values .value-row b{color:#fff}
 .chart-footer{flex-wrap:wrap;line-height:1.45;min-height:38px}
 .chart-footer .multi-values{display:flex;align-items:center;gap:5px 12px;flex-wrap:wrap}
 .chart-footer .multi-values .v{display:inline-flex;align-items:center;gap:4px}
 @media(max-width:735px){.chart-footer{font-size:10px}}
 `;
 document.head.appendChild(style);
 const $=id=>document.getElementById(id);
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const display=n=>!Number.isFinite(n)?'—':Math.abs(n)<1e-4&&n!==0?n.toExponential(3):n.toFixed(6);
 let ro;
 function meta(svg){return window.__geoChartFixRegistry?.[Number(svg.dataset.chartRef)];}
 function range(series){
  const values=series.flatMap(s=>s.values).filter(Number.isFinite),minData=Math.min(...values),maxData=Math.max(...values);
  const range=Math.max(1e-8,maxData-minData,Math.abs(maxData)*.08);
  let min=Math.min(0,minData-range*.06),max=maxData+range*.12;
  if(minData<0)min=minData-range*.12;
  if(max-min<1e-10)max=min+1e-6;
  return {min,max};
 }
 function geometry(svg){
  const rect=svg.getBoundingClientRect(),W=Math.max(160,Math.round(rect.width)),H=Math.max(90,Math.round(rect.height));
  return {W,H,L:W<440?68:76,R:W-(W<440?18:30),T:17,B:H-36};
 }
 function currentNm(){return clamp(Math.round(Number($('probeRange')?.value)||443),400,700);}
 function markers(svg,nm){
  const data=meta(svg);if(!data||!svg.__waterGeometry)return;
  const g=svg.__waterGeometry,d=svg.__waterDomain;
  const x=g.L+(nm-400)/300*(g.R-g.L),idx=nm-400;
  const y=v=>g.B-(v-d.min)/(d.max-d.min)*(g.B-g.T);
  const target=svg.querySelector('[data-water-markers]');
  if(target)target.innerHTML=`<line class="probe-line" x1="${x}" x2="${x}" y1="${g.T}" y2="${g.B}"/>`+
   data.series.map((s,i)=>`<circle data-probe-dot="${i}" class="active-dot" cx="${x}" cy="${y(s.values[idx])}" r="4.5" style="fill:${colors[i%colors.length]}"/>`).join('');
  const footer=svg.closest('.hero-plot')?.querySelector('.chart-footer');
  if(footer){
   const left=footer.firstElementChild;
   if(left)left.innerHTML=`<span class="multi-values">PROBE ${nm} nm · `+data.series.map((s,i)=>`<span class="v"><i style="background:${colors[i%colors.length]}"></i>${s.label}: <strong>${display(s.values[idx])}</strong> ${data.unit||''}</span>`).join('')+'</span>';
  }
 }
 function redraw(svg){
  const data=meta(svg);if(!data)return;
  const rect=svg.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
  const g=geometry(svg);
  if(svg.__waterGeometry?.W===g.W&&svg.__waterGeometry?.H===g.H&&svg.querySelector('[data-water-markers]'))return;
  const {W,H,L,R,T,B}=g;
  const lockedMin=Number(svg.dataset.domainMin),lockedMax=Number(svg.dataset.domainMax);
  // The original chart resolved the exact Y-axis lock domain and exposes it as data attributes.
  const d=Number.isFinite(lockedMin)&&Number.isFinite(lockedMax)&&lockedMax>lockedMin?{min:lockedMin,max:lockedMax}:range(data.series);
  svg.__waterGeometry=g;svg.__waterDomain=d;
  svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
  svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const x=nm=>L+(nm-400)/300*(R-L),y=v=>B-(v-d.min)/(d.max-d.min)*(B-T);
  const xticks=W<650?[400,500,600,700]:[400,450,500,550,600,650,700],yticks=[0,.25,.5,.75,1].map(t=>d.min+t*(d.max-d.min));
  const grid=xticks.map(n=>`<line class="grid" x1="${x(n)}" x2="${x(n)}" y1="${T}" y2="${B}"/><text x="${x(n)}" y="${H-10}" text-anchor="middle">${n}</text>`).join('')+
   yticks.map(v=>`<line class="grid" x1="${L}" x2="${R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L-8}" y="${y(v)+4}" text-anchor="end">${Math.abs(v)<.001&&v!==0?v.toExponential(1):v.toFixed(Math.abs(v)>1?2:4)}</text>`).join('');
  const clipId='waterplot-'+svg.dataset.chartRef;
  const bands=(data.bands||[]).map(b=>`<rect class="sensor-band" x="${x(Math.max(400,b.c-b.w/2))}" y="${T}" width="${Math.max(0,x(Math.min(700,b.c+b.w/2))-x(Math.max(400,b.c-b.w/2)))}" height="${B-T}"/>`).join('');
  const paths=data.series.map((s,i)=>`<path class="graph-line ${i===1?'compare':i>=2?'secondary':''}" style="stroke:${colors[i%colors.length]}" d="${s.values.map((v,j)=>`${j?'L':'M'}${x(400+j).toFixed(2)},${y(v).toFixed(2)}`).join(' ')}"/>`).join('');
  const samples=(data.samples||[]).filter(p=>Number.isFinite(p.value)).map(p=>`<circle class="band-sample-dot" cx="${x(p.c)}" cy="${y(p.value)}" r="4.5"><title>${p.c} nm: ${p.value}</title></circle>`).join('');
  svg.innerHTML=`<defs><clipPath id="${clipId}"><rect x="${L}" y="${T}" width="${R-L}" height="${B-T}"/></clipPath></defs>${grid}<g clip-path="url(#${clipId})">${bands}${paths}${samples}<g data-water-markers></g></g><line class="spine" x1="${L}" x2="${R}" y1="${B}" y2="${B}"/><text x="${R+8}" y="${H-10}">nm</text>`;
  markers(svg,currentNm());
 }
 function hover(svg,e){
  const g=svg.__waterGeometry,data=meta(svg);if(!g||!data)return;
  const rect=svg.getBoundingClientRect();const x=(e.clientX-rect.left)*g.W/rect.width,y=(e.clientY-rect.top)*g.H/rect.height;
  if(x<g.L||x>g.R||y<g.T||y>g.B){leave(svg);return;}
  const nm=clamp(Math.round(400+(x-g.L)/(g.R-g.L)*300),400,700);
  markers(svg,nm);
  const hero=svg.closest('.hero-plot');if(!hero)return;
  let tip=hero.querySelector('.chart-hover-values');if(!tip){tip=document.createElement('div');tip.className='chart-hover-values';hero.appendChild(tip);}
  tip.innerHTML=`<strong>${nm} nm</strong>`+data.series.map((s,i)=>`<span class="value-row"><i style="background:${colors[i%colors.length]}"></i>${s.label}: <b>${display(s.values[nm-400])}</b> ${data.unit||''}</span>`).join('');
  tip.hidden=false;
  const hb=hero.getBoundingClientRect(),tb=tip.getBoundingClientRect();
  tip.style.left=clamp(e.clientX-hb.left+12,4,Math.max(4,hero.clientWidth-tb.width-5))+'px';
  tip.style.top=clamp(e.clientY-hb.top+12,4,Math.max(4,hero.clientHeight-tb.height-5))+'px';
 }
 function leave(svg){const tip=svg.closest('.hero-plot')?.querySelector('.chart-hover-values');if(tip)tip.hidden=true;markers(svg,currentNm());}
 function bind(svg){
  if(svg.dataset.waterProbeBound)return;
  svg.dataset.waterProbeBound='1';
  svg.addEventListener('pointermove',e=>{if(e.pointerType!=='touch')hover(svg,e)});
  svg.addEventListener('pointerleave',()=>leave(svg));
  // The V7 delegated click conversion assumes a 1000-pixel-wide viewBox. Override it.
  svg.addEventListener('click',e=>{
   const g=svg.__waterGeometry;if(!g)return;
   const rect=svg.getBoundingClientRect();const x=(e.clientX-rect.left)*g.W/rect.width;
   const nm=clamp(Math.round(400+(x-g.L)/(g.R-g.L)*300),400,700);
   const slider=$('probeRange');if(slider){slider.value=String(nm);slider.dispatchEvent(new Event('input',{bubbles:true}));}
   e.stopPropagation();
  },true);
 }
 function refresh(){
  const main=$('mainContent');if(!main)return;
  ro?.disconnect();ro?.observe(main);
  for(const svg of main.querySelectorAll('svg.graph[data-chart-ref]')){
   bind(svg);redraw(svg);ro?.observe(svg);
  }
 }
 const main=$('mainContent');if(!main)return;
 ro=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>{
  for(const svg of main.querySelectorAll('svg.graph[data-chart-ref]'))redraw(svg);
 }):null;
 new MutationObserver(refresh).observe(main,{childList:true});
 refresh();
})();
