import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, resolve, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const dist=resolve(root,'overpass/upstream/dist')
for(const p of ['index.html','admin.html','data/catalog.json','textures/earth-day-1k.webp','textures/earth-night-1k.webp','brand/wordmark.svg'])
  assert(existsSync(join(dist,p)),'Missing resource '+p)
const html=readFileSync(join(dist,'index.html'),'utf8')
assert(html.includes('OVERPASS — GeoGeek Observatory'),'Document title missing')
assert(html.includes('Something watched you this week'),'Original landing copy missing')
assert(html.includes('/overpass/assets/'),'Bundled asset base missing')
assert(!/['"]\/(?:data|places|textures|brand)\//.test(html),'Root public asset in index.html')
let n=0
for(const name of readdirSync(join(dist,'assets'))){
  if(!['.js','.css'].includes(extname(name))) continue
  const str=readFileSync(join(dist,'assets',name),'utf8')
  assert(!/['"]\/(?:data|places|textures|brand)\//.test(str),'Root asset remains in '+name)
  n++
}
assert(n>3,'No Vite chunks produced')
const catalog=JSON.parse(readFileSync(join(dist,'data/catalog.json'),'utf8'))
assert(catalog && typeof catalog==='object','Catalog missing')
console.log('R2 static build smoke PASS; checked bundles:',n,'catalog bytes:',statSync(join(dist,'data/catalog.json')).size)
