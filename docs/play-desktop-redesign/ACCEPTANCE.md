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


## G. STEP 03 acceptance — Shared desktop design system

Validated in [GeoGeek Quality run 37916400677](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37916400677), commit `88a87ca46dec063bac452169db9c4ebb42380321` — **PASS**. This run includes the selected-state CSS specificity correction from STEP 03, unchanged through the STEP 04 verification.

| Check | Result | Evidence |
| --- | --- | --- |
| Shared tokens apply to V2 and legacy PLAY shells | PASS | `play-design-system.spec.mjs`: V2 Project and Light, legacy Orient |
| Project desktop typography and keyboard focus | PASS | Desktop Playwright contract at 1920×1080, 1440×900, 1366×768 |
| Light selection persists under hover and disabled action remains readable | PASS | Browser-selected state test; previous CSS priority failure resolved |
| Scoped styles do not break existing instrument interactions | PASS | Full Playwright regression including PLAY pointer/entry tests and non-PLAY Lab suite |
| Project / Light sample captures | PASS | `quality-reports` artifact 11611212639; `project-design-system-*` and `light-design-system-*` at 1920, 1440 and 1366 |
| Complete visual redesign of all six instruments | DEFERRED | STEPS 05–10; STEP 03 finalizes reusable tokens and representative control rules only |

STEP 03 **DONE** for its scoped design-system deliverable. The inherited panel arrangement and weak-contrast secondary annotations are not claimed fixed. The first STEP 03 browser run had a Light selected/hover conflict; the final success run demonstrates the corrected rule.

## H. STEP 04 acceptance — Full-viewport PLAY Workspace

**Validated implementation revision:** `88a87ca46dec063bac452169db9c4ebb42380321`  
**GitHub Actions:** [GeoGeek Quality run 37916400677](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37916400677) — **COMPLETED / SUCCESS**.  
**Quality artifact:** `quality-reports`, ID `11611212639`.  
**Playwright report:** 498 total; **486 passed, 12 skipped, 0 failed, 0 flaky**. Twelve skipped cases include eight intentionally desktop-only STEP 04 cases on mobile, three STEP 03 desktop-only cases on mobile, and one unrelated pre-existing Water case.

| Check | Result | Evidence |
| --- | --- | --- |
| G01 — all six PLAY instruments open from cards and direct links | PASS | Existing `play-entry-pointer.spec.mjs` and six direct-link full-viewport checks |
| G02 — PLAY Dialog reaches all viewport edges, no floating frame | PASS | `play-fullviewport-workspace.spec.mjs`, six kinds × 1920×1080, 1440×900, 1366×768, 1536×864 (24 viewport checks) |
| G03 — Close and Escape return to Lab, no identity leakage | PASS | New focused Playwright test; independent browser-history navigation coverage is **NOT RUN** as part of STEP 04 |
| G04 — no internal panel obstructs the scientific field | DEFERRED | Bound and Light still have legacy internal overlapping panels, STEPS 05–10 |
| G05 — primary pointer and keyboard flows remain operable | PASS | Existing PLAY entry/pointer and Project/Light/Orient browser suites |
| G06 — all labels and legends visually final | DEFERRED | Sample screenshots reviewed; detailed instrument hierarchy, contrast and occlusion are STEPS 05–10 |
| G07 — three desktop viewport sizes | PASS | 1920×1080, 1440×900, 1366×768 geometry; 1920 and 1366 PNG captures for all six kinds |
| G07 — 125% browser zoom | NOT RUN | A 1536×864 CSS viewport proxy was tested, but this does **not** verify native browser zoom; STEP 12 |
| G09 — non-PLAY layout remains isolated | PASS | World isolation test plus `lab-fullpage-workspace.spec.mjs`: 14/14 cases, including Water and Observatory |
| Build, static QA, links, Lighthouse | PASS | GitHub Quality run 37916400677 |
| Playwright full suite | PASS | 498 total; 486 passed, 12 skipped, 0 failures |
| Screenshots inspected | PASS | 12 labeled PNGs, six kinds at 1920×1080 and 1366×768 |
| Identical-state before/after pixel-diff versus STEP 00 images | NOT RUN | STEP 00 screenshots used a different viewport size and scene state |
| Final cross-instrument visual sign-off | DEFERRED | STEP 12 |

The first STEP 04 CI run, [37913119305](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37913119305), failed six PLAY fullscreen width assertions: a 1920 px viewport exposed a 1600 px Dialog. The root was competition with legacy Dialog size constraints. `site/play/play-workspace.css` was corrected to enforce its scoped fixed-position viewport bounds with appropriate priority in commit `06d1e58b294cb512b67ede7a5a092913efbf4ff8`; the follow-up test commit `88a87ca46dec063bac452169db9c4ebb42380321` added computed-style and stylesheet checks. The final run passed all six previously failing tests.

