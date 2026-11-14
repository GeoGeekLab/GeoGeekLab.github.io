import test from 'node:test';
import assert from 'node:assert/strict';
import {
  SOURCE_CACHE_POLICY,WIND_GRID,parseUtcMs,validateLiveGrid,
  validateGfsVectors,classifyWindProvenance
} from '../../site/flow/v3/core/source-policy.mjs';
import {percentile,FLOW_PERF_BUDGET,FlowTelemetry} from '../../site/flow/v3/core/telemetry.mjs';

function grid(time='2026-11-14T08:00'){
  return Array.from({length:84},(_,i)=>({
    latitude:-60+Math.floor(i/12)*20,longitude:-180+(i%12)*30,
    current:{wind_speed_10m:10,wind_direction_10m:270,time},
    current_units:{wind_speed_10m:'m/s'}
  }));
}

test('Stage 6 HTTP policies never reuse browser cache for live weather',()=>{
  assert.equal(SOURCE_CACHE_POLICY.live,'no-store');
  assert.equal(SOURCE_CACHE_POLICY.world,'force-cache');
  assert.equal(SOURCE_CACHE_POLICY.pinned,'force-cache');
  assert.equal(WIND_GRID.points,WIND_GRID.rows*WIND_GRID.cols);
});

test('Stage 6 validates coordinates, nearest model cells, units, and UTC batch timestamps',()=>{
  const points=grid();
  points[0].latitude=-59.75;
  points[0].longitude=180;
  const valid=validateLiveGrid(points);
  assert.equal(valid.u.length,84);
  assert.ok(valid.u.every(Number.isFinite));
  assert.equal(valid.time,'2026-11-14T08:00:00.000Z');
  assert.ok(Math.abs(valid.u[0]-10)<1e-5);
  assert.ok(Math.abs(valid.v[0])<1e-5);
  const swapped=grid();
  [swapped[0],swapped[1]]=[swapped[1],swapped[0]];
  assert.throws(()=>validateLiveGrid(swapped),/coordinate\/order/);
  assert.throws(()=>validateLiveGrid(grid().slice(1)),/Incomplete/);
  const wrongUnits=grid();wrongUnits[5].current_units.wind_speed_10m='km/h';
  assert.throws(()=>validateLiveGrid(wrongUnits),/unit/);
  const mixed=grid();mixed[22].current.time='2026-11-14T09:00';
  assert.throws(()=>validateLiveGrid(mixed),/Mixed/);
  const missing=grid();missing[5].current.wind_speed_10m=null;
  assert.throws(()=>validateLiveGrid(missing),/Invalid/);
});

test('Stage 6 UTC parsing rejects malformed and calendar-overflow dates',()=>{
  assert.equal(parseUtcMs('2026-11-14T08:00'),Date.parse('2026-11-14T08:00Z'));
  assert.equal(parseUtcMs('2026-11-14T08:00Z'),Date.parse('2026-11-14T08:00Z'));
  assert.equal(parseUtcMs('2026-11-14T10:00+02:00'),Date.parse('2026-11-14T08:00Z'));
  assert.equal(parseUtcMs('2026-02-31T08:00'),null);
  assert.equal(parseUtcMs('not a date'),null);
  assert.equal(parseUtcMs(''),null);
});

test('Stage 6 archived GFS U and V fields use one consistent grid',()=>{
  const header={nx:4,ny:3,lo1:0,la1:40,dx:90,dy:20,
    refTime:'2024-01-01T00:00:00Z',forecastTime:0};
  const u={header,data:Array(12).fill(6)},v={header:{...header},data:Array(12).fill(1)};
  assert.deepEqual(validateGfsVectors(u,v),
    {cols:4,rows:3,dx:90,dy:20,lon0:0,latStart:40});
  v.header.forecastTime=3;
  assert.throws(()=>validateGfsVectors(u,v),/metadata mismatch/);
  v.header.forecastTime=0;v.data=v.data.slice(1);
  assert.throws(()=>validateGfsVectors(u,v),/Incomplete/);
});

test('Stage 6 source age labels never call stale or archived data current',()=>{
  const now=Date.parse('2026-11-14T12:00Z');
  const item=(time)=>classifyWindProvenance({kind:'regular',time},{nowMs:now});
  assert.equal(item('2026-11-14T11:00').status,'recent');
  assert.equal(item('2026-11-13T10:00').status,'stale');
  assert.match(item('2026-11-13T10:00').label,/STALE MODEL SNAPSHOT/);
  assert.equal(item('2026-11-15T10:00').status,'time-anomaly');
  assert.equal(item('bad').status,'undated');
  assert.equal(classifyWindProvenance({kind:'gfs',time:'2024-01-01T00:00Z'},{nowMs:now}).status,'archived');
  assert.equal(classifyWindProvenance({kind:'procedural'}).status,'synthetic');
});

test('Stage 6 bounded telemetry yields stable percentiles and finite budgets',()=>{
  assert.equal(percentile([1,2,3,4,5],.95),4.8);
  assert.equal(percentile([],0.5),null);
  const t=new FlowTelemetry(4);
  for(const x of [1,2,3,4,5,6])t.frame(x);
  const m=t.snapshot({density:900});
  assert.equal(m.frames,6);
  assert.equal(m.sampleFrames,4);
  assert.ok(m.drawP95Ms>=5&&m.drawP95Ms<=6);
  assert.equal(m.density,900);
  assert.ok(FLOW_PERF_BUDGET.minMeasuredFrames>=20);
  assert.ok(FLOW_PERF_BUDGET.maxDrawP95DesktopMs>0);
  assert.ok(FLOW_PERF_BUDGET.maxFlowDomNodes>0);
});
