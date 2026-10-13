import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A10 candidate gate remains pinned to the frozen scientific baseline',()=>{
  const gate=read('scripts/verify-award-release-candidate.mjs');
  assert.match(gate,/20261013a12/);
  assert.match(gate,/9718171862959c9232e1dd7b4f69d31c36b0bc75/);
  assert.match(gate,/10\.2\.0-quiet2/);
  assert.match(gate,/award-a3/);
  assert.match(gate,/award-a5/);
  assert.match(gate,/award-a4/);
});

test('A10 requires six real-control captures and Water Lighthouse evidence',()=>{
  const gate=read('scripts/verify-award-release-candidate.mjs');
  assert.match(gate,/realControlsOnly/);
  assert.match(gate,/injectedScientificValues/);
  assert.match(gate,/frames\.length/);
  assert.match(gate,/water-lighthouse\.json/);
  assert.match(gate,/submission-review-ready/);
  assert.match(gate,/does not predict or guarantee any award-jury outcome/i);
});

test('A10 workflow verdict happens after full browser and Lighthouse gates',()=>{
  const workflow=read('.github/workflows/quality.yml');
  const browser=workflow.indexOf('Browser and accessibility baseline');
  const lighthouse=workflow.indexOf('Lighthouse baseline');
  const candidate=workflow.indexOf('Verify award release candidate');
  assert.ok(browser>=0&&lighthouse>browser&&candidate>lighthouse);
});
