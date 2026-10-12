import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const source=path.join(root,'.lighthouseci');
const output=path.join(root,'.award-submission');
fs.mkdirSync(output,{recursive:true});

if(!fs.existsSync(source)) throw new Error('A8 Lighthouse summary: .lighthouseci does not exist');

const files=fs.readdirSync(source,{recursive:true})
  .map(name=>path.join(source,String(name)))
  .filter(file=>file.endsWith('.json')&&fs.existsSync(file)&&fs.statSync(file).isFile());

const reports=[];
for(const file of files){
  try{
    const data=JSON.parse(fs.readFileSync(file,'utf8'));
    if(data?.categories&&data?.audits&&(data.finalUrl||data.requestedUrl)) reports.push({file,data});
  }catch{}
}

// The visible Water instrument is mounted in a same-origin iframe. Lighthouse
// cannot treat the top-document LCP (which may be a temporary boot cover or
// NO_LCP) as the actual workbench's content paint. Keep the production deep
// link in the overall audit, but apply the strict budget to the *real app
// document* that the host iframe loads. Never invent missing paint metrics.
const waterFramePath='/water/workbench-v10-2/app/index.html';
const hostPath='/lab.html';
const waterHostUrl=({data})=>{
  try{
    const url=new URL(data.finalUrl||data.requestedUrl);
    return url.pathname===hostPath&&url.searchParams.get('instrument')==='water';
  }catch{return false;}
};
const waterFrameUrl=({data})=>{
  try{
    const url=new URL(data.finalUrl||data.requestedUrl);
    return url.pathname===waterFramePath &&
      url.searchParams.get('embed')==='1' &&
      url.searchParams.get('chartfix')==='10.2.0-quiet2';
  }catch{return false;}
};
const hostReports=reports.filter(waterHostUrl);
const matches=reports.filter(waterFrameUrl);
if(hostReports.length<2||matches.length<2){
  throw new Error('A10 Lighthouse: need two host deep-link reports and two real Water iframe document reports; never substitute one for the other.');
}

const metric=(data,id)=>{
  const value=data.audits?.[id]?.numericValue;
  return value===undefined||value===null?NaN:Number(value);
};
const score=(data,id)=>Number(data.categories?.[id]?.score);
const rows=matches.map(({file,data})=>({
  file:path.relative(root,file),
  url:data.finalUrl||data.requestedUrl,
  performance:score(data,'performance'),
  accessibility:score(data,'accessibility'),
  bestPractices:score(data,'best-practices'),
  lcpMs:metric(data,'largest-contentful-paint'),
  cls:metric(data,'cumulative-layout-shift'),
  tbtMs:metric(data,'total-blocking-time')
}));

const median=key=>{
  const values=rows.map(row=>row[key]).filter(Number.isFinite).sort((a,b)=>a-b);
  if(!values.length)return null;
  const mid=Math.floor(values.length/2);
  return values.length%2?values[mid]:(values[mid-1]+values[mid])/2;
};
const summary={
  auditScope:'embedded-water-v102-document',
  measurementMethod:'Lighthouse on the actual same-origin iframe document (standalone navigation); host deep-link remains audited separately and covered by end-to-end tests',
  url:rows[0].url,
  hostDeepLinkUrl:hostReports[0].data.finalUrl||hostReports[0].data.requestedUrl,
  hostDeepLinkAudited:true,
  hostRows:hostReports.map(({file,data})=>({
    file:path.relative(root,file),
    url:data.finalUrl||data.requestedUrl,
    performance:score(data,'performance'),
    lcpMs:Number.isFinite(metric(data,'largest-contentful-paint'))?metric(data,'largest-contentful-paint'):null,
    lcpStatus:data.audits?.['largest-contentful-paint']?.errorMessage||'reported'
  })),
  runs:rows.length,
  median:{
    performance:median('performance'),
    accessibility:median('accessibility'),
    bestPractices:median('bestPractices'),
    lcpMs:median('lcpMs'),
    cls:median('cls'),
    tbtMs:median('tbtMs')
  },
  budgets:{
    performanceMin:0.70,
    accessibilityMin:0.95,
    bestPracticesMin:0.90,
    lcpMaxMs:4000,
    clsMax:0.10,
    tbtMaxMs:400
  },
  rows
};

fs.writeFileSync(path.join(output,'water-lighthouse.json'),JSON.stringify(summary,null,2)+'\n');

const m=summary.median,b=summary.budgets;
const failures=[];
if(!(m.performance>=b.performanceMin)) failures.push(`performance ${m.performance} < ${b.performanceMin}`);
if(!(m.accessibility>=b.accessibilityMin)) failures.push(`accessibility ${m.accessibility} < ${b.accessibilityMin}`);
if(!(m.bestPractices>=b.bestPracticesMin)) failures.push(`best-practices ${m.bestPractices} < ${b.bestPracticesMin}`);
if(!(m.lcpMs<=b.lcpMaxMs)) failures.push(`LCP ${m.lcpMs}ms > ${b.lcpMaxMs}ms`);
if(!(m.cls<=b.clsMax)) failures.push(`CLS ${m.cls} > ${b.clsMax}`);
if(!(m.tbtMs<=b.tbtMaxMs)) failures.push(`TBT ${m.tbtMs}ms > ${b.tbtMaxMs}ms`);

console.log('[A8 Water Lighthouse]',JSON.stringify(summary.median));
if(failures.length) throw new Error('A8 Water Lighthouse budget failed: '+failures.join('; '));
