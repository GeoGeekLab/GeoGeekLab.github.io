# PLAY Desktop V2 — Acceptance Matrix

This document defines release and step-level gates. Mark each check PASS, FAIL, BLOCKED, or NOT RUN. Never infer PASS from a source review.

## A. Global contract

| ID | Requirement | How to check | Phase |
| --- | --- | --- | --- |
| G01 | Six PLAY entries open from Lab cards and direct links | Desktop Playwright: entry and pointer tests | 04/12 |
| G02 | Workspace fills CSS browser viewport (not OS display) | Bounding-box assertions across target desktop viewports | 04/12 |
| G03 | Close, Escape, browser history and Lab return remain correct | Interaction checks | 04/12 |
| G04 | No persistent panel masks essential map/field/path elements | State screenshots and geometry checks | 05–10/12 |
| G05 | Controls usable by mouse and keyboard with visible focus | Keyboard/pointer integration tests | 04–12 |
| G06 | Critical labels, units and legend visible and readable | Desktop visual inspection | 03–12 |
| G07 | Layout works at 1920×1080, 1440×900, 1366×768, 125% zoom | Capture matrix | 04/12 |
| G08 | Source and model limits retain their meaning | UI assertion and domain review | 05–12 |
| G09 | PLAY styles do not alter Observatory, Water, Lab collection or other pages | Existing Lab/Observatory regression | 04/12 |
| G10 | Spatial Trace persists judgments and changes without scoring | Tests and reload | 11/12 |
| G11 | Reduced motion and keyboard navigation remain functional | Browser tests and review | 03–12 |
| G12 | Build, link checks, relevant Node QA, desktop browser suite pass | CLI with output recorded in STATUS | 12 |

## B. Instrument contracts

### Project

- P01: At entry, the world map occupies a meaningful portion of the canvas; no narrow-strip collapse.
- P02: Mercator, Equal Earth, and Tokyo-centered azimuthal transformations remain finite, smooth and identifiable.
- P03: Greenland and India are visibly distinct; user judgment precedes the correct area reveal.
- P04: Apparent map area and actual surface area have separate labels.
- P05: Route drawing, geodesic reveal, scrubbing and result work with mouse and keyboard.
- P06: All Project states maintain canvas visibility without overlay obstruction.

### Light

- L01: A single chart Y-scale governs before/after comparisons within a trial.
- L02: Zero or nearly zero signals remain visibly and numerically distinct from a nonzero baseline.
- L03: Atmospheric scattering, water backscatter and surface reflection remain separate mechanisms.
- L04: Model-derived Rrs is not conflated with conceptual sky/surface paths.
- L05: Scene, light-path legend, spectrum and prediction controls remain readable at desktop sizes.
- L06: Before/after units and measurement wavelength are explicit where numbers are displayed.

### Bound

- B01: Risk field and complete polygon remain visible while drawing.
- B02: Coverage ≥70% and enclosed area ≤30% are labeled as competing target constraints, not grades.
- B03: The 96×96 to 24×24 observation change visibly preserves the source field distinction.
- B04: Original and revised lines remain distinguishable in redraw states.
- B05: KEEP and REDRAW have balanced affordance; users can commit either choice.
- B06: Pointer and guided/keyboard region creation produce valid polygons.

### Swath

- S01: Ground swath and nadir GSD are the primary comparison quantities.
- S02: The difference between footprint coverage, ground sampling and optical resolution stays explicit.
- S03: Three guided experiments preserve the designed one-variable-at-a-time comparisons.
- S04: Previous and current footprint/metrics stay distinguishable on reveal.
- S05: Free sensor design changes altitude, FOV and detector samples correctly, with reset working.
- S06: The illustrative Earth geometry is clearly labeled as not altitude-to-scale.

### Orient

- O01: Reference-centered globe is legible and dominates the visual field.
- O02: Direction and distance estimates work by pointer and keyboard.
- O03: Confidence cannot be committed before a spatial estimate exists.
- O04: Truth, target and residual geometry do not appear before commitment.
- O05: Distance and bearing residuals remain distinct; confidence is recorded before reveal.
- O06: Primer, skipped unfamiliar relation, session recovery and Trace continue to work.

### Connect

- C01: Start, target, current node, selectable neighbors and completed route have distinct states.
- C02: Shared-border and 1200 km distance rules are always identifiable.
- C03: Invalid connection explains the failure and does not mutate the route.
- C04: Existing route remains visible while the graph's edges change.
- C05: New/deleted connections and old/new route can be distinguished without color alone.
- C06: Hop counts, route locking, adaptation and optimal-hop result remain correct.

## C. Evidence format for future steps

Each STATUS entry must include:
- Step and commit SHA.
- Changed paths and changes intentionally deferred.
- Test commands and outcomes (PASS / FAIL / NOT RUN).
- Screenshot or capture links, browser and viewport when available.
- Known scientific/visual defects and risk classification.
- Decision: DONE, IN REVIEW or BLOCKED.

## D. STEP 00 acceptance

| Check | Result | Evidence |
| --- | --- | --- |
| Dedicated design branch exists | PASS | `design/play-desktop-v2` |
| Baseline source commit/release recorded | PASS | MASTER_PLAN / BASELINE |
| All six module locations inventoried | PASS | BASELINE |
| Browser/Node test entry points inventoried | PASS | BASELINE |
| Main observed issues prioritized | PASS | BASELINE |
| Desktop visual baseline documented | PASS | Six supplied reference screenshots; BASELINE |
| Raw screenshots checked into Git | NOT RUN | Reference images are outside repository |
| Automated runtime screenshots captured | NOT RUN | No browser session in STEP 00 |
| Node/browser QA executed | NOT RUN | No local runtime checkout |
| No runtime files changed | PASS | Documentation-only commits |

