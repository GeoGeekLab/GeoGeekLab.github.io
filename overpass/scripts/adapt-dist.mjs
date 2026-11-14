import assert from 'node:assert/strict'
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, resolve, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const dist=resolve(root,'overpass/upstream/dist')
const pathToken=/(['"\x60])\/(textures|data|places|brand)\//g
let rewrites=0
function visit(folder) {
  for(const name of readdirSync(folder)){
    const file=join(folder,name)
    if(statSync(file).isDirectory()) {visit(file);continue}
    if(!['.js','.css','.html'].includes(extname(name))) continue
    const source=readFileSync(file,'utf8')
    const result=source.replace(pathToken,(full,quote,prefix)=>{
      rewrites++
      return quote+'/overpass/'+prefix+'/'
    })
    if(result!==source) writeFileSync(file,result)
  }
}
visit(dist)
assert(rewrites>0,'Expected public assets in original Watched bundles')
const html=readFileSync(join(dist,'index.html'),'utf8')
assert(html.includes('/overpass/assets/'),'Vite base mismatch')
assert(html.includes('/overpass/textures/'),'Texture preload mismatch')
assert(html.includes('/overpass/data/catalog.json'),'Catalog preload mismatch')
console.log('Adapted public asset root paths:',rewrites)
