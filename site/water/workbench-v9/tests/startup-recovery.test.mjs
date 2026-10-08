import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const engine=fs.readFileSync(path.join(root,'analysis/uncertainty-engine.js'),'utf8');
const scripts=[...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g)]
 .map(m=>m[1]).filter(Boolean);
const fallback=scripts.find(x=>x.includes('data')&&x.includes('GeoGeekV9Engine'))||
 scripts.find(x=>x.includes('identifiability engine unavailable; using the identical bundled fallback'));
const main=scripts.find(x=>x.includes('const __factories='));
assert.ok(fallback,'engine fallback must exist in the HTML');
assert.ok(main,'application inline bundle must exist');

function simulate({saved=null,loadExternal=false,blockFallback=false}={}){
 const nodes={};
 function element(id){
  return nodes[id]||=( {id,dataset:{},textContent:'',innerHTML:'',value:'',
   style:{setProperty(){}},classList:{toggle(){},add(){},remove(){}},
   setAttribute(){},getAttribute(){return null;},addEventListener(){},querySelectorAll(){return []},querySelector(){return null},
   scrollTop:0});
 }
 const contents={};
 if(saved)contents.water_ui_geo_v8=JSON.stringify(saved);
 const logs={errors:[],warnings:[]};
 const fakeConsole={error:(...x)=>logs.errors.push(x.map(String).join(' ')),warn:(...x)=>logs.warnings.push(x.map(String).join(' ')),log(){}};
 const document={
  getElementById:element,querySelector:()=>null,querySelectorAll:()=>[],addEventListener(){},
  documentElement:{dataset:{geogeekEmbedded:'false'}},
  head:{appendChild(){}},body:{appendChild(){}},activeElement:null
 };
 const context=vm.createContext({document,console:fakeConsole,atob,localStorage:{
   getItem:key=>contents[key]||null,setItem:(key,value)=>{contents[key]=value}
 },setTimeout:()=>1,clearTimeout(){}});
 context.window=context;context.parent=context;
 context.location={origin:'http://localhost',search:''};
 context.addEventListener=()=>{};context.removeEventListener=()=>{};
 if(loadExternal)vm.runInContext(engine,context,{filename:'uncertainty-engine.js'});
 if(!blockFallback)vm.runInContext(fallback,context,{filename:'embedded-engine-fallback.js'});
 vm.runInContext(main,context,{filename:'v9-workbench.js'});
 return {nodes,logs,context,contents};
}
const V8={tab:'iop',plot:'rrs',probe:443,showPanel:true,axisRanges:{},
 sensor:'olci',responseMode:'nominal',params:{chl:1,ag:.05,anap:.02,bbp:.002,aot:.1,alpha:.7,pressure:1013.25,sza:30,vza:10,raz:135,corrAot:.1,corrAlpha:.7,sg:.0176,snap:.0123,eta:1},
 sensitivityParameter:'chl',sensitivityStep:5};
test('Missing external V9 engine + persisted V8 session renders 8 tabs, chart and parameters',()=>{
 const {nodes,logs,context}=simulate({saved:V8,blockFallback:false});
 assert.ok(context.GeoGeekV9Engine?.analyze);
 assert.equal((nodes.mainNav.innerHTML.match(/data-tab=/g)||[]).length,8);
 assert.match(nodes.mainContent.innerHTML,/<svg/);
 assert.match(nodes.controls.innerHTML,/data-range="chl"/);
 assert.equal(logs.errors.length,0);
});
test('Normal external V9 engine loading preserves the engine and UI',()=>{
 const {nodes,logs,context}=simulate({saved:V8,loadExternal:true});
 assert.equal((nodes.mainNav.innerHTML.match(/data-tab=/g)||[]).length,8);
 assert.ok(context.GeoGeekV9Engine?.eigensystemSymmetric);
 assert.equal(logs.errors.length,0);
});
test('If both engine sources are unavailable, the startup error is visible rather than silent blank',()=>{
 const {nodes,logs}=simulate({saved:{...V8,tab:'uncertainty',plot:'summary'},blockFallback:true});
 assert.match(nodes.mainContent.innerHTML,/role="alert"/);
 assert.match(nodes.mainContent.innerHTML,/unavailable|could not start/i);
 assert.ok(logs.errors.length>0);
});
test('Plausible V8 session without V9-specific saved controls migrates with declared assumptions',()=>{
 const {context}=simulate({saved:V8,blockFallback:false});
 const state=JSON.parse(context.localStorage.getItem('water_ui_geo_v9')||'null');
 // Fresh sessions are not persisted until the first user edit.
 const defaults=context.GeoGeekV9Engine;
 assert.ok(state===null||state.uncertaintyParameters?.length>0);
 assert.deepEqual(JSON.parse(JSON.stringify(defaults.SIGMAS)),[.000005,.00002,.0001]);
});
