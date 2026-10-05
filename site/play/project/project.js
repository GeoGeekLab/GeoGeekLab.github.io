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
    const areaViewApi=window.GeoPlayProjectView;
    if(!stage) throw new Error('Project requires an instrument stage.');
    if(!GeoPlay?.core || !GeoPlay?.shell?.createV2 || !GeoPlay?.trace) throw new Error('GeoPlay V2 runtime incomplete.');
    if(!window.GeoPlayProjectRouteView?.create) {
      await GeoPlay.core.loadScript('play/project/project-route-view.js?v=20261005a','GeoPlayProjectRouteView');
    }
    const routeViewApi=window.GeoPlayProjectRouteView;
    if(!content?.AREA_EXPERIMENT || !content?.ROUTE_EXPERIMENT || !morphApi?.create || !areaViewApi?.create || !routeViewApi?.create) throw new Error('Project V2 modules incomplete.');

    GeoPlay.core.ensureStyle('play/project/project-v2.css?v=20261005c','project-v2');

    let world;
    try {
      world=await loadWorld(signal,GeoPlay);
    } catch(error) {
      if(!signal?.aborted) stage.innerHTML='<div class="instrument-error"><strong>FIELD UNAVAILABLE</strong><p>World geometry could not be loaded.</p></div>';
      return()=>{};
    }
    if(signal?.aborted) return()=>{};

    const d3=window.d3;
    const shell=GeoPlay.shell.createV2(stage,{kind:'project',title:'PROJECT'});
    const states=['predicting','transforming','revealed','routeDrawing','routeTransforming','routeResult'];
    const machine=GeoPlay.core.createStateMachine({initial:'predicting',states,onChange:state=>shell.setState(state)});

    const areaExperiment=content.AREA_EXPERIMENT;
    const areaMorph=morphApi.create({d3,extent:[[70,70],[930,570]]});
    const areaView=areaViewApi.create({shell,d3,world,experiment:areaExperiment,morph:areaMorph});
    let areaChoice=null;
    let areaValue=0;
    let areaTraced=false;
    let routeView=null;
    let routeValue=0;
    let routeTraced=false;

    function writeAreaTrace() {
      if(areaTraced) return;
      areaTraced=true;
      const larger=areaExperiment.choices.reduce((best,item)=>item.areaKm2>best.areaKm2?item:best,areaExperiment.choices[0]);
      GeoPlay.trace.append({
        play:'project',
        trialId:areaExperiment.id,
        judgment:{choice:areaChoice},
        relation:{larger:larger.id},
        result:{correct:areaChoice===larger.id},
        conditions:{before:{projection:areaExperiment.from.id},after:{projection:areaExperiment.to.id}},
        effect:{representation:'area',surface:'unchanged'}
      });
    }

    function showAreaPrediction() {
      areaChoice=null;
      areaValue=0;
      areaTraced=false;
      if(machine.state!=='predicting') machine.set('predicting');
      areaView.showPrediction(id=>{
        areaChoice=id;
        areaValue=0;
        machine.set('transforming');
        areaView.showTransform({
          choice:areaChoice,
          value:areaValue,
          onInput:value=>{areaValue=value;},
          onReveal:()=>{
            if(areaValue<.98) return;
            machine.set('revealed');
            writeAreaTrace();
            areaView.showResult({
              choice:areaChoice,
              value:areaValue,
              onInput:value=>{areaValue=value;},
              onRestart:showAreaPrediction,
              onNext:startRoute
            });
          }
        });
      });
    }

    function writeRouteTrace() {
      if(routeTraced || !routeView) return;
      routeTraced=true;
      const experiment=content.ROUTE_EXPERIMENT;
      GeoPlay.trace.append({
        play:'project',
        trialId:experiment.id,
        judgment:{route:routeView.getRoute()},
        relation:{type:'geodesic'},
        result:{revealed:true},
        conditions:{before:{projection:experiment.from.id},after:{projection:experiment.to.id,center:'Tokyo'}},
        effect:{representation:'route',surfaceRoute:'unchanged'}
      });
    }

    function startRoute() {
      const experiment=content.ROUTE_EXPERIMENT;
      routeValue=0;
      routeTraced=false;
      machine.set('routeDrawing');
      const routeMorph=morphApi.create({
        d3,
        extent:[[70,70],[930,570]],
        fromRaw:d3.geoMercatorRaw,
        toRaw:d3.geoAzimuthalEquidistantRaw,
        fromRotate:experiment.from.rotate,
        toRotate:experiment.to.rotate
      });
      routeView=routeViewApi.create({shell,d3,world,experiment,morph:routeMorph});
      routeView.showDraw({
        onReveal:()=>{
          if(routeView.getRoute().length<3) return;
          machine.set('routeTransforming');
          routeView.showReveal({
            onInput:value=>{routeValue=value;},
            onFinish:()=>{
              if(routeValue<.98) return;
              machine.set('routeResult');
              writeRouteTrace();
              routeView.showResult({
                onInput:value=>{routeValue=value;},
                onRestart:startRoute
              });
            }
          });
        }
      });
    }

    showAreaPrediction();
    return()=>{stage.innerHTML='';};
  }

  function register() {
    const mounts=window.GeoGeekInstrumentMounts=window.GeoGeekInstrumentMounts||{};
    mounts.project=mountProject;
  }

  window.GeoPlayProject={register,mount:mountProject};
  register();
})();