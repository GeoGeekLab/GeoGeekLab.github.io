/* Water as Spectrum V9: local noise-assumption/Fisher diagnostics, not field uncertainty.
 * Independent, homoscedastic Gaussian Rrs band errors are USER ASSUMPTIONS.
 * Parameter scaling is explicit and stable even for near-zero parameter values.
 * Full-rank covariance is withheld for rank-deficient Jacobians.
 * Data acquisition and forward models remain outside this module. */
((root)=>{
'use strict';
const PARAMETERS=Object.freeze([
 {id:'chl',label:'Chl-a',scale:1,unit:'mg m⁻³'},
 {id:'ag',label:'CDOM a_g(440)',scale:.1,unit:'m⁻¹'},
 {id:'anap',label:'NAP a_NAP(443)',scale:.1,unit:'m⁻¹'},
 {id:'bbp',label:'Particle b_bp(443)',scale:.01,unit:'m⁻¹'},
 {id:'eta',label:'Backscatter exponent η',scale:1,unit:'dimensionless'}
]);
const IDS=PARAMETERS.map(p=>p.id);
const SIGMAS=Object.freeze([.000005,.00002,.0001]);
const STEPS=Object.freeze([1,5,10]);
function requireFiniteNumber(n,tag){
 if(!Number.isFinite(n))throw new RangeError('Invalid '+tag);
 return n;
}
function eigensystemSymmetric(matrix){
 const n=matrix.length;
 const A=matrix.map(x=>x.slice()),V=Array.from({length:n},(_,i)=>Array.from({length:n},(_,j)=>+(i===j)));
 if(!n)return {values:[],vectors:[]};
 const maxAbs=Math.max(1,...A.flat().map(Math.abs));
 for(let iteration=0;iteration<200;iteration++){
  let p=0,q=0,m=0;
  for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){let v=Math.abs(A[i][j]);if(v>m){p=i;q=j;m=v;}}
  if(m<maxAbs*1e-13)break;
  const tau=(A[q][q]-A[p][p])/(2*A[p][q]);
  const t=(tau>=0?1:-1)/(Math.abs(tau)+Math.sqrt(1+tau*tau));
  const c=1/Math.sqrt(1+t*t),s=t*c;
  const app=A[p][p],aqq=A[q][q],apq=A[p][q];
  A[p][p]=app-t*apq;A[q][q]=aqq+t*apq;A[p][q]=A[q][p]=0;
  for(let k=0;k<n;k++){
   if(k!==p&&k!==q){const akp=A[k][p],akq=A[k][q];
    A[k][p]=A[p][k]=c*akp-s*akq;
    A[k][q]=A[q][k]=s*akp+c*akq;}
   const vkp=V[k][p],vkq=V[k][q];
   V[k][p]=c*vkp-s*vkq;V[k][q]=s*vkp+c*vkq;
  }
 }
 const sorted=Array.from({length:n},(_,i)=>i).sort((a,b)=>A[b][b]-A[a][a]);
 return {values:sorted.map(i=>Math.max(0,A[i][i])),vectors:sorted.map(j=>V.map(row=>row[j]))};
}
function diagnoseFisher(jacobian,sigma,scales){
 const k=scales.length,n=jacobian.length;
 const F=Array.from({length:k},()=>Array(k).fill(0));
 for(const row of jacobian)for(let i=0;i<k;i++)for(let j=0;j<=i;j++)F[i][j]+=row[i]*row[j]/(sigma*sigma);
 for(let i=0;i<k;i++)for(let j=i+1;j<k;j++)F[i][j]=F[j][i];
 const e=eigensystemSymmetric(F),max=e.values[0]||0;
 const cutoff=Math.max(max*1e-9,1e-12);
 const rank=e.values.filter(v=>v>cutoff).length,identifiable=rank===k&&n>=k;
 const condition=identifiable?Math.sqrt(max/e.values[k-1]):null;
 let covariance=null,correlation=null,uncertainties=null;
 if(identifiable){
  const c=Array.from({length:k},()=>Array(k).fill(0));
  for(let j=0;j<k;j++)for(let i=0;i<k;i++)for(let h=0;h<k;h++){
   c[i][h]+=e.vectors[j][i]*e.vectors[j][h]/e.values[j]*scales[i]*scales[h];
  }
  covariance=c;
  uncertainties=Array.from({length:k},(_,i)=>Math.sqrt(Math.max(0,c[i][i])));
  correlation=Array.from({length:k},(_,i)=>Array.from({length:k},(_,j)=>
   uncertainties[i]>0&&uncertainties[j]>0?Math.max(-1,Math.min(1,c[i][j]/(uncertainties[i]*uncertainties[j]))):null));
 }
 // Null direction: not a numerical "solution"; indicates a locally degenerate parameter combination.
 const weakest=e.vectors.at(-1)||[];
 return {fisher:F,eigenvalues:e.values,rank,cutoff,identifiable,condition,
  covariance,correlation,uncertainties,weakestDirection:weakest,weakestEigenvalue:e.values.at(-1)||0,
  status:!identifiable?'rank-deficient':condition>1e3?'ill-conditioned':'full-rank'};
}
function analyze({models,params,bounds,sample,selected=['chl','ag'],noiseSigma=.00002,stepPercent=5}){
 if(!models||typeof models.run!=='function'||typeof sample!=='function')throw new Error('Model and observation callbacks required');
 if(!Array.isArray(selected)||!selected.length||selected.length>5||new Set(selected).size!==selected.length||selected.some(x=>!IDS.includes(x)))throw new Error('Invalid parameter selection');
 if(!SIGMAS.includes(noiseSigma))throw new Error('Unsupported hypothetical noise sigma');
 if(!STEPS.includes(stepPercent))throw new Error('Unsupported finite difference step');
 const channels=(p)=>sample(models.run(p));
 const baseline=channels(params);
 if(!baseline||!Array.isArray(baseline.bands))throw new Error('No sensor observation');
 const refs=baseline.bands.filter(b=>b.status==='full'&&Number.isFinite(b.value));
 const validIndex=refs.map(b=>baseline.bands.findIndex(x=>x.id===b.id));
 const selectedDefs=selected.map(id=>PARAMETERS.find(p=>p.id===id));
 const columns=[],perturbations=[];
 for(const def of selectedDefs){
  const key=def.id,base=requireFiniteNumber(params[key],key);
  const range=bounds?.[key]||{min:0,max:Math.max(1,base*2)};
  let h=Math.max(def.scale*stepPercent/100,Math.abs(base)*stepPercent/100,def.scale*1e-6);
  const lo=Math.max(range.min,base-h),hi=Math.min(range.max,base+h);
  if(!(hi>lo))throw new Error('Cannot perturb '+key+' within model domain');
  const below={...params,[key]:lo},above={...params,[key]:hi};
  const bottom=channels(below).bands,top=channels(above).bands;
  const differential=validIndex.map(index=>{
   const low=bottom[index],high=top[index];
   if(low?.status!=='full'||high?.status!=='full'||!Number.isFinite(low.value)||!Number.isFinite(high.value))return null;
   return (high.value-low.value)/(hi-lo);
  });
  columns.push(differential);
  perturbations.push({parameter:key,baseline:base,lower:lo,upper:hi,mode:lo===base?'forward':hi===base?'backward':'central',stepSize:hi-lo,
    derivativeUnit:'sr⁻¹ / '+def.unit,scale:def.scale});
 }
 const retained=refs.map((b,row)=>({bandId:b.id,centerNm:b.centerNm,referenceRrs:b.value,
  derivatives:columns.map(col=>col[row])})).filter(item=>item.derivatives.every(Number.isFinite));
 const dropped=baseline.bands.filter(b=>b.status!=='full').map(b=>({id:b.id,status:b.status,coverageFraction:b.coverageFraction??null}));
 const J=retained.map(row=>row.derivatives.map((v,i)=>v*selectedDefs[i].scale));
 const diagnosis=diagnoseFisher(J,noiseSigma,selectedDefs.map(p=>p.scale));
 let pair={first:null,second:null,cosine:null};
 for(let i=0;i<selected.length;i++)for(let j=i+1;j<selected.length;j++){
  let dot=0,ni=0,nj=0;
  for(const row of J){dot+=row[i]*row[j];ni+=row[i]*row[i];nj+=row[j]*row[j];}
  const value=ni>0&&nj>0?dot/Math.sqrt(ni*nj):null;
  if(value!==null&&(pair.cosine===null||Math.abs(value)>Math.abs(pair.cosine)))pair={first:selected[i],second:selected[j],cosine:value};
 }
 return {
  kind:'v9-local-fisher-diagnostics',scope:'hypothetical independent, homoscedastic Gaussian error in band-averaged Rrs; linearized around selected model state; no calibration or field validation',
  selected,definitions:selectedDefs,noise:{type:'independent-constant-sigma',sigmaRrsSr1:noiseSigma,source:'user-assumed, not instrument specification'},
  stepPercent,perturbations,observations:retained,dropped,numberOfMeasurements:retained.length,numberOfParameters:selected.length,
  source:{sensor:baseline.sensor?.label||baseline.sensor?.id||null,responseModel:baseline.responseModel,platform:baseline.platform,provenance:baseline.provenance||null},
  pairwiseColumnCosine:pair,...diagnosis,
  interpretation:diagnosis.identifiable?
   'Formal local 1-sigma covariance is conditional on the chosen parameters, noise assumption and linearization. It is not a validated retrieval uncertainty.' :
   'The selected parameter combination is not locally identifiable under these available bands. Formal finite covariance is withheld.'
 };
}
root.GeoGeekV9Engine=Object.freeze({PARAMETERS,IDS,SIGMAS,STEPS,eigensystemSymmetric,diagnoseFisher,analyze});
})(globalThis);
