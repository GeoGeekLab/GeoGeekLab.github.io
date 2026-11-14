// Stage 4: pure, domain-safe integration of a frozen geographic vector field.
// sample(lon,lat) -> {valid,u,v}; u/v are metres per simulated second.
import { METRES_PER_DEGREE,wrapLongitude,sampleWind } from './field.mjs';

export const INTEGRATORS=Object.freeze(['euler','rk2','rk4']);
export function advanceByMethod(sample,lon,lat,seconds,method='rk4') {
  if(!INTEGRATORS.includes(method))return {valid:false,reason:'invalid-integrator'};
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||!Number.isFinite(seconds)||seconds<0)
    return {valid:false,reason:'invalid-step'};
  if(typeof sample!=='function')return {valid:false,reason:'invalid-sampler'};
  const slope=(x,y)=>{
    if(!Number.isFinite(x)||!Number.isFinite(y)||Math.abs(y)>89)return null;
    const wind=sample(wrapLongitude(x),y);
    if(!wind?.valid||!Number.isFinite(wind.u)||!Number.isFinite(wind.v))return null;
    const cosine=Math.cos(y*Math.PI/180);
    if(cosine<=0.01)return null;
    return [wind.u/(METRES_PER_DEGREE*cosine),wind.v/METRES_PER_DEGREE];
  };
  const k1=slope(lon,lat);
  if(!k1)return {valid:false,reason:'outside-field-domain'};
  if(seconds===0)return {valid:true,lon:wrapLongitude(lon),lat,wrapped:false,method};
  const at=(s,f)=>[lon+seconds*f*s[0],lat+seconds*f*s[1]];
  let dLon,dLat;
  if(method==='euler') [dLon,dLat]=[seconds*k1[0],seconds*k1[1]];
  else {
    const p2=at(k1,.5),k2=slope(...p2);
    if(!k2)return {valid:false,reason:'outside-field-domain'};
    if(method==='rk2') [dLon,dLat]=[seconds*k2[0],seconds*k2[1]];
    else {
      const p3=at(k2,.5),k3=slope(...p3);
      if(!k3)return {valid:false,reason:'outside-field-domain'};
      const p4=at(k3,1),k4=slope(...p4);
      if(!k4)return {valid:false,reason:'outside-field-domain'};
      dLon=seconds*(k1[0]+2*k2[0]+2*k3[0]+k4[0])/6;
      dLat=seconds*(k1[1]+2*k2[1]+2*k3[1]+k4[1])/6;
    }
  }
  const raw=lon+dLon,nextLat=lat+dLat,nextLon=wrapLongitude(raw);
  if(!slope(nextLon,nextLat))return {valid:false,reason:'outside-field-domain'};
  return {valid:true,lon:nextLon,lat:nextLat,
    wrapped:Math.abs(raw-nextLon)>1e-7||Math.abs(nextLon-wrapLongitude(lon))>180,method};
}
export function advanceFrozenField(field,lon,lat,seconds,method='rk4'){
  return advanceByMethod((x,y)=>sampleWind(field,x,y),lon,lat,seconds,method);
}
