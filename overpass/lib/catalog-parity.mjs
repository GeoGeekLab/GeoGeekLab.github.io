/**
 * P3: inspect two independently collected OMM snapshots without silently
 * equating source groups, element epochs, SGP4 versions, or sensor coverage.
 * Pure functions, testable without CelesTrak requests.
 */
export const HOUR_MS = 3_600_000
const DAY_MS = 24 * HOUR_MS
const FLOAT_COLS = ['n','e','i','raan','argp','ma','bstar','ndot','nddot']
const OMM_COLS = ['MEAN_MOTION','ECCENTRICITY','INCLINATION','RA_OF_ASC_NODE','ARG_OF_PERICENTER','MEAN_ANOMALY','BSTAR','MEAN_MOTION_DOT','MEAN_MOTION_DDOT']

export function utcEpoch(value) {
  if (typeof value !== 'string' || !value.trim()) return NaN
  const text = value.trim()
  const normalized = /(?:Z|[+-]\d\d:?\d\d)$/i.test(text) ? text : text + 'Z'
  return Date.parse(normalized)
}
export function median(xs) {
  if (!xs.length) return null
  const x = [...xs].sort((a,b)=>a-b)
  const m = Math.floor(x.length/2)
  return x.length%2 ? x[m] : (x[m-1]+x[m])/2
}
export function quantile(xs, q) {
  if (!xs.length) return null
  const x = [...xs].sort((a,b)=>a-b)
  return x[Math.floor((x.length-1)*Math.max(0,Math.min(1,q)))]
}
export function health(fetchedAt, epochDates, nowMs) {
  const fetchedMs = utcEpoch(fetchedAt)
  if (!Number.isFinite(fetchedMs)) throw new Error('Catalog fetchedAt is invalid')
  if (!Number.isFinite(nowMs)) throw new Error('Invalid comparison time')
  // Freshness measures the transfer snapshot, not element-set validity.
  const ageHours = (nowMs - fetchedMs)/HOUR_MS
  const validEpochs = epochDates.filter(Number.isFinite)
  const epochMedian = median(validEpochs)
  return {
    fetchedAt: new Date(fetchedMs).toISOString(),
    snapshotAgeHours: Math.round(ageHours*100)/100,
    snapshotStale48h: ageHours>48 || ageHours < -1,
    epochMedian: epochMedian === null ? null : new Date(epochMedian).toISOString(),
    medianElementAgeDays: epochMedian === null ? null : Math.round((nowMs-epochMedian)/DAY_MS*100)/100,
    validEpochs: validEpochs.length,
    totalEpochs: epochDates.length
  }
}
export function parseWatched(file) {
  if (!file || file.v!==2 || typeof file.fetchedAt!=='string' || !Array.isArray(file.norad)) {
    throw new Error('Watched must be pinned compact catalog v2')
  }
  const n = file.norad.length
  if (n<10000 || file.count!==n) throw new Error('Invalid Watched row count')
  for(const key of [...FLOAT_COLS,'epoch','name']){
    if(!Array.isArray(file[key])||file[key].length!==n) throw new Error('Watched column mismatch: '+key)
  }
  const t0=utcEpoch(file.fetchedAt)
  if(!Number.isFinite(t0))throw new Error('Invalid Watched fetchedAt')
  const map=new Map()
  let id=0, prev=0, malformed=0, named=0
  const epochs=[]
  for(let i=0;i<n;i++){
    const delta=file.norad[i]
    if(!Number.isSafeInteger(delta)||delta<=0) throw new Error('Watched NORAD deltas must be positive')
    id+=delta
    if(id<=prev||!Number.isSafeInteger(id)) throw new Error('Watched NORAD ids not monotonic')
    prev=id
    const epochS=file.epoch[i]
    const epochMs=t0+epochS*1000
    const numeric=FLOAT_COLS.map(key=>file[key][i])
    if(!Number.isFinite(epochS)||!numeric.every(Number.isFinite)||numeric[0]<=0||numeric[1]<0||numeric[1]>=1)malformed++
    if(file.name[i]) named++
    map.set(id,{id,name:file.name[i]||'',epochMs,numeric})
    epochs.push(epochMs)
  }
  if(malformed)throw new Error('Watched catalog has unusable elements: '+malformed)
  return {map,count:n,fetchedAt:file.fetchedAt,epochs,namedCount:named,source:file.source,format:'Watched compact OMM v2 (eight CelesTrak groups)'}
}
export function parseGeoGeek(file, meta) {
  if(!Array.isArray(file)||file.length<10000) throw new Error('Invalid GeoGeek active OMM array')
  if(!meta||meta.dataset!=='celestrak-active-gp'||meta.recordCount!==file.length)throw new Error('GeoGeek supply metadata mismatch')
  const map=new Map(), epochs=[]
  let duplicates=0, malformed=0
  for(const item of file){
    const id=Number(item.NORAD_CAT_ID)
    const epochMs=utcEpoch(item.EPOCH)
    const numeric=OMM_COLS.map(key=>Number(item[key]))
    if(!Number.isSafeInteger(id)||id<=0||!Number.isFinite(epochMs)||!numeric.every(Number.isFinite)||numeric[0]<=0||numeric[1]<0||numeric[1]>=1){malformed++;continue}
    const existing=map.get(id)
    if(existing){duplicates++;if(existing.epochMs>=epochMs)continue}
    map.set(id,{id,name:String(item.OBJECT_NAME||''),epochMs,numeric,raw:item})
  }
  for(const item of map.values())epochs.push(item.epochMs)
  if(malformed)throw new Error('GeoGeek active OMM contains unusable elements: '+malformed)
  return {map,count:map.size,rawCount:file.length,duplicates,fetchedAt:meta.fetchedAt,epochs,source:meta.source,format:'CCSDS OMM JSON (CelesTrak active only)'}
}
export function compareCatalogs(watched,geo,nowMs) {
  const matched=[]
  let watchedOnly=0,geoOnly=0,featuredOnly=0,featuredShared=0
  for(const [id,w] of watched.map){
    const g=geo.map.get(id)
    if(!g){watchedOnly++;if(w.name)featuredOnly++;continue}
    if(w.name)featuredShared++
    matched.push({id,w,g,absEpochDeltaHours:Math.abs(w.epochMs-g.epochMs)/HOUR_MS})
  }
  for(const id of geo.map.keys())if(!watched.map.has(id))geoOnly++
  const near=matched.filter(x=>x.absEpochDeltaHours<=1)
  const mismatchDistances=matched.map(x=>x.absEpochDeltaHours)
  const result={
    generatedAt:new Date(nowMs).toISOString(),
    watched:{count:watched.count,sourceGroups:['active','stations','weather','resource','planet','goes','noaa','sarsat'],profiledNamedRows:watched.namedCount,health:health(watched.fetchedAt,watched.epochs,nowMs)},
    geoGeek:{count:geo.count,rawCount:geo.rawCount,sourceGroups:['active'],duplicates:geo.duplicates,health:health(geo.fetchedAt,geo.epochs,nowMs)},
    overlap:{
      shared:matched.length,watchedOnly,geoGeekOnly:geoOnly,
      namedProfileRowsShared:featuredShared,namedProfileRowsMissingFromGeoGeekActive:featuredOnly,
      nearEpochWithin1h:near.length,
      medianEpochDeltaHours:median(mismatchDistances),
      p95EpochDeltaHours:quantile(mismatchDistances,0.95)
    },
    safety:{
      catalogsInterchangeable:false,
      reason:'Different CelesTrak group coverage, compact encoding, orbital-element epochs, and SGP4/runtime versions. No catalog substitution was performed.',
      comparePassCountsAcrossCatalogs:false,
      frozenSnapshotForReproducibility:true,
      releaseRequiresFreshSnapshot:true
    }
  }
  return {result,matched}
}
export function chooseSgp4Sample(matched,limit=24) {
  const targets=[25544,40697,42063,60989,49260,39084,43013,27424,48274,40115,43800,41866,60133]
  const sample=[]
  for(const id of targets){const m=matched.find(row=>row.id===id);if(m)sample.push(m)}
  // Fill deterministically for broad orbit-regime coverage.
  const byIncl=[...matched].sort((a,b)=>a.g.numeric[2]-b.g.numeric[2])
  for(let i=0;i<byIncl.length&&sample.length<limit;i+=Math.max(1,Math.floor(byIncl.length/limit))){
    const row=byIncl[i]
    if(!sample.some(x=>x.id===row.id))sample.push(row)
  }
  return sample.slice(0,limit)
}
export function toOmm(item) {
  const out={
    OBJECT_NAME:item.name,
    OBJECT_ID:item.raw?.OBJECT_ID||'',
    EPOCH:new Date(item.epochMs).toISOString().slice(0,-1),
    NORAD_CAT_ID:item.id,
    EPHEMERIS_TYPE:0,
    CLASSIFICATION_TYPE:'U',
    ELEMENT_SET_NO:999
  }
  for(let k=0;k<OMM_COLS.length;k++)out[OMM_COLS[k]]=item.numeric[k]
  return out
}
export function vecDistanceKm(a,b) {
  return Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)
}
