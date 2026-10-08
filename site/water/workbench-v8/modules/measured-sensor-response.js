// V8 measured sensor response integration. No analytic SRF reconstruction.
// Published 1-nm measurements are pinned to source Git blob identifiers.
const {sampleSensorSpectrum} = require("model/upstream/sensor-observation.js");
const {WATER_SENSOR_DEFINITIONS} = require("model/upstream/sensor-data.js");
const PLATFORM_BY_SENSOR={ 's2-msi':['s2a','s2b'], 'landsat-oli':['oli8'] };
const BAND_BY_SENSOR={ 's2-msi':{B01:null,B02:'B02',B03:'B03',B04:'B04'},
 'landsat-oli':{B1:'B1',B2:'B2',B3:'B3',B4:'B4'} };
const MEASURED_FRACTION_TOLERANCE=1e-6;
function dataset(){return globalThis.GeoGeekMeasuredSRFData||null;}
function supportsMeasured(sensorId){return Boolean(PLATFORM_BY_SENSOR[sensorId]&&dataset()?.data);}
function resolvedPlatform(sensorId,platform='s2a'){
 if(sensorId==='landsat-oli')return 'oli8';
 return platform==='s2b'?'s2b':'s2a';
}
function getMeasuredBand(sensorId,id,platform='s2a'){
 const name=BAND_BY_SENSOR[sensorId]?.[id],data=dataset();
 return name?data?.data?.[resolvedPlatform(sensorId,platform)]?.bands?.[name]||null:null;
}
function integrateMeasured(wavelengths,values,profile){
 if(!profile)return {value:null,status:'unavailable',coverageFraction:null,supportNm:null};
 if(wavelengths.length!==values.length||wavelengths.length<2)throw new Error('Invalid input spectrum');
 for(let i=0;i<wavelengths.length;i++){
  if(!Number.isFinite(wavelengths[i])||!Number.isFinite(values[i])||(i&&wavelengths[i]<=wavelengths[i-1]))throw new Error('Invalid wavelength or reflectance');
 }
 const start=profile.startNm,response=profile.relativeResponse;
 const stop=start+response.length-1;
 const total=profile.fullResponseMass;
 let mass=0,weighted=0;
 // SRF table is sampled at integer nm. Spectrum may use a different grid: linear interpolation.
 function interp(nm){
  if(nm<wavelengths[0]||nm>wavelengths.at(-1))return null;
  let lo=0,hi=wavelengths.length-1;
  while(hi-lo>1){const mid=(lo+hi)>>1;if(wavelengths[mid]<nm)lo=mid;else hi=mid;}
  const t=(nm-wavelengths[lo])/(wavelengths[hi]-wavelengths[lo]);
  return values[lo]*(1-t)+values[hi]*t;
 }
 for(let j=0;j<response.length-1;j++){
  const x0=start+j,x1=x0+1,a=response[j],b=response[j+1];
  if(x0<wavelengths[0]||x1>wavelengths.at(-1))continue;
  const v0=interp(x0),v1=interp(x1);
  mass+=(a+b)*.5;
  weighted+=(a*v0+b*v1)*.5;
 }
 const fraction=Math.min(1,Math.max(0,mass/total));
 const status=fraction>=1-MEASURED_FRACTION_TOLERANCE?'full':'partial';
 return {value:status==='full'?weighted/mass:null,status,coverageFraction:fraction,
  supportNm:[start,stop],sourceBandColumn:profile.sourceBandColumn,measuredArea:mass};
}
function sampleWithResponse(wavelengths,values,sensorId='olci',quantity='Rrs',options={}){
 const sensor=WATER_SENSOR_DEFINITIONS[sensorId];
 if(!sensor)throw new RangeError('Unknown sensor '+sensorId);
 const requested=options.responseMode==='measured'?'measured':'nominal';
 if(requested==='nominal')return {...sampleSensorSpectrum(wavelengths,values,sensorId,quantity),
  requestedResponseMode:'nominal',actualResponseMode:'nominal',platform:null,provenance:null};
 const platform=resolvedPlatform(sensorId,options.srfPlatform);
 const source=dataset()?.data?.[platform];
 if(!PLATFORM_BY_SENSOR[sensorId]||!source){
  // Never pass nominal calculations off as measured.
  return {sensor,quantity,domainNm:[wavelengths[0],wavelengths.at(-1)],
   responseModel:'measured-unavailable',requestedResponseMode:'measured',
   actualResponseMode:'unavailable',platform,provenance:null,
   sampledCount:0,totalVisibleBands:sensor.bands.length,
   bands:sensor.bands.map(b=>({...b,value:null,status:'unavailable',coverageFraction:null}))};
 }
 const bands=sensor.bands.map(b=>{
  const profile=getMeasuredBand(sensorId,b.id,platform);
  return {...b,...integrateMeasured(wavelengths,values,profile)};
 });
 return {sensor,quantity,domainNm:[wavelengths[0],wavelengths.at(-1)],
  responseModel:'published-measured-1nm-srf',requestedResponseMode:'measured',
  actualResponseMode:'measured',platform,
  provenance:{publisher:'jbferet/prosail',sourceFile:source.sourcePath,gitBlobSHA:source.sourceBlobSHA,url:source.sourceUrl,
   note:'Published measured SRF values; exact original ESA/USGS release version not independently confirmed.'},
  sampledCount:bands.filter(b=>b.status==='full').length,totalVisibleBands:bands.length,bands};
}
return {sampleWithResponse,supportsMeasured,getMeasuredBand,integrateMeasured,resolvedPlatform};
