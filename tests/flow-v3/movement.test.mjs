import test from 'node:test';
import assert from 'node:assert/strict';
import {
  NODES,OD,TRIPS,OD_UNIT,TRIP_TIME_UNIT,
  sortedEdges,odNodeTotals,odNetworkTotals,odPairTotals,
  greatCircleKm,greatCirclePoint,tripMetrics,tripPosition,validateTrip
} from '../../site/flow/v3/core/movement.mjs';

const near=(actual,expected,epsilon=1e-6)=>
  assert.ok(Math.abs(actual-expected)<=epsilon,
    'Expected '+actual+' ≈ '+expected+' within '+epsilon);

test('Stage 5 canonical teaching data has unique directed IDs and strictly ordered samples',()=>{
  assert.equal(Object.keys(NODES).length,12);
  assert.equal(OD.length,24);
  assert.equal(TRIPS.length,8);
  assert.equal(OD_UNIT,'normalized teaching units');
  assert.equal(TRIP_TIME_UNIT,'relative teaching time units');
  assert.equal(new Set(OD.map(e=>e.id)).size,OD.length);
  for(const edge of OD){
    assert.ok(NODES[edge.a]&&NODES[edge.b]);
    assert.ok(edge.value>0);
  }
  for(const trip of TRIPS)assert.equal(validateTrip(trip),true);
});

test('Stage 5 conservation holds for directed OD node totals',()=>{
  const all=odNetworkTotals();
  const out=all.nodes.reduce((sum,n)=>sum+n.out,0);
  const inbound=all.nodes.reduce((sum,n)=>sum+n.in,0);
  near(out,all.total);near(inbound,all.total);
  near(all.nodes.reduce((sum,n)=>sum+n.net,0),0);
  const nyc=odNodeTotals('nyc');
  assert.deepEqual([nyc.out,nyc.in,nyc.net],[138,340,-202]);
  assert.equal(nyc.unit,OD_UNIT);
  assert.throws(()=>odNodeTotals('missing'),RangeError);
});

test('Stage 5 pair direction does not merge reciprocal arcs',()=>{
  const forward=odPairTotals('nyc','lon');
  assert.deepEqual([forward.forward,forward.reverse,forward.net],[94,88,6]);
  const reversed=odPairTotals('lon','nyc');
  assert.deepEqual([reversed.forward,reversed.reverse,reversed.net],[88,94,-6]);
  const noLink=odPairTotals('nyc','sin');
  assert.equal(noLink.total,0);
  assert.throws(()=>odPairTotals('nyc','nyc'),RangeError);
});

test('Stage 5 top-N filtering preserves source units and never changes all-network totals',()=>{
  const top=sortedEdges(OD,4),all=odNetworkTotals();
  assert.equal(top.length,4);
  assert.deepEqual(top.map(e=>e.value),[94,89,88,84]);
  const visible=odNetworkTotals(top);
  assert.ok(visible.total<all.total);
  assert.equal(odNetworkTotals().total,all.total);
  const idOrder=sortedEdges([{id:2,value:10},{id:1,value:10}],2).map(e=>e.id);
  assert.deepEqual(idOrder,[1,2]);
  assert.throws(()=>sortedEdges(OD,-1),RangeError);
});

test('Stage 5 geodesic distance is symmetric, seam-safe and in kilometres',()=>{
  near(greatCircleKm([0,0],[0,0]),0);
  near(greatCircleKm([0,0],[1,0]),111.195,0.02);
  near(greatCircleKm([179,0],[-179,0]),222.390,0.04);
  const nyc=NODES.nyc,lon=NODES.lon;
  const km=greatCircleKm(nyc,lon);
  assert.ok(km>5500&&km<5600);
  near(km,greatCircleKm(lon,nyc),1e-8);
  const midpoint=greatCirclePoint([179,0],[-179,0],0.5);
  assert.ok(Math.abs(Math.abs(midpoint[0])-180)<1e-7);
  near(midpoint[1],0);
});

test('Stage 5 teaching samples remain distinct from derived interpolated positions',()=>{
  const trip=TRIPS[0];
  const first=tripPosition(trip,0);
  assert.equal(first.sampled,true);
  assert.equal(first.sampleIndex,0);
  assert.deepEqual(first.position,[-122.42,37.77]);
  const authored=tripPosition(trip,18);
  assert.equal(authored.sampled,true);
  assert.equal(authored.sampleIndex,1);
  const midpoint=tripPosition(trip,27);
  assert.equal(midpoint.sampled,false);
  assert.equal(midpoint.segmentIndex,1);
  assert.equal(midpoint.interpolation,'shortest great-circle');
  near(midpoint.fraction,0.5);
  assert.ok(Math.abs(midpoint.position[0])>150);
  const after=tripPosition(trip,999);
  assert.equal(after.clamped,true);
  assert.equal(after.sampled,false);
  assert.deepEqual(after.position,trip.pts.at(-1).slice(0,2));
});

test('Stage 5 TRIPS metrics count supplied segments and authored time units only',()=>{
  for(const trip of TRIPS){
    const stats=tripMetrics(trip);
    assert.equal(stats.samples,trip.pts.length);
    assert.equal(stats.segments.length,stats.samples-1);
    assert.equal(stats.timeUnit,TRIP_TIME_UNIT);
    assert.ok(stats.totalDistanceKm>0);
    near(stats.totalDistanceKm,stats.segments.reduce((s,x)=>s+x.distanceKm,0));
    near(stats.durationUnits,stats.endTime-stats.startTime);
    near(stats.averageSamplingGapUnits,stats.durationUnits/(stats.samples-1));
    assert.match(stats.note,/not measured travel distance/i);
    for(const seg of stats.segments)assert.ok(seg.durationUnits>0&&seg.distanceKm>0);
  }
  const pacific=tripMetrics(TRIPS[0]);
  assert.equal(pacific.durationUnits,72);
  assert.equal(pacific.samples,5);
  assert.equal(pacific.averageSamplingGapUnits,18);
  assert.throws(()=>tripMetrics({pts:[[0,0,1],[1,1,1]]}),RangeError);
});

test('Stage 5 time-unit guard prevents UTC and false observed speeds',()=>{
  const state=tripPosition(TRIPS[0],30);
  assert.equal(state.sampled,false);
  assert.equal(state.time,30);
  assert.match(state.timeUnit,/relative teaching/);
  assert.doesNotMatch(tripMetrics(TRIPS[0]).note,/km\/h/);
  assert.throws(()=>tripPosition(TRIPS[0],Number.NaN),RangeError);
  assert.throws(()=>greatCirclePoint([0,0],[1,1],1.5),RangeError);
});
