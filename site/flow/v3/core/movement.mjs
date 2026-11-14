export const NODES={
  nyc:[-74.006,40.713,'New York'], lon:[-0.128,51.507,'London'], par:[2.352,48.857,'Paris'], dub:[55.270,25.205,'Dubai'],
  sin:[103.820,1.352,'Singapore'], tok:[139.692,35.690,'Tokyo'], lax:[-118.244,34.052,'Los Angeles'], mex:[-99.133,19.433,'Mexico City'],
  sao:[-46.633,-23.550,'São Paulo'], jnb:[28.047,-26.204,'Johannesburg'], syd:[151.209,-33.869,'Sydney'], del:[77.209,28.614,'Delhi']
};
export const OD=[
  ['nyc','lon',94],['lon','par',72],['par','dub',61],['dub','del',68],['del','sin',57],['sin','tok',76],['tok','lax',89],['lax','nyc',84],
  ['mex','lax',55],['mex','nyc',47],['sao','nyc',58],['sao','jnb',32],['jnb','dub',46],['jnb','lon',41],['syd','sin',64],['syd','tok',51],
  ['dub','sin',59],['lon','nyc',88],['tok','sin',69],['par','nyc',63],['del','dub',62],['lax','tok',77],['sin','syd',56],['nyc','sao',44]
].map(([a,b,value],i)=>({id:i,a,b,value}));
export const TRIPS=[
  {name:'Pacific corridor A',color:'warm',pts:[[-122.42,37.77,0],[-150,35,18],[178,34,36],[160,35,55],[139.69,35.69,72]]},
  {name:'Atlantic corridor B',color:'pale',pts:[[-74.0,40.71,3],[-50,45,18],[-28,49,34],[-10,51,49],[2.35,48.86,64]]},
  {name:'Indian Ocean C',color:'warm',pts:[[55.27,25.2,0],[67,18,16],[78,11,31],[91,7,47],[103.82,1.35,66]]},
  {name:'Southern corridor D',color:'pale',pts:[[151.21,-33.87,8],[139,-27,22],[122,-20,39],[112,-10,55],[103.82,1.35,72]]},
  {name:'South Atlantic E',color:'warm',pts:[[-46.63,-23.55,4],[-28,-28,21],[-8,-30,39],[10,-29,55],[28.05,-26.2,73]]},
  {name:'Eurasia F',color:'pale',pts:[[2.35,48.86,2],[23,48,18],[44,46,36],[62,39,52],[77.21,28.61,70]]},
  {name:'North America G',color:'warm',pts:[[-118.24,34.05,0],[-108,37,15],[-96,39,31],[-84,40,47],[-74,40.71,62]]},
  {name:'SE Asia H',color:'pale',pts:[[77.21,28.61,10],[85,23,26],[94,16,42],[100,8,57],[103.82,1.35,71]]}
];

/**
 * Flow V3 OD + TRIPS teaching model.
 * Directed OD weights are normalized teaching units, never observed counts.
 * TRIPS times are authored relative units (not UTC), positions are teaching samples.
 */
