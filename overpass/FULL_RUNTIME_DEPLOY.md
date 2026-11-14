# OVERPASS complete dynamic API — separate Vercel deployment

Status: implementation prepared, **not deployed, not approved for public release**.
Revision: 2026-11-14. This plan retains existing GeoGeek 13-card Pages
site and never binds API endpoints to GitHub Pages.

## Actual hosting topology

    GeoGeek github.io (existing 13 Lab cards; no change)
                |
      [future reviewed 14th Lab link]
                v
    Independent HTTPS OVERPASS origin, e.g. overpass.example.org
      |-- /                    OVERPASS Vite SPA
      |-- /assets/             frontend bundles
      |-- /data/               compact CelesTrak catalog snapshots
      |-- /api/pan             CDSE Landsat pan (server credentials)
      |-- /api/og              share-card JPEG (server function)
      |-- /api/e               telemetry relay (server function)
      |-- /s/:id               share-link server route /api/s
      |-- /LICENSE             original Watched MIT license
      |-- /THIRD_PARTY_NOTICES.md
             |
             +-- Supabase RPC-only database (shares, counters and analytics)
             +-- CDSE OAuth server credentials (never in VITE_ variables)
             +-- External STAC, imagery and geocoder providers

This is a *standalone application root*, not /overpass/ on GitHub Pages.
The P12 full runtime overlay reverts Vite base to "/", restores the
original /api/pan path, publishes notices and corrects the static-only
About copy. The upstream gitlink remains pinned and unchanged in Git.

## Configure services before the FIRST real Preview

1. Create a **dedicated Vercel project** for OVERPASS, separate from GeoGeek
   Pages. Choose a stable HTTPS production hostname. Do not promote or attach
   it to the public GeoGeek navigation until all launch gates pass.
2. Create a separate **Supabase preview project**, then apply upstream
   supabase/migrations/*.sql in their documented order. Do not copy live
   production user data to Preview. Confirm RPC-only permissions/RLS and
   get_stats works with the publishable (not service_role) key.
3. Obtain CDSE OAuth client credentials for the Landsat pan API; put them
   only in the Vercel server-side runtime settings.
4. In the Vercel project **Preview** environment, set:

   - VITE_SUPABASE_URL (https origin of the isolated preview Supabase project)
   - VITE_SUPABASE_PUBLISHABLE_KEY (sb_publishable_... only; public by design)
   - SITE_URL (future dedicated production HTTPS origin)
   - VITE_SITE_ORIGIN (exact same origin; canonical link tags)
   - VITE_OVERPASS_PRODUCTION_HOST (hostname only, matches SITE_URL)
   - VITE_OVERPASS_STATIC=0
   - CDSE_CLIENT_ID and CDSE_CLIENT_SECRET (server-side only)

   For Vercel Production use a **separate production Supabase project** and
   review all variables again. Never enable the E2E telemetry bypass in
   staging/production.

5. In GitHub Actions create environment overpass-full-backend-preview.
   Configure secrets VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID for this
   dedicated project. Use a token limited to the needed deployment project.
   Add an independent environment approval rule if available. Do not commit
   any token to Git. Do not paste secrets in chat or an Issue.

6. Manually run .github/workflows/overpass-p12-vercel-preview.yml from
   the P12 branch. This workflow:
   - Installs pinned upstream dependencies and passes upstream backend tests;
   - Applies P2/P4/P5 + P12 full runtime and CelesTrak non-200 safety patches
     in the disposable checkout;
   - Pulls Vercel Preview credentials, **fails** if runtime config is missing;
   - Calls a read-only migrated Supabase get_stats RPC;
   - Builds Vercel Functions and static files;
   - Deploys a Vercel **Preview** URL only (never --prod);
   - Observes HTTPS /, /api/og, invalid /api/pan, method-guard /api/e,
     missing /s ID, LICENSE and THIRD_PARTY_NOTICES paths;
   - Uploads route evidence without secrets.

   A successful invalid-query 400 on /api/pan does NOT prove that a valid
   15 m crop succeeds. A database get_stats RPC does NOT prove share writes.
   Run separate real read/write, pan-crop and provider quota tests before
   full API acceptance.

## Publication gates retained after the Preview

1. Fix any full API smoke defects and verify a real 200 Landsat pan crop.
   Confirm a short share can be written/read and OG cards resolve.
2. Review backend-function rate limits, provider costs, Supabase RPC policies,
   auth/privacy and retention. Verify the derivative does not use the
   original Watched brand in server-rendered OG cards.
3. Complete independent staging candidate → 13-card baseline rollback →
   exact candidate redeployment and capture provider deployment receipts.
   For the new dedicated host, use equivalent immutable deployment IDs.
4. Confirm Safari/iPhone MP4 playback or approve a clearly displayed
   unsupported-codec limitation. Linux VP9/MP4 is not Safari proof.
5. Confirm Watched 48h and GeoGeek 8h orbit catalog freshness **at actual
   publication time**. CelesTrak non-200 must stop immediately. Enable
   refresh scheduling only after separately approved rate limits.
6. Obtain human legal/provider terms review, then create a separate GeoGeek
   source-first Lab entry PR pointing to the **verified live full origin**.
   Build and test the 14-card host. Do not modify production by postbuild
   HTML surgery.
7. Release the already-tested backend first; then roll out the GeoGeek
   Lab link. Track explicit immutable artifact SHA and rollback instructions.

## Why the existing main Pages deployment is insufficient

GitHub Pages cannot execute Vercel serverless functions or store Supabase
credentials. Copying the P8 static build to Pages silently degrades /api/pan,
/api/og, /api/e and /s/:id. A *complete* OVERPASS must have a dedicated
dynamic host, a database and valid provider credentials.

**CURRENT STATUS:** no live full dynamic host, no supplied Vercel/Supabase
authorization, no real HTTPS rollback or human legal approval, so production
remains BLOCKED.
