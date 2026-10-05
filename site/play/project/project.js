(() => {
  'use strict';

  const D3_CDN='https://cdn.jsdelivr.net/npm/d3@7.9.0/dist/d3.min.js';
  const TOPOJSON_CDN='https://cdn.jsdelivr.net/npm/topojson-client@3.1.0/dist/topojson-client.min.js';
  const WORLD_ATLAS='https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/countries-110m.json';

  async function loadWorld(signal,GeoPlay) {
    await Promise.all([
      GeoPlay.core.loadScript(D3_CDN,'d3'),
      GeoPlay.core.loadScript(TOPOJSON_CDN,'topojson')
    ]);
    const response=await fetch(WORLD_ATLAS,{signal});
    if(!response.ok) throw new Error(`world-atlas ${response.status}`);
    const topology=await response.json();
    return {
      land:window.topojson.feature(topology,topology.objects.land||topology.objects.countries),
      countries:window.topojson.feature(topology,topology.objects.countries).features
    };
  }

  async function mountProject({signal,stage}={}) {
    const GeoPlay=window.GeoPlay;
    const content=window.GeoPlayProjectContent;
    const morphApi=window.GeoPlayProjectMorph;
    const viewApi=window.GeoPlayProjectView;
    if(!stage) throw new Error('Project requires an instrument stage.');
    if(!GeoPlay?.core || !GeoPlay?.shell?.createV2 || !GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');
    if(!content?.AREA_EXPERIMENT || !morphApi?.create || !viewApi?.create) throw new Error('Project V2 modules incomplete.');

    GeoPlay.core.ensureStyle('play/project/project-v2.css?v=20261005a','project-v2');

    let world;
    try {
      world=await loadWorld(signal,GeoPlay);
    } catch(error) {
      if(!signal?.aborted) stage.innerHTML='<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return()=>{};
    }
    if(signal?.aborted) return()=>{};

    const experiment=content.AREA_EXPERIMENT;
    const shell=GeoPlay.shell.createV2(stage,{kind:'project',title:'PROJECT'});
    const morph=morphApi.create({d3:window.d3,extent:[[70,70],[930,570]]});
    const view=viewApi.create({shell,d3:window.d3,world,experiment,morph});
    const states=['predicting','transforming','revealed'];
    let choice=null;
    let value=0;
    let traced=false;
    const machine=GeoPlay.core.createStateMachine({
      initial:'predicting',
      states,
      onChange:state=>shell.setState(state)
    });

    const onInput=next=>{value=Math.max(0,Math.min(1,Number(next)||0));};

    function showPrediction() {
      choice=null;
      value=0;
      traced=false;
      if(machine.state!=='predicting') machine.set('predicting');
      view.showPrediction(id=>{
        choice=id;
        value=0;
        machine.set('transforming');
        showTransform();
      });
    }

    function showTransform() {
      view.showTransform({
        choice,
        value,
        onInput,
        onReveal:()=>{
          if(value<.98) return;
          machine.set('revealed');
          showResult();
        }
      });
    }

    function writeTrace() {
      if(traced) return;
      traced=true;
      const larger=experiment.choices.reduce((best,item)=>item.areaKm2>best.areaKm2?item:best,experiment.choices[0]);
      GeoPlay.trace.append({
        play:'project',
        trialId:experiment.id,
        judgment:{choice},
        relation:{larger:larger.id},
        result:{correct:choice===larger.id},
        conditions:{before:{projection:experiment.from.id},after:{projection:experiment.to.id}},
        effect:{representation:'area',surface:'unchanged'}
      });
    }

    function showResult() {
      writeTrace();
      view.showResult({
        choice,
        value,
        onInput,
        onRestart:showPrediction
      });
    }

    showPrediction();
    return()=>{stage.innerHTML='';};
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.project=mountProject;
  }

  window.GeoPlayProject={register,mount:mountProject};
  register();
})();