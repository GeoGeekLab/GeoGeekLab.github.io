import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
test('Six Light experiments retain three complete core stages and optional interactive extensions',async()=>{
  const context=vm.createContext({window:{},console});
  for(const file of ['play-core.js','light/light-content.js','light/light-experiments.js']){
    const source=await readFile(new URL('../../site/play/'+file,import.meta.url),'utf8');
    vm.runInContext(source,context);
  }
  const c=context.window.GeoPlayLightContent,logs=[];
  const game=context.window.GeoPlayLightExperiments.create({
    content:c,core:context.window.GeoPlay.core,onChange:(snapshot,meta)=>logs.push(meta.type)
  });
  assert.equal(c.EXPERIMENTS.length,6);
  assert.equal(game.snapshot.total,3);
  for(let i=0;i<3;i++){
    const exp=game.snapshot.experiment;
    assert.equal(game.select(exp.correct),true);
    assert.equal(game.commit(),true);
    assert.equal(game.perturb(),true);
    assert.equal(game.next(),true);
  }
  assert.equal(game.snapshot.phase,'complete');
  assert.equal(game.snapshot.advancedUnlocked,false);
  assert.equal(game.beginAdvanced(),true);
  assert.equal(game.snapshot.total,6);
  for(let i=3;i<6;i++){
    const exp=game.snapshot.experiment;
    assert.equal(game.explore(exp.intervention.min),false);
    game.select(exp.correct);game.commit();game.perturb();
    assert.equal(game.snapshot.interventionId,exp.intervention.id);
    assert.equal(game.snapshot.exploreValue,exp.intervention.defaultValue);
    assert.equal(game.explore(exp.intervention.min),true);
    assert.equal(game.snapshot.exploreValue,exp.intervention.min);
    assert.equal(game.explore(exp.intervention.max+1),false);
    game.next();
  }
  assert.equal(game.snapshot.phase,'complete');
  assert.equal(game.snapshot.advancedUnlocked,true);
  assert.ok(logs.includes('explore'));
  game.restart();
  assert.equal(game.snapshot.total,3);
  assert.equal(game.snapshot.index,0);
  assert.equal(game.snapshot.interventionId,null);
});
