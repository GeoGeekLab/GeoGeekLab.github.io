# Flow V3 acceptance contract — stage gates

## Scope and evidence rules

This document defines acceptance **before** implementation. Stage 1 characterizes the existing application only. No baseline screenshot, unit test or green check can be used to claim that a known defect is fixed.

All future PR updates must preserve:
- Modes: `field`, `od`, `trips`, `release`.
- Distinct scientific meaning of FIELD (Eulerian), OD (aggregate directed network), TRIPS (timestamped positions) and RELEASE (derived frozen-field advection).
- Provenance labels distinguishing model data, archived/pinned model, deterministic procedural fallback, and teaching reference.
- Deep links and non-Flow parameters (`sat`, `earthLayer`, `earthDate`, etc.).
- Close/reopen lifecycle and reduced-motion operation.
- Desktop Chromium and emulated mobile Chromium coverage.
- Existing `tests/browser/flow-round2.spec.mjs` compatibility unless a semantics change is formally documented.

## Stage gates

| Stage | Mandatory evidence | Explicitly not yet established |
|---|---|---|
| 1 — Baseline | document exact main SHA; branch + Draft PR; Node contracts green; deterministic desktop/mobile characterization and JSON + screenshots | correctness of time integration, clean final map layout |
| 2 — Scientific core | deterministic particle reset / seam tests; elapsed-time invariance; out-of-domain handling; lifecycle + pause tests | final visual redesign |
| 3 — UI/UX | responsive screenshot diffs; zero control-to-control collision; map overlay area ≤8%; keyboard/touch inspection; no lost focus | all analytic extensions |
| 4 — FIELD/RELEASE | fixed-grid interpolation fixtures; validated direction/speed; deterministic RK4 against analytic fields; proper source flags | operational forecast accuracy |
| 5 — OD/TRIPS | directed in/out/net-flow consistency; sample vs interpolation; geodesic/date-line fixtures; synchronized timeline | real-world data fidelity absent licensed source |
| 6 — Global data/performance | source metadata and fallback tests; cache and model time disclosure; bundle/license impact; performance profiles | production approval |
| 7 — Release | all required CI green; review screenshot evidence; PR merged; main SHA and production deployment checked | — |

## Stage 1 runnable commands

- `npm run qa:flow-v3` — Node tests for the four-mode semantics, source wiring and V3 contract.
- `npx playwright test tests/browser/flow-v3-baseline.spec.mjs --project=desktop-chromium --project=mobile-chromium` — source-fixture characterization with rendered evidence.
- `npx playwright test tests/browser/flow-round2.spec.mjs --project=desktop-chromium --project=mobile-chromium` — existing regression suite.

The baseline CI workflow installs dependencies and Chromium and serves a copy of `site/` via the existing Playwright server. It uploads screenshots, traces and geometry evidence.

## Visual acceptance (Stage 3 target, not Stage 1 assertion)

1. WORK and INSPECT place mode controls and persistent explanations outside the map's geographic content.
2. The sum of map overlays remains at or below 8% of the usable map rectangle (excluding temporary tooltips).
3. Interactive control bounding boxes do not overlap each other or leave the viewport.
4. Mobile controls expose at least 44×44 CSS-pixel activation targets.
5. Field particle streaks never represent teleports or unrelated resets.
6. The legend explains magnitude, direction and data validity; low-opacity text remains legible.
7. FOCUS shows the largest feasible map and still provides discoverable mode and pause access.
8. Motion reduction is meaningful and remains reversible.

Baseline tests record geometry and screenshot outputs, but do **not** fail solely because the current layout covers too much geography.

## Numerical acceptance (Stage 2 onward)

- For wind from 270° at 10 m/s: `u≈+10 m/s`, `v≈0`.
- For wind from 0° at 10 m/s: `u≈0`, `v≈−10 m/s`.
- For constant `u=10 m/s` at the equator and 60 simulation seconds: east displacement ≈600 m (before spherical-coordinate conversion).
- On equal elapsed real time and equal speed factor, propagated location must be independent of rendering FPS within the integrator's documented tolerance.
- Reborn or seam-wrapped particles must not append old-to-new path segments.
- Outside the sampled wind domain, no fabricated valid vector is displayed.
- Spherical interpolation of a TRIPS segment must not draw a line across the antimeridian.
- Global PAUSE stops FIELD, RELEASE and TRIPS state advancement, and resume continues from the frozen state.

## Browser matrix

Desktop Chromium and mobile Chromium are required from Stage 1. Stage 3 adds at least three viewport classes (desktop, tablet, narrow mobile), keyboard-only controls and high-zoom text checks.

Each mode must support:
1. Entering from a URL deep link.
2. Changing parameters and observing readable state feedback.
3. Switching to another mode without inheriting invalid selection or playback state.
4. Returning to its own mode and preserving allowed preferences.
5. Opening SOURCE and reading the provenance and limit.
6. Closing and reopening without duplicated intervals or listeners.
7. Working when remote weather endpoints fail, with visible fallback labeling.

## Known gaps and release blockers

- `FLOW-P0-01` particle respawn streak.
- `FLOW-P0-02` frame-rate-dependent simulated time.
- `FLOW-P0-03` poleward extension of sparse sampled wind grid.
- `FLOW-P0-04` multiple playback controllers.
- `FLOW-P1-01` map-top controls and grammar strip occupying map content.

These are **tracked pending fixes**, not waived by Stage 1 green CI. A future implementation is accepted only when corresponding tests change from pending/characterization to strict functional assertions.
