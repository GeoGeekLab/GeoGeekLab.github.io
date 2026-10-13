import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const dir=path.join(root,'.award-submission');
const expected={
  release:'20261013a12',
  baselineCommit:'9718171862959c9232e1dd7b4f69d31c36b0bc75',
  science:'10.2.0-quiet2',
  concept:'award-a3',
  polish:'award-a5',
  host:'award-a4',
  hostPolish:'award-a5'
};
const frames=[
  '01-water-spectrum-desktop.png',
  '02-water-rt-desktop.png',
  '03-water-atmosphere-desktop.png',
  '04-water-rt-desktop-1280.png',
  '05-water-rt-desktop-detail.png',
  '06-pulse-family-desktop.png'
];

function fail(message){throw new Error('A10 candidate gate: '+message);}
function readJson(file){
  const target=path.join(dir,file);
  if(!fs.existsSync(target)) fail(file+' is missing');
  return JSON.parse(fs.readFileSync(target,'utf8'));
}

const manifest=readJson('manifest.json');
if(manifest.release!==expected.release) fail('release mismatch');
if(manifest.baselineCommit!==expected.baselineCommit) fail('baseline commit mismatch');
if(manifest.versions?.waterScience!==expected.science) fail('Water science version mismatch');
if(manifest.versions?.waterConcept!==expected.concept) fail('Water concept version mismatch');
if(manifest.versions?.waterPolish!==expected.polish) fail('Water polish version mismatch');
if(manifest.versions?.observatoryHost!==expected.host) fail('Observatory host version mismatch');
if(manifest.versions?.hostPolish!==expected.hostPolish) fail('host polish version mismatch');
if(manifest.capturePolicy?.realControlsOnly!==true) fail('capture must use real controls');
if(manifest.capturePolicy?.injectedScientificValues!==false) fail('capture cannot inject scientific values');

if(process.env.GITHUB_SHA&&manifest.branchHead!==process.env.GITHUB_SHA){
  fail('capture branchHead '+manifest.branchHead+' does not match workflow SHA '+process.env.GITHUB_SHA);
}

for(const file of frames){
  const target=path.join(dir,file);
  if(!fs.existsSync(target)) fail(file+' is missing');
  const size=fs.statSync(target).size;
  if(size<20000) fail(file+' is unexpectedly small ('+size+' bytes)');
}
if(manifest.shots?.length!==frames.length) fail('manifest must contain six curated frames');

const lighthouse=readJson('water-lighthouse.json');
if(lighthouse.auditScope!=='embedded-water-v102-document') fail('strict Lighthouse audit must target the real Water app document');
if(lighthouse.hostDeepLinkAudited!==true||!lighthouse.hostDeepLinkUrl?.includes('instrument=water')) {
  fail('original Lab deep-link must remain independently audited');
}
if(!lighthouse.url?.includes('/water/workbench-v10-2/app/index.html')||
  lighthouse.runs<2||lighthouse.hostRows?.length<2){
  fail('two real workbench and two host Lighthouse reports are required');
}
const m=lighthouse.median||{};
const b=lighthouse.budgets||{};
const checks=[
  ['performance',m.performance,b.performanceMin,(v,t)=>v>=t],
  ['accessibility',m.accessibility,b.accessibilityMin,(v,t)=>v>=t],
  ['best practices',m.bestPractices,b.bestPracticesMin,(v,t)=>v>=t],
  ['LCP',m.lcpMs,b.lcpMaxMs,(v,t)=>v<=t],
  ['CLS',m.cls,b.clsMax,(v,t)=>v<=t],
  ['TBT',m.tbtMs,b.tbtMaxMs,(v,t)=>v<=t]
];
for(const [name,value,threshold,pass] of checks){
  if(!Number.isFinite(value)||!Number.isFinite(threshold)||!pass(value,threshold)){
    fail(name+' budget is not satisfied');
  }
}

const verdict={
  status:'submission-review-ready',
  generatedAt:new Date().toISOString(),
  workflowSha:process.env.GITHUB_SHA||manifest.branchHead||null,
  release:expected.release,
  baselineCommit:expected.baselineCommit,
  versions:{
    waterScience:expected.science,
    waterConcept:expected.concept,
    waterPolish:expected.polish,
    observatoryHost:expected.host,
    hostPolish:expected.hostPolish
  },
  evidence:{
    curatedFrames:frames,
    lighthouse:'water-lighthouse.json',
    fullBrowserGate:'passed before this step by workflow ordering'
  },
  caveat:'Technical readiness does not predict or guarantee any award-jury outcome.'
};

fs.writeFileSync(path.join(dir,'release-readiness.json'),JSON.stringify(verdict,null,2)+'\n');
console.log('[A10 candidate gate] submission-review-ready',verdict.workflowSha);