STEP 00 is a planning and audit gate; the NOT RUN entries remain required before a release candidate can pass STEP 12.

## E. STEP 01 acceptance — Project projection geometry

Validated build commit: `f00b78c28e1baa7aeefbe6330c5f2a72d9563813`  
GitHub Actions: [GeoGeek Quality run 37901771959](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37901771959) — **PASS**.  
Scope: geometry and existing scientific/interaction behavior. Full-screen redesign is deferred to STEP 04; Project layout polish to STEP 05.

| Check | Result | Evidence |
| --- | --- | --- |
| P01 — legible world map, no narrow-strip collapse | PASS | 1920×1080 initial screenshot + 1366×768 desktop geometry assertions; world land/sphere bounding boxes exceed regression thresholds |
| P02 — finite Mercator → Equal Earth → Tokyo-centered azimuthal morph | PASS | Browser checks at 0/25/50/75/100% for area and route; SVG coordinates finite; 1440×900 route screenshot |
| P03 — Greenland and India visible; commit before reveal | PASS | 1920×1080 screenshot and existing area-state Playwright tests |
| P04 — apparent-versus-actual area distinction maintained | PASS | Existing Project readout and result labels; area-state browser tests |
| P05 — route judgment, geodesic reveal and projection scrub | PASS | Existing pointer/keyboard/regression tests plus new route test |
| P06 — complete Project workspace free of panel obstruction | DEFERRED | Full workspace redesign is STEP 05, not the STEP 01 geometry acceptance gate |
| Production build | PASS | GitHub Quality run build step |
| Static QA and links | PASS | GitHub Quality run |
| Playwright complete suite | PASS | 472 total / 471 passed / 1 unrelated skipped / 0 failed |
| Project-specific Playwright cases | PASS | 14 of 14 passed across existing and new suites (7 desktop + 7 mobile) |
| Post-fix screenshot inspection | PASS | Playwright artifact `quality-reports`, `area-mercator-1920` (1920×1080) and `route-azimuthal-1440` (1440×900) |
| Same-size visual diff against STEP 00 screenshot | NOT RUN | STEP 00 provided a 1920×869 image; new capture is 1920×1080; visual comparison is qualitative |
| 125% desktop zoom visual inspection | NOT RUN | Remains in global STEP 12 matrix |

The single skipped test is a pre-existing Water prototype desktop narrow-screen case in `tests/browser/water-prototype.spec.mjs`, not a Project test. Completion of STEP 01 does not claim completion of P06, full-viewport support, typography/contrast refinement, or the final cross-viewport visual sign-off.


## F. STEP 02 acceptance — Light spectral comparison

Validated implementation revision: `118d5311cba93f08a25eaca196e753a47a523733`  
GitHub Actions: [GeoGeek Quality run 37904642575](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37904642575) — **COMPLETED / SUCCESS**.  
Scope: scientifically faithful spectral comparison and readout labeling. The Light workspace restyle is STEP 06.

| Check | Result | Evidence |
| --- | --- | --- |
| L01 — shared within-experiment Y axis | PASS | `tests/light/light-spectrum.test.mjs`: a nonzero after spectrum stays proportionally below the baseline; `tests/browser/light-spectrum-comparison.spec.mjs` |
| L02 — zero and near-zero signals accurately displayed | PASS | Zero after-spectrum traces at SVG baseline y=126, including negative/nonfinite input guards and small nonzero Rrs case |
| L03 — independent mechanism removal | PASS | Original Light experiment/state tests, full three-scene browser sequence and screenshots |
| L04 — quantitative Rrs separate from illustrative paths | PASS | Spectrum mode and `550 NM · Rrs / sr⁻¹` readout for water; `550 NM · RELATIVE` for conceptual atmosphere/surface |
| L05 — final scene/control legibility | DEFERRED | Layout, occlusion and hierarchy belong to STEP 06; the current overlay still masks part of the scene/spectrum |
| L06 — readout identifies wavelength and units | PASS | Nearest 550 nm sample, labeled `Rrs / sr⁻¹` or `RELATIVE`, before/after readings |
| New numerical Node tests | PASS | Four unit tests in `tests/light/light-spectrum.test.mjs`, covered by `npm run qa` |
| Existing Light Node tests | PASS | `npm run qa:light`, included in CI Static QA |
| Light browser tests | PASS | 8/8 across desktop and mobile Chromium; 4 original + 4 new |
| Full browser suite | PASS | 476 total / 475 expected passes / 1 unrelated skipped / 0 failures / 0 flaky |
| Production build, static QA, links, Lighthouse | PASS | GitHub Quality run 37904642575 |
| Desktop screenshot evidence | PASS | Report captures `light-sky-removed-1920` (1920×1080), `light-water-removed-1920` (1920×1080), `light-surface-removed-1440` (1440×900) |
| Desktop 125% zoom and fully unobstructed scene | NOT RUN / DEFERRED | STEP 06 and STEP 12 |

The single skipped case remains the unrelated Water prototype narrow-screen test. Screenshot inspection confirms that the removed-mechanism curves rest on the chart's actual zero baseline, the 550 nm readings and unit labels are visible, and scene mechanism states remain distinct. Full scene composition remains an open design issue for STEP 06, not a regression in STEP 02.
