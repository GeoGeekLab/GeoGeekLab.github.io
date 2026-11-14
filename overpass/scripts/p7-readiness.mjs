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
export function evaluate({watched,geoGeek,legal,rollback,assets}){
 const blocks=[]
 if(watched.stale)blocks.push('Watched compact OMM catalog older than 48h or future dated')
 if(geoGeek.stale)blocks.push('GeoGeek active OMM snapshot exceeds declared 8h refresh policy')
 if(!legal)blocks.push('Original Watched license or third-party notices missing')
 if(!rollback)blocks.push('Rollback recovery exercise has not passed')
 if(!assets)blocks.push('Combined static routes or preview assets missing')
 return {review:'p7-production-readiness-v1',releaseEligible:blocks.length===0,
  blockers:blocks,limitations:[
   'Static Pages does not implement Watched /api/pan, /api/og, /api/e or /s/:id backend endpoints',
   'Full decade-long Time-lapse frame downloads and real MP4 export are not end-to-end certified',
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
 const verdict={...evaluate({watched,geoGeek,legal,rollback,assets}),watched,geoGeek,
  legal,rollbackVerified:rollback,assetsVerified:assets,checksAt:new Date(nowMs).toISOString()}
 const report=resolve(root,'overpass/reports/p7-release-readiness.json')
 mkdirSync(dirname(report),{recursive:true})
 writeFileSync(report,JSON.stringify(verdict,null,2)+'\n')
 if(release)assert(verdict.releaseEligible,'P7 publication BLOCKED: '+verdict.blockers.join(' | '))
 console.log(JSON.stringify(verdict,null,2))
 return verdict
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 run(resolve(dirname(fileURLToPath(import.meta.url)),'../..'),{release:process.argv.includes('--release')})
