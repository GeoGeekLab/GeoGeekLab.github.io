import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { classifyOrbit, SIDEREAL_PERIOD_MIN } from '../../site/orbital/orbit-classification.js';

function el(meanMotion, eccentricity = 0, inclination = 0) {
  return { MEAN_MOTION:meanMotion, ECCENTRICITY:eccentricity, INCLINATION:inclination };
}

test('element-based regimes distinguish circular LEO, MEO and high orbit', () => {
  assert.equal(classifyOrbit(el(15.3,0.001,53)).orbitClass,'LEO');
  assert.equal(classifyOrbit(el(2,0.01,55)).orbitClass,'MEO');
  assert.equal(classifyOrbit(el(0.5,0.01,10)).orbitClass,'HIGH');
});

test('geostationary is a strict subset of geosynchronous', () => {
  const n=1440/SIDEREAL_PERIOD_MIN;
  assert.equal(classifyOrbit(el(n,0.0001,0.05)).orbitClass,'GEO');
  assert.equal(classifyOrbit(el(n,0.10,30)).orbitClass,'GSO');
  assert.equal(classifyOrbit(el(n,0.0001,20)).orbitClass,'GSO');
});

test('highly eccentric transfer orbits are HEO, not GEO or MEO', () => {
  const orbit=classifyOrbit(el(2,0.73,63.4));
  assert.equal(orbit.orbitClass,'HEO');
  assert.ok(orbit.perigeeKm<2000);
  assert.ok(orbit.apogeeKm>35786);
  assert.ok(orbit.apogeeKm>orbit.perigeeKm);
});

test('invalid orbital elements do not masquerade as LEO', () => {
  assert.equal(classifyOrbit(el(0,0,0)).orbitClass,'HIGH');
  assert.equal(classifyOrbit(el(15,1.01,0)).periodMin,null);
});

function passSolver(look) {
  const worker=readFileSync(new URL('../../site/orbital/orbit-worker.js',import.meta.url),'utf8');
  const from=worker.indexOf('function postPass(message) {');
  const to=worker.indexOf('\nself.onmessage =',from);
  assert.ok(from>=0&&to>from);
  const byId=new Map([['42',{id:'42',periodMin:94}]]);
  const sent=[];
  const elevationFor=(_item,date,_observer)=>look(date.getTime());
  const self={postMessage:message=>sent.push(message)};
  const fn=new Function('byId','elevationFor','self',worker.slice(from,to)+'\nreturn postPass;');
  return {solve:fn(byId,elevationFor,self),sent};
}

test('pass solver refines AOS, closest approach, maximum elevation and LOS', () => {
  const hour=3600000;
  const {solve,sent}=passSolver(t=>{
    const h=t/hour;
    return {
      elevation:15-Math.abs(h-1.2)*100,
      range:500+10000*(h-1.24)**2,
      azimuth:45,
    };
  });
  solve({id:'42',requestId:7,timeMs:0,observer:{lat:0,lon:0},hours:3});
  assert.equal(sent.length,1);
  const result=sent[0].result;
  assert.equal(sent[0].requestId,7);
  assert.ok(Math.abs(result.aos-1.05*hour)<2000);
  assert.ok(Math.abs(result.los-1.35*hour)<2000);
  assert.ok(Math.abs(result.peak.timeMs-1.2*hour)<2000);
  assert.ok(Math.abs(result.closest.timeMs-1.24*hour)<2000);
  assert.ok(result.closest.range<result.peak.range);
});

test('in-progress pass recovers AOS before the simulation time', () => {
  const hour=3600000;
  const {solve,sent}=passSolver(t=>({
    elevation:15-Math.abs(t/hour-1.2)*100,
    range:500+10000*(t/hour-1.24)**2,
    azimuth:45,
  }));
  solve({id:'42',requestId:8,timeMs:1.1*hour,observer:{},hours:3});
  assert.equal(sent[0].result.inProgress,true);
  assert.ok(sent[0].result.aos<1.1*hour);
  assert.ok(sent[0].result.los>1.1*hour);
});

test('clock, search, selection and occlusion contracts remain connected', () => {
  const engine=readFileSync(new URL('../../site/orbital/orbital-engine.js',import.meta.url),'utf8');
  const enhanced=readFileSync(new URL('../../site/orbital/orbital-enhancements-v3.js',import.meta.url),'utf8');
  const sidebar=readFileSync(new URL('../../site/orbital/orbit-round2.js',import.meta.url),'utf8');
  assert.match(engine,/state\.simulationTimeMs/);
  assert.match(enhanced,/root\.dataset\.simulationTimeMs/);
  assert.match(engine,/searchSort/);
  assert.match(engine,/data-search-page="next"/);
  assert.match(engine,/data-orbit-sort/);
  assert.match(engine,/url\.searchParams\.delete\('sat'\)/);
  assert.match(engine,/labelRay\.intersectSphere\(labelEarth/);
  assert.match(engine,/stage\.addEventListener\('geogeek:orbit-fit',fitAll\)/);
  assert.match(engine,/followSelected/);
  assert.match(sidebar,/data-selection-ground/);
});
