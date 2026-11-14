#!/usr/bin/env node
/**
 * Validate full runtime configuration without logging secret values.
 * Reject the static/no-database fallback for an explicitly FULL release.
 */
import assert from 'node:assert/strict'
import {resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export const REQUIRED=[
  'VITE_SUPABASE_URL','VITE_SUPABASE_PUBLISHABLE_KEY',
  'SITE_URL','VITE_SITE_ORIGIN','VITE_OVERPASS_PRODUCTION_HOST',
  'CDSE_CLIENT_ID','CDSE_CLIENT_SECRET'
]
export function publicHost(raw) {
  const u=new URL(raw)
  assert.equal(u.protocol,'https:','Use HTTPS for full runtime')
  assert(!u.username&&!u.password&&!u.search&&!u.hash,'Canonical origin must not include credentials or parameters')
  assert(u.pathname==='/' && !u.port,'Canonical origin must be a standard HTTPS origin')
  assert(!/^(localhost|127(?:\.\d+){3}|geogeeklab\.github\.io|(?:www\.)?watched\.earth)$/.test(u.hostname),
    'Dedicated OVERPASS backend origin required')
  return u.hostname
}
function secret(v){
  return typeof v==='string' && v.trim().length>=8 && !v.includes('<') && !v.includes('>') &&
    !/^change(me)?$/i.test(v.trim())
}
export function validateRuntime(e) {
  const missing=REQUIRED.filter(k=>!secret(e[k]))
  assert.deepEqual(missing,[],'Full mode missing or placeholder variables: '+missing.join(', '))
  const host=publicHost(e.SITE_URL)
  assert.equal(publicHost(e.VITE_SITE_ORIGIN),host,'Build and function origins differ')
  assert.equal(e.VITE_OVERPASS_PRODUCTION_HOST.trim().toLowerCase(),host,
    'Only the dedicated OVERPASS host may send usage events')
  const supa=new URL(e.VITE_SUPABASE_URL)
  assert.equal(supa.protocol,'https:','Supabase must use HTTPS')
  assert.equal(supa.pathname,'/','Supabase URL must be an origin')
  assert(!/watched\.earth$/.test(supa.hostname),'Cannot reuse official Watched database')
  assert(/^sb_publishable_[A-Za-z0-9_-]+$/.test(e.VITE_SUPABASE_PUBLISHABLE_KEY.trim()),
    'Only a Supabase publishable key may enter the public browser build')
  for(const k of ['SUPABASE_URL','SUPABASE_PUBLISHABLE_KEY']){
    if(e[k]) assert.equal(e[k],e['VITE_'+k],'Server and browser Supabase configuration differ')
  }
  if(e.VITE_OVERPASS_STATIC!==undefined)
    assert.equal(e.VITE_OVERPASS_STATIC,'0','Static fallback is incompatible with full runtime')
  if(e.VITE_TELEMETRY_E2E!==undefined)
    assert.notEqual(e.VITE_TELEMETRY_E2E,'1','Never enable E2E telemetry bypass in deployment')
  return {mode:'full',configuredEndpoints:['/api/pan','/api/og','/api/e','/s/:id'],
    dedicatedBackendHost:host,supabaseConfigured:true,cdseCredentialsPresent:true,
    secretsExposed:false,sourceTermsApproved:false,apiDeployVerified:false}
}
export async function probeSupabase(e=process.env) {
  const base=new URL(e.VITE_SUPABASE_URL)
  const u=new URL('/rest/v1/rpc/get_stats',base)
  const res=await fetch(u,{method:'POST',headers:{
    apikey:e.VITE_SUPABASE_PUBLISHABLE_KEY,
    authorization:'Bearer '+e.VITE_SUPABASE_PUBLISHABLE_KEY,
    'content-type':'application/json',accept:'application/json'},
    body:'{}',signal:AbortSignal.timeout(20000)})
  assert(res.ok,'Supabase anonymous get_stats RPC unavailable: HTTP '+res.status)
  const result=await res.json()
  assert(result && Number.isFinite(result.total) && Number.isFinite(result.last24h),
    'get_stats RPC did not return the migrated statistics schema')
  return {supabaseRpc:'get_stats',httpStatus:res.status,schemaValid:true,
    sourceTermsApproved:false}
}
async function main(argv) {
  if(argv[0])process.loadEnvFile(resolve(argv[0]))
  const result=validateRuntime(process.env)
  if(argv.includes('--probe-supabase'))Object.assign(result,await probeSupabase(process.env))
  console.log(JSON.stringify(result,null,2))
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
  main(process.argv.slice(2)).catch(e=>{console.error(String(e));process.exitCode=1})
