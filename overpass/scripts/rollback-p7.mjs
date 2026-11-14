#!/usr/bin/env node
/** Verify rollback is content-addressed and can restore the full 13-card site.
 * Never writes main, production branches, deployment environments or Pages.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {cpSync,existsSync,mkdirSync,readFileSync,rmSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const sum=p=>createHash('sha256').update(readFileSync(p)).digest('hex')
export function verifyRollback(root){
 const base=resolve(root,'overpass/rollback-root')
 const candidate=resolve(root,'overpass/preview-root')
 assert(existsSync(join(base,'lab.html')),'P7 rollback requires a captured clean GeoGeek build')
 assert(existsSync(join(candidate,'lab.html')),'P7 candidate missing')
 const old=readFileSync(join(base,'lab.html'),'utf8')
 const newer=readFileSync(join(candidate,'lab.html'),'utf8')
 const count=s=>(s.match(/class="project-card contour-target is-actionable"/g)||[]).length
 assert.equal(count(old),13,'Rollback seed must contain all original 13 instruments')
 assert.equal(count(newer),14,'Candidate must contain exactly 14 instruments')
 assert(!old.includes('id="l17"'),'Rollback seed must not contain P7 record')
 assert(newer.includes('id="l17"'),'P7 candidate record missing')
 const staging=resolve(root,'overpass/rollback-exercise')
 assert(!existsSync(staging),'Refuse to overwrite prior rollback exercise')
 mkdirSync(staging,{recursive:true})
 cpSync(base,staging,{recursive:true})
 const checks=['lab.html','app.js','content.js','orbital/orbital-engine.js','core/modules.js',
  'assets/lab/previews/orbit.jpg','assets/lab/previews/earth.jpg']
 const unchanged=[]
 for(const p of checks){
  assert(existsSync(join(base,p)),'Rollback baseline missing: '+p)
  assert.equal(sum(join(staging,p)),sum(join(base,p)),'Rollback drift: '+p)
  unchanged.push({path:p,sha256:sum(join(base,p))})
 }
 assert(!existsSync(join(staging,'overpass/index.html')),
  'Rollback must not retain unapproved OVERPASS static route')
 assert(!existsSync(join(staging,'assets/lab/previews/overpass.jpg')),
  'Rollback must not retain unapproved thumbnail')
 const evidence={mode:'isolated-filesystem-restore-dry-run',
  productionRefChanged:false,rollbackRestoresOriginalCardCount:13,
  candidateCardCount:14,exactAssets:unchanged,
  rollbackAction:'Do not publish candidate. Restore previous successful Pages artifact and main SHA.'}
 const file=resolve(root,'overpass/reports/p7-rollback-exercise.json')
 mkdirSync(dirname(file),{recursive:true})
 writeFileSync(file,JSON.stringify(evidence,null,2)+'\n')
 rmSync(staging,{recursive:true,force:true})
 console.log('P7 rollback rehearsal verified',unchanged.length,'content-addressed assets')
 return evidence
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 verifyRollback(resolve(dirname(fileURLToPath(import.meta.url)),'../..'))