export const OD_UNIT='normalized teaching units';
export const TRIP_TIME_UNIT='relative teaching time units';
const rad=v=>v*Math.PI/180;
const deg=v=>v*180/Math.PI;
const earthKm=6371.0088;
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
export function sortedEdges(edges=OD,limit=edges.length){
  if(!Array.isArray(edges))throw new TypeError('OD edges must be an array');
  if(!Number.isInteger(limit)||limit<0)throw new RangeError('Invalid edge limit');
  return [...edges].sort((a,b)=>b.value-a.value||a.id-b.id).slice(0,limit);
}
export function odNodeTotals(nodeId,edges=OD){
  if(!Object.hasOwn(NODES,nodeId))throw new RangeError('Unknown OD node');
  const out=edges.filter(edge=>edge.a===nodeId).reduce((sum,e)=>sum+e.value,0);
  const inbound=edges.filter(edge=>edge.b===nodeId).reduce((sum,e)=>sum+e.value,0);
  return {nodeId,name:NODES[nodeId][2],out,in:inbound,net:out-inbound,
    total:out+inbound,unit:OD_UNIT};
}
export function odNetworkTotals(edges=OD){
  const total=edges.reduce((sum,e)=>sum+e.value,0);
  const nodes=Object.keys(NODES).map(node=>odNodeTotals(node,edges));
  return {edges:edges.length,total,unit:OD_UNIT,nodes};
}
export function odPairTotals(origin,destination,edges=OD){
  if(!Object.hasOwn(NODES,origin)||!Object.hasOwn(NODES,destination)||origin===destination)
    throw new RangeError('Choose two different known OD places');
  const forward=edges.filter(e=>e.a===origin&&e.b===destination).reduce((s,e)=>s+e.value,0);
  const reverse=edges.filter(e=>e.a===destination&&e.b===origin).reduce((s,e)=>s+e.value,0);
  return {origin,destination,forward,reverse,net:forward-reverse,
    total:forward+reverse,unit:OD_UNIT};
}
export function greatCircleKm(a,b){
  const lat1=rad(a[1]),lat2=rad(b[1]);
  const dlat=lat2-lat1,dlon=rad(b[0]-a[0]);
  const h=Math.sin(dlat/2)**2+Math.cos(lat1)*Math.cos(lat2)*Math.sin(dlon/2)**2;
  return 2*earthKm*Math.asin(Math.sqrt(clamp(h,0,1)));
}
export function greatCirclePoint(a,b,f){
  if(!Number.isFinite(f)||f<0||f>1)throw new RangeError('Interpolation fraction outside segment');
  if(f===0)return [a[0],a[1]];
  if(f===1)return [b[0],b[1]];
  const xyz=p=>{const latitude=rad(p[1]),longitude=rad(p[0]),cos=Math.cos(latitude);
    return [cos*Math.cos(longitude),cos*Math.sin(longitude),Math.sin(latitude)]};
  const A=xyz(a),B=xyz(b),dot=clamp(A.reduce((sum,x,i)=>sum+x*B[i],0),-1,1);
  const omega=Math.acos(dot);
  if(omega<1e-10)return [a[0],a[1]];
  if(Math.PI-omega<1e-8)throw new RangeError('Antipodal interpolation requires a specified path');
  const sin=Math.sin(omega),fa=Math.sin((1-f)*omega)/sin,fb=Math.sin(f*omega)/sin;
  const X=A.map((x,i)=>fa*x+fb*B[i]);
  return [deg(Math.atan2(X[1],X[0])),deg(Math.atan2(X[2],Math.hypot(X[0],X[1])))];
}
export function validateTrip(trip){
  if(!trip||!Array.isArray(trip.pts)||trip.pts.length<2)return false;
  return trip.pts.every((p,i)=>Array.isArray(p)&&p.length>=3&&p.slice(0,3).every(Number.isFinite)
    &&Math.abs(p[1])<=90&&(i===0||p[2]>trip.pts[i-1][2]));
}
export function tripMetrics(trip){
  if(!validateTrip(trip))throw new RangeError('Invalid or unordered teaching samples');
  const segments=trip.pts.slice(1).map((b,i)=>{
    const a=trip.pts[i],distanceKm=greatCircleKm(a,b);
    const durationUnits=b[2]-a[2];
    return {index:i,from:i,to:i+1,distanceKm,durationUnits,
      kmPerTimeUnit:distanceKm/durationUnits};
  });
  const totalDistanceKm=segments.reduce((s,x)=>s+x.distanceKm,0);
  const startTime=trip.pts[0][2],endTime=trip.pts.at(-1)[2];
  return {name:trip.name,samples:trip.pts.length,segments,totalDistanceKm,
    startTime,endTime,durationUnits:endTime-startTime,
    maxSamplingGapUnits:Math.max(...segments.map(s=>s.durationUnits)),
    averageSamplingGapUnits:(endTime-startTime)/segments.length,
    timeUnit:TRIP_TIME_UNIT,
    note:'Geodesic display distances between teaching samples; not measured travel distance or speed in km/h.'};
}
export function tripPosition(trip,time){
  if(!validateTrip(trip)||!Number.isFinite(time))throw new RangeError('Invalid trip or time');
  const pts=trip.pts;
  if(time<=pts[0][2]){
    return {position:pts[0].slice(0,2),time:pts[0][2],sampled:time===pts[0][2],
      sampleIndex:0,segmentIndex:null,fraction:0,clamped:time<pts[0][2],timeUnit:TRIP_TIME_UNIT};
  }
  if(time>=pts.at(-1)[2]){
    const index=pts.length-1;
    return {position:pts[index].slice(0,2),time:pts[index][2],
      sampled:time===pts[index][2],sampleIndex:index,segmentIndex:null,
      fraction:1,clamped:time>pts[index][2],timeUnit:TRIP_TIME_UNIT};
  }
  for(let index=0;index<pts.length-1;index++){
    const a=pts[index],b=pts[index+1];
    if(time===a[2])return {position:a.slice(0,2),time,sampled:true,
      sampleIndex:index,segmentIndex:null,fraction:0,clamped:false,timeUnit:TRIP_TIME_UNIT};
    if(time===b[2])return {position:b.slice(0,2),time,sampled:true,
      sampleIndex:index+1,segmentIndex:null,fraction:1,clamped:false,timeUnit:TRIP_TIME_UNIT};
    if(time>a[2]&&time<b[2]){
      const fraction=(time-a[2])/(b[2]-a[2]);
      return {position:greatCirclePoint(a,b,fraction),time,sampled:false,
        sampleIndex:null,segmentIndex:index,fraction,clamped:false,
        timeUnit:TRIP_TIME_UNIT,interpolation:'shortest great-circle'};
    }
  }
  throw new RangeError('Time did not match a segment');
}
