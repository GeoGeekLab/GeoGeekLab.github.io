// Flow V3 — pure elapsed-time, fixed-step and playback clock.
// A visual animation frame does not represent a unit of simulated time.
export function simulatedSeconds(elapsedMs,rate,{maxElapsedMs=100}={}) {
  if (!Number.isFinite(elapsedMs) || !Number.isFinite(rate) || elapsedMs<=0 || rate<=0) return 0;
  return Math.min(elapsedMs,maxElapsedMs)/1000*rate;
}
export function advanceFixedClock({
  elapsedMs, rate, remainderSeconds=0, stepSeconds=1,
  maxElapsedMs=100, maxSteps=1000
}) {
  if (!(stepSeconds>0 && maxSteps>0)) throw Error('Invalid fixed-step clock parameters');
  const total=Math.max(0,remainderSeconds)+simulatedSeconds(elapsedMs,rate,{maxElapsedMs});
  const available=Math.floor((total+1e-9)/stepSeconds);
  const steps=Math.min(maxSteps,available);
  return {
    steps, stepSeconds,
    remainderSeconds:Math.max(0,total-steps*stepSeconds),
    simulatedSeconds:steps*stepSeconds,
    capped:available>maxSteps
  };
}
// Trip time uses authored relative units; it is NOT UTC nor wind-forecast time.
export function advanceTripTime(current,elapsedMs,{unitsPerRealSecond=7,end=76}={}) {
  if (!Number.isFinite(current) || !Number.isFinite(elapsedMs) || !(end>0)) return 0;
  const realSeconds=Math.min(Math.max(0,elapsedMs),1000)/1000;
  return ((current+realSeconds*unitsPerRealSecond)%end+end)%end;
}
export function playbackCanAdvance(state) {
  return !state.paused && (state.mode!=='trips' || state.tripPlay);
}
