(() => {
  'use strict';
  const EARTH_RADIUS_KM=6371.0;
  const EARTH_MU_KM3_S2=398600.4418;
  const RANGES=Object.freeze({
    altitudeKm:Object.freeze([350,1200]),
    fovDeg:Object.freeze([2,50]),
    detectorPixels:Object.freeze([512,16000])
  });
  const DEFAULT_CONFIG=Object.freeze({altitudeKm:600,fovDeg:20,detectorPixels:6000});
  const rad=deg=>deg*Math.PI/180;
  const deg=value=>value*180/Math.PI;
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

  function validateConfig(input={}) {
    const config={...DEFAULT_CONFIG,...input};
    for (const [key,[min,max]] of Object.entries(RANGES)) {
      const value=Number(config[key]);
      if (!Number.isFinite(value)) throw new TypeError(`${key} must be finite.`);
      if (value<min || value>max) throw new RangeError(`${key} outside [${min}, ${max}].`);
      config[key]=value;
    }
    config.detectorPixels=Math.round(config.detectorPixels);
    const horizonHalfAngle=deg(Math.asin(EARTH_RADIUS_KM/(EARTH_RADIUS_KM+config.altitudeKm)));
    if (config.fovDeg/2>=horizonHalfAngle) throw new RangeError('FOV intersects or exceeds the geometric horizon.');
    return Object.freeze(config);
  }

  function lookGeometry(altitudeKm,lookDeg) {
    const h=Number(altitudeKm);
    const beta=rad(Math.abs(Number(lookDeg)));
    const r=EARTH_RADIUS_KM+h;
    const disc=EARTH_RADIUS_KM**2-r**2*Math.sin(beta)**2;
    if (disc<0) return null;
    const slantKm=r*Math.cos(beta)-Math.sqrt(disc);
    const radial=r-slantKm*Math.cos(beta);
    const tangent=slantKm*Math.sin(beta);
    const centralAngleRad=Math.atan2(tangent,radial);
    return Object.freeze({
      centralAngleRad,
      centralAngleDeg:deg(centralAngleRad),
      groundArcKm:EARTH_RADIUS_KM*centralAngleRad,
      slantRangeKm:slantKm
    });
  }

  function orbitalPeriodMinutes(altitudeKm) {
    const radius=EARTH_RADIUS_KM+Number(altitudeKm);
    return 2*Math.PI*Math.sqrt(radius**3/EARTH_MU_KM3_S2)/60;
  }

  function compute(input={}) {
    const config=validateConfig(input);
    const half=config.fovDeg/2;
    const edge=lookGeometry(config.altitudeKm,half);
    if (!edge) throw new RangeError('Sensor edge does not intersect Earth.');
    const ifovDeg=config.fovDeg/config.detectorPixels;
    const halfPixel=lookGeometry(config.altitudeKm,ifovDeg/2);
    const innerEdge=lookGeometry(config.altitudeKm,Math.max(0,half-ifovDeg));
    const swathKm=2*edge.groundArcKm;
    const nadirGsdM=2*halfPixel.groundArcKm*1000;
    const edgeGsdM=(edge.groundArcKm-innerEdge.groundArcKm)*1000;
    const circumferenceKm=2*Math.PI*EARTH_RADIUS_KM;
    return Object.freeze({
      version:'swath-physics-v1',
      config,
      swathKm,
      nadirGsdM,
      edgeGsdM,
      ifovMicrorad:rad(ifovDeg)*1e6,
      orbitalPeriodMin:orbitalPeriodMinutes(config.altitudeKm),
      edgeLookDeg:half,
      edgeGroundAngleDeg:edge.centralAngleDeg,
      edgeSlantRangeKm:edge.slantRangeKm,
      equatorialCircumferenceFraction:swathKm/circumferenceKm,
      horizonHalfAngleDeg:deg(Math.asin(EARTH_RADIUS_KM/(EARTH_RADIUS_KM+config.altitudeKm)))
    });
  }

  function compare(beforeConfig,afterConfig) {
    const before=compute(beforeConfig);
    const after=compute(afterConfig);
    const ratio=(a,b)=>b/a;
    return Object.freeze({
      before,after,
      swathRatio:ratio(before.swathKm,after.swathKm),
      gsdRatio:ratio(before.nadirGsdM,after.nadirGsdM),
      edgeGsdRatio:ratio(before.edgeGsdM,after.edgeGsdM),
      periodRatio:ratio(before.orbitalPeriodMin,after.orbitalPeriodMin)
    });
  }

  window.GeoPlaySwathPhysics=Object.freeze({
    EARTH_RADIUS_KM,EARTH_MU_KM3_S2,RANGES,DEFAULT_CONFIG,
    validateConfig,lookGeometry,orbitalPeriodMinutes,compute,compare,clamp
  });
})();
