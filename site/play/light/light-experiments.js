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

    function normalMechanisms() {
      return {atmosphericScattering:true,waterBackscatter:true,surfaceReflection:true};
    }

    function experiment() { return content.EXPERIMENTS[index] || null; }

    function snapshot() {
      const current=experiment();
      return Object.freeze({
        phase:machine.state,
        index,
        total:content.EXPERIMENTS.length,
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
      mechanisms={...normalMechanisms(),[current.mechanism]:false};
      machine.set('revealed',{type:'perturb'});
      emit({type:'perturb'});
      return true;
    }

    function next() {
      if (machine.state!=='revealed') return false;
      if (index>=content.EXPERIMENTS.length-1) {
        machine.set('complete',{type:'complete'});
        emit({type:'complete'});
        return true;
      }
      index+=1;
      selection=null;
      mechanisms=normalMechanisms();
      machine.set('question',{type:'next'});
      emit({type:'next'});
      return true;
    }

    function restart() {
      index=0;
      selection=null;
      mechanisms=normalMechanisms();
      if (machine.state!=='question') machine.set('question',{type:'restart'});
      emit({type:'restart'});
      return true;
    }

    return Object.freeze({
      get snapshot(){return snapshot();},
      select,commit,perturb,next,restart
    });
  }

  window.GeoPlayLightExperiments=Object.freeze({create});
})();
