(() => {
  'use strict';

  const EARTH_RADIUS_KM = 6371;
  const rad = value => value * Math.PI / 180;
  const edgeKey = (a,b) => [a,b].sort().join('|');

  function distanceKm(a,b) {
    const p1=rad(a.lat), p2=rad(b.lat), dp=rad(b.lat-a.lat), dl=rad(b.lon-a.lon);
    const h=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  function deriveLandEdges(topology, nodes, topojson) {
    const object = topology?.objects?.countries;
    if (!object?.geometries || !topojson?.neighbors) return [];
    const neighbors = topojson.neighbors(object.geometries);
    const byAtlasId = new Map(Object.entries(nodes).map(([code,node]) => [String(Number(node.atlasId)), code]));
    const edges = [];

    object.geometries.forEach((geometry,index) => {
      const a = byAtlasId.get(String(Number(geometry.id)));
      if (!a) return;
      neighbors[index].forEach(otherIndex => {
        if (otherIndex <= index) return;
        const b = byAtlasId.get(String(Number(object.geometries[otherIndex]?.id)));
        if (b) edges.push([a,b]);
      });
    });

    return edges;
  }

  function buildGraph({ nodeIds, nodes, rule, landEdges = [] }) {
    const allowed = new Set(nodeIds);
    const adjacency = new Map(nodeIds.map(id => [id,new Set()]));
    let edges = [];

    if (rule?.type === 'shared-border') {
      edges = landEdges.filter(([a,b]) => allowed.has(a) && allowed.has(b));
    } else if (rule?.type === 'distance') {
      const maxKm = Number(rule.maxKm || 0);
      for (let i=0;i<nodeIds.length;i++) {
        for (let j=i+1;j<nodeIds.length;j++) {
          const a=nodeIds[i], b=nodeIds[j];
          if (distanceKm(nodes[a],nodes[b]) <= maxKm) edges.push([a,b]);
        }
      }
    } else {
      throw new Error(`Unsupported Connect rule: ${rule?.type || 'unknown'}`);
    }

    const blocked = new Set(rule?.blockedEdges || []);
    edges = edges.filter(([a,b]) => !blocked.has(edgeKey(a,b)));
    edges.forEach(([a,b]) => {
      adjacency.get(a)?.add(b);
      adjacency.get(b)?.add(a);
    });

    return { adjacency, edges, rule };
  }

  function shortestPath(graph,start,target) {
    if (!graph?.adjacency?.has(start) || !graph.adjacency.has(target)) return null;
    const queue=[[start]], seen=new Set([start]);
    while(queue.length) {
      const path=queue.shift();
      const last=path[path.length-1];
      if(last===target) return path;
      for(const next of graph.adjacency.get(last)||[]) {
        if(seen.has(next)) continue;
        seen.add(next);
        queue.push([...path,next]);
      }
    }
    return null;
  }

  function isValidRoute(graph,route) {
    if (!Array.isArray(route) || route.length < 2) return false;
    for (let i=1;i<route.length;i++) {
      if (!graph.adjacency.get(route[i-1])?.has(route[i])) return false;
    }
    return true;
  }

  function edgeSet(graph) {
    return new Set((graph?.edges || []).map(([a,b]) => edgeKey(a,b)));
  }

  window.GeoPlayConnectGraph = {
    edgeKey,
    distanceKm,
    deriveLandEdges,
    buildGraph,
    shortestPath,
    isValidRoute,
    edgeSet
  };
})();