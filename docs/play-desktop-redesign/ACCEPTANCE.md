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
