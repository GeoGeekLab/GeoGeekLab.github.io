import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read=(path)=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const contract=JSON.parse(read('docs/flow-v3/contract.json'));
const base=read('site/flow-lab.js');
const round2=read('site/flow-lab-round2.js');
const flowEntry=read('site/flow/flow-round2.js');
const polish=read('site/flow-lab-polish.js');

test('Flow V3 specification covers four non-interchangeable movement models',()=>{
  assert.equal(contract.schemaVersion,1);
  assert.equal(contract.status,'design-contract-not-runtime');
  const modes=contract.invariants.primaryModeNames;
  assert.deepEqual(modes,['field','od','trips','release']);
  assert.deepEqual(Object.keys(contract.fourModes),modes);
  const kinds=modes.map(mode=>contract.fourModes[mode].kind);
  assert.equal(new Set(kinds).size,4);
  for(const mode of modes){
    const grammar=contract.fourModes[mode];
    assert.ok(grammar.question.includes('?'));
    assert.ok(grammar.forbidden.length>=1);
    assert.ok(grammar.coreOutputs.length>=4);
    assert.ok(grammar.inputs.length>=2);
  }
});

test('the current base and Round2 preserve each of four mode entry points',()=>{
  for(const mode of contract.invariants.primaryModeNames){
    assert.ok(base.includes('data-mode="'+mode+'"'),'base tab missing: '+mode);
    assert.match(base,new RegExp('\\b'+mode+'\\s*:\\s*\\{'),'base modeMeta missing: '+mode);
    assert.match(round2,new RegExp('\\b'+mode+'\\s*:\\s*\\{'),'Round2 metadata missing: '+mode);
  }
  assert.match(round2,/flowMode:active/);
  assert.match(round2,/data-flow-jump="control"/);
  assert.match(round2,/data-flow-jump="read"/);
  assert.match(round2,/data-flow-jump="source"/);
});

test('baseline identifies model wind, pinned sample and synthetic fallback explicitly',()=>{
  assert.match(base,/loadOpenMeteo/);
  assert.match(base,/loadGFS/);
  assert.match(base,/proceduralWind/);
  assert.match(base,/Open-Meteo \/ current 10 m wind/);
  assert.match(base,/Pinned GFS surface-wind sample/);
  assert.match(base,/Synthetic fallback for interaction continuity/);
  assert.match(base,/normalized demo matrix/);
  assert.match(base,/synthetic timestamps/);
  assert.match(round2,/frozen field|frozen-field/i);
});

test('the present wind conversion uses meteorological FROM convention',()=>{
  const line=base.split('\n').find(line=>line.startsWith('function windFromDirection('));
  assert.ok(line,'legacy conversion function missing');
  const convert=new Function(line+'\nreturn windFromDirection;')();
  const close=(a,b)=>Math.abs(a-b)<1e-7;
  const west=convert(10,270);
  const north=convert(10,0);
  assert.ok(close(west[0],10)&&close(west[1],0));
  assert.ok(close(north[0],0)&&close(north[1],-10));
});

test('the V3 baseline maps the active extension chain and cleanup owners',()=>{
  assert.match(polish,/mounts\.flow = resilientMount/);
  assert.match(round2,/window\.addEventListener\('pagehide'/);
  assert.match(flowEntry,/tripTimer = controlledTripPlaying \? setInterval/);
  assert.match(flowEntry,/stage\?\._flowRound2Cleanup\?\.\(\)/);
  assert.match(base,/cancelAnimationFrame\(raf\)/);
  assert.match(base,/resizer\?\.disconnect\(\)/);
});

test('acceptance targets are measurable and do not imply Stage 1 repairs',()=>{
  const {uiTargets,stageGates}=contract;
  assert.ok(uiTargets.mapControlOverlayFractionMax>0&&uiTargets.mapControlOverlayFractionMax<=0.10);
  assert.equal(uiTargets.tooltipCollisionPixelsMax,0);
  assert.ok(uiTargets.touchTargetMinCssPx>=44);
  assert.equal(Object.keys(stageGates).length,7);
  assert.ok(stageGates.stage7.some(x=>x.includes('merged')));
});

// These are documented release blockers, not hidden assertions of correctness.
// Stage 2 replaces each TODO with a deterministic production-code test.
test.todo('FLOW-P0-01: respawn and antimeridian changes never draw streaks');
test.todo('FLOW-P0-02: simulation time advances in seconds independent of rendered FPS');
test.todo('FLOW-P0-03: out-of-domain wind requests return invalid, not poleward clamp');
test.todo('FLOW-P0-04: one authoritative controller governs all playback modes');
