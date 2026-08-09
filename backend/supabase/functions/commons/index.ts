import { createClient } from 'npm:@supabase/supabase-js@2.112.1'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const RATE_SALT = Deno.env.get('COMMONS_RATE_SALT') || 'replace-this-salt'
const ALLOWED_ORIGIN = Deno.env.get('COMMONS_ALLOWED_ORIGIN') || 'https://geogeeklab.github.io'
const AUTO_APPROVE = Deno.env.get('COMMONS_AUTO_APPROVE') === 'true'
const db = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false } })

function cors(req: Request) {
  const origin = req.headers.get('origin') || ''
  const allowed = origin === ALLOWED_ORIGIN || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
  return {
    'Access-Control-Allow-Origin': allowed ? origin : ALLOWED_ORIGIN,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Vary': 'Origin'
  }
}

function json(req: Request, data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...cors(req), 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } })
}

function clientIp(req: Request) {
  return (req.headers.get('cf-connecting-ip') || req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim()
}

async function digest(value: string) {
  const bytes = new TextEncoder().encode(value)
  const hash = await crypto.subtle.digest('SHA-256', bytes)
  return [...new Uint8Array(hash)].map(b => b.toString(16).padStart(2, '0')).join('')
}

async function rateLimit(req: Request, action: string, limit: number, ttl = 60) {
  const hour = new Date().toISOString().slice(0, 13)
  const ipHash = await digest(`${RATE_SALT}|${clientIp(req)}|${hour}`)
  const { data, error } = await db.rpc('commons_rate_hit', { p_key: `${action}:${hour}:${ipHash}`, p_limit: limit, p_ttl_minutes: ttl })
  if (error) throw error
  return Boolean(data)
}

const number = (v: unknown) => Number.isFinite(Number(v)) ? Number(v) : null
const snap = (v: number, step = .25) => Math.round(v / step) * step
const validSession = (value: unknown) => typeof value === 'string' && value.length >= 8 && value.length <= 120

function safePlace(raw: any) {
  if (!raw) return null
  const lat = number(raw.lat), lon = number(raw.lon)
  if (lat == null || lon == null || lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  const slat = Number(snap(lat).toFixed(2)), slon = Number(snap(lon).toFixed(2))
  return {
    lat: slat, lon: slon,
    label: typeof raw.label === 'string' ? raw.label.slice(0, 80) : `${slat.toFixed(2)}°, ${slon.toFixed(2)}°`,
    timezone: typeof raw.timezone === 'string' ? raw.timezone.slice(0, 80) : null
  }
}

function sinceFor(horizon: string | null) {
  const now = Date.now()
  if (horizon === '24h') return new Date(now - 24 * 3600000).toISOString()
  if (horizon === '7d') return new Date(now - 7 * 86400000).toISOString()
  if (horizon === '30d') return new Date(now - 30 * 86400000).toISOString()
  return null
}

function hourAt(iso: string, timezone: string | null, ref: string) {
  const date = new Date(iso)
  if (ref !== 'local' || !timezone) return date.getUTCHours()
  try { return Number(new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour:'2-digit', hourCycle:'h23' }).format(date)) }
  catch { return date.getUTCHours() }
}

