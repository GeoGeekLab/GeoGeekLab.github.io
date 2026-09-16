(() => {
  'use strict';
  const config = window.GEOGEEK_COMMONS_CONFIG || { mode:'demo' };
  const demo = () => window.GeoCommonsDemo?.build?.(new Date()) || { mode:'demo', totalVisits:0, locatedVisits:0, places:[], observations:[], activeCount:0 };
  const LOCAL_KEY = 'geogeek-commons-local';
  const PUBLIC_PLACE_KEY = 'geogeek-commons-public-place';
  const MAX_LOCAL_OBSERVATIONS = 500;
  const MAX_LOCAL_PLACES = 200;
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
      Object.entries(payload).forEach(([key, value]) => value != null && url.searchParams.set(key, String(value)));
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

  function emptyLocal() {
    return { places: [], observations: [] };
  }

  function normalizeLocal(value) {
    const input = value && typeof value === 'object' ? value : emptyLocal();
    return {
      places: Array.isArray(input.places) ? input.places.slice(-MAX_LOCAL_PLACES) : [],
      observations: Array.isArray(input.observations) ? input.observations.slice(-MAX_LOCAL_OBSERVATIONS) : []
    };
  }

  function readLocalContributions() {
    try {
      return normalizeLocal(JSON.parse(localStorage.getItem(LOCAL_KEY) || '{"places":[],"observations":[]}'));
    } catch {
      return emptyLocal();
    }
  }

  function reportStorageError(context) {
    setTimeout(() => {
      try { window.dispatchEvent(new CustomEvent('geogeek:commons-storage-error', { detail: { context } })); }
      catch {}
    }, 0);
  }

  function writeLocalContributions(value, context = 'contribution') {
    try {
      const normalized = normalizeLocal(value);
      const serialized = JSON.stringify(normalized);
      localStorage.setItem(LOCAL_KEY, serialized);
      if (localStorage.getItem(LOCAL_KEY) !== serialized) throw new Error('Local storage verification failed');
      return true;
    } catch (error) {
      console.warn('[GeoGeek Commons] Local persistence failed.', error);
      reportStorageError(context);
      return false;
    }
  }

  function writePublicPlace(value) {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(PUBLIC_PLACE_KEY, serialized);
      if (localStorage.getItem(PUBLIC_PLACE_KEY) !== serialized) throw new Error('Public place verification failed');
      return true;
    } catch (error) {
      console.warn('[GeoGeek Commons] Local position persistence failed.', error);
      reportStorageError('location');
      return false;
    }
  }

  function mergeDemoWithLocal(snapshot) {
    const local = readLocalContributions();
    const placeMap = new Map((snapshot.places || []).map(place => [place.id, { ...place }]));
    for (const place of local.places) {
      const existing = placeMap.get(place.id);
      if (existing) Object.assign(existing, place);
      else placeMap.set(place.id, { ...place });
    }

    const observations = [...(snapshot.observations || []), ...local.observations];
    const observationCounts = new Map();
    for (const observation of observations) {
      if (!observation?.placeId) continue;
      observationCounts.set(observation.placeId, (observationCounts.get(observation.placeId) || 0) + 1);
    }

    const places = [...placeMap.values()];
    for (const place of places) place.observations = observationCounts.get(place.id) || 0;
    return {
      ...snapshot,
      places,
      observations,
      locatedVisits: places.reduce((sum, place) => sum + Number(place.visits || 0), 0)
    };
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
      localSnapshot = { mode:'live', ...data };
      return localSnapshot;
    } catch (error) {
      console.warn('[GeoGeek Commons] Snapshot failed.', error);
      const fallback = mergeDemoWithLocal(demo());
      localSnapshot = { ...fallback, backendError:true };
      return localSnapshot;
    }
  }

  async function recordVisit(meta = {}) {
    const sid = sessionId();
    try {
      if (sessionStorage.getItem('geogeek-commons-visit-recorded') === '1') return { skipped:true };
    } catch {}
    if (!isLive()) return { demo:true };
    const coarse = (() => { try { return JSON.parse(localStorage.getItem(PUBLIC_PLACE_KEY) || 'null'); } catch { return null; } })();
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
    const positionPersisted = writePublicPlace(normalized);
    if (!isLive()) {
      const local = readLocalContributions();
      const existing = local.places.find(item => item.id === normalized.id);
      if (existing) {
        existing.visits = Math.max(1, existing.visits || 0);
        existing.lastSeen = normalized.lastSeen;
      } else {
        local.places.push(normalized);
      }
      const persisted = writeLocalContributions(local, 'place');
      await updatePresence(normalized);
      return { mode:'demo', localOnly:true, place:normalized, persisted: persisted && positionPersisted, storageError: !(persisted && positionPersisted) };
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
      const id = `local-o-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      local.observations.push({ id, placeId:place.id, text:{ en:clean, zh:clean }, displayName:String(displayName || '').trim().slice(0,32), createdAt:new Date().toISOString(), status:'approved', localOnly:true });
      if (local.observations.length > MAX_LOCAL_OBSERVATIONS) local.observations.splice(0, local.observations.length - MAX_LOCAL_OBSERVATIONS);
      const localPlace = local.places.find(item => item.id === place.id);
      if (localPlace) localPlace.observations = Number(localPlace.observations || 0) + 1;
      else local.places.push({ ...place, visits:1, observations:1, firstSeen:new Date().toISOString(), lastSeen:new Date().toISOString(), active:true });
      const persisted = writeLocalContributions(local, 'observation');
      return { mode:'demo', localOnly:true, status:persisted ? 'approved' : 'storage-error', persisted, storageError:!persisted };
    }
    return request('observe', { sessionId:sessionId(), place, text:clean, displayName:String(displayName || '').trim().slice(0,32) });
  }

  async function startPresence(onChange) {
    if (!isLive() || !supabase) { onChange?.([]); return () => {}; }
    const key = sessionId();
    presenceChannel = supabase.channel('geogeek-commons-presence', { config:{ presence:{ key } } });
    presenceChannel.on('presence', { event:'sync' }, () => {
      const raw = presenceChannel.presenceState();
      presenceState = Object.values(raw).flat().filter(Boolean);
      onChange?.(presenceState);
    });
    await new Promise(resolve => {
      let settled = false;
      const finish = () => { if (!settled) { settled = true; resolve(); } };
      const timer = setTimeout(finish, 3500);
      presenceChannel.subscribe(status => {
        if (status === 'SUBSCRIBED') {
          let place = null;
          try { place = JSON.parse(localStorage.getItem(PUBLIC_PLACE_KEY) || 'null'); } catch {}
          presenceChannel.track({ located:Boolean(place), place: place ? { id:place.id, lat:place.lat, lon:place.lon, label:place.label, timezone:place.timezone } : null, at:new Date().toISOString() }).finally(() => { clearTimeout(timer); finish(); });
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          clearTimeout(timer);
          finish();
        }
      });
    });
    return () => {
      if (presenceChannel) supabase.removeChannel(presenceChannel);
      presenceChannel = null;
    };
  }

  async function updatePresence(place) {
    if (!presenceChannel) return;
    try { await presenceChannel.track({ located:Boolean(place), place: place ? { id:place.id, lat:place.lat, lon:place.lon, label:place.label, timezone:place.timezone } : null, at:new Date().toISOString() }); }
    catch {}
  }

  window.GeoCommonsData = {
    init,
    snapshot,
    recordVisit,
    light,
    observe,
    startPresence,
    updatePresence,
    isLive,
    sessionId,
    getConfig: () => config,
    getLocalLimits: () => ({ observations:MAX_LOCAL_OBSERVATIONS, places:MAX_LOCAL_PLACES })
  };
})();
