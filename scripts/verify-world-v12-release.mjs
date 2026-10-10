#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
const RELEASE='20261010v103play3',WORLD='20261009v12';
const baseArg=process.argv.indexOf('--url');
const live=baseArg>=0;
const baseUrl=process.argv[baseArg+1]||'';
const root=live?new URL(baseUrl.endsWith('/')?baseUrl:baseUrl+'/'):null;
if(live&&(!root||!/^https:$/.test(root.protocol)))throw new Error('Provide an HTTPS --url base');
async function load(path){
  if(!live)return readFile(new URL('../site/'+path,import.meta.url),'utf8');
  const u=new URL(path,root);u.searchParams.set('release',RELEASE);
  const res=await fetch(u,{cache:'no-store',redirect:'follow'});
  if(!res.ok)throw new Error(path+' '+res.status);
  return res.text();
}
function assert(cond,message){if(!cond)throw new Error(message)}
const lab=await load('lab.html');
const loader=await load('core/modules.js');
const world=await load('world-projection-lab.js');
const distort=await load('world-distortion-v12.js');
assert(lab.includes('content="'+RELEASE+'" name="geogeek-lab-release"'),'Lab release token mismatch');
assert(lab.includes('core/modules.js?v='+RELEASE+'"'),'Lab script cache token mismatch');
assert(loader.includes('world-projection-lab.js?v='+WORLD),'World module cache token mismatch');
assert(world.includes("const V='"+WORLD+"'"),'World release constant mismatch');
assert(world.includes("world-distortion-v12.js"),'World distortion engine not loaded');
assert(world.includes('wCompareProjection')&&world.includes('wMetrics')&&world.includes('wRefresh'),'Missing v12 controls');
assert(distort.includes('GeoWorldDistortion')&&distort.includes('angleError'),'Missing scientific distortion engine');
console.log('World v12 '+(live?'LIVE':'SOURCE')+' cache contract OK: Lab@'+RELEASE+' · World@'+WORLD);
