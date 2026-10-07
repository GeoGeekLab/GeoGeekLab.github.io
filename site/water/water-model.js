(() => {
  'use strict';

  const data = window.GeoWaterData;
  if (!data) throw new Error('GeoWaterData is required before water-model.js.');

  const CONSTANTS = Object.freeze({
    g0: 0.0949,
    g1: 0.0794,
    interfaceNumerator: 0.52,
    interfaceDenominator: 1.7,
    sg: 0.0176,
    sNap: 0.0123
  });

  const RANGES = Object.freeze({
    Chl: Object.freeze([0.02, 25]),
    ag440: Object.freeze([0, 2]),
    aNAP443: Object.freeze([0, 1]),
    bbp443: Object.freeze([0.0001, 0.03]),
    eta: Object.freeze([0, 2])
  });

  const DEFAULT_STATE = Object.freeze({
    Chl: 1,
    ag440: 0.05,
    aNAP443: 0.02,
    bbp443: 0.002,
    eta: 1
  });

  const PRESETS = Object.freeze({
    clearOcean: Object.freeze({Chl:0.10,ag440:0.02,aNAP443:0.005,bbp443:0.0007,eta:1}),
    phytoplanktonRich: Object.freeze({Chl:10,ag440:0.05,aNAP443:0.02,bbp443:0.005,eta:1}),
    cdomRich: Object.freeze({Chl:1,ag440:0.80,aNAP443:0.02,bbp443:0.002,eta:1}),
    turbidParticleRich: Object.freeze({Chl:2,ag440:0.10,aNAP443:0.50,bbp443:0.020,eta:1})
  });

  function validateState(input={}) {
    const state={...DEFAULT_STATE,...input};
    for (const [key,range] of Object.entries(RANGES)) {
      const value=Number(state[key]);
      if (!Number.isFinite(value)) throw new TypeError(`Water state ${key} must be finite.`);
      if (value<range[0] || value>range[1]) {
        throw new RangeError(`Water state ${key}=${value} outside [${range[0]}, ${range[1]}].`);
      }
      state[key]=value;
    }
    return state;
  }

  function subsurfaceToAbove(rrs) {
    const denominator=1-CONSTANTS.interfaceDenominator*rrs;
    if (!(denominator>0)) throw new RangeError('Lee02 interface denominator must stay positive.');
    return CONSTANTS.interfaceNumerator*rrs/denominator;
  }

  function aboveToSubsurface(Rrs) {
    return Rrs/(CONSTANTS.interfaceNumerator+CONSTANTS.interfaceDenominator*Rrs);
  }

  function compute(input={}) {
    const state=validateState(input);
    const n=data.wavelengthNm.length;
    const aph=new Array(n);
    const ag=new Array(n);
    const aNAP=new Array(n);
    const a=new Array(n);
    const bbp=new Array(n);
    const bb=new Array(n);
    const u=new Array(n);
    const rrs=new Array(n);
    const Rrs=new Array(n);

    for (let i=0;i<n;i++) {
      const lambda=data.wavelengthNm[i];

      // Bricaud et al. (1998):
      // a*ph = A * Chl^(-B_specific), therefore
      // aph = a*ph * Chl = A * Chl^(1-B_specific).
      aph[i]=data.bricaudA[i]*Math.pow(state.Chl,data.bricaudETotal[i]);
      ag[i]=state.ag440*Math.exp(-CONSTANTS.sg*(lambda-440));
      aNAP[i]=state.aNAP443*Math.exp(-CONSTANTS.sNap*(lambda-443));
      a[i]=data.aw[i]+aph[i]+ag[i]+aNAP[i];

      bbp[i]=state.bbp443*Math.pow(443/lambda,state.eta);
      bb[i]=data.bbw[i]+bbp[i];

      u[i]=bb[i]/(a[i]+bb[i]);
      rrs[i]=CONSTANTS.g0*u[i]+CONSTANTS.g1*u[i]*u[i];
      Rrs[i]=subsurfaceToAbove(rrs[i]);
    }

    return Object.freeze({
      version:'water-model-v1',
      state:Object.freeze({...state}),
      wavelengthNm:data.wavelengthNm,
      aw:data.aw,
      aph:Object.freeze(aph),
      ag:Object.freeze(ag),
      aNAP:Object.freeze(aNAP),
      a:Object.freeze(a),
      bbw:data.bbw,
      bbp:Object.freeze(bbp),
      bb:Object.freeze(bb),
      u:Object.freeze(u),
      rrs:Object.freeze(rrs),
      Rrs:Object.freeze(Rrs)
    });
  }

  window.GeoWaterModel = Object.freeze({
    CONSTANTS,
    RANGES,
    DEFAULT_STATE,
    PRESETS,
    validateState,
    compute,
    subsurfaceToAbove,
    aboveToSubsurface
  });
})();
