import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { bootPreinit } from '../../scripts/boot-contract.mjs';

function boot() {
  const root = {dataset:{}};
  let watchdog, onError;
  const context = {document:{documentElement:root,addEventListener:(name,fn)=>{onError=fn;}},window:{},setTimeout:fn=>{watchdog=fn;return 1;},performance:{now:()=>3000},dispatchEvent:()=>{},CustomEvent:class {}};
  vm.runInNewContext(bootPreinit('paper'), context);
  return {root,context,tick:()=>watchdog(),error:()=>onError({target:{tagName:'SCRIPT',src:'https://geogeeklab.github.io/visual-readiness.js?v=3'}})};
}
test('static content recovers when the external runtime never executes', () => {
  const state=boot(); assert.equal(state.root.dataset.geogeekBoot,'loading');
  state.tick(); assert.equal(state.root.dataset.geogeekBoot,'ready');
  assert.equal(state.context.window.__GEOGEEK_VISUAL_READY__,true);
});
test('failed readiness request reveals content immediately', () => {
  const state=boot(); state.error(); assert.equal(state.root.dataset.geogeekBoot,'ready');
});
test('watchdog preserves a deliberate outgoing navigation', () => {
  const state=boot(); state.root.dataset.geogeekBoot='leaving'; state.tick();
  assert.equal(state.root.dataset.geogeekBoot,'leaving');
});
