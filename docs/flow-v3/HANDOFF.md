# Flow V3 — Stage 1 handoff

**Stage:** 1 of 7 — architecture, acceptance and baseline.
**Branch:** `feat/flow-lab-v3`, created from `main@ed78ba052b48434aa0b16081c03d778d2b5fa3c0`.
**Policy:** Draft PR only. Do not merge in Stage 1.
**Implementation:** No changes to `site/flow-lab*.js`, `site/flow/**` or runtime Flow CSS in Stage 1.

## Delivered

- `docs/flow-v3/ARCHITECTURE.md` — actual runtime call chain, confirmed defects, target module seams and dependency policy.
- `docs/flow-v3/contract.json` — machine-readable mode grammar, scientific invariants, UI goals and seven stage gates.
- `docs/flow-v3/ACCEPTANCE.md` — evidence rules, cross-device matrix and measurable numeric/visual targets.
- `tests/flow-v3/source-contract.test.mjs` — Node characterization for four modes, model provenance, wind direction convention, extension chain and visible TODOs.
- `tests/browser/flow-v3-baseline.spec.mjs` — browser fixture for four modes, deep-link isolation, fallback, controls and map-overlay geometry/screenshots.
- `.github/workflows/flow-v3-baseline.yml` — dedicated desktop/mobile CI with evidence artifacts.
- `package.json` — `npm run qa:flow-v3`.

## Current scientific boundary

FIELD uses coarse 84-point 10 m model wind, OD uses illustrative normalized relation weights, TRIPS uses authored relative-timestamp waypoints, RELEASE integrates particles through a frozen wind snapshot. The four modes have **different** valid inferences; their visual outputs must not be conflated.

No runtime change is shipped in this stage. A green baseline validates reproducibility, not scientific correctness or UI quality.

## Known defects to fix next — Stage 2

1. `FLOW-P0-01`: In `site/flow-lab.js`, `advect()` can reset a particle and `drawFieldFrame()` then draws across the reset; horizontal-only discontinuity checking is insufficient.
2. `FLOW-P0-02`: `state.speed * clamp(dt/16.7,...)` is frame-rate dependent and not measured in elapsed seconds.
3. `FLOW-P0-03`: Regular wind source covers only ±60° latitude but sampling up to ±89° returns a clamped outer row rather than invalid coverage.
4. `FLOW-P0-04`: `site/flow/flow-round2.js` owns an independent trip interval while `site/flow-lab.js` also owns trip-time advancement and global paused state.

## Stage 2 implementation sequence

1. Extract pure wind and integration math behind a stable test import without changing mode IDs or fallback semantics.
2. Add a reset result flag and reject segments crossing the seam, the field mask or particle resampling.
3. Define simulated elapsed seconds as real elapsed seconds times the explicit dimensionless speed factor.
4. Validate interpolation, wind direction, coordinate conversion and out-of-domain handling with deterministic fixtures.
5. Give FIELD, RELEASE and TRIPS one play/pause/time controller. Remove or deprecate competing timer behavior.
6. Add tests for 30/60/120 FPS equivalence, zero wind, constant east wind, antimeridian and polar boundary, pause/resume and close/reopen.
7. Keep Stage 2 separate from Stage 3 map redesign. Do not try to hide scientific errors with lower opacity or slower animation.

## Mandatory guardrails

- Keep `flowMode=field|od|trips|release` stable.
- Preserve unrelated query parameters (for example `sat` and `earthLayer`).
- Keep Open-Meteo / GFS / procedural fallback status explicit.
- Do not describe generated OD weights or TRIPS points as actual movements.
- Respect reduced motion and release all resources on unmount.
- Update this file and the Draft PR body with exact SHA, test outcomes and remaining issues after every stage.

## Quick verification

```sh
npm ci
npm run qa:flow-v3
npx playwright install --with-deps chromium
mkdir -p dist && cp -a site/. dist/
npx playwright test tests/browser/flow-v3-baseline.spec.mjs tests/browser/flow-round2.spec.mjs --project=desktop-chromium --project=mobile-chromium --workers=2
```

When the Stage 1 baseline proves insufficient for a scientifically new behavior, introduce a separate strict Stage 2 test rather than silently relaxing the existing baseline.


---

## Stage 2 implementation — scientific core repair (2026-11-14)

