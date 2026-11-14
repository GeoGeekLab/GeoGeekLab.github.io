import {test} from 'node:test'
import assert from 'node:assert/strict'
import {patchHtml,patchWordmark,patchCanvasCard} from '../../overpass/scripts/p12-social-identity.mjs'

test('server share tags and redirect identify GeoGeek OVERPASS rather than official Watched',()=>{
 const html='<meta property="og:site_name" content="Watched">\n<p>Opening <a href="/">Watched</a></p>'
 const adapted=patchHtml(html)
 assert(adapted.includes('content="OVERPASS"'))
 assert(adapted.includes('>OVERPASS</a>'))
 assert(!adapted.includes('content="Watched"'))
 assert.throws(()=>patchHtml(adapted))
})
test('server-generated OG wordmark uses independent derivative name',()=>{
 const source=[
 "export const WORDMARK_PATH='a'",
 "export function wordmarkSvg(fill: string, signal = '#FF6A1A'): string {",
 "  return '<svg><path d=\"'+WORDMARK_PATH+'\"/></svg>'",
 "}"
 ].join('\n')
 const result=patchWordmark(source)
 assert(result.includes('>Overpass</text>'))
 assert(!result.includes('d="Watched"'))
 assert.throws(()=>patchWordmark(result))
})
test('browser share canvas is not the original brand glyph path',()=>{
 const source=[
 "import { WORDMARK_BOX, WORDMARK_DOT, WORDMARK_PATH } from '../../../api/_lib/wordmark'",
 'function paint(ctx) { ctx.fill(new Path2D(WORDMARK_PATH)) }'
 ].join('\n')
 const result=patchCanvasCard(source)
 assert(result.includes("ctx.fillText('Overpass', 0, 72)"))
 assert(!result.includes('new Path2D(WORDMARK_PATH)'))
 assert.throws(()=>patchCanvasCard(result))
})
