#!/usr/bin/env node
/** Generate a fresh derivative default Open Graph card from the patched renderer. */
import assert from 'node:assert/strict'
import {mkdirSync,writeFileSync} from 'node:fs'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'

export const BAKE_SCRIPT = [
 "import {writeFileSync,readFileSync} from 'node:fs'",
 "import {defaultCardPng} from '../api/og.tsx'",
 "import {createHash} from 'node:crypto'",
 "const bytes=Buffer.from(await defaultCardPng(''))",
 "if(bytes.length<10000||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a') throw new Error('Expected actual PNG card')",
 "const out='public/og-default.png'",
 "const old=readFileSync(out)",
 "if(createHash('sha256').update(old).digest('hex')===createHash('sha256').update(bytes).digest('hex')) throw new Error('Default OG card was not rebaked with independent identity')",
 "writeFileSync(out,bytes)",
 "console.log('P12 independent OG card PNG:',bytes.length,'bytes')"
].join('\n')+'\n'

export function prepare(root) {
 const script=resolve(root,'overpass/upstream/scripts/p12-bake-og.mjs')
 assert(script.includes('/overpass/upstream/scripts/'),'Only a disposable upstream checkout may be used')
 mkdirSync(dirname(script),{recursive:true})
 writeFileSync(script,BAKE_SCRIPT)
 return script
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 console.log('Created isolated default Open Graph card baker:',prepare(root))
}
