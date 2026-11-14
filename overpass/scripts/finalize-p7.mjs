#!/usr/bin/env node
/** Assemble an isolated true source-built site. No P6 HTML/card JS surgery. */
import assert from 'node:assert/strict'
import {cpSync,existsSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {injectReturn} from './integrate-p6.mjs'
export function checkSourceCandidate(root){
 const dist=join(root,'dist'), preview=join(root,'overpass/preview-root')
 for(const p of ['lab.html','content.js','app.js','core/site-model.js','records/lab-l17.html',
  'assets/lab/previews/overpass.jpg']){
  assert(existsSync(join(dist,p)),'P7 source-built output missing: '+p)
 }
 assert(existsSync(join(preview,'overpass/index.html')),'P7 Watched source build missing')
 const lab=readFileSync(join(dist,'lab.html'),'utf8')
 const app=readFileSync(join(dist,'app.js'),'utf8')
 const model=readFileSync(join(dist,'content.js'),'utf8')
 assert(lab.includes('data-static-lab-collection="v1"'),'Static first-paint contract missing')
 assert.equal((lab.match(/class="project-card contour-target is-actionable"/g)||[]).length,14,
  'P7 must use original GeoGeek renderer for 14 source records')
 assert(lab.includes('id="l17"') && lab.includes('data-instrument-route="/overpass/"'))
 assert(model.includes('"ref": "lab:l17"'),'Lab record not in compiled source model')
 assert(app.includes('cards.length === 14'),'First-paint app guard not source built')
 assert(!lab.includes('data-overpass-lab-card="p6"'),'P6 postbuild graft leaked into P7')
 assert(lab.includes('data-real-preview="overpass"'),'Real screenshot required')
 return {dist,preview}
}
export function assemble(root){
 const {dist,preview}=checkSourceCandidate(root)
 // OVERPASS app is staged first in preview/overpass; copy the GeoGeek
 // source-built site beside it. Source assets never replace /overpass/.
 cpSync(dist,preview,{recursive:true,force:true})
 const entry=join(preview,'overpass/index.html')
 const original=readFileSync(entry,'utf8')
 assert(!original.includes('data-overpass-return="p6"'),'Return overlay already patched')
 writeFileSync(entry,injectReturn(original))
 assert(existsSync(join(preview,'records/lab-l17.html')),'Original record builder failed to emit l17')
 console.log('P7: source-authored 14-card GeoGeek build with standalone Watched route assembled')
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 assemble(resolve(dirname(fileURLToPath(import.meta.url)),'../..'))
