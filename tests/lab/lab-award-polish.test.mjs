import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A5 loads after the A4 Observatory shell without replacing it',()=>{
  const fullpage=read('site/lab-fullpage.js');
  assert.match(fullpage,/lab-award-shell\.css\?v=a4/);
  assert.match(fullpage,/lab-award-shell\.js\?v=a4/);
  assert.match(fullpage,/lab-award-polish\.css\?v=a5/);
  assert.match(fullpage,/lab-award-polish\.js\?v=a5/);
});

test('A5 host polish is read-only and reflects existing task state',()=>{
  const js=read('site/lab-award-polish.js');
  assert.match(js,/Read-only transition coordinator/);
  assert.match(js,/data-workspace-mode/);
  assert.match(js,/data-pulse-task/);
  assert.doesNotMatch(js,/fetch\(/);
  assert.doesNotMatch(js,/localStorage\.|sessionStorage\./);
  assert.doesNotMatch(js,/\.dispatchEvent\(|\.click\(\)/);
  assert.doesNotMatch(js,/\.(?:value|checked)\s*=/);
});

test('A5 motion never scales or translates the scientific viewport',()=>{
  const css=read('site/lab-award-polish.css');
  const stageRules=css.match(/\.instrument-stage\{[^}]*\}/gs)||[];
  for(const rule of stageRules){
    assert.doesNotMatch(rule,/transform\s*:/);
    assert.doesNotMatch(rule,/translate\s*:/);
    assert.doesNotMatch(rule,/scale\s*:/);
  }
  assert.match(css,/@keyframes gg-award-stage-enter/);
  assert.match(css,/prefers-reduced-motion:reduce/);
});

test('A5 preserves tablet orientation and mobile compactness',()=>{
  const css=read('site/lab-award-polish.css');
  assert.match(css,/@media\(min-width:701px\) and \(max-width:1040px\)/);
  assert.match(css,/instrument-award-context/);
  assert.match(css,/@media\(max-width:700px\)/);
});


test('A5 preview capture waits for award layers and uses a reproducible Water state',()=>{
  const capture=read('scripts/capture-lab-previews.mjs');
  assert.match(capture,/labAwardPolish === 'a5'/);
  assert.match(capture,/dataset\.labAwardShell === 'a4'/);
  assert.match(capture,/data-water-award-concept="a3"/);
  assert.match(capture,/data-water-award-polish="a5"/);
  assert.match(capture,/data-tab="iop"/);
  assert.match(capture,/node\.value = '490'/);
  assert.match(capture,/new Event\('input'/);
});
