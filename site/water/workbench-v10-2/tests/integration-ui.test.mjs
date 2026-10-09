import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const repo=path.resolve(root,'../../..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const perf=fs.readFileSync(path.join(repo,'scripts/postbuild-performance.mjs'),'utf8');
const perfQa=fs.readFileSync(path.join(repo,'scripts/qa-performance.mjs'),'utf8');
const src=app.slice(app.indexOf('const __factories='),app.indexOf('</script>',app.indexOf('const __factories=')));
const req=new Function(src.replace("__require('main.js');","return __require;"))();
const critical=[
 ['water-v102-uncertainty','v102-uncertainty-views.js?v=10.2.0-p5'],
 ['water-v102-physics','v102-physics-views.js?v=10.2.0-p6a'],
 ['water-v102-atm-sensor','v102-atm-sensor-views.js?v=10.2.0-p6b'],
 ['water-v102-analysis','v102-analysis-views.js?v=10.2.0-p7']
];

test('Stage 5–7 integration retains all nine stable tab/plot contracts and schema version 8',()=>{
 const {plots}=req('core/config.js');
 assert.deepEqual(Object.keys(plots),['path','iop','atm','sensor','ac','compare','sensitivity','uncertainty','rt']);
 assert.deepEqual(plots.uncertainty.map(x=>x[0]),['summary','jacobian','correlation']);
 assert.deepEqual(plots.sensitivity.map(x=>x[0]),['derivative','delta','overlay','bands']);
 assert.deepEqual(plots.compare.map(x=>x[0]),['overlay','delta']);
 assert.match(app,/schemaVersion:8/);
 for(const module of ['workspaces/path.js','workspaces/iop.js','workspaces/atm.js','workspaces/sensor.js',
  'workspaces/ac.js','workspaces/compare.js','workspaces/sensitivity.js','workspaces/uncertainty.js','workspaces/rt.js'])
  assert.ok(req(module),'missing '+module);
});
test('Stage 5–7 all four critical external view scripts execute before inline app bundle in deployed build',()=>{
 const first=perf.indexOf('function isIntentionalSyncBootstrap('),last=perf.indexOf('function addConnectionHints(',first);
 assert.ok(first>=0&&last>first);
 const defer=new Function(perf.slice(first,last)+'return addDeferToClassicLocalScripts;')();
 const transformed=defer(app),boot=transformed.indexOf('const __factories=');
 for(const [name,asset] of critical){
  const tag='<script data-geogeek-sync-dependency="'+name+'" src="../'+asset+'"></script>';
  assert.ok(app.includes(tag),'missing explicit synchronous dependency '+name);
  assert.ok(transformed.includes(tag),'production transform deferred '+name);
  assert.ok(transformed.indexOf(tag)<boot,'boot dependency after inline entrypoint '+name);
  const filename=asset.split('?')[0];
  assert.ok(fs.existsSync(path.join(root,filename)),'missing deployed dependency source '+filename);
 }
 assert.match(defer('<script src="../noncritical.js"></script>'),/\bdefer\b/);
});
test('Stage 5–7 performance QA permits only exact named and matching local view scripts',()=>{
 const start=perfQa.indexOf('function executableScripts('),end=perfQa.indexOf('function googleFontLinks(',start);
 assert.ok(start>=0&&end>start);
 const fn=new Function("function isIntentionalSyncBootstrap(src){return /ux-preinit\\.js/.test(src)}\n"+
  perfQa.slice(start,end)+'return {accidentalBlockingLocalScripts,isDeclaredWaterV102SyncDependency};')();
 for(const [name,asset] of critical){
  const attrs=' data-geogeek-sync-dependency="'+name+'" src="../'+asset+'"';
  assert.equal(fn.isDeclaredWaterV102SyncDependency(attrs,'../'+asset),true,name);
 }
 const bad='<script data-geogeek-sync-dependency="water-v102-physics" src="../totally-unrelated.js"></script>';
 assert.equal(fn.accidentalBlockingLocalScripts(bad).length,1,'must not permit arbitrary marked scripts');
 const transformed=new Function(perf.slice(perf.indexOf('function isIntentionalSyncBootstrap('),perf.indexOf('function addConnectionHints('))+'return addDeferToClassicLocalScripts;')()(app);
 assert.equal(fn.accidentalBlockingLocalScripts(transformed).length,0,'generated app is compliant');
});
test('Stage 5–7 own presentation entrypoints do not edit upstream science modules',()=>{
 for(const [name,asset] of critical){
  const contents=fs.readFileSync(path.join(root,asset.split('?')[0]),'utf8');
  assert.ok(contents.length>1000,name);
 }
 const old=fs.readFileSync(path.join(repo,'site/water/workbench-v10-1/app/index.html'),'utf8');
 const prev=new Function(old.slice(old.indexOf('const __factories='),old.indexOf('</script>',old.indexOf('const __factories='))).replace("__require('main.js');","return __require;"))();
 const adapter=req('model/geogeek-adapter.js').geogeekAdapter,baseline=prev('model/geogeek-adapter.js').geogeekAdapter;
 const {initialParams,PSETS}=req('core/config.js');
 for(const preset of Object.values(PSETS)){
  const params={...initialParams,...preset},live=adapter.compute(params),reference=baseline.compute(params);
  for(const q of ['a','bb','rrs','subsurfaceRrs','toa','corrected'])assert.deepEqual(live[q],reference[q],q);
 }
});
