import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dataDir=path.join(ROOT,'site','water','data');
const sourceDir=path.join(dataDir,'source');
const woppRaw=fs.readFileSync(path.join(sourceDir,'wopp-purewater-absorption-v3-400-700.tsv'),'utf8');
const bricaudRaw=fs.readFileSync(path.join(sourceDir,'bricaud-1998-aph-400-700.csv'),'utf8');

const woppRows=woppRaw.split(/\r?\n/).map(x=>x.trim()).filter(x=>x&&!x.startsWith('%')).map(x=>x.split(/\s+/).map(Number));
const bricaudRows=bricaudRaw.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^\d/.test(x)).map(x=>x.split(',').map(Number));
const wavelengths=Array.from({length:301},(_,i)=>400+i);
const round=(x,n=12)=>Number(x.toFixed(n));

function interp(rows,wl,column){
  const exact=rows.find(r=>r[0]===wl); if(exact)return exact[column];
  let lo=null,hi=null;
  for(const r of rows){if(r[0]<wl)lo=r;if(r[0]>wl){hi=r;break;}}
  if(!lo||!hi)throw new Error('Interpolation out of range: '+wl);
  const t=(wl-lo[0])/(hi[0]-lo[0]); return lo[column]+(hi[column]-lo[column])*t;
}

function seawaterBackscatter(wl,Tc=20,S=35){
  const delta=0.039,Na=6.0221417930e23,Kbz=1.3806503e-23,Tk=Tc+273.15,M0=18e-3;
  const nAir=1+(5792105/(238.0185-1/(wl/1e3)**2)+167917/(57.362-1/(wl/1e3)**2))/1e8;
  const n0=1.31405,n1=1.779e-4,n2=-1.05e-6,n3=1.6e-8,n4=-2.02e-6,n5=15.868,n6=0.01155,n7=-0.00423,n8=-4382,n9=1.1455e6;
  let nsw=n0+(n1+n2*Tc+n3*Tc**2)*S+n4*Tc**2+(n5+n6*S+n7*Tc)/wl+n8/wl**2+n9/wl**3; nsw*=nAir;
  const dnds=(n1+n2*Tc+n3*Tc**2+n6/wl)*nAir;
  const kw=19652.21+148.4206*Tc-2.327105*Tc**2+1.360477e-2*Tc**3-5.155288e-5*Tc**4;
  const ka=54.6746-0.603459*Tc+1.09987e-2*Tc**2-6.167e-5*Tc**3;
  const kb=7.944e-2+1.6483e-2*Tc-5.3009e-4*Tc**2;
  const isoComp=1/(kw+ka*S+kb*S**1.5)*1e-5;
  const densityW=999.842594+6.793952e-2*Tc-9.09529e-3*Tc**2+1.001685e-4*Tc**3-1.120083e-6*Tc**4+6.536332e-9*Tc**5;
  const densitySW=densityW+((8.24493e-1-4.0899e-3*Tc+7.6438e-5*Tc**2-8.2467e-7*Tc**3+5.3875e-9*Tc**4)*S+(-5.72466e-3+1.0227e-4*Tc-1.6546e-6*Tc**2)*S**1.5+4.8314e-4*S**2);
  const dlnawds=(-5.58651e-4+2.40452e-7*Tc-3.12165e-9*Tc**2+2.40808e-11*Tc**3)+1.5*(1.79613e-5-9.9422e-8*Tc+2.08919e-9*Tc**2-1.39872e-11*Tc**3)*S**0.5+2*(-2.31065e-6-1.37674e-9*Tc-1.93316e-11*Tc**2)*S;
  const n2sw=nsw**2,dfri=(n2sw-1)*(1+(2/3)*(n2sw+2)*(nsw/3-1/(3*nsw))**2),factor=(6+6*delta)/(6-7*delta),lam=wl*1e-9;
  const betaDf=Math.PI**2/2*lam**(-4)*Kbz*Tk*isoComp*dfri**2*factor;
  const fluCon=S*M0*dnds**2/densitySW/(-dlnawds)/Na;
  const betaCf=2*Math.PI**2*lam**(-4)*nsw**2*fluCon*factor;
  return (8*Math.PI/3*(betaDf+betaCf)*(2+delta)/(1+delta))/2;
}

const pureWater=wavelengths.map(wl=>[wl,round(interp(woppRows,wl,1)+35*interp(woppRows,wl,2)),round(seawaterBackscatter(wl))]);
const bricaud=wavelengths.map(wl=>[wl,round(interp(bricaudRows,wl,3)),round(interp(bricaudRows,wl,4))]);
fs.writeFileSync(path.join(dataDir,'pure-water-20c-35psu.csv'),['wavelength_nm,aw_m-1,bbw_m-1',...pureWater.map(r=>r.join(','))].join('\n')+'\n');
fs.writeFileSync(path.join(dataDir,'bricaud-1998-aph.csv'),['wavelength_nm,Aphi,Ephi',...bricaud.map(r=>r.join(','))].join('\n')+'\n');

const meta={"wavelengthMinNm":400,"wavelengthMaxNm":700,"wavelengthStepNm":1,"temperatureC":20,"salinityPsu":35,"g0":0.0949,"g1":0.0794,"cdomSlopeNm1":0.0176,"napSlopeNm1":0.0123,"particleBackscatterReferenceNm":443,"cdomReferenceNm":440,"napReferenceNm":443};
const referenceStates={"clearOcean":{"chl":0.1,"ag440":0.02,"aNap443":0.005,"bbp443":0.0007,"eta":1},"phytoplanktonRich":{"chl":10,"ag440":0.05,"aNap443":0.02,"bbp443":0.005,"eta":1},"cdomRich":{"chl":1,"ag440":0.8,"aNap443":0.02,"bbp443":0.002,"eta":1},"turbidParticleRich":{"chl":2,"ag440":0.1,"aNap443":0.5,"bbp443":0.02,"eta":1}};
const js=`// GENERATED FILE. Run: node scripts/build-water-optics-data.mjs
// Water as Spectrum V1 quantitative domain: 400-700 nm, 1 nm.
// Pure-water baseline: WOPP v3 absorption at 20 C / 35 PSU and Zhang et al. (2009) seawater backscattering.
// Phytoplankton coefficients: Bricaud et al. (1998), total aphi = Aphi * Chl^Ephi.

export const WATER_MODEL_META = Object.freeze(${JSON.stringify(meta,null,2)});
export const WATER_WAVELENGTHS_NM = Object.freeze(${JSON.stringify(wavelengths)});
export const PURE_WATER_A_M1 = Object.freeze(${JSON.stringify(pureWater.map(r=>r[1]))});
export const PURE_WATER_BB_M1 = Object.freeze(${JSON.stringify(pureWater.map(r=>r[2]))});
export const BRICAUD_APHI_A = Object.freeze(${JSON.stringify(bricaud.map(r=>r[1]))});
export const BRICAUD_APHI_E = Object.freeze(${JSON.stringify(bricaud.map(r=>r[2]))});
export const WATER_REFERENCE_STATES = Object.freeze(${JSON.stringify(referenceStates,null,2)});
`;
fs.writeFileSync(path.join(ROOT,'site','water','water-data.js'),js);
console.log('Generated Water as Spectrum V1 data assets.');
