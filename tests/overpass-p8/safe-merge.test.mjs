import {test} from 'node:test'
import assert from 'node:assert/strict'
import {validateStageUrl,validatePage} from '../../overpass/scripts/p8-staging-smoke.mjs'
import {assertCodeOnly} from '../../overpass/scripts/p8-code-only-merge-gate.mjs'
test('P8 staging must use independent HTTPS, not localhost or production',()=>{
 for(const u of ['http://staging.example.com/','http://localhost:4444/','https://geogeeklab.github.io/','https://watched.earth/','https://127.0.0.1/'])assert.throws(()=>validateStageUrl(u))
 assert.equal(validateStageUrl('https://staging.geogeek.example/').protocol,'https:')
})
test('P8 rollback is not accepted when the candidate card remains deployed',()=>{
 const card=id=>'<article class="project-card contour-target is-actionable" id="'+id+'"></article>'
 const old=Array.from({length:13},(_,i)=>card('l'+i)).join('')
 const newer=old+card('l17')+'<a data-instrument-route="/overpass/"></a>'
 assert.equal(validatePage(old,'rollback').count,13)
 assert.equal(validatePage(newer,'candidate').count,14)
 assert.throws(()=>validatePage(newer,'rollback'))
})
test('P8 disallows public OVERPASS activation during code-only merge',()=>{
 const o={pages:'push:\n    branches: [main]\n',content:'window.GEOGEEK_ARCHIVE = {}',
  labHtml:'<div id="l13"></div>',submodule:'[submodule "overpass/upstream"]\nurl = https://github.com/dev-Armaan/satellites',approvals:false}
 assert(assertCodeOnly(o).codeMergeEligible)
 assert.throws(()=>assertCodeOnly({...o,pages:o.pages+'node overpass/scripts/prepare-p7-source.mjs'}))
 assert.throws(()=>assertCodeOnly({...o,content:'"ref": "lab:l17"'}))
 assert.throws(()=>assertCodeOnly({...o,approvals:true}))
})
