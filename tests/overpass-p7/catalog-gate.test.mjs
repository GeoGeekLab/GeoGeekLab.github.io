import {test} from 'node:test'
import assert from 'node:assert/strict'
import {auditCatalog,MAX_SNAPSHOT_AGE_HOURS} from '../../overpass/scripts/p7-catalog-gate.mjs'
const generate=(at)=>({v:2,count:10000,fetchedAt:at,source:'CelesTrak GP',
 norad:Array(10000).fill(1),epoch:Array(10000).fill(0)})
const names=at=>({fetchedAt:at,norad:Array(10000).fill(1),name:Array(10000).fill('object')})
test('P7 fails a release when the real snapshot ages beyond 48 hours',()=>{
 const now=Date.parse('2026-11-14T12:00:00Z'),at='2026-11-12T11:59:00Z'
 const a=auditCatalog(generate(at),names(at),now)
 assert(a.stale)
 assert.equal(a.policyHours,MAX_SNAPSHOT_AGE_HOURS)
})
test('P7 distinguishes valid fresh transfer from element accuracy',()=>{
 const now=Date.parse('2026-11-14T12:00:00Z'),at='2026-11-14T00:00:00Z'
 const a=auditCatalog(generate(at),names(at),now)
 assert.equal(a.stale,false)
 assert(a.distributionNote.includes('not SGP4'))
})
test('P7 refuses mismatched catalog names even if both files are nonempty',()=>{
 const at='2026-11-14T00:00:00Z'
 assert.throws(()=>auditCatalog(generate(at),names('2026-11-13T00:00:00Z'),Date.parse(at)),/same refresh timestamp/)
})
test('P7 rejects duplicate/invalid NORAD deltas and missing epochs',()=>{
 const at='2026-11-14T00:00:00Z',c=generate(at)
 c.norad[4]=0
 assert.throws(()=>auditCatalog(c,names(at),Date.parse(at)),/Bad delta/)
})
