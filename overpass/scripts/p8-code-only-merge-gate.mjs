#!/usr/bin/env node
/** A code-only merge cannot silently activate an unapproved public feature. */
import assert from 'node:assert/strict'
import {readFileSync,existsSync} from 'node:fs'
import {dirname,resolve,join} from 'node:path'
import {fileURLToPath} from 'node:url'
export function assertCodeOnly({pages,content,labHtml,submodule,approvals,refreshWorkflow}){
 assert(pages.includes('branches: [main]'),'Existing GeoGeek deployment trigger missing')
 assert(!pages.includes('prepare-p7-source.mjs'),'Default Pages cannot activate the P7 candidate')
 assert(!pages.includes('overpass/preview-root'),'Default Pages cannot silently deploy OVERPASS')
 assert(!/(^|\n)\s*schedule\s*:/.test(refreshWorkflow),'Catalog cron cannot activate on main without approval')
 assert(!content.includes('"ref": "lab:l17"'),'Unapproved l17 was added to production source')
 assert(!labHtml.includes('data-overpass-lab-card="p6"'),'P6 postbuild graft leaked')
 assert(!labHtml.includes('id="l17"'),'Unapproved Lab card already exists')
 assert(submodule.includes('overpass/upstream')&&submodule.includes('dev-Armaan/satellites'),'Pinned original source missing')
 assert(!approvals,'Code-only merge cannot impersonate a release sign-off')
 return {codeMergeEligible:true,productionFeatureEnabled:false,existingLabCards:13}
}
export function main(root){
 const read=p=>readFileSync(join(root,p),'utf8')
 const v=assertCodeOnly({pages:read('.github/workflows/pages.yml'),content:read('site/content.js'),
  labHtml:read('site/lab.html'),submodule:read('.gitmodules'),refreshWorkflow:read('.github/workflows/overpass-p7-catalog.yml'),
  approvals:existsSync(join(root,'overpass/approvals/production.json'))})
 console.log(JSON.stringify({proof:'p8-code-only-merge-gate-v1',...v},null,2))
 return v
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))
 main(resolve(dirname(fileURLToPath(import.meta.url)),'../..'))
