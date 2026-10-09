/* World v12: local distortion on a sphere. Projection coordinates are D3 pixels. */
((root,factory)=>{
 const api=factory();
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 if(root)root.GeoWorldDistortion=api;
})(typeof window!=='undefined'?window:typeof globalThis!=='undefined'?globalThis:null,()=>{
 'use strict';
 const RAD=Math.PI/180;
 // Return two singular values for the differential of the map on an orthonormal
 // east/north tangent basis. Results are dimensionless local scale factors.
 function local(projection,lon,lat,step=1e-4){
  if(!projection||!Number.isFinite(lon)||!Number.isFinite(lat)||Math.abs(lat)>89.8||step<=0)return null;
  const scale=projection.scale();
  if(!Number.isFinite(scale)||scale<=0)return null;
  const c=Math.cos(lat*RAD);if(c<1e-3)return null;
  const h=step*RAD,pt=(x,y)=>projection([x,y]),center=pt(lon,lat);
  const eastP=pt(lon+step,lat),eastM=pt(lon-step,lat),northP=pt(lon,lat+step),northM=pt(lon,lat-step);
  if(![center,eastP,eastM,northP,northM].every(p=>Array.isArray(p)&&p.every(Number.isFinite)))return null;
  const e=[(eastP[0]-eastM[0])/(2*h*c*scale),(eastP[1]-eastM[1])/(2*h*c*scale)];
  const n=[(northP[0]-northM[0])/(2*h*scale),(northP[1]-northM[1])/(2*h*scale)];
  // Discontinuities and clipping can create spuriously huge finite derivatives.
  if(Math.hypot(...e)>1e4||Math.hypot(...n)>1e4)return null;
  const a=e[0]*e[0]+e[1]*e[1],b=e[0]*n[0]+e[1]*n[1],d=n[0]*n[0]+n[1]*n[1];
  const delta=Math.sqrt(Math.max(0,(a-d)*(a-d)+4*b*b));
  const major=Math.sqrt(Math.max(0,(a+d+delta)/2));
  const minor=Math.sqrt(Math.max(0,(a+d-delta)/2));
  const area=Math.abs(e[0]*n[1]-e[1]*n[0]);
  if(![major,minor,area].every(Number.isFinite)||minor<1e-7)return null;
  const angleError=2*Math.asin(Math.min(1,Math.max(0,(major-minor)/(major+minor))))/RAD;
  // Unit east/north coordinates, scaled into the local projection plane.
  return {major,minor,area,angleError,east:e,north:n,center};
 }
 function ellipse(projection,lon,lat,radius=21){
  const m=local(projection,lon,lat);if(!m)return null;
  const [ex,ey]=m.east,[nx,ny]=m.north;
  const points=[];for(let i=0;i<=48;i++){
   const t=i*Math.PI/24;
   points.push([m.center[0]+radius*(ex*Math.cos(t)+nx*Math.sin(t)),m.center[1]+radius*(ey*Math.cos(t)+ny*Math.sin(t))]);
  }
  return {metrics:m,points};
 }
 function path(points){return points?.map((p,i)=>(i?'L':'M')+p[0].toFixed(2)+','+p[1].toFixed(2)).join(' ')||''}
 return {local,ellipse,path};
});