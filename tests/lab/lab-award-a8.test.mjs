import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A12 delivery release retains the frozen Water scientific baseline',()=>{
  const script=read('scripts/capture-award-submission.mjs');
  assert.match(script,/20261013a12/);
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

test('A12 captures desktop 1280, desktop 1600, Focus, Detail and Pulse evidence',()=>{
  const script=read('scripts/capture-award-submission.mjs');
  assert.match(script,/width:1600,height:1000/);
  assert.match(script,/width:1280,height:720/);
  assert.ok(script.includes('04-water-rt-desktop-1280.png'));
  assert.ok(script.includes('05-water-rt-desktop-detail.png'));
  assert.match(script,/Full-detail desktop reference geometry/);
  assert.match(script,/instrument=pulse/);
  assert.match(script,/06-pulse-family-desktop\.png/);
});

test('A8 Lighthouse budget audits the open Water instrument',()=>{
  const config=read('lighthouserc.json');
  const summary=read('scripts/summarize-award-lighthouse.mjs');
  assert.match(config,/instrument=water/);
  assert.ok(config.includes('water/workbench-v10-2/app/index.html'));
  assert.ok(summary.includes('embedded-water-v102-document'));
  assert.ok(summary.includes('hostDeepLinkAudited:true'));
  assert.ok(summary.includes('hostReports.length<2||matches.length<2'));
  assert.ok(summary.includes('(values[mid-1]+values[mid])/2'));
  assert.match(summary,/accessibilityMin:0\.95/);
  assert.match(summary,/clsMax:0\.10/);
  assert.match(summary,/performanceMin:0\.70/);
  assert.match(summary,/water-lighthouse\.json/);
});
