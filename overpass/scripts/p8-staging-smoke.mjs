#!/usr/bin/env node
/** Verify a real independent HTTPS stage, never an artifact/localhost/production. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
export function validateStageUrl(raw){
 const u=new URL(raw)
 assert.equal(u.protocol,'https:','P8 requires HTTPS staging')
 assert(!/^(localhost|127(?:\.\d+){3}|0\.0\.0\.0)$/i.test(u.hostname),'Loopback is not staging')
 assert(!/^(geogeeklab\.github\.io|www\.watched\.earth|watched\.earth)$/i.test(u.hostname),'Production is not staging')
 assert(!u.username&&!u.password&&!u.search&&!u.hash,'Use a clean staging URL')
 return u
}
export function validatePage(html,kind){
 const count=(html.match(/class="project-card contour-target is-actionable"/g)||[]).length
 assert.equal(count,kind==='candidate'?14:13,'Unexpected staging card count')
 assert.equal(html.includes('id="l17"'),kind==='candidate','Incorrect staging instrument')
 if(kind==='candidate')assert(html.includes('data-instrument-route="/overpass/"'),'Standalone route absent')
 return {count,l17:html.includes('id="l17"')}
}
async function load(url){
 const start=Date.now()
 const res=await fetch(url,{signal:AbortSignal.timeout(15000),headers:{'Cache-Control':'no-cache'}})
 assert.equal(res.status,200,'Stage HTTP status '+res.status+': '+url)
 const buf=Buffer.from(await res.arrayBuffer())
 assert(buf.length>400,'Stage file is too small: '+url)
 return {sha256:createHash('sha256').update(buf).digest('hex'),
  ms:Date.now()-start,text:buf.toString('utf8'),bytes:buf.length}
}
export async function run(raw,kind){
 assert(['candidate','rollback'].includes(kind),'Use candidate or rollback phase')
 const u=validateStageUrl(raw),base=u.href.replace(/\/?$/,'/')
 const lab=await load(new URL('lab.html',base))
 const checked=validatePage(lab.text,kind)
 const paths=kind==='candidate'?
 ['overpass/','overpass/LICENSE','overpass/THIRD_PARTY_NOTICES.md','records/lab-l17.html','assets/lab/previews/overpass.jpg']:
 ['core/modules.js','app.js','assets/lab/previews/orbit.jpg','assets/lab/previews/earth.jpg']
 const records=[]
 for(const path of paths){const x=await load(new URL(path,base));records.push({path,bytes:x.bytes,sha256:x.sha256,ms:x.ms})}
 if(kind==='candidate'){const app=await load(new URL('overpass/',base));assert(app.text.includes('/overpass/assets/'),'Invalid OVERPASS base path')}
 const report={proof:'p8-independent-https-staging-v1',phase:kind,
  stageOrigin:u.origin,checkedAt:new Date().toISOString(),lab:{...checked,sha256:lab.sha256},paths:records,
  // Observation alone never constitutes actual rollback or human sign-off.
  realRollbackProven:false,providerTermsApproved:false,historicalMp4Approved:false}
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 mkdirSync(resolve(root,'overpass/reports'),{recursive:true})
 writeFileSync(resolve(root,'overpass/reports/p8-stage-'+kind+'.json'),JSON.stringify(report,null,2)+'\n')
 console.log(JSON.stringify(report,null,2))
 return report
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 run(process.argv[2],process.argv[3]).catch(e=>{console.error(e);process.exitCode=1})
}