Scope: FIELD/RELEASE trajectory continuity, sampled wind bounds, simulated-time dimensional correctness and one native TRIPS controller. Stage 3 map design and Stage 4 feature expansion remain explicitly out of scope.

Implemented modules:
- `site/flow/v3/core/field.mjs`: domain-aware regular/GFS/procedural sampling, meteorological wind convention, frozen-field RK2 geographic stepping, seam/reset segment rejection.
- `site/flow/v3/core/clock.mjs`: dimensionless time-rate conversion, fixed-step accumulation and relative-TRIPS playback gate.
- `site/flow-lab.js`: connects pure modules to FIELD and RELEASE Canvas; uses simulated seconds, resets without connecting discontinuous segments, shows OUTSIDE FIELD DOMAIN for unsupported latitudes, exposes Release lifetime in simulated hours.
- `site/flow/flow-round2.js`: removes the competing TRIPS interval and event interception. Base Flow state owns global PAUSE, TRIPS play and the animation timeline.
- `site/core/modules.js` and `site/lab-fullpage.js`: invalidate cached Flow entry scripts.

A dynamic source animation needs time compression to produce visible map displacement at planetary scale. The updated FIELD control reads **SIM TIME**, defaults to 36,000×, and ranges from 2,000× to 120,000×. These are elapsed-time multipliers of the same frozen model snapshot, not forecast lead times. RELEASE lifetime now uses simulated hours. Foreground frame time is bounded to 100 ms to avoid unbounded jumps after suspended tabs. Fixed integration step = 120 simulated seconds.

Strict tests: `tests/flow-v3/scientific-core.test.mjs`; `tests/browser/flow-v3-science.spec.mjs`. The dedicated CI workflow also continues Stage 1 and legacy Flow Round2 regression suites. Numeric cases include 30/60/120 fps equivalence, u/v convention, antimeridian reset rejection, interpolation, domain validity and pause/trip ownership.

Stage 2 acceptance is conditional on the green CI run for the latest PR head. Do **not** report completion based only on the code having been pushed.

## Stage 3 next — map-first UX and responsive controls

1. Retire permanently overlaid HUD, mode tabs and four-cell grammar strip from the geographic evidence area in WORK/INSPECT.
2. Keep a discoverable FOCUS mode, sample results, source status, projection controls and a nonintrusive map legend.
3. Fix viewport-dependent Plate Carrée aspect distortion and quantify EW scale with correct projection geometry.
4. Measure map overlay area against the contract's 8% target; inspect desktop/tablet/mobile screenshots.
5. Repair mobile tap sampling, keyboard alternatives, focus/escape priority and selected-state URL cleanup.
6. Preserve the tested four-mode scientific semantics and Stage 2 time/physics boundaries.
7. Stage 3 must not merge PR #200; the PR stays Draft through Stage 7.

## Stage 2 verification evidence

- Scientific Core CI: https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43553043378 — success, 22/22 browser tests (desktop and mobile), Node suite failures: 0.
- This run includes the invalid-release guard and the Stage 1/Round2 regressions. A later Stage 2 commit additionally asserts that global RESET immediately updates the TRIPS range; its final head CI is tracked in PR #200.
- Production publishing remains forbidden until Stage 7. The PR stays Draft.
- The model-wind snapshot remains static; SIM TIME speeds up frozen-field integration only. Do not interpret longer simulated trajectories as a meteorological forecast.


---

## Stage 3 implementation — Map-first UI/UX Reconstruction (2026-11-14)

**Scope delivered:** permanently moved Flow HUD, representation tabs, legend, projection readout and zoom controls outside the map's geographic content. The WORK and INSPECT modes keep the analysis rail. FOCUS hides that rail while retaining modes, playback, zoom, visible pinned sample results and native OD/TRIPS selectors.

### Runtime changes

