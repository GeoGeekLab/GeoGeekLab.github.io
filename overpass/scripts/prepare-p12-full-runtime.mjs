#!/usr/bin/env node
/**
 * Prepare a source-based, full-backend Vercel OVERPASS app from the pinned
 * Watched submodule. Run only in a disposable CI checkout, after R2/P4/P5.
 *
 * This is a distinct origin with root-relative /api, /s and /assets paths.
 * It is NOT a production GeoGeek Pages edit or a self-approval.
 */
import assert from 'node:assert/strict'
import {copyFileSync,existsSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

function replaceOne(s,oldText,newText,label) {
  const i=s.indexOf(oldText)
  assert(i!==-1,'Pinned source signature missing: '+label)
  assert(s.indexOf(oldText,i+oldText.length)===-1,'Ambiguous source signature: '+label)
  return s.slice(0,i)+newText+s.slice(i+oldText.length)
}
export function fullVite(source) {
  return replaceOne(source,"base: '/overpass/',","base: '/',",'Vite full runtime root')
}
export function fullPan(source) {
  return replaceOne(source,
    "  if (import.meta.env.BASE_URL === '/overpass/' || import.meta.env.VITE_OVERPASS_STATIC === '1') return undefined",
    "  if (import.meta.env.VITE_OVERPASS_STATIC === '1') return undefined",
    'Dynamic API pan is not disabled by Vite base')
}
export function fullTelemetry(source) {
  return replaceOne(source,
    "export const PRODUCTION_HOSTS: readonly string[] = ['www.watched.earth', 'watched.earth']",
    "export const PRODUCTION_HOSTS: readonly string[] = [import.meta.env.VITE_OVERPASS_PRODUCTION_HOST].filter((host): host is string => typeof host === 'string' && /^[a-z0-9.-]+$/i.test(host))",
    'No usage events may go to Watched official host')
}
export function fullAbout(source) {
  let s=source
  const edits=[
    [
      'This static preview uses a fixed catalog snapshot and does not refresh its orbit data automatically.',
      'The deployed catalog is a snapshot. Check its date before interpreting pass estimates; refreshes happen outside the browser.'
    ],
    [
      'This static preview has no connected search or share database. Its host and external place-search or imagery services can receive and log requests.',
      'When a database is configured, searches and shares are recorded under the privacy rules below. The host and external place-search or imagery services can receive and log requests.'
    ],
    [
      'GitHub Pages serves this static site.',
      'The separate OVERPASS host serves this application and its dynamic API.'
    ],
    [
      'This static version makes a URL with the place label, coordinates rounded to 0.01°, and optional pass details. Anyone with it can read those details. Short links and social cards need a backend.',
      'This application can create short share links when its database is configured. Shared place labels and coordinates rounded to 0.01° can be read by link recipients. Shared cards need the dynamic API.'
    ],
    [
      'The original Watched service also supports 15 m Landsat pan-sharpening; static OVERPASS uses its 30 m source.',
      'With Copernicus Data Space credentials, the dynamic API can request the Landsat 15 m panchromatic band. When the provider is unavailable, the 30 m source remains the fallback.'
    ],
    [
      'href="/overpass/LICENSE"',
      'href="/LICENSE"'
    ],
    [
      'href="/overpass/THIRD_PARTY_NOTICES.md"',
      'href="/THIRD_PARTY_NOTICES.md"'
    ]
  ]
  for(const [oldText,newText] of edits)s=replaceOne(s,oldText,newText,'About '+oldText.slice(0,42))
  return s
}
export function validateVercelRoutes(routes) {
  assert.equal(routes.framework,'vite','Expected upstream Vite application')
  for(const f of ['api/pan.ts','api/og.tsx','api/e.ts','api/s.ts'])
    assert(routes.functions?.[f]?.maxDuration>0,'Missing server function '+f)
  const named=new Map(routes.routes.map(r=>[r.src,r]))
  assert(named.has('/s/(?<id>[^/]+)'),'Missing share-id rewrite')
  assert.equal(named.get('/s/(?<id>[^/]+)')?.dest,'/api/s?id=$id')
  assert(routes.routes.some(r=>r.handle==='filesystem'),'Missing static files router')
  assert(routes.routes.some(r=>r.dest==='/index.html'),'Missing SPA fallback')
  return true
}
export function prepare(root) {
  const up=resolve(root,'overpass/upstream')
  assert(existsSync(join(up,'api/pan.ts')),'Pinned source checkout required')
  assert(existsSync(join(up,'api/og.tsx')),'Pinned OG function required')
  const maps={
    'vite.config.ts':fullVite,
    'vite.admin.config.ts':fullVite,
    'src/ui/hud/Hud.tsx':s=>replaceOne(s,'href="/overpass/"','href="/"','Root home route'),
    'src/imagery/panUrl.ts':fullPan,
    'src/lib/telemetry.ts':fullTelemetry,
    'src/ui/pages/AboutPage.tsx':fullAbout,
    'src/ui/timelapse/video.ts':s=>replaceOne(
      s,"(import.meta.env.BASE_URL === '/overpass/' || import.meta.env.VITE_OVERPASS_STATIC === '1') ? 'overpass' : 'watched'",
      "'overpass'",'Consistent OVERPASS export filename')
  }
  for(const [path,patch] of Object.entries(maps)){
    const file=join(up,path)
    const before=readFileSync(file,'utf8')
    const after=patch(before)
    assert(after!==before,'Full runtime patch had no effect: '+path)
    writeFileSync(file,after)
  }
  validateVercelRoutes(JSON.parse(readFileSync(join(up,'vercel.json'),'utf8')))
  for(const name of ['LICENSE','THIRD_PARTY_NOTICES.md']){
    const src=join(up,name)
    const target=join(up,'public',name)
    assert(existsSync(src),'Pinned notice missing: '+name)
    assert(!existsSync(target),'Notice already exists; refuse overwrite: '+name)
    copyFileSync(src,target)
  }
  const pan=readFileSync(join(up,'src/imagery/panUrl.ts'),'utf8')
  assert(!pan.includes("BASE_URL === '/overpass/'"),'Full app still disables pan for its former base')
  const host=readFileSync(join(up,'src/lib/telemetry.ts'),'utf8')
  assert(!host.includes("'www.watched.earth', 'watched.earth'"),'Telemetry still points at upstream brand')
  return {mode:'full-backend-Vercel-root',
    endpoints:['/api/pan','/api/og','/api/e','/s/:id'],
    canonicalRoot:'/',notices:['/LICENSE','/THIRD_PARTY_NOTICES.md'],
    separateFromGeoGeekPages:true,staticOnly:false,
    sourceFilesPatched:Object.keys(maps),publicationApproved:false}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
  console.log(JSON.stringify(prepare(root),null,2))
}
