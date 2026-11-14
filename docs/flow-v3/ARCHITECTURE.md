# Geographic Flow Laboratory V3 — architecture and code audit

Status: **Stage 1 design and characterization only**. No runtime Flow behavior is changed by this stage.

Audit baseline: `main` commit `ed78ba052b48434aa0b16081c03d778d2b5fa3c0` (2026-11-14).

## 1. Actual runtime architecture

The source has multiple active layers. They must not be treated as one implementation:

```text
Lab entry / deep link
  site/lab-fullpage.js
    -> site/instruments.js  (legacy mountFlow iframe remains as fallback)
    -> site/flow-lab.js  (primary Flow mount, source loading, state, canvas/SVG)
    -> site/flow-lab-polish.js  (resilient mount wrapper, fallback)
    -> site/flow-lab-round2.js + .css  (mode metadata, geodesic overlay, URL, inspector)
    -> site/flow/flow-round2.js  (separate TRIPS playback controller / text rewrite)
        |
        +--> Canvas 2D base (world + grid + field glyphs)
        +--> Canvas 2D FX   (field/release particle streaks)
        +--> SVG base       (OD / TRIPS)
        +--> SVG round2     (geodesic OD / TRIPS display overlay)
        +--> HTML rail      (mode controls, inspector, source)
```

**Source of truth currently:** local `state` inside `site/flow-lab.js`. Round2 reads DOM state (`data-mode`, range inputs and selected SVG attributes). The third controller owns an independent TRIPS interval. V3 must converge to one state owner before it adds features.

The fallback must remain available until V3 explicitly replaces it. The base `mountFlow` in `site/instruments.js` still embeds an external Windy iframe, and the polish adapter calls the previous mount if the enhanced Flow mount fails.

## 2. Current data products and limitations

| Representation | Runtime input | Temporal model | Valid inference | Existing constraint |
|---|---|---|---|---|
| FIELD | Open-Meteo 10 m model wind; GFS pinned sample fallback; procedural fallback | single snapshot | sampled/local vector, speed and meteorological FROM direction | 84 points in 12×7 regular grid (30° longitude, 20° latitude; ±60° bounds) |
| OD | 12 city coordinates and 24 normalized illustrative edges | aggregate (no observation times) | relative directed connection weight | demonstration weights; arcs are **not** observed routes |
| TRIPS | eight authored waypoint sequences with relative time indices | ordered time sequence | sample and interpolated display trajectory | samples are teaching data; intermediate points are not observations |
| RELEASE | same fixed vector field as FIELD | derived integration | what-if advection under a frozen snapshot | not an operational forecast or uncertainty estimate |

Relevant sources: `site/flow-lab.js` lines 11–30, 63–81, 116–165; `site/flow-lab-round2.js` lines 12–15, 49–139, 240–405.

## 3. Confirmed faults, ranked

| ID | Severity | Evidence in source | Stage / proposed verification |
|---|---|---|---|
| FLOW-P0-01 | critical | `advect` resets a particle before `drawFieldFrame` draws from old location to new. The code checks X distance only; it can draw nonphysical long streaks. `flow-lab.js:121–125` | 2; deterministic respawn and 2-D wrap tests |
| FLOW-P0-02 | critical | `state.speed * clamp(dt / 16.7,...)` advances seconds per frame, not frame elapsed seconds. The displayed 170× has incorrect dimension. `flow-lab.js:124–125` | 2; compare 30/60/120 fps over equal real elapsed time |
| FLOW-P0-03 | high | FIELD samples ±60° model grid but allows requests to ±89°; `sampleWind` clamps interpolation to the boundary rows without a validity state. `flow-lab.js:63–81` | 2; nodata / out-of-domain display and API tests |
| FLOW-P0-04 | high | Native `TRIPS` playback and `flow/flow-round2.js` interval both mutate the time input; global PAUSE and TRIPS play are separate states. | 2; pause/resume/close lifecycle tests |
| FLOW-P1-01 | high | Flow HUD, mode tabs and added grammar strip are absolutely positioned over the map. `flow-lab-round2.css:33–65, 128–157` | 3; responsive screenshot + intersection geometry |
| FLOW-P1-02 | high | Base Plate Carrée mapping uses container width and height directly; viewport ratios differ from 2:1, changing displayed aspect and reported EW scale. | 3; projection geometry reference cases |
| FLOW-P1-03 | medium | `setMode` keeps mode in the URL but cleared selected OD/TRIPS states may leave stale `flowNode`/`flowTrip` keys. `flow-lab-round2.js:399–405` | 3; deep-link round-trip and Escape tests |
| FLOW-P1-04 | medium | `RESET` resets viewport, particles and trip clock but does not reset every control/state parameter. `flow-lab.js:177–180` | 3; reset-to-default table |
| FLOW-P1-05 | medium | Touch users lack a persistent tapped field measurement. Most inspection uses pointermove. | 3–4; touch sampling, focus, keyboard tests |
| FLOW-P1-06 | medium | `svg` has `aria-hidden`; some selectable geometry has no equivalent keyboard-accessible list. | 3–5; keyboard and accessibility baseline |
| FLOW-P2-01 | medium | OD / TRIPS fixtures and node identifiers are duplicated in two runtime files. | 5; extract shared typed data and compare IDs |
| FLOW-P2-02 | medium | The source resolver fetches external world GeoJSON and GFS Raw files. Failure may yield no world outline or a model/synthetic fallback. | 6; deterministic failure injection, provenance badges |
| FLOW-P2-03 | medium | Fixed grid and short snapshot cannot support regional weather forecast inference; no measured uncertainty is available. | 6; data domain, valid time, model metadata |

