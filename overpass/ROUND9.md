# P9–P11 release hardening (NOT PUBLICATION APPROVAL)

Date: 2026-11-14. Branch: feature/overpass-p9-release-readiness.

## Current evidence boundary

PR #204 is code-only. Production GeoGeek has 13 Lab cards. Existing Pages run
43590366026 completed successfully, which does not indicate that OVERPASS was deployed.
No change to site/, the default Pages workflow, or the disabled catalog refresh
schedule is permitted in this branch. Issue #205 remains the release authority.

## P9 — independent HTTPS staging sequence

The P8 staging smoke script checks one hosted phase. The P9 proof tool
'overpass/scripts/p9-staging-proof.mjs' adds a content-addressed three-phase
protocol. It cannot deploy, claim a hosting rollback, or approve publication.

Use an *independent, non-production HTTPS origin* with a deploy mechanism able
to select immutable artifacts. Do not use geogeeklab.github.io as staging.
Keep the original 13-instrument build immutable. Build the source-authored
14-instrument candidate with the existing P8 workflow. Do not substitute the
code-only main Pages artifact for the candidate.

For each build artifact, create a SHA-256 manifest for critical paths:

    node overpass/scripts/p9-staging-proof.mjs manifest candidate \
      /path/to/candidate-root FULL_40_CHARACTER_SOURCE_SHA candidate-manifest.json
    node overpass/scripts/p9-staging-proof.mjs manifest rollback \
      /path/to/baseline-root FULL_40_CHARACTER_SOURCE_SHA rollback-manifest.json

A manifest proves only the selected file hashes. It does **not** hash all bytes
in the entire site. Retain the host's immutable artifact ID and signed deployment
audit log separately. Run *after* real hosting-provider deployment operations:

    # Deploy exact candidate to independent host, then check:
    node overpass/scripts/p9-staging-proof.mjs probe candidate \
      https://staging.example.org/ candidate-manifest.json DEPLOY_ID_A candidate-report.json

    # Physically restore the original build at that same host, then check:
    node overpass/scripts/p9-staging-proof.mjs probe rollback \
      https://staging.example.org/ rollback-manifest.json DEPLOY_ID_B rollback-report.json

    # Physically redeploy the exact candidate and check again:
    node overpass/scripts/p9-staging-proof.mjs probe redeploy \
      https://staging.example.org/ candidate-manifest.json DEPLOY_ID_C redeploy-report.json

    node overpass/scripts/p9-staging-proof.mjs verify \
      candidate-report.json rollback-report.json redeploy-report.json sequence.json

All three deployment IDs must differ. The probe requires byte-exact hashes of
critical content and no cross-host redirects. Verification enforces an unchanged
candidate artifact after redeployment, a different rollback Lab, and observation
order. Upload these four JSON files, original build artifacts, host deployment
receipts and checksums to Issue #205. Run Chrome and actual mobile smoke on the
hosted candidate after *both* deployments. A reviewer must inspect the hosting
receipts and approve staging separately. Neither JSON output nor a copied URL
constitutes physical-rollback proof. Never issue an automatic approval file.

A deployment integration is still **unconfigured**. It requires a chosen
independent hosting account, its narrowly scoped credentials and its documented
rollback/deploy operations. Do not use GitHub Pages production credentials
to trial a candidate.

## P10 — desktop MP4 and Apple compatibility

The earlier real Sentinel-2 archive test generated VP9-in-MP4 at 720×720
in Chromium. The desktop 1080px encoder previously timed out at 98%.
The P9 desktop workflow runs the same real archive browser probe with desktop
viewport and demands an actual ffprobe video width of at least 1080. It does
not synthesize imagery, replace APIs, or report success when timed out.

The presence of an .mp4 container does not guarantee Safari playback.
The resulting codec must be inspected. A passing Linux Chromium run is **not**
an iOS or macOS Safari compatibility sign-off. Test the delivered MP4 with
actual Safari on macOS and iPhone; record device, OS version, download/inline
playback, audio behavior if applicable, codec, size, time and failure mode.
Either provide a verified H.264 path or obtain explicit user approval for a
published compatibility limitation. Do not auto-close the gate.

## P11 — third-party terms and backend boundary

This is a review **inventory**, not legal sign-off:

| Source | Review item | Decision |
| --- | --- | --- |
| Watched (MIT), https://github.com/dev-Armaan/satellites | Keep MIT license, original authorship, derivative name distinct from official Watched | Human review pending |
| CelesTrak, https://celestrak.org/usage-policy.php | GP cadence: updated about every two hours, retrieve only required groups and once per update; review request frequency and retry behavior | Human/operations review pending |
| Copernicus, https://dataspace.copernicus.eu/terms-and-conditions | Sentinel data attribution and modified-data notice; distinguish dataset rights from portal content rights | Human review pending |
| Planetary Computer, https://planetarycomputer.microsoft.com/terms | Preview terms, egress limits, tokens and production reliance risks | Human review pending |
| Textures, fonts, GIBS, other imagery | Inventory embedded assets, notices, credit text and any separate redistribution conditions | Human review pending |

Backend scope must be **one** of:
A. Approved server deployment supporting /api/pan, /api/og, /api/e and /s/:id,
with monitoring, throttling, security review, privacy and operational owner.
B. Explicitly approved static-only variant. Disable or clearly label functions
that require absent routes. Verify the static UI never presents those functions
as operational and that the image/archive APIs still obey provider limits.

Do not infer API approval from a successful static build. Do not mark any
external terms approved without an identifiable human reviewer.

## Outstanding release controls

- Independent HTTPS host and actual candidate → baseline → candidate deployments.
- Hosted Chrome/mobile acceptance; actual Safari/iOS playback.
- Desktop 1080px real export evidence and acceptable performance threshold.
- Provider/asset terms human sign-off.
- Dynamic API hosting or accepted static-only limitation.
- Both orbit catalog freshness checks at release time (Watched 48 h, GeoGeek 8 h).
- Separate production-activation PR and all production-equivalent CI checks.

**OVERPASS PUBLIC RELEASE: BLOCKED.**
