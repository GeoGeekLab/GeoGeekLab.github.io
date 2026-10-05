import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

async function loadConnectRuntime() {
  const context = vm.createContext({
    window: {},
    console,
    queueMicrotask,
    setTimeout,
    clearTimeout
  });

  for (const path of [
    'site/play/play-core.js',
    'site/play/connect/connect-content.js',
    'site/play/connect/connect-graph.js',
    'site/play/connect/connect-game.js'
  ]) {
    const source = await readFile(new URL(`../../${path}`, import.meta.url), 'utf8');
    vm.runInContext(source, context, { filename:path });
  }

  return context.window;
}

test('Connect graph finds the authored land-border route and the shorter distance route', async () => {
  const window = await loadConnectRuntime();
  const { NODES, PUZZLES } = window.GeoPlayConnectContent;
  const graphApi = window.GeoPlayConnectGraph;
  const puzzle = PUZZLES[0];
  const landEdges = [
    ['PT','ES'],
    ['ES','FR'],
    ['FR','DE'],
    ['DE','PL'],
    ['FR','BE'],
    ['BE','NL'],
    ['DE','NL'],
    ['DE','CZ'],
    ['CZ','PL'],
    ['FR','CH'],
    ['CH','DE'],
    ['CH','AT'],
    ['AT','DE'],
    ['AT','CZ'],
    ['AT','IT'],
    ['FR','IT']
  ];

  const borderGraph = graphApi.buildGraph({
    nodeIds:puzzle.nodes,
    nodes:NODES,
    rule:puzzle.initialRule,
    landEdges
  });
  const borderBest = graphApi.shortestPath(borderGraph,puzzle.source,puzzle.target);
  assert.deepEqual(Array.from(borderBest), ['PT','ES','FR','DE','PL']);
  assert.equal(graphApi.isValidRoute(borderGraph,borderBest), true);

  const distanceGraph = graphApi.buildGraph({
    nodeIds:puzzle.nodes,
    nodes:NODES,
    rule:puzzle.changedRule,
    landEdges
  });
  const distanceBest = graphApi.shortestPath(distanceGraph,puzzle.source,puzzle.target);
  assert.equal(distanceBest.length - 1, 3);
  assert.equal(distanceBest[0], 'PT');
  assert.equal(distanceBest.at(-1), 'PL');
});

test('Connect game enforces commit, rule change, adaptation, and final result states', async () => {
  const window = await loadConnectRuntime();
  const { NODES, PUZZLES } = window.GeoPlayConnectContent;
  const graphApi = window.GeoPlayConnectGraph;
  const puzzle = PUZZLES[0];
  const landEdges = [
    ['PT','ES'],
    ['ES','FR'],
    ['FR','DE'],
    ['DE','PL'],
    ['DE','CZ'],
    ['CZ','PL']
  ];

  const game = window.GeoPlayConnectGame.create({
    puzzle,
    nodes:NODES,
    landEdges,
    graphApi,
    core:window.GeoPlay.core
  });

  assert.equal(game.state, 'planning');
  assert.equal(game.chooseNode('DE').reason, 'INVALID_EDGE');

  for (const id of ['ES','FR','DE','PL']) assert.equal(game.chooseNode(id).ok, true);
  assert.equal(game.state, 'routeReady');
  assert.equal(game.lockInitialRoute(), true);
  assert.equal(game.state, 'locked');
  assert.equal(game.snapshot.firstHops, 4);

  assert.equal(game.changeRule(), true);
  assert.equal(game.state, 'transforming');
  assert.equal(game.beginAdapt(), true);
  assert.equal(game.state, 'adapting');

  for (const id of ['FR','DE','PL']) assert.equal(game.chooseNode(id).ok, true);
  assert.equal(game.state, 'routeReady2');
  assert.equal(game.lockFinalRoute(), true);
  assert.equal(game.state, 'result');
  assert.equal(game.snapshot.finalHops, 3);
  assert.equal(game.snapshot.changedBest.length - 1, 3);
});
