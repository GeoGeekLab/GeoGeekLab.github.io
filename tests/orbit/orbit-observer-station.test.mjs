import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const workerSource=readFileSync(new URL('../../site/orbital/orbit-worker.js',import.meta.url),'utf8');
const engineSource=readFileSync(new URL('../../site/orbital/orbital-engine.js',import.meta.url),'utf8');
const enhancementSource=readFileSync(new URL('../../site/orbital/orbital-enhancements-v3.js',import.meta.url),'utf8');

function loadObserverLook() {
  const start=workerSource.indexOf('function observerLook(observer, propagated) {');
  const end=workerSource.indexOf('\nfunction postPositions(',start);
  assert.ok(start>=0&&end>start,'observer look implementation exists');
  const stations=[];
  const satellite={
    degreesToRadians:degree=>degree*Math.PI/180,
    radiansToDegrees:radian=>radian*180/Math.PI,
    ecfToLookAngles:(station,position)=>{
      stations.push({station,position});
      return {azimuth:Math.PI/2,elevation:Math.PI/4,rangeSat:100-station.height};
    },
  };
  const observerLook=new Function('satellite',workerSource.slice(start,end)+'\nreturn observerLook;')(satellite);
  return {observerLook,stations};
}

test('ground station height is converted from user metres to SGP4 look-angle kilometres',()=>{
  const {observerLook,stations}=loadObserverLook();
  const point={ecf:{x:1,y:2,z:3}};
  const result=observerLook({lat:35,lon:139,height:2.5},point);
  assert.equal(stations[0].station.height,2.5);
  assert.equal(result.range,97.5);
  assert.equal(result.azimuth,90);
  assert.equal(result.elevation,45);
  assert.ok(Math.abs(stations[0].station.latitude-35*Math.PI/180)<1e-12);
  observerLook({lat:0,lon:0,height:-0.2},point);
  assert.equal(stations[1].station.height,-0.2,'below-ellipsoid locations remain valid');
});

test('station changes propagate through one validated observer update event',()=>{
  assert.match(engineSource,/geogeek:orbit-set-observer/);
  assert.match(engineSource,/heightKm\s*<\s*-.5\|\|heightKm\s*>\s*9/);
  assert.match(engineSource,/state\.observer=\{lat,lon,height:heightKm\}/);
  assert.match(enhancementSource,/heightKm:heightMeters\/1000/);
  assert.match(enhancementSource,/!heightInput\.value\.trim\(\)/);
  assert.match(enhancementSource,/heightMeters<-500\|\|heightMeters>9000/);
  assert.match(enhancementSource,/height in metres relative to the WGS84 reference ellipsoid/i);
});

test('epoch labels use the simulation clock; presets reflect actual layer state',()=>{
  assert.match(engineSource,/simulationNow\(state\)-meta\.epochMs/);
  assert.match(engineSource,/AFTER.*BEFORE.*EPOCH/);
  assert.match(enhancementSource,/function activePreset\(root\)/);
  assert.match(engineSource,/dispatchEvent\(new Event\('geogeek:orbit-layers-changed'\)\)/);
  assert.match(enhancementSource,/addEventListener\('geogeek:orbit-layers-changed'/);
  assert.match(enhancementSource,/orbitResetView/);
});
