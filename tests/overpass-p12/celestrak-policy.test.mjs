import {test} from 'node:test'
import assert from 'node:assert/strict'
import {fixCatalogFetcher} from '../../overpass/scripts/p12-celestrak-policy.mjs'

const upstream=[
"const UA = 'overflight-catalog-bot/1.0 (+https://github.com/dev-Armaan/satellites)'",
"async function fetchGroup(group: string) {",
"  for (let attempt = 0; attempt < 4; attempt++) {",
"    try {",
"      const res = await fetch(url, { headers: { 'user-agent': UA } })",
"      if (!res.ok) throw new Error('HTTP fail')",
"    } catch (e) {",
"      console.warn('attempt')",
"    }",
"  }",
"}",
"async function fetchRows() {",
"  for (const g of GROUPS) {",
"    try {",
"      const list = await fetchGroup(g)",
"    } catch (e) {",
"      if (g === 'active') throw e",
"      console.warn('skipping')",
"    }",
"  }",
"}"
].join('\n')
test('CelesTrak 2026 non-200 policy stops redirects, retries and further groups',()=>{
 const out=fixCatalogFetcher(upstream)
 assert(out.includes("redirect: 'manual'"))
 assert(out.includes('res.status !== 200'))
 assert(out.includes('e instanceof ProviderHttpStop) throw e'))
 assert(out.includes("e instanceof ProviderHttpStop || g === 'active'"))
 assert(!out.includes('if (!res.ok)'))
 assert.throws(()=>fixCatalogFetcher(out),'Patch cannot run twice')
})
test('Unexpected upstream changes fail closed, never silently skip provider policy',()=>{
 assert.throws(()=>fixCatalogFetcher('not the pinned source'))
})
