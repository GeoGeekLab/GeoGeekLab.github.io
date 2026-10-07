import {
  ATMOSPHERE_MODEL_META,
  computeAtmosphereObservation
} from './atmosphere-model.js';

export const OLCI_OC4_R2022 = Object.freeze({
  wavelengthsNm:Object.freeze([443,490,510,560]),
  numeratorNm:Object.freeze([443,490,510]),
  denominatorNm:560,
  coefficients:Object.freeze([0.42540,-3.21679,2.86907,-0.62628,-1.09333]),
  source:'NASA OB.DAAC chlorophyll-a ATBD v1.1 / R2022 · OLCI OC4'
});

function assertSpectrum(wavelengths,values,name){
  if(!Array.isArray(wavelengths)||!Array.isArray(values)||wavelengths.length!==values.length||wavelengths.length<2){
    throw new TypeError(`${name} must match wavelength grid`);
  }
  for(let i=0;i<wavelengths.length;i++){
    if(!Number.isFinite(wavelengths[i])||!Number.isFinite(values[i])) throw new TypeError(`${name} must be finite`);
    if(i&&wavelengths[i]<=wavelengths[i-1]) throw new RangeError('wavelengths must increase');
  }
}

function interpolate(wavelengths,values,x){
  if(x<wavelengths[0]||x>wavelengths.at(-1)) return null;
  const exact=wavelengths.indexOf(x);
  if(exact>=0) return values[exact];
  let hi=1;
  while(hi<wavelengths.length&&wavelengths[hi]<x)hi++;
  if(hi>=wavelengths.length)return values.at(-1);
  const lo=hi-1;
  const t=(x-wavelengths[lo])/(wavelengths[hi]-wavelengths[lo]);
  return values[lo]+(values[hi]-values[lo])*t;
}

export function recoverRrsFromToa(wavelengths,rhoToaApprox,assumedAtmosphereState){
  assertSpectrum(wavelengths,rhoToaApprox,'rhoToaApprox');
  const zeroRrs=wavelengths.map(()=>0);
  const assumed=computeAtmosphereObservation(wavelengths,zeroRrs,assumedAtmosphereState);

  const estimatedRrs=[];
  const estimatedWaterReflectance=[];
  const estimatedPathReflectance=[];
  const residualToa=[];

  for(let i=0;i<wavelengths.length;i++){
    const path=assumed.reflectance.rayleighPath[i]+assumed.reflectance.aerosolPath[i];
    const waterAtToa=rhoToaApprox[i]-path;
    const transmission=assumed.transmission.twoWay[i];
    const rhoWater=transmission>0?waterAtToa/transmission:Number.NaN;
    const Rrs=rhoWater/Math.PI;

    estimatedPathReflectance.push(path);
    residualToa.push(waterAtToa);
    estimatedWaterReflectance.push(rhoWater);
    estimatedRrs.push(Rrs);
  }

  return Object.freeze({
    assumedState:assumed.state,
    estimatedRrs:Object.freeze(estimatedRrs),
    estimatedWaterReflectance:Object.freeze(estimatedWaterReflectance),
    estimatedPathReflectance:Object.freeze(estimatedPathReflectance),
    residualToa:Object.freeze(residualToa),
    transmission:assumed.transmission
  });
}

export function correctionDiagnostics(trueRrs,estimatedRrs){
  if(!Array.isArray(trueRrs)||!Array.isArray(estimatedRrs)||trueRrs.length!==estimatedRrs.length||!trueRrs.length){
    throw new TypeError('trueRrs and estimatedRrs must be equal-length arrays');
  }
  let sum=0,sumSigned=0,sumRelative=0,relativeCount=0,maxAbs=0,negativeCount=0,finiteCount=0;
  for(let i=0;i<trueRrs.length;i++){
    const truth=trueRrs[i],estimate=estimatedRrs[i];
    if(!Number.isFinite(truth)||!Number.isFinite(estimate))continue;
    const error=estimate-truth;
    sum+=error*error;
    sumSigned+=error;
    maxAbs=Math.max(maxAbs,Math.abs(error));
    if(estimate<0)negativeCount++;
    if(Math.abs(truth)>1e-6){
      sumRelative+=Math.abs(error/truth);
      relativeCount++;
    }
    finiteCount++;
  }
  return Object.freeze({
    finiteCount,
    negativeCount,
    rmse:finiteCount?Math.sqrt(sum/finiteCount):Number.NaN,
    meanBias:finiteCount?sumSigned/finiteCount:Number.NaN,
    meanAbsoluteRelativeError:relativeCount?sumRelative/relativeCount:Number.NaN,
    maxAbsoluteError:maxAbs
  });
}

