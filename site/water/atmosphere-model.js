export const ATMOSPHERE_MODEL_META = Object.freeze({
  standardPressureHpa: 1013.25,
  aerosolReferenceNm: 550,
  aerosolSingleScatteringAlbedo: 0.95,
  aerosolAsymmetry: 0.70,
  approximation: 'first-order-single-scattering-plus-direct-two-way-transmission'
});

export const ATMOSPHERE_STATE_BOUNDS = Object.freeze({
  aerosolOpticalDepth550: Object.freeze([0, 0.5]),
  angstromExponent: Object.freeze([0, 2.5]),
  pressureHpa: Object.freeze([800, 1050]),
  solarZenithDeg: Object.freeze([0, 65]),
  viewZenithDeg: Object.freeze([0, 50]),
  relativeAzimuthDeg: Object.freeze([0, 180])
});

export const ATMOSPHERE_DEFAULT_STATE = Object.freeze({
  aerosolOpticalDepth550: 0.10,
  angstromExponent: 0.70,
  pressureHpa: 1013.25,
  solarZenithDeg: 30,
  viewZenithDeg: 10,
  relativeAzimuthDeg: 135
});

function finite(name,value){
  if(!Number.isFinite(value)) throw new TypeError(`${name} must be finite`);
}

export function validateAtmosphereState(input={}){
  const state={...ATMOSPHERE_DEFAULT_STATE,...input};
  for(const [name,[min,max]] of Object.entries(ATMOSPHERE_STATE_BOUNDS)){
    finite(name,state[name]);
    if(state[name]<min || state[name]>max) throw new RangeError(`${name} must be between ${min} and ${max}`);
  }
  return Object.freeze(state);
}

export function rayleighOpticalThickness(wavelengthNm,pressureHpa=ATMOSPHERE_MODEL_META.standardPressureHpa){
  finite('wavelengthNm',wavelengthNm);
  finite('pressureHpa',pressureHpa);
  if(wavelengthNm<=0 || pressureHpa<0) throw new RangeError('invalid wavelength or pressure');
  const lambdaUm=wavelengthNm/1000;
  const inv2=Math.pow(lambdaUm,-2);
  const tauStandard=0.008569*Math.pow(lambdaUm,-4)*(1+0.0113*inv2+0.00013*inv2*inv2);
  return tauStandard*(pressureHpa/ATMOSPHERE_MODEL_META.standardPressureHpa);
}

export function aerosolOpticalThickness(wavelengthNm,aerosolOpticalDepth550,angstromExponent){
  finite('wavelengthNm',wavelengthNm);
  finite('aerosolOpticalDepth550',aerosolOpticalDepth550);
  finite('angstromExponent',angstromExponent);
  if(wavelengthNm<=0 || aerosolOpticalDepth550<0) throw new RangeError('invalid aerosol optical depth input');
  return aerosolOpticalDepth550*Math.pow(wavelengthNm/ATMOSPHERE_MODEL_META.aerosolReferenceNm,-angstromExponent);
}

export function rayleighPhaseFunction(cosScatteringAngle){
  finite('cosScatteringAngle',cosScatteringAngle);
  const c=Math.max(-1,Math.min(1,cosScatteringAngle));
  return 0.75*(1+c*c);
}

export function henyeyGreensteinPhaseFunction(cosScatteringAngle,g=ATMOSPHERE_MODEL_META.aerosolAsymmetry){
  finite('cosScatteringAngle',cosScatteringAngle);
  finite('g',g);
  if(Math.abs(g)>=1) throw new RangeError('g must satisfy |g| < 1');
  const c=Math.max(-1,Math.min(1,cosScatteringAngle));
  return (1-g*g)/Math.pow(1+g*g-2*g*c,1.5);
}

export function singleScatteringPathReflectance(tau,omega0,phase,mu0,muv){
  for(const [name,value] of [['tau',tau],['omega0',omega0],['phase',phase],['mu0',mu0],['muv',muv]]) finite(name,value);
  if(tau<0 || omega0<0 || omega0>1 || phase<0 || mu0<=0 || muv<=0) throw new RangeError('invalid single-scattering input');
  return omega0*phase/(4*(mu0+muv))*(1-Math.exp(-tau*(1/mu0+1/muv)));
}

