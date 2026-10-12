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

const matches=reports.filter(({data})=>
  String(data.finalUrl||data.requestedUrl||'').includes('instrument=water')
);
if(!matches.length){
  throw new Error('A8 Lighthouse summary: no Water instrument report found. Keep the Water deep-link in lighthouserc.json.');
}

const metric=(data,id)=>Number(data.audits?.[id]?.numericValue);
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
  return values[Math.floor(values.length/2)];
};
const summary={
  url:rows[0].url,
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
