# OVERPASS full runtime — third-party terms and attribution review

Engineering source review: 2026-11-14.
Pinned Watched revision: a0e53b62573655a81d48b60a35cf661df314f2b7.
Owner/project: GeoGeekLab/GeoGeekLab.github.io.

**Status: technical inventory and mitigation implemented in code where stated;
no human legal acceptance or provider contract has been signed. This document is
not a warranty of use rights, and does not authorize public launch.**

## Sources and decisions

| Provider / material | Primary terms checked | Required conduct | Engineering evidence / open decision |
| --- | --- | --- | --- |
| Watched, Armaan Gupta | https://github.com/dev-Armaan/satellites ; pinned LICENSE (MIT); THIRD_PARTY_NOTICES.md | Reproduce MIT copyright and license, distinguish independent OVERPASS from official Watched brand | Full build copies original LICENSE and THIRD_PARTY_NOTICES.md to public root. P2/P5 rename visible app and attribution. **Review server-rendered OG cards, icons and upstream wordmark for derivative brand confusion before launch.** |
| CelesTrak GP OMM | https://celestrak.org/usage-policy.php ; https://celestrak.org/NORAD/documentation/gp-data-formats.php (updated 2026) | Fetch only required groups, no more than once per update (~2h), no repeated errors; stop machine-to-machine requests immediately after ANY non-200 (including 301/403/50x); use JSON/CSV for 6-digit IDs | P12 catalog overlay sets redirect manual, stops all groups on non-200 and prevents repeated HTTP-error fetches. No public cron enabled. Require operator review of request volume, shared IP and proposed refresh schedule. |
| Copernicus Sentinel data | https://dataspace.copernicus.eu/terms-and-conditions ; https://documentation.dataspace.copernicus.eu/FAQ.html | Data is licensed separately from portal content. When modified, show "Contains modified Copernicus Sentinel data [Year]" | Time-lapse exports and upstream notices include this attribution. The source year must match every image. Avoid redistributing portal branding/media under the dataset license. CDSE client secret only in server runtime. |
| Microsoft Planetary Computer | https://planetarycomputer.microsoft.com/terms ; https://planetarycomputer.microsoft.com/docs/concepts/sas/ | Public preview is as-is, may throttle or stop and lacks production SLA. SAS tokens must expire, remain confidential where required and not be resold/shared contrary to terms | Existing real imagery query and fallback tested for Chromium export. Operational owner must accept preview availability, egress and privacy risks. Implement user-visible archive failure handling, usage monitoring and fallback. |
| USGS Landsat | https://www.usgs.gov/centers/eros/data-citation | Landsat imagery is US public domain. Credit USGS and retain dataset identification | Upstream notices credit the USGS; verify live UI credit and any modified Landsat pan band labels. |
| Solar System Scope Earth textures | https://play.solarsystemscope.com/textures/ ; https://creativecommons.org/licenses/by/4.0/ | CC BY 4.0 permits adaptation/commercial use with credit, license URL and description of modifications | Upstream THIRD_PARTY_NOTICES records resize/re-encode/channel packing and license. P12 publishes it. Review credit discoverability in the live UI. |
| Instrument Sans, Instrument Serif, Martian Mono | Upstream api/_fonts/OFL.txt and package licenses; SIL OFL 1.1 | Keep font licenses and rename modified/subset font instances where required by OFL | Upstream THIRD_PARTY_NOTICES lists modified instances and attribution. Full app preserves bundled license/source. |
| NASA GIBS / EOSDIS | https://www.earthdata.nasa.gov/ ; source-specific notices | NASA science data are generally openly reusable; identify each product/credit and do not suggest NASA endorses OVERPASS | Upstream notices and About contain credits; product-by-product terms still need human confirmation. |
| EUMETSAT Meteosat | https://www.eumetsat.int/legal-framework/data-policy | Confirm particular frames are Core, and provide required modified-data attribution with year | Upstream THIRD_PARTY_NOTICES lists Meteosat as Core and requires "Contains modified EUMETSAT Meteosat data [Year]". Human reviewer must confirm current category and reuse conditions. |
| OSM/Photon/Nominatim geocoding | https://operations.osmfoundation.org/policies/nominatim/ | Public Nominatim: maximum 1 request/sec, proper User-Agent/Referer, attribution, **no client autocomplete**, no systematic scanning. Photon service has separate operational terms | Public geocoder fallback uses third-party endpoints. Before exposing high-volume traffic, verify app routing, per-provider limits, caching and terms. Do not treat OSM data license as unlimited public API quota. |
| Vercel and Supabase | https://vercel.com/docs/deployments/environments ; https://supabase.com/docs | Protect server secrets, separate preview/prod DB and auth, implement RPC-only RLS, have privacy/disclosure and retention owner | P12 preflight enforces publishable-only browser key, distinct origin and a working read-only migrated get_stats RPC. Real hosting and database integration not yet proven. |

## Operational acceptance

1. Confirm license/notices render at the live dynamic application origin:
   /LICENSE and /THIRD_PARTY_NOTICES.md.
2. Confirm About and exported MP4 show modified-data year attribution.
3. Check real CDSE pan request works, not merely invalid-query error handling.
4. Check original Watched identity in all server share/OG cards. Do not imply affiliation.
5. Measure CelesTrak fetch cadence and halt on non-200. Never add a retry loop
   after an upstream HTTP error, even 301.
6. Confirm geocoding requests do not violate public Nominatim autocomplete/volume rules.
7. Confirm separate privacy, cookie, provider-routing and data-retention notices
   match actual Vercel, Supabase and upstream provider behavior.
8. Obtain final human provider/rights review and record the reviewer, revision and
   decision in Issue #205. Do not auto-generate accepted approval files.

## Where the evidence lives

- Upstream MIT and third-party notices: overpass/upstream/LICENSE,
  overpass/upstream/THIRD_PARTY_NOTICES.md
- Source-first full runtime overlay: overpass/scripts/prepare-p12-full-runtime.mjs
- Fatal CelesTrak HTTP behavior: overpass/scripts/p12-celestrak-policy.mjs
- Separate-host credential preflight: overpass/scripts/p12-runtime-preflight.mjs
- Live hosted source and notices observations: overpass/scripts/p12-live-runtime-smoke.mjs

**Provider terms sign-off remains PENDING.** No production acceptance is implied.
