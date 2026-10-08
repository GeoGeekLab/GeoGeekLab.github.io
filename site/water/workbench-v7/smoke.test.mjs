import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const bridge=fs.readFileSync(path.join(root,'instrument.js'),'utf8');
const loader=fs.readFileSync(path.join(root,'../../core/modules.js'),'utf8');
const lab=fs.readFileSync(path.join(root,'../../lab.html'),'utf8');
test('V7 offline workbench provides seven workspaces and sensor-band integration',()=>{
 assert.match(app,/GEOGEEK MODEL · v7/);
 assert.match(app,/band-response-panel/);
 assert.match(app,/workspaces\/sensitivity.js/);
 assert.match(app,/analysis\/band-sensitivity.js/);
 assert.match(app,/sampleSensorRrs/);
 assert.match(app,/PARTIAL/);
 assert.match(app,/path-stage-card/);
});
test('V7 instrument preserves origin and cancellation contract',()=>{
 assert.match(bridge,/event\.origin !== location\.origin/);
 assert.match(bridge,/event\.source !== frame\.contentWindow/);
 assert.match(bridge,/signal\?\.removeEventListener\('abort'/);
 assert.match(bridge,/frame\.remove\(\)/);
 assert.match(bridge,/geogeek:water-v5:ready/); // compatibility protocol
 assert.match(app,/geogeek:water-v5:ready/);
});
test('V7 production loader has three imports available as fallbacks',()=>{
 assert.match(loader,/loadModule\(WATER_WORKBENCH_V7\)/);
 assert.match(loader,/loadModule\(WATER_WORKBENCH_V6\)/);
 assert.match(loader,/loadModule\(WATER_WORKBENCH_V5\)/);
 assert.match(loader,/loadModule\(WATER_INSTRUMENT\)/);
 assert.match(lab,/core\/modules\.js\?v=20261008v7/);
});


test('V7.1 spectral chart hotfix is versioned and keeps multiseries geometry accessible',()=>{
 const chartFix=fs.readFileSync(path.join(root,'chart-fix.js'),'utf8');
 assert.match(app,/data-chart-ref/);
 assert.match(app,/__geoChartFixRegistry/);
 assert.match(app,/chart-fix\.js\?v=7\.1\.0/);
 assert.match(bridge,/chartfix/);
 assert.match(chartFix,/preserveAspectRatio','xMidYMid meet/);
 assert.match(chartFix,/getBoundingClientRect/);
 assert.match(chartFix,/pointermove/);
 assert.match(chartFix,/data-water-markers/);
 assert.match(chartFix,/data\.series\.map/);
 assert.match(lab,/core\/modules\.js\?v=20261008v7p2/);
});