These are code-confirmed risks. Device-specific visual severity is characterized by the browser suite and must not be described as fixed before Stage 3.

## 4. Target V3 component boundaries

```text
                       Flow URL / user actions
                                  |
                                  v
                         flow/state/controller
                mode, playback, time, selection, view
                 /                  |               \
                v                   v                v
    data/source-adapters     core/math-modules     ui/workspace
  Open-Meteo / GFS / demo    grid / advection /      controls
   tagged provenance         geometry / RK4         inspector
             \                     |                    /
              \                    v                   /
               \------------> draw model <------------/
                                  |
                     renderers (one author per layer)
                    Canvas FIELD / RELEASE
                    SVG OD / TRIPS
                    map projection + legend
```

Proposed modules for later stages (not created in Stage 1):
- `site/flow/v3/core/field.mjs` — field-domain mask, interpolation and units; no DOM.
- `site/flow/v3/core/integrator.mjs` — Euler/RK2/RK4 and seed lifecycle; pure functions.
- `site/flow/v3/core/geography.mjs` — projection, antimeridian splitting and coordinate transforms.
- `site/flow/v3/core/reducer.mjs` — one immutable state transition owner.
- `site/flow/v3/data/sources.mjs` — provenance, coverage, validity and explicit fallback semantics.
- `site/flow/v3/ui/workbench.mjs` — map-first layout, accessibility and state-driven controls.
- `site/flow/v3/render/*.mjs` — per-mode rendering layers, no independent playback loop.

Migration rule: keep the currently mounted Flow fallback and all four mode URL values throughout the migration. Replace layers behind stable DOM selectors only when numeric + browser tests pass.

## 5. Invariants that Stage 2 must enforce

1. Units: `simulationSeconds = frameElapsedMs / 1000 × rate`. Never interpret a 170× display value as 170 seconds every frame.
2. Particle reset or antimeridian wrap never draws a line across disconnected positions.
3. Wind speed is the norm of east-positive `u` and north-positive `v`. Meteorological direction reports where the wind comes **from**.
4. Do not sample beyond valid wind-grid latitude. Return an explicit out-of-domain state instead.
5. A frozen field and fixed-step integrator have deterministic reference tests at 30, 60 and 120 render frames per second.
6. One controller decides global playback, TRIPS play, simulation time and mode transitions.
7. Every display mode distinguishes measured, model-derived and synthetic teaching data.
8. Mode switch and cleanup preserve unrelated URL parameters, but remove invalid selected Flow keys.

## 6. Dependencies and licensing

Stage 1 introduces **no new runtime third-party packages**. Existing `Canvas` / `SVG` remains the default while correctness is repaired.

Possible Stage 6 evaluations:
- `d3-geo` for an explicit world projection and topology-aware paths.
- `visgl/flowmap.gl` for larger OD datasets.
- `visgl/deck.gl` `TripsLayer` for large temporal trajectories.
- `mapbox/webgl-wind` for GPU particle counts when measured performance justifies it.

Each import requires size, license, security, accessibility and CI evidence. Demo data availability is **not** implied by a visualization library license.

## 7. Documentation and test traceability

The machine-readable acceptance contract is `docs/flow-v3/contract.json`.
Stage gates are in `docs/flow-v3/ACCEPTANCE.md`.
The handoff is `docs/flow-v3/HANDOFF.md`.

Stage 1 characterization tests must not silently fix confirmed scientific bugs. A green baseline means the existing implementation is reproducible, **not** that the V3 science targets have passed.
