import assert from 'node:assert/strict'
import { cpSync, existsSync, mkdirSync, readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const from=resolve(root,'overpass/upstream/dist')
const to=resolve(root,'overpass/preview-root/overpass')
assert(existsSync(resolve(from,'index.html')),'Overpass built artifact required')
assert(!existsSync(to),'Refuse to overwrite an existing preview')
mkdirSync(to,{recursive:true})
cpSync(from,to,{recursive:true})
assert(readFileSync(resolve(to,'index.html'),'utf8').includes('/overpass/assets/'),'Invalid preview base')
console.log('Isolated /overpass/ preview staged under overpass/preview-root')
