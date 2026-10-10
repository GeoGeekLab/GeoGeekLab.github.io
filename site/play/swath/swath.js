(() => {
  'use strict';
  async function mountSwath({signal,stage}={}) {
    const GeoPlay=window.GeoPlay,content=window.GeoPlaySwathContent,physics=window.GeoPlaySwathPhysics,experiments=window.GeoPlaySwathExperiments,viewApi=window.GeoPlaySwathView;
    if(!stage) throw new Error('SWATH requires an instrument stage.');
    if(!GeoPlay?.core||!GeoPlay?.shell?.createV2||!GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');
    if(!content||!physics||!experiments||!viewApi) throw new Error('SWATH modules incomplete.');
    GeoPlay.core.ensureStyle('play/swath/swath.css?v=20261007a','swath-play');
    GeoPlay.core.ensureStyle('play/swath/swath-desktop.css?v=20261010-step08b','swath-desktop');
    const shell=GeoPlay.shell.createV2(stage,{kind:'swath',title:'SWATH'});
    let game=null;const traced=new Set();
    const callbacks={onSelect:id=>game?.select(id),onCommit:()=>game?.commit(),onPerturb:()=>game?.perturb(),onNext:()=>game?.next(),onFree:(key,value)=>game?.setFree(key,value),onResetFree:()=>game?.resetFree(),onRestart:()=>{traced.clear();game?.restart();}};
    const view=viewApi.create({shell,content,physics,callbacks});
    function modelFor(snapshot){if(snapshot.phase==='free')return{current:physics.compute(snapshot.freeConfig)};return{comparison:physics.compare(snapshot.experiment.from,snapshot.experiment.to)};}
    function render(snapshot){if(signal?.aborted)return;const model=modelFor(snapshot);view.render(snapshot,model);if(snapshot.phase==='revealed'&&snapshot.experiment&&!traced.has(snapshot.experiment.id)){traced.add(snapshot.experiment.id);const c=model.comparison;GeoPlay.trace.append({play:'swath',trialId:snapshot.experiment.id,judgment:{prediction:snapshot.selection,correct:snapshot.correct},relation:{variable:snapshot.experiment.action},conditions:{before:c.before.config,after:c.after.config},result:{swathBeforeKm:c.before.swathKm,swathAfterKm:c.after.swathKm,gsdBeforeM:c.before.nadirGsdM,gsdAfterM:c.after.nadirGsdM},effect:{swathRatio:c.swathRatio,gsdRatio:c.gsdRatio,predictionRevised:!snapshot.correct}});}}
    game=experiments.create({content,core:GeoPlay.core,onChange:render});render(game.snapshot);
    return()=>{view.dispose?.();stage.innerHTML='';};
  }
  function register(){const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};mounts.swath=mountSwath;}
  window.GeoPlaySwath=Object.freeze({register,mount:mountSwath});register();
})();