function validateSpectrum(wavelengths,Rrs){
  if(!Array.isArray(wavelengths)||!Array.isArray(Rrs)||wavelengths.length!==Rrs.length||wavelengths.length<2) throw new TypeError('wavelengths and Rrs must be equal-length arrays');
  for(let i=0;i<wavelengths.length;i++){
    finite('wavelength',wavelengths[i]);
    finite('Rrs',Rrs[i]);
    if(Rrs[i]<0) throw new RangeError('Rrs must be non-negative');
    if(i && wavelengths[i]<=wavelengths[i-1]) throw new RangeError('wavelengths must increase');
  }
}

export function computeAtmosphereObservation(wavelengths,Rrs,input={}){
  validateSpectrum(wavelengths,Rrs);
  const state=validateAtmosphereState(input);

  const sza=state.solarZenithDeg*Math.PI/180;
  const vza=state.viewZenithDeg*Math.PI/180;
  const raz=state.relativeAzimuthDeg*Math.PI/180;
  const mu0=Math.cos(sza);
  const muv=Math.cos(vza);
  const sin0=Math.sin(sza);
  const sinv=Math.sin(vza);
  const cosScatteringAngle=Math.max(-1,Math.min(1,-mu0*muv-sin0*sinv*Math.cos(raz)));
  const scatteringAngleDeg=Math.acos(cosScatteringAngle)*180/Math.PI;
  const phaseRayleigh=rayleighPhaseFunction(cosScatteringAngle);
  const phaseAerosol=henyeyGreensteinPhaseFunction(cosScatteringAngle);

  const tauRayleigh=[];
  const tauAerosol=[];
  const transmissionDown=[];
  const transmissionUp=[];
  const transmissionTwoWay=[];
  const rhoWaterSurface=[];
  const rhoWaterTransmitted=[];
  const rhoRayleighPath=[];
  const rhoAerosolPath=[];
  const rhoToa=[];
  const atmosphereFraction=[];

  for(let i=0;i<wavelengths.length;i++){
    const wl=wavelengths[i];
    const tr=rayleighOpticalThickness(wl,state.pressureHpa);
    const ta=aerosolOpticalThickness(wl,state.aerosolOpticalDepth550,state.angstromExponent);
    const totalTau=tr+ta;
    const td=Math.exp(-totalTau/mu0);
    const tu=Math.exp(-totalTau/muv);
    const tw=td*tu;
    const rhoW=Math.PI*Rrs[i];
    const rhoWt=rhoW*tw;
    const rhoR=singleScatteringPathReflectance(tr,1,phaseRayleigh,mu0,muv);
    const rhoA=singleScatteringPathReflectance(
      ta,
      ATMOSPHERE_MODEL_META.aerosolSingleScatteringAlbedo,
      phaseAerosol,
      mu0,
      muv
    );
    const total=rhoR+rhoA+rhoWt;

    tauRayleigh.push(tr);
    tauAerosol.push(ta);
    transmissionDown.push(td);
    transmissionUp.push(tu);
    transmissionTwoWay.push(tw);
    rhoWaterSurface.push(rhoW);
    rhoWaterTransmitted.push(rhoWt);
    rhoRayleighPath.push(rhoR);
    rhoAerosolPath.push(rhoA);
    rhoToa.push(total);
    atmosphereFraction.push(total>0?(rhoR+rhoA)/total:0);
  }

  return Object.freeze({
    state,
    geometry:Object.freeze({
      mu0,
      muv,
      scatteringAngleDeg,
      cosScatteringAngle
    }),
    wavelengthNm:wavelengths,
    tau:Object.freeze({
      rayleigh:Object.freeze(tauRayleigh),
      aerosol:Object.freeze(tauAerosol)
    }),
    transmission:Object.freeze({
      down:Object.freeze(transmissionDown),
      up:Object.freeze(transmissionUp),
      twoWay:Object.freeze(transmissionTwoWay)
    }),
    reflectance:Object.freeze({
      waterSurface:Object.freeze(rhoWaterSurface),
      waterTransmitted:Object.freeze(rhoWaterTransmitted),
      rayleighPath:Object.freeze(rhoRayleighPath),
      aerosolPath:Object.freeze(rhoAerosolPath),
      toaApprox:Object.freeze(rhoToa)
    }),
    atmosphereFraction:Object.freeze(atmosphereFraction)
  });
}