export function olciOc4Chlorophyll(wavelengths,Rrs){
  assertSpectrum(wavelengths,Rrs,'Rrs');
  const values=Object.fromEntries(
    OLCI_OC4_R2022.wavelengthsNm.map(wl=>[wl,interpolate(wavelengths,Rrs,wl)])
  );
  const blue=Math.max(...OLCI_OC4_R2022.numeratorNm.map(wl=>values[wl]));
  const green=values[OLCI_OC4_R2022.denominatorNm];

  if(!Number.isFinite(blue)||!Number.isFinite(green)||blue<=0||green<=0){
    return Object.freeze({valid:false,value:null,ratio:null,logRatio:null,reason:'non-positive required Rrs'});
  }

  const ratio=blue/green;
  if(!(ratio>0)){
    return Object.freeze({valid:false,value:null,ratio,logRatio:null,reason:'invalid blue/green ratio'});
  }

  const x=Math.log10(ratio);
  const [a0,a1,a2,a3,a4]=OLCI_OC4_R2022.coefficients;
  const logChl=a0+a1*x+a2*x*x+a3*x*x*x+a4*x*x*x*x;
  const value=Math.pow(10,logChl);

  if(!Number.isFinite(value)||value<=0){
    return Object.freeze({valid:false,value:null,ratio,logRatio:x,reason:'non-finite OC4 result'});
  }

  return Object.freeze({valid:true,value,ratio,logRatio:x,reason:null});
}

export function buildCorrectionExperiment(wavelengths,trueRrs,rhoToaApprox,trueAtmosphereState,assumedAerosol){
  assertSpectrum(wavelengths,trueRrs,'trueRrs');
  assertSpectrum(wavelengths,rhoToaApprox,'rhoToaApprox');
  const assumedState={
    ...trueAtmosphereState,
    aerosolOpticalDepth550:assumedAerosol.aerosolOpticalDepth550,
    angstromExponent:assumedAerosol.angstromExponent
  };
  const correction=recoverRrsFromToa(wavelengths,rhoToaApprox,assumedState);
  const diagnostics=correctionDiagnostics(trueRrs,correction.estimatedRrs);
  const truthOc4=olciOc4Chlorophyll(wavelengths,trueRrs);
  const estimatedOc4=olciOc4Chlorophyll(wavelengths,correction.estimatedRrs);
  const oc4RelativeBias=truthOc4.valid&&estimatedOc4.valid
    ? (estimatedOc4.value-truthOc4.value)/truthOc4.value
    : null;

  return Object.freeze({
    trueAtmosphereState,
    assumedAerosol:Object.freeze({
      aerosolOpticalDepth550:assumedAerosol.aerosolOpticalDepth550,
      angstromExponent:assumedAerosol.angstromExponent
    }),
    correction,
    diagnostics,
    truthOc4,
    estimatedOc4,
    oc4RelativeBias,
    aerosolDelta:Object.freeze({
      aerosolOpticalDepth550:assumedAerosol.aerosolOpticalDepth550-trueAtmosphereState.aerosolOpticalDepth550,
      angstromExponent:assumedAerosol.angstromExponent-trueAtmosphereState.angstromExponent
    }),
    modelAssumptions:Object.freeze({
      aerosolSingleScatteringAlbedo:ATMOSPHERE_MODEL_META.aerosolSingleScatteringAlbedo,
      aerosolAsymmetry:ATMOSPHERE_MODEL_META.aerosolAsymmetry
    })
  });
}
