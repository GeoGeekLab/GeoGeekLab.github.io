#!/usr/bin/env node
/**
 * OVERPASS P6: register a full-page instrument in the *isolated* GeoGeek
 * static build. Do not rewrite the original 13 Lab records or their model.
 * This scoped postbuild adapter is promotion-ready for P7 source integration.
 */
import assert from 'node:assert/strict'
import {createHash} from 'node:crypto'
import {cpSync,existsSync,mkdirSync,readFileSync,writeFileSync} from 'node:fs'
import {dirname,join,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'

export const P6=Object.freeze({
 id:'l17',kind:'overpass',group:'observatory',
 route:'/overpass/',back:'/lab.html#l17',
 title:'OVERPASS',label:'SATELLITE / PASS / IMAGE',
 status:'Instrument',
 tags:['Orbit','Public imagery','7 days'],
 description:'Explore seven days of estimated satellite passes, then compare them with publicly archived imagery. A pass alone is not proof that a photo exists.',
 coord:'NORAD / SGP4 / STAC / 7 D',
 original:'Watched by Armaan Gupta · MIT',
 adaptation:'GeoGeek OVERPASS'
})

const esc=s=>String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
export function cardMarkup(previewToken='p6'){
 const m=P6
 const url=m.route+'?from=lab'
 return [
 '<article class="project-card contour-target is-actionable" id="'+m.id+'"',
 ' data-record-ref="lab:'+m.id+'" data-detail-href="'+esc(url)+'"',
 ' data-local-scale="1 : 2,500" data-local-level="RECORD" data-overpass-lab-card="p6">',
 '<div class="project-visual project-visual-overpass is-real-output" data-real-preview="overpass">',
 '<img src="/assets/lab/previews/overpass.jpg?v='+esc(previewToken)+'"',
 ' alt="Actual OVERPASS browser view showing the Earth and satellite observation results"',
 ' loading="lazy" decoding="async"></div>',
 '<div class="project-copy"><div class="project-meta"><span>'+esc(m.status)+'</span>',
 '<span>'+esc(m.tags.join(' · '))+'</span></div>',
 '<h2>'+esc(m.title)+'</h2><p>'+esc(m.description)+'</p>',
 '<div class="project-foot"><span class="lab-coord">'+esc(m.coord)+'</span>',
 '<div class="project-actions">',
 '<a class="project-cta project-link" href="/records/lab-l17.html" data-record-ref="lab:l17"',
 ' aria-label="Read OVERPASS instrument record"><span>READ RECORD</span><b>↗</b></a>',
 '<a class="lab-enter project-cta" href="'+esc(url)+'"',
 ' data-instrument-route="'+esc(m.route)+'" aria-label="Open OVERPASS instrument">',
 '<span>OPEN INSTRUMENT</span><b>↗</b></a>',
 '</div></div></div></article>'
 ].join('')
}

export function integrateLab(html,previewToken){
 assert(html.includes('data-static-lab-collection="v1"'),'Must extend the complete first-paint collection')
 assert(!html.includes('data-overpass-lab-card'),'Do not insert the instrument twice')
 assert.equal((html.match(/class="project-card contour-target is-actionable"/g)||[]).length,13,
   'Refuse to change an unexpected Lab collection')
 for(const id of ['l04','l05','l06','l10','l11','l12','l13','l07','l08','l09','l14','l15','l16']){
   assert(html.includes('id="'+id+'"'),'Existing Lab instrument missing: '+id)
 }
 const start=html.indexOf('data-group-key="observatory"')
 const next=html.indexOf('data-group-key="play"',start+1)
 assert(start>=0&&next>start,'Both Lab groups must exist')
 const region=html.slice(start,next)
 const closing=region.lastIndexOf('</div></section>')
 assert(closing>=0,'Cannot locate OBSERVATORY grid end')
 const at=start+closing
 const result=html.slice(0,at)+cardMarkup(previewToken)+'\n'+html.slice(at)
 assert.equal((result.match(/class="project-card contour-target is-actionable"/g)||[]).length,14)
 assert(result.indexOf('id="l17"')<result.indexOf('data-group-key="play"'))
 return result
}

export function patchRuntime(app,lab){
 const start=app.indexOf("const required = ['l04'")
 assert(start>=0,'GeoGeek static Lab guard changed')
 const end=app.indexOf('];',start)
 assert(end>start,'Unterminated Lab list')
 const listed=app.slice(start,end)
 assert(listed.includes("'l16'")&&!listed.includes("'l17'"),'Unexpected Lab list')
 let modified=app.slice(0,end)+", 'l17'"+app.slice(end)
 assert(modified.includes('if (cards.length === 13 && required.every'),'GeoGeek Lab count guard changed')
 modified=modified.replace('if (cards.length === 13 && required.every','if (cards.length === 14 && required.every')
 assert(lab.includes("'l16']);"),'GeoGeek Lab page list changed')
 assert(lab.includes("!card.querySelector('[data-instrument]')"),'GeoGeek Lab card route filter changed')
 let page=lab.replace("'l16']);","'l16','l17']);")
 page=page.replace("!card.querySelector('[data-instrument]')",
   "!(card.querySelector('[data-instrument]') || card.querySelector('[data-instrument-route]'))")
 // A new route is a full page, not a modal instrument.
 const anchor="if (trigger?.dataset.instrument) card.dataset.instrumentKind = trigger.dataset.instrument;"
 assert(page.includes(anchor),'GeoGeek instrument identity changed')
 page=page.replace(anchor,anchor+"\n      if (card.id === 'l17') card.dataset.instrumentKind = 'overpass';")
 return {app:modified,lab:page}
}

export function injectReturn(html){
 assert(!html.includes('data-overpass-return'),'Return navigation already injected')
 const style=[
 '<style data-overpass-return-style>',
 '.overpass-lab-return{position:fixed;z-index:32;top:calc(env(safe-area-inset-top,0px) + 16px);',
 'left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:8px;',
 'padding:8px 11px;border:1px solid rgba(236,232,224,.32);',
 'background:rgba(7,8,10,.9);color:#ece8e0;text-decoration:none;',
 'font:600 10px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:.12em;',
 'white-space:nowrap;backdrop-filter:blur(8px);}',
 '.overpass-lab-return:hover,.overpass-lab-return:focus-visible{border-color:#ff6a1a;color:#ff6a1a;outline-offset:3px;}',
 'html[data-overlay="about"] .overpass-lab-return,html[data-overlay="timelapse"] .overpass-lab-return,',
 'html[data-overlay="lightbox"] .overpass-lab-return{visibility:hidden;pointer-events:none;}',
 '@media(max-width:600px){.overpass-lab-return{font-size:9px;padding:6px 7px;letter-spacing:.08em;}}',
 '</style>'
 ].join('')
 assert(html.includes('</head>')&&/<body\b/i.test(html),'Invalid OVERPASS HTML')
 const withCss=html.replace('</head>',style+'\n</head>')
 return withCss.replace(/<body([^>]*)>/i,
  '<body$1>\n<a class="overpass-lab-return" data-overpass-return="p6" href="/lab.html#l17" aria-label="Back to GeoGeek Lab" title="Back to GeoGeek Lab">← LAB</a>')
}

export function recordPage(){
 return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'+
 '<title>OVERPASS · Instrument record — GeoGeek</title><link rel="stylesheet" href="/styles.css">'+
 '<style>body{background:#f4f2ea;color:#202322;font-family:system-ui,sans-serif;line-height:1.6}'+
 'main{max-width:800px;margin:5vh auto;padding:24px}a{color:inherit}'+
 'header{display:flex;gap:24px;flex-wrap:wrap;justify-content:space-between}'+
 'h1{font-size:clamp(48px,8vw,88px);line-height:1;margin:64px 0 24px}'+
 '.eyebrow,dt{font:600 11px ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase}'+
 'dl{display:grid;grid-template-columns:170px 1fr;gap:20px;padding:30px 0;border-top:1px solid #999}'+
 'dt{color:#555}dd{margin:0}p{max-width:70ch}footer{border-top:1px solid #999;padding:25px 0}'+
 '</style></head><body><main><header><a href="/lab.html#l17">← GEO GEEK / LAB</a>'+
 '<a href="/overpass/?from=record">OPEN OVERPASS ↗</a></header>'+
 '<p class="eyebrow" style="margin-top:54px">OBSERVATORY / ORBIT / IMAGERY</p><h1>OVERPASS</h1>'+
 '<p>Estimated satellite passes compared with real public image archives. Derived from Watched by Armaan Gupta and adapted by GeoGeek.</p>'+
 '<dl><dt>Input</dt><dd>Place coordinates · public orbital element snapshots</dd>'+
 '<dt>Orbit method</dt><dd>SGP4 propagation · seven-day retrospective search · modeled sensor reach</dd>'+
 '<dt>Evidence</dt><dd>Sentinel-2, Landsat, Sentinel-1 and NASA imagery when the archives return coverage</dd>'+
 '<dt>Limit</dt><dd>A pass does not prove a photo exists. Orbit snapshots age. The static preview does not automatically refresh its satellite catalog.</dd>'+
 '<dt>Resolution</dt><dd>Sensor-dependent; Landsat static preview uses the original 30 m data fallback instead of 15 m server pan-sharpening.</dd>'+
 '<dt>Attribution</dt><dd>Original Watched by Armaan Gupta, MIT license. Data sources retain their own attribution requirements.</dd></dl>'+
 '<footer><a href="/overpass/LICENSE">Original Watched MIT license</a> · '+
 '<a href="/overpass/THIRD_PARTY_NOTICES.md">Third-party notices</a></footer></main></body></html>'
}

async function main(){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 const host=resolve(root,'dist')
 const instrument=resolve(root,'overpass/preview-root/overpass')
 const shot=join(host,'assets/lab/previews/overpass.jpg')
 for(const file of [join(host,'lab.html'),join(host,'app.js'),join(host,'lab-page.js'),
                    join(instrument,'index.html'),shot]){
    assert(existsSync(file),'P6 input missing: '+file)
 }
 const bytes=readFileSync(shot)
 assert(bytes.length>8000&&bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff,
  'P6 requires a real captured JPEG preview')
 const token='p6-'+createHash('sha256').update(bytes).digest('hex').slice(0,12)
 const html=readFileSync(join(host,'lab.html'),'utf8')
 const app=readFileSync(join(host,'app.js'),'utf8')
 const lab=readFileSync(join(host,'lab-page.js'),'utf8')
 const adapted=patchRuntime(app,lab)
 writeFileSync(join(host,'lab.html'),integrateLab(html,token))
 writeFileSync(join(host,'app.js'),adapted.app)
 writeFileSync(join(host,'lab-page.js'),adapted.lab)
 const entry=join(instrument,'index.html')
 writeFileSync(entry,injectReturn(readFileSync(entry,'utf8')))
 const records=join(host,'records')
 mkdirSync(records,{recursive:true})
 writeFileSync(join(records,'lab-l17.html'),recordPage())
 // Copy only after the original GeoGeek host has built and passed its contracts.
 // P5 already staged the original full Watched build at preview-root/overpass/.
 const preview=resolve(root,'overpass/preview-root')
 cpSync(host,preview,{recursive:true,force:true})
 assert(existsSync(join(preview,'overpass/index.html')),'Missing OVERPASS route')
 assert(existsSync(join(preview,'lab.html')),'Missing integrated Lab page')
 console.log('P6 staged 14 Lab cards and standalone OVERPASS with return navigation: '+token)
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 main().catch(e=>{console.error(e);process.exitCode=1})
}
