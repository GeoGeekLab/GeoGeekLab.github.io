# GeoGeek Commons backend

The public site remains static on GitHub Pages. Commons becomes live only after a small Supabase backend is configured.

## 1. Create the database

Create a Supabase project and run `supabase/schema.sql` in the SQL editor.

The schema keeps raw session IDs and moderation state server-side. Public location is stored only after the browser has snapped it to a coarse 0.25° cell; the Edge Function snaps it again before storage.

## 2. Deploy the Edge Function

Deploy `supabase/functions/commons/index.ts` as the `commons` function. Set these function secrets:
The included `supabase/config.toml` sets `verify_jwt = false` because this endpoint is intentionally public; the function itself applies origin checks, coarse-location validation, server-side resnapping, and request-rate limits.


- `COMMONS_RATE_SALT`: a long random value.
- `COMMONS_ALLOWED_ORIGIN`: `https://geogeeklab.github.io`
- `COMMONS_AUTO_APPROVE`: `false` for moderated observations, or `true` only if you intentionally want immediate publication.

Supabase provides `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to the function environment. Never put the service-role key in the website repository.

## 3. Configure the static site

Edit `commons/config.js`:

```js
window.GEOGEEK_COMMONS_CONFIG = {
  mode: 'live',
  supabaseUrl: 'https://YOUR_PROJECT.supabase.co',
  publishableKey: 'YOUR_PUBLISHABLE_KEY',
  functionName: 'commons',
  allowContributions: true,
  host: {
    label: { en: 'Wuhan, China', zh: '中国 · 武汉' },
    lat: 30.59,
    lon: 114.30,
    timezone: 'Asia/Shanghai'
  },
  privacy: { coarseDegrees: 0.25, observationMaxLength: 180 }
};
```

A Supabase publishable key is intended for browser use when server-side access controls are correctly configured. The service-role key remains only in the Edge Function.

## Data semantics

- `VISITS` = anonymous browser sessions, not unique people.
- `LOCATED VISITS` = visits for which the visitor explicitly chose to share a coarse place.
- Precise browser geolocation is never sent to the backend.
- Public observations are attached to the same coarse spatial cell.
- Realtime Presence is ephemeral. Only a coarse place is broadcast after the visitor has chosen to light it.