- `site/flow/v3/core/projection.mjs` defines a pure Plate Carrée viewport with an exactly 2:1 world aspect, centered letterboxing, pan/zoom and inverse coordinate mapping. It explicitly rejects sampling in letterboxed margins.
- `site/flow-lab.js` uses this viewport for Canvas, SVG, pointer inversion and keyboard navigation. Touch/Enter samples now produce a persistent result in the map footer, plus an announcement for screen readers.
- `site/flow-lab-round2.js` wraps the existing map in `.flow-main`, mounts the control bar above and legend/projection/zoom below, moves the scientific grammar into the rail, preserves geodesic alignment and offers native place/trajectory selects. Focus docks active selectors in the workbar. Mode transitions clear stale `flowNode` / `flowTrip` URL keys without modifying other parameters. Escape clears active Flow selection and returns control to the native dialog when no selection remains.
- `site/flow-lab-round2.css` creates responsive workbar, main map, footbar and rail arrangements. Mobile title text wraps, 44px minimum main control targets are preserved, and the minimum projected map surface is increased to maintain readability.
- `site/core/modules.js`, `site/flow/flow-round2.js`, and `site/lab-fullpage.js` refresh Flow asset versions without altering other instruments.

### Acceptance evidence

- **Flow V3 Workbench Acceptance**: [successful run 43557165166](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43557165166); Node tests have zero failures; Playwright had 29 passing tests and one desktop-only touch test skipped by design.
- `tests/flow-v3/projection.test.mjs`: aspect, inverse projection, letterbox domain, EW/NS physical scale and stable geographic coordinates.
- `tests/browser/flow-v3-workbench.spec.mjs`: WORK/FOCUS/INSPECT, screenshot/geometry checks at desktop (1440×900), tablet (900×980), mobile (390×844), keyboard navigation, touch sampling, selector accessibility and URL isolation.
- First visual run identified an undersized mobile map (235px against a >250px baseline); the map minimum was raised and the full suite reran successfully.
- Screenshots were manually inspected. The synthetic map-land polygon shown in CI is a controlled fixture, **not** a world-boundary data product.
- Other independent workflows (Orbit, Earth Pulse, GeoGeek Quality) remain independent gates; check their latest result in PR #200. The Flow PR remains **Draft and unmerged**.

### Scientific and interface guardrails

1. Plate Carrée now uses a 2:1 map pixel ratio; its EW/NS scale readout is a latitude distortion ratio. A blank letterboxed margin is not a sampled location.
2. The wind grid domain, fixed-step clock and release continuity from Stage 2 are unchanged.
3. A pinned wind sample is a *model vector in the current snapshot*, never an observed object path or a weather prediction.
4. OD arc geometry remains a display relation, not a literal route. TRIPS interpolation remains distinct from observed positions. RELEASE remains a frozen-field numerical experiment.
5. Workspace controls stay outside the geographic map. In FOCUS, the map still supports keyboard and touch operations.
6. No new third-party rendering dependency was introduced.

### Stage 4 handoff — FIELD + RELEASE analytical expansion

1. Add a quantitative wind-speed color scale with units, not a purely decorative legend.
2. Add vector-arrow/streamline display choices and a visible source coverage mask. Do not interpolate into unsupported polar regions.
3. Present sampling provenance, valid time and uncertainty limitations adjacent to observations.
4. Add pure RK4 integrator tests against an analytical vector field; compare Euler, RK2 and RK4 using identical step sizes.
5. Expose RELEASE seed radius, simulation time and integration settings. Distinguish ensemble seeding spread from model uncertainty.
6. Preserve map-first layout, fixed-step time, reduced motion, URL isolation and the whole Stage 1–3 regression suite.
7. Continue on `feat/flow-lab-v3` and Draft PR #200. **Do not merge before Stage 7.**


---

## Stage 4 implementation — FIELD + RELEASE analytical expansion (2026-11-14)

**Scope implemented:** quantitative frozen-field wind magnitude, distinct FIELD arrow / streamline display choices, source-domain visibility and provenance, and controlled RELEASE experiments. OD and TRIPS data models were not changed.

### Code and scientific semantics

