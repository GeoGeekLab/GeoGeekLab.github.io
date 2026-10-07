import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadGame() {
  const context=vm.createContext({window:{},console});
  for (const path of [
    '../../site/play/play-core.js',
    '../../site/play/light/light-content.js',
    '../../site/play/light/light-experiments.js'
  ]) {
    const source=await readFile(new URL(path,import.meta.url),'utf8');
    vm.runInContext(source,context,{filename:path});
  }
  const changes=[];
  const game=context.window.GeoPlayLightExperiments.create({
    content:context.window.GeoPlayLightContent,
    core:context.window.GeoPlay.core,
    onChange:snapshot=>changes.push(snapshot)
  });
  return {game,changes};
}

test('Light requires prediction before mechanism removal', async () => {
  const {game}=await loadGame();
  assert.equal(game.snapshot.phase,'question');
  assert.equal(game.commit(),false);
  assert.equal(game.perturb(),false);
  assert.equal(game.select('black'),true);
  assert.equal(game.commit(),true);
  assert.equal(game.snapshot.phase,'committed');
  assert.equal(game.perturb(),true);
  assert.equal(game.snapshot.phase,'revealed');
  assert.equal(game.snapshot.mechanisms.atmosphericScattering,false);
  assert.equal(game.snapshot.correct,true);
});

test('Each experiment resets the world before removing a different mechanism', async () => {
  const {game}=await loadGame();
  game.select('black'); game.commit(); game.perturb(); game.next();
  assert.equal(game.snapshot.index,1);
  assert.equal(game.snapshot.phase,'question');
  assert.deepEqual({...game.snapshot.mechanisms},{atmosphericScattering:true,waterBackscatter:true,surfaceReflection:true});

  game.select('collapse'); game.commit(); game.perturb();
  assert.equal(game.snapshot.mechanisms.waterBackscatter,false);
  assert.equal(game.snapshot.mechanisms.atmosphericScattering,true);
  assert.equal(game.snapshot.mechanisms.surfaceReflection,true);

  game.next();
  game.select('remains'); game.commit(); game.perturb();
  assert.equal(game.snapshot.mechanisms.surfaceReflection,false);
  game.next();
  assert.equal(game.snapshot.phase,'complete');
});

test('Restart restores experiment one and a normal world', async () => {
  const {game}=await loadGame();
  game.select('white'); game.commit(); game.perturb();
  assert.equal(game.snapshot.correct,false);
  game.restart();
  assert.equal(game.snapshot.index,0);
  assert.equal(game.snapshot.selection,null);
  assert.equal(game.snapshot.phase,'question');
  assert.deepEqual({...game.snapshot.mechanisms},{atmosphericScattering:true,waterBackscatter:true,surfaceReflection:true});
});
