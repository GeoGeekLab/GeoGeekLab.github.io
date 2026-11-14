import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createPlateCarreeViewport,eastWestToNorthSouthScale
} from '../../site/flow/v3/core/projection.mjs';

const close=(actual,expected,eps=1e-8)=>
  assert.ok(Math.abs(actual-expected)<=eps,`${actual} !== ${expected} ±${eps}`);

test('plate carree always fits a two-to-one world inside wide and tall stages',()=>{
  for(const [width,height] of [[1600,600],[1200,620],[900,900],[390,500],[320,260]]){
    const p=createPlateCarreeViewport(width,height);
    close(p.worldWidth/p.worldHeight,2);
    assert.ok(p.worldWidth<=width+1e-7);
    assert.ok(p.worldHeight<=height+1e-7);
    assert.ok(p.left>=-1e-7&&p.top>=-1e-7);
    const xy=p.project(0,0);
    close(xy[0],width/2);close(xy[1],height/2);
  }
});

test('project/invert round trips latitude and longitude without viewport distortion',()=>{
  for(const [width,height,zoom,panX,panY] of [[1600,640,1,0,0],[390,520,1,0,0],[850,630,2,70,-40]]){
    const p=createPlateCarreeViewport(width,height,zoom,panX,panY);
    for(const [lon,lat] of [[0,0],[22,15],[-74.006,40.713],[151.21,-33.87]]){
      const xy=p.project(lon,lat);
      const out=p.invert(...xy);
      assert.equal(out.valid,true);
      close(out.lon,lon,1e-7);close(out.lat,lat,1e-7);
    }
  }
});

test('letterboxed margins are outside map frame and cannot return bogus sample',()=>{
  const tall=createPlateCarreeViewport(390,700);
  assert.ok(tall.top>0);
  assert.deepEqual(tall.invert(195,1),{valid:false,reason:'outside-map-frame'});
  assert.equal(tall.invert(195,350).valid,true);
  const wide=createPlateCarreeViewport(1600,600);
  assert.ok(wide.left>0);
  assert.equal(wide.invert(1,300).valid,false);
  assert.equal(wide.invert(800,300).valid,true);
});

test('the reported EW/NS scale reflects latitude, not container aspect',()=>{
  close(eastWestToNorthSouthScale(0),1);
  close(eastWestToNorthSouthScale(60),2);
  close(eastWestToNorthSouthScale(-60),2);
  assert.ok(eastWestToNorthSouthScale(80)>5);
  assert.equal(eastWestToNorthSouthScale(90),null);
});

test('the workbench retains one geographic projection for all four modes',()=>{
  const p=createPlateCarreeViewport(1000,600);
  const a=p.project(-74.006,40.713);
  const b=p.project(139.692,35.69);
  assert.ok(a[0]<b[0]);
  assert.ok(Math.abs(a[1]-b[1])<p.worldHeight*.2);
});
