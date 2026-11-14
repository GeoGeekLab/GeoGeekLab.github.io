#!/usr/bin/env node
/**
 * Separate release eligibility from code/test success. A static preview with
 * an old orbit catalog must never be labelled "live" or automatically shipped.
 */
import assert from 'node:assert/strict'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {auditCatalog} from './p7-catalog-gate.mjs'

export function inspectGeoGeekMeta(meta,nowMs){
 assert(meta?.dataset==='celestrak-active-gp' && typeof meta.fetchedAt==='string',
   'GeoGeek orbital metadata invalid')
 const stamp=Date.parse(meta.fetchedAt)
 const limitMs=Number(meta.refreshPolicy?.staleAfterMs)
 assert(Number.isFinite(stamp)&&Number.isFinite(limitMs)&&limitMs>0,
  'GeoGeek orbital freshness metadata invalid')
 const ageMs=nowMs-stamp
 return {fetchedAt:new Date(stamp).toISOString(),ageHours:Math.round(ageMs/36000)/100,
  limitHours:limitMs/3_600_000,stale:ageMs>limitMs||ageMs< -3_600_000,
  source:meta.source,recordCount:meta.recordCount}
}
export function evaluate({watched,geoGeek,legal,rollback,assets,staging=false,
 mp4=false,providerTerms=false,backendScope=false}){
 const blocks=[]
 if(watched.stale)blocks.push('Watched compact OMM catalog older than 48h or future dated')
 if(geoGeek.stale)blocks.push('GeoGeek active OMM snapshot exceeds declared 8h refresh policy')
 if(!legal)blocks.push('Original Watched license or third-party notices missing')
 if(!rollback)blocks.push('Rollback recovery exercise has not passed')
 if(!assets)blocks.push('Combined static routes or preview assets missing')
 if(!staging)blocks.push('Independent HTTPS staging deployment and real rollback smoke test not approved')
 if(!mp4)blocks.push('Historical Time-lapse real image download and browser MP4 export not accepted')
 if(!providerTerms)blocks.push('Provider terms, attribution and source license review not signed off')
 if(!backendScope)blocks.push('Missing dynamic /api and shortlink routes have no approved feature scope or hosting')
 return {review:'p7-production-readiness-v2',releaseEligible:blocks.length===0,
  blockers:blocks,limitations:[
   'A pass is an SGP4 prediction, not proof of an acquired satellite image',
   'Provider rate limits and response latency remain external dependencies'
  ]}
}
export function run(root,{release=false,nowMs=Date.now()}={}){
 const base=resolve(root,'overpass/preview-root')
 const catalog=JSON.parse(readFileSync(join(base,'overpass/data/catalog.json'),'utf8'))
 const names=JSON.parse(readFileSync(join(base,'overpass/data/catalog-names.json'),'utf8'))
 const watched=auditCatalog(catalog,names,nowMs)
 const geoGeek=inspectGeoGeekMeta(JSON.parse(readFileSync(join(base,'orbital/data/active.meta.json'),'utf8')),nowMs)
 const legal=['overpass/LICENSE','overpass/THIRD_PARTY_NOTICES.md'].every(f=>existsSync(join(base,f)))
 const rollback=existsSync(resolve(root,'overpass/reports/p7-rollback-exercise.json'))
 const assets=['lab.html','records/lab-l17.html','overpass/index.html','assets/lab/previews/overpass.jpg'].every(f=>existsSync(join(base,f)))
 // Do not infer acceptance from test presence or signed-off notices bundled in a ZIP.
 // Each independent manual proof must contain a positive verdict.
 const proofDir=resolve(root,'overpass/approvals')
 const approved=name=>{
  const file=join(proofDir,name+'.json')
  if(!existsSync(file))return false
  const data=JSON.parse(readFileSync(file,'utf8'))
  return data.accepted===true && typeof data.reviewer==='string' &&
   data.reviewer.trim().length>=2 && Number.isFinite(Date.parse(data.reviewedAt))
 }
 const staging=approved('staging-and-rollback')
 const mp4=approved('historical-mp4')
 const providerTerms=approved('provider-terms')
 const backendScope=approved('backend-scope')
 const verdict={...evaluate({watched,geoGeek,legal,rollback,assets,staging,mp4,providerTerms,backendScope}),watched,geoGeek,
  legal,rollbackVerified:rollback,assetsVerified:assets,
  independentApprovals:{staging,mp4,providerTerms,backendScope},
  checksAt:new Date(nowMs).toISOString()}
 const report=resolve(root,'overpass/reports/p7-release-readiness.json')
 mkdirSync(dirname(report),{recursive:true})
 writeFileSync(report,JSON.stringify(verdict,null,2)+'\n')
 if(release)assert(verdict.releaseEligible,'P7 publication BLOCKED: '+verdict.blockers.join(' | '))
 console.log(JSON.stringify(verdict,null,2))
 return verdict
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run(resolve(dirname(fileURLToPath(import.meta.url)),'../..'),{release:process.argv.includes('--release')})
