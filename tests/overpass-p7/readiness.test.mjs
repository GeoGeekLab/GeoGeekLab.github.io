import {test} from 'node:test'
import assert from 'node:assert/strict'
import {evaluate,inspectGeoGeekMeta} from '../../overpass/scripts/p7-readiness.mjs'
test('P7 release blocks on a stale GeoGeek data supply, even with fresh Watched catalog',()=>{
 const geoGeek={dataset:'celestrak-active-gp',fetchedAt:'2026-11-01T02:57:24.245Z',
  refreshPolicy:{staleAfterMs:8*3600000},recordCount:16848}
 const actual=inspectGeoGeekMeta(geoGeek,Date.parse('2026-11-14T12:00:00Z'))
 assert(actual.stale)
 const r=evaluate({watched:{stale:false},geoGeek:actual,legal:true,rollback:true,assets:true})
 assert.equal(r.releaseEligible,false)
 assert(r.blockers.some(x=>x.includes('GeoGeek')))
})
test('P7 rollout never calls CI success proof of live-data freshness',()=>{
 const r=evaluate({watched:{stale:true},geoGeek:{stale:false},legal:true,rollback:true,assets:true})
 assert.equal(r.releaseEligible,false)
 assert(r.blockers.some(x=>x.includes('Watched')))
 assert(r.blockers.some(x=>x.includes('MP4')))
})
test('P7 legal, rollback and static route gates all block missing evidence',()=>{
 const r=evaluate({watched:{stale:false},geoGeek:{stale:false},legal:false,rollback:false,assets:false})
 assert.equal(r.blockers.length,7)
})
test('P7 gate permits release only after all independently verifiable requirements pass',()=>{
 const r=evaluate({watched:{stale:false},geoGeek:{stale:false},legal:true,rollback:true,assets:true,
  staging:true,mp4:true,providerTerms:true,backendScope:true})
 assert.equal(r.releaseEligible,true)
 assert.equal(r.blockers.length,0)
})

test('P7 never equates a fresh source catalog with approval for deployment',()=>{
 const r=evaluate({watched:{stale:false},geoGeek:{stale:false},legal:true,rollback:true,assets:true})
 assert.equal(r.releaseEligible,false)
 assert(r.blockers.some(x=>x.includes('staging')))
 assert(r.blockers.some(x=>x.includes('MP4')))
 assert(r.blockers.some(x=>x.includes('Provider')))
 assert(r.blockers.some(x=>x.includes('/api')))
})
