(() => {
  'use strict';
  const R = 6371.0088;
  const toRad = d => d * Math.PI / 180;
  const toDeg = r => r * 180 / Math.PI;
  const normLon = lon => ((lon + 540) % 360) - 180;
  const clampLat = lat => Math.max(-89.999, Math.min(89.999, lat));

  function distanceKm(a, b) {
    const p1 = toRad(a.lat), p2 = toRad(b.lat);
    const dp = toRad(b.lat - a.lat), dl = toRad(b.lon - a.lon);
    const h = Math.sin(dp / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) ** 2;
    return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
  }

  function initialBearing(a, b) {
    const p1 = toRad(a.lat), p2 = toRad(b.lat), dl = toRad(b.lon - a.lon);
    const y = Math.sin(dl) * Math.cos(p2);
    const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(dl);
    return (toDeg(Math.atan2(y, x)) + 360) % 360;
  }

  function snap(point, step = 0.25) {
    return {
      lat: Math.round(clampLat(point.lat) / step) * step,
      lon: normLon(Math.round(normLon(point.lon) / step) * step)
    };
  }

  function julianDate(date) { return date.getTime() / 86400000 + 2440587.5; }
  function subsolar(date = new Date()) {
    const d = julianDate(date) - 2451545.0;
    const g = toRad(normLon(357.529 + 0.98560028 * d));
    const q = normLon(280.459 + 0.98564736 * d);
    const L = toRad(normLon(q + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g)));
    const e = toRad(23.439 - 0.00000036 * d);
    const ra = Math.atan2(Math.cos(e) * Math.sin(L), Math.cos(L));
    const dec = Math.asin(Math.sin(e) * Math.sin(L));
    const gmst = normLon(280.46061837 + 360.98564736629 * d);
    return { lat: toDeg(dec), lon: normLon(toDeg(ra) - gmst) };
  }

  function solarAltitude(point, date = new Date()) {
    const sun = subsolar(date);
    const p1 = toRad(point.lat), p2 = toRad(sun.lat), dl = toRad(point.lon - sun.lon);
    return toDeg(Math.asin(Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)));
  }

  function formatDistance(km) {
    if (!Number.isFinite(km)) return '—';
    return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km).toLocaleString()} km`;
  }

  function cardinal(deg) {
    const dirs = ['N','NE','E','SE','S','SW','W','NW'];
    return dirs[Math.round(deg / 45) % 8];
  }

  function localTime(timeZone, date = new Date(), locale = 'en') {
    try {
      return new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-GB', {
        timeZone, hour: '2-digit', minute: '2-digit', hour12: false
      }).format(date);
    } catch { return '—'; }
  }

  function timeZoneOffsetMinutes(timeZone, date = new Date()) {
    try {
      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone, year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
      }).formatToParts(date).reduce((a,p)=>(a[p.type]=p.value,a),{});
      const asUTC = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour % 24, +parts.minute, +parts.second);
      return Math.round((asUTC - date.getTime()) / 60000);
    } catch { return null; }
  }

  window.GeoCommonsGeo = { distanceKm, initialBearing, snap, subsolar, solarAltitude, formatDistance, cardinal, localTime, timeZoneOffsetMinutes, normLon };
})();
