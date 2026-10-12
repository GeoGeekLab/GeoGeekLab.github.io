import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A8 submission capture is pinned to the frozen Water release',()=>{
  const script=read('scripts/capture-award-submission.mjs');
  assert.match(script,/20261011v107watercache1/);
  assert.match(script,/9718171862959c9232e1dd7b4f69d31c36b0bc75/);
  assert.match(script,/10\.2\.0-quiet2/);
  assert.match(script,/award-a3/);
  assert.match(script,/award-a5/);
});

test('A8 submission states use real controls rather than preview-only science injection',()=>{
  const script=read('scripts/capture-award-submission.mjs');
  assert.match(script,/data-tab="iop"/);
  assert.match(script,/data-tab="rt"/);
  assert.match(script,/data-tab="atm"/);
  assert.match(script,/probeRange/);
  assert.match(script,/dispatchEvent\(new Event\('input'/);
  assert.doesNotMatch(script,/GeoGeekRT101\s*=/);
  assert.doesNotMatch(script,/computeWaterOptics\(|models\.run\(/);
  assert.match(script,/injectedScientificValues:false/);
});

test('A8 captures desktop, tablet, mobile and Pulse family evidence',()=>{
  const script=read('scripts/capture-award-submission.mjs');
  assert.match(script,/width:1600,height:1000/);
  assert.match(script,/width:1024,height:900/);
  assert.match(script,/width:390,height:844/);
  assert.match(script,/instrument=pulse/);
  assert.match(script,/06-pulse-family-desktop\.png/);
});

test('A8 Lighthouse budget audits the open Water instrument',()=>{
  const config=read('lighthouserc.json');
  const summary=read('scripts/summarize-award-lighthouse.mjs');
  assert.match(config,/instrument=water/);
  assert.match(summary,/accessibilityMin:0\.95/);
  assert.match(summary,/clsMax:0\.10/);
  assert.match(summary,/performanceMin:0\.70/);
  assert.match(summary,/water-lighthouse\.json/);
});
