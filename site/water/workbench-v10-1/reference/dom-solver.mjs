/** Water V10.1 scalar plane-parallel DOM source-iteration reference solver.
 * No sea-surface Fresnel interface or azimuth-resolved viewing field.
 * Valid for homogeneous optically deep water and a normalized collimated beam.
 * This is an independent educational numerical calculation, NOT HydroLight/DISORT.
 */
export const SOLVER_VERSION='geo-dom-azimuthal-hg-0.1.0';
export const G=0.8;
function gauss(n){
 const x=[],w=[];
 for(let k=1;k<=n;k++){
  let z=Math.cos(Math.PI*(k-.25)/(n+.5)),old;
  do{old=z;let p0=1,p1=z;for(let j=2;j<=n;j++){const p=((2*j-1)*z*p1-(j-1)*p0)/j;p0=p1;p1=p;}
   const d=n*(z*p1-p0)/(z*z-1);z-=p1/d;}while(Math.abs(z-old)>1e-13);
  let p0=1,p1=z;for(let j=2;j<=n;j++){const p=((2*j-1)*z*p1-(j-1)*p0)/j;p0=p1;p1=p;}
  const d=n*(z*p1-p0)/(z*z-1);x.push(z);w.push(2/((1-z*z)*d*d));
 }
 const order=x.map((v,i)=>i).sort((a,b)=>x[a]-x[b]);return {mu:order.map(i=>x[i]),w:order.map(i=>w[i])};
}
const hg=x=>(1-G*G)/Math.pow(1+G*G-2*G*x,1.5);
const quadrature=gauss(16);
function backwardFraction(){let f=0;for(let i=0;i<quadrature.mu.length;i++)if(quadrature.mu[i]<0)f+=.5*quadrature.w[i]*hg(quadrature.mu[i]);return f;}
export const HG_BB_FRACTION=backwardFraction();
function angleKernel(muA,muB){
 const a=Math.sqrt(Math.max(0,1-muA*muA)),b=Math.sqrt(Math.max(0,1-muB*muB));let sum=0;
 for(let k=0;k<32;k++)sum+=hg(muA*muB+a*b*Math.cos(2*Math.PI*(k+.5)/32));
 return sum/32;
}
function kernel(){
 const {mu,w}=quadrature,n=mu.length,mat=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>angleKernel(mu[i],mu[j])));
 for(let j=0;j<n;j++){const normal=mat.reduce((s,row,i)=>s+row[j]*w[i]/2,0);for(let i=0;i<n;i++)mat[i][j]/=normal;}
 return mat;
}
const KERNEL=kernel();
function layers(c){
 const out=[];for(let z=0;z<=20.00001;z+=.5)out.push(z);
 const maxZ=Math.max(20,12/c),dtau=.18;let z=20;
 while(z<maxZ){z=Math.min(maxZ,z+dtau/c);if(z-out.at(-1)<1e-9)break;out.push(z);}
 return out;
}
export const ANGLES=quadrature.mu.filter(m=>m<0).map(m=>Number(m.toFixed(9)));
export function solveRT({a,bb,sza=30}){
 if(![a,bb,sza].every(Number.isFinite)||a<=0||bb<0||sza<0||sza>70)throw new Error('Nonphysical IOP or solar zenith');
 const b=bb/HG_BB_FRACTION,c=a+b,mu0=Math.cos(sza*Math.PI/180),{mu,w}=quadrature,n=mu.length;
 const z=layers(c),D=z.length,tolerance=2e-6;
 const direct=z.map(depth=>Math.exp(-c*depth/mu0));
 const pBeam=mu.map(m=>angleKernel(m,mu0));
 const beamNorm=pBeam.reduce((sum,v,i)=>sum+w[i]*v/2,0);
 const sourceBeam=mu.map((m,i)=>b*pBeam[i]/(4*Math.PI*mu0*beamNorm));
 let intensity=Array.from({length:n},()=>new Float64Array(D));let diff=Infinity,iterations=0;
 for(let iter=0;iter<120;iter++){
  const scatter=Array.from({length:n},()=>new Float64Array(D));
  for(let k=0;k<D;k++)for(let i=0;i<n;i++){
   let sum=0;for(let j=0;j<n;j++)sum+=w[j]*KERNEL[i][j]*intensity[j][k];
   scatter[i][k]=b*sum/2+sourceBeam[i]*direct[k];
  }
  const next=Array.from({length:n},()=>new Float64Array(D));let maxValue=0,maxDelta=0;
  for(let i=0;i<n;i++){
   if(mu[i]>0){for(let k=1;k<D;k++){const t=Math.exp(-c*(z[k]-z[k-1])/mu[i]);
    next[i][k]=t*next[i][k-1]+(1-t)*(.5*(scatter[i][k-1]+scatter[i][k]))/c;
   }}else{for(let k=D-2;k>=0;k--){const t=Math.exp(-c*(z[k+1]-z[k])/(-mu[i]));
    next[i][k]=t*next[i][k+1]+(1-t)*(.5*(scatter[i][k+1]+scatter[i][k]))/c;
   }}
   for(let k=0;k<D;k++){maxValue=Math.max(maxValue,Math.abs(next[i][k]));maxDelta=Math.max(maxDelta,Math.abs(next[i][k]-intensity[i][k]));}
  }
  intensity=next;iterations=iter+1;diff=maxDelta/Math.max(maxValue,1e-12);
  if(diff<tolerance)break;
 }
 if(diff>=tolerance)throw new Error('RT source iteration did not converge: '+diff);
 const depths=[0,.5,1,2,3,5,7,10,15,20];
 const rows=depths.map(depth=>{
  const k=z.findIndex(v=>Math.abs(v-depth)<1e-10);if(k<0)throw new Error('Depth grid mismatch');
  let Ed=direct[k],Eu=0;
  for(let i=0;i<n;i++){const flux=2*Math.PI*w[i]*Math.abs(mu[i])*intensity[i][k];if(mu[i]>0)Ed+=flux;else Eu+=flux;}
  return {Ed:Number(Ed.toPrecision(9)),Eu:Number(Eu.toPrecision(9)),Lu:mu.map((m,i)=>m<0?Number(intensity[i][k].toPrecision(8)):null)};
 });
 const kd=rows.map((row,i)=>{
  if(i===0)return -Math.log(rows[1].Ed/row.Ed)/.5;
  if(i===rows.length-1)return -Math.log(row.Ed/rows[i-1].Ed)/(depths[i]-depths[i-1]);
  return -Math.log(rows[i+1].Ed/rows[i-1].Ed)/(depths[i+1]-depths[i-1]);
 });
 return {a,bb,b,mu0,sza,depths,Ed:rows.map(r=>r.Ed),Eu:rows.map(r=>r.Eu),Kd:kd.map(v=>Number(v.toPrecision(9))),Lu:rows.map(r=>r.Lu),
  rrs:Number((rows[0].Lu[0]/rows[0].Ed).toPrecision(8)),iterations,residual:Number(diff.toExponential(4))};
}
