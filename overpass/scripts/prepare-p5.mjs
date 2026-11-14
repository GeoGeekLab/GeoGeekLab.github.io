import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
function patch(p,a,b){
 const file=resolve(root,'overpass/upstream',p),s=readFileSync(file,'utf8')
 assert(s.includes(a) && s.split(a).length===2,'Unexpected pinned Watched source at '+p+' : '+a.slice(0,35))
 writeFileSync(file,s.replace(a,b))
}
const A='src/ui/pages/AboutPage.tsx'
patch(A,'It all runs in your browser, on public data.','The orbit calculations run in your browser, using public data.')
patch(A,'publishes them from US Space Force tracking, and we grab a fresh copy every six hours.','publishes them from US Space Force tracking. This static preview uses a fixed catalog snapshot and does not refresh its orbit data automatically.')
patch(A,"['Exact positions', 'Public orbit data is good to about a kilometre and drifts a little each day. Times can be off by a few seconds.']","['Exact positions', 'Public orbital elements give estimates, not live measurements. Position and pass-time uncertainty grow as elements age. Check the catalog timestamp above.']")
patch(A,"['What we keep', 'We count searches by town and a rough 10 km area, never your exact spot, and keep a tally of what gets opened and shared. No IP addresses, no cookies of our own, nothing that ties one visit to the next.']","['What we keep', 'This static preview has no connected search or share database. Its host and external place-search or imagery services can receive and log requests.']")
patch(A,"'Most place names come from a list built into the site. Other searches go to Open-Meteo, Photon or Nominatim. Photos load straight from the archives. Our host counts page views and speed, without cookies, and may set one security cookie to tell people from bots. We never read it.'","'Most place names come from a built-in list. Other searches go to Open-Meteo, Photon or Nominatim. Photo requests go directly to public archives. These providers may receive your IP address and requested area. GitHub Pages serves this static site.'")
patch(A,"'Only made when you share something. Anyone with the link sees the place name, a spot rounded to about 1 km, and the pass you picked.'","'This static version makes a URL with the place label, coordinates rounded to 0.01°, and optional pass details. Anyone with it can read those details. Short links and social cards need a backend.'")
patch(A,'<Credit who="Made by">','<Credit who="Original Watched by">')
patch(A,'<Credit who="Sentinel-1 / 2">','<Credit who="GeoGeek adaptation">OVERPASS integration by GeoGeek. Original Watched design and science: Armaan Gupta.</Credit>\n                <Credit who="Source and licenses"><a href="/overpass/LICENSE" target="_blank" rel="noreferrer">Original MIT license</a> · <a href="/overpass/THIRD_PARTY_NOTICES.md" target="_blank" rel="noreferrer">Third-party notices</a></Credit>\n                <Credit who="Sentinel-1 / 2">')
patch(A,'Landsat’s 15 m band from the Copernicus Data Space Ecosystem.','The original Watched service also supports 15 m Landsat pan-sharpening; static OVERPASS uses its 30 m source.')
patch(A,"                Built by{' '}","                Original by{' '}")
const P='src/ui/timelapse/Timelapse.tsx'
patch(P,'const url = timelapseLink(location.origin, place)','const url = timelapseLink(location.origin + import.meta.env.BASE_URL.slice(0, -1), place)')
patch(P,"import { WORDMARK_BOX, WORDMARK_DOT, WORDMARK_PATH } from '../../../api/_lib/wordmark'","import { WORDMARK_BOX, WORDMARK_DOT } from '../../../api/_lib/wordmark'")
patch(P,'<path d={WORDMARK_PATH} fill="currentColor" />','<text x="0" y="59.4" textLength="275" lengthAdjust="spacingAndGlyphs" fontFamily="Instrument Serif, Georgia, serif" fontSize="70" fill="currentColor">Overpass</text>')
const V='src/ui/timelapse/video.ts', tick=String.fromCharCode(96)
patch(V,'return '+tick+'watched-','return '+tick+'$'+"{(import.meta.env.BASE_URL === '/overpass/' || import.meta.env.VITE_OVERPASS_STATIC === '1') ? 'overpass' : 'watched'}-")
patch(V,'ctx.fill(a.wordmark)',"ctx.font = '66px Instrument Serif, Georgia, serif'\n  ctx.fillText('Overpass', 0, 60)")
console.log('P5 temporary source overlay applied')
