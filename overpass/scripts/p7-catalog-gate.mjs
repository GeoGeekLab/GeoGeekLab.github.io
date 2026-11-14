#!/usr/bin/env node
/**
 * No build may assert "current 7 days" without checking catalog freshness.
 * The pinned Git submodule remains pinned; catalog refreshes are generated
 * artifacts, never silent modifications to the upstream source commit.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const DAY=86_400_000
export const MAX_SNAPSHOT_AGE_HOURS=48
export function auditCatalog(catalog,names,nowMs){
 assert(catalog?.v===2 && catalog?.count>=10000 && catalog?.norad?.length===catalog.count,
  'Expected real compact Watched CelesTrak v2 catalog')
 assert(names?.norad?.length===catalog.count && names?.name?.length===catalog.count,
  'Missing full catalog-names companion file')
 assert(names.fetchedAt===catalog.fetchedAt,'Catalog names and orbit elements must share the same refresh timestamp')
 const fetched=Date.parse(catalog.fetchedAt)
 assert(Number.isFinite(fetched),'Catalog fetchedAt invalid')
 const ageHours=(nowMs-fetched)/3_600_000
 const epochValid=Array.isArray(catalog.epoch)&&catalog.epoch.length===catalog.count
 let id=0
 for(let i=0;i<catalog.count;i++){
  const step=catalog.norad[i]
  assert(Number.isSafeInteger(step)&&step>0,'Bad delta-encoded NORAD row')
  id+=step
 }
 assert(epochValid,'Missing compact OMM epoch column')
 const stale=ageHours< -1||ageHours>MAX_SNAPSHOT_AGE_HOURS
 return {schema:'overpass-catalog-freshness-v1',fetchedAt:new Date(fetched).toISOString(),
  ageHours:Math.round(ageHours*100)/100,policyHours:MAX_SNAPSHOT_AGE_HOURS,
  stale,completeNames:true,recordCount:catalog.count,source:catalog.source,
  maxNorad:id,distributionNote:'Dataset age is not SGP4 element accuracy; individual epochs also vary'}
}
export function assess(root,{nowMs=Date.now(),release=false}={}){
 const file=resolve(root,'overpass/upstream/public/data/catalog.json')
 const name=resolve(root,'overpass/upstream/public/data/catalog-names.json')
 for(const f of [file,name])assert(existsSync(f),'Catalog required: '+f)
 const bytes=readFileSync(file),nb=readFileSync(name)
 const data=auditCatalog(JSON.parse(bytes),JSON.parse(nb),nowMs)
 data.catalogSha256=createHash('sha256').update(bytes).digest('hex')
 data.namesSha256=createHash('sha256').update(nb).digest('hex')
 data.action=data.stale?'STOP: refresh both catalogs, rebuild and rerun release gate':'Catalog transfer age currently within 48h'
 data.releaseCandidate=release
 const p=resolve(root,'overpass/reports/p7-catalog-freshness.json')
 mkdirSync(dirname(p),{recursive:true})
 writeFileSync(p,JSON.stringify(data,null,2)+'\n')
 if(release) assert(!data.stale,'OVERPASS release blocked: CelesTrak snapshot older than 48h or future-dated')
 console.log(JSON.stringify(data,null,2))
 return data
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 assess(root,{release:process.argv.includes('--release')})
}
