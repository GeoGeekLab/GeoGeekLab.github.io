# Water V10.2: Stage 5–7 integration verification

**Status: draft integration; not released or scientifically certified.**  
Date: 2026-10-09.

## Scope and linked work
This integration branch collects [UX-051–054 / PR #137](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/137), [UX-061–062 / PR #145](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/145), [UX-063–064 / PR #147](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/147), and [UX-071–073 / PR #150](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/150). All feature PRs remain draft. This is one integration **candidate**, not a replacement for review or a request to merge.

### Isolation and scientific requirements
- Existing forward-model arrays and V10.1 numerical RT samples remain unchanged; model is an educational semi-analytical approximation and **is not independently HydroLight/DISORT-validated**.
- UNCERTAINTY reports local formal Fisher/Jacobian identifiability conditional on `Σ = σ²I`; not measured errors or demonstrated retrieval uncertainty.
- RADIATIVE PATH is a teaching schematic, not actual angle-resolved photon tracing. WATER OPTICS separates IOP (a, bb in m⁻¹) and AOP (Rrs in sr⁻¹).
- ATMOSPHERE labels TOA ρ* a first-order reflectance proxy and separates path contributions. SENSOR uses reported provenance and rejects partial/out-of-domain SRF band samples.
- Atmospheric correction: same-model inverse/forward agreement is **not** independent validation. Comparison: snapshots A/saved or live B remain explicitly identified. Sensitivity: bounded finite difference, derivative units and dimensionless elasticity remain distinct.
- **Experiment schema v8**, nine workspace tab IDs and plot keys, original sensor response algorithms and all historical V9/V10.0/V10.1 rollback choices are preserved.

### Startup contract
The production `postbuild-performance.mjs` transform ordinarily inserts `defer` into local classic scripts. Critical `v102-{uncertainty,physics,atm-sensor,analysis}-views.js` globals must be defined before the subsequent **inline application entrypoint** runs. The four specifically named assets declare `data-geogeek-sync-dependency`; the performance transform skips those assets; PERF-07 permits only matching named asset + marker pairs, never a generic escape hatch.

### CI evidence required to merge
- [ ] `integration-ui.test.mjs` verifies exact startup ordering, nine-workspace/schema invariants and model spectra vs V10.1.
- [ ] Original stage 5, 6A, 6B, 7 unit and desktop/mobile browser test suites all pass **together**.
- [ ] `water-v102-integration.spec.mjs` covers nine tabs, persisted initial tabs, 390px overflow, keyboard navigation and the independent V10.1 rollback.
- [ ] `quality.yml` build, performance, static QA, general accessibility baseline, Lighthouse and internal links all green on **exact integration SHA**.
- [ ] Scientific/UX/accessibility human review and manual independent Pages deployment/rollback check.
- [ ] Stage 8–10 responsive, accessibility, broad regression and release governance still require their planned work.

### Known blockers
- [#148](https://github.com/GeoGeekLab/GeoGeekLab.github.io/issues/148): the V10.2 boot race has a targeted fix in #145 and verified specialty tests. Close only after the full exact-SHA release gates are satisfied.
- In [PR #147 run 37887022720](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37887022720), the unrelated full-site Pulse touch-target test failed on 42px vs 44px in both browser profiles (409 of 412 browser tests passed, two failed). Keep this report; investigate separately; **do not weaken accessibility bounds to ship Water**.

**Do not merge this branch as a production release until all blocking tests and human reviews pass.**
