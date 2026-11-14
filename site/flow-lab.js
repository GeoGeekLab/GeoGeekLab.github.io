(() => {
'use strict';

const V='20261002a';
const WORLD='https://raw.githubusercontent.com/martynafford/natural-earth-geojson/0b9a6ceb0a7032713abd9460ac1e995a9c60cd1e/110m/cultural/ne_110m_admin_0_countries.json';
const GFS='https://raw.githubusercontent.com/cambecc/earth/5f091f0c3b60aa38a996a886985bacb3673d16c3/public/data/weather/current/current-wind-surface-level-gfs-1.0.json';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const wrapLon=lon=>((lon+180)%360+360)%360-180;

// Canonical teaching datasets now live in flow/v3/core/movement.mjs.

function style(){
  if($('#ggFlowLabStyle'))return;
  const s=document.createElement('style');s.id='ggFlowLabStyle';s.textContent=`
  .flow-lab{--p:#f1efe7;--m:rgba(241,239,231,.55);--l:rgba(241,239,231,.11);--a:#d16339;--cyan:#86d8cf;display:grid;grid-template-columns:minmax(0,1.7fr) minmax(300px,.58fr);gap:11px;height:100%;min-height:0;padding:8px}
  .flow-map-shell{position:relative;min-width:0;min-height:0;overflow:hidden;border:1px solid var(--l);border-radius:18px;background:#06100c;box-shadow:0 24px 70px rgba(0,0,0,.2);touch-action:none;user-select:none}
  .flow-map-shell.drag{cursor:grabbing}.flow-map-shell canvas,.flow-map-shell svg{position:absolute;inset:0;width:100%;height:100%;display:block}.flow-base{z-index:1}.flow-fx{z-index:2;pointer-events:none}.flow-svg{z-index:3;overflow:visible}.flow-overlay-hit{pointer-events:stroke;cursor:pointer}
  .flow-hud{position:absolute;z-index:8;left:12px;right:12px;top:12px;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;gap:8px;align-items:center;padding:7px 8px 7px 11px;border:1px solid var(--l);border-radius:12px;background:rgba(5,10,7,.75);backdrop-filter:blur(12px)}
  .flow-hud strong,.flow-hud span,.flow-hud button{font:700 8px/1 var(--mono);letter-spacing:.085em}.flow-hud strong{color:var(--p)}.flow-hud span{color:var(--m);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.flow-hud button{height:27px;padding:0 9px;border:1px solid var(--l);border-radius:8px;background:transparent;color:var(--m);cursor:pointer}.flow-hud button:hover{color:var(--p)}
  .flow-tabs{position:absolute;z-index:8;left:12px;top:54px;display:flex;padding:3px;border:1px solid var(--l);border-radius:11px;background:rgba(5,10,7,.72);backdrop-filter:blur(12px)}.flow-tabs button{min-width:68px;height:28px;border:0;border-radius:8px;background:transparent;color:rgba(241,239,231,.48);font:700 8px/1 var(--mono);letter-spacing:.075em;cursor:pointer}.flow-tabs button.active{background:rgba(209,99,57,.15);color:var(--p);box-shadow:inset 0 0 0 1px rgba(209,99,57,.35)}
  .flow-legend{position:absolute;z-index:7;left:12px;bottom:12px;display:flex;gap:6px;flex-wrap:wrap}.flow-legend span{padding:6px 8px;border:1px solid var(--l);border-radius:999px;background:rgba(5,10,7,.72);color:var(--m);font:700 7px/1 var(--mono);letter-spacing:.065em}.flow-legend b{color:var(--p)}
  .flow-tip{position:absolute;z-index:11;display:none;max-width:250px;padding:8px 10px;border:1px solid var(--l);border-radius:10px;background:rgba(4,8,6,.94);color:var(--p);font:650 9px/1.4 var(--mono);pointer-events:none;box-shadow:0 14px 38px rgba(0,0,0,.3)}.flow-tip.show{display:block}.flow-tip small{display:block;color:var(--m);margin-top:3px}
  .flow-zoom{position:absolute;z-index:8;right:12px;bottom:12px;display:flex;overflow:hidden;border:1px solid var(--l);border-radius:10px;background:rgba(5,10,7,.76)}.flow-zoom button,.flow-zoom output{height:29px;min-width:31px;border:0;border-right:1px solid rgba(241,239,231,.08);background:transparent;color:var(--m);font:700 8px/1 var(--mono)}.flow-zoom button{cursor:pointer}.flow-zoom output{display:grid;place-items:center;min-width:48px;color:var(--p)}.flow-zoom>*:last-child{border-right:0}
  .flow-rail{display:grid;align-content:start;gap:7px;min-width:0;min-height:0;overflow:auto}.flow-card{display:grid;gap:9px;padding:12px;border:1px solid var(--l);border-radius:14px;background:linear-gradient(180deg,rgba(17,24,20,.94),rgba(9,15,12,.97))}.flow-card-head{display:flex;justify-content:space-between;gap:9px;align-items:start}.flow-card-head>div{display:grid;gap:4px}.flow-card-head span,.flow-kicker{color:var(--m);font:700 7px/1 var(--mono);letter-spacing:.12em}.flow-card-head strong{color:var(--p);font:650 13px/1.2 var(--sans)}.flow-badge{padding:5px 7px;border:1px solid var(--l);border-radius:999px;color:var(--m);font:700 7px/1 var(--mono);font-style:normal;letter-spacing:.07em;white-space:nowrap}
  .flow-mode-copy{margin:0;color:rgba(241,239,231,.64);font:450 10.5px/1.5 var(--sans)}.flow-mode-copy b{color:rgba(241,239,231,.88);font-weight:600}.flow-question{padding:8px 9px;border-left:2px solid rgba(209,99,57,.72);background:rgba(209,99,57,.045);color:rgba(241,239,231,.72);font:500 10px/1.45 var(--sans)}
  .flow-controls{display:grid;gap:8px}.flow-range{display:grid;gap:5px}.flow-range>span{display:flex;justify-content:space-between;gap:8px;color:var(--m);font:700 7px/1 var(--mono);letter-spacing:.075em}.flow-range output{color:var(--p)}.flow-range input{width:100%;margin:0;accent-color:var(--a)}
  .flow-buttons{display:grid;grid-template-columns:repeat(2,1fr);gap:5px}.flow-buttons.three{grid-template-columns:repeat(3,1fr)}.flow-btn{min-height:34px;border:1px solid rgba(241,239,231,.09);border-radius:9px;background:rgba(255,255,255,.012);color:rgba(241,239,231,.62);font:700 7px/1 var(--mono);letter-spacing:.07em;cursor:pointer}.flow-btn.active{border-color:rgba(209,99,57,.5);background:rgba(209,99,57,.1);color:var(--p)}
  .flow-metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:5px}.flow-metric{display:grid;gap:3px;padding:7px;border:1px solid rgba(241,239,231,.07);border-radius:9px}.flow-metric span{color:var(--m);font:700 6.5px/1 var(--mono);letter-spacing:.06em}.flow-metric strong{color:var(--p);font:650 10px/1.15 var(--sans)}
  .flow-inspect{margin:0;display:grid}.flow-inspect div{display:grid;grid-template-columns:72px 1fr;gap:7px;padding:6px 0;border-top:1px solid rgba(241,239,231,.065)}.flow-inspect div:first-child{border-top:0}.flow-inspect dt{color:var(--m);font:700 6.5px/1.4 var(--mono);letter-spacing:.075em}.flow-inspect dd{margin:0;color:rgba(241,239,231,.74);font:500 9.5px/1.4 var(--sans);overflow-wrap:anywhere}
  .flow-source{display:flex;align-items:center;justify-content:space-between;gap:8px;padding-top:7px;border-top:1px solid rgba(241,239,231,.07);color:var(--m);font:700 7px/1.35 var(--mono);letter-spacing:.06em}.flow-source a{color:rgba(241,239,231,.75)}
  .flow-matrix{display:grid;grid-template-columns:56px repeat(4,1fr);font:700 6.5px/1.2 var(--mono);letter-spacing:.045em}.flow-matrix>*{padding:6px 4px;border-right:1px solid rgba(241,239,231,.055);border-top:1px solid rgba(241,239,231,.055);color:var(--m);text-align:center}.flow-matrix b{color:rgba(241,239,231,.8);text-align:left}.flow-matrix i{font-style:normal;color:rgba(241,239,231,.7)}
  .flow-timeline{display:grid;grid-template-columns:auto 1fr auto;gap:7px;align-items:center}.flow-timeline input{width:100%;accent-color:var(--a)}.flow-timeline button{width:32px;height:30px;border:1px solid var(--l);border-radius:8px;background:transparent;color:var(--p);cursor:pointer}.flow-timeline output{min-width:34px;color:var(--p);font:700 8px/1 var(--mono);text-align:right}
  .flow-attribution{font:500 8.5px/1.45 var(--sans);color:rgba(241,239,231,.48)}
  @media(max-width:1000px){.flow-lab{grid-template-columns:1fr;grid-template-rows:minmax(470px,62vh) auto;height:auto;overflow:auto}.flow-rail{grid-template-columns:repeat(2,1fr);overflow:visible}.flow-card:first-child{grid-column:1/-1}}
  @media(max-width:680px){.flow-lab{grid-template-rows:minmax(420px,58vh) auto;padding:6px}.flow-rail{grid-template-columns:1fr}.flow-hud{grid-template-columns:1fr auto auto}.flow-hud span{display:none}.flow-tabs{right:12px;overflow:auto}.flow-tabs button{min-width:57px}.flow-legend{max-width:70%}}
  @media(prefers-reduced-motion:reduce){.flow-lab *{scroll-behavior:auto!important;transition:none!important}}
  `;document.head.appendChild(s);
}

function setConditions(){const c=$('#instrumentConditions');if(c)c.innerHTML=[['INPUT','Vector field · OD · timestamped paths'],['GEOMETRY','Field · network · trajectory · particles'],['TIME','Snapshot · aggregate · sequence'],['LIMIT','Representation ≠ phenomenon']].map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('');}
async function getJSON(url,signal,timeout=12000,cache='no-store'){
  const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeout),relay=()=>c.abort();
  signal?.addEventListener('abort',relay,{once:true});
  try{
    const r=await fetch(url,{mode:'cors',cache,signal:c.signal,headers:{Accept:'application/json'}});
    if(!r.ok)throw Error(`HTTP ${r.status}`);
    return await r.json();
  }finally{
    clearTimeout(timer);signal?.removeEventListener?.('abort',relay);
  }
}

function meteoUrl(){const lats=[],lons=[];for(let lat=-60;lat<=60;lat+=20)for(let lon=-180;lon<180;lon+=30){lats.push(lat);lons.push(lon)}return `https://api.open-meteo.com/v1/forecast?latitude=${lats.join(',')}&longitude=${lons.join(',')}&current=wind_speed_10m,wind_direction_10m&wind_speed_unit=ms&timezone=GMT`;}
function windFromDirection(speed,deg){const r=deg*Math.PI/180;return[-speed*Math.sin(r),-speed*Math.cos(r)]}
async function loadOpenMeteo(signal,policy){
  const raw=await getJSON(meteoUrl(),signal,12000,policy.SOURCE_CACHE_POLICY.live);
  const result=policy.validateLiveGrid(raw);
  return{
    kind:'regular',source:'Open-Meteo / current 10 m wind',
    sourceUrl:'https://open-meteo.com/en/docs',time:result.time,
    retrievedAt:new Date().toISOString(),
    limit:'Coarse model snapshot and interpolation. Not measured observations or a trajectory forecast.',
    ...result,cols:12,rows:7,lon0:-180,lat0:-60,dx:30,dy:20,wrap:true
  };
}
async function loadGFS(signal,policy){
  const raw=await getJSON(GFS,signal,16000,policy.SOURCE_CACHE_POLICY.pinned);
  if(!Array.isArray(raw))throw Error('Invalid GFS sample');
  const ur=raw.find(x=>x?.header?.parameterCategory===2&&x?.header?.parameterNumber===2)||raw[0];
  const vr=raw.find(x=>x?.header?.parameterCategory===2&&x?.header?.parameterNumber===3)||raw[1];
  const shape=policy.validateGfsVectors(ur,vr);
  return{
    kind:'gfs',source:'NOAA GFS sample / earth.nullschool lineage',
    sourceUrl:'https://github.com/cambecc/earth',
    time:ur.header.refTime||'pinned model sample',
    retrievedAt:new Date().toISOString(),
    limit:'Pinned archived GFS surface wind. No live model-valid time or forecast lead can be inferred.',
    u:Float32Array.from(ur.data),v:Float32Array.from(vr.data),...shape
  };
}
function proceduralWind(){return{kind:'procedural',source:'Procedural vector field fallback',sourceUrl:'',time:'deterministic fallback',limit:'Synthetic fallback for interaction continuity; not meteorological data.'};}
async function mount({signal,stage}={}){
  if(!stage||signal?.aborted)return()=>{};
  const [
    {sampleWind,advanceGeographic,canDrawSegment,fieldBounds},
    {advanceFixedClock,advanceTripTime,playbackCanAdvance},
    {createPlateCarreeViewport},
    {advanceFrozenField},
    {windSpeedColor,WIND_COLOR_STOPS,fieldMetadata,seedDisk},
    {NODES,OD,TRIPS,sortedEdges,odNodeTotals,odNetworkTotals,tripMetrics,tripPosition},
    sourcePolicy,
    {FlowTelemetry,FLOW_PERF_BUDGET}
  ]=await Promise.all([
    import(new URL('flow/v3/core/field.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/clock.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/projection.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/integrator.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/analysis.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/movement.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/source-policy.mjs',document.baseURI).href),
    import(new URL('flow/v3/core/telemetry.mjs',document.baseURI).href)
  ]);
  if(signal?.aborted)return()=>{};
  style();setConditions();
  stage.innerHTML='<div class="instrument-loading"><span>↝</span><strong>Assembling geographic flow representations…</strong></div>';
  let world=null,wind=null;
  const failures=[];
  // Fetch boundaries concurrently; slow GeoJSON must not delay the wind request.
  const mapTask=getJSON(WORLD,signal,6000,sourcePolicy.SOURCE_CACHE_POLICY.world)
    .catch(()=>{failures.push('map-unavailable');return null;});
  try{wind=await loadOpenMeteo(signal,sourcePolicy)}
  catch{
    failures.push('live-unavailable');
    if(!signal?.aborted){
      try{wind=await loadGFS(signal,sourcePolicy)}
      catch{failures.push('archive-unavailable');wind=proceduralWind()}
    }
  }
  world=await mapTask;
  if(signal?.aborted)return()=>{};
  if(!wind)wind=proceduralWind();
  const windMeta=fieldMetadata(wind);
  const provenance=sourcePolicy.classifyWindProvenance(wind);

  stage.innerHTML=`<div class="flow-lab" data-mode="field">
    <section class="flow-map-shell" id="flMap" tabindex="0" role="region" aria-label="Interactive geographic flow map. Arrow keys pan, plus and minus zoom, Home fits, Enter samples the map centre." aria-describedby="flMapHelp">
      <canvas class="flow-base" id="flBase"></canvas><canvas class="flow-fx" id="flFx"></canvas><svg class="flow-svg" id="flSvg" aria-hidden="true"></svg>
      <div class="flow-hud"><strong id="flModeTitle">FIELD / EULERIAN</strong><span id="flHudSource">${wind.source}</span><button type="button" id="flPause">PAUSE</button><button type="button" id="flReset">RESET</button></div>
      <div class="flow-tabs" role="tablist"><button class="active" data-mode="field" type="button">FIELD</button><button data-mode="od" type="button">OD</button><button data-mode="trips" type="button">TRIPS</button><button data-mode="release" type="button">RELEASE</button></div>
      <div class="flow-legend" id="flLegend"><span><b>FIELD</b> local velocity</span><span>particle path ≠ forecast track</span></div><div class="flow-tip" id="flTip"></div><output id="flSampleReadout" class="flow-sample-readout" aria-label="Pinned map sample" hidden></output><p id="flMapHelp" class="flow-visually-hidden">The geographic map maintains a two to one Plate Carrée aspect. Tap to sample the local model field. Use arrow keys to pan and Enter to inspect the map centre.</p><output id="flSampleLive" class="flow-visually-hidden" role="status" aria-live="polite"></output>
      <div class="flow-zoom"><button type="button" data-z="out" aria-label="Zoom out">−</button><output id="flZoom">100%</output><button type="button" data-z="in" aria-label="Zoom in">+</button><button type="button" data-z="fit" aria-label="Fit the complete world map">FIT</button></div>
    </section>
    <aside class="flow-rail">
      <section class="flow-card"><div class="flow-card-head"><div><span>REPRESENTATION</span><strong id="flRepTitle">Continuous vector field</strong></div><em class="flow-badge" id="flRepBadge">EULERIAN</em></div><p class="flow-mode-copy" id="flRepCopy">A field stores a velocity at every sampled location. It answers <b>how is the medium moving here?</b>, not where one object actually travelled.</p><div class="flow-question" id="flQuestion">Read direction, magnitude, interpolation and uncertainty before reading the particles as paths.</div><div id="flDynamic" class="flow-controls"></div></section>
      <section class="flow-card"><div class="flow-card-head"><div><span>INSPECTOR</span><strong>Read the movement</strong></div><em class="flow-badge" id="flStatus">${wind.kind==='procedural'?'FALLBACK':'DATA'}</em></div><div class="flow-metrics"><div class="flow-metric"><span>MODE</span><strong id="flMetricMode">FIELD</strong></div><div class="flow-metric"><span>TIME</span><strong id="flMetricTime">SNAPSHOT</strong></div><div class="flow-metric"><span>GEOMETRY</span><strong id="flMetricGeom">GRID</strong></div></div><dl class="flow-inspect" id="flInspect"><div><dt>POINTER</dt><dd>Move over the map to inspect the current representation.</dd></div><div><dt>SOURCE</dt><dd>${wind.source}</dd></div><div><dt>LIMIT</dt><dd>${wind.limit}</dd></div></dl><div class="flow-source"><span id="flSourceLabel">${wind.time}</span><a id="flSourceLink" href="${wind.sourceUrl||'#'}" ${wind.sourceUrl?'target="_blank" rel="noreferrer"':''}>SOURCE ↗</a></div></section>
      <section class="flow-card"><div class="flow-card-head"><div><span>FLOW ≠ ONE GEOMETRY</span><strong>Representation matrix</strong></div></div><div class="flow-matrix"><b></b><i>FIELD</i><i>OD</i><i>TRIPS</i><i>RELEASE</i><b>space</b><span>continuous</span><span>nodes</span><span>paths</span><span>particles</span><b>time</b><span>snapshot</span><span>aggregate</span><span>sequence</span><span>derived</span><b>question</b><span>velocity?</span><span>how much?</span><span>where?</span><span>where if?</span></div><p class="flow-attribution">Design references: earth.nullschool-style particle advection, flowmap.gl / Kepler-style OD networks, and deck.gl TripsLayer-style temporal trajectories. The Lab keeps these grammars separate so animation does not imply a false data model.</p></section>
    </aside>
  </div>`;

  const shell=$('.flow-lab',stage),map=$('#flMap',stage),base=$('#flBase',stage),fx=$('#flFx',stage),svg=$('#flSvg',stage),tip=$('#flTip',stage),dynamic=$('#flDynamic',stage),inspect=$('#flInspect',stage),legend=$('#flLegend',stage),zoomOut=$('#flZoom',stage),pauseBtn=$('#flPause',stage),sourceLink=$('#flSourceLink',stage),sourceLabel=$('#flSourceLabel',stage),status=$('#flStatus',stage);
  shell.dataset.sourceClass=provenance.status;
  shell.dataset.sourceCache=wind.kind==='regular'?'no-store':wind.kind==='gfs'?'force-cache':'none';
  shell.dataset.sourceFailures=failures.join(',');
  shell.dataset.basemapStatus=world?.features?'available':'unavailable';
  shell.dataset.modelValidUtc=provenance.validTimeUtc===null?'':new Date(provenance.validTimeUtc).toISOString();
    const bctx=base.getContext('2d'),fctx=fx.getContext('2d');
  const reduce=matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  const telemetry=new FlowTelemetry();
  const flowDiagnostics=()=>{
    const canvasBytes=base.width*base.height*4+fx.width*fx.height*4;
    return telemetry.snapshot({
      mode:state.mode,density:state.density,paused:state.paused,reducedMotion:!!reduce,
      documentHidden:document.hidden,activeRelease:state.release.length,
      svgPaths:svg.querySelectorAll('path').length,
      domNodes:shell.querySelectorAll('*').length,
      canvasSurfaceMiB:canvasBytes/(1024*1024),
      sourceClass:provenance.status,
      budgets:FLOW_PERF_BUDGET,
      cleanupComplete:destroyed
    });
  };
  shell._flowDiagnostics=flowDiagnostics;
  shell._flowResetMetrics=()=>telemetry.reset();
  const state={mode:'field',zoom:1,panX:0,panY:0,paused:!!reduce,density:900,speed:36000,simulatedSeconds:0,vectors:true,fieldStyle:'glyphs',top:12,curves:true,tripTime:30,tripPlay:!reduce,trail:22,releaseCount:80,releaseLife:180,releaseRadiusKm:60,releaseIntegrator:'rk4',releaseElapsedSeconds:0,release:[]};
  let W=1,H=1,dpr=1,particles=[],raf=0,last=performance.now(),tripLast=last,fieldCarry=0,releaseCarry=0,drag=null,resizer=null,destroyed=false;
  let projection=createPlateCarreeViewport(W,H);
  function refreshProjection(){
    projection=createPlateCarreeViewport(W,H,state.zoom,state.panX,state.panY);
    map.dataset.worldWidth=String(projection.worldWidth);
    map.dataset.worldHeight=String(projection.worldHeight);
    map.dataset.projectionLeft=String(projection.left);
    map.dataset.projectionTop=String(projection.top);
  }
  function project(lon,lat){return projection.project(lon,lat)}
  function invert(x,y){const result=projection.invert(x,y);return result.valid?[result.lon,result.lat]:null}
  function setCanvas(c,ctx){c.width=Math.max(1,Math.floor(W*dpr));c.height=Math.max(1,Math.floor(H*dpr));ctx.setTransform(dpr,0,0,dpr,0,0)}
  function resize(){const r=map.getBoundingClientRect();W=Math.max(1,r.width);H=Math.max(1,r.height);refreshProjection();dpr=Math.min(2,devicePixelRatio||1);setCanvas(base,bctx);setCanvas(fx,fctx);svg.setAttribute('viewBox',`0 0 ${W} ${H}`);drawBase();renderStatic();clearFx()}
  function clearFx(){fctx.setTransform(dpr,0,0,dpr,0,0);fctx.clearRect(0,0,W,H)}
  function pathRing(ring){if(!ring?.length)return;bctx.beginPath();ring.forEach((p,i)=>{const q=project(p[0],p[1]);i?bctx.lineTo(q[0],q[1]):bctx.moveTo(q[0],q[1])});bctx.closePath();bctx.fill();bctx.stroke()}
  function drawBase(){telemetry.baseRedraws++;bctx.setTransform(dpr,0,0,dpr,0,0);bctx.clearRect(0,0,W,H);const g=bctx.createRadialGradient(W*.5,H*.45,20,W*.5,H*.45,Math.max(W,H)*.65);g.addColorStop(0,'#101d16');g.addColorStop(1,'#050a07');bctx.fillStyle=g;bctx.fillRect(0,0,W,H);bctx.save();bctx.strokeStyle='rgba(241,239,231,.055)';bctx.lineWidth=.7;for(let lon=-150;lon<=150;lon+=30){const a=project(lon,-80),z=project(lon,80);bctx.beginPath();bctx.moveTo(a[0],a[1]);bctx.lineTo(z[0],z[1]);bctx.stroke()}for(let lat=-60;lat<=60;lat+=20){const a=project(-180,lat),z=project(180,lat);bctx.beginPath();bctx.moveTo(a[0],a[1]);bctx.lineTo(z[0],z[1]);bctx.stroke()}if(world?.features){bctx.fillStyle='rgba(157,170,160,.18)';bctx.strokeStyle='rgba(241,239,231,.19)';bctx.lineWidth=.65;for(const f of world.features){const g=f.geometry;if(!g)continue;if(g.type==='Polygon')g.coordinates.forEach(pathRing);else if(g.type==='MultiPolygon')g.coordinates.forEach(poly=>poly.forEach(pathRing))}}bctx.restore();if(state.mode==='field'||state.mode==='release'){drawCoverageMask();drawVectors()}}
  function drawCoverageMask(){
    if(!wind)return;
    // The missing-data texture is a statement about source coverage, not wind speed.
    const topLimit=windMeta.latitudeMax,bottomLimit=windMeta.latitudeMin;
    bctx.save();
    const shade=(low,high)=>{
      const a=project(-180,high),b=project(180,low);
      const left=Math.min(a[0],b[0]),top=Math.min(a[1],b[1]);
      const width=Math.abs(b[0]-a[0]),height=Math.abs(b[1]-a[1]);
      if(width<=0||height<=0)return;
      bctx.beginPath();bctx.rect(left,top,width,height);bctx.clip();
      bctx.fillStyle='rgba(8,10,11,.61)';bctx.fillRect(left,top,width,height);
      bctx.strokeStyle='rgba(180,193,190,.20)';bctx.lineWidth=.65;
      for(let x=left-height;x<left+width+height;x+=16){
        bctx.beginPath();bctx.moveTo(x,top+height);bctx.lineTo(x+height,top);bctx.stroke();
      }
    };
    if(topLimit<89)shade(topLimit,90);
    bctx.restore();bctx.save();
    if(bottomLimit>-89)shade(-90,bottomLimit);
    bctx.restore();
    bctx.save();bctx.setLineDash([3,5]);bctx.strokeStyle='rgba(213,228,223,.30)';
    for(const latitude of [topLimit,bottomLimit]){
      const a=project(-180,latitude),b=project(180,latitude);
      bctx.beginPath();bctx.moveTo(...a);bctx.lineTo(...b);bctx.stroke();
    }
    bctx.restore();
    map.dataset.fieldCoverage=windMeta.coverage;
  }
  function drawStreamlines(){
    // Frozen vector-field streamline glyphs, not material paths or trajectories.
    bctx.save();bctx.lineWidth=.8;bctx.globalAlpha=.43;
    for(let lat=-55;lat<=55;lat+=16)for(let lon=-175;lon<180;lon+=24){
      if(!sampleWind(wind,lon,lat).valid)continue;
      const sample=sampleWind(wind,lon,lat);
      bctx.strokeStyle=windSpeedColor(sample.speed)||'#86d8cf';
      let old={lon,lat},pathOpen=false;
      bctx.beginPath();
      for(let i=0;i<19;i++){
        const next=advanceFrozenField(wind,old.lon,old.lat,600,'rk2');
        if(!next.valid||!canDrawSegment(old,next,{maxLonDelta:8,maxLatDelta:8}))break;
        const a=project(old.lon,old.lat),b=project(next.lon,next.lat);
        if(!pathOpen){bctx.moveTo(...a);pathOpen=true;}
        bctx.lineTo(...b);
        old=next;
      }
      if(pathOpen)bctx.stroke();
    }
    bctx.restore();
  }
  function drawVectors(){
    if(!wind||state.fieldStyle==='hidden')return;
    if(state.fieldStyle==='streamlines'){drawStreamlines();return;}
    bctx.save();bctx.globalAlpha=.75;bctx.lineWidth=1.05;
    for(let lat=-60;lat<=60;lat+=20)for(let lon=-180;lon<180;lon+=30){
      const w=sampleWind(wind,lon,lat);if(!w.valid)continue;
      const p=project(lon,lat),len=clamp(w.speed*1.3,5,20),ang=Math.atan2(-w.v,w.u);
      const dx=Math.cos(ang),dy=Math.sin(ang),x2=p[0]+dx*len,y2=p[1]+dy*len;
      bctx.strokeStyle=windSpeedColor(w.speed)||'#86d8cf';
      bctx.beginPath();bctx.moveTo(p[0],p[1]);bctx.lineTo(x2,y2);
      bctx.lineTo(x2-dx*4-dy*2,y2-dy*4+dx*2);
      bctx.moveTo(x2,y2);bctx.lineTo(x2-dx*4+dy*2,y2-dy*4-dx*2);bctx.stroke();
    }
    bctx.restore();
  }
  function randomSeed(){
    const bounds=fieldBounds(wind);
    const min=Math.max(-70,bounds.minLat+2),max=Math.min(70,bounds.maxLat-2);
    return {lon:Math.random()*360-180,lat:min+Math.random()*Math.max(1,max-min)};
  }
  function seedParticles(){
    particles=Array.from({length:state.density},()=>{
      const seed=randomSeed();
      return {...seed,age:Math.random()*65000,max:110000+Math.random()*140000};
    });
    fieldCarry=0;
  }
  function resetParticle(p){
    Object.assign(p,randomSeed());
    p.age=0;
    p.max=110000+Math.random()*140000;
  }
  function frameClock(dt,channel){
    const key=channel==='field'?'field':'release';
    const result=advanceFixedClock({
      elapsedMs:dt,rate:state.speed,
      remainderSeconds:key==='field'?fieldCarry:releaseCarry,
      stepSeconds:120,maxElapsedMs:100,maxSteps:120
    });
    if(key==='field')fieldCarry=result.remainderSeconds;
    else releaseCarry=result.remainderSeconds;
    state.simulatedSeconds+=result.simulatedSeconds;
    shell.dataset.simulatedSeconds=String(Math.round(state.simulatedSeconds));
    if(key==='release'){
      state.releaseElapsedSeconds+=result.simulatedSeconds;
      shell.dataset.releaseElapsedHours=(state.releaseElapsedSeconds/3600).toFixed(2);
      const elapsed=$('#flReleaseElapsed',stage);
      if(elapsed)elapsed.textContent=(state.releaseElapsedSeconds/3600).toFixed(1)+' h';
    }
    return result;
  }
  function drawFieldFrame(dt){
    if(!wind)return;
    const clock=frameClock(dt,'field');
    fctx.save();fctx.fillStyle='rgba(5,10,7,.055)';fctx.fillRect(0,0,W,H);
    fctx.lineWidth=.75;fctx.strokeStyle='rgba(134,216,207,.52)';
    for(const p of particles){
      const before={lon:p.lon,lat:p.lat};
      let connected=true;
      for(let i=0;i<clock.steps;i++){
        const next=advanceGeographic(wind,p.lon,p.lat,clock.stepSeconds);
        if(!next.valid){resetParticle(p);connected=false;continue;}
        if(next.wrapped)connected=false;
        p.lon=next.lon;p.lat=next.lat;
        p.age+=clock.stepSeconds;
        if(p.age>=p.max){resetParticle(p);connected=false;}
      }
      const after={lon:p.lon,lat:p.lat};
      if(!clock.steps||!connected||!canDrawSegment(before,after))continue;
      const a=project(before.lon,before.lat),b=project(after.lon,after.lat);
      if(Math.abs(a[0]-b[0])>W*.2||Math.abs(a[1]-b[1])>H*.2)continue;
      fctx.beginPath();fctx.moveTo(a[0],a[1]);fctx.lineTo(b[0],b[1]);fctx.stroke();
    }
    fctx.restore();
  }
  function animateRelease(dt){
    // A derived experiment starts with a seed. Empty screens have no elapsed release time.
    if(!wind||!state.release.length)return;
    const clock=frameClock(dt,'release');
    fctx.save();fctx.fillStyle='rgba(5,10,7,.07)';fctx.fillRect(0,0,W,H);
    const survivors=[];
    for(const p of state.release){
      const before={lon:p.lon,lat:p.lat};
      let connected=true,valid=true;
      for(let i=0;i<clock.steps;i++){
        const next=advanceFrozenField(wind,p.lon,p.lat,clock.stepSeconds,state.releaseIntegrator);
        if(!next.valid){valid=false;connected=false;break;}
        if(next.wrapped)connected=false;
        p.lon=next.lon;p.lat=next.lat;
        p.age+=clock.stepSeconds;
      }
      if(!valid||p.age>=state.releaseLife*3600)continue;
      survivors.push(p);
      const after={lon:p.lon,lat:p.lat};
      if(!clock.steps||!connected||!canDrawSegment(before,after))continue;
      const a=project(before.lon,before.lat),b=project(after.lon,after.lat);
      if(Math.abs(a[0]-b[0])>W*.2||Math.abs(a[1]-b[1])>H*.2)continue;
      const alpha=clamp(1-p.age/(state.releaseLife*3600),0,1);
      fctx.strokeStyle=`rgba(209,99,57,${alpha*.72})`;fctx.lineWidth=1;
      fctx.beginPath();fctx.moveTo(a[0],a[1]);fctx.lineTo(b[0],b[1]);fctx.stroke();
      fctx.fillStyle=`rgba(255,218,195,${alpha})`;fctx.fillRect(b[0]-1,b[1]-1,2,2);
    }
    state.release=survivors;
    updateReleaseStats();
    fctx.restore();
    if(!survivors.length)clearFx();
  }
  function qPath(a,b,curve=.22){const dx=b[0]-a[0],dy=b[1]-a[1],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,n=Math.hypot(dx,dy)||1,cx=mx-dy/n*n*curve,cy=my+dx/n*n*curve;return`M${a[0].toFixed(1)},${a[1].toFixed(1)} Q${cx.toFixed(1)},${cy.toFixed(1)} ${b[0].toFixed(1)},${b[1].toFixed(1)}`}
  function renderOD(){
    const visible=sortedEdges(OD,state.top),used=new Set();
    svg.innerHTML='';
    // Direction arrowheads encode origin -> destination, not travel geometry.
    const ns='http://www.w3.org/2000/svg';
    const defs=document.createElementNS(ns,'defs');
    const marker=document.createElementNS(ns,'marker');
    for(const [key,value] of Object.entries({id:'flOdArrow',viewBox:'0 0 10 10',refX:'9',refY:'5',markerWidth:'4.2',markerHeight:'4.2',orient:'auto-start-reverse',markerUnits:'strokeWidth'})){
      marker.setAttribute(key,value);
    }
    const arrow=document.createElementNS(ns,'path');
    arrow.setAttribute('d','M 0 0 L 10 5 L 0 10 z');
    arrow.setAttribute('fill','#df946e');
    marker.appendChild(arrow);defs.appendChild(marker);svg.appendChild(defs);
    for(const edge of visible){
      used.add(edge.a);used.add(edge.b);
      const from=NODES[edge.a],to=NODES[edge.b],a=project(from[0],from[1]),b=project(to[0],to[1]);
      const path=document.createElementNS(ns,'path');
      path.setAttribute('d',state.curves?qPath(a,b,.16):`M${a[0]},${a[1]}L${b[0]},${b[1]}`);
      path.setAttribute('fill','none');
      path.setAttribute('stroke','rgba(209,99,57,.75)');
      path.setAttribute('stroke-width',String(1.2+edge.value/34));
      path.setAttribute('stroke-linecap','round');
      path.setAttribute('marker-end','url(#flOdArrow)');
      path.setAttribute('class','flow-overlay-hit');
      path.dataset.type='od';path.dataset.id=String(edge.id);
      path.dataset.direction=edge.a+'-to-'+edge.b;
      svg.appendChild(path);
    }
    for(const id of used){
      const n=NODES[id],p=project(n[0],n[1]),c=document.createElementNS(ns,'circle');
      c.setAttribute('cx',p[0]);c.setAttribute('cy',p[1]);c.setAttribute('r','3.2');
      c.setAttribute('fill','#f1efe7');c.setAttribute('stroke','rgba(5,10,7,.8)');
      c.setAttribute('stroke-width','1.2');
      c.dataset.type='node';c.dataset.id=id;c.style.pointerEvents='all';c.style.cursor='pointer';
      svg.appendChild(c);
    }
    shell.dataset.odVisibleEdges=String(visible.length);
  }
  function tripPoint(trip,t){const pts=trip.pts;if(t<=pts[0][2])return pts[0];if(t>=pts[pts.length-1][2])return pts[pts.length-1];for(let i=1;i<pts.length;i++)if(t<=pts[i][2]){const a=pts[i-1],b=pts[i],f=(t-a[2])/(b[2]-a[2]);return[a[0]+(b[0]-a[0])*f,a[1]+(b[1]-a[1])*f,t]}return pts.at(-1)}
  function tripTrail(trip,t,trail){const start=Math.max(0,t-trail),points=[];for(let q=start;q<t;q+=3)points.push(tripPoint(trip,q));points.push(tripPoint(trip,t));return points}
  function renderTrips(){shell.dataset.tripTime=state.tripTime.toFixed(2);svg.innerHTML='';for(let ti=0;ti<TRIPS.length;ti++){const tr=TRIPS[ti],pts=tripTrail(tr,state.tripTime,state.trail);if(pts.length<2)continue;const d=pts.map((q,i)=>{const p=project(q[0],q[1]);return`${i?'L':'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`}).join(' '),path=document.createElementNS('http://www.w3.org/2000/svg','path');path.setAttribute('d',d);path.setAttribute('fill','none');path.setAttribute('stroke',tr.color==='warm'?'rgba(209,99,57,.85)':'rgba(241,239,231,.62)');path.setAttribute('stroke-width','2');path.setAttribute('stroke-linecap','round');path.setAttribute('class','flow-overlay-hit');path.dataset.type='trip';path.dataset.id=ti;svg.appendChild(path);const head=project(...tripPoint(tr,state.tripTime));const c=document.createElementNS('http://www.w3.org/2000/svg','circle');c.setAttribute('cx',head[0]);c.setAttribute('cy',head[1]);c.setAttribute('r','2.7');c.setAttribute('fill',tr.color==='warm'?'#e57449':'#f1efe7');svg.appendChild(c)}}
  function renderStatic(){telemetry.svgRedraws++;svg.innerHTML='';if(state.mode==='od')renderOD();if(state.mode==='trips')renderTrips()}
  function tick(now){
    if(destroyed)return;
    const started=performance.now();
    const dt=Math.max(0,Math.min(100,now-last));
    last=now;
    if(!document.hidden){
      if(playbackCanAdvance(state)){
        if(state.mode==='field')drawFieldFrame(dt);
        else if(state.mode==='release')animateRelease(dt);
      }
      if(state.mode==='trips'){
        if(playbackCanAdvance(state)&&now-tripLast>=140){
          const elapsed=now-tripLast;
          tripLast=now;
          state.tripTime=advanceTripTime(state.tripTime,elapsed);
          const range=$('#flTripTime',stage);
          if(range){
            range.value=String(Math.round(state.tripTime));
            $('#flTripOut',stage).textContent=String(Math.round(state.tripTime));
            renderTrips();
          }
        }else if(!playbackCanAdvance(state))tripLast=now;
      }else tripLast=now;
    }else tripLast=now;
    telemetry.frame(performance.now()-started);
    raf=requestAnimationFrame(tick);
  }

  function updateReleaseStats(){
    shell.dataset.releaseActive=String(state.release.length);
    shell.dataset.releaseIntegrator=state.releaseIntegrator;
    shell.dataset.seedRadiusKm=String(state.releaseRadiusKm);
    const count=$('#flActiveCount',stage);
    if(count)count.textContent=String(state.release.length);
  }
  function windLegend(){
    const stops=WIND_COLOR_STOPS;
    const gradient='linear-gradient(90deg,'+stops.map(([v,c])=>c+' '+(v/30*100)+'%').join(',')+')';
    const key='<div class="flow-speed-legend" aria-label="Model wind speed from 0 to 30 or more metres per second">'+
      '<strong>WIND SPEED · m/s</strong>'+
      '<span class="flow-speed-bar" style="background:'+gradient+'"></span>'+
      '<span class="flow-speed-ticks">0 · 5 · 10 · 15 · 20 · 30+</span></div>';
    return key+'<span class="flow-wind-time">'+windMeta.type+' · '+windMeta.timeLabel+
      '</span><span>hatch = no valid wind · particle path ≠ forecast</span>';
  }
  function provenanceCard(){
    const sourceTerms=wind.kind==='regular'
      ?'<a href="https://open-meteo.com/en/terms" target="_blank" rel="noopener noreferrer">Weather data: Open-Meteo · CC BY 4.0</a>'
      :wind.kind==='gfs'?'Archived GFS sample · attribution via earth.nullschool lineage'
      :'Synthetic teaching fallback · no external weather data';
    const mapTerms=world?.features
      ?'<a href="https://www.naturalearthdata.com/about/terms-of-use/" target="_blank" rel="noopener noreferrer">Basemap: Natural Earth · public domain</a>'
      :'Basemap unavailable · countries not drawn';
    const failuresText=failures.length?'SOURCE RECOVERY · '+failures.join(' / '):'SOURCE RECOVERY · none';
    return '<div class="flow-data-provenance" id="flDataProvenance">'+
      '<strong>'+windMeta.type+'</strong>'+
      '<span>'+windMeta.timeLabel+'</span>'+
      '<span>RETRIEVED UTC · '+(wind.retrievedAt||'NOT APPLICABLE')+'</span>'+
      '<span data-source-freshness>'+provenance.label+'</span>'+
      '<span>LAT COVERAGE · '+windMeta.coverage+'</span>'+
      '<span>SPATIAL · '+windMeta.resolution+'</span>'+
      '<span>'+failuresText+'</span>'+
      '<span>'+sourceTerms+'</span><span>'+mapTerms+'</span>'+
      '<small>'+windMeta.caveat+'</small></div>';
  }
  const modeMeta={
    field:{title:'Continuous vector field',badge:'EULERIAN',copy:'A field stores a velocity at every sampled location. It answers <b>how is the medium moving here?</b>, not where one object actually travelled.',q:'Read direction, magnitude, interpolation and uncertainty before reading particles as paths.',time:'SNAPSHOT',geom:'GRID'},
    od:{title:'Origin–destination network',badge:'AGGREGATE',copy:'An OD network aggregates movement between places. Line width encodes <b>how much connects A and B</b>; the arc is a diagram, not the literal travelled route.',q:'Compare node totals, direction and top-N filtering. Do not infer physical paths from schematic arcs.',time:'AGGREGATE',geom:'NETWORK'},
    trips:{title:'Timestamped trajectories',badge:'SEQUENCE',copy:'Trips attach time to ordered positions. Trails answer <b>where did an object move, and when?</b> rather than describing a continuous medium.',q:'Trail length changes the visual memory window. The demonstration tracks are reproducible teaching data, not observed vehicles.',time:'SEQUENCE',geom:'PATHS'},
    release:{title:'Lagrangian release',badge:'DERIVED',copy:'Release particles are numerically advected through the current vector snapshot. They ask <b>where could material move if this field stayed fixed?</b>.',q:'Click the map to seed particles. This is a snapshot advection experiment, not a forecast trajectory.',time:'DERIVED',geom:'PARTICLES'}
  };
  function sourceForMode(){if(state.mode==='field'||state.mode==='release')return{label:windMeta.timeLabel,href:wind.sourceUrl,source:wind.source,limit:windMeta.caveat,status:wind.kind==='procedural'?'FALLBACK':'DATA'};if(state.mode==='od')return{label:'normalized demo matrix',href:'https://github.com/visgl/flowmap.gl',source:'Reproducible demonstration OD matrix / real city coordinates',limit:'Flow magnitudes are illustrative normalized values. Arcs are schematic connections, not observed routes.',status:'DEMO'};return{label:'timestamped demo tracks',href:'https://deck.gl/docs/api-reference/geo-layers/trips-layer',source:'Reproducible demonstration trajectories',limit:'Teaching trajectories with synthetic timestamps; not observed vessel, aircraft or vehicle tracks.',status:'DEMO'}}
  function setInspector(rows){inspect.innerHTML=rows.map(([a,b])=>`<div><dt>${a}</dt><dd>${b}</dd></div>`).join('')}
  function dynamicControls(){
    if(state.mode==='field')dynamic.innerHTML=`<label class="flow-range"><span>PARTICLES <output id="flDensityOut">${state.density}</output></span><input id="flDensity" type="range" min="250" max="1800" step="50" value="${state.density}"></label><label class="flow-range"><span>SIM TIME <output id="flSpeedOut">${state.speed.toLocaleString()}×</output></span><input id="flSpeed" type="range" min="2000" max="120000" step="2000" value="${state.speed}"></label><div class="flow-buttons"><button class="flow-btn ${state.fieldStyle==='glyphs'?'active':''}" aria-pressed="${state.fieldStyle==='glyphs'}" id="flVectors" type="button">VECTOR GLYPHS</button><button class="flow-btn ${state.fieldStyle==='streamlines'?'active':''}" aria-pressed="${state.fieldStyle==='streamlines'}" id="flStreamlines" type="button">STREAMLINES</button></div><button class="flow-btn" id="flReseed" type="button">RESEED PARTICLES</button>${provenanceCard()}`;
    else if(state.mode==='od')dynamic.innerHTML=`<label class="flow-range"><span>TOP CONNECTIONS <output id="flTopOut">${state.top}</output></span><input id="flTop" type="range" min="4" max="24" step="1" value="${state.top}"></label><div class="flow-buttons"><button class="flow-btn ${state.curves?'active':''}" id="flCurves" type="button">CURVED ARCS</button><button class="flow-btn" id="flODReset" type="button">SHOW ALL</button></div>`;
    else if(state.mode==='trips')dynamic.innerHTML=`<div class="flow-timeline" aria-label="Relative teaching time; not UTC"><button id="flTripPlay" type="button" aria-label="Toggle teaching trajectory playback">${state.tripPlay?'Ⅱ':'▶'}</button><input id="flTripTime" aria-label="Relative teaching time units, not UTC" type="range" min="0" max="75" step="1" value="${Math.round(state.tripTime)}"><output id="flTripOut">${Math.round(state.tripTime)}</output></div><small class="flow-time-unit">RELATIVE TEACHING TIME UNITS · NOT UTC</small><label class="flow-range"><span>TRAIL MEMORY <output id="flTrailOut">${state.trail}</output></span><input id="flTrail" type="range" min="5" max="55" step="1" value="${state.trail}"></label>`;
    else dynamic.innerHTML=`<label class="flow-range"><span>SEED COUNT <output id="flReleaseCountOut">${state.releaseCount}</output></span><input id="flReleaseCount" type="range" min="20" max="240" step="10" value="${state.releaseCount}"></label><label class="flow-range"><span>SEED RADIUS <output id="flSeedRadiusOut">${state.releaseRadiusKm} km</output></span><input id="flSeedRadius" type="range" min="0" max="300" step="10" value="${state.releaseRadiusKm}"></label><label class="flow-range"><span>LIFETIME (SIM HOURS) <output id="flReleaseLifeOut">${state.releaseLife}</output></span><input id="flReleaseLife" type="range" min="60" max="360" step="20" value="${state.releaseLife}"></label><label class="flow-integrator-label">INTEGRATION METHOD<select id="flReleaseIntegrator" aria-label="Frozen-field numerical integrator"><option value="euler" ${state.releaseIntegrator==='euler'?'selected':''}>Euler · first order</option><option value="rk2" ${state.releaseIntegrator==='rk2'?'selected':''}>RK2 · midpoint</option><option value="rk4" ${state.releaseIntegrator==='rk4'?'selected':''}>RK4 · fourth order</option></select></label><div class="flow-release-stats"><span>EXPERIMENT TIME <output id="flReleaseElapsed">${(state.releaseElapsedSeconds/3600).toFixed(1)} h</output></span><span>ACTIVE SEEDS <output id="flActiveCount">${state.release.length}</output></span></div><small class="flow-sim-rate">Frozen wind · simulation time ${state.speed.toLocaleString()}×. Tap map to seed a disk; global seed samples valid coverage. Spread ≠ uncertainty.</small><div class="flow-buttons"><button class="flow-btn" id="flSeedGlobal" type="button">GLOBAL SEED</button><button class="flow-btn" id="flClearRelease" type="button">CLEAR</button></div>${provenanceCard()}`;
    bindDynamic();
    updateReleaseStats();
  }
  function bindDynamic(){
    $('#flDensity',stage)?.addEventListener('input',e=>{state.density=+e.target.value;$('#flDensityOut',stage).textContent=state.density;seedParticles();clearFx()});
    $('#flSpeed',stage)?.addEventListener('input',e=>{state.speed=+e.target.value;$('#flSpeedOut',stage).textContent=`${state.speed.toLocaleString()}×`});
    const chooseFieldStyle=(style)=>{
      state.fieldStyle=state.fieldStyle===style?'hidden':style;
      state.vectors=state.fieldStyle==='glyphs';
      shell.dataset.fieldStyle=state.fieldStyle;
      for(const [id,value] of [['flVectors','glyphs'],['flStreamlines','streamlines']]){
        const button=$('#'+id,stage);
        if(button){const active=state.fieldStyle===value;button.classList.toggle('active',active);button.setAttribute('aria-pressed',String(active));}
      }
      drawBase();clearFx();
    };
    $('#flVectors',stage)?.addEventListener('click',()=>chooseFieldStyle('glyphs'));
    $('#flStreamlines',stage)?.addEventListener('click',()=>chooseFieldStyle('streamlines'));
    $('#flReseed',stage)?.addEventListener('click',()=>{seedParticles();clearFx()});
    $('#flTop',stage)?.addEventListener('input',e=>{state.top=+e.target.value;$('#flTopOut',stage).textContent=state.top;renderOD()});
    $('#flCurves',stage)?.addEventListener('click',e=>{state.curves=!state.curves;e.currentTarget.classList.toggle('active',state.curves);renderOD()});
    $('#flODReset',stage)?.addEventListener('click',()=>{state.top=24;dynamicControls();renderOD()});
    $('#flTripPlay',stage)?.addEventListener('click',e=>{state.tripPlay=!state.tripPlay;e.currentTarget.textContent=state.tripPlay?'Ⅱ':'▶';tripLast=performance.now()});
    $('#flTripTime',stage)?.addEventListener('input',e=>{state.tripTime=+e.target.value;$('#flTripOut',stage).textContent=e.target.value;renderTrips()});
    $('#flTrail',stage)?.addEventListener('input',e=>{state.trail=+e.target.value;$('#flTrailOut',stage).textContent=state.trail;renderTrips()});
    $('#flReleaseCount',stage)?.addEventListener('input',e=>{state.releaseCount=+e.target.value;$('#flReleaseCountOut',stage).textContent=state.releaseCount});
    $('#flReleaseLife',stage)?.addEventListener('input',e=>{state.releaseLife=+e.target.value;$('#flReleaseLifeOut',stage).textContent=state.releaseLife});
    $('#flSeedRadius',stage)?.addEventListener('input',e=>{state.releaseRadiusKm=+e.target.value;$('#flSeedRadiusOut',stage).textContent=state.releaseRadiusKm+' km';updateReleaseStats()});
    $('#flReleaseIntegrator',stage)?.addEventListener('change',e=>{state.releaseIntegrator=e.target.value;updateReleaseStats()});
    $('#flSeedGlobal',stage)?.addEventListener('click',()=>{
      for(let i=0;i<state.releaseCount;i++){const seed=randomSeed();if(sampleWind(wind,seed.lon,seed.lat).valid)state.release.push({...seed,age:0});}
      updateReleaseStats();clearFx();
    });
    $('#flClearRelease',stage)?.addEventListener('click',()=>{
      state.release=[];state.releaseElapsedSeconds=0;
      const out=$('#flReleaseElapsed',stage);if(out)out.textContent='0.0 h';
      shell.dataset.releaseElapsedHours='0.00';updateReleaseStats();clearFx();
    });
  }
  function setMode(mode){shell.dataset.tripTime=state.tripTime.toFixed(2);const pinned=$('#flSampleReadout',stage);if(pinned)pinned.hidden=true;state.mode=mode;shell.dataset.mode=mode;fieldCarry=0;releaseCarry=0;tripLast=performance.now();$$('.flow-tabs button',stage).forEach(b=>b.classList.toggle('active',b.dataset.mode===mode));const m=modeMeta[mode];$('#flRepTitle',stage).textContent=m.title;$('#flRepBadge',stage).textContent=m.badge;$('#flRepCopy',stage).innerHTML=m.copy;$('#flQuestion',stage).textContent=m.q;$('#flMetricMode',stage).textContent=mode.toUpperCase();$('#flMetricTime',stage).textContent=m.time;$('#flMetricGeom',stage).textContent=m.geom;$('#flModeTitle',stage).textContent=`${mode.toUpperCase()} / ${m.badge}`;const src=sourceForMode();$('#flHudSource',stage).textContent=src.source;sourceLabel.textContent=src.label;sourceLink.href=src.href||'#';sourceLink.style.display=src.href?'':'none';status.textContent=src.status;setInspector(['field','release'].includes(mode)?[['POINTER','Select a location to inspect the model vector.'],['SOURCE',src.source],['TIME',windMeta.timeLabel],['COVERAGE',windMeta.coverage],['LIMIT',src.limit]]:[['POINTER','Move over the map to inspect the current representation.'],['SOURCE',src.source],['LIMIT',src.limit]]);legend.innerHTML=['field','release'].includes(mode)?windLegend():mode==='od'?'<span><b>WIDTH</b> normalized flow</span><span>arc ≠ literal route</span>':'<span><b>HEAD</b> current time</span><span>trail = visual memory</span>';
    shell.dataset.fieldStyle=state.fieldStyle;dynamicControls();clearFx();drawBase();renderStatic();if(mode==='field'&&particles.length!==state.density)seedParticles()}

  function zoomTo(next,cx=W/2,cy=H/2){
    const old=state.zoom;next=clamp(next,.75,6);
    if(Math.abs(next-old)<.001)return;
    const xFraction=(cx-projection.left)/projection.worldWidth;
    const yFraction=(cy-projection.top)/projection.worldHeight;
    state.zoom=next;
    const unpanned=createPlateCarreeViewport(W,H,next);
    state.panX=cx-(unpanned.left+xFraction*unpanned.worldWidth);
    state.panY=cy-(unpanned.top+yFraction*unpanned.worldHeight);
    refreshProjection();
    zoomOut.value=`${Math.round(next*100)}%`;
    clearFx();drawBase();renderStatic();
  }
  function resetView(){
    state.zoom=1;state.panX=state.panY=0;refreshProjection();
    zoomOut.value='100%';clearFx();drawBase();renderStatic();
  }
  map.addEventListener('wheel',e=>{e.preventDefault();const r=map.getBoundingClientRect();zoomTo(state.zoom*Math.exp(-e.deltaY*.0012),e.clientX-r.left,e.clientY-r.top)},{passive:false});
  map.addEventListener('pointerdown',e=>{if(e.target.closest?.('.flow-tabs,.flow-hud,.flow-zoom'))return;drag={id:e.pointerId,x:e.clientX,y:e.clientY,px:state.panX,py:state.panY,moved:false};map.setPointerCapture?.(e.pointerId);map.classList.add('drag')});
  function showPinnedSample(text){
    const output=$('#flSampleReadout',stage);
    if(output){output.textContent=text;output.hidden=false;}
    const announcement=$('#flSampleLive',stage);
    if(announcement)announcement.textContent=text;
  }
  function inspectCoordinate(x,y,{announce=false}={}){
    const ll=invert(x,y);
    if(!ll){
      setInspector([['STATUS','OUTSIDE MAP FRAME'],['LIMIT','The projected world occupies a 2:1 frame. Select a coordinate inside the world rectangle.']]);
      if(announce)showPinnedSample('Outside map frame — select a point inside the projected world.');
      return false;
    }
    if(!['field','release'].includes(state.mode))return true;
    const w=sampleWind(wind,ll[0],ll[1]);
    if(!w.valid){
      setInspector([['POSITION',`${ll[1].toFixed(2)}°, ${ll[0].toFixed(2)}°`],
        ['STATUS','OUTSIDE FIELD DOMAIN'],['SOURCE',wind.source],['LIMIT','Wind grid has no valid value at this latitude.']]);
      if(announce)showPinnedSample('Outside field domain at latitude '+ll[1].toFixed(2)+' degrees.');
      return false;
    }
    const dir=(Math.atan2(-w.u,-w.v)*180/Math.PI+360)%360;
    setInspector([['POSITION',`${ll[1].toFixed(2)}°, ${ll[0].toFixed(2)}°`],
      ['SPEED',`${w.speed.toFixed(1)} m/s`],
      ['VECTOR',`u ${w.u.toFixed(1)} / v ${w.v.toFixed(1)} m/s`],
      ['FROM',`${Math.round(dir)}°`],['SOURCE',wind.source],['TIME',windMeta.timeLabel],
      ['COVERAGE',windMeta.coverage],['LIMIT',windMeta.caveat]]);
    if(announce)showPinnedSample(
      `Sampled ${ll[1].toFixed(2)} latitude, ${ll[0].toFixed(2)} longitude; speed ${w.speed.toFixed(1)} metres per second; wind from ${Math.round(dir)} degrees.`);
    return true;
  }
  map.addEventListener('pointermove',e=>{
    const r=map.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    if(drag?.id===e.pointerId){
      const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
      if(Math.hypot(dx,dy)>3)drag.moved=true;
      state.panX=drag.px+dx;state.panY=drag.py+dy;
      refreshProjection();clearFx();drawBase();renderStatic();return;
    }
    if(e.target.closest?.('[data-type]'))return;
    inspectCoordinate(x,y);
  });
  map.addEventListener('pointerup',e=>{
    if(!drag||drag.id!==e.pointerId)return;
    const wasMoved=drag.moved;
    drag=null;map.classList.remove('drag');
    if(!wasMoved&&['field','release'].includes(state.mode)){
      const r=map.getBoundingClientRect();
      if(!inspectCoordinate(e.clientX-r.left,e.clientY-r.top,{announce:true}))return;
    }
    if(!wasMoved&&state.mode==='release'){
      const r=map.getBoundingClientRect(),ll=invert(e.clientX-r.left,e.clientY-r.top);
      if(!ll||!sampleWind(wind,ll[0],ll[1]).valid){
        setInspector([['POSITION',ll?`${ll[1].toFixed(2)}°, ${ll[0].toFixed(2)}°`:'Outside projected world'],
          ['STATUS','OUTSIDE FIELD DOMAIN'],['LIMIT','Cannot seed particles where the source has no valid wind.']]);
        return;
      }
      const release=seedDisk(ll[0],ll[1],state.releaseRadiusKm,state.releaseCount,{
        valid:(lon,lat)=>sampleWind(wind,lon,lat).valid
      });
      for(const p of release.points)state.release.push({...p,age:0});
      updateReleaseStats();clearFx();
      showPinnedSample('Released '+release.accepted+'/'+release.requested+' teaching particles within '+
        release.radiusKm+' km. '+state.releaseIntegrator.toUpperCase()+
        ' · frozen snapshot · spread is not uncertainty.');
    }
  });
  map.addEventListener('pointercancel',()=>{drag=null;map.classList.remove('drag')});
  map.addEventListener('keydown',e=>{
    if(e.target!==map||e.altKey||e.ctrlKey||e.metaKey)return;
    const key=e.key.toLowerCase();
    const moved=['arrowup','arrowdown','arrowleft','arrowright'].includes(key);
    if(moved){
      e.preventDefault();
      const distance=e.shiftKey?70:28;
      state.panX+=key==='arrowleft'?-distance:key==='arrowright'?distance:0;
      state.panY+=key==='arrowup'?-distance:key==='arrowdown'?distance:0;
      refreshProjection();clearFx();drawBase();renderStatic();
    }else if(key==='+'||key==='='){e.preventDefault();zoomTo(state.zoom*1.25)}
    else if(key==='-'){e.preventDefault();zoomTo(state.zoom*.8)}
    else if(key==='home'){e.preventDefault();resetView()}
    else if(key==='enter'||key===' '){
      e.preventDefault();inspectCoordinate(W/2,H/2,{announce:true});
    }
  });
  svg.addEventListener('pointermove',e=>{const t=e.target.closest?.('[data-type]');if(!t)return;const r=map.getBoundingClientRect();tip.style.left=`${clamp(e.clientX-r.left+12,8,W-255)}px`;tip.style.top=`${clamp(e.clientY-r.top+12,8,H-80)}px`;tip.classList.add('show');if(t.dataset.type==='od'){const o=OD[+t.dataset.id],a=NODES[o.a],b=NODES[o.b];tip.innerHTML=`${a[2]} → ${b[2]}<small>normalized flow ${o.value} · schematic OD arc</small>`;setInspector([['ORIGIN',a[2]],['DESTINATION',b[2]],['FLOW',`${o.value} normalized units`],['GEOMETRY','Schematic connection'],['LIMIT','Illustrative matrix; not an observed route.']])}else if(t.dataset.type==='node'){const n=NODES[t.dataset.id],out=OD.filter(x=>x.a===t.dataset.id).reduce((s,x)=>s+x.value,0),inn=OD.filter(x=>x.b===t.dataset.id).reduce((s,x)=>s+x.value,0);tip.innerHTML=`${n[2]}<small>out ${out} · in ${inn} normalized</small>`}else{const tr=TRIPS[+t.dataset.id];tip.innerHTML=`${tr.name}<small>timestamped demonstration path</small>`;setInspector([['TRACK',tr.name],['TIME',state.tripTime.toFixed(0)],['TRAIL',`${state.trail} time units`],['GEOMETRY','Ordered timestamped positions'],['LIMIT','Reproducible teaching data; not observed movement.']])}});
  svg.addEventListener('pointerleave',()=>tip.classList.remove('show'));
  $('.flow-tabs',stage).addEventListener('click',e=>{const b=e.target.closest('[data-mode]');if(b)setMode(b.dataset.mode)});
  $('.flow-zoom',stage).addEventListener('click',e=>{const b=e.target.closest('[data-z]');if(!b)return;if(b.dataset.z==='fit')resetView();else zoomTo(state.zoom*(b.dataset.z==='in'?1.25:.8))});
  pauseBtn.addEventListener('click',()=>{state.paused=!state.paused;pauseBtn.textContent=state.paused?'PLAY':'PAUSE';if(!state.paused){last=performance.now();tripLast=last}});
  $('#flReset',stage).addEventListener('click',()=>{const pinned=$('#flSampleReadout',stage);if(pinned)pinned.hidden=true;resetView();state.release=[];state.releaseElapsedSeconds=0;state.tripTime=30;state.simulatedSeconds=0;shell.dataset.simulatedSeconds='0';fieldCarry=0;releaseCarry=0;tripLast=performance.now();const time=$('#flTripTime',stage),out=$('#flTripOut',stage);if(time)time.value='30';if(out)out.textContent='30';seedParticles();renderStatic();updateReleaseStats();clearFx()});

  const onVisibility=()=>{last=performance.now();tripLast=last;};
  document.addEventListener('visibilitychange',onVisibility);
  seedParticles();dynamicControls();legend.innerHTML=windLegend();sourceLabel.textContent=windMeta.timeLabel;shell.dataset.fieldStyle=state.fieldStyle;resize();if('ResizeObserver'in window){resizer=new ResizeObserver(resize);resizer.observe(map)}pauseBtn.textContent=state.paused?'PLAY':'PAUSE';raf=requestAnimationFrame(tick);
  return()=>{
    if(destroyed)return;
    destroyed=true;cancelAnimationFrame(raf);resizer?.disconnect();
    document.removeEventListener('visibilitychange',onVisibility);
    shell.dataset.flowCleanup='complete';
    stage.dataset.flowDisposedCount=String(1+Number(stage.dataset.flowDisposedCount||0));
    if(stage.isConnected)stage.innerHTML='';
  };
}

const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
const previous=mounts.flow;
mounts.flow=mount;
window.GeoFlowLab={version:V,mount,previous};
})();