#!/usr/bin/env node
/**
 * Fail closed on ANY non-200 CelesTrak GP response. Its 2026 usage policy
 * requires machine-to-machine clients to STOP querying on non-200, including 301.
 * This runs only in a disposable checkout of the pinned upstream gitlink.
 */
import assert from 'node:assert/strict'
import {readFileSync,writeFileSync} from 'node:fs'
import {dirname,resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
const unique=(s,a,b,label)=>{
 const first=s.indexOf(a)
 assert(first>=0&&s.indexOf(a,first+a.length)===-1,'Unexpected catalog signature: '+label)
 return s.slice(0,first)+b+s.slice(first+a.length)
}
export function fixCatalogFetcher(source) {
 let s=source
 s=unique(s,
  "const UA = 'overflight-catalog-bot/1.0 (+https://github.com/dev-Armaan/satellites)'",
  "const UA = 'geogeek-overpass-catalog/1.0 (+https://github.com/GeoGeekLab/GeoGeekLab.github.io)'\n"+
  "class ProviderHttpStop extends Error { constructor(status: number) { super('CelesTrak HTTP '+status+'; stop all requests and notify operator') } }",
  'app identity and fatal HTTP error class')
 s=unique(s,
  "const res = await fetch(url, { headers: { 'user-agent': UA } })",
  "const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'manual' })",
  'no automatic redirects')
 assert(/if \(!res\.ok\) throw new Error\([^\n]+\)/.test(s),'Missing upstream non-200 status check')
 s=s.replace(/if \(!res\.ok\) throw new Error\([^\n]+\)/,
  "if (res.status !== 200) throw new ProviderHttpStop(res.status)")
 s=unique(s,
  "    } catch (e) {\n      console.warn(",
  "    } catch (e) {\n      if (e instanceof ProviderHttpStop) throw e\n      console.warn(",
  'do not retry HTTP failures')
 s=unique(s,
  "    } catch (e) {\n      if (g === 'active') throw e",
  "    } catch (e) {\n      if (e instanceof ProviderHttpStop || g === 'active') throw e",
  'do not fetch further groups after non-200')
 return s
}
export function prepare(root) {
 const path=resolve(root,'overpass/upstream/scripts/fetch-catalog.ts')
 const original=readFileSync(path,'utf8')
 const changed=fixCatalogFetcher(original)
 assert(changed!==original)
 writeFileSync(path,changed)
 return {source:'CelesTrak GP',anyNon200StopsAllGroups:true,
  redirectsNotFollowed:true,retryOnHttpError:false,productionCronActivated:false}
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..')
 console.log(JSON.stringify(prepare(root),null,2))
}
