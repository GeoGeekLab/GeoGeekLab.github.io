(() => {
  'use strict';
  const cfg = window.GEOGEEK_COMMONS_CONFIG;
  if (!cfg || cfg.mode !== 'live' || !cfg.supabaseUrl || !cfg.publishableKey) return;
  try {
    if (sessionStorage.getItem('geogeek-commons-visit-recorded') === '1') return;
  } catch {}
  const sid = (() => {
    try {
      let id = sessionStorage.getItem('geogeek-commons-session');
      if (!id) { id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`; sessionStorage.setItem('geogeek-commons-session', id); }
      return id;
    } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  })();
  let place = null;
  try { place = JSON.parse(localStorage.getItem('geogeek-commons-public-place') || 'null'); } catch {}
  const url = `${cfg.supabaseUrl.replace(/\/$/,'')}/functions/v1/${cfg.functionName || 'commons'}`;
  fetch(url, {
    method:'POST', keepalive:true,
    headers:{ apikey:cfg.publishableKey, Authorization:`Bearer ${cfg.publishableKey}`, 'Content-Type':'application/json' },
    body:JSON.stringify({ action:'visit', sessionId:sid, path:location.pathname, timezone:Intl.DateTimeFormat().resolvedOptions().timeZone || null, place:place ? { lat:place.lat, lon:place.lon, label:place.label || null, timezone:place.timezone || null } : null })
  }).then(response => {
    if (response.ok) try { sessionStorage.setItem('geogeek-commons-visit-recorded','1'); } catch {}
  }).catch(()=>{});
})();
