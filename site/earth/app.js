import * as maplibregl from 'https://unpkg.com/maplibre-gl@6.6.0/dist/maplibre-gl.mjs';
import { SOURCES, CATEGORY_ORDER } from './sources.js';

const $ = s => document.querySelector(s);
const byId = new Map(SOURCES.map(s => [s.id, s]));
const active = new Set();
const busy = new Set();
const layerIds = {
  gibs:['gg-gibs','gg-gibs-src'], emsc:['gg-emsc','gg-emsc'], volcanoes:['gg-volcanoes','gg-volcanoes'],
  aurora:['gg-aurora','gg-aurora'], railway:['gg-railway','gg-railway'], usgsWater:['gg-usgs-water','gg-usgs-water'],
  inaturalist:['gg-inat','gg-inat'], gbif:['gg-gbif','gg-gbif']
};
let selectedDate = new Date(Date.now() - 86400000);
let moveTimer;

const pad = n => String(n).padStart(2,'0');
const day = d => `${d.getUTCFullYear()}-${pad(d.getUTCMonth()+1)}-${pad(d.getUTCDate())}`;
const plusDays = (d,n) => new Date(d.getTime()+n*86400000);
const esc = v => String(v ?? '').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const text = v => v == null || v === '' ? '—' : String(v);
const number = v => Number.isFinite(Number(v)) ? new Intl.NumberFormat('en',{maximumFractionDigits:2}).format(Number(v)) : text(v);

$('#sourceCount').textContent = SOURCES.length;
$('#dateInput').value = day(selectedDate);
updateTime();

const map = new maplibregl.Map({
  container:'map',
  style:'https://tiles.openfreemap.org/styles/liberty',
  center:[8,22], zoom:1.35, minZoom:.5, maxZoom:18,
  attributionControl:false
});
map.addControl(new maplibregl.NavigationControl({visualizePitch:true}),'top-right');
map.addControl(new maplibregl.AttributionControl({compact:true}),'bottom-right');

function updateTime(){ $('#timeReadout').textContent = `${day(selectedDate)} · 00:00 UTC`; }
function setBusy(id,on){ on ? busy.add(id) : busy.delete(id); $('#loadingStrip').hidden = busy.size === 0; }
function updateActive(){ $('#activeCount').textContent = [...active].filter(id=>!byId.get(id)?.aliasOf).length; }

function renderSources(query=''){
  const q=query.trim().toLowerCase();
  $('#sourceList').innerHTML = CATEGORY_ORDER.map(category=>{
    const rows=SOURCES.filter(s=>s.category===category && (!q || `${s.name} ${s.summary} ${s.category}`.toLowerCase().includes(q)));
    if(!rows.length) return '';
    return `<section class="source-group"><h3>${esc(category)}</h3>${rows.map(s=>{
      const canonical=s.aliasOf||s.id, on=active.has(canonical);
      return `<button class="source-item${on?' is-active':''}" data-source="${esc(s.id)}" type="button" aria-pressed="${on}"><span class="source-index">${pad(s.n)}</span><span class="source-copy"><strong>${esc(s.name)}</strong><small>${esc(s.summary)}</small></span><span class="source-state ${s.status}">${s.status.toUpperCase()}</span></button>`;
    }).join('')}</section>`;
  }).join('') || '<div class="panel-foot"><small>No matching sources.</small></div>';
}

function inspect(source, observation={}, error=''){
  $('#inspectorKicker').textContent = observation.title ? 'OBSERVATION' : source.status==='live' ? 'LIVE LAYER' : source.status==='config' ? 'CONFIGURABLE SOURCE' : 'SOURCE REFERENCE';
  $('#inspectorTitle').textContent = observation.title || source.name;
  $('#inspectorDescription').textContent = error || observation.description || source.summary;
  $('#inspectorDescription').className = error ? 'layer-error' : source.status==='config' ? 'layer-config' : '';
  const values=[['SOURCE',observation.source||source.name],['TIME',observation.time||(source.status==='live'?'Live / query-time dependent':'See source')],['RESOLUTION',observation.resolution||source.resolution],['LIMIT',observation.limit||source.limit]];
  $('#inspectorMeta').innerHTML=values.map(([k,v])=>`<div><dt>${esc(k)}</dt><dd>${esc(text(v))}</dd></div>`).join('');
  const link=$('#inspectorLink'); link.href=observation.url||source.url; link.textContent=source.status==='config'&&!observation.title?'CONFIGURE / SOURCE ↗':'SOURCE ↗';
  $('#inspector').classList.add('is-open');
}

async function json(url,timeout=18000){
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
  try{ const r=await fetch(url,{signal:controller.signal,headers:{Accept:'application/json'}}); if(!r.ok) throw new Error(`HTTP ${r.status}`); return await r.json(); }
  finally{ clearTimeout(timer); }
}