The same unsuccessful earlier run also contained a Pulse timing failure. Pulse code was untouched; the complete Pulse regression passed in the final successful run.

**STEP 04 decision: DONE** for the outer edge-to-edge PLAY shell. No change to instrument physics, state machines or the existing Observatory fullpage mechanism. Internal task/evidence rail redesign remains the responsibility of STEPS 05–10.


## I. STEP 05 acceptance — Project desktop visual redesign

**Validated runtime/test commit:** `e4e2165817df051c34a61463cea55eba5b5b21e9`.  
**CI run:** [GeoGeek Quality 37925719679](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37925719679) — **COMPLETED / SUCCESS**.  
**Playwright report:** **504 total / 489 passed / 15 skipped / 0 failed / 0 flaky**.  
**Quality artifact:** `quality-reports`, artifact ID `11614926246`, containing twelve Project desktop captures.  
**Scope:** Project UI composition, scientific visual hierarchy, labels and controls only. Neither `project-morph.js` nor area values, geodesic calculations, trace logic or the prediction state machine changed.

| Check | Result | Evidence |
| --- | --- | --- |
| P01 — legible Mercator world, highlights remain identifiable | PASS | Original `project-projection-geometry.spec.mjs` and 1920×1080, 1440×900, 1366×768 Project captures |
| P02 — projection transitions remain finite and continuous | PASS | Existing area/route geometry test probes throughout the scrub; untouched `project-morph.js` |
| P03 — commit before revealing actual area | PASS | `project-desktop-redesign.spec.mjs`: actual-area pair absent from the DOM through prediction and transformation; appears only after REVEAL AREA |
| P04 — apparent screen area distinct from actual km² area | PASS | Distinct `APPARENT AREA ON MAP` relative readout versus `ACTUAL SURFACE AREA` measured pair; first-order reveal hierarchy |
| P05 — route judgment and geodesic remain distinct | PASS | Reference hidden in route-drawing stage, appears after REVEAL GEODESIC; solid copper great-circle path versus dashed judgment |
| P06 — map canvas free of persistent task/evidence panel overlap | PASS | Grid geometry checked at all three desktop sizes; independent left rail, map and right rail |
| Project desktop test cases | PASS | 3/3 desktop Chromium; three mobile counterparts skipped intentionally |
| Desktop states recorded in screenshots | PASS | 12 captures: area prediction/result and route drawing/result × three desktop viewports |
| 1366×768 revealed-area readings visible without scrolling | PASS | New bounding-box assertions for real and apparent area; final `project-area-result-1366` capture inspected |
| Controls, focus and status progression | PASS | Existing Project tests and redesign contract; pointer/keyboard route preserved |
| Build, static QA, links, Lighthouse | PASS | Final CI run 37925719679 |
| Full browser regression | PASS | 504 total; 489 expected passes; 15 skips; 0 failures |
| Real browser 125% zoom | NOT RUN | A smaller CSS viewport is not equivalent; keep for STEP 12 |
| Identical state, identical viewport pixel diff to STEP 00 | NOT RUN | Initial manual reference was 1920×869 and predates STEP 04 viewport normalization |
| Other five instrument-specific visual redesigns | DEFERRED | STEPS 06–10 |

The original successful STEP 05 test commit `622fc14c9933de27d863e3d71b2e9435fcebd632` yielded 489 passes and 15 skips, with no failures. Visual inspection then identified an important issue that the initial assertions missed: at 1366×768, actual km² evidence was below the right rail fold. The subsequent amendment moved the actual-area and apparent-area blocks ahead of supporting notes and added viewport-visibility assertions. Final CI run 37925719679 validated the amendment. The final screenshot shows INDIA ≈3.29M km², GREENLAND ≈2.17M km², and the comparative projected-area statement in the visible rail without scrolling.

The browser suite's 15 skipped cases are the 12 desktop-only STEP 03–05 checks in the mobile project, two further desktop-only/unsupported browser cases as accounted for in the CI report, and one unrelated Water case. Skipped cases are not counted as passes.

**STEP 05 decision: DONE** for the scoped Project visual and interaction design. No native browser zoom measurement or release-wide visual sign-off is implied. The complete Lab and other instrument regressions are kept as part of the upcoming STEP 06–12 quality gates.

## J. STEP 06 acceptance — Light desktop visual redesign

