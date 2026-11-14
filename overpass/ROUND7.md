# OVERPASS / P7 — Production readiness (no production deployment)

## Independent branch and frozen source

- Branch: feature/overpass-p7-production-readiness, derived from P6.
- Original Watched MIT source remains git-submodule-pinned to
  a0e53b62573655a81d48b60a35cf661df314f2b7.
- P2–P5 source overlays remain. P6 integration and its tests remain for
  compatibility but P7 no longer uses P6's postbuild card/JS rewrite.
- Production main and GitHub Pages deploy workflows are not modified.

## Source-owned Lab record

P7 prepares an authored GeoGeek source candidate before running the original
site compiler. It adds lab:l17 to the archive source model, conditions and
native Lab registry; updates first-paint rendering from 13 to 14; adds a
normal standalone route anchor rather than a Lab dialog button; and updates
the record and model deep-link contract. The existing GeoGeek build should
emit /records/lab-l17.html itself. No custom replacement record HTML is used.

The process has fail-closed source signature checks. It logs SHA-256 for each
source input and output. It runs in the isolated CI checkout, not directly
in the Git repository's production branch. A real Chromium capture supplies
the new preview asset before building.

The resulting /overpass/ keeps the original Watched SPA and science runtime.
Only the return link is inserted into its own built document. No original
pass model, sensor geometry, imagery or MP4 encoding logic is removed.

## Orbit-source release gate

Watched's catalog uses eight CelesTrak groups, compact v2 OMM and a
corresponding catalog-names file. Its pinned fetchedAt is
2026-11-13T19:49:49.923Z. The upstream fetcher honors CelesTrak's
at-least-two-hour request interval. P7 validates counts, NORAD
deltas, element epochs, names consistency and fetchedAt.

GeoGeek Orbital Commons relies on a different active-only OMM snapshot.
Its checked-in active.meta.json was dated 2026-11-01T02:57:24.245Z,
with an eight-hour freshness policy. Earlier P6 audit identified it as
stale. Data supply may refresh it in CI. Publication requires the actual
built snapshot to pass this independent eight-hour policy, plus the
Watched 48-hour policy.

The candidate workflow emits a machine-readable release-readiness verdict
and does not publish. Release mode blocks stale catalogs, missing notices,
missing assets or failed rollback. A six-hour cadence workflow (inactive
until installed on the default branch) fetches BOTH catalogs as separately
reviewable Actions artifacts. It never commits or deploys automatically.

## Rollback and deployment boundary

P7 saves the clean 13-card compiled GeoGeek site before generating the
candidate. An isolated rollback test restores that entire artifact to a
temporary location and verifies SHA-256 of the Lab HTML, JS and key
Orbit/Earth assets. The clean rollback lacks l17 and /overpass/.
No operation touches live Pages. A filesystem rehearsal does not prove
that a live GitHub Pages deployment can be rolled back.

## Remaining release blockers

- Freshness of both orbit catalogs at exact publication time.
- Provider response quality, sensor availability and end-to-end historical
  MP4 encoding, not merely Time-lapse modal opening.
- Dynamic Watched /api routes are absent on GitHub Pages. A separate backend
  needs a legal and operational review if required.
- Provider terms and legal notices must receive final approval.
- Real staging deployment, smoke tests and rollback before promotion to main.

Do not infer production readiness merely from successful build or CI.
