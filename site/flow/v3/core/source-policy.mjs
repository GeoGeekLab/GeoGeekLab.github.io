// Stage 6 data boundary: these policies must not turn a source timestamp
// into an observation time, or a pinned archive into current conditions.
export const SOURCE_CACHE_POLICY=Object.freeze({
  live:'no-store',world:'force-cache',pinned:'force-cache'
});
export const WIND_GRID=Object.freeze({rows:7,cols:12,lat0:-60,lon0:-180,dy:20,dx:30,points:84});
// Open-Meteo returns the nearest model-cell center, not necessarily the requested point.
const close=(a,b,tolerance=2)=>Number.isFinite(a)&&Math.abs(a-b)<=tolerance;
const closeLon=(a,b)=>Number.isFinite(a)&&Math.abs((((a-b)+540)%360)-180)<=2;
export function parseUtcMs(value){
  if(typeof value!=='string'||!value.trim())return null;
  const text=value.trim().replace(' ','T');
  const match=text.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?(Z|[+-]\d{2}:?\d{2})?$/);
  if(!match)return null;
  const [,yearText,monthText,dayText,hourText,minuteText,secondText='0',,offset='']=match;
  const year=Number(yearText),month=Number(monthText),day=Number(dayText);
  const hour=Number(hourText),minute=Number(minuteText),second=Number(secondText);
  // Date.parse silently normalizes e.g. February 31 even when Z or an offset is supplied.
  // Validate the written local calendar and clock BEFORE applying its offset.
  const calendar=new Date(0);
  calendar.setUTCFullYear(year,month-1,day);
  calendar.setUTCHours(hour,minute,second,0);
  if(calendar.getUTCFullYear()!==year||calendar.getUTCMonth()!==month-1||
     calendar.getUTCDate()!==day||calendar.getUTCHours()!==hour||
     calendar.getUTCMinutes()!==minute||calendar.getUTCSeconds()!==second)return null;
  const ms=Date.parse(offset?text:text+'Z');
  return Number.isFinite(ms)?ms:null;
}
export function validateLiveGrid(raw){
  const arr=Array.isArray(raw)?raw:[raw],grid=WIND_GRID;
  if(arr.length!==grid.points)throw new Error('Incomplete wind grid');
  let validTime=null;
  const u=new Float32Array(grid.points),v=new Float32Array(grid.points),speed=new Float32Array(grid.points);
  for(let i=0;i<grid.points;i++){
    const entry=arr[i],row=Math.floor(i/grid.cols),col=i%grid.cols;
    if(!close(Number(entry?.latitude),grid.lat0+row*grid.dy)||
       !closeLon(Number(entry?.longitude),grid.lon0+col*grid.dx))
      throw new Error('Wind grid coordinate/order mismatch');
    const windSpeed=entry?.current?.wind_speed_10m;
    const direction=entry?.current?.wind_direction_10m;
    if(typeof windSpeed!=='number'||!Number.isFinite(windSpeed)||windSpeed<0||
       typeof direction!=='number'||!Number.isFinite(direction))
      throw new Error('Invalid current wind sample');
    const units=entry.current_units?.wind_speed_10m;
    if(units&&units!=='m/s')throw new Error('Unexpected wind speed unit');
    const ms=parseUtcMs(entry?.current?.time);
    if(ms===null)throw new Error('Invalid wind grid UTC time');
    if(validTime===null)validTime=ms;
    else if(validTime!==ms)throw new Error('Mixed wind grid valid times');
    const angle=direction*Math.PI/180;
    u[i]=-windSpeed*Math.sin(angle);
    v[i]=-windSpeed*Math.cos(angle);
    speed[i]=windSpeed;
  }
  return {u,v,speed,time:new Date(validTime).toISOString()};
}
export function validateGfsVectors(uRecord,vRecord){
  if(!uRecord?.header||!vRecord?.header)throw new Error('GFS vector headers absent');
  const a=uRecord.header,b=vRecord.header;
  const props=['nx','ny','lo1','la1','dx','dy','refTime','forecastTime'];
  for(const key of props){
    if(a[key]!==undefined&&b[key]!==undefined&&String(a[key])!==String(b[key]))
      throw new Error('GFS U/V metadata mismatch: '+key);
  }
  const cols=Number(a.nx),rows=Number(a.ny),dx=Number(a.dx),dy=Math.abs(Number(a.dy));
  if(!Number.isInteger(cols)||!Number.isInteger(rows)||cols<2||rows<2||
     !Number.isFinite(dx)||dx<=0||!Number.isFinite(dy)||dy<=0||
     uRecord.data?.length!==cols*rows||vRecord.data?.length!==cols*rows)
    throw new Error('Incomplete GFS vector grid');
  for(let i=0;i<cols*rows;i++){
    if(!Number.isFinite(uRecord.data[i])||!Number.isFinite(vRecord.data[i]))
      throw new Error('Nonfinite GFS wind component');
  }
  return {cols,rows,dx,dy,lon0:Number(a.lo1??0),latStart:Number(a.la1??90)};
}
export function classifyWindProvenance(field,{nowMs=Date.now(),freshHours=6}={}){
  const kind=field?.kind||'missing';
  if(kind==='procedural')return {status:'synthetic',ageHours:null,
    label:'SYNTHETIC · NO WEATHER VALID TIME',validTimeUtc:null};
  if(kind==='gfs')return {status:'archived',ageHours:null,
    label:'ARCHIVED MODEL · NOT CURRENT',validTimeUtc:parseUtcMs(field.time)};
  if(kind!=='regular')return {status:'invalid',ageHours:null,label:'INVALID SOURCE',validTimeUtc:null};
  const validTime=parseUtcMs(field.time);
  if(validTime===null)return {status:'undated',ageHours:null,label:'MODEL TIME UNKNOWN',validTimeUtc:null};
  const age=(nowMs-validTime)/3600000;
  if(!Number.isFinite(nowMs)||age < -3)return {status:'time-anomaly',ageHours:age,label:'MODEL TIME IN FUTURE',validTimeUtc:validTime};
  if(age>freshHours)return {status:'stale',ageHours:age,
    label:'STALE MODEL SNAPSHOT · '+age.toFixed(1)+' H OLD',validTimeUtc:validTime};
  return {status:'recent',ageHours:age,label:'MODEL SNAPSHOT · '+Math.max(0,age).toFixed(1)+' H OLD',validTimeUtc:validTime};
}