**Validated code commit:** `626c80b109bbca0d6e79e00e229b404b3a0e50ea`  
**CI:** [GeoGeek Quality 38012588526](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38012588526) — **COMPLETED / SUCCESS**.  
**Browser suite:** **510 total / 492 passed / 18 skipped / 0 failures**.  
**Quality artifact:** [quality-reports 11655492421](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38012588526/artifacts/11655492421).  
**Scope:** Light-only desktop composition, optical-path legend, typography and evidence hierarchy; no change to Light physics, Water Rrs computation or experiment state machine.

| Check | Result | Evidence |
| --- | --- | --- |
| L01 — shared Y-scale for before/after spectra | PASS | Existing Light spectrum geometry tests; `spectrumDomain` / `pathD` unchanged |
| L02 — actual zero baseline and removed-signal distinction | PASS | `light-spectrum-comparison.spec.mjs` and removed mechanism captures |
| L03 — three mechanisms remain independent | PASS | `light-play.spec.mjs` plus desktop prediction, sky, water and surface reveals |
| L04 — quantitative Rrs distinct from teaching paths | PASS | Visible RELATIVE versus `550 NM · Rrs / sr⁻¹` labels; explanation and limits in evidence rail |
| L05 — unobstructed scene, legend, spectrum and prediction controls | PASS | `light-desktop-redesign.spec.mjs`, 3/3 desktop cases, grid geometry and desktop captures at 1920×1080, 1440×900, 1366×768 |
| L06 — readout wavelength and unit visibility | PASS | Chart labels / measurement readout assertions; inspected 1366×768 result screenshot |
| Selected/disabled control style and mouse stability | PASS | Existing `play-design-system.spec.mjs` regression; new hover/click/focus assertion |
| Narrow-width breakpoint compatibility | PASS | Dedicated desktop test resizes through 920px and returns to 1366px |
| Build, Static QA, links, Lighthouse, non-Light regressions | PASS | Final GitHub Actions run 38012588526 |
| Desktop screenshot captures and visual review | PASS | Initial prediction, sky-off and water-off × three viewports, plus 1366px surface-off, in artifact 11655492421 |
| Native 125% browser zoom | NOT RUN | Reserved for STEP 12 |
| Browser history back/forward, global final visual signoff | NOT RUN | Reserved for STEP 12 |
| Same-state pixel diff against original 1920×869 manual baseline | NOT RUN | Different captured sizes and states |

**Failure history:** The first STEP 06 CI [37943335609](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37943335609) reported **491 passed, 18 skipped, one failure**. The failure was the legacy Light `BLACK` choice Playwright click timing out because the hover-shifted target was not stable. The corrected implementation `626c80b109bbca0d6e79e00e229b404b3a0e50ea` passed the full browser suite, including the previously failing case and all three redesign cases.

**STEP 06 decision: DONE** within its Light UI scope. No change to the scientific model or Observatory/Water runtime; final release-wide zoom, history and visual checks stay in STEP 12. **Next: STEP 07 — Bound Visual Redesign.**

## K. STEP 07 acceptance — Bound desktop visual redesign

**Validated code commit:** `de24b1fc6f0ebfa77141d84cc9304fa4b6e42911`.  
**Final CI:** [GeoGeek Quality 38016447057](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057) — **COMPLETED / SUCCESS**.  
**Browser suite:** 516 cases; **495 passed / 21 skipped / 0 failed**.  
**Quality artifact:** [11656803261](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057/artifacts/11656803261), including 13 screenshot attachments from the Bound redesign tests.

| Check | Result | Evidence |
| --- | --- | --- |
| B01 — entire risk field and polygon visible during drawing | PASS | Unobstructed square field, tested at 1920×1080, 1440×900, 1366×768; screenshot review and `checkWorkspace` geometry |
| B02 — ≥70% coverage and ≤30% area as competing targets | PASS | Clear separate evidence rail; target text, field model explanation and `bound-v2-evidence-values` assertions |
| B03 — 96×96 → 24×24 observation change; same source | PASS | Resolution/threshold readouts, changed-class mask and coverage comparison in decision state; unchanged `bound-field.js` |
| B04 — original/revised boundaries distinguishable | PASS | Solid orange current line and dashed pale original line; `bound-v2-old-line` and `bound-v2-line` attributes, SVG CSS and 1366 redraw screenshot |
| B05 — balanced KEEP and REDRAW choices | PASS | Equal-sized buttons, separate tested KEEP and REDRAW outcomes, screenshot inspection |
| B06 — pointer and keyboard/guided polygon creation | PASS | True pointer-drawn boundary; guided `G` and ArrowRight nudge; valid commit in both cases |
| Full desktop visual matrix and screenshot review | PASS | 13 generated/inspected PNG captures (nine 3-state×viewport, four 1366px interaction/result) |
| Narrow viewport restored correctly | PASS | Resize 1366→920→1366, task metric visibility and return of desktop evidence rail |
| Node/CI build/static/links and non-Bound regression | PASS | All GitHub Quality 38016447057 steps, Lighthouse and 495 browser passes |
| 125% native browser zoom | NOT RUN | STEP 12 |
| Dedicated history back/forward and final six-instrument signoff | NOT RUN | STEP 12 |
| Same-state same-size pixel diff against STEP 00 manual reference | NOT RUN | The original 1920×869 image used a different viewport and state |

