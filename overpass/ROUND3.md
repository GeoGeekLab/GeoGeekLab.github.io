# OVERPASS / P3 — Orbit catalog audit and seven-day pass parity

## Purpose

The existing Watched UI, scientific engine and imagery code remain pinned
to commit a0e53b62573655a81d48b60a35cf661df314f2b7.

**Do not substitute** GeoGeek's \`site/orbital/data/active.json\` for Watched's
\`public/data/catalog.json\`. Watched retrieves eight CelesTrak GP groups
(active, stations, weather, resource, planet, goes, noaa and sarsat);
GeoGeek retrieves active only. Watched uses a compressed v2 columnar
catalog and curated sensor profiles. GeoGeek uses CCSDS OMM JSON and
its own orbit classification. Their browser workers also depend on
different satellite.js major versions.

Therefore a direct comparison of their past-seven-day pass **totals**
would mix element epochs, sensor categories, field-of-view models and
catalog membership. It would not test an algorithm in isolation.

## Deliverables

- \`lib/catalog-parity.mjs\`: pure snapshot decoding and validation,
  independently tracking fetch time and each orbital element's epoch.
- \`tests/catalog-parity.test.mjs\`: deterministic synthetic schema,
  overlap, epoch and OMM-mapping tests.
- \`scripts/round3-audit.mjs\`: reports actual catalog coverage,
  profiled satellites that GeoGeek's active-only source would lose,
  common-NORAD epoch deltas, and representative SGP4 same-input checks.
- CI uploads \`reports/r3-catalog-parity.json\`. The report is
  generated from the actual pinned files, not fabricated counts.

## Method and acceptance

1. Run \`node --test overpass/tests/catalog-parity.test.mjs\`.
2. From the repository root run \`node overpass/scripts/assert-upstream.mjs\`.
3. Install the Watched dependencies with \`npm ci\` in \`overpass/upstream\`.
4. Run \`node overpass/scripts/round3-audit.mjs\`. Review the JSON.
5. Run \`npm test\` and \`npm run test:backend\` in the pinned Watched repo.
   Its pass tests compare a 7-day narrow-swath and open-optical search
   to a 1-second brute-force reference. Its independent tests compare
   WGS-84 and SGP4 pass geometry without reusing the engine geometry.
6. Run \`npm run qa:build && npm run qa:lab\` in GeoGeek.
7. Reapply the tested P2 visual overlay and build /overpass/ unchanged.

The audit reports SGP4 distance between dissimilar catalog snapshots
as **descriptive evidence**, not proof of algorithm precision. The
controlled SGP4 mapping check must agree to within 1 metre when it
propagates the same orbital-element set through two field mappings.

Run \`node overpass/scripts/round3-audit.mjs --release-check\`
only after refreshing the upstream sources. This strict publication
gate rejects old snapshots and missing profiled satellites. The
reproducible pinned snapshot is intentionally allowed to age during
development; failing to meet the release gate is not hidden.

## Deferred decisions

- Do not merge the two catalogs in P3.
- Do not change the source of Watched's scanner profiles or pass solver.
- Production integration needs an explicit data refresh policy and a
  catalog format/coverage adapter. If the active-only feed lacks
  profiled objects, provide supplementary groups before switching.
- Because the pinned snapshot ages, the current result is a
  historical/reproducible test baseline, **not** a guarantee of
  current satellite location accuracy.
- Results, replay, search and imagery integration are scoped to P4/P5;
  Lab registration and full host deployment are scoped to P6/P7.

P3 modifies no production main branch, no rendered UI and no original
Watched scientific code.

**Release freshness policy:** Watched's own HUD uses a 48-hour stale
threshold (src/ui/hud/readouts.ts). GeoGeek active OMM uses its exact
refreshPolicy.staleAfterMs from active.meta.json (currently 8 hours).
The audit reports and release gate preserve both thresholds separately.
