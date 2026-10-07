(() => {
  'use strict';

  async function mountLight({signal,stage}={}) {
    const GeoPlay=window.GeoPlay;
    const content=window.GeoPlayLightContent;
    const physics=window.GeoPlayLightPhysics;
    const experiments=window.GeoPlayLightExperiments;
    const viewApi=window.GeoPlayLightView;

    if (!stage) throw new Error('Light requires an instrument stage.');
    if (!GeoPlay?.core || !GeoPlay?.shell?.createV2 || !GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');
    if (!content || !physics || !experiments || !viewApi) throw new Error('Light Play modules incomplete.');

    GeoPlay.core.ensureStyle('play/light/light.css?v=20261007a','light-play');
    const water=await window.GeoModules.loadModule('water/water-model.js?v=20261007a');
    if (signal?.aborted) return()=>{};
    const waterOutput=water.computeWaterOptics(content.WATER_STATE);

    const shell=GeoPlay.shell.createV2(stage,{kind:'light',title:'LIGHT'});
    let game=null;
    const traced=new Set();

    const callbacks={
      onSelect:id=>game?.select(id),
      onCommit:()=>game?.commit(),
      onPerturb:()=>game?.perturb(),
      onNext:()=>game?.next(),
      onRestart:()=>{
        traced.clear();
        game?.restart();
      }
    };
    const view=viewApi.create({shell,content,callbacks});

    function render(snapshot,meta) {
      if (signal?.aborted) return;
      const chartMode=snapshot.experiment?.chartMode || 'sky';
      const scene=physics.buildScene({waterOutput,mechanisms:snapshot.mechanisms,chartMode});
      view.render(snapshot,scene);

      if (snapshot.phase==='revealed' && snapshot.experiment && !traced.has(snapshot.experiment.id)) {
        traced.add(snapshot.experiment.id);
        GeoPlay.trace.append({
          play:'light',
          trialId:snapshot.experiment.id,
          judgment:{prediction:snapshot.selection,correct:snapshot.correct},
          relation:{mechanism:snapshot.experiment.mechanism},
          conditions:{
            before:{atmosphericScattering:true,waterBackscatter:true,surfaceReflection:true},
            after:snapshot.mechanisms
          },
          result:{
            chartMode,
            waterRrs550:waterOutput.Rrs[150],
            mechanismRemoved:true
          },
          effect:{predictionRevised:!snapshot.correct}
        });
      }
    }

    game=experiments.create({content,core:GeoPlay.core,onChange:render});
    render(game.snapshot,{type:'init'});

    return()=>{
      stage.innerHTML='';
    };
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.light=mountLight;
  }

  window.GeoPlayLight=Object.freeze({register,mount:mountLight});
  register();
})();
