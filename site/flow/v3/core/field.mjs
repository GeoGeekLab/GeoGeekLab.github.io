// Flow V3 — pure wind sampling and geographic particle integration.
// Wind vectors are in metres/second: u east-positive and v north-positive.
export const METRES_PER_DEGREE = 111320;
export const INVALID = Object.freeze({ valid:false, reason:'outside-field-domain', u:null, v:null, speed:null });
export function wrapLongitude(lon) { return ((lon + 180) % 360 + 360) % 360 - 180; }
export function windFromDirection(speed, degrees) {
  const angle = degrees * Math.PI / 180;
  return [-speed * Math.sin(angle), -speed * Math.cos(angle)];
}
export function fieldBounds(field) {
  if (field?.kind === 'regular') return {
    minLat:field.lat0, maxLat:field.lat0 + (field.rows-1)*field.dy
  };
  if (field?.kind === 'gfs') return {
    minLat:field.latStart-(field.rows-1)*field.dy,
    maxLat:field.latStart
  };
  return { minLat:-89, maxLat:89 };
}
export function sampleWind(field, lon, lat) {
  if (!field || !Number.isFinite(lon) || !Number.isFinite(lat) || Math.abs(lat) > 89)
    return INVALID;
  const bounds = fieldBounds(field);
  if (lat < bounds.minLat || lat > bounds.maxLat) return INVALID;
  const longitude = wrapLongitude(lon);
  if (field.kind === 'regular' || field.kind === 'gfs') {
    const {cols,rows,dx,dy,u,v,lon0} = field;
    if (!(cols > 1 && rows > 1 && dx > 0 && dy > 0) ||
      !u || !v || u.length < cols*rows || v.length < cols*rows) return INVALID;
    const rawLon = field.kind === 'gfs' ? ((longitude % 360) + 360) % 360 : longitude;
    let x = (rawLon - lon0) / dx;
    x = ((x % cols) + cols) % cols;
    let y = field.kind === 'gfs' ? (field.latStart - lat)/dy : (lat - field.lat0)/dy;
    y = Math.max(0,Math.min(rows-1,y));
    const x0 = Math.floor(x), x1 = (x0+1)%cols, y0 = Math.floor(y);
    const y1 = Math.min(rows-1,y0+1), tx=x-x0, ty=y-y0;
    const at=(values,xx,yy)=>values[yy*cols+xx];
    const blend=values=>
      ((1-tx)*at(values,x0,y0)+tx*at(values,x1,y0))*(1-ty)+
      ((1-tx)*at(values,x0,y1)+tx*at(values,x1,y1))*ty;
    const east=blend(u), north=blend(v);
    if (!Number.isFinite(east) || !Number.isFinite(north)) return INVALID;
    return { valid:true, reason:null, u:east, v:north, speed:Math.hypot(east,north) };
  }
  if (field.kind !== 'procedural') return INVALID;
  const r=lat*Math.PI/180, q=longitude*Math.PI/180;
  const u=6*Math.cos(r*1.7)+3*Math.sin(q*2.1);
  const v=3.5*Math.sin(r*2.2)-2*Math.cos(q*1.4);
  return { valid:true, reason:null, u,v,speed:Math.hypot(u,v) };
}

// Midpoint (RK2) step of a particle over a frozen velocity field.
// The caller owns lifetime and respawn. Invalid particles do not move.
export function advanceGeographic(field, lon, lat, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0 ||
      !Number.isFinite(lon) || !Number.isFinite(lat)) return { valid:false, reason:'invalid-step' };
  const start=sampleWind(field,lon,lat);
  if (!start.valid) return { valid:false, reason:start.reason };
  if (seconds===0) return { valid:true,lon,lat,wrapped:false };
  const metresLon=(degrees)=>METRES_PER_DEGREE*Math.max(.15,Math.cos(degrees*Math.PI/180));
  const middleLat=lat+start.v*seconds/(2*METRES_PER_DEGREE);
  const middleLon=wrapLongitude(lon+start.u*seconds/(2*metresLon(lat)));
  const middle=sampleWind(field,middleLon,middleLat);
  if (!middle.valid) return { valid:false,reason:middle.reason };
  const nextLat=lat+middle.v*seconds/METRES_PER_DEGREE;
  const rawLon=lon+middle.u*seconds/metresLon(middleLat);
  const nextLon=wrapLongitude(rawLon);
  if (!sampleWind(field,nextLon,nextLat).valid)
    return { valid:false, reason:'outside-field-domain' };
  const wrapped=Math.abs(rawLon-nextLon)>1e-7 || Math.abs(nextLon-lon)>180;
  return { valid:true,lon:nextLon,lat:nextLat,wrapped };
}

// Drawing continuity is independent of whether the integration itself is valid.
export function canDrawSegment(before,after,{maxLonDelta=20,maxLatDelta=20}={}) {
  if (!before || !after || after.wrapped || after.reset || after.valid===false) return false;
  const deltaLon=Math.abs(after.lon-before.lon);
  const deltaLat=Math.abs(after.lat-before.lat);
  return Number.isFinite(deltaLon) && Number.isFinite(deltaLat) &&
    deltaLon <= maxLonDelta && deltaLat <= maxLatDelta;
}
