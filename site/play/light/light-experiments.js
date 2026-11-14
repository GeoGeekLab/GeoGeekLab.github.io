(() => {
  'use strict';

  function create({content,core,onChange}={}) {
    if (!content?.EXPERIMENTS?.length) throw new Error('Light experiments require content.');
    if (!core?.createStateMachine) throw new Error('Light experiments require GeoPlay core.');

    const machine=core.createStateMachine({
      initial:'question',
      states:['question','committed','revealed','complete']
    });
    let index=0;
    let selection=null;
    let mechanisms=normalMechanisms();
    let advancedUnlocked=false;
    let interventionId=null;
    let exploreValue=null;

    function normalMechanisms() {
      return {atmosphericScattering:true,waterBackscatter:true,surfaceReflection:true};
    }

    function experiment() { return content.EXPERIMENTS[index] || null; }

    function snapshot() {
      const current=experiment();
      return Object.freeze({
        phase:machine.state,
        index,
        total:advancedUnlocked?content.EXPERIMENTS.length:Math.min(3,content.EXPERIMENTS.length),
        advancedUnlocked,
        interventionId,
        exploreValue,
        experiment:current,
        selection,
        correct:current ? selection===current.correct : null,
        mechanisms:Object.freeze({...mechanisms})
      });
    }

    function emit(meta) { onChange?.(snapshot(),meta); }

    function select(choiceId) {
      if (machine.state!=='question') return false;
      const valid=experiment()?.choices?.some(choice=>choice.id===choiceId);
      if (!valid) return false;
      selection=choiceId;
      emit({type:'select'});
      return true;
    }

    function commit() {
      if (machine.state!=='question' || !selection) return false;
      machine.set('committed',{type:'commit'});
      emit({type:'commit'});
      return true;
    }

    function perturb() {
      if (machine.state!=='committed') return false;
      const current=experiment();
      if (current.intervention) {
        mechanisms=normalMechanisms();
        interventionId=current.intervention.id;
        exploreValue=current.intervention.defaultValue;
      } else {
        mechanisms={...normalMechanisms(),[current.mechanism]:false};
        interventionId=null;
        exploreValue=null;
      }
      machine.set('revealed',{type:'perturb'});
      emit({type:'perturb'});
      return true;
    }

    function next() {
      if (machine.state!=='revealed') return false;
      const lastIndex=advancedUnlocked?content.EXPERIMENTS.length-1:Math.min(2,content.EXPERIMENTS.length-1);
      if (index>=lastIndex) {
        machine.set('complete',{type:'complete'});
        emit({type:'complete'});
        return true;
      }
      index+=1;
      selection=null;
      mechanisms=normalMechanisms();
      interventionId=null;
      exploreValue=null;
      machine.set('question',{type:'next'});
      emit({type:'next'});
      return true;
    }

    function beginAdvanced() {
      if (machine.state!=='complete' || advancedUnlocked || content.EXPERIMENTS.length<=3) return false;
      advancedUnlocked=true;
      index=3;
      selection=null;
      mechanisms=normalMechanisms();
      interventionId=null;
      exploreValue=null;
      machine.set('question',{type:'beginAdvanced'});
      emit({type:'beginAdvanced'});
      return true;
    }

    function explore(value) {
      const config=experiment()?.intervention;
      if (machine.state!=='revealed'||!config) return false;
      const v=Number(value);
      if (!Number.isFinite(v)||v<config.min||v>config.max) return false;
      exploreValue=v;
      emit({type:'explore'});
      return true;
    }

    function restart() {
      index=0;
      selection=null;
      mechanisms=normalMechanisms();
      advancedUnlocked=false;
      interventionId=null;
      exploreValue=null;
      if (machine.state!=='question') machine.set('question',{type:'restart'});
      emit({type:'restart'});
      return true;
    }

    return Object.freeze({
      get snapshot(){return snapshot();},
      select,commit,perturb,next,beginAdvanced,explore,restart
    });
  }

  window.GeoPlayLightExperiments=Object.freeze({create});
})();
