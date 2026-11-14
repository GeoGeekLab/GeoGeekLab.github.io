#!/usr/bin/env node
/**
 * Preserve Watched attribution and MIT terms, but do not present the
 * independent derivative as the official Watched brand in social cards.
 * Applied only to the disposable full-runtime checkout.
 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
function one(s,a,b,label) {
 const p=s.indexOf(a)
 assert(p!==-1 && s.indexOf(a,p+a.length)===-1,'Unexpected original social source: '+label)
 return s.slice(0,p)+b+s.slice(p+a.length)
}
export function patchHtml(source) {
 let s=one(source,'content="Watched"','content="OVERPASS"','share site_name')
 s=one(s,'>Watched</a></p>','>OVERPASS</a></p>','human share redirect')
 return s
}
export function patchWordmark(source) {
 const original=/export function wordmarkSvg\(fill: string, signal = '#FF6A1A'\): string \{[\s\S]*?^\}/m
 const match=source.match(original)
 assert(match && match[0].includes('WORDMARK_PATH'),'Expected pinned glyph-based upstream wordmarkSvg; refuse a second patch')
 return source.replace(original,()=>[
  "export function wordmarkSvg(fill: string, signal = '#FF6A1A'): string {",
  "  return '<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 300.51 72.54\" width=\"300.51\" height=\"72.54\"><text x=\"2\" y=\"57\" fill=\"'+fill+'\" font-family=\"Georgia,serif\" font-size=\"63\" textLength=\"275\" lengthAdjust=\"spacingAndGlyphs\">Overpass</text><circle cx=\"291.28\" cy=\"63\" r=\"6.6\" fill=\"'+signal+'\"/></svg>'",
  "}"
 ].join('\n'))
}
export function patchCanvasCard(source) {
 let s=one(source,
  'WORDMARK_BOX, WORDMARK_DOT, WORDMARK_PATH',
  'WORDMARK_BOX, WORDMARK_DOT',
  'client wordmark path import')
 s=one(s,
  'ctx.fill(new Path2D(WORDMARK_PATH))',
  "ctx.font = '68px Georgia, serif'\n  ctx.fillText('Overpass', 0, 72)",
  'client share-card identity')
 return s
}
export function prepare(root) {
 const up=resolve(root,'overpass/upstream')
 const patches={
  'api/_lib/html.ts':patchHtml,
  'api/_lib/wordmark.ts':patchWordmark,
  'src/ui/share/card.ts':patchCanvasCard
 }
 for(const [path,fn] of Object.entries(patches)){
  const file=join(up,path),before=readFileSync(file,'utf8'),after=fn(before)
  assert(after!==before)
  writeFileSync(file,after)
 }
 return {mode:'independent-OVERPASS-derivative',
  alteredFiles:Object.keys(patches),originalWatchedCopyrightRetained:true,
  thirdPartyLegalApproved:false,rebakeDefaultOgStillRequired:true}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 console.log(JSON.stringify(prepare(root),null,2))
}
