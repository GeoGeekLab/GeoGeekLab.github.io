import test from 'node:test';
import assert from 'node:assert/strict';
import {METRES_PER_DEGREE,sampleWind} from '../../site/flow/v3/core/field.mjs';
import {advanceByMethod,advanceFrozenField,INTEGRATORS} from '../../site/flow/v3/core/integrator.mjs';
import {windSpeedColor,WIND_COLOR_STOPS,fieldMetadata,seedDisk} from '../../site/flow/v3/core/analysis.mjs';

const close=(actual,expected,eps=1e-8)=>
  assert.ok(Math.abs(actual-expected)<=eps,'Expected '+actual+' ~ '+expected+', tolerance '+eps);
const field=(u=10,v=0)=>({
  kind:'regular',cols:12,rows:7,dx:30,dy:20,lon0:-180,lat0:-60,
  u:Float32Array.from({length:84},()=>u),
  v:Float32Array.from({length:84},()=>v),
  time:'2026-11-13T12:00'
});
test('Stage 4 wind-speed scale uses a monotonic m/s domain and stable continuous colors',()=>{
  assert.deepEqual(WIND_COLOR_STOPS.map(x=>x[0]),[0,5,10,15,20,30]);
  assert.equal(windSpeedColor(0),WIND_COLOR_STOPS[0][1]);
  assert.equal(windSpeedColor(30),WIND_COLOR_STOPS.at(-1)[1]);
  assert.equal(windSpeedColor(900),WIND_COLOR_STOPS.at(-1)[1]);
  assert.match(windSpeedColor(12.5),/^#[0-9a-f]{6}$/);
  assert.equal(windSpeedColor(-1),null);
  assert.equal(windSpeedColor(NaN),null);
  assert.notEqual(windSpeedColor(2),windSpeedColor(18));
});

test('Stage 4 source provenance distinguishes model validity from forecasts and synthetic data',()=>{
  const live=fieldMetadata(field());
  assert.equal(live.type,'MODEL SNAPSHOT');
  assert.match(live.timeLabel,/VALID 2026-11-13 12:00 UTC/);
  assert.match(live.coverage,/60°S.*60°N/);
  assert.match(live.resolution,/20° lat.*30° lon/);
  assert.match(live.caveat,/uncertainty not quantified/i);
  const fallback=fieldMetadata({kind:'procedural',time:'deterministic fallback'});
  assert.equal(fallback.type,'SYNTHETIC FIELD');
  assert.equal(fallback.timeLabel,'NO WEATHER VALID TIME');
  assert.match(fallback.caveat,/not meteorological/i);
  const archived=fieldMetadata({kind:'gfs',latStart:90,rows:181,cols:360,dy:1,dx:1,time:'2024-01-01T06:00:00Z'});
  assert.equal(archived.type,'ARCHIVED MODEL');
  assert.match(archived.timeLabel,/MODEL REF 2024-01-01 06:00 UTC/);
  assert.match(archived.caveat,/not current conditions/i);
});

test('Stage 4 Euler, RK2, RK4 converge in strict order against analytic latitude growth',()=>{
  const k=1/600,dt=120,initialLat=10,exact=initialLat*Math.exp(k*dt);
  const sampler=(lon,lat)=>({valid:Math.abs(lat)<60,u:0,v:METRES_PER_DEGREE*k*lat});
  const errors=INTEGRATORS.map(method=>{
    const out=advanceByMethod(sampler,0,initialLat,dt,method);
    assert.equal(out.valid,true);
    close(out.lon,0);
    return Math.abs(out.lat-exact);
  });
  assert.ok(errors[0]>errors[1]*5,'Euler '+errors[0]+' RK2 '+errors[1]);
  assert.ok(errors[1]>errors[2]*20,'RK2 '+errors[1]+' RK4 '+errors[2]);
  assert.ok(errors[2]<0.00003,'RK4 error '+errors[2]);
});

test('Stage 4 all integrators reject unsupported intermediate and final positions',()=>{
  const sampler=(lon,lat)=>({valid:lat<=60&&lat>=-60,u:0,v:10});
  for(const method of INTEGRATORS){
    assert.equal(advanceByMethod(sampler,20,60,120,method).valid,false);
    assert.equal(advanceByMethod(sampler,20,61,120,method).valid,false);
    assert.equal(advanceByMethod(sampler,20,0,-1,method).valid,false);
    assert.equal(advanceByMethod(sampler,20,0,1,'not-a-method').valid,false);
  }
});

test('Stage 4 RK4 constant flow and antimeridian crossing preserve coordinate validity',()=>{
  const f=field(40,0);
  const result=advanceFrozenField(f,179.99,0,120,'rk4');
  assert.equal(result.valid,true);
  assert.equal(result.wrapped,true);
  assert.ok(result.lon< -179.9);
  close(result.lat,0);
  const frozen=advanceFrozenField(f,0,0,0,'rk4');
  assert.equal(frozen.valid,true);
  close(frozen.lon,0);
  assert.equal(sampleWind(f,result.lon,result.lat).valid,true);
});

test('Stage 4 uniform-area release disk is bounded and enforces source mask',()=>{
  const seq=[0,0, .81,0, .25,.25, .49,.5, .64,.75];let i=0;
  const points=seedDisk(179.9,59.8,100,4,{
    random:()=>seq[(i++)%seq.length],
    valid:(lon,lat)=>Math.abs(lat)<=60
  });
  assert.ok(points.accepted>0&&points.accepted<=4);
  assert.ok(points.rejected>=1);
  for(const point of points.points){
    assert.ok(Math.abs(point.lat)<=60);
    assert.ok(point.lon>=-180&&point.lon<180);
  }
  const collapsed=seedDisk(12,34,0,5,{random:()=>0.7});
  assert.equal(collapsed.accepted,5);
  for(const point of collapsed.points){close(point.lon,12);close(point.lat,34);}
  assert.throws(()=>seedDisk(0,0,-1,10),RangeError);
  assert.throws(()=>seedDisk(0,0,10,2.5),RangeError);
});
