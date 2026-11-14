// Stage 4: analytical presentation and spatial seeding of model snapshots.
// These functions do not turn a model snapshot into a forecast or uncertainty field.
import { fieldBounds,wrapLongitude } from './field.mjs';
export const WIND_COLOR_STOPS=Object.freeze([
  [0,'#538fc6'],[5,'#78bfc8'],[10,'#9bc785'],
  [15,'#ebce71'],[20,'#e99a58'],[30,'#cc5a4b']
]);
function colorToRgb(hex){
  return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
}
export function windSpeedColor(speed){
  if(!Number.isFinite(speed)||speed<0)return null;
  const stops=WIND_COLOR_STOPS;
  if(speed>=stops.at(-1)[0])return stops.at(-1)[1];
  for(let i=1;i<stops.length;i++){
    if(speed>stops[i][0])continue;
    const [low,lowColor]=stops[i-1],[high,highColor]=stops[i];
    const f=(speed-low)/(high-low);
    const a=colorToRgb(lowColor),b=colorToRgb(highColor);
    return '#'+a.map((v,j)=>Math.round(v+(b[j]-v)*f).toString(16).padStart(2,'0')).join('');
  }
  return stops[0][1];
}
function asUtcTime(raw){
  if(typeof raw!=='string'||!raw.trim())return null;
  const normalized=raw.trim().replace(' ','T');
  const hasZone=/Z$|[+-]\d\d:?\d\d$/.test(normalized);
  const iso=hasZone?normalized:normalized+'Z';
  const timestamp=Date.parse(iso);
  if(!Number.isFinite(timestamp))return null;
  return new Date(timestamp).toISOString().slice(0,16).replace('T',' ')+' UTC';
}
export function fieldMetadata(field){
  const bounds=fieldBounds(field);
  const min=Math.max(-89,Number(bounds.minLat));
  const max=Math.min(89,Number(bounds.maxLat));
  const coverage=`${Math.abs(min)}°${min<0?'S':'N'}–${Math.abs(max)}°${max<0?'S':'N'}`;
  const time=asUtcTime(field?.time);
  if(field?.kind==='regular')return {
    type:'MODEL SNAPSHOT',timeLabel:time?'VALID '+time:'VALID TIME UNAVAILABLE',
    coverage,latitudeMin:min,latitudeMax:max,
    resolution:`${field.dy}° lat × ${field.dx}° lon queried grid`,
    caveat:'Coarse model sampling and bilinear interpolation; uncertainty not quantified. Not an observed particle track.'
  };
  if(field?.kind==='gfs')return {
    type:'ARCHIVED MODEL',timeLabel:time?'MODEL REF '+time:'MODEL REFERENCE TIME UNAVAILABLE',
    coverage,latitudeMin:min,latitudeMax:max,
    resolution:`${field.dy}° lat × ${field.dx}° lon grid`,
    caveat:'Pinned model sample, not current conditions. Forecast lead/valid time are not established; uncertainty not quantified.'
  };
  return {
    type:'SYNTHETIC FIELD',timeLabel:'NO WEATHER VALID TIME',
    coverage,latitudeMin:min,latitudeMax:max,
    resolution:'Analytic procedural vector function',
    caveat:'Teaching fallback only. Not meteorological data; no forecast accuracy or uncertainty estimate.'
  };
}
const EARTH_RADIUS_KM=6371.0088;
export function seedDisk(lon,lat,radiusKm,count,{random=Math.random,valid=()=>true}={}){
  if(!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>89||
      !Number.isFinite(radiusKm)||radiusKm<0||radiusKm>1000||
      !Number.isInteger(count)||count<0||count>2000)
    throw new RangeError('Invalid release seed configuration');
  const points=[];let attempts=0, rejected=0;
  const maxAttempts=Math.max(1,count*16);
  const deg=Math.PI/180,lat1=lat*deg,lon1=lon*deg;
  while(points.length<count&&attempts<maxAttempts){
    attempts++;
    // A uniform spherical cap samples cos(angular distance) uniformly.
    const radial=Math.max(0,Math.min(1,random()));
    const delta=Math.acos(Math.max(-1,Math.min(1,
      1-radial*(1-Math.cos(radiusKm/EARTH_RADIUS_KM)))));
    const bearing=2*Math.PI*Math.max(0,Math.min(1,random()));
    const lat2=Math.asin(Math.max(-1,Math.min(1,
      Math.sin(lat1)*Math.cos(delta)+Math.cos(lat1)*Math.sin(delta)*Math.cos(bearing))));
    const lon2=lon1+Math.atan2(Math.sin(bearing)*Math.sin(delta)*Math.cos(lat1),
      Math.cos(delta)-Math.sin(lat1)*Math.sin(lat2));
    const point={lon:wrapLongitude(lon2/deg),lat:lat2/deg};
    if(!valid(point.lon,point.lat)){rejected++;continue;}
    points.push(point);
  }
  return {points,requested:count,accepted:points.length,rejected,attempts,radiusKm};
}