- `site/flow/v3/core/analysis.mjs` supplies a fixed 0–30+ m/s wind-speed palette, mode-specific provenance and UTC labels, explicit latitude coverage, and seed disks sampled uniformly over a *spherical cap* (not Cartesian longitude/latitude jitter).
- `site/flow/v3/core/integrator.mjs` implements pure Euler, midpoint RK2 and fourth-order RK4 steps in geographic coordinates with domain validation at every internal step. The `sampleWind` function remains the only wind source.
- `site/flow-lab.js` applies wind speed to vector glyph colors, draws frozen-field streamlines from the same sampled grid, and hatches invalid polar belts. The Streamlines control describes flow structure, **not** observed paths or a forecast.
- FIELD / RELEASE show the source type (model snapshot / pinned model / synthetic), UTC validity or lack thereof, sampled grid resolution, coverage, and explicit absence of a quantified uncertainty model.
- RELEASE now allows a 0–300 km release disk, 20–240 seeds per action, Euler/RK2/RK4 choice (RK4 default), simulated elapsed hours, active seed count, and a global-coverage seeding action.
- RELEASE experiment time advances only when at least one particle exists. Clearing releases resets experiment time; the final particle's removal clears rendered trajectories.
- Open-Meteo's 84 requested grid points must share one valid time. Mixed model times fail the snapshot import rather than masquerading as one coherent field; fallback provenance remains visible.
- No new external runtime dependency was introduced.

### Numerical and browser evidence

- Numeric suite: `tests/flow-v3/analysis.test.mjs` compares Euler, RK2 and RK4 to analytic exponential latitude growth, tests intermediate/final domain rejection and antimeridian continuity, checks the exact 300 km spherical-cap perimeter and samples source metadata.
- Browser suite: `tests/browser/flow-v3-analysis.spec.mjs` checks the quantitative legend, coverage, Field display switches, source time, RELEASE integrator/radius/clock/count, empty experiment behavior and source fallback. All previous Stage 1–3 Flow browser tests remain enforced.
- **Verified Stage 4 CI**: [Flow V3 Analytical Acceptance run 43561173094](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43561173094). Node tests: 26, failures: 0; browser tests: 37 passed, one desktop-only touch-specific skip. CI screenshot evidence is stored in the `flow-v3-stage4-evidence` artifact.
- Visual review: permanent controls remain outside geography. At mobile width 390 px the legend/provenance occupy considerable vertical space; a more compact mobile analytic summary is a Stage 5/6 opportunity, not a waived functional defect.

### Known limits that must stay visible

1. Open-Meteo 84-point sampling uses a 20° × 30° grid inside ±60° latitude. The result is an interpolated coarse **model snapshot** and never an operational trajectory forecast.
2. GFS fallback is a pinned sample; its reference time is not interchangeable with the live snapshot valid time.
3. Synthetic fallback is teaching data, not measured weather.
4. Spherical-cap seed spread describes chosen initial conditions. **It is not an ensemble uncertainty probability.**
5. Euler/RK2/RK4 numerical convergence does not establish accuracy of the meteorological source model.
6. Global PAUSE gates the original FIELD, RELEASE and TRIPS controller. Time scaling remains bounded after background-tab suspension.
7. Do not change OD directed normalized flow semantics or the fact that TRIPS samples are authored teaching positions.

## Stage 5 handoff — OD + TRIPS analytical expansion

1. Preserve directed OD edges and their normalized demonstration units. Add in/out/net totals, clear arrow direction, two-way comparisons, and filtering that does not imply actual routes.
2. Keep schematic connection arcs and geodesic visualizations distinguishable. The chart must not claim that a geodesic line is an observed trip.
3. Distinguish observed teaching sample points from interpolated TRIPS display segments. Report distances, time units, sample spacing and interpolation status.
4. Keep one TRIPS playback controller; do not add independent intervals. Preserve global PAUSE and a consistent timeline across WORK/FOCUS/INSPECT.
5. Add rigorous Node calculation tests, browser source checks, interaction and URL-persistence tests, plus desktop/mobile screenshot evidence.
6. Preserve the Stage 2 scientific core, Stage 3 map-first layout and Stage 4 provenance + color scale.
7. Continue on `feat/flow-lab-v3` and **Draft PR #200**; do not merge before Stage 7.


---

## Stage 5 implementation — OD + TRIPS analytical expansion (2026-11-14)

**Scope delivered:** directed and normalized OD analysis; authored teaching samples versus geodesic TRIPS interpolation; one playback timeline across WORK / FOCUS / INSPECT. FIELD and RELEASE remain governed by Stage 2–4 scientific contracts. No production release.

### Architecture and mathematics

