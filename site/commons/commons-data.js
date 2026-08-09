(() => {
  'use strict';
  const config = window.GEOGEEK_COMMONS_CONFIG || { mode:'demo' };
  const demo = () => window.GeoCommonsDemo?.build?.(new Date()) || { mode:'demo', totalVisits:0, locatedVisits:0, places:[], observations:[], activeCount:0 };
  let supabase = null;
  let presenceChannel = null;
  let presenceState = [];
  let localSnapshot = null;

  function sessionId() {
    try {
      let id = sessionStorage.getItem('geogeek-commons-session');
      if (!id) {
        id = crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
        sessionStorage.setItem('geogeek-commons-session', id);
      }
      return id;
    } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
  }

  function isLive() {
    return config.mode === 'live' && Boolean(config.supabaseUrl && config.publishableKey);
  }

  async function request(action, payload = {}, method = 'POST') {
    if (!isLive()) throw new Error('Commons backend is not configured');
    const url = new URL(`${config.supabaseUrl.replace(/\/$/, '')}/functions/v1/${config.functionName || 'commons'}`);
    if (method === 'GET') {
      url.searchParams.set('action', action);
      Object.entries(payload).forEach(([k,v]) => v != null && url.searchParams.set(k, String(v)));
    }
    const response = await fetch(url, {
      method,
      headers: {
        apikey: config.publishableKey,
        Authorization: `Bearer ${config.publishableKey}`,
        'Content-Type': 'application/json'
      },
      body: method === 'GET' ? undefined : JSON.stringify({ action, ...payload })
    });
    if (!response.ok) throw new Error(`Commons ${action}: ${response.status}`);
    return response.json();
  }

  function readLocalContributions() {
    try { return JSON.parse(localStorage.getItem('geogeek-commons-local') || '{"places":[],"observations":[]}'); }
    catch { return { places:[], observations:[] }; }
  }

  function writeLocalContributions(value) {
    try { localStorage.setItem('geogeek-commons-local', JSON.stringify(value)); } catch {}
  }

  function mergeDemoWithLocal(snapshot) {
    const local = readLocalContributions();
    const places = [...snapshot.places.map(p => ({...p}))];
    const observations = [...snapshot.observations];
    local.places.forEach(p => {
      const existing = places.find(x => x.id === p.id);
      if (existing) Object.assign(existing, p);
      else places.push(p);
    });
    local.observations.forEach(o => observations.push(o));
    places.forEach(p => { p.observations = observations.filter(o => o.placeId === p.id).length; });
    return { ...snapshot, places, observations, locatedVisits: places.reduce((s,p)=>s+(p.visits||0),0) };
  }

  async function init() {
    if (!isLive()) {
      localSnapshot = mergeDemoWithLocal(demo());
      return { mode:'demo', status:'demo' };
    }
    try {
      const mod = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.112.1/+esm');
      supabase = mod.createClient(config.supabaseUrl, config.publishableKey, { auth:{ persistSession:false, autoRefreshToken:false, detectSessionInUrl:false } });
      return { mode:'live', status:'live' };
    } catch (error) {
      console.warn('[GeoGeek Commons] Supabase unavailable; using demo field.', error);
      localSnapshot = mergeDemoWithLocal(demo());
      return { mode:'demo', status:'error', error };
    }
  }

  async function snapshot(filters = {}) {
    if (!isLive() || !supabase) {
      localSnapshot = mergeDemoWithLocal(demo());
      return localSnapshot;
    }
    try {
      const data = await request('snapshot', filters, 'GET');
      return { mode:'live', ...data };
    } catch (error) {
      console.warn('[GeoGeek Commons] Snapshot failed.', error);
      const fallback = mergeDemoWithLocal(demo());
      return { ...fallback, backendError:true };
    }
  }

  async function recordVisit(meta = {}) {
    const sid = sessionId();
    try {
      if (sessionStorage.getItem('geogeek-commons-visit-recorded') === '1') return { skipped:true };
    } catch {}
    if (!isLive()) return { demo:true };
    const coarse = (() => { try { return JSON.parse(localStorage.getItem('geogeek-commons-public-place') || 'null'); } catch { return null; } })();
    const result = await request('visit', {
      sessionId: sid,
      path: meta.path || location.pathname,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || null,
      place: coarse ? { lat:coarse.lat, lon:coarse.lon, label:coarse.label || null, timezone:coarse.timezone || null } : null
    });
    try { sessionStorage.setItem('geogeek-commons-visit-recorded','1'); } catch {}
    return result;
  }

  async function light(place) {
    if (isLive() && !config.allowContributions) throw new Error('Commons contributions are disabled');
    const normalized = { ...place, id: place.id || `local-${place.lat.toFixed(2)}-${place.lon.toFixed(2)}`, visits:1, observations:0, lastSeen:new Date().toISOString(), firstSeen:new Date().toISOString(), active:true };
    try { localStorage.setItem('geogeek-commons-public-place', JSON.stringify(normalized)); } catch {}
    if (!isLive()) {
      const local = readLocalContributions();
      const existing = local.places.find(p => p.id === normalized.id);
      if (existing) { existing.visits = Math.max(1, existing.visits || 0); existing.lastSeen = normalized.lastSeen; }
      else local.places.push(normalized);
      writeLocalContributions(local);
      await updatePresence(normalized);
      return { mode:'demo', localOnly:true, place:normalized };
    }
    const result = await request('light', { sessionId:sessionId(), place:normalized });
    await updatePresence(normalized);
    return result;
  }

  async function observe(place, text, displayName = '') {
    if (isLive() && !config.allowContributions) throw new Error('Commons contributions are disabled');
    const clean = String(text || '').trim().slice(0, config.privacy?.observationMaxLength || 180);
    if (!clean) throw new Error('Empty observation');
    if (!isLive()) {
      const local = readLocalContributions();
      const id = `local-o-${Date.now()}`;
      local.observations.push({ id, placeId:place.id, text:{ en:clean, zh:clean }, displayName:String(displayName || '').trim().slice(0,32), createdAt:new Date().toISOString(), status:'approved', localOnly:true });
      const p = local.places.find(p => p.id === place.id);
      if (p) p.observations = (p.observations || 0) + 1;
      else local.places.push({ ...place, visits:1, observations:1, firstSeen:new Date().toISOString(), lastSeen:new Date().toISOString(), active:true });
      writeLocalContributions(local);
      return { mode:'demo', localOnly:true, status:'approved' };
    }
    return request('observe', { sessionId:sessionId(), place, text:clean, displayName:String(displayName || '').trim().slice(0,32) });
  }

  async function startPresence(onChange) {
    if (!isLive() || !supabase) { onChange?.([]); return () => {}; }
    const key = sessionId();
    presenceChannel = supabase.channel('geogeek-commons-presence', { config:{ presence:{ key } } });
    presenceChannel.on('presence', { event:'sync' }, () => {
      const raw = presenceChannel.presenceState();
      presenceState = Object.values(raw).flat().map(x => x).filter(Boolean);
      onChange?.(presenceState);
    });
    await new Promise(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      const timer = setTimeout(finish, 3500);
      presenceChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          let place = null;
          try { place = JSON.parse(localStorage.getItem('geogeek-commons-public-place') || 'null'); } catch {}
          presenceChannel.track({ located:Boolean(place), place: place ? { id:place.id, lat:place.lat, lon:place.lon, label:place.label, timezone:place.timezone } : null, at:new Date().toISOString() }).finally(() => { clearTimeout(timer); finish(); });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') { clearTimeout(timer); finish(); }
      });
    });
    return () => { if (presenceChannel) supabase.removeChannel(presenceChannel); presenceChannel = null; };
  }

  async function updatePresence(place) {
    if (!presenceChannel) return;
    try { await presenceChannel.track({ located:Boolean(place), place: place ? { id:place.id, lat:place.lat, lon:place.lon, label:place.label, timezone:place.timezone } : null, at:new Date().toISOString() }); } catch {}
  }

  window.GeoCommonsData = { init, snapshot, recordVisit, light, observe, startPresence, updatePresence, isLive, sessionId, getConfig:()=>config };
})();
