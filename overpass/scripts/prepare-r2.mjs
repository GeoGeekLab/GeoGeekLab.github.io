import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const pathOf = p => resolve(root, 'overpass/upstream', p)
const edit = (p, oldText, newText) => {
  const file=pathOf(p), s=readFileSync(file,'utf8')
  assert(s.includes(oldText) && s.split(oldText).length===2, 'Pinned upstream mismatch: '+p+' '+oldText.slice(0,35))
  writeFileSync(file, s.replace(oldText,newText))
}
for (const config of ['vite.config.ts','vite.admin.config.ts'])
  edit(config,'defineConfig({',"defineConfig({\n  base: '/overpass/',")
const wm='src/ui/system/Wordmark.tsx'
edit(wm,"WORDMARK_ASPECT, WORDMARK_BOX, WORDMARK_DOT, WORDMARK_PATH","WORDMARK_ASPECT")
edit(wm,"title = 'Watched'","title = 'GeoGeek Overpass'")
edit(wm,"viewBox={WORDMARK_BOX.join(' ')}",'viewBox="0 0 300.51 72.54"')
edit(wm,'<path d={WORDMARK_PATH} fill="currentColor" />','<text x="0" y="59.4" textLength="275" lengthAdjust="spacingAndGlyphs" fontFamily="Instrument Serif, Georgia, serif" fontSize="70" fill="currentColor">Overpass</text>')
edit(wm,'<circle cx={WORDMARK_DOT.cx} cy={WORDMARK_DOT.cy} r={WORDMARK_DOT.r} fill="var(--signal, #FF6A1A)" />','<circle cx="291.28" cy="63" r="6.6" fill="var(--signal, #FF6A1A)" />')
const htmlFile=pathOf('index.html')
let html=readFileSync(htmlFile,'utf8')
const boot=/<svg class="bs-word"[\s\S]*?<\/svg>/
assert(boot.test(html),'Original boot wordmark missing')
html=html.replace(boot,'<svg class="bs-word" viewBox="0 0 300.51 72.54" aria-hidden="true" focusable="false"><text x="0" y="59.4" textLength="275" lengthAdjust="spacingAndGlyphs" font-family="Georgia, serif" font-size="70" fill="#ECE8E0">Overpass</text></svg>')
assert(html.includes('<title>Watched · Something watched you this week</title>'),'Original page title missing')
html=html.replace('<title>Watched · Something watched you this week</title>','<title>OVERPASS — GeoGeek Observatory</title>')
html=html.replace('content="Watched" />','content="GeoGeek" />')
html=html.replace('aria-label="Loading Watched"','aria-label="Loading Overpass"')
writeFileSync(htmlFile,html)
const hud='src/ui/hud/Hud.tsx'
edit(hud,'label="Watched"','label="GeoGeek Overpass"')
edit(hud,'aria-label="Watched, home"','aria-label="Overpass, return to start"')
edit(hud,'href="/"','href="/overpass/"')
console.log('GeoGeek visual and /overpass/ build overlay applied to temporary checkout.')