async function snapshot(url: URL) {
  const horizon = url.searchParams.get('horizon') || '30d'
  const mode = url.searchParams.get('mode') || 'accumulated'
  const timeRef = url.searchParams.get('timeRef') || 'utc'
  const selectedHour = Math.max(0, Math.min(23, Number(url.searchParams.get('hour') || 12)))
  const since = sinceFor(horizon)

  let visitQuery = db.from('commons_visits').select('visited_at,last_seen,timezone,coarse_lat,coarse_lon,place_label').order('visited_at', { ascending:false }).limit(10000)
  if (since) visitQuery = visitQuery.gte('visited_at', since)
  const { data: visits, error: visitError } = await visitQuery
  if (visitError) throw visitError

  let observationQuery = db.from('commons_observations').select('id,coarse_lat,coarse_lon,place_label,timezone,display_name,body,created_at').eq('status','approved').order('created_at',{ascending:false}).limit(2000)
  if (since) observationQuery = observationQuery.gte('created_at', since)
  const { data: observations, error: observationError } = await observationQuery
  if (observationError) throw observationError

  const visitRows = (visits || []).filter((row:any) => mode !== 'hourly' || hourAt(row.visited_at, row.timezone, timeRef) === selectedHour)
  const observationRows = (observations || []).filter((row:any) => mode !== 'hourly' || hourAt(row.created_at, row.timezone, timeRef) === selectedHour)
  const places = new Map<string, any>()
  for (const row of visitRows as any[]) {
    if (row.coarse_lat == null || row.coarse_lon == null) continue
    const key = `${Number(row.coarse_lat).toFixed(2)},${Number(row.coarse_lon).toFixed(2)}`
    const item = places.get(key) || { id:`cell-${key}`, lat:Number(row.coarse_lat), lon:Number(row.coarse_lon), label:row.place_label || key, timezone:row.timezone || null, visits:0, observations:0, firstSeen:row.visited_at, lastSeen:row.last_seen || row.visited_at }
    item.visits += 1
    if (row.visited_at < item.firstSeen) item.firstSeen = row.visited_at
    if ((row.last_seen || row.visited_at) > item.lastSeen) item.lastSeen = row.last_seen || row.visited_at
    places.set(key,item)
  }
  for (const row of observationRows as any[]) {
    const key = `${Number(row.coarse_lat).toFixed(2)},${Number(row.coarse_lon).toFixed(2)}`
    const item = places.get(key) || { id:`cell-${key}`, lat:Number(row.coarse_lat), lon:Number(row.coarse_lon), label:row.place_label || key, timezone:row.timezone || null, visits:0, observations:0, firstSeen:row.created_at, lastSeen:row.created_at }
    item.observations += 1
    places.set(key,item)
  }
  const obsOut = (observationRows as any[]).map(row => ({
    id:row.id, placeId:`cell-${Number(row.coarse_lat).toFixed(2)},${Number(row.coarse_lon).toFixed(2)}`,
    text:row.body, displayName:row.display_name || '', createdAt:row.created_at, status:'approved'
  }))
  return { generatedAt:new Date().toISOString(), totalVisits:visitRows.length, locatedVisits:visitRows.filter((v:any)=>v.coarse_lat != null && v.coarse_lon != null).length, places:[...places.values()], observations:obsOut, activeCount:0 }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status:204, headers:cors(req) })
  try {
    const url = new URL(req.url)
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
    const action = req.method === 'GET' ? (url.searchParams.get('action') || 'snapshot') : body.action

    if (action === 'snapshot') {
      if (!await rateLimit(req,'snapshot',120,60)) return json(req,{error:'rate_limited'},429)
      return json(req, await snapshot(url))
    }

    if (action === 'visit') {
      if (!await rateLimit(req,'visit',30,60)) return json(req,{error:'rate_limited'},429)
      if (!validSession(body.sessionId)) return json(req,{error:'invalid_session'},400)
      const place = safePlace(body.place)
      const row:any = { session_id:body.sessionId, last_seen:new Date().toISOString(), path:typeof body.path==='string'?body.path.slice(0,160):null, timezone:typeof body.timezone==='string'?body.timezone.slice(0,80):null }
      if (place) { row.coarse_lat=place.lat; row.coarse_lon=place.lon; row.place_label=place.label; row.timezone=place.timezone || row.timezone }
      const { error } = await db.from('commons_visits').upsert(row,{onConflict:'session_id',ignoreDuplicates:false})
      if (error) throw error
      return json(req,{ok:true})
    }

    if (action === 'light') {
      if (!await rateLimit(req,'light',12,60)) return json(req,{error:'rate_limited'},429)
      if (!validSession(body.sessionId)) return json(req,{error:'invalid_session'},400)
      const place = safePlace(body.place)
      if (!place) return json(req,{error:'invalid_place'},400)
      const row = { session_id:body.sessionId, last_seen:new Date().toISOString(), coarse_lat:place.lat, coarse_lon:place.lon, place_label:place.label, timezone:place.timezone }
      const { error } = await db.from('commons_visits').upsert(row,{onConflict:'session_id',ignoreDuplicates:false})
      if (error) throw error
      return json(req,{ok:true,place:{id:`cell-${place.lat.toFixed(2)},${place.lon.toFixed(2)}`,...place}})
    }

    if (action === 'observe') {
      if (!await rateLimit(req,'observe',5,60)) return json(req,{error:'rate_limited'},429)
      if (!validSession(body.sessionId)) return json(req,{error:'invalid_session'},400)
      const place = safePlace(body.place)
      const text = typeof body.text === 'string' ? body.text.trim().slice(0,180) : ''
      const displayName = typeof body.displayName === 'string' ? body.displayName.trim().slice(0,32) : ''
      if (!place || !text) return json(req,{error:'invalid_observation'},400)
      const status = AUTO_APPROVE ? 'approved' : 'pending'
      const { error } = await db.from('commons_observations').insert({ session_id:body.sessionId, coarse_lat:place.lat, coarse_lon:place.lon, place_label:place.label, timezone:place.timezone, display_name:displayName || null, body:text, status })
      if (error) throw error
      return json(req,{ok:true,status})
    }

    return json(req,{error:'unknown_action'},400)
  } catch (error) {
    console.error(error)
    return json(req,{error:'internal_error'},500)
  }
})
