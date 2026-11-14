# OVERPASS / P4 — Public Imagery and Results

## Source of truth

Watched is still pinned at a0e53b62573655a81d48b60a35cf661df314f2b7. The original
React, Three.js, SGP4 search, STAC matching, NASA GIBS, Sentinel-1 RTC, Results,
gallery filters, pass geometry, replay, and timeline source stay complete.

## Static hosting corrections

The original Landsat high-resolution flow prefers the 15 m server pan-sharpen
endpoint /api/pan, with a 2,000 px colour-render fallback. GitHub Pages cannot
serve /api/pan. The P4 build overlay makes panSharpUrl return undefined only
under /overpass/, causing hiResUrl to select its original fallback directly.
This avoids an unsuccessful same-origin API request and its associated delay.
**Do not label that 30 m source image as 15 m native detail.**

Original Results ShareSheet uses location.origin for deep links, which would
send users to GeoGeek's home instead of /overpass/. The P4 overlay preserves
the existing fallback deep-link metadata but makes the origin path-aware.
Short /s/ links and dynamic OG cards still require a server; static builds
should rely on their original query-string deep-link fallback.

## Verification

- Unit tests run against the actual Watched result model and Waterloo fixture.
  They check capture provenance, gallery filter counts, seven-day window and
  static Landsat high-res handling.
- Standalone real archive transport probes request STAC metadata for Sentinel-2,
  Landsat and Sentinel-1 from Microsoft Planetary Computer, the Earth Search
  Sentinel-2 fallback, and a 64 px NASA GIBS WMS JPEG.
- Live probes distinguish network failures, empty STAC results, and renderer
  responses. NASA JPEG 200 alone does NOT establish valid pixels. An archive
  item alone does NOT prove the satellite covered the point.
- Desktop and mobile browser checks use the real pinned catalog and query
  Waterloo through /overpass/?q=43.4723,-80.5449&n=Waterloo. They verify
  Results summary, timeline, gallery filter interaction when images are returned,
  runtime exceptions and same-origin 404s. They upload actual screenshots and
  a network response report.
- External services can fail, throttle or return zero images. The page MUST
  distinguish archive failure from 'no confirmed captures' and still display
  geometry. Provider availability reports are diagnostic, not mock evidence.
- The CI produces a static build artifact only. It never modifies production main.

## Out of scope / unresolved

This round does not deploy dynamic /api/pan, /api/og, /api/e, /s/:id or a
share database. It also does not replace CelesTrak feeds or add any fabricated
satellite image. Once the original Results browser checks are green, later
rounds can integrate replay/time-lapse and the Lab entrypoint.

P4 static build uses VITE_OVERPASS_STATIC=1 during the adapter tests and
full build. The source overlay also tests Vite BASE_URL=/overpass/ so a
manual static production build takes the same fallback even without the
explicit flag. No other deployment is modified.