- `site/flow/v3/core/movement.mjs` is now the canonical source for all 12 node coordinates, 24 directed OD weights and 8 authored teaching tracks. Both `site/flow-lab.js` and `site/flow-lab-round2.js` import these datasets rather than maintaining independent copies.
- `odNodeTotals()` defines **outflow, inflow and net = out − in**, all in *normalized teaching units*. `odPairTotals()` calculates A→B and B→A independently; it does not conflate reciprocal directed connections.
- `sortedEdges()` supports deterministic Top-N ordering by weight, then ID. The analytics panel labels full-dataset totals separately from currently displayed edges.
- OD schematic and geodesic connections retain distinct geometry modes. Direction arrowheads are on directed edges in both geometries. Neither is an observed route.
- `tripPosition()` distinguishes an **authored teaching sample**, a **derived great-circle interpolation**, and a **clamped position outside the authored sample window**. Authored samples render as hollow markers; current display heads are filled markers.
- `tripMetrics()` calculates great-circle arc lengths (km), each sample interval, total sample-to-sample arc length and temporal spacing. Trip times are **relative teaching units**, not UTC or measured hours. Calculated arc length does not establish a measured path or speed in km/h.
- Stage 3's responsive map-first controls remain outside geography. The Focus workspace moves the **original** native `.flow-timeline` into the visible workbar and moves it back in WORK/INSPECT. The base `flow-lab.js` retains the only clock; no second timer was introduced.
- The selected OD place, selected track and comparison peer have validated `flowNode`, `flowTrip`, `flowPeer` URL values. Invalid keys are discarded when appropriate. Other instrument query parameters are preserved.
- Native selectors and playback have descriptive keyboard/screen-reader labels. No new external dependency was added.

### Stage 5 verification evidence

- Scientific suites: `tests/flow-v3/movement.test.mjs` adds strict tests for directed-flow conservation, reciprocal pairs, Top-N filtering, geodesic distance and antimeridian behavior, sample classification and authored relative time.
- Browser suites: `tests/browser/flow-v3-movement.spec.mjs` exercises OD counts, arrows, pair comparisons, URL isolation, TRIPS sampled/interpolated states, Focus timeline, global PAUSE and screenshots at desktop/tablet/mobile sizes.
- [Verified implementation-run CI 43563975374](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/43563975374): **34 Node tests, 0 failures; 45 Playwright tests passed, 1 desktop-only touch skip**. The pipeline also ran all Stage 1–4 Flow regressions.
- Visual evidence: `flow-v3-stage5-evidence` artifact, screenshots at 1440×900, 900×980 and 390×844. The CI's basemap is a controlled fixture without real country boundaries.
- Visual review: OD arrowheads are legible; sampled teaching markers and current heads have distinct encodings; all mode-critical controls remain outside map content. Mobile analytics are below the initial fold by design and accessible by scrolling.
- Subsequent hardening added explicit native timeline labels and synchronized the peer deep link when the primary OD place changes. **Check the final HEAD run** for these last changes, not merely the successful implementation run.

### Source and merge notes

- The Stage 4 branch base was `ed78ba052b48434aa0b16081c03d778d2b5fa3c0`.
- During Stage 5, `main` was `c020b1880eff671c171ceed299f60fe3fa19e54b`. Its single intervening commit changed Light instrument files and two lines in `site/lab.html`; no Flow runtime file was changed by that commit.
- **Do not treat the old base as current at merge time.** Refresh from latest main, review the combined diff and rerun independent checks at Stage 7.
- Draft PR #200 remains unmerged and unapproved for production.

## Stage 6 handoff — data, provenance, accessibility and performance hardening

1. Audit provenance, model-validity timestamps, source failure recovery, stale caches and deterministic fallback labels across all four Flow modes.
2. Measure frame times, Canvas redraw cost, SVG path counts, observer frequency and memory/cleanup behavior before adding a GPU renderer or external library.
3. Enforce performance budgets on desktop/tablet/mobile and reduced-motion behavior; profile at minimum, default and maximum particle densities.
4. Review dependency licenses, external model data terms, source attribution and network/CORS behavior. Keep user-facing scientific claims aligned with actual model provenance.
5. Audit keyboard/focus lifecycle, screen-reader status repetition, native tap target sizes and the mobile analytical panel's vertical density.
6. Add controlled source-failure, cache invalidation, stress, viewport and numeric regression tests. Preserve all Stage 1–5 suites and workflow evidence.
7. Stay on `feat/flow-lab-v3` and Draft PR #200. Stage 6 does **not** merge; Stage 7 owns final approval, main synchronization, merge and deployment validation.
