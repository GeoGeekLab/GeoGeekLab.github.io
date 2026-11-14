# P8 — Stage acceptance, code merge and publication are distinct

Date: 2026-11-14. This is not a legal approval or an assertion of a live release.

The P8 integration reconciles the P7 development history with the two newer
GeoGeek main commits. It retains all current Light and other original site
features. It carries the pinned Watched source and isolated build scripts.

A **code-only merge** is permitted only when the default Pages workflow and
public GeoGeek site remain unchanged. The P8 code-only gate rejects automatic
activation. Consequently, such a merge adds source/tests but DOES NOT publish
OVERPASS as a fourteenth instrument.

A full public release still requires each of the following independent proofs:
1. Real HTTPS staging deployment of exact candidate and actual rollback to the
   previously deployed 13-card site, plus forward re-deployment tests.
2. Public Sentinel-2 historical frame downloads and a browser-created MP4
   that passes ffprobe; the encoder may fall back to VP9/AV1 where no H.264
   encoder is available, which needs an explicit compatibility decision.
3. Human review of MIT derivative identity, source attribution, data usage and
   font/texture licenses. The AI may prepare sources but cannot sign off.
4. Explicit static-only versus dynamic-backend scope approval for /api/pan,
   /api/og, /api/e and /s/:id. An absent endpoint must not be marked complete.
5. Fresh OMM snapshot gates on the date of publication.

A GitHub Actions ZIP and localhost preview are NOT independent HTTPS staging.
The staging smoke test refuses localhost and the two production site origins.
It only checks hosted content; a full rollback needs separate deployment
records, plus human approval.

## Review sources

- Original Watched MIT and data notices: https://github.com/dev-Armaan/satellites
- CelesTrak Usage Policy (GP refresh generally 2h): https://celestrak.org/usage-policy.php
- Planetary Computer API and preview terms: https://planetarycomputer.microsoft.com/terms
- Planetary Computer rate limits: https://planetarycomputer.microsoft.com/docs/
- Copernicus data versus portal terms: https://dataspace.copernicus.eu/terms-and-conditions

Watched's author distinguishes forks from the official Watched brand.
OVERPASS must retain attribution without suggesting official affiliation.
No automatic approval JSON will be generated.
