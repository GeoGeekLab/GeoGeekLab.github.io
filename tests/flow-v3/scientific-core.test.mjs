import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  sampleWind, windFromDirection, advanceGeographic,
  canDrawSegment, fieldBounds, wrapLongitude, METRES_PER_DEGREE
} from '../../site/flow/v3/core/field.mjs';
import {
  simulatedSeconds, advanceFixedClock, advanceTripTime, playbackCanAdvance
} from '../../site/flow/v3/core/clock.mjs';

const source=path=>readFileSync(new URL('../../'+path,import.meta.url),'utf8');
const constantField=(u=10,v=0)=>({
  kind:'regular',cols:12,rows:7,lon0:-180,lat0:-60,dx:30,dy:20,
  u:Float32Array.from({length:84},()=>u),
  v:Float32Array.from({length:84},()=>v),
});
const close=(actual,expected,tolerance=1e-6)=>
  assert.ok(Math.abs(actual-expected)<=tolerance,`Expected ${actual} ≈ ${expected} ± ${tolerance}`);

test('FLOW-P0-03: samples beyond ±60° are invalid instead of clamped',()=>{
  const field=constantField();
  assert.equal(fieldBounds(field).minLat,-60);
  assert.equal(fieldBounds(field).maxLat,60);
  assert.equal(sampleWind(field,24,60).valid,true);
  assert.equal(sampleWind(field,24,-60).valid,true);
  for(const lat of [60.01,-60.01,75,-88,88]){
    const w=sampleWind(field,24,lat);
    assert.equal(w.valid,false);
    assert.equal(w.reason,'outside-field-domain');
    assert.equal(w.speed,null);
  }
  assert.equal(sampleWind(field,24,NaN).valid,false);
});

test('FLOW-P0-03: bilinear interpolation, longitude wrap and GFS domain',()=>{
  const field=constantField(0,0);
  field.u[0]=10;field.u[1]=20;field.u[12]=30;field.u[13]=40;
  const m=sampleWind(field,-165,-50);
  close(m.u,25);
  close(m.v,0);
  close(sampleWind(field,195,-50).u,m.u);
  const gfs={kind:'gfs',cols:4,rows:3,lon0:0,latStart:40,dx:90,dy:20,
    u:Float32Array.from({length:12},()=>8),
    v:Float32Array.from({length:12},()=>-3)};
  assert.equal(sampleWind(gfs,-90,40).valid,true);
  assert.equal(sampleWind(gfs,0,-1).valid,false);
  assert.equal(sampleWind(gfs,0,41).valid,false);
});

test('meteorological FROM convention uses east-positive and north-positive vectors',()=>{
  const west=windFromDirection(10,270);
  close(west[0],10);close(west[1],0);
  const north=windFromDirection(10,0);
  close(north[0],0);close(north[1],-10);
});

test('FLOW-P0-01: reset, seam and two-dimensional jumps never form a drawn segment',()=>{
  assert.equal(canDrawSegment({lon:5,lat:5},{lon:5.01,lat:5.01}),true);
  assert.equal(canDrawSegment({lon:5,lat:5},{lon:5.01,lat:60}),false);
  assert.equal(canDrawSegment({lon:179.99,lat:5},{lon:-179.99,lat:5,wrapped:true}),false);
  assert.equal(canDrawSegment({lon:0,lat:0},{lon:90,lat:0}),false);
  assert.equal(canDrawSegment({lon:0,lat:0},{lon:0,lat:0,reset:true}),false);
  const seam=advanceGeographic(constantField(30,0),179.999,0,120);
  assert.equal(seam.valid,true);
  assert.equal(seam.wrapped,true);
  assert.ok(seam.lon < -179.9);
  close(wrapLongitude(190),-170);
});

test('FLOW-P0-02: elapsed-time conversion uses seconds, not frame counts',()=>{
  close(simulatedSeconds(1000/60,170,{maxElapsedMs:100}),170/60,1e-10);
  close(simulatedSeconds(1000,170,{maxElapsedMs:100}),17,1e-10);
  close(simulatedSeconds(0,170),0);
  close(simulatedSeconds(20,0),0);
  const output=advanceFixedClock({elapsedMs:20,rate:100,remainderSeconds:0,stepSeconds:1});
  assert.equal(output.steps,2);
});

test('FLOW-P0-02: fixed-step geographic integration agrees at 30, 60 and 120 fps',()=>{
  const field=constantField(10,0),rate=36000,stepSeconds=120;
  function run(fps) {
    let carry=0,lon=0,lat=0,total=0;
    for(let i=0;i<fps;i++){
      const clock=advanceFixedClock({
        elapsedMs:1000/fps,rate,remainderSeconds:carry,stepSeconds,maxElapsedMs:100
      });
      carry=clock.remainderSeconds;
      for(let k=0;k<clock.steps;k++){
        const next=advanceGeographic(field,lon,lat,clock.stepSeconds);
        assert.equal(next.valid,true);
        lon=next.lon;lat=next.lat;
      }
      total+=clock.simulatedSeconds;
    }
    return {lon,lat,total,carry};
  }
  const a=run(30),b=run(60),c=run(120);
  close(a.total,36000,1e-8);
  close(a.total,b.total,1e-8);
  close(b.total,c.total,1e-8);
  close(a.lon,b.lon,1e-8);
  close(b.lon,c.lon,1e-8);
  close(a.lat,0);
  close(a.lon,360000/METRES_PER_DEGREE,1e-6);
});

test('FLOW-P0-04: global pause gates trip and field advancement',()=>{
  assert.equal(playbackCanAdvance({paused:true,mode:'field',tripPlay:true}),false);
  assert.equal(playbackCanAdvance({paused:true,mode:'trips',tripPlay:true}),false);
  assert.equal(playbackCanAdvance({paused:false,mode:'trips',tripPlay:false}),false);
  assert.equal(playbackCanAdvance({paused:false,mode:'trips',tripPlay:true}),true);
  close(advanceTripTime(30,140),30.98,1e-8);
  close(advanceTripTime(75,500,{unitsPerRealSecond:7,end:76}),2.5,1e-8);
});

test('FLOW-P0-04: runtime has one native time controller and no second interval',()=>{
  const base=source('site/flow-lab.js');
  const overlay=source('site/flow/flow-round2.js');
  assert.match(base,/advanceFixedClock\(/);
  assert.match(base,/advanceTripTime\(/);
  assert.match(base,/playbackCanAdvance\(state\)/);
  assert.match(base,/clock\.stepSeconds/);
  assert.doesNotMatch(base,/clamp\(dt\/16\.7/);
  assert.doesNotMatch(overlay,/setInterval\(/);
  assert.doesNotMatch(overlay,/stopImmediatePropagation\(/);
  assert.match(overlay,/stage\?\._flowRound2Cleanup\?\.\(\)/);
});
