#!/usr/bin/env node
/**
 * OVERPASS P7. Author a reproducible candidate in the SOURCE tree, then let
 * GeoGeek's own build create the collection and record pages. This replaces
 * P6's postbuild HTML/card/JS rewriting. Run in a disposable checkout only.
 */
import assert from 'node:assert/strict'
import {copyFileSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {createHash} from 'node:crypto'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

const T=String.fromCharCode(96)
export const RECORD={
  ref:'lab:l17',kind:'lab',id:'l17',
  data:{group:'observatory',visual:'overpass',featured:false,
    instrument:'overpass',externalRoute:'/overpass/'},
  text:{en:{
    status:'Instrument',title:'OVERPASS',
    tags:['Orbit','Public imagery','7 days'],
    description:'Explore seven days of estimated satellite passes and compare them with publicly archived images. A pass alone does not prove that a photo exists.',
    coord:'NORAD / SGP4 / STAC / 7 D',
    instrumentKicker:'OVERPASS / SATELLITE / IMAGE / LIMIT',
    source:'Watched by Armaan Gupta (MIT) · CelesTrak · Sentinel · Landsat · NASA GIBS',
    detailLabel:'Record'
  }},
  relations:{trace:[]},geography:{kind:'extent',extent:[-180,-90,180,90],scope:'global'}
}
const D='$'+'{'
function once(source,needle,replacement,label){
 const first=source.indexOf(needle)
 assert(first>=0,'P7 source signature absent: '+label)
 assert(source.indexOf(needle,first+needle.length)<0,'P7 source signature duplicated: '+label)
 return source.slice(0,first)+replacement+source.slice(first+needle.length)
}
export function patchContent(source){
 assert(!source.includes('"ref": "lab:l17"'),'P7 record already in archive')
 const anchor='    {\n      "ref": "lab:l14",'
 const formatted=JSON.stringify(RECORD,null,2).split('\n').map(line=>'    '+line).join('\n')
 return once(source,anchor,formatted+',\n'+anchor,'archive record before l14')
}
export function patchPreinit(source){
 let s=once(source,"'l12', 'l13'];","'l12', 'l13', 'l17'];",'observatory collection IDs')
 s=once(s,"'world', 'water']);","'world', 'water', 'overpass']);",'observatory kinds')
 const anchor="  // Project is a first-class Play record."
 const conditions="  if (ui.lab?.conditions) ui.lab.conditions.overpass = [\n"+
  "    ['SOURCE', 'CelesTrak OMM · public image archives'],\n"+
  "    ['MODEL', 'SGP4 pass estimates; frozen catalog unless refreshed'],\n"+
  "    ['TIME', 'Last seven days relative to a validated snapshot'],\n"+
  "    ['LIMIT', 'Pass is not an image; catalog ages']\n"+
  "  ];\n\n"
 return once(s,anchor,conditions+anchor,'P7 conditions')
}
export function patchStaticCollection(source){
 let s=once(source,"'l12', 'l13'];","'l12', 'l13', 'l17'];",'static group')
 s=once(s,"import { existsSync } from 'node:fs';","import { existsSync,readFileSync } from 'node:fs';\nimport { createHash } from 'node:crypto';",'capture digest import')
 s=once(s,
  "  const detail = 'lab.html?instrument=' + encodeURIComponent(kind) + '#' + item.id;",
  "  const detail = item.externalRoute ? item.externalRoute + '?from=lab' : 'lab.html?instrument=' + encodeURIComponent(kind) + '#' + item.id;",
  'external route detail')
 const prior="  const preview = '/assets/lab/previews/' + kind + '.jpg?v=' + cacheVersion;"
 const next="  const pngFile = path.join(dist, 'assets', 'lab', 'previews', kind + '.jpg');\n"+
  "  const previewToken = kind === 'overpass' && existsSync(pngFile)\n"+
  "    ? 'p7-' + createHash('sha256').update(readFileSync(pngFile)).digest('hex').slice(0,12)\n"+
  "    : cacheVersion;\n"+
  "  const preview = '/assets/lab/previews/' + kind + '.jpg?v=' + previewToken;"
 s=once(s,prior,next,'external capture token')
 const original="    '<button class=\"lab-enter project-cta\" type=\"button\" data-instrument=\"' + esc(kind) +\n      '\" aria-label=\"Open ' + esc(title) + ' workspace\"><span>OPEN INSTRUMENT</span><b>↗</b></button>',"
 const updated="    ...(item.externalRoute ? [\n"+
  "      '<a class=\"lab-enter project-cta\" href=\"' + esc(detail) + '\" data-instrument-route=\"' + esc(item.externalRoute) + '\" aria-label=\"Open ' + esc(title) + ' instrument\"><span>OPEN INSTRUMENT</span><b>↗</b></a>'\n"+
  "    ] : [\n"+
  "      '<button class=\"lab-enter project-cta\" type=\"button\" data-instrument=\"' + esc(kind) + '\" aria-label=\"Open ' + esc(title) + ' workspace\"><span>OPEN INSTRUMENT</span><b>↗</b></button>'\n"+
  "    ]),"
 s=once(s,original,updated,'external anchor')
 s=once(s,"!== 13) {","!== 14) {",'source-level card count')
 s=once(s,"expected exactly 13 instrument cards.","expected exactly 14 instrument cards.",'assertion message')
 return s
}
export function patchApp(source){
 let s=once(source,'13 real cards.','14 real cards.','comment')
 s=once(s,"'l14', 'l15', 'l16'];","'l14', 'l15', 'l16', 'l17'];",'app required IDs')
 s=once(s,'cards.length === 13','cards.length === 14','app first-paint guard')
 const fallback="      // Malformed static markup falls back to the existing JS renderer."
 s=once(s,fallback,
  "      // Never replace the source-owned external route with a modal button.\n"+
  "      if (data.lab.some(item => item.externalRoute)) throw new Error('P7 incomplete static Lab; deployment blocked');\n"+
  fallback,'fail closed on malformed markup')
 const action="    if (kind === 'lab' && item.instrument) actions.unshift("+T+"<a class=\"record-action primary\" href=\"lab.html?instrument="+D+"encodeURIComponent(item.instrument)}#"+D+"item.id}\">"+D+"recordUI.openInstrument || 'OPEN INSTRUMENT ↗'}</a>"+T+");"
 assert(s.includes(action),'P7 record action signature absent')
 s=s.replace(action,
  "    if (kind === 'lab' && item.externalRoute) actions.unshift("+T+"<a class=\"record-action primary\" href=\""+D+"item.externalRoute}?from=record\">OPEN OVERPASS ↗</a>"+T+");\n"+
  action.replace("if (kind === 'lab' && item.instrument)","else if (kind === 'lab' && item.instrument)"))
 return s
}
export function patchLabPage(source){
 let s=once(source,"'l15','l16']);","'l15','l16','l17']);",'lab-page ids')
 s=once(s,"!card.querySelector('[data-instrument]')",
   "!(card.querySelector('[data-instrument]') || card.querySelector('[data-instrument-route]'))",
   'external card retention')
 const anchor="if (trigger?.dataset.instrument) card.dataset.instrumentKind = trigger.dataset.instrument;"
 s=once(s,anchor,anchor+"\n      if (card.id === 'l17') card.dataset.instrumentKind = 'overpass';",
  'external identity')
 return s
}
export function patchSiteModel(source){
 const anchor="    if (record.kind === 'lab' && record.item.instrument) return "
 return once(source,anchor,
   "    if (record.kind === 'lab' && record.item.externalRoute) return record.item.externalRoute + '?from=record';\n"+
   anchor,'record to external route')
}
export function patchRealPreviews(source){
 const anchor="    if (!href) return '';\n"
 return once(source,anchor,
   "    if (card.querySelector('[data-instrument-route=\"/overpass/\"]')) return 'overpass';\n"+
   anchor,'preview route recognition')
}
export function patchOptimization(source){
 let s=once(source,
  "const trigger = card.querySelector('[data-instrument]');",
  "const trigger = card.querySelector('[data-instrument]') || card.querySelector('[data-instrument-route]');",
  'card record conditions')
 s=once(s,"addConditions(card, trigger.dataset.instrument);",
   "addConditions(card, trigger.dataset.instrument || 'overpass');",
   'external conditions')
 return s
}
export function patchLabRecord(source){
 // No handwritten HTML page: GeoGeek's original record pipeline emits
 // records/lab-l17.html from the authored archive, just as for l04..l16.
 return source
}
const patches={
 'site/content.js':patchContent,
 'site/lab-copy-preinit.js':patchPreinit,
 'scripts/lab-static-collection.mjs':patchStaticCollection,
 'site/app.js':patchApp,
 'site/lab-page.js':patchLabPage,
 'site/core/site-model.js':patchSiteModel,
 'site/lab-real-previews.js':patchRealPreviews,
 'site/lab-optimization.js':patchOptimization
}
export function prepare(root){
 const screenshot=join(root,'dist/assets/lab/previews/overpass.jpg')
 const siteShot=join(root,'site/assets/lab/previews/overpass.jpg')
 assert(existsSync(screenshot),'P7 requires an actual Watched Chromium capture before host build')
 const bytes=readFileSync(screenshot)
 assert(bytes.length>8000 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff,
  'P7 screenshot is not a real JPEG')
 assert(!existsSync(siteShot),'P7 source preview cannot overwrite a prior source asset')
 mkdirSync(dirname(siteShot),{recursive:true})
 copyFileSync(screenshot,siteShot)
 const changes=[]
 for(const [rel,patch] of Object.entries(patches)){
  const file=join(root,rel),content=readFileSync(file,'utf8')
  const updated=patch(content)
  assert(updated!==content,'P7 source patch made no change: '+rel)
  writeFileSync(file,updated)
  changes.push({path:rel,before:createHash('sha256').update(content).digest('hex'),
   after:createHash('sha256').update(updated).digest('hex')})
 }
 const result={
  mode:'source-authoring-in-disposable-build-checkout',
  originalLabCards:13,candidateLabCards:14,
  addedRecord:RECORD.ref,externalRoute:RECORD.data.externalRoute,
  previewSha256:createHash('sha256').update(bytes).digest('hex'),
  originalSiteScientificModulesChanged:false,
  sourceFiles:changes
 }
 const output=join(root,'overpass/reports/p7-source-integration.json')
 mkdirSync(dirname(output),{recursive:true})
 writeFileSync(output,JSON.stringify(result,null,2)+'\n')
 console.log('P7 source-first Lab integration:',changes.length,'files · l17')
 return result
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 prepare(resolve(dirname(fileURLToPath(import.meta.url)),'../..'))
}
