// Stage 6: bounded, low-overhead instrumentation used by reproducible browser CI.
// Duration samples measure Flow JS drawing, not network delay, GPU time or full-page FPS.
export function percentile(values,fraction){
  if(!Array.isArray(values)||!values.length)return null;
  const numbers=values.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!numbers.length)return null;
  const p=Math.max(0,Math.min(1,fraction))*(numbers.length-1),lo=Math.floor(p),hi=Math.ceil(p);
  return numbers[lo]+(numbers[hi]-numbers[lo])*(p-lo);
}
export const FLOW_PERF_BUDGET=Object.freeze({
  minMeasuredFrames:30,
  maxDrawP95DesktopMs:45,
  maxDrawP95MobileMs:75,
  maxSvgPaths:180,
  maxFlowDomNodes:850,
  maxCanvasSurfaceMiB:70,
  maxOverlayRenderPerSecond:75,
  minTouchCssPx:44
});
export class FlowTelemetry{
  constructor(limit=240){
    this.limit=limit;
    this.times=[];
    this.count=0;
    this.totalDrawMs=0;
    this.maxDrawMs=0;
    this.baseRedraws=0;
    this.svgRedraws=0;
    this.overlayRenders=0;
  }
  frame(ms){
    if(!Number.isFinite(ms)||ms<0)return;
    this.count++;
    this.totalDrawMs+=ms;
    this.maxDrawMs=Math.max(this.maxDrawMs,ms);
    this.times.push(ms);
    if(this.times.length>this.limit)this.times.shift();
  }
  snapshot(extra={}){
    return {
      frames:this.count,
      sampleFrames:this.times.length,
      drawP50Ms:percentile(this.times,.5),
      drawP95Ms:percentile(this.times,.95),
      drawMaxMs:this.maxDrawMs,
      meanDrawMs:this.count?this.totalDrawMs/this.count:null,
      baseRedraws:this.baseRedraws,
      svgRedraws:this.svgRedraws,
      overlayRenders:this.overlayRenders,
      ...extra
    };
  }
}
