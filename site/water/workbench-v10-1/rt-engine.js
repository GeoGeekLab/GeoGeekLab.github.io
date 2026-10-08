/* Water as Spectrum V10.1 — immutable offline RT reference dataset reader.
 * Never manufactures fallback radiance if the dataset is unavailable.
 */
((root)=>{
 'use strict';
 const PATH='../reference/rt-reference-v1.json';
 const IDS=Object.freeze(['clear','phyto','cdom']);
 const WAVELENGTHS=Object.freeze([440,490,550,620,680]);
 const SUNS=Object.freeze([0,30,60]);
 const DEPTHS=Object.freeze([0,.5,1,2,3,5,7,10,15,20]);
 let data=null,phase='loading',problem='',pending=null;
 function validate(d){
  if(d?.schema!=='water-rt-reference-v1'||d.status!=='internally-generated-unvalidated')throw new Error('Unexpected reference schema or validation status');
  if(JSON.stringify(d.grid?.wavelengthNm)!==JSON.stringify(WAVELENGTHS)||JSON.stringify(d.grid?.sunZenithDeg)!==JSON.stringify(SUNS))throw new Error('Unsupported reference axes');
  if(!Array.isArray(d.cases)||d.cases.length!==IDS.length)throw new Error('Incomplete reference water states');
  for(const id of IDS){
   const c=d.cases.find(x=>x.id===id);if(!c||c.records.length!==WAVELENGTHS.length*SUNS.length)throw new Error('Missing RT case '+id);
   for(const r of c.records){
    if(!WAVELENGTHS.includes(r.nm)||!SUNS.includes(r.sza)||r.depths.length!==DEPTHS.length||
      ![r.a,r.bb,r.rrs,r.semiRrs].every(Number.isFinite)||r.a<=0||r.bb<0||r.rrs<0)throw new Error('Nonfinite RT reference');
    for(const key of ['Ed','Eu','Kd','Lu']){
     if(!Array.isArray(r[key])||r[key].length!==DEPTHS.length)throw new Error('Invalid reference profile '+key);
    }
   }
  }
  return d;
 }
 async function load(force=false){
  if(pending&&!force)return pending;
  phase='loading';problem='';
  pending=fetch(PATH,{cache:'force-cache'}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json()})
   .then(d=>{data=validate(d);phase='ready';problem='';return d})
   .catch(e=>{data=null;phase='error';problem=String(e?.message||e).slice(0,150);return null})
   .finally(()=>{root.dispatchEvent(new Event('geogeek:rt101-ready'));});
  return pending;
 }
 function caseData(id){return data?.cases?.find(x=>x.id===id)||null;}
 function record(id,sun,nm){return caseData(id)?.records?.find(x=>x.sza===sun&&x.nm===nm)||null;}
 function matches(params,id,sun){
  const c=caseData(id);if(!c)return false;
  return Object.entries(c.params).every(([key,v])=>Number.isFinite(params[key])&&Math.abs(params[key]-v)<=1e-10)
   &&Number.isFinite(params.sza)&&Math.abs(params.sza-sun)<=1e-10;
 }
 function snapshot(state){
  const c=caseData(state.rtCase),r=record(state.rtCase,state.rtSun,state.rtWl);
  return {status:phase,datasetSchema:data?.schema||null,referenceEngine:data?.referenceEngine||null,
   caseId:state.rtCase,szaInWaterDeg:state.rtSun,wavelengthNm:state.rtWl,depthM:state.rtDepth,
   inputParams:c?.params||null,ioPs:r?{a_m1:r.a,bb_m1:r.bb,b_m1:r.b}:null,
   numerical:r?{iterations:r.iterations,residual:r.residual}:null,
   provenance:'Self-generated scalar azimuthally averaged DOM; NOT external validated RT or field observation'};
 }
 const api={load,get status(){return phase;},get error(){return problem;},get dataset(){return data;},
   ids:IDS,wavelengths:WAVELENGTHS,suns:SUNS,depths:DEPTHS,caseData,record,matches,snapshot};
 root.GeoGeekRT101=Object.freeze(api);load();
})(globalThis);