function remove(adapter){
  const [layerId,sourceId]=layerIds[adapter]||[];
  if(layerId && map.getLayer(layerId)) map.removeLayer(layerId);
  if(sourceId && map.getSource(sourceId)) map.removeSource(sourceId);
}
function upsert(id,data,paint,type='circle'){
  if(map.getSource(id)){ map.getSource(id).setData(data); return; }
  map.addSource(id,{type:'geojson',data}); map.addLayer({id,source:id,type,paint});
}
function bbox(){
  const b=map.getBounds(); let w=Math.max(-179.999,b.getWest()), e=Math.min(179.999,b.getEast()), s=Math.max(-85,b.getSouth()), n=Math.min(85,b.getNorth());
  if(w>=e){w=-179.999;e=179.999;} return [w,s,e,n];
}

const adapters={
  async gibs(){
    const [id,src]=layerIds.gibs; if(map.getLayer(id)) return;
    map.addSource(src,{type:'raster',tiles:[`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${day(selectedDate)}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`],tileSize:256,maxzoom:9,attribution:'NASA EOSDIS GIBS'});
    const before=map.getStyle().layers.find(l=>l.type==='symbol')?.id;
    map.addLayer({id,type:'raster',source:src,paint:{'raster-opacity':.72,'raster-fade-duration':250}},before);
  },
  async railway(){
    const id=layerIds.railway[0]; if(map.getLayer(id)) return;
    map.addSource(id,{type:'raster',tiles:['https://tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png'],tileSize:256,minzoom:2,maxzoom:19,attribution:'OpenRailwayMap · OpenStreetMap contributors'});
    map.addLayer({id,type:'raster',source:id,paint:{'raster-opacity':.72}});
  },
  async emsc(){
    const id=layerIds.emsc[0]; setBusy(id,true);
    try{
      const end=plusDays(selectedDate,1), url=`https://www.seismicportal.eu/fdsnws/event/1/query?format=json&limit=300&minmag=3.5&starttime=${encodeURIComponent(day(selectedDate)+'T00:00:00')}&endtime=${encodeURIComponent(day(end)+'T00:00:00')}&orderby=time-desc`;
      const data=await json(url); upsert(id,data?.type==='FeatureCollection'?data:{type:'FeatureCollection',features:data?.features||[]},{
        'circle-radius':['interpolate',['linear'],['coalesce',['get','mag'],['get','magnitude'],3.5],3.5,3,5,7,7,13],
        'circle-color':['interpolate',['linear'],['coalesce',['get','depth'],10],0,'#fff3b0',70,'#ff9f68',300,'#ff5e64'],
        'circle-opacity':.82,'circle-stroke-color':'rgba(17,18,15,.8)','circle-stroke-width':1});
    }finally{setBusy(id,false);}
  },
  async volcanoes(){
    const id=layerIds.volcanoes[0]; if(map.getSource(id)) return; setBusy(id,true);
    try{ const data=await json('https://webservices.volcano.si.edu/geoserver/GVP-VOTW/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=GVP-VOTW%3ASmithsonian_VOTW_Holocene_Volcanoes&outputFormat=application%2Fjson&maxFeatures=2000',24000);
      upsert(id,data,{'circle-radius':['interpolate',['linear'],['zoom'],1,2.5,6,5,10,7],'circle-color':'#ff756e','circle-opacity':.76,'circle-stroke-color':'rgba(255,255,255,.85)','circle-stroke-width':.7});
    }finally{setBusy(id,false);}
  },
  async aurora(){
    const id=layerIds.aurora[0]; setBusy(id,true);
    try{ const data=await json('https://services.swpc.noaa.gov/json/ovation_aurora_latest.json',24000); const features=(data?.coordinates||[]).filter(r=>Number(r?.[2])>=8).map(r=>({type:'Feature',geometry:{type:'Point',coordinates:[+r[0],+r[1]]},properties:{intensity:+r[2]}}));
      upsert(id,{type:'FeatureCollection',features},{'circle-radius':['interpolate',['linear'],['get','intensity'],8,1,30,2.6,70,5,100,7],'circle-color':['interpolate',['linear'],['get','intensity'],8,'#6aa4ff',35,'#73f7bd',70,'#d7ff61',100,'#fff5b1'],'circle-opacity':['interpolate',['linear'],['get','intensity'],8,.12,50,.45,100,.78],'circle-blur':.45});
    }finally{setBusy(id,false);}
  },
  async inaturalist(){
    const id=layerIds.inaturalist[0]; setBusy(id,true);
    try{ const [w,s,e,n]=bbox(), data=await json(`https://api.inaturalist.org/v1/observations?geo=true&quality_grade=research&order=desc&order_by=created_at&per_page=200&swlat=${s}&swlng=${w}&nelat=${n}&nelng=${e}`);
      const features=(data?.results||[]).flatMap(r=>{const c=r?.geojson?.coordinates;if(!Array.isArray(c))return[];return[{type:'Feature',geometry:{type:'Point',coordinates:c},properties:{title:r.taxon?.preferred_common_name||r.taxon?.name||r.species_guess||'iNaturalist observation',scientificName:r.taxon?.name||'',observed:r.observed_on_string||r.observed_on||'',uri:r.uri||`https://www.inaturalist.org/observations/${r.id}`}}]});
      upsert(id,{type:'FeatureCollection',features},{'circle-radius':['interpolate',['linear'],['zoom'],1,2,8,4.5,13,7],'circle-color':'#d7ff61','circle-opacity':.78,'circle-stroke-color':'#11120f','circle-stroke-width':1});
    }finally{setBusy(id,false);}
  },
  async gbif(){
    const id=layerIds.gbif[0]; setBusy(id,true);
    try{ const [w,s,e,n]=bbox(), geom=`POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`, data=await json(`https://api.gbif.org/v1/occurrence/search?hasCoordinate=true&hasGeospatialIssue=false&occurrenceStatus=PRESENT&limit=200&geometry=${encodeURIComponent(geom)}`);
      const features=(data?.results||[]).flatMap(r=>Number.isFinite(+r.decimalLongitude)&&Number.isFinite(+r.decimalLatitude)?[{type:'Feature',geometry:{type:'Point',coordinates:[+r.decimalLongitude,+r.decimalLatitude]},properties:{title:r.species||r.scientificName||'GBIF occurrence',eventDate:r.eventDate||r.year||'',datasetTitle:r.datasetTitle||'',uncertainty:r.coordinateUncertaintyInMeters??'',url:`https://www.gbif.org/occurrence/${r.key}`}}]:[]);
      upsert(id,{type:'FeatureCollection',features},{'circle-radius':['interpolate',['linear'],['zoom'],1,1.8,8,4,13,6],'circle-color':'#72c9ff','circle-opacity':.62,'circle-stroke-color':'rgba(17,18,15,.75)','circle-stroke-width':.8});
    }finally{setBusy(id,false);}
  },
  async usgsWater(){
    const id=layerIds.usgsWater[0]; setBusy(id,true);
    try{ const [w,s,e,n]=bbox(), data=await json(`https://api.waterdata.usgs.gov/ogcapi/v0/collections/latest-continuous/items?f=json&limit=250&bbox=${w},${s},${e},${n}`,24000);
      upsert(id,{type:'FeatureCollection',features:data?.features||[]},{'circle-radius':['interpolate',['linear'],['zoom'],1,1.8,8,4,13,6],'circle-color':'#58b7ff','circle-opacity':.72,'circle-stroke-color':'rgba(255,255,255,.75)','circle-stroke-width':.6});
    }finally{setBusy(id,false);}
  }
};

