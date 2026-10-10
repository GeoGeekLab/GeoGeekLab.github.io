(() => {
  'use strict';

  const D3_CDN = 'https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN = 'https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

  async function loadWorld(signal,GeoPlay,graphApi,nodes) {
    await Promise.all([
      GeoPlay.core.loadScript(D3_CDN,'d3'),
      GeoPlay.core.loadScript(TOPOJSON_CDN,'topojson')
    ]);
    const response=await fetch(WORLD_ATLAS,{signal});
    if(!response.ok) throw new Error(`world-atlas ${response.status}`);
    const topology=await response.json();
    const landEdges=graphApi.deriveLandEdges(topology,nodes,window.topojson);
    const object=topology.objects.land || topology.objects.countries;
    const land=window.topojson.feature(topology,object);
    return { land, landEdges };
  }

  async function mountConnect({signal,stage}={}) {
    const GeoPlay=window.GeoPlay;
    const content=window.GeoPlayConnectContent;
    const graphApi=window.GeoPlayConnectGraph;
    const gameApi=window.GeoPlayConnectGame;
    const viewApi=window.GeoPlayConnectView;

    if(!stage) throw new Error('Connect requires an instrument stage.');
    if(!GeoPlay?.core || !GeoPlay?.shell?.createV2 || !GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');
    if(!content?.PUZZLES?.length || !graphApi || !gameApi || !viewApi) throw new Error('Connect V2 modules incomplete.');

    GeoPlay.core.ensureStyle('play/connect/connect-v2.css?v=20261005b','connect-v2');
    GeoPlay.core.ensureStyle('play/connect/connect-desktop.css?v=20261010-step10b','connect-desktop');
    GeoPlay.core.ensureStyle('play/play-signature.css?v=20261005a','play-signature');

    let world;
    try {
      world=await loadWorld(signal,GeoPlay,graphApi,content.NODES);
    } catch(error) {
      if(!signal?.aborted) stage.innerHTML='<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return()=>{};
    }
    if(signal?.aborted) return()=>{};

    const puzzle=content.PUZZLES[0];
    const shell=GeoPlay.shell.createV2(stage,{kind:'connect',title:'CONNECT'});
    let view=null;
    let adaptTimer=null;
    let traceWritten=false;
    let game=null;

    const writeTrace=snapshot => {
      if(traceWritten || snapshot.state!=='result') return;
      traceWritten=true;
      GeoPlay.trace.append({
        play:'connect',
        trialId:puzzle.id,
        judgment:{before:snapshot.originalRoute,after:snapshot.route},
        relation:{before:puzzle.initialRule,after:puzzle.changedRule},
        result:{
          firstHops:snapshot.firstHops,
          finalHops:snapshot.finalHops,
          optimalHops:snapshot.changedBest ? snapshot.changedBest.length-1 : null
        },
        conditions:{
          before:{edgeRule:puzzle.initialRule.type},
          after:{edgeRule:puzzle.changedRule.type,maxKm:puzzle.changedRule.maxKm || null}
        },
        effect:{oldRouteValid:snapshot.oldRouteValid}
      });
    };

    const handleChange=(snapshot) => {
      view?.render(snapshot);
      writeTrace(snapshot);
      if(snapshot.state==='transforming') {
        window.clearTimeout(adaptTimer);
        const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
        adaptTimer=window.setTimeout(()=>game?.beginAdapt(),reduced?80:1450);
      }
    };

    game=gameApi.create({
      puzzle,
      nodes:content.NODES,
      landEdges:world.landEdges,
      graphApi,
      core:GeoPlay.core,
      onChange:handleChange
    });

    view=viewApi.create({
      shell,
      d3:window.d3,
      land:world.land,
      nodes:content.NODES,
      puzzle,
      graphApi,
      callbacks:{
        onNode:id=>{
          const result=game.chooseNode(id);
          if(!result.ok) view.showInvalid(result);
        },
        onUndo:()=>game.undo(),
        onLock:()=>game.lockInitialRoute(),
        onRuleChange:()=>game.changeRule(),
        onFinalLock:()=>game.lockFinalRoute(),
        onRestart:()=>{
          traceWritten=false;
          window.clearTimeout(adaptTimer);
          game.restart();
        }
      }
    });

    view.render(game.snapshot);

    return()=>{
      window.clearTimeout(adaptTimer);
      stage.innerHTML='';
    };
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.path=mountConnect;
  }

  window.GeoPlayConnect={register,mount:mountConnect};
  register();
})();