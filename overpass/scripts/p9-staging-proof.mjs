#!/usr/bin/env node
/**
 * P9: content-addressed checks for an independently hosted staging artifact.
 * This script does not deploy anything and cannot attest a hosting-provider rollback.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'

export const PHASES=['candidate','rollback','redeploy']
const criticalCandidate=[
  'lab.html','app.js','overpass/index.html','overpass/LICENSE',
  'overpass/THIRD_PARTY_NOTICES.md','records/lab-l17.html',
  'assets/lab/previews/overpass.jpg'
]
const criticalRollback=[
  'lab.html','app.js','core/modules.js',
  'assets/lab/previews/orbit.jpg','assets/lab/previews/earth.jpg'
]
const absentAfterRollback=['overpass/','records/lab-l17.html','assets/lab/previews/overpass.jpg']
const hash=b=>createHash('sha256').update(b).digest('hex')
const sha40=s=>typeof s==='string'&&/^[a-f0-9]{40}$/.test(s)
const sha64=s=>typeof s==='string'&&/^[a-f0-9]{64}$/.test(s)
const phaseKind=phase=>phase==='rollback'?'rollback':'candidate'
const pathsFor=phase=>phaseKind(phase)==='rollback'?criticalRollback:criticalCandidate

export function validateStageUrl(raw) {
  const u=new URL(raw)
  assert.equal(u.protocol,'https:','Independent staging requires HTTPS')
  assert(!u.username&&!u.password&&!u.search&&!u.hash,'Stage URL must not contain credentials, query, or fragment')
  assert(!u.port||u.port==='443','Staging must use standard HTTPS port')
  const host=u.hostname.toLowerCase()
  assert(!/^(localhost|0\.0\.0\.0|127(?:\.\d+){3}|geogeeklab\.github\.io|(?:www\.)?watched\.earth)$/.test(host),'Loopback or production origin rejected')
  assert(!/(\.localhost|\.local|\.internal|\.test|\.invalid)$/.test(host),'Non-public stage hostname rejected')
  assert(!/^\d+\.\d+\.\d+\.\d+$/.test(host) && !host.includes(':'),'IP address staging is not accepted')
  assert.equal(u.pathname,'/','Independent stage must serve the production-equivalent routes at origin root')
  return u
}
export function inspectLab(html,phase) {
  const n=(html.match(/class="project-card contour-target is-actionable"/g)||[]).length
  const candidate=phaseKind(phase)==='candidate'
  assert.equal(n,candidate?14:13,'Wrong number of Lab cards at stage')
  assert.equal(html.includes('id="l17"'),candidate,'l17 visibility inconsistent with phase')
  assert.equal(html.includes('data-instrument-route="/overpass/"'),candidate,'OVERPASS route visibility inconsistent')
  return {cardCount:n,overpassVisible:candidate}
}
export function buildManifest(phase,root,sourceSha) {
  assert(PHASES.includes(phase),'Unknown phase')
  assert(sha40(sourceSha),'Require a real 40-character source commit SHA')
  const files={}
  for(const p of pathsFor(phase)) {
    const data=readFileSync(join(root,p))
    assert(data.length>0,'Empty file: '+p)
    files[p]={sha256:hash(data),bytes:data.length}
    if(p==='lab.html')inspectLab(data.toString('utf8'),phase)
  }
  const manifest={schema:'overpass-p9-stage-manifest-v1',kind:phaseKind(phase),
    sourceSha,files}
  return {...manifest,manifestSha256:hash(Buffer.from(JSON.stringify(manifest)))}
}
export function verifyManifest(m,phase) {
  assert.equal(m.schema,'overpass-p9-stage-manifest-v1')
  assert.equal(m.kind,phaseKind(phase),'Phase and manifest kind differ')
  assert(sha40(m.sourceSha),'Missing source commit')
  assert.deepEqual(Object.keys(m.files).sort(),[...pathsFor(phase)].sort(),'Unexpected manifest paths')
  for(const data of Object.values(m.files)) {
    assert(sha64(data.sha256)&&Number.isSafeInteger(data.bytes)&&data.bytes>0,'Bad manifest file hash or size')
  }
  const {manifestSha256,...core}=m
  assert.equal(manifestSha256,hash(Buffer.from(JSON.stringify(core))),'Manifest digest mismatch')
  return true
}
async function fetchFile(base,p) {
  const url=new URL(p,base)
  assert(url.href.startsWith(base.href),'Stage path escaped root')
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}})
  assert.equal(response.status,200,'Staging HTTP '+response.status+' at '+url.href)
  return Buffer.from(await response.arrayBuffer())
}
async function assertAbsent(base,p) {
  const url=new URL(p,base)
  const response=await fetch(url,{redirect:'manual',signal:AbortSignal.timeout(20000),
    headers:{'Cache-Control':'no-cache','Pragma':'no-cache'}})
  assert([404,410].includes(response.status),'Rollback retained OVERPASS route or asset: '+p+' HTTP '+response.status)
}
export async function probe(phase,stageUrl,manifest,deploymentRef) {
  assert(PHASES.includes(phase),'Unknown phase')
  verifyManifest(manifest,phase)
  assert(typeof deploymentRef==='string'&&/^[A-Za-z0-9._:-]{4,120}$/.test(deploymentRef),
    'A hosting deployment reference is required')
  const u=validateStageUrl(stageUrl)
  const base=new URL(u.href.endsWith('/')?u.href:u.href+'/')
  const observations={}
  for(const p of pathsFor(phase)) {
    const remote=await fetchFile(base,p)
    const actual={sha256:hash(remote),bytes:remote.length}
    assert.deepEqual(actual,manifest.files[p],'Hosted content differs from built artifact: '+p)
    if(p==='lab.html')inspectLab(remote.toString('utf8'),phase)
    if(p==='overpass/index.html')assert(remote.toString('utf8').includes('/overpass/assets/'),
      'OVERPASS base path invalid')
    observations[p]=actual
  }
  const absentPaths=phase==='rollback'?[...absentAfterRollback]:[]
  for(const p of absentPaths)await assertAbsent(base,p)
  return {schema:'overpass-p9-staging-observation-v1',phase,
    stageUrl:base.href,sourceSha:manifest.sourceSha,manifestSha256:manifest.manifestSha256,
    deploymentRef,checkedAt:new Date().toISOString(),files:observations,
    absentPaths,verifiedCriticalPaths:pathsFor(phase).length,
    fullArtifactVerified:false,hostingDeploymentVerified:false,releaseApproved:false}
}
export function verifySequence(reports) {
  assert(Array.isArray(reports)&&reports.length===3,'Need candidate, rollback, redeploy observations')
  reports.forEach((r,i)=>{
    assert.equal(r.schema,'overpass-p9-staging-observation-v1')
    assert.equal(r.phase,PHASES[i],'Incorrect staging sequence')
    assert(sha40(r.sourceSha)&&sha64(r.manifestSha256),'Invalid source/manifest digest')
    assert.equal(r.hostingDeploymentVerified,false,'Hosting evidence cannot be self-approved')
    assert.equal(r.releaseApproved,false,'No automatic release approval')
    assert.deepEqual(Object.keys(r.files).sort(),[...pathsFor(r.phase)].sort())
    assert.deepEqual(r.absentPaths,r.phase==='rollback'?absentAfterRollback:[],
      'Unapproved OVERPASS route/asset absence not observed')
    for(const file of Object.values(r.files))assert(sha64(file.sha256)&&file.bytes>0)
  })
  const [candidate,rollback,redeploy]=reports
  assert(reports.every(r=>r.stageUrl===candidate.stageUrl),'Different staging sites')
  validateStageUrl(candidate.stageUrl)
  assert(new Set(reports.map(r=>r.deploymentRef)).size===3,'Three distinct deployment references required')
  const timestamps=reports.map(r=>Date.parse(r.checkedAt))
  assert(timestamps.every(Number.isFinite),'Invalid observation time')
  assert(timestamps[0]<timestamps[1]&&timestamps[1]<timestamps[2],'Incorrect observation order')
  assert.equal(candidate.manifestSha256,redeploy.manifestSha256,'Redeployed candidate artifact changed')
  assert.equal(candidate.sourceSha,redeploy.sourceSha,'Candidate source changed')
  assert.notEqual(candidate.files['lab.html'].sha256,rollback.files['lab.html'].sha256,
    'Rollback did not replace the candidate Lab')
  for(const p of pathsFor('candidate'))assert.deepEqual(candidate.files[p],redeploy.files[p],
    'Redeployment content differs: '+p)
  return {schema:'overpass-p9-sequence-verification-v1',stageUrl:candidate.stageUrl,
    phases:PHASES,observedDeploymentRefs:reports.map(r=>r.deploymentRef),
    candidateSourceSha:candidate.sourceSha,rollbackSourceSha:rollback.sourceSha,
    criticalPathsRestored:true,httpSequenceConsistent:true,
    actualHostingRollbackProven:false,independentBrowserSmokePassed:false,
    humanApprovalGranted:false,releaseApproved:false}
}
export function saveJson(path,obj) {
  mkdirSync(dirname(resolve(path)),{recursive:true})
  writeFileSync(resolve(path),JSON.stringify(obj,null,2)+'\n')
}
async function cli(args) {
  const [command,...rest]=args
  if(command==='manifest') {
    assert.equal(rest.length,4,'manifest PHASE BUILD_DIR SOURCE_SHA OUTPUT_JSON')
    const [phase,root,sha,out]=rest
    const result=buildManifest(phase,resolve(root),sha)
    saveJson(out,result);console.log(JSON.stringify(result,null,2))
  } else if(command==='probe') {
    assert.equal(rest.length,5,'probe PHASE HTTPS_STAGE_URL MANIFEST_JSON DEPLOYMENT_REF OUTPUT_JSON')
    const [phase,url,manifest,ref,out]=rest
    const result=await probe(phase,url,JSON.parse(readFileSync(manifest,'utf8')),ref)
    saveJson(out,result);console.log(JSON.stringify(result,null,2))
  } else if(command==='verify') {
    assert.equal(rest.length,4,'verify CANDIDATE_JSON ROLLBACK_JSON REDEPLOY_JSON OUTPUT_JSON')
    const [a,b,c,out]=rest
    const result=verifySequence([a,b,c].map(p=>JSON.parse(readFileSync(p,'utf8'))))
    saveJson(out,result);console.log(JSON.stringify(result,null,2))
  } else throw new Error('Unknown command (manifest, probe, verify)')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  cli(process.argv.slice(2)).catch(e=>{console.error(e);process.exitCode=1})
}
