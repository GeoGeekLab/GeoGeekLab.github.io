# Flow V3 — Stage 7 integration and release decision

Updated: 2026-11-14. **Draft PR #200 is not approved for release.** This document records facts, separate decisions, and remaining evidence. It is not a sign-off.

## 1. Integrated candidate

- Repository: `GeoGeekLab/GeoGeekLab.github.io`.
- Branch: `feat/flow-lab-v3`; PR: https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/200
- Original Stage 6 HEAD: `64287f83a23d84a1d417c22778c4a355e9d2a74f`.
- Latest inspected main: `64b6a281d345bd6dc9b92698d252ba419a1f4ed0`.
- Integrated main into Flow in two-parent commit `94496402b0cd455020abb802b778835a4b548c0a`. All 17 main-only paths were carried forward without overwriting any of Flow's 34 changed paths.
- New non-deploying workflow: `.github/workflows/flow-v3-release-candidate.yml`. It builds the same `dist/` path as Pages, checks versioned assets, and runs Flow tests against the built output.
- Lab module loader and full-page entry are now versioned with `20261114flow1`. `scripts/verify-lab-cache-contract.mjs` asserts both entries share the release token.
- **Do not use Stage 6 CI as proof for the new head.** Review the latest PR Checks and release-candidate run after all commits settle.

## 2. Release decision matrix

| Gate | Evidence needed | Current disposition |
|---|---|---|
| Main integration | Current merge base, no overwritten unrelated work | Reconciled at `94496402`; recheck if main moves |
| Node/browser Flow | Latest head: full scientific, source, geometry, keyboard, accessibility and stress suites | Pending latest head conclusion |
| Cross-instrument CI | Latest head: Orbit, Earth Pulse (both), GeoGeek Quality | Pending latest head conclusion |
| Real `dist/` build | Release Candidate workflow: data supply, raster, real previews, production transform, cache and desktop/mobile tests | New mandatory CI; pending latest head conclusion |
| Data usage / provider approval | Operator confirms intended site use complies with free Open-Meteo terms or uses a commercial license | **Blocked: explicit operator decision required** |
| Request quota | Per-location effective API-unit budget and expected daily usage, provider-confirmed | **Blocked: not capacity-approved** |
| Historical data provenance | NOAA GFS / pinned cambecc JSON rights and visible non-official attribution | Evidence reviewed, operator approval still pending |
| Manual product review | Desktop, narrow phone, screen-reader/keyboard and actual lower-end mobile | **Blocked: human/real-device review required** |
| Production verification | Main SHA, Pages deployment, live source/CORS, all four URL modes and rollback check | Cannot run before authorized merge |

## 3. Provider use and quota: potentially material release blocker

The current browser runtime sends **one request containing 84 distinct latitude/longitude positions** to `api.open-meteo.com/v1/forecast` on every fresh Flow load. It requests `current=wind_speed_10m,wind_direction_10m` and uses `cache: 'no-store'`. This is 84 positions, **not proof of one billable API unit**.

- Official terms: https://open-meteo.com/en/terms — Free API is for non-commercial use, under 10,000 API units per day, 5,000/hour and 600/minute. Advertising or subscriptions may make the use commercial.
- Official pricing and weighted-call guidance: https://open-meteo.com/en/pricing — multi-location and payload weights matter. An HTTP request count is not a reliable quota budget.
- Open-Meteo community quota explanation (not a binding contract): https://github.com/open-meteo/open-meteo/discussions/2153 — each location contributes to the effective quota. If the 84 positions cost approximately 84 units per load, a 10,000-unit daily budget supports only about 119 independent page loads before other traffic. **Confirm this calculation with the provider; do not present it as an established billable count.**
- Open-Meteo-derived weather is CC BY 4.0 and needs an attribution link, the source and transformation disclosure. The interface currently displays source provenance, but the deployment and its terms still need human validation.
- A sustainable public deployment should use a shared, timestamped snapshot or a properly licensed server-side provider feed. Do not silently replace live weather with claimed observations, suppress provenance, or assume browser-level caching resolves global quota costs.

## 4. Historical GFS and cartography

- The pinned `cambecc/earth` JSON is generated from NOAA/NWS GFS GRIB output. Its repository documents the NOMADS extraction and grib2json conversion: https://github.com/cambecc/earth
- NOAA/NWS government data is public domain unless specifically noted otherwise; no endorsement or official-status claim is permitted: https://www.weather.gov/disclaimer
- This strongly supports the underlying NOAA data's reuse, **not a blanket claim about every possible contribution or third-party-hosted file**. Keep the source link, reference date and ARCHIVED status. Confirm the exact pinned JSON provenance and attribution before commercial release.
- Natural Earth source geometry is public domain; preserve source disclosure: https://www.naturalearthdata.com/about/terms-of-use/

## 5. Human acceptance and rollback checklist

1. Confirm the site is non-commercial, or provide the applicable paid Open-Meteo plan. Approve a provider-backed, realistic request budget or replace direct per-visitor 84-point fetching.
2. Inspect the latest successful Flow, full-site and non-deploying Pages candidate workflows at **one exact candidate SHA**. Review build logs and screenshots, not just green labels.
3. Exercise FIELD (model source and valid UTC), OD (authored directed weights), TRIPS (authored ordered samples), RELEASE (frozen-field integration) and all four deep links, including network/CORS failure.
4. Inspect mobile performance on a physical device, reduced motion, source disclosures and keyboard navigation. CI emulation and three-cycle heap checks do not replace this.
5. Obtain explicit code review and release approval. Only then mark PR #200 Ready and merge into `main`.
6. Verify the deployed Pages main SHA and cache tokens, public source links and fallback provenance. Preserve the merge SHA for a revert PR if production smoke fails.

**Stop rule:** Any failed required check, unresolved quota/use authorization, missing source attribution, failed production build, major mobile/accessibility issue, or absent release approval keeps PR #200 Draft and unmerged.
