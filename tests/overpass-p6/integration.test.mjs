import {test} from 'node:test'
import assert from 'node:assert/strict'
import {P6,cardMarkup,integrateLab,injectReturn,patchRuntime,recordPage} from '../../overpass/scripts/integrate-p6.mjs'
const card=(id)=>'<article class="project-card contour-target is-actionable" id="'+id+'"></article>'
const originalIds=['l04','l05','l06','l10','l11','l12','l13','l07','l08','l09','l14','l15','l16']
const fixture='<section data-static-lab-collection="v1" id="labList">'+
 '<section class="lab-group-block" data-group-key="observatory"><div class="project-grid">'+
 originalIds.slice(0,7).map(card).join('')+'</div></section>'+
 '<section class="lab-group-block" data-group-key="play"><div class="project-grid">'+
 originalIds.slice(7).map(card).join('')+'</div></section></section>'
test('P6 card has a functional same-origin full page link and real screenshot source',()=>{
 const c=cardMarkup('test-capture')
 assert(c.includes('id="l17"'))
 assert(c.includes('href="/overpass/?from=lab"'))
 assert(c.includes('data-instrument-route="/overpass/"'))
 assert(!c.includes('data-instrument="overpass"'))
 assert(c.includes('overpass.jpg?v=test-capture'))
 assert(!c.includes('<iframe'))
})
test('P6 extends 13-card static Lab without touching other IDs',()=>{
 const html=integrateLab(fixture,'capture')
 assert.equal((html.match(/class="project-card contour-target is-actionable"/g)||[]).length,14)
 for(const id of originalIds)assert(html.includes('id="'+id+'"'))
 assert(html.indexOf('id="l17"')<html.indexOf('data-group-key="play"'))
 assert.throws(()=>integrateLab(html,'capture'),/twice/)
})
test('P6 refuses to build from an incomplete or different Lab source',()=>{
 assert.throws(()=>integrateLab(fixture.replace('id="l04"','id="gone"'),'v'),/instrument missing/)
})
test('P6 runtime guard preserves the first-paint 14 cards and external navigation',()=>{
 const app="const required = ['l04','l05','l06','l10','l11','l12','l13',\n 'l07','l08','l09','l14','l15','l16'];\n if (cards.length === 13 && required.every(x=>x)) return;"
 const lab="const instrumentIds = new Set(['l04','l05','l06','l07','l08','l09','l10','l11','l12','l13','l14','l15','l16']);\n if (!instrumentIds.has(card.id) || !card.querySelector('[data-instrument]')) return;\n if (trigger?.dataset.instrument) card.dataset.instrumentKind = trigger.dataset.instrument;"
 const adapted=patchRuntime(app,lab)
 assert(adapted.app.includes('cards.length === 14'))
 assert(adapted.app.includes("'l17'"))
 assert(adapted.lab.includes("'l17'"))
 assert(adapted.lab.includes("card.querySelector('[data-instrument-route]')"))
 assert(adapted.lab.includes("card.dataset.instrumentKind = 'overpass'"))
})
test('P6 direct return link preserves Watched document and modal ownership',()=>{
 const source='<html><head><title>OVERPASS</title></head><body><div id="boot-static"></div></body></html>'
 const html=injectReturn(source)
 assert(html.includes('href="/lab.html#l17"'))
 assert(html.includes('aria-label="Back to GeoGeek Lab"'))
 assert(html.includes('html[data-overlay="about"]'))
 assert(html.includes('id="boot-static"'))
 assert.throws(()=>injectReturn(html),/already injected/)
})
test('P6 record carries original attribution, licenses and fixed-catalog caveat',()=>{
 const html=recordPage()
 assert(html.includes(P6.title))
 assert(html.includes('Armaan Gupta'))
 assert(html.includes('/overpass/LICENSE'))
 assert(html.includes('/overpass/THIRD_PARTY_NOTICES.md'))
 assert(html.includes('does not automatically refresh'))
})