async function enable(source){
  const canonical=byId.get(source.aliasOf||source.id)||source;
  if(!canonical.adapter){inspect(source);return;}
  active.add(canonical.id); renderSources($('#sourceSearch').value); updateActive();
  try{ await adapters[canonical.adapter](canonical); inspect(canonical); }
  catch(error){ console.error(error); active.delete(canonical.id); renderSources($('#sourceSearch').value); updateActive(); inspect(canonical,{},`Live layer could not be loaded from the provider: ${error.message}`); }
}
function disable(source){ const canonical=byId.get(source.aliasOf||source.id)||source; active.delete(canonical.id); remove(canonical.adapter); renderSources($('#sourceSearch').value); updateActive(); }
function toggle(source){ if(source.status!=='live'||!source.adapter){inspect(source);return;} const canonical=source.aliasOf||source.id; active.has(canonical)?disable(source):enable(source); }
function refreshViewport(){ for(const id of active){ const s=byId.get(id); if(['inaturalist','gbif','usgsWater'].includes(s?.adapter)) adapters[s.adapter](s).catch(console.warn); } }
async function refreshTime(){ updateTime(); if(active.has('nasa-worldview')){remove('gibs');await adapters.gibs();} if(active.has('emsc')) await adapters.emsc(); }

$('#sourceList').addEventListener('click',e=>{const b=e.target.closest('[data-source]'); if(b) toggle(byId.get(b.dataset.source));});
$('#sourceSearch').addEventListener('input',e=>renderSources(e.target.value));
$('#sidebarToggle').addEventListener('click',()=>{const open=!$('#sourcePanel').classList.contains('is-open');$('#sourcePanel').classList.toggle('is-open',open);$('#sidebarToggle').setAttribute('aria-expanded',String(open));});
$('#panelClose').addEventListener('click',()=>$('#sourcePanel').classList.remove('is-open'));
$('#inspectorClose').addEventListener('click',()=>$('#inspector').classList.remove('is-open'));
$('#prevDay').addEventListener('click',async()=>{selectedDate=plusDays(selectedDate,-1);$('#dateInput').value=day(selectedDate);await refreshTime();});
$('#nextDay').addEventListener('click',async()=>{selectedDate=plusDays(selectedDate,1);$('#dateInput').value=day(selectedDate);await refreshTime();});
$('#todayButton').addEventListener('click',async()=>{selectedDate=new Date(Date.now()-86400000);$('#dateInput').value=day(selectedDate);await refreshTime();});
$('#dateInput').addEventListener('change',async e=>{const d=new Date(`${e.target.value}T00:00:00Z`);if(!Number.isNaN(d.getTime())){selectedDate=d;await refreshTime();}});

