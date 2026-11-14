#!/usr/bin/env node
import assert from 'node:assert/strict'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { compareCatalogs, parseWatched, parseGeoGeek, chooseSgp4Sample, toOmm, vecDistanceKm, utcEpoch } from '../lib/catalog-parity.mjs'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const upstream=resolve(root,'overpass/upstream')
const watchedPath=resolve(upstream,'public/data/catalog.json')
const geogeekPath=resolve(root,'site/orbital/data/active.json')
const metaPath=resolve(root,'site/orbital/data/active.meta.json')
const json=path=>JSON.parse(readFileSync(path,'utf8'))
const w=parseWatched(json(watchedPath))
const g=parseGeoGeek(json(geogeekPath),json(metaPath))
const asOfMs=Date.now()
const {result,matched}=compareCatalogs(w,g,asOfMs)
const req=createRequire(resolve(upstream,'package.json'))
const sat=await import(req.resolve('satellite.js'))
const samples=chooseSgp4Sample(matched)
const rows=[]
let failures=0
for(const s of samples){
  const atMs=Math.max(s.w.epochMs,s.g.epochMs)
  const at=new Date(atMs)
  const wRec=sat.json2satrec(toOmm(s.w))
  const gRec=sat.json2satrec(toOmm(s.g))
  const remappedGeo=sat.json2satrec({...s.g.raw,
    EPOCH:new Date(s.g.epochMs).toISOString().slice(0,-1)})
  const wPos=sat.propagate(wRec,at)
  const gPos=sat.propagate(gRec,at)
  const gOriginal=sat.propagate(remappedGeo,at)
  const valid=x=>x?.position && ['x','y','z'].every(k=>Number.isFinite(x.position[k]))
  if(!valid(gPos)||!valid(gOriginal)) {failures++;continue}
  const mappingErrorKm=vecDistanceKm(gPos.position,gOriginal.position)
  // Same element set must reproduce the original SGP4 position; this checks
  // the OMM field mapping, NOT old-vs-new element accuracy.
  assert(mappingErrorKm<0.001,'Same-element OMM to SGP4 mismatch for '+s.id+': '+mappingErrorKm)
  rows.push({
    norad:s.id,name:s.w.name||s.g.name,
    elementEpochDeltaHours:Math.round(s.absEpochDeltaHours*100)/100,
    matchingSnapshots:s.absEpochDeltaHours<=1,
    geogeekOmmMappingErrorKm:Math.round(mappingErrorKm*1e6)/1e6,
    crossSnapshotSgp4DistanceKm:valid(wPos)?Math.round(vecDistanceKm(wPos.position,gPos.position)*1000)/1000:null
  })
}
assert(rows.length>=8,'Too few usable representative SGP4 rows: '+rows.length)
result.sgp4={
  libraryUsedForControlledComparison:'satellite.js installed by pinned Watched submodule',
  originalGeoGeekWorkerLibrary:'satellite.js@6.0.2 (+esm CDN)',
  reference:'The same OMM input is propagated twice to verify field mapping; cross-snapshot distances are descriptive only.',
  sampleCount:rows.length,failedSamples:failures,samples:rows
}
result.passes={
  enginePreserved:'Watched original SGP4 pass solver and curated sensor profiles',
  testSources:['src/engine/passes.test.ts','src/engine/independent.test.ts','src/engine/report.test.ts'],
  validation:'Run original Vitest regression and independent 1-second brute-force/WGS-84 checks; never compare unmatched catalog pass totals.',
  crossEngineParityClaim:false
}
const output=resolve(root,'overpass/reports/r3-catalog-parity.json')
mkdirSync(dirname(output),{recursive:true})
writeFileSync(output,JSON.stringify(result,null,2)+'\n')
console.log('P3 catalog audit report:',output)
console.log(JSON.stringify({watched:result.watched,geoGeek:result.geoGeek,overlap:result.overlap,sgp4:{sampleCount:rows.length,failedSamples:failures}},null,2))
const release=process.argv.includes('--release-check')
if(release){
  // Frozen pinned catalogs are intentionally not refreshed during source
  // build. This gate is for publishing, after a lawful upstream data refresh.
  assert(!result.watched.health.snapshotStale48h,'Watched snapshot >48h old; refresh before release')
  assert(!result.geoGeek.health.snapshotStale48h,'GeoGeek snapshot >48h old; refresh before shared-source deployment')
  assert(result.overlap.namedProfileRowsMissingFromGeoGeekActive===0,'GeoGeek active snapshot lacks Watched profiled objects')
}
