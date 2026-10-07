import { WATER_SENSOR_DEFINITIONS, WATER_SENSOR_ORDER } from './sensor-data.js';

export { WATER_SENSOR_DEFINITIONS, WATER_SENSOR_ORDER };

function assertSpectrum(wavelengths, values){
  if(!Array.isArray(wavelengths) || !Array.isArray(values) || wavelengths.length !== values.length || wavelengths.length < 2){
    throw new TypeError('wavelengths and values must be equal-length arrays');
  }
  for(let i=0;i<wavelengths.length;i++){
    if(!Number.isFinite(wavelengths[i]) || !Number.isFinite(values[i])) throw new TypeError('spectrum must be finite');
    if(i && wavelengths[i] <= wavelengths[i-1]) throw new RangeError('wavelengths must be strictly increasing');
  }
}

function interpolate(wavelengths, values, x){
  if(x < wavelengths[0] || x > wavelengths.at(-1)) return null;
  const exact=wavelengths.indexOf(x);
  if(exact>=0) return values[exact];
  let hi=1;
  while(hi<wavelengths.length && wavelengths[hi]<x) hi++;
  const lo=hi-1;
  const t=(x-wavelengths[lo])/(wavelengths[hi]-wavelengths[lo]);
  return values[lo]+(values[hi]-values[lo])*t;
}

export function rectangularBandAverage(wavelengths, values, centerNm, widthNm){
  assertSpectrum(wavelengths,values);
  if(!Number.isFinite(centerNm) || !Number.isFinite(widthNm) || widthNm<=0) throw new RangeError('invalid band definition');
  const lo=centerNm-widthNm/2;
  const hi=centerNm+widthNm/2;
  const domainLo=wavelengths[0];
  const domainHi=wavelengths.at(-1);
  if(lo<domainLo || hi>domainHi){
    return Object.freeze({
      value:null,
      supportNm:Object.freeze([lo,hi]),
      coverageFraction:Math.max(0,Math.min(hi,domainHi)-Math.max(lo,domainLo))/widthNm,
      status:'partial'
    });
  }

  const xs=[lo];
  for(let x=Math.ceil(lo);x<=Math.floor(hi);x++) if(x>lo && x<hi) xs.push(x);
  xs.push(hi);

  let area=0;
  for(let i=1;i<xs.length;i++){
    const x0=xs[i-1],x1=xs[i];
    const y0=interpolate(wavelengths,values,x0);
    const y1=interpolate(wavelengths,values,x1);
    area+=(y0+y1)*0.5*(x1-x0);
  }

  return Object.freeze({
    value:area/widthNm,
    supportNm:Object.freeze([lo,hi]),
    coverageFraction:1,
    status:'full'
  });
}

export function sampleSensorRrs(wavelengths,Rrs,sensorId='olci'){
  assertSpectrum(wavelengths,Rrs);
  const sensor=WATER_SENSOR_DEFINITIONS[sensorId];
  if(!sensor) throw new RangeError(`Unknown sensor: ${sensorId}`);

  const bands=sensor.bands.map(band=>{
    const sample=rectangularBandAverage(wavelengths,Rrs,band.centerNm,band.widthNm);
    return Object.freeze({...band,...sample});
  });

  return Object.freeze({
    sensor,
    domainNm:Object.freeze([wavelengths[0],wavelengths.at(-1)]),
    responseModel:'simplified-top-hat',
    sampledCount:bands.filter(b=>b.status==='full').length,
    totalVisibleBands:bands.length,
    bands:Object.freeze(bands)
  });
}
