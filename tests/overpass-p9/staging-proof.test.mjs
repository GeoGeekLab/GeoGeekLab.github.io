import {test} from 'node:test'
import assert from 'node:assert/strict'
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join,dirname} from 'node:path'
import {buildManifest,inspectLab,validateStageUrl,verifyManifest,verifySequence} from '../../overpass/scripts/p9-staging-proof.mjs'

const SHA='bcb5eadcd6f1c7c4b0553687522b49da0f5b699e'
const card=id=>'<article class="project-card contour-target is-actionable" id="'+id+'"></article>'
const old=Array.from({length:13},(_,i)=>card('l'+i)).join('')
const candidate=old+card('l17')+'<a data-instrument-route="/overpass/"></a>'
const candidatePaths=[
 'lab.html','app.js','overpass/index.html','overpass/LICENSE','overpass/THIRD_PARTY_NOTICES.md',
 'records/lab-l17.html','assets/lab/previews/overpass.jpg'
]
const rollbackPaths=[
 'lab.html','app.js','core/modules.js','assets/lab/previews/orbit.jpg','assets/lab/previews/earth.jpg'
]
const put=(root,p,content)=>{const f=join(root,p);mkdirSync(dirname(f),{recursive:true});writeFileSync(f,content)}
function snapshot(phase) {
 const root=mkdtempSync(join(tmpdir(),'overpass-p9-'))
 try {
  for(const p of phase==='rollback'?rollbackPaths:candidatePaths)
   put(root,p,p==='lab.html'?(phase==='rollback'?old:candidate):p==='overpass/index.html'?'/overpass/assets/main.js':'sample file '+p)
  return buildManifest(phase,root,SHA)
 } finally {rmSync(root,{recursive:true,force:true})}
}
function observed(phase,manifest,at,ref) {
 return {schema:'overpass-p9-staging-observation-v1',phase,
  stageUrl:'https://stage.example.com/',sourceSha:manifest.sourceSha,
  manifestSha256:manifest.manifestSha256,deploymentRef:ref,checkedAt:at,
  files:manifest.files,hostingDeploymentVerified:false,releaseApproved:false}
}
test('P9 staging rejects non-HTTPS, private, loopback and production targets',()=>{
 for(const u of ['http://staging.example.com/','https://localhost/',
 'https://127.0.0.1/','https://10.0.0.1/','https://[::1]/',
 'https://geogeeklab.github.io/','https://watched.earth/',
 'https://dev.internal/','https://stage.example.com:8443/'])
  assert.throws(()=>validateStageUrl(u),u)
 assert.equal(validateStageUrl('https://stage.example.com/').origin,'https://stage.example.com')
})
test('P9 instrument contract distinguishes candidate and 13-card rollback',()=>{
 assert.equal(inspectLab(candidate,'candidate').cardCount,14)
 assert.equal(inspectLab(candidate,'redeploy').cardCount,14)
 assert.equal(inspectLab(old,'rollback').cardCount,13)
 assert.throws(()=>inspectLab(candidate,'rollback'))
 assert.throws(()=>inspectLab(old,'candidate'))
})
test('P9 artifact manifests verify build SHA and exact selected file hashes',()=>{
 const m=snapshot('candidate')
 assert.equal(verifyManifest(m,'candidate'),true)
 assert.throws(()=>verifyManifest({...m,sourceSha:'fake'},'candidate'))
 assert.throws(()=>verifyManifest({...m,kind:'rollback'},'candidate'))
 assert.throws(()=>verifyManifest({...m,files:{...m.files,'lab.html':{sha256:'0'.repeat(64),bytes:200}}},'candidate'))
})
test('P9 sequence enforces chronological three-deployment, same content redeploy',()=>{
 const c=snapshot('candidate'),b=snapshot('rollback')
 const reports=[
  observed('candidate',c,'2026-11-14T12:00:00Z','stage-run-a'),
  observed('rollback',b,'2026-11-14T12:05:00Z','stage-run-b'),
  observed('redeploy',c,'2026-11-14T12:10:00Z','stage-run-c')]
 const result=verifySequence(reports)
 assert.equal(result.httpSequenceConsistent,true)
 assert.equal(result.actualHostingRollbackProven,false)
 assert.equal(result.releaseApproved,false)
 assert.throws(()=>verifySequence([reports[0],reports[2],reports[1]]))
 assert.throws(()=>verifySequence([reports[0],{...reports[1],deploymentRef:'stage-run-a'},reports[2]]))
 assert.throws(()=>verifySequence([reports[0],reports[1],{...reports[2],sourceSha:'0'.repeat(40)}]))
 assert.throws(()=>verifySequence([reports[0],reports[1],{...reports[2],stageUrl:'https://other.example.com/'}]))
 assert.throws(()=>verifySequence([reports[0],reports[1],{...reports[2],files:{...reports[2].files,'app.js':{sha256:'0'.repeat(64),bytes:20}}}]))
})
