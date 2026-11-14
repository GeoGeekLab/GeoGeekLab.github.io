import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fullVite,fullPan,fullTelemetry,fullAbout,validateVercelRoutes} from '../../overpass/scripts/prepare-p12-full-runtime.mjs'
import {validateRuntime,publicHost} from '../../overpass/scripts/p12-runtime-preflight.mjs'

const P='https://overpass.example.org'
const good={
 VITE_SUPABASE_URL:'https://safeproject.supabase.co',
 VITE_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_123456789abcd',
 SITE_URL:P,VITE_SITE_ORIGIN:P,VITE_OVERPASS_PRODUCTION_HOST:'overpass.example.org',
 CDSE_CLIENT_ID:'id-12345678',CDSE_CLIENT_SECRET:'secret-12345678',
 VITE_OVERPASS_STATIC:'0'
}
test('FULL mode requires standalone HTTPS origin and real service configuration',()=>{
 const v=validateRuntime(good)
 assert.equal(v.mode,'full')
 assert.equal(v.sourceTermsApproved,false)
 assert.equal(v.apiDeployVerified,false)
 for(const [key,value] of Object.entries({
  SITE_URL:'https://geogeeklab.github.io',
  VITE_SITE_ORIGIN:'https://not-the-same.example.org',
  VITE_SUPABASE_PUBLISHABLE_KEY:'service_role_testsecret',
  CDSE_CLIENT_ID:'',
  VITE_OVERPASS_STATIC:'1',
  VITE_OVERPASS_PRODUCTION_HOST:'watched.earth',
  VITE_TELEMETRY_E2E:'1'
 }))assert.throws(()=>validateRuntime({...good,[key]:value}),key)
 assert.equal(publicHost(P),'overpass.example.org')
 assert.throws(()=>publicHost('http://overpass.example.org'))
})
test('FULL mode changes exactly the prefixed Vite roots without changing upstream code',()=>{
 assert.equal(fullVite("defineConfig({\n  base: '/overpass/',\n})"),"defineConfig({\n  base: '/',\n})")
 assert.throws(()=>fullVite("defineConfig({base:'/'})"))
 const patched=fullPan("a\n  if (import.meta.env.BASE_URL === '/overpass/' || import.meta.env.VITE_OVERPASS_STATIC === '1') return undefined\nb")
 assert(!patched.includes("BASE_URL === '/overpass/'"))
 assert(patched.includes("VITE_OVERPASS_STATIC === '1'"))
 assert.throws(()=>fullPan('no static-only guard'))
})
test('FULL mode removes official upstream telemetry host',()=>{
 const s=fullTelemetry("export const PRODUCTION_HOSTS: readonly string[] = ['www.watched.earth', 'watched.earth']")
 assert(!s.includes("['www.watched.earth', 'watched.earth']"))
 assert(s.includes('VITE_OVERPASS_PRODUCTION_HOST'))
 assert.throws(()=>fullTelemetry('const PRODUCTION_HOSTS = []'))
})
test('FULL mode About page changes static-only claims and fixes license paths',()=>{
 const old=[
 'This static preview uses a fixed catalog snapshot and does not refresh its orbit data automatically.',
 'This static preview has no connected search or share database. Its host and external place-search or imagery services can receive and log requests.',
 'GitHub Pages serves this static site.',
 'This static version makes a URL with the place label, coordinates rounded to 0.01°, and optional pass details. Anyone with it can read those details. Short links and social cards need a backend.',
 'The original Watched service also supports 15 m Landsat pan-sharpening; static OVERPASS uses its 30 m source.',
 'href="/overpass/LICENSE"',
 'href="/overpass/THIRD_PARTY_NOTICES.md"'
 ].join('\n')
 const updated=fullAbout(old)
 assert(updated.includes('dynamic API'))
 assert(!updated.includes('static preview'))
 assert(updated.includes('href="/LICENSE"'))
 assert(updated.includes('href="/THIRD_PARTY_NOTICES.md"'))
 assert.throws(()=>fullAbout('unmodified pinned upstream signature absent'))
})
test('FULL Vercel config must route four APIs, share ids, static assets and SPA',()=>{
 const r={
  framework:'vite',
  functions:Object.fromEntries(['api/pan.ts','api/og.tsx','api/e.ts','api/s.ts'].map(k=>[k,{maxDuration:10}])),
  routes:[{src:'/s/(?<id>[^/]+)',dest:'/api/s?id=$id'},{handle:'filesystem'},{src:'/(?!api/|s/)[^.]*',dest:'/index.html'}]
 }
 assert(validateVercelRoutes(r))
 assert.throws(()=>validateVercelRoutes({...r,functions:{...r.functions,'api/pan.ts':{maxDuration:0}}}))
 assert.throws(()=>validateVercelRoutes({...r,routes:r.routes.slice(1)}))
})
