/* Water as Spectrum V10.0: scientific quantity, model and sensor contracts.
 * These are educational semi-analytical calculations, not a validated full RT solution.
 */
((root)=>{
'use strict';
const model=Object.freeze({
 id:'geogeek-water-first-order-port',version:'20261007p-formula-compatible-f32',
 type:'SEMI_ANALYTICAL',researchValidated:false,
 assumptions:Object.freeze([
  'optically deep water','Gordon/GIOP-style IOP–AOP approximation',
  'Lee-style interface approximation','first-order independent atmosphere path terms',
  'direct two-way atmospheric extinction','no fluorescence, Raman scattering, bottom or angular-depth water RT'
 ])
});
const domain=Object.freeze({wavelengthMinNm:400,wavelengthMaxNm:700,stepNm:1,temperatureC:20,salinityPsu:35});
const variables=Object.freeze({
 a:{name:'Total absorption',unit:'m^-1',kind:'IOP'},
 bb:{name:'Total backscattering',unit:'m^-1',kind:'IOP'},
 rrs:{name:'Subsurface remote-sensing reflectance',unit:'sr^-1',kind:'AOP'},
 Rrs:{name:'Above-water remote-sensing reflectance',unit:'sr^-1',kind:'AOP'},
 rho_TOA_star:{name:'First-order approximate TOA reflectance',unit:'1',kind:'SIMULATED_OBSERVATION'},
 chlor_a_OC4:{name:'OC4 empirical diagnostic estimate',unit:'mg m^-3',kind:'DIAGNOSTIC'}
});
const statuses=Object.freeze(['valid','partial','out_of_domain','missing_data','failed','not_applicable']);
function quantity(name,value,nm) {
 const v=variables[name];if(!v)throw new Error('Unknown quantity '+name);
 const inside=Number.isFinite(nm)&&nm>=400&&nm<=700;
 const status=!inside?'out_of_domain':Number.isFinite(value)?'valid':'missing_data';
 return {name,unit:v.unit,kind:v.kind,wavelengthNm:nm,value:status==='valid'?value:null,status,
  reason:status==='out_of_domain'?'V9-compatible water model is limited to 400–700 nm':status==='missing_data'?'Missing/nonfinite input':'',
  modelId:model.id,scienceModelVersion:model.version};
}
function classifyBand(b) {
 const status=b.status==='full'&&Number.isFinite(b.value)?'valid':
   b.status==='partial'?'partial':
   b.status==='out_of_model_domain'?'out_of_domain':
   b.status==='unavailable'?'missing_data':'failed';
 return {id:b.id,centerNm:b.centerNm,coverageFraction:b.coverageFraction??null,status,
  value:status==='valid'?b.value:null,
  reason:status==='out_of_domain'?'Sensor band outside the 400–700 nm water model':
         status==='partial'?'Only partial SRF coverage':
         status==='missing_data'?'Published SRF unavailable':
         status==='failed'?'No finite modeled band value':''};
}
function bandMean(wavelengths,values,weights) {
 if(!Array.isArray(wavelengths)||!Array.isArray(values)||!Array.isArray(weights)||
 wavelengths.length<2||values.length!==wavelengths.length||weights.length!==values.length)throw new Error('Inconsistent spectral arrays');
 let weighted=0,total=0;
 for(let i=1;i<wavelengths.length;i++){
  const delta=wavelengths[i]-wavelengths[i-1],w0=weights[i-1],w1=weights[i],v0=values[i-1],v1=values[i];
  if(!(delta>0)||![w0,w1,v0,v1].every(Number.isFinite)||w0<0||w1<0)throw new Error('Invalid spectral response');
  weighted+=(w0*v0+w1*v1)*delta/2;total+=(w0+w1)*delta/2;
 }
 return total>0?{status:'valid',value:weighted/total}:{status:'missing_data',value:null,reason:'Zero SRF mass'};
}
const coefficients=Object.freeze([.42540,-3.21679,2.86907,-.62628,-1.09333]);
function olciBandOC4(observation) {
 if(observation?.sensor?.id!=='olci')return {status:'not_applicable',value:null,reason:'V10.0 supports only nominal OLCI band-integrated OC4'};
 const ids=['Oa03','Oa04','Oa05','Oa06'];
 const b=ids.map(id=>observation.bands.find(x=>x.id===id));
 if(b.some(x=>!x||x.status!=='full'||!(x.value>0)))return {status:'missing_data',value:null,bandIds:ids,reason:'All four band Rrs must be positive and have complete support'};
 const logRatio=Math.log10(Math.max(b[0].value,b[1].value,b[2].value)/b[3].value);
 const value=Math.pow(10,coefficients.reduce((sum,c,i)=>sum+c*Math.pow(logRatio,i),0));
 return {status:Number.isFinite(value)?'valid':'failed',value:Number.isFinite(value)?value:null,
  algorithm:'OLCI-OC4-R2022',algorithmCoefficients:coefficients,bandIds:ids,
  inputQuantity:'sensor-band-averaged Rrs',inputUnit:'sr^-1',responseMode:observation.actualResponseMode,
  sensor:observation.sensor.label,source:'NASA OB.DAAC OC4 R2022',researchValidated:false,
  caution:'Diagnostic only. This is not a validated Level-2 chlorophyll product'};
}
const modelVariant=p=>p?.sg===.0176&&p?.snap===.0123?'V9_COMPAT_FIXED_SLOPES':'V10_EXPLORATORY_CUSTOM_SLOPES';
root.GeoGeekV10Contract=Object.freeze({appVersion:'10.0.0',model,domain,variables,statuses,
 quantity,classifyBand,bandMean,olciBandOC4,modelVariant});
})(globalThis);
