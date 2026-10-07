(() => {
  'use strict';

  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const DEFAULT_WAVELENGTHS=Object.freeze(Array.from({length:61},(_,i)=>400+i*5));

  function normalize(values) {
    const max=Math.max(0,...values);
    if (!(max>0)) return values.map(()=>0);
    return values.map(value=>value/max);
  }

  function rayleighRelativeSpectrum(wavelengths=DEFAULT_WAVELENGTHS,enabled=true) {
    if (!enabled) return wavelengths.map(()=>0);
    const raw=wavelengths.map(lambda=>Math.pow(550/lambda,4));
    return normalize(raw);
  }

  function fresnelUnpolarized(thetaDeg=40,n1=1,n2=1.34) {
    const thetaI=clamp(Number(thetaDeg),0,89.9)*Math.PI/180;
    const sinT=n1/n2*Math.sin(thetaI);
    if (Math.abs(sinT)>=1) return 1;
    const thetaT=Math.asin(sinT);
    const cosI=Math.cos(thetaI),cosT=Math.cos(thetaT);
    const rs=(n1*cosI-n2*cosT)/(n1*cosI+n2*cosT);
    const rp=(n1*cosT-n2*cosI)/(n1*cosT+n2*cosI);
    return clamp((rs*rs+rp*rp)/2,0,1);
  }

  function surfaceReflectionRelative(skySpectrum,{enabled=true,thetaDeg=40}={}) {
    if (!enabled) return skySpectrum.map(()=>0);
    const reflectance=fresnelUnpolarized(thetaDeg);
    return skySpectrum.map(value=>value*reflectance);
  }

  function waterLeavingSpectrum(waterOutput,enabled=true) {
    const source=Array.isArray(waterOutput?.Rrs) ? waterOutput.Rrs : [];
    return enabled ? [...source] : source.map(()=>0);
  }

  function nearestIndex(wavelengths,target) {
    let best=0,delta=Infinity;
    wavelengths.forEach((value,index)=>{
      const next=Math.abs(value-target);
      if(next<delta){delta=next;best=index;}
    });
    return best;
  }

  // Illustrative display mapping only. It uses three Rrs samples rather than
  // claiming a colorimetric reconstruction of human apparent water color.
  function illustrativeWaterRgb(waterOutput,enabled=true) {
    if (!enabled) return Object.freeze({r:6,g:10,b:12,css:'rgb(6 10 12)'});
    const wavelengths=waterOutput?.wavelengthNm || [];
    const values=waterOutput?.Rrs || [];
    if (!wavelengths.length || !values.length) return Object.freeze({r:16,g:40,b:54,css:'rgb(16 40 54)'});
    const samples=[
      values[nearestIndex(wavelengths,650)] || 0,
      values[nearestIndex(wavelengths,550)] || 0,
      values[nearestIndex(wavelengths,450)] || 0
    ];
    const max=Math.max(...samples,1e-12);
    const gamma=value=>Math.pow(clamp(value/max,0,1),0.55);
    const r=Math.round(8+68*gamma(samples[0]));
    const g=Math.round(18+126*gamma(samples[1]));
    const b=Math.round(24+176*gamma(samples[2]));
    return Object.freeze({r,g,b,css:`rgb(${r} ${g} ${b})`});
  }

  function chartFor(mode,waterOutput,mechanisms) {
    if (mode==='water') {
      return Object.freeze({
        wavelengthNm:waterOutput.wavelengthNm,
        before:[...waterOutput.Rrs],
        after:waterLeavingSpectrum(waterOutput,mechanisms.waterBackscatter),
        unit:'sr⁻¹'
      });
    }
    const wavelengths=DEFAULT_WAVELENGTHS;
    const skyBefore=rayleighRelativeSpectrum(wavelengths,true);
    if (mode==='surface') {
      return Object.freeze({
        wavelengthNm:wavelengths,
        before:surfaceReflectionRelative(skyBefore,{enabled:true}),
        after:surfaceReflectionRelative(skyBefore,{enabled:mechanisms.surfaceReflection}),
        unit:'relative'
      });
    }
    return Object.freeze({
      wavelengthNm:wavelengths,
      before:skyBefore,
      after:rayleighRelativeSpectrum(wavelengths,mechanisms.atmosphericScattering),
      unit:'relative'
    });
  }

  function buildScene({waterOutput,mechanisms,chartMode='sky'}={}) {
    const state={
      atmosphericScattering:mechanisms?.atmosphericScattering!==false,
      waterBackscatter:mechanisms?.waterBackscatter!==false,
      surfaceReflection:mechanisms?.surfaceReflection!==false
    };
    const sky=rayleighRelativeSpectrum(DEFAULT_WAVELENGTHS,state.atmosphericScattering);
    const surface=surfaceReflectionRelative(rayleighRelativeSpectrum(DEFAULT_WAVELENGTHS,true),{enabled:state.surfaceReflection});
    const waterSignal=waterLeavingSpectrum(waterOutput,state.waterBackscatter);
    return Object.freeze({
      mechanisms:Object.freeze(state),
      skySpectrum:Object.freeze(sky),
      surfaceSpectrum:Object.freeze(surface),
      waterSignal:Object.freeze(waterSignal),
      waterColor:illustrativeWaterRgb(waterOutput,state.waterBackscatter),
      surfaceReflectance:fresnelUnpolarized(40),
      chart:chartFor(chartMode,waterOutput,state)
    });
  }

  window.GeoPlayLightPhysics=Object.freeze({
    DEFAULT_WAVELENGTHS,
    normalize,
    rayleighRelativeSpectrum,
    fresnelUnpolarized,
    surfaceReflectionRelative,
    waterLeavingSpectrum,
    illustrativeWaterRgb,
    buildScene
  });
})();
