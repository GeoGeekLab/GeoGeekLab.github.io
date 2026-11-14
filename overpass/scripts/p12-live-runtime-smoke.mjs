#!/usr/bin/env node
/** Read-only, fail-closed smoke for a real independent HTTPS Vercel preview. */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export function stageOrigin(raw) {
  const u=new URL(raw)
  assert.equal(u.protocol,'https:','HTTPS preview required')
  assert(u.pathname==='/' && !u.username && !u.password && !u.search && !u.hash,
    'Use a clean root-level staging origin')
  assert(!/^(localhost|127(?:\.\d+){3}|geogeeklab\.github\.io|(?:www\.)?watched\.earth)$/i.test(u.hostname),
    'Production or loopback is not an independent backend preview')
  assert(!u.port,'Standard TLS port only')
  return u
}
async function check(origin,path,expected,kind,method='GET') {
  const u=new URL(path,origin)
  const response=await fetch(u,{method,redirect:'manual',signal:AbortSignal.timeout(30000),
    headers:{'Cache-Control':'no-cache',Accept:'*/*'}})
  assert.equal(response.status,expected,kind+' returned HTTP '+response.status+' at '+path)
  const data=Buffer.from(await response.arrayBuffer())
  const type=response.headers.get('content-type')||''
  if(kind==='html')assert(type.includes('text/html')&&data.length>1000,'App HTML unavailable')
  if(kind==='jpeg')assert(type.includes('image/jpeg')&&data.length>10000,'OG card JPEG unavailable')
  if(kind==='license')assert(data.toString('utf8').includes('Copyright (c) 2026 Armaan Gupta'),
    'Original MIT attribution not served')
  if(kind==='notice')assert(data.toString('utf8').includes('Solar System Scope'),'Third-party notices not served')
  return {path,status:response.status,sha256:createHash('sha256').update(data).digest('hex'),
    bytes:data.length,contentType:type}
}
export async function smoke(raw) {
  const origin=stageOrigin(raw)
  const checks=[
    await check(origin,'/',200,'html'),
    await check(origin,'/LICENSE',200,'license'),
    await check(origin,'/THIRD_PARTY_NOTICES.md',200,'notice'),
    await check(origin,'/api/e',405,'method'),
    await check(origin,'/api/pan?bbox=invalid',400,'query'),
    await check(origin,'/s/invalid',404,'invalid-share'),
    await check(origin,'/api/og?kind=place&place=Singapore&lat=1.35&lon=103.82',200,'jpeg')
  ]
  return {schema:'overpass-p12-full-runtime-preview-v1',origin:origin.origin,
    checkedAt:new Date().toISOString(),checks,
    allExpectedRoutesObserved:true,
    realPan200Verified:false,shareDatabaseWriteReadVerified:false,
    stagingRollbackVerified:false,humanTermsApproved:false,releaseApproved:false}
}
async function run(args) {
  assert(args.length===2,'Usage: node p12-live-runtime-smoke.mjs STAGING_HTTPS_ORIGIN REPORT_JSON')
  const result=await smoke(args[0])
  mkdirSync(dirname(resolve(args[1])),{recursive:true})
  writeFileSync(resolve(args[1]),JSON.stringify(result,null,2)+'\n')
  console.log(JSON.stringify(result,null,2))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  run(process.argv.slice(2)).catch(e=>{console.error(String(e));process.exitCode=1})