**CI failure history:** The first Bound implementation `19d6323` failed all three new cases on a strict but real field-to-caption clearance defect (0.3–2.7 CSS px); a separate Pulse test timed out. Compact viewport screenshots also exposed bottom legend crowding. Commit `de24b1fc6f0ebfa77141d84cc9304fa4b6e42911` corrected the actual field size and short-height evidence spacing **without weakening the tests**. Final [CI 38016447057](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057) passed the Bound tests and Pulse regression, 495 passed, 21 skipped, zero failures.

**STEP 07 decision: DONE** within the Bound presentation scope. All science and state-machine contracts are preserved. **Next: STEP 08 — Swath visual redesign.**

## L. STEP 08 acceptance — Swath desktop visual redesign

**Validated implementation:** `fd3ee3cd41f7b76757336d1bf8613ce04004a6e5`.  
**Final CI:** [GeoGeek Quality 38020517684 / attempt 2](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/attempts/2) — **SUCCESS**, 522 browser cases: **498 passed / 24 skipped / 0 failed / 0 flaky**.  
**Final quality artifact:** [11660914376](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/artifacts/11660914376), containing 11 Swath redesign screenshots.

| Check | Result | Evidence |
| --- | --- | --- |
| S01 — ground swath and nadir GSD dominate comparison evidence | PASS | Independent right rail, current/previous metric text with km/m, three desktop sizes, new spec |
| S02 — footprint coverage vs GSD vs optics clearly distinct | PASS | Explicit `GROUND SWATH / COVERAGE WIDTH`, `NADIR GSD / GROUND SAMPLING`, detector count and optical-not-modeled notes; 1366px screenshot |
| S03 — three guided, one-variable experiments retain geometry effects | PASS | Three transitions in `swath-desktop-redesign.spec.mjs` and existing `swath-play.spec.mjs`; scientific content/state modules unchanged |
| S04 — previous/current geometry and numbers distinguishable on reveal | PASS | Solid-orange current and pale dashed previous footprint, central line-type labels only when comparison revealed, `data-compare=on`, before/after ratios and screenshots |
| S05 — free altitude, FOV, detector changes and reset | PASS | Keyboard ArrowRight, valid 12032-sample native slider step, 700km altitude, reset to reference, replay guided; screenshot and spec |
| S06 — Earth geometry clearly labeled not altitude-to-scale | PASS | Curvature-aware schematic caption at bottom of center viewport, all three sizes |
| Desktop geometry 1920×1080 / 1440×900 / 1366×768 | PASS | Dedicated test asserts task/scenario/evidence separation with live metrics inside evidence rail |
| 920px narrow layout and desktop return | PASS | Single metric DOM node moved to/from original surface without duplication; dedicated browser test |
| Original Swath model, Trace and semantics unchanged | PASS | `swath-physics.js`, `swath-content.js`, `swath-experiments.js` and `play-trace.js` untouched; Node/Playwright regressions passed |
| Build, static/link checks, browser/accessibility and Lighthouse | PASS | CI 38020517684 attempt 2, all steps successful; **498 passes**, **24 skips** |
| Screenshot artifact and visual review | PASS | 11 screenshot binary paths verified from final artifact; same-SHA captures inspected, including 1366px reveal and free design |
| Native browser 125% zoom | NOT RUN | STEP 12 |
| Dedicated browser history and six-instrument final signoff | NOT RUN | STEP 12 |
| Same-state pixel baseline against STEP 00 | NOT RUN | Reference image was 1920×869; states differ |

**Failure history and fix:** `c7fab34` failed the new test's off-step detector slider value and an unrelated Pulse Round 4 axe timeout (CI 38018960417: 496 passed, 24 skipped, 2 failed). `fd3ee3c` corrected the *test input* to native step 12032 and improved short-height geometry notation; the physics remained unchanged. CI 38020517684 attempt 1 then had 497 passed, 24 skipped, one Pulse timeout. **Attempt 2** on the exact same SHA passed all 498 non-skipped tests, including Pulse, and Lighthouse. Pulse reliability should still be watched in STEP 12.

**STEP 08 decision: DONE** for Swath presentation and interaction. No merge to production; **next STEP 09 — Orient Visual Redesign.**
