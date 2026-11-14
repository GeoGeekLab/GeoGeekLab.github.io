import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const from=resolve(root,'overpass/upstream/dist')
const to=resolve(root,'dist/overpass')
assert(existsSync(resolve(root,'dist/index.html')),'GeoGeek build required')
assert(existsSync(resolve(from,'index.html')),'Overpass build required')
assert(!existsSync(to),'Refuse to overwrite an existing preview')
mkdirSync(to,{recursive:true})
cpSync(from,to,{recursive:true})
assert(readFileSync(resolve(to,'index.html'),'utf8').includes('/overpass/assets/'),'Invalid preview base')
console.log('Branch-only static preview assembled in dist/overpass')
