import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../../..');
const performance=fs.readFileSync(path.join(root,'scripts/postbuild-performance.mjs'),'utf8');
const app=fs.readFileSync(path.join(root,'site/water/workbench-v10-2/app/index.html'),'utf8');
const first=performance.indexOf('function isIntentionalSyncBootstrap(');
const last=performance.indexOf('function addConnectionHints(',first);
assert.ok(first>=0&&last>first,'postbuild script transform definition exists');
const transform=new Function(performance.slice(first,last)+'return addDeferToClassicLocalScripts;')();

test('P0 #148: V10.2 physics dependency runs before inline app boot, including after production build',()=>{
 const tag='<script data-geogeek-sync-dependency="water-v102-physics" src="../v102-physics-views.js?v=10.2.0-p6a"></script>';
 assert.ok(app.includes(tag),'the boot-critical dependency is declared explicitly');
 const scriptPos=app.indexOf(tag);
 const inlinePos=app.indexOf('const __factories=');
 assert.ok(scriptPos>0&&scriptPos<inlinePos,'physics dependency comes before the inline model/workbench entrypoint');
 const transformed=transform(app);
 assert.ok(transformed.includes(tag),'production transform preserves synchronous dependency without defer/async');
 assert.ok(transformed.indexOf(tag)<transformed.indexOf('const __factories='),'runtime ordering stays valid');
});
test('P0 #148: opt-out only affects explicit critical dependencies, not general performance deferral',()=>{
 const normal='<script src="./idle-widget.js"></script>';
 assert.equal(transform(normal),'<script src="./idle-widget.js" defer></script>');
 const critical='<script src="./critical.js" data-geogeek-sync-dependency="water-test"></script>';
 assert.equal(transform(critical),critical);
 const module='<script type="module" src="./module.js"></script>';
 assert.equal(transform(module),module);
});
