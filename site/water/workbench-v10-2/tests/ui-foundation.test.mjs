import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const oldRoot=path.resolve(root,'../workbench-v10-1');
const read=(base,pathName)=>fs.readFileSync(path.join(base,pathName),'utf8');
const newer=read(root,'app/index.html'),older=read(oldRoot,'app/index.html');
function modules(s){const a=s.indexOf('const __factories='),b=s.indexOf('</script>',a);assert.ok(a>=0&&b>a);return new Function(s.slice(a,b).replace("__require('main.js');","return __require;"))();}
const v102=modules(newer),v101=modules(older);
test('UX-BASE-01: all 9 scientific workspaces and plot IDs are preserved',()=>{
 const a=v102('core/config.js'),b=v101('core/config.js');
 assert.deepEqual(a.TABS.map(x=>x.id),b.TABS.map(x=>x.id));
 assert.deepEqual(a.plots,b.plots);
 assert.equal(a.TABS.length,9);
});
test('UX-BASE-02: spectral calculations stay numerically identical in four water cases',()=>{
 const cfg=v101('core/config.js');
 const a=v101('model/geogeek-adapter.js').geogeekAdapter;
 const b=v102('model/geogeek-adapter.js').geogeekAdapter;
 for(const name of ['clear','phyto','cdom','particle']){
  const p={...cfg.initialParams,...cfg.PSETS[name]};
  const old=a.compute(p),now=b.compute(p);
  for(const k of ['a','bb','rrs','subsurfaceRrs','toa','corrected'])assert.deepEqual(now[k],old[k],name+'/'+k);
 }
});
test('UX-BASE-03: RT reference asset is V10.1 pinned; no second scientific dataset',()=>{
 const loader=read(root,'rt-engine.js');
 assert.match(loader,/workbench-v10-1\/reference\/rt-reference-v1\.json/);
 assert.equal(fs.existsSync(path.join(root,'reference/rt-reference-v1.json')),false);
 assert.deepEqual(JSON.parse(read(oldRoot,'reference/rt-reference-v1.json')).cases.map(x=>x.id),['clear','phyto','cdom']);
});
test('UX-BASE-04: schema v8 remains unchanged, UI preview never claims a science version',()=>{
 assert.match(newer,/schemaVersion:8/);assert.match(newer,/appVersion:'10\.1\.0'/);
 assert.match(newer,/UI RELEASE · V10\.2/);
 assert.match(newer,/water_ui_geo_v102/);
 assert.match(newer,/V101_STORAGE_KEY='water_ui_geo_v101'/);
});
test('UX-LAYOUT-01: preview owns document scroll and disables nested chart/controls scroll',()=>{
 const css=read(root,'v102-layout.css');
 for(const part of ['.chart-main','.control-scroll','.u9-container','.rt-shell','.chart-main.path-workbench'])assert.ok(css.includes(part),part);
 assert.match(css,/overflow:visible!important/);assert.match(css,/overflow-y:auto!important/);
 assert.match(css,/data-geogeek-embedded/);
});
test('UX-ROUTE-01: default V10.2, explicit V10.1 fallback and versioned frame CSS',()=>{
 const host=read(path.resolve(root,'../../'),'core/modules.js');
 const adapter=read(root,'instrument.js'),styles=read(root,'instrument.css');
 assert.match(host,/try \{ await loadModule\(WATER_WORKBENCH_V102\)/);
 assert.match(host,/requestedWaterVersion==='v101'/);
 assert.match(adapter,/water-v102-frame/);assert.match(adapter,/GeoWaterWorkbenchV102/);
 assert.match(adapter,/GeoWaterWorkbenchV101\?\.mount/);
 assert.match(styles,/data-water-ui-version="v102"/);
});
