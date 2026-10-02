(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';
  const EARTH_RADIUS_KM = 6371;

  const NODES = {
    PT:{label:'Portugal',lat:39.5,lon:-8,atlasId:620},
    ES:{label:'Spain',lat:40.3,lon:-3.7,atlasId:724},
    FR:{label:'France',lat:46.2,lon:2.2,atlasId:250},
    DE:{label:'Germany',lat:51.1,lon:10.4,atlasId:276},
    PL:{label:'Poland',lat:52.1,lon:19.1,atlasId:616},
    BE:{label:'Belgium',lat:50.7,lon:4.6,atlasId:56},
    NL:{label:'Netherlands',lat:52.2,lon:5.3,atlasId:528},
    CH:{label:'Switzerland',lat:46.8,lon:8.2,atlasId:756},
    AT:{label:'Austria',lat:47.6,lon:14.1,atlasId:40},
    CZ:{label:'Czechia',lat:49.8,lon:15.5,atlasId:203},
    IT:{label:'Italy',lat:42.8,lon:12.6,atlasId:380},
    KE:{label:'Kenya',lat:.2,lon:37.9,atlasId:404},
    UG:{label:'Uganda',lat:1.4,lon:32.3,atlasId:800},
    TZ:{label:'Tanzania',lat:-6.3,lon:34.9,atlasId:834},
    RW:{label:'Rwanda',lat:-1.9,lon:29.9,atlasId:646},
    BI:{label:'Burundi',lat:-3.4,lon:29.9,atlasId:108},
    ET:{label:'Ethiopia',lat:9.1,lon:40.5,atlasId:231},
    SO:{label:'Somalia',lat:5.2,lon:46.2,atlasId:706},
    SS:{label:'South Sudan',lat:7.3,lon:30.2,atlasId:728},
    CD:{label:'DR Congo',lat:-2.9,lon:23.7,atlasId:180},
    SD:{label:'Sudan',lat:15.5,lon:30.2,atlasId:729}
  };

  const EUROPE = ['PT','ES','FR','DE','PL','BE','NL','CH','AT','CZ','IT'];
  const AFRICA = ['KE','UG','TZ','RW','BI','ET','SO','SS','CD','SD'];
  const TRIALS = [
    {id:'route-rule',type:'path',nodes:EUROPE,source:'PT',target:'PL',threshold:1200,title:'BUILD A PATH'},
    {id:'reachability',type:'reach',nodes:AFRICA,source:'KE',hops:2,threshold:1000,title:'REACHABLE WITHIN 2 HOPS'},
    {id:'robustness',type:'robust',nodes:EUROPE,source:'PT',target:'PL',candidates:[['FR','DE'],['DE','PL'],['CZ','PL']],title:'REMOVE ONE CONNECTION'}
  ];

  let landEdges = [];

  const rad = value => value * Math.PI / 180;
  const edgeKey = (a,b) => [a,b].sort().join('|');

  function distance(a,b) {
    const p1=rad(a.lat), p2=rad(b.lat), dp=rad(b.lat-a.lat), dl=rad(b.lon-a.lon);
    const h=Math.sin(dp/2)**2 + Math.cos(p1)*Math.cos(p2)*Math.sin(dl/2)**2;
    return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1-h));
  }

  function deriveLandEdges(topology) {
    const object = topology.objects.countries;
    if (!object?.geometries) return [];
    const neighbors = window.topojson.neighbors(object.geometries);
    const byAtlasId = new Map(Object.entries(NODES).map(([code,node]) => [String(Number(node.atlasId)), code]));
    const edges = [];
    object.geometries.forEach((geometry, index) => {
      const a = byAtlasId.get(String(Number(geometry.id)));
      if (!a) return;
      neighbors[index].forEach(otherIndex => {
        if (otherIndex <= index) return;
        const bGeometry = object.geometries[otherIndex];
        const b = byAtlasId.get(String(Number(bGeometry?.id)));
        if (b) edges.push([a,b]);
      });
    });
    return edges;
  }

  function graph(nodes, mode, threshold, removed=null) {
    const set = new Set(nodes);
    const map = new Map(nodes.map(node => [node,new Set()]));
    let edges = [];
    if (mode === 'land') {
      edges = landEdges.filter(([a,b]) => set.has(a) && set.has(b));
    } else {
      for (let i=0;i<nodes.length;i++) {
        for (let j=i+1;j<nodes.length;j++) {
          if (distance(NODES[nodes[i]],NODES[nodes[j]]) <= threshold) edges.push([nodes[i],nodes[j]]);
        }
      }
    }
    edges.forEach(([a,b]) => {
      if (removed === edgeKey(a,b)) return;
      map.get(a).add(b);
      map.get(b).add(a);
    });
    return { map, edges:edges.filter(([a,b]) => removed !== edgeKey(a,b)) };
  }

  function shortest(g,start,target) {
    const queue=[[start]], seen=new Set([start]);
    while(queue.length) {
      const path=queue.shift(), last=path[path.length-1];
      if(last===target) return path;
      for(const next of g.map.get(last)||[]) {
        if(seen.has(next)) continue;
        seen.add(next);
        queue.push([...path,next]);
      }
    }
    return null;
  }

  function within(g,start,hops) {
    const distances=new Map([[start,0]]), queue=[start];
    while(queue.length) {
      const node=queue.shift(), depth=distances.get(node);
      if(depth>=hops) continue;
      for(const next of g.map.get(node)||[]) {
        if(distances.has(next)) continue;
        distances.set(next,depth+1);
        queue.push(next);
      }
    }
    return new Set([...distances].filter(([,depth]) => depth>0 && depth<=hops).map(([node]) => node));
  }

  async function loadWorld(signal,GeoPlay) {
    await Promise.all([
      GeoPlay.core.loadScript(D3_CDN,'d3'),
      GeoPlay.core.loadScript(TOPOJSON_CDN,'topojson')
    ]);
    const response=await fetch(WORLD_ATLAS,{signal});
    if(!response.ok) throw new Error(`world-atlas ${response.status}`);
    const topology=await response.json();
    landEdges=deriveLandEdges(topology);
    const object=topology.objects.land || topology.objects.countries;
    return window.topojson.feature(topology,object);
  }

  async function mountConnect({signal,stage}={}) {
    const GeoPlay=window.GeoPlay;
    if(!GeoPlay?.core || !GeoPlay?.shell || !GeoPlay?.trace) throw new Error('GeoPlay runtime incomplete.');
    GeoPlay.core.ensureStyle('play/play.css?v=20261002c','play');

    let land;
    try { land=await loadWorld(signal,GeoPlay); }
    catch(error) {
      if(!signal?.aborted) stage.innerHTML='<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return()=>{};
    }
    if(signal?.aborted) return()=>{};

    const d3=window.d3;
    const shell=GeoPlay.shell.create(stage,{kind:'connect',triad:'NODE / EDGE / REACHABILITY'});
    const machine=GeoPlay.core.createStateMachine({initial:'observe',onChange:state=>shell.setState(state)});
    let trialIndex=0, path=[], selected=new Set(), currentGraph=null;

    function projectionFor(nodes) {
      return d3.geoMercator().fitExtent([[55,45],[745,455]],{
        type:'MultiPoint',
        coordinates:nodes.map(id=>[NODES[id].lon,NODES[id].lat])
      });
    }

    function appendEdge(svg,projection,a,b,className='connect-edge') {
      const p1=projection([NODES[a].lon,NODES[a].lat]);
      const p2=projection([NODES[b].lon,NODES[b].lat]);
      svg.append('line').attr('class',className)
        .attr('x1',p1[0]).attr('y1',p1[1]).attr('x2',p2[0]).attr('y2',p2[1]);
    }

    function renderMap({dual=false,highlight=new Set(),ghostEdges=[],signalEdges=[]}={}) {
      shell.field.innerHTML='';
      const host=document.createElement('div'); host.className=dual?'connect-dual':'connect-map-only'; shell.field.appendChild(host);
      const geo=document.createElement('div'); geo.className='connect-space'; host.appendChild(geo);
      if(dual) {
        const rel=document.createElement('div'); rel.className='connect-space connect-relational'; host.appendChild(rel);
        drawRelational(rel,ghostEdges,signalEdges);
      }

      const trial=TRIALS[trialIndex], projection=projectionFor(trial.nodes);
      const svg=d3.select(geo).append('svg').attr('viewBox','0 0 800 500').attr('class','connect-map');
      svg.append('path').datum(land).attr('class','connect-land').attr('d',d3.geoPath(projection));

      const currentKeys=new Set(currentGraph.edges.map(([a,b])=>edgeKey(a,b)));
      currentGraph.edges.forEach(([a,b]) => appendEdge(
        svg, projection, a, b,
        `connect-edge${signalEdges.includes(edgeKey(a,b))?' is-signal':''}`
      ));
      ghostEdges.filter(key=>!currentKeys.has(key)).forEach(key => {
        const [a,b]=key.split('|');
        if(NODES[a] && NODES[b]) appendEdge(svg,projection,a,b,'connect-edge is-ghost');
      });

      trial.nodes.forEach(id => {
        const point=projection([NODES[id].lon,NODES[id].lat]);
        const node=svg.append('g').attr('class','connect-node')
          .classed('is-current',path[path.length-1]===id)
          .classed('is-target',trial.target===id)
          .classed('is-selected',highlight.has(id))
          .attr('transform',`translate(${point[0]},${point[1]})`)
          .attr('tabindex',0).attr('role','button').attr('aria-label',NODES[id].label);
        node.append('circle').attr('r',7);
        node.append('text').attr('y',-11).attr('text-anchor','middle').text(id);
        node.on('click',()=>handleNode(id));
      });
      svg.append('text').attr('class','connect-space-label').attr('x',18).attr('y',28).text('GEOGRAPHIC SPACE');
    }

    function drawRelational(element,ghostEdges,signalEdges) {
      const trial=TRIALS[trialIndex];
      const svg=d3.select(element).append('svg').attr('viewBox','0 0 800 500').attr('class','connect-map');
      const columns=Math.ceil(Math.sqrt(trial.nodes.length));
      const positions=new Map();
      trial.nodes.forEach((id,index) => positions.set(id,[
        100+(index%columns)*(600/Math.max(1,columns-1)),
        105+Math.floor(index/columns)*105
      ]));
      const draw=(a,b,className) => {
        const p1=positions.get(a), p2=positions.get(b);
        if(!p1 || !p2) return;
        svg.append('line').attr('class',className)
          .attr('x1',p1[0]).attr('y1',p1[1]).attr('x2',p2[0]).attr('y2',p2[1]);
      };
      const currentKeys=new Set(currentGraph.edges.map(([a,b])=>edgeKey(a,b)));
      currentGraph.edges.forEach(([a,b]) => draw(a,b,`connect-edge${signalEdges.includes(edgeKey(a,b))?' is-signal':''}`));
      ghostEdges.filter(key=>!currentKeys.has(key)).forEach(key => draw(...key.split('|'),'connect-edge is-ghost'));
      trial.nodes.forEach(id => {
        const point=positions.get(id), node=svg.append('g').attr('class','connect-node').attr('transform',`translate(${point[0]},${point[1]})`);
        node.append('circle').attr('r',8);
        node.append('text').attr('y',-12).attr('text-anchor','middle').text(id);
      });
      svg.append('text').attr('class','connect-space-label').attr('x',18).attr('y',28).text('RELATIONAL SPACE');
    }

    function startTrial() {
      const trial=TRIALS[trialIndex];
      path=trial.type==='path'?[trial.source]:[];
      selected=new Set();
      currentGraph=graph(trial.nodes,'land');
      machine.set('judge');

      if(trial.type==='path') shell.setTask(`<div class="play-kicker">FIELD</div><div class="play-pair"><span>FROM</span><strong>${NODES[trial.source].label.toUpperCase()}</strong></div><div class="play-pair"><span>TO</span><strong>${NODES[trial.target].label.toUpperCase()}</strong></div><p>Build a path through shared land borders.</p>`);
      if(trial.type==='reach') shell.setTask(`<div class="play-kicker">FIELD</div><div class="play-pair"><span>START</span><strong>${NODES[trial.source].label.toUpperCase()}</strong></div><div class="play-pair"><span>TASK</span><strong>SELECT NODES WITHIN ${trial.hops} HOPS</strong></div><p>Make a judgment before the reachable set is revealed.</p>`);
      if(trial.type==='robust') shell.setTask('<div class="play-kicker">FIELD</div><div class="play-pair"><span>TASK</span><strong>REMOVE ONE CONNECTION</strong></div><p>Which edge can change the route without moving the places?</p>');

      shell.setConditions([
        ['NODES','COUNTRIES'],
        ['EDGE RULE','NATURAL EARTH SHARED BORDER'],
        ['PATH METRIC','HOPS'],
        ['EDGE WEIGHT','UNWEIGHTED']
      ]);
      shell.setReadout('');
      shell.setFieldNote(`RELATION ${trialIndex+1} / ${TRIALS.length} · SHARED ARCS FROM WORLD-ATLAS`);
      renderMap();

      if(trial.type==='path') shell.setActions([
        {label:'UNDO',secondary:true,onClick:()=>{if(path.length>1){path.pop();renderMap();}}},
        {label:'COMMIT PATH',disabled:true,onClick:commitPath}
      ]);
      else if(trial.type==='reach') shell.setActions([{label:'COMMIT SET',onClick:commitReach}]);
      else shell.setActions(trial.candidates.map(edge=>({label:`REMOVE ${edge[0]} — ${edge[1]}`,onClick:()=>commitRobust(edge)})));
    }

    function handleNode(id) {
      const trial=TRIALS[trialIndex];
      if(machine.state!=='judge') return;
      if(trial.type==='path') {
        const last=path[path.length-1];
        if(id===last) return;
        if(currentGraph.map.get(last)?.has(id)) {
          path.push(id);
          renderMap();
          shell.setActions([
            {label:'UNDO',secondary:true,onClick:()=>{if(path.length>1){path.pop();renderMap();}}},
            {label:'COMMIT PATH',disabled:id!==trial.target,onClick:commitPath}
          ]);
        }
      } else if(trial.type==='reach') {
        selected.has(id)?selected.delete(id):selected.add(id);
        selected.delete(trial.source);
        renderMap({highlight:selected});
      }
    }

    function commitPath() {
      const trial=TRIALS[trialIndex], best=shortest(currentGraph,trial.source,trial.target);
      machine.set('compare');
      shell.setReadout(`<div class="play-kicker">PATH</div><div class="play-metrics"><div class="play-metric"><span>YOUR PATH</span><strong>${path.length-1} HOPS</strong></div><div class="play-metric"><span>MINIMUM</span><strong>${best?best.length-1:'—'} HOPS</strong></div><div class="play-metric"><span>EXCESS</span><strong>${best?Math.max(0,path.length-best.length):'—'}</strong></div></div>`);
      shell.setActions([{label:'CHANGE THE RELATION →',onClick:()=>perturbPath(best)}]);
    }

    function perturbPath(best) {
      const trial=TRIALS[trialIndex];
      const oldEdges=new Set(currentGraph.edges.map(([a,b])=>edgeKey(a,b)));
      const oldHops=best?best.length-1:null;
      currentGraph=graph(trial.nodes,'distance',trial.threshold);
      const next=shortest(currentGraph,trial.source,trial.target);
      const newEdges=new Set(currentGraph.edges.map(([a,b])=>edgeKey(a,b)));
      const added=[...newEdges].filter(key=>!oldEdges.has(key));
      const oldPathEdges=path.slice(1).map((node,index)=>edgeKey(path[index],node));
      renderMap({dual:true,ghostEdges:oldPathEdges.filter(key=>!newEdges.has(key)),signalEdges:added});
      machine.set('perturb');
      shell.setConditions([
        ['CHANGED','EDGE RULE'],
        ['EDGE RULE',`POINT DISTANCE ≤ ${trial.threshold} KM`],
        ['POINT','REPRESENTATIVE COORDINATE'],
        ['NODES','UNCHANGED'],
        ['PATH METRIC','HOPS · UNCHANGED']
      ]);
      shell.setReadout(`<div class="play-kicker">EFFECT</div><div class="play-metrics"><div class="play-metric"><span>MINIMUM PATH</span><strong>${oldHops??'—'} → ${next?next.length-1:'UNREACHABLE'} HOPS</strong></div></div><p>THE PLACES DID NOT MOVE. THE RELATION DID.</p>`);
      GeoPlay.trace.append({play:'connect',trialId:trial.id,judgment:{path:[...path]},relation:{before:'natural-earth-land-border',after:`representative-point-distance-${trial.threshold}`},result:{oldHops,newHops:next?next.length-1:null},conditions:{before:{edgeRule:'land-border'},after:{edgeRule:'distance'}},effect:{addedEdges:added.length}});
      nextAction();
    }

    function commitReach() {
      const trial=TRIALS[trialIndex], truth=within(currentGraph,trial.source,trial.hops);
      const overlap=[...selected].filter(node=>truth.has(node)).length;
      machine.set('compare');
      renderMap({highlight:truth});
      shell.setReadout(`<div class="play-kicker">REACHABILITY</div><div class="play-metrics"><div class="play-metric"><span>JUDGMENT</span><strong>${selected.size} NODES</strong></div><div class="play-metric"><span>RELATION</span><strong>${truth.size} NODES</strong></div><div class="play-metric"><span>OVERLAP</span><strong>${overlap}</strong></div></div>`);
      shell.setActions([{label:'CHANGE THE RELATION →',onClick:()=>{
        const before=truth.size;
        currentGraph=graph(trial.nodes,'distance',trial.threshold);
        const after=within(currentGraph,trial.source,trial.hops);
        renderMap({dual:true,highlight:after});
        machine.set('perturb');
        shell.setConditions([
          ['EDGE RULE',`POINT DISTANCE ≤ ${trial.threshold} KM`],
          ['POINT','REPRESENTATIVE COORDINATE'],
          ['HORIZON',`${trial.hops} HOPS`],
          ['NODES','UNCHANGED']
        ]);
        shell.setReadout(`<div class="play-kicker">EFFECT</div><div class="play-metric"><span>REACHABLE NODES</span><strong>${before} → ${after.size}</strong></div><p>SAME PLACES. DIFFERENT RELATIONS.</p>`);
        GeoPlay.trace.append({play:'connect',trialId:trial.id,judgment:{selected:[...selected]},relation:{before:'natural-earth-land-border',after:`representative-point-distance-${trial.threshold}`},result:{before,after:after.size},conditions:{before:{edgeRule:'land-border'},after:{edgeRule:'distance'}},effect:{reachable:[before,after.size]}});
        nextAction();
      }}]);
    }

    function commitRobust(edge) {
      const trial=TRIALS[trialIndex], base=shortest(currentGraph,trial.source,trial.target), key=edgeKey(...edge);
      currentGraph=graph(trial.nodes,'land',null,key);
      const after=shortest(currentGraph,trial.source,trial.target);
      machine.set('compare');
      renderMap({dual:true,ghostEdges:[key]});
      shell.setReadout(`<div class="play-kicker">ROBUSTNESS</div><div class="play-metrics"><div class="play-metric"><span>EDGE REMOVED</span><strong>${edge.join(' — ')}</strong></div><div class="play-metric"><span>DESTINATION</span><strong>${after?'REACHABLE':'UNREACHABLE'}</strong></div><div class="play-metric"><span>MINIMUM PATH</span><strong>${base?base.length-1:'—'} → ${after?after.length-1:'—'} HOPS</strong></div></div>`);
      GeoPlay.trace.append({play:'connect',trialId:trial.id,judgment:{removed:key},relation:{before:'natural-earth-land-border',after:'land-border-minus-edge'},result:{reachable:Boolean(after)},conditions:{before:{removed:null},after:{removed:key}},effect:{hops:[base?base.length-1:null,after?after.length-1:null]}});
      nextAction();
    }

    function nextAction() {
      shell.setActions([{label:trialIndex<TRIALS.length-1?'NEXT RELATION →':'VIEW TRACE →',onClick:()=>{
        if(trialIndex<TRIALS.length-1){trialIndex++;startTrial();}
        else showTrace();
      }}]);
    }

    function showTrace() {
      machine.set('trace');
      const records=GeoPlay.trace.forPlay('connect').slice(-TRIALS.length);
      shell.field.innerHTML='<div class="play-trace-field"><div class="play-kicker">YOUR TRACE</div><strong class="play-trace-title">CONNECT</strong><p>SAME PLACES. DIFFERENT RELATIONS.</p></div>';
      shell.setTask('<div class="play-kicker">TRACE</div><div class="play-pair"><strong>NODE / EDGE / REACHABILITY</strong></div>');
      shell.setReadout(`<div class="play-metrics">${records.map(record=>`<div class="play-metric"><span>${record.trialId.toUpperCase().replaceAll('-',' ')}</span><strong>${record.effect.reachable?`${record.effect.reachable.join(' → ')} NODES`:record.effect.hops?`${record.effect.hops.join(' → ')} HOPS`:`${record.result.oldHops??'—'} → ${record.result.newHops??'—'} HOPS`}</strong></div>`).join('')}</div>`);
      shell.setConditions([['TRACE','LOCAL ONLY'],['SCORE','NONE']]);
      shell.setActions([]);
    }

    startTrial();
    return()=>{stage.innerHTML='';};
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.path=mountConnect;
  }
  window.GeoPlayConnect={register,mount:mountConnect};
  register();
})();