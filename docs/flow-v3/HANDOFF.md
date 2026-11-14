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
