import { readFile, writeFile, mkdir } from 'node:fs/promises';

const WOPP_URL='https://raw.githubusercontent.com/eoplus/rho/527c59a51d52e522aa7c8c0c13044e7ebd10357e/data-raw/purewater_abs_coefficients_v3.dat';
const BRICAUD_A_URL='https://raw.githubusercontent.com/RemoteSensingTools/OceanOptics.jl/main/data/bricaud_1998_A.csv';
const BRICAUD_E_URL='https://raw.githubusercontent.com/RemoteSensingTools/OceanOptics.jl/main/data/bricaud_1998_E.csv';
const outDir=new URL('../site/water/data/',import.meta.url);
const dataJsUrl=new URL('../site/water/water-data.js',import.meta.url);

function nfmt(x){ return Number(x.toPrecision(12)).toString(); }
async function get(url){
  const response=await fetch(url);
  if(!response.ok) throw new Error(`${url}: ${response.status}`);
  return response.text();
}
function parseWopp(text){
  return text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('%')).map(line=>{
    const p=line.split(/\s+/).map(Number);
    return {lambda:p[0],a:p[1],dads:p[2]};
  }).filter(r=>Number.isFinite(r.lambda));
}
function parseCsv(text,key){
  return text.split(/\r?\n/).map(s=>s.trim()).filter(s=>s&&!s.startsWith('#')&&!s.startsWith('lambda_nm')).map(line=>{
    const [lambda,value]=line.split(',').map(Number);
    return {lambda,[key]:value};
  });
}
function interp(rows,lambda,key){
  let lo=null;
  for(const r of rows){
    if(r.lambda===lambda) return r[key];
    if(r.lambda<lambda) lo=r;
    if(r.lambda>lambda && lo){
      const t=(lambda-lo.lambda)/(r.lambda-lo.lambda);
      return lo[key]+t*(r[key]-lo[key]);
    }
  }
  throw new Error(`No interpolation bracket for ${key} at ${lambda}`);
}
function zhangB(lambdaNm,Tc=20,S=35){
  const Na=6.0221417930e23,Kbz=1.3806503e-23,M0=18e-3,delta=0.039;
  const um=lambdaNm/1000;
  const nAir=1+(5792105/(238.0185-1/um**2)+167917/(57.362-1/um**2))*1e-8;
  const n0=1.31405,n1=1.779e-4,n2=-1.05e-6,n3=1.6e-8,n4=-2.02e-6,n5=15.868,n6=0.01155,n7=-0.00423,n8=-4382,n9=1.1455e6;
  const nsw=(n0+(n1+n2*Tc+n3*Tc**2)*S+n4*Tc**2+(n5+n6*S+n7*Tc)/lambdaNm+n8/lambdaNm**2+n9/lambdaNm**3)*nAir;
  const dnds=(n1+n2*Tc+n3*Tc**2+n6/lambdaNm)*nAir;
  const kw=19652.21+148.4206*Tc-2.327105*Tc**2+1.360477e-2*Tc**3-5.155288e-5*Tc**4;
  const ka=54.6746-0.603459*Tc+1.09987e-2*Tc**2-6.167e-5*Tc**3;
  const kb=7.944e-2+1.6483e-2*Tc-5.3009e-4*Tc**2;
  const betaT=1/(kw+ka*S+kb*S**1.5)*1e-5;
  const rhoW=999.842594+6.793952e-2*Tc-9.09529e-3*Tc**2+1.001685e-4*Tc**3-1.120083e-6*Tc**4+6.536332e-9*Tc**5;
  const rho=rhoW+(8.24493e-1-4.0899e-3*Tc+7.6438e-5*Tc**2-8.2467e-7*Tc**3+5.3875e-9*Tc**4)*S+(-5.72466e-3+1.0227e-4*Tc-1.6546e-6*Tc**2)*S**1.5+4.8314e-4*S**2;
  const dlna=(-5.58651e-4+2.40452e-7*Tc-3.12165e-9*Tc**2+2.40808e-11*Tc**3)+1.5*(1.79613e-5-9.9422e-8*Tc+2.08919e-9*Tc**2-1.39872e-11*Tc**3)*S**0.5+2*(-2.31065e-6-1.37674e-9*Tc-1.93316e-11*Tc**2)*S;
  const n2sq=nsw**2;
  const dfri=(n2sq-1)*(1+(2/3)*(n2sq+2)*(nsw/3-1/(3*nsw))**2);
  const lm=lambdaNm*1e-9,cab=(6+6*delta)/(6-7*delta);
  const betaDf=(Math.PI**2/2)*lm**-4*Kbz*(Tc+273.15)*betaT*dfri**2*cab;
  const flu=S*M0*dnds**2/rho/(-dlna)/Na;
  const betaCf=2*Math.PI**2*lm**-4*nsw**2*flu*cab;
  return (8*Math.PI/3)*(betaDf+betaCf)*(2+delta)/(1+delta);
}

const [woppText,aText,eText]=await Promise.all([get(WOPP_URL),get(BRICAUD_A_URL),get(BRICAUD_E_URL)]);
const wopp=parseWopp(woppText),brA=parseCsv(aText,'A'),brE=parseCsv(eText,'B');
const wavelengthNm=Array.from({length:301},(_,i)=>400+i);
const aw=wavelengthNm.map(l=>interp(wopp,l,'a')+35*interp(wopp,l,'dads'));
const bbw=wavelengthNm.map(l=>0.5*zhangB(l));
const A=wavelengthNm.map(l=>interp(brA,l,'A'));
const B=wavelengthNm.map(l=>interp(brE,l,'B'));
const E=B.map(v=>1-v);

await mkdir(outDir,{recursive:true});
await writeFile(new URL('pure-water-20c-35psu.csv',outDir),['lambda_nm,aw_m_inv,bbw_m_inv',...wavelengthNm.map((l,i)=>`${l},${nfmt(aw[i])},${nfmt(bbw[i])}`)].join('\n')+'\n');
await writeFile(new URL('bricaud-1998-aph.csv',outDir),['lambda_nm,A_m2_per_mg,B_specific,E_total',...wavelengthNm.map((l,i)=>`${l},${nfmt(A[i])},${nfmt(B[i])},${nfmt(E[i])}`)].join('\n')+'\n');
await writeFile(dataJsUrl,`(() => {
  'use strict';
  window.GeoWaterData=Object.freeze({
    meta:Object.freeze({version:'water-data-v1',wavelengthMinNm:400,wavelengthMaxNm:700,wavelengthStepNm:1,temperatureC:20,salinityPsu:35}),
    wavelengthNm:Object.freeze(${JSON.stringify(wavelengthNm)}),
    aw:Object.freeze(${JSON.stringify(aw.map(v=>Number(v.toPrecision(12))))}),
    bbw:Object.freeze(${JSON.stringify(bbw.map(v=>Number(v.toPrecision(12))))}),
    bricaudA:Object.freeze(${JSON.stringify(A.map(v=>Number(v.toPrecision(12))))}),
    bricaudBSpecific:Object.freeze(${JSON.stringify(B.map(v=>Number(v.toPrecision(12))))}),
    bricaudETotal:Object.freeze(${JSON.stringify(E.map(v=>Number(v.toPrecision(12))))})
  });
})();\n`);
console.log('Generated Water as Spectrum scientific assets.');
