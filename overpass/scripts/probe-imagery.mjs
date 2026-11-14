#!/usr/bin/env node
/**
 * P4: independent real-network archive availability and provenance probe.
 * No mocked imagery, uploaded satellite images, API tokens, or user coordinates.
 * A successful STAC response proves metadata availability, NOT satellite coverage
 * or that its image pixels truly cover the selected point.
 */
import { mkdirSync,writeFileSync } from 'node:fs'
import { dirname,resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const DAY=86_400_000
const now=Date.now()
const start=new Date(now-7*DAY).toISOString().slice(0,19)+'Z'
const end=new Date(now-DAY*0.5).toISOString().slice(0,19)+'Z'
const place={name:'Waterloo, Canada',lat:43.4723,lon:-80.5449}
const endpoint='https://planetarycomputer.microsoft.com/api/stac/v1/search'
const bbox=[place.lon-0.01,place.lat-0.01,place.lon+0.01,place.lat+0.01]
async function request(url,init={},timeout=15_000){
 const ctl=new AbortController()
 const timer=setTimeout(()=>ctl.abort(),timeout)
 try{return await fetch(url,{...init,signal:ctl.signal,headers:{accept:'application/geo+json,application/json,image/jpeg,*/*',...init.headers}})}
 finally{clearTimeout(timer)}
}
async function catalog(collection){
 const body={
  collections:[collection],
  bbox,
  datetime:start+'/'+end,
  limit:3
 }
 const method='POST'
 const url=endpoint
 const t=Date.now()
 try{
  const res=await request(url,{method,headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  const text=await res.text()
  const parsed=JSON.parse(text)
  if(!res.ok)throw new Error('HTTP '+res.status+': '+text.slice(0,120))
  if(!Array.isArray(parsed.features))throw new Error('STAC features missing')
  const first=parsed.features[0]
  return {
   provider:'Microsoft Planetary Computer',collection,method,endpoint,
   status:'ok',httpStatus:res.status,
   featuresReturned:parsed.features.length,
   firstCapture:first?{
    id:String(first.id),collection:String(first.collection||collection),
    acquiredAt:first.properties?.datetime||first.properties?.start_datetime||null,
    platform:first.properties?.platform||null,
    sceneCloudPct:first.properties?.['eo:cloud_cover']??null,
    assetKeys:Object.keys(first.assets||{}).slice(0,10)
   }:null,
   elapsedMs:Date.now()-t
  }
 }catch(e){
  return {provider:'Microsoft Planetary Computer',collection,method,endpoint,
   status:'unreachable',error:String(e?.message||e).slice(0,200),elapsedMs:Date.now()-t}
 }
}
async function fallback(){
 const endpoint='https://earth-search.aws.element84.com/v1/search'
 const body={collections:['sentinel-2-c1-l2a'],bbox,datetime:start+'/'+end,limit:2}
 const t=Date.now()
 try{
  const r=await request(endpoint,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)})
  const data=await r.json()
  if(!r.ok||!Array.isArray(data.features))throw new Error('Earth Search '+r.status)
  return {provider:'Element 84 Earth Search',collection:'sentinel-2-c1-l2a',endpoint,
   status:'ok',httpStatus:r.status,featuresReturned:data.features.length,
   firstCapture:data.features[0]?{id:data.features[0].id,acquiredAt:data.features[0].properties?.datetime}:null,
   elapsedMs:Date.now()-t}
 }catch(e){return {provider:'Element 84 Earth Search',collection:'sentinel-2-c1-l2a',
  endpoint,status:'unreachable',error:String(e?.message||e).slice(0,180),elapsedMs:Date.now()-t}}
}
async function nasa(){
 const day=new Date(now-3*DAY).toISOString().slice(0,10)
 const url=new URL('https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi')
 for(const [k,v] of Object.entries({
  SERVICE:'WMS',REQUEST:'GetMap',VERSION:'1.3.0',LAYERS:'MODIS_Terra_CorrectedReflectance_TrueColor',
  STYLES:'',FORMAT:'image/jpeg',CRS:'EPSG:4326',
  BBOX:'43.46,-80.56,43.49,-80.53',WIDTH:'64',HEIGHT:'64',TIME:day
 }))url.searchParams.set(k,v)
 const t=Date.now()
 try {
  const r=await request(url.toString(),{},15_000)
  const contentType=r.headers.get('content-type')||''
  const bytes=new Uint8Array(await r.arrayBuffer())
  const jpeg=bytes.length>10&&bytes[0]===0xff&&bytes[1]===0xd8
  return {provider:'NASA EOSDIS GIBS',collection:'MODIS Terra true color',
   endpoint:url.origin+url.pathname,date:day,status:r.ok&&jpeg?'rendered':'unverified',
   httpStatus:r.status,contentType,imageBytes:bytes.length,jpegSignatureValid:jpeg,
   noDataPixelCheck:'not evaluated; HTTP 200 may be a black/missing-data image',
   elapsedMs:Date.now()-t}
 }catch(e){return {provider:'NASA EOSDIS GIBS',collection:'MODIS Terra true color',date:day,
  endpoint:url.origin+url.pathname,status:'unreachable',error:String(e?.message||e).slice(0,180),elapsedMs:Date.now()-t}}
}
const results=await Promise.all([
 catalog('sentinel-2-l2a'),catalog('landsat-c2-l2'),catalog('sentinel-1-rtc'),fallback(),nasa()
])
const report={
 generatedAt:new Date().toISOString(),
 query:{...place,windowStart:start,windowEnd:end,mode:'provider availability probe'},
 epistemicStatus:'Live metadata and render transport only. These results do not claim confirmed passes or successful scene-to-pass matches.',
 providers:results,
 verifiedArchiveCount:results.filter(x=>x.status==='ok').length,
 renderedMapCount:results.filter(x=>x.status==='rendered').length
}
const output=resolve(root,'overpass/reports/p4-live-imagery.json')
mkdirSync(dirname(output),{recursive:true})
writeFileSync(output,JSON.stringify(report,null,2)+'\n')
console.log(JSON.stringify({report:output,providers:results.map(x=>({collection:x.collection,status:x.status,features:x.featuresReturned??null,error:x.error||null}))},null,2))
if(process.argv.includes('--strict')&&!(report.verifiedArchiveCount>=1&&report.renderedMapCount>=1))
  throw Error('Not enough providers verified for live-data release')
