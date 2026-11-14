#!/usr/bin/env node
/**
 * P4 temporary working-tree overlay; preserves the pinned Watched gitlink.
 * Run after P2 and before Vite production build.
 */
import assert from 'node:assert/strict'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
const upstream=resolve(root,'overpass/upstream')
function patch(path,needle,replacement){
  const file=resolve(upstream,path)
  const input=readFileSync(file,'utf8')
  assert(input.includes(needle) && input.split(needle).length===2, 'Pinned Watched source changed at '+path)
  writeFileSync(file,input.replace(needle,replacement))
}
// The deployed static GitHub Pages app has no /api/pan worker. Keep the
// existing 2,000px Landsat colour render as the high-resolution fallback.
// Preserve /api/pan code in the pinned source for future backend use.
patch('src/imagery/panUrl.ts',
  '  return panApiPath(cardUrl, t) ?',
  "  if (import.meta.env.BASE_URL === '/overpass/') return undefined\n  return panApiPath(cardUrl, t) ?"
)
// Deep links in Results/Share must reopen this instrument, not GeoGeek home.
// Do not change the Watched fallback link fields or preview rendering.
patch('src/ui/share/ShareSheet.tsx',
  "const origin = () => (typeof location !== 'undefined' ? location.origin : '')",
  "const origin = () => (typeof location !== 'undefined' ? location.origin + import.meta.env.BASE_URL.replace(/\\/$/, '') : '')"
)
console.log('Applied P4 static image and share-link compatibility overlay')
