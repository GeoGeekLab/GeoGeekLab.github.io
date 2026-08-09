-- GeoGeek Commons / Supabase schema
-- The browser never receives raw session identifiers or precise GPS coordinates.

create extension if not exists pgcrypto;

create table if not exists public.commons_visits (
  id uuid primary key default gen_random_uuid(),
  session_id text not null unique,
  visited_at timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  path text,
  timezone text,
  coarse_lat numeric(6,2),
  coarse_lon numeric(7,2),
  place_label text,
  constraint commons_visits_lat check (coarse_lat is null or coarse_lat between -90 and 90),
  constraint commons_visits_lon check (coarse_lon is null or coarse_lon between -180 and 180)
);

create index if not exists commons_visits_visited_at_idx on public.commons_visits (visited_at desc);
create index if not exists commons_visits_location_idx on public.commons_visits (coarse_lat, coarse_lon) where coarse_lat is not null and coarse_lon is not null;

create table if not exists public.commons_observations (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  coarse_lat numeric(6,2) not null,
  coarse_lon numeric(7,2) not null,
  place_label text,
  timezone text,
  display_name text,
  body text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now(),
  constraint commons_observations_lat check (coarse_lat between -90 and 90),
  constraint commons_observations_lon check (coarse_lon between -180 and 180),
  constraint commons_observations_body check (char_length(body) between 1 and 180),
  constraint commons_observations_name check (display_name is null or char_length(display_name) <= 32)
);

create index if not exists commons_observations_public_idx on public.commons_observations (status, created_at desc);
create index if not exists commons_observations_location_idx on public.commons_observations (coarse_lat, coarse_lon) where status = 'approved';

create table if not exists public.commons_rate_limits (
  key text primary key,
  hits integer not null default 1,
  expires_at timestamptz not null
);

alter table public.commons_visits enable row level security;
alter table public.commons_observations enable row level security;
alter table public.commons_rate_limits enable row level security;

-- No browser-readable policies are created. All persistent Commons access goes through
-- the Edge Function using the service role. This keeps raw session IDs private.
revoke all on public.commons_visits from anon, authenticated;
revoke all on public.commons_observations from anon, authenticated;
revoke all on public.commons_rate_limits from anon, authenticated;

create or replace function public.commons_rate_hit(p_key text, p_limit integer, p_ttl_minutes integer default 60)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  n integer;
begin
  delete from public.commons_rate_limits where expires_at < now();
  insert into public.commons_rate_limits(key, hits, expires_at)
  values (p_key, 1, now() + make_interval(mins => p_ttl_minutes))
  on conflict (key) do update set hits = public.commons_rate_limits.hits + 1
  returning hits into n;
  return n <= p_limit;
end;
$$;

revoke all on function public.commons_rate_hit(text, integer, integer) from public;
grant execute on function public.commons_rate_hit(text, integer, integer) to service_role;
