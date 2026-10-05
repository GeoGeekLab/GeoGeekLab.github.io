(() => {
  'use strict';

  const STATES = [
    'planning',
    'routeReady',
    'locked',
    'transforming',
    'adapting',
    'routeReady2',
    'result'
  ];

  function create({ puzzle, nodes, landEdges, graphApi, core, onChange } = {}) {
    if (!puzzle || !nodes || !graphApi || !core) throw new Error('Connect game requires puzzle, nodes, graph API, and core.');

    const build = rule => graphApi.buildGraph({
      nodeIds:puzzle.nodes,
      nodes,
      rule,
      landEdges
    });

    let session;
    let machine;

    function resetSession() {
      const rule = puzzle.initialRule;
      const graph = build(rule);
      session = {
        rule,
        graph,
        previousGraph:null,
        route:[puzzle.source],
        originalRoute:null,
        initialBest:graphApi.shortestPath(graph,puzzle.source,puzzle.target),
        changedBest:null,
        firstHops:null,
        finalHops:null,
        oldRouteValid:null
      };
    }

    function snapshot() {
      return {
        state:machine.state,
        puzzle,
        rule:session.rule,
        graph:session.graph,
        previousGraph:session.previousGraph,
        route:[...session.route],
        originalRoute:session.originalRoute ? [...session.originalRoute] : null,
        initialBest:session.initialBest ? [...session.initialBest] : null,
        changedBest:session.changedBest ? [...session.changedBest] : null,
        firstHops:session.firstHops,
        finalHops:session.finalHops,
        oldRouteValid:session.oldRouteValid
      };
    }

    function emit(meta = null) {
      onChange?.(snapshot(),meta);
    }

    resetSession();
    machine = core.createStateMachine({
      initial:'planning',
      states:STATES,
      onChange:(next,previous,meta) => emit({ type:'state', next, previous, meta })
    });

    function setRouteState() {
      const ready = session.route[session.route.length-1] === puzzle.target;
      const next = machine.state === 'adapting' || machine.state === 'routeReady2'
        ? (ready ? 'routeReady2' : 'adapting')
        : (ready ? 'routeReady' : 'planning');
      if (next !== machine.state) machine.set(next);
      else emit({ type:'route' });
    }

    function chooseNode(id) {
      if (!['planning','routeReady','adapting','routeReady2'].includes(machine.state)) return { ok:false, reason:'LOCKED' };
      if (!puzzle.nodes.includes(id)) return { ok:false, reason:'UNKNOWN_NODE' };

      const last = session.route[session.route.length-1];
      if (id === last) return { ok:true, noop:true };

      const earlier = session.route.indexOf(id);
      if (earlier >= 0) {
        session.route = session.route.slice(0,earlier+1);
        setRouteState();
        return { ok:true, trimmed:true };
      }

      if (!session.graph.adjacency.get(last)?.has(id)) {
        return { ok:false, reason:'INVALID_EDGE', from:last, to:id };
      }

      const nextHops = session.route.length;
      if (puzzle.maxHops && nextHops > puzzle.maxHops) {
        return { ok:false, reason:'MOVE_LIMIT', from:last, to:id };
      }

      session.route.push(id);
      setRouteState();
      return { ok:true };
    }

    function undo() {
      if (!['planning','routeReady','adapting','routeReady2'].includes(machine.state)) return false;
      if (session.route.length <= 1) return false;
      session.route.pop();
      setRouteState();
      return true;
    }

    function lockInitialRoute() {
      if (machine.state !== 'routeReady') return false;
      session.originalRoute = [...session.route];
      session.firstHops = session.route.length - 1;
      machine.set('locked');
      return true;
    }

    function changeRule() {
      if (machine.state !== 'locked') return false;
      session.previousGraph = session.graph;
      session.rule = puzzle.changedRule;
      session.graph = build(session.rule);
      session.oldRouteValid = graphApi.isValidRoute(session.graph,session.originalRoute);
      session.changedBest = graphApi.shortestPath(session.graph,puzzle.source,puzzle.target);
      machine.set('transforming');
      return true;
    }

    function beginAdapt() {
      if (machine.state !== 'transforming') return false;
      session.route = [puzzle.source];
      machine.set('adapting');
      return true;
    }

    function lockFinalRoute() {
      if (machine.state !== 'routeReady2') return false;
      session.finalHops = session.route.length - 1;
      machine.set('result');
      return true;
    }

    function restart() {
      resetSession();
      if (machine.state === 'planning') emit({ type:'restart' });
      else machine.set('planning',{ restart:true });
    }

    queueMicrotask(() => emit({ type:'init' }));

    return {
      get state() { return machine.state; },
      get snapshot() { return snapshot(); },
      chooseNode,
      undo,
      lockInitialRoute,
      changeRule,
      beginAdapt,
      lockFinalRoute,
      restart
    };
  }

  window.GeoPlayConnectGame = { STATES, create };
})();