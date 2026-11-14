import test from 'node:test'
import assert from 'node:assert/strict'
import {utcEpoch,health,median,parseWatched,parseGeoGeek,compareCatalogs,toOmm} from '../lib/catalog-parity.mjs'
const zero='2026-11-13T00:00:00Z'
function watchedFixture(){
  const n=10001
  const scalar=new Array(n).fill(1)
  return {v:2,fetchedAt:zero,source:'CelesTrak GP',count:n,
    norad:[100,...new Array(n-1).fill(1)],
    epoch:new Array(n).fill(-1800),name:new Array(n).fill(''),
    n:new Array(n).fill(15),e:new Array(n).fill(.001),
    i:new Array(n).fill(98),raan:scalar,argp:scalar,ma:scalar,
    bstar:scalar,ndot:scalar,nddot:scalar}
}
function geoFixture(){
  const n=10001
  return {raw:Array.from({length:n},(_,i)=>({
    NORAD_CAT_ID:i+100,OBJECT_NAME:'SAT '+(i+100),
    EPOCH:'2026-11-13T00:00:00',MEAN_MOTION:15,ECCENTRICITY:.001,
    INCLINATION:98,RA_OF_ASC_NODE:1,ARG_OF_PERICENTER:1,MEAN_ANOMALY:1,
    BSTAR:1,MEAN_MOTION_DOT:1,MEAN_MOTION_DDOT:1
  })),meta:{dataset:'celestrak-active-gp',recordCount:n,fetchedAt:zero,refreshPolicy:{staleAfterMs:8*3600000}}}
}
test('UTC CelesTrak epochs without Z are parsed as UTC, not local time',()=>{
  assert.equal(utcEpoch('2026-11-13T00:00:00'),Date.parse(zero))
  assert.equal(utcEpoch('2026-11-13T00:00:00Z'),Date.parse(zero))
  assert(Number.isNaN(utcEpoch('')))
})
test('snapshot fetch time and orbital-element epochs have different freshness semantics',()=>{
  const h=health(zero,[utcEpoch('2026-11-01T00:00:00'),utcEpoch('2026-11-12T00:00:00')],Date.parse('2026-11-14T12:00:00Z'))
  assert.equal(h.snapshotStale48h,false)
  assert.equal(h.policyStale,false)
  assert(h.medianElementAgeDays>7)
  assert.notEqual(h.fetchedAt,h.epochMedian)
})
test('Watched delta ids and numeric columns are validated',()=>{
  const a=watchedFixture()
  assert.equal(parseWatched(a).count,10001)
  a.norad[10]=0
  assert.throws(()=>parseWatched(a),/positive/)
})
test('GeoGeek active metadata and row format are validated',()=>{
  const f=geoFixture()
  assert.equal(parseGeoGeek(f.raw,f.meta).count,10001)
  f.meta.recordCount=2
  assert.throws(()=>parseGeoGeek(f.raw,f.meta),/metadata mismatch/)
})
test('overlap accounts for non-identical sources; near-epoch threshold avoids false algorithm parity',()=>{
  const w=watchedFixture(),g=geoFixture()
  w.name[0]='ISS'
  const result=compareCatalogs(parseWatched(w),parseGeoGeek(g.raw,g.meta),Date.parse('2026-11-14T00:00:00Z')).result
  assert.equal(result.overlap.shared,10001)
  assert.equal(result.overlap.namedProfileRowsShared,1)
  assert.equal(result.overlap.nearEpochWithin1h,10001)
  g.raw[0].EPOCH='2026-10-01T00:00:00'
  const other=compareCatalogs(parseWatched(w),parseGeoGeek(g.raw,g.meta),Date.parse('2026-11-14T00:00:00Z')).result
  assert.equal(other.overlap.nearEpochWithin1h,10000)
  assert.equal(other.safety.catalogsInterchangeable,false)
})
test('OMM mapping keeps all orbital mean elements and UTC epoch',()=>{
  const obj=parseGeoGeek(...Object.values(geoFixture())).map.get(100)
  const omm=toOmm(obj)
  assert.equal(omm.NORAD_CAT_ID,100)
  assert.equal(omm.EPOCH,'2026-11-13T00:00:00.000')
  assert.equal(omm.MEAN_MOTION,15)
  assert.equal(omm.ECCENTRICITY,.001)
  assert.equal(omm.INCLINATION,98)
  assert.equal(median([1,3,5,7]),4)
})

test('Watched and GeoGeek enforce separate 48h and 8h age policies',()=>{
  const w=watchedFixture(),g=geoFixture()
  const asOf=Date.parse(zero)+9*3600000
  const result=compareCatalogs(parseWatched(w),parseGeoGeek(g.raw,g.meta),asOf).result
  assert.equal(result.watched.health.policyStaleAfterHours,48)
  assert.equal(result.geoGeek.health.policyStaleAfterHours,8)
  assert.equal(result.watched.health.policyStale,false)
  assert.equal(result.geoGeek.health.policyStale,true)
  assert.equal(result.geoGeek.health.snapshotStale48h,false)
})
