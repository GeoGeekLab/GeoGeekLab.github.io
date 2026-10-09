import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../../workbench-v9/analysis/uncertainty-engine.js';
import '../v102-uncertainty-views.js';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const E=globalThis.GeoGeekV9Engine;
const V=globalThis.GeoGeekV102UncertaintyViews;
const metadata={chl:{min:.02,max:25},ag:{min:0,max:2},anap:{min:0,max:1},bbp:{min:.0001,max:.03},eta:{min:0,max:3}};
const params={chl:1,ag:.05,anap:.02,bbp:.002,eta:1};
function experiment(selected=['chl','ag'],fn=(p)=>[
 .0001*p.chl+.003*p.ag,.0002*p.chl-.001*p.ag,.00015*p.chl]){
 const models={run:p=>({bands:fn(p)})};
 const sample=d=>({sensor:{label:'Test optical sensor'},responseModel:'nominal-rectangular',
  bands:d.bands.map((v,i)=>({id:'B'+(i+1),centerNm:440+i*55,value:v,status:'full'}))});
 return E.analyze({models,sample,selected,params,bounds:metadata,noiseSigma:.00002,stepPercent:5});
}
function moduleRequire(){
 const from=app.indexOf('const __factories='),to=app.indexOf('</script>',from);
 assert.ok(from>0&&to>from);
 return new Function(app.slice(from,to).replace("__require('main.js');","return __require;"))();
}
test('UX-051: summary distinguishes formal 1sigma from retrieval accuracy and reports weakest direction',()=>{
 const x=experiment();assert.equal(x.identifiable,true);
 const html=V.summary(x);
 for(const phrase of ['Local identifiability','not retrieval error','conditional 1σ',
 'Most coupled Jacobian columns','cosine similarity','Weakest Fisher eigenmode','Σ = σ²I',
 'Test optical sensor','nominal-rectangular','not proof'])assert.ok(html.includes(phrase),phrase);
 assert.equal((html.match(/class="u9-uncertainty-item"/g)||[]).length,2);
});
test('UX-052: Jacobian uses a semantic keyboard-scroll table and displays signed physical units',()=>{
 const x=experiment(),html=V.jacobian(x);
 assert.match(html,/<table class="u102-matrix-table">/);
 assert.match(html,/<caption>Physical-unit Jacobian/);
 assert.match(html,/<th scope="row">/);
 assert.match(html,/<th scope="col">/);
 assert.match(html,/tabindex="0"/);
 assert.match(html,/sr⁻¹ \/ mg m⁻³/);
 assert.match(html,/sr⁻¹ \/ m⁻¹/);
 assert.match(html,/column j: intensity =/);
 assert.match(html,/separately for each parameter/);
 assert.match(html,/column strength 1\.00 \/ 1/);
 assert.match(html,/Bounded finite differences/);
 assert.match(html,/class="u102-numeric"/);
});
test('UX-053: column cosine and inverse-Fisher correlation are distinct matrices',()=>{
 const x=experiment();
 const matrices=V.correlations(x);
 assert.match(matrices,/Jacobian column cosine similarity · NOT parameter correlation/);
 assert.match(matrices,/Inverse-Fisher parameter correlation · conditional on Σ = σ²I/);
 assert.match(matrices,/conditional covariance matrix with physical parameter units/);
 assert.match(matrices,/C = \(JᵀΣ⁻¹J\)⁻¹/);
 assert.equal((matrices.match(/<table class="u102-matrix-table">/g)||[]).length,3);
 const cosine=V.columnCosines(x);
 assert.equal(cosine[0][0],1);
 assert.equal(cosine[1][1],1);
 assert.ok(Math.abs(cosine[0][1])<1);
 assert.ok(Math.abs(cosine[0][1]-x.correlation[0][1])>.01,
  'Cosine must not be the Fisher correlation coefficient');
});
test('UX-053: deficient and zero-column experiments do not imply finite covariance',()=>{
 const x=experiment(['chl','ag','anap'],p=>[p.chl*.0001+p.ag*.003,p.chl*.0002-p.ag*.001]);
 assert.equal(x.identifiable,false);
 const html=V.correlations(x);
 assert.match(html,/No inverse Fisher covariance or parameter correlation matrix is reported/);
 assert.doesNotMatch(html,/Inverse-Fisher parameter correlation · conditional on Σ = σ²I/);
 assert.match(V.summary(x),/formal parameter 1σ cannot be reported/);
 const zero=experiment(['chl','ag'],p=>[p.chl*.0001,p.chl*.0002,p.chl*.0003]);
 const c=V.columnCosines(zero);
 assert.equal(c[0][0],1);
 assert.equal(c[1][1],null);
 assert.match(V.correlations(zero),/—/);
});
test('UX-054: grouped controls preserve original sensor, parameter, sigma and step event contracts',()=>{
 const req=moduleRequire(),work=req('workspaces/uncertainty.js').uncertaintyWorkspace;
 const state=req('core/session-store.js').validateSession({tab:'uncertainty',
  uncertaintyParameters:['chl','ag'],uncertaintySigma:.00002,uncertaintyStep:5});
 const controls={csection:(a,b,c)=>a+b+c,adv:s=>s,param:key=>key};
 const html=work.renderControls({state,controls});
 for(const phrase of ['1 · OBSERVATION MODEL','2 · ESTIMATED PARAMETERS','3 · ASSUMED BAND NOISE',
  '4 · FINITE-DIFFERENCE STEP','data-u9-parameter="chl"','data-u9-sigma="0.00002"',
  'data-u9-step="5"','role="group"','aria-pressed="true"','Changing a sensor or noise setting does not reset'])assert.ok(html.includes(phrase),phrase);
 assert.match(app,/v102-uncertainty-views\.js\?v=10\.2\.0-p5/);
 assert.match(app,/v102-uncertainty\.css\?v=10\.2\.0-p5/);
 assert.match(app,/schemaVersion:8/);
});