map.on('mousemove',e=>{$('#mapReadout').textContent=`LAT ${e.lngLat.lat.toFixed(3)} · LON ${e.lngLat.lng.toFixed(3)} · ZOOM ${map.getZoom().toFixed(2)}`;});
map.on('moveend',()=>{clearTimeout(moveTimer);moveTimer=setTimeout(refreshViewport,550);});
map.on('click',e=>{
  const clickable=['gg-emsc','gg-volcanoes','gg-aurora','gg-inat','gg-gbif','gg-usgs-water'].filter(id=>map.getLayer(id)); if(!clickable.length)return;
  const f=map.queryRenderedFeatures(e.point,{layers:clickable})[0]; if(!f)return; const p=f.properties||{}, id=f.layer.id;
  if(id==='gg-emsc'){const s=byId.get('emsc');inspect(s,{title:`M ${number(p.mag??p.magnitude)} earthquake`,description:`${text(p.flynn_region??p.place??p.region??'Earthquake event')} · depth ${number(p.depth)} km`,source:'EMSC / SeismicPortal',time:p.time||p.datetime||'Catalogue event time',resolution:'Preliminary event solution',url:s.url});}
  if(id==='gg-volcanoes'){const s=byId.get('smithsonian-gvp');inspect(s,{title:p.Volcano_Name||p.volcano_name||p.name||'Holocene volcano',description:`${text(p.Country||p.country)} · ${text(p.Primary_Volcano_Type||p.primary_volcano_type)}`,source:'Smithsonian Global Volcanism Program',time:'Database record',resolution:'Volcano location',url:s.url});}
  if(id==='gg-aurora'){const s=byId.get('noaa-swpc');inspect(s,{title:`Auroral probability ${number(p.intensity)}%`,description:'NOAA SWPC OVATION modeled auroral intensity at this grid point.',source:'NOAA SWPC OVATION',time:'Latest forecast grid',resolution:'Global OVATION grid',url:s.url});}
  if(id==='gg-inat'){const s=byId.get('inaturalist');inspect(s,{title:p.title||'iNaturalist observation',description:p.scientificName||s.summary,source:'iNaturalist',time:p.observed||'Observation date',resolution:'Observation coordinate',url:p.uri||s.url});}
  if(id==='gg-gbif'){const s=byId.get('gbif');inspect(s,{title:p.title||'GBIF occurrence',description:p.datasetTitle||s.summary,source:'GBIF occurrence API',time:p.eventDate||'Occurrence record',resolution:p.uncertainty?`Coordinate uncertainty ${p.uncertainty} m`:'Occurrence coordinate',url:p.url||s.url});}
  if(id==='gg-usgs-water'){const s=byId.get('usgs-water');inspect(s,{title:p.monitoring_location_name||p.monitoring_location_id||p.site_no||'USGS water observation',description:`${text(p.parameter_name||p.parameter_code||'Continuous water observation')} · ${text(p.value??p.result)}`,source:'USGS Water Data',time:p.time||p.datetime||p.observation_time||'Latest continuous value',resolution:'Monitoring station',url:s.url});}
});
map.on('mousemove',e=>{const layers=['gg-emsc','gg-volcanoes','gg-aurora','gg-inat','gg-gbif','gg-usgs-water'].filter(id=>map.getLayer(id));map.getCanvas().style.cursor=layers.length&&map.queryRenderedFeatures(e.point,{layers}).length?'pointer':'';});

map.on('load',async()=>{ renderSources(); await enable(byId.get('nasa-worldview')); await enable(byId.get('emsc')); if(innerWidth>760) $('#sourcePanel').classList.add('is-open'); });
renderSources();
