import assert from 'node:assert/strict'
import {copyFileSync,existsSync,readFileSync} from 'node:fs'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const base=resolve(root,'overpass/upstream'),dist=join(base,'dist')
assert(existsSync(join(dist,'index.html')),'OVERPASS build missing')
for(const f of ['LICENSE','THIRD_PARTY_NOTICES.md']){
 copyFileSync(join(base,f),join(dist,f))
 assert(readFileSync(join(dist,f),'utf8').length>900,'Incomplete notice '+f)
}
assert(readFileSync(join(dist,'LICENSE'),'utf8').includes('Copyright (c) 2026 Armaan Gupta'),'Original author copyright missing')
console.log('P5 static MIT license and third-party notices preserved')
