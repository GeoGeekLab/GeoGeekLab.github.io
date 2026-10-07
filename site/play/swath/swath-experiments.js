(() => {
  'use strict';
  function create({content,core,onChange}={}) {
    if (!content?.EXPERIMENTS?.length) throw new Error('SWATH experiments require content.');
    if (!core?.createStateMachine) throw new Error('SWATH experiments require GeoPlay core.');
    const machine=core.createStateMachine({initial:'question',states:['question','committed','revealed','free']});
    let index=0,selection=null,freeConfig={...content.FREE_DEFAULT};
    const experiment=()=>content.EXPERIMENTS[index]||null;
    function snapshot(){return Object.freeze({phase:machine.state,index,total:content.EXPERIMENTS.length,experiment:experiment(),selection,correct:experiment()?selection===experiment().correct:null,freeConfig:Object.freeze({...freeConfig})});}
    const emit=meta=>onChange?.(snapshot(),meta);
    function select(id){if(machine.state!=='question'||!experiment()?.choices?.some(c=>c.id===id))return false;selection=id;emit({type:'select'});return true;}
    function commit(){if(machine.state!=='question'||!selection)return false;machine.set('committed',{type:'commit'});emit({type:'commit'});return true;}
    function perturb(){if(machine.state!=='committed')return false;machine.set('revealed',{type:'perturb'});emit({type:'perturb'});return true;}
    function next(){if(machine.state!=='revealed')return false;if(index>=content.EXPERIMENTS.length-1){machine.set('free',{type:'free'});emit({type:'free'});return true;}index+=1;selection=null;machine.set('question',{type:'next'});emit({type:'next'});return true;}
    function setFree(key,value){if(machine.state!=='free'||!(key in freeConfig))return false;freeConfig={...freeConfig,[key]:Number(value)};emit({type:'free-change',key});return true;}
    function resetFree(){if(machine.state!=='free')return false;freeConfig={...content.FREE_DEFAULT};emit({type:'free-reset'});return true;}
    function restart(){index=0;selection=null;freeConfig={...content.FREE_DEFAULT};if(machine.state!=='question')machine.set('question',{type:'restart'});emit({type:'restart'});return true;}
    return Object.freeze({get snapshot(){return snapshot();},select,commit,perturb,next,setFree,resetFree,restart});
  }
  window.GeoPlaySwathExperiments=Object.freeze({create});
})();
