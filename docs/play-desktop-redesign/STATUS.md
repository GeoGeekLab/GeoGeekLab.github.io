# PLAY Desktop V2 — Status

Updated: 2026-10-09  
Working branch: `design/play-desktop-v2`  
Baseline source: `main@f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release marker: `20261009v102`

## Current state

**STEP 00 — DONE (documentation and visual-reference baseline).** No PLAY runtime, stylesheet or test implementation was modified. The provided six screenshots have been catalogued; repeatable browser captures and baseline test results are not yet available.

**STEP 01 — DONE.** The Project projection geometry correction passed full GitHub Quality, dedicated browser geometry regressions, area/route interaction tests, and post-fix desktop screenshot inspection. **Next: STEP 02 — Light spectral comparison correction.**

## Roadmap

| Step | Task | State |
| --- | --- | --- |
| 00 | Project audit and baseline | DONE |
| 01 | Project geometry correction | DONE |
| 02 | Light spectrum comparison correction | PLANNED |
| 03 | Desktop design tokens and components | PLANNED |
| 04 | Edge-to-edge PLAY workspace | PLANNED |
| 05 | Project visual redesign | PLANNED |
| 06 | Light visual redesign | PLANNED |
| 07 | Bound visual redesign | PLANNED |
| 08 | Swath visual redesign | PLANNED |
| 09 | Orient visual redesign | PLANNED |
| 10 | Connect visual redesign | PLANNED |
| 11 | Shared interaction and Spatial Trace | PLANNED |
| 12 | Release regression and visual sign-off | PLANNED |

## STEP 00 handoff

### Completed

- Created the working branch from `main` and kept changes isolated.
- Audited the six PLAY runtime entry points, the legacy/V2 shells, shared CSS, full-page Lab subsystem, test locations and release marker.
- Recorded the six supplied 1920×869 screenshots and their hash prefixes in `BASELINE.md`.
- Documented the project design direction and the scientific/interaction invariants.
- Established the acceptance matrix and commands for targeted desktop QA.
- Identified one source-verifiable Light chart scaling defect and one Project projection-extent hypothesis requiring runtime verification.
- Noted a stale `README.md` PLAY count and a default browser test configuration that includes mobile. Neither was changed.

### Written files

- `docs/play-desktop-redesign/MASTER_PLAN.md`
- `docs/play-desktop-redesign/DESIGN_SYSTEM.md`
- `docs/play-desktop-redesign/BASELINE.md`
- `docs/play-desktop-redesign/ACCEPTANCE.md`
- `docs/play-desktop-redesign/STATUS.md`

### Verification

| Check | Result | Note |
| --- | --- | --- |
| Remote source inspection | PASS | GitHub repository files and tests inspected |
| Working branch creation | PASS | `design/play-desktop-v2` |
| Documentation commits | PASS | Each document written to the isolated branch |
| Six supplied reference images reviewed | PASS | Captures described in BASELINE |
| Reference screenshot package | PASS | Separate handoff artifact; PNGs not committed |
| GitHub Pages runtime changes | NONE | Docs only |
| `npm run build` | NOT RUN | No local checkout |
| `npm run qa` | NOT RUN | No local checkout |
| `npm run qa:browser` | NOT RUN | Browser project not executed |
| Automated Playwright screenshots | NOT RUN | Deferred to a runnable environment |

### Open risks

1. **P0 — Project visual collapse.** Suspected projection-domain/fitting problem; verify the numerical cause before editing the geometry.
2. **P0 — Light before/after comparison.** Chart curves currently use independent Y maxima in `light-view.js`.
3. **P1 — Layout coupling.** Five instruments use V2 shell; Orient retains a legacy shell. Fullscreen integration must cover both without changing Observatory.
4. **P1 — Occlusion.** Bound and Light contain large persistent overlays that may hide critical field or chart areas.
5. **P1 — Desktop visual baseline coverage.** Six reference images show early states only, at 1920×869. Automated state-by-state captures are outstanding.
6. **P2 — Existing test expectations.** Presentation tests encode old placement and wording; update those tests only when the relevant replacement design is implemented.

### STEP 01 instructions

1. Read all five documents under this directory.
2. Check the current branch head and confirm the baseline main commit before changing source.
3. Restrict implementation to `site/play/project/` and directly related Project tests, unless a dependency requires an explicit exception.
4. Reproduce the narrow-strip map at actual desktop viewports. Inspect the Mercator pole clamp, sphere bounds, `fitExtent()` and interpolation throughout the morph.
5. Fix root geometry, not just CSS scale. Preserve area calculation, projection annotation, area/route state and true-geodesic logic.
6. Run Project-related Node/browser checks and capture before/after screenshots at desktop widths. If runtime execution is unavailable, leave STEP 01 IN REVIEW.
7. Update `ACCEPTANCE.md` results if the acceptance policy changes, and append actual execution results here.


## STEP 01 implementation — 2026-10-09

### Commits and modified paths

- `5b94072f76cd7b9dba09d8cabd04236c97edf83f` — `site/play/project/project-morph.js`.
- `02cd6e98e155ca2b76281b7577495bec4c609303` — `tests/browser/project-projection-geometry.spec.mjs`.
- `docs/play-desktop-redesign/STATUS.md` — execution log only.

### Fix

The existing pole clamp used `π/2 − 10⁻⁶` radians for both raw projections. The Mercator Y value at that latitude is approximately 14.5087, so fitting its entire sphere into a 500-unit height leaves the world's theoretical width at approximately 108.3 units. The updated Mercator bound uses `atan(sinh(π))`, approximately ±85.05113°, with finite Y extents of ±π. At the same 500-unit fit height the world width is approximately 500 units. This is a numerical root-cause check, not a screenshot test.

The change targets the Mercator raw projection only. Equal Earth and azimuthal inputs are not artificially clipped at Mercator's latitude limit. Existing projection interpolation, spherical area values, route sampling, geodesic drawing, user predictions and trace states were not modified.

### Regression coverage introduced

`tests/browser/project-projection-geometry.spec.mjs` asserts:
- Area scene at 1920×1080 and 1366×768, including morph positions 0, 25, 50, 75 and 100 percent.
- Finite SVG paths, non-collapsed land and sphere bounding boxes, visible area result and a populated apparent-area readout.
- Route scene at 1440×900, including keyboard-drawn route, revealed geodesic, Tokyo-centered morph positions and final route state.
- PNG attachments for the 1920-wide initial Mercator view and 1440-wide final azimuthal route view, generated only when the test runs.

### Verification status

| Check | Result | Evidence |
| --- | --- | --- |
| Project source and state-flow review | PASS | Source comparison against documented STEP 00 baseline |
| Independent Mercator projection-span calculation | PASS | Old width ≈108.3; bounded width ≈500.0 at identical vertical fit |
| Scoped code and browser test commits | PASS | Commits recorded above |
| No non-Project runtime or styling change | PASS | No changes outside Project source, Project test and STATUS |
| `npm run build` | NOT RUN | Awaiting GitHub quality workflow |
| `npm run qa` | NOT RUN | Awaiting GitHub quality workflow |
| New Project Playwright regression | NOT RUN | Workflow not yet reached browser suite at logging time |
| Existing Project area/route browser regressions | NOT RUN | Same dependency |
| Post-fix desktop screenshots and visual comparison | NOT RUN | Test attachments pending workflow execution |
| Non-PLAY browser regressions | NOT RUN | Awaiting CI |

GitHub Actions quality workflow triggered for commit `02cd6e98e155ca2b76281b7577495bec4c609303`: [run 37900961659](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37900961659). At the time of this log, the workflow had not reached Project browser tests. A subsequent STATUS commit may supersede that run because branch quality CI uses `cancel-in-progress`. Inspect the latest branch run before recording any test outcome.

### Outstanding acceptance gate

P01 and P02 are **IN REVIEW**, not PASS. Confirm the true SVG land/sphere extent and finite shape at Mercator, intermediate projection states, Equal Earth and Tokyo-centered azimuthal. Confirm P03–P05 against existing interaction tests. P06's full workspace layout belongs to STEP 05 and is not claimed complete here.

Do not start STEP 02 until the required Project browser test and screenshots have been evaluated. If CI fails due an unrelated dependency, record the blocker and rerun the targeted Project test in a suitable environment before closing STEP 01.


## STEP 01 acceptance — 2026-10-09

### Decision: DONE

Validated implementation revision: `f00b78c28e1baa7aeefbe6330c5f2a72d9563813`.

- [GeoGeek Quality run 37901771959](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37901771959) **COMPLETED / SUCCESS**, including build, static QA, links, the complete browser suite and Lighthouse.
- Embedded Playwright report: **472 total; 471 passed; 1 skipped; 0 failed; 0 flaky**.
- Project-related tests: **14/14 passed**, including new geometry tests (four runs across two configured browser projects) and existing pointer, apparent-area, finite-coordinate, area-and-route tests.
- New desktop geometry checks cover **1920×1080, 1366×768 and 1440×900**. The area and route scrubbers are checked at 0%, 25%, 50%, 75%, 100%.
- Automated screenshot attachments in the `quality-reports` artifact:
  - `area-mercator-1920`: `playwright-report/data/4e22d514db99af41c400193e0f70054635c953ca.png` (1920×1080; desktop Chromium).
  - `route-azimuthal-1440`: `playwright-report/data/d454d1dab851b4a57d19dc8af1a52e1312c0e51e.png` (1440×900; desktop Chromium).
- Visual inspection of both desktop screenshots: the initial world map is now legible and occupies a meaningful square field, rather than the previous narrow vertical strip; Greenland/India highlights are distinguishable. The final route projection shows Tokyo, Vancouver and a visible geodesic; the azimuthal field and route remain finite.
- `tests/browser/water-prototype.spec.mjs` contains the one skipped test. It is unrelated to Project.
- STEP 01 acceptance values and remaining deferred items are recorded in `ACCEPTANCE.md` under `STEP 01 acceptance`.

### Boundaries and remaining issues

P01–P05 **PASS** for the geometry and established experiment contracts. P06, a completely unobstructed full workspace, is intentionally deferred to **STEP 05**. The edge-to-edge PLAY workspace is **STEP 04**. The initial reference screenshot was 1920×869, so same-resolution pixel comparison was **NOT RUN**; the before/after evaluation was qualitative. Desktop 125% zoom screenshots remain **NOT RUN** and belong to STEP 12.

The reports and screenshots originate from the tested implementation revision above. Subsequent commits to `ACCEPTANCE.md` and `STATUS.md` are documentation-only changes; they do not modify the tested projection code.

### Handoff — STEP 02

1. Verify this status and the acceptance matrix on `design/play-desktop-v2`.
2. Restrict STEP 02 runtime changes to Light's spectral graph and immediately related tests.
3. Replace independent before/after curve normalization with a shared domain within each trial.
4. Confirm zero-signal handling, units, mechanism dependencies, and readout descriptions.
5. Run Light browser and numerical tests. Record screenshot evidence and test status without assuming success.

## Future log format

```text
Date / step / commit:
Paths changed:
User-facing change:
Scientific/interaction implications:
Tests and viewport captures:
Not run / blocked:
Decision (DONE / IN REVIEW / BLOCKED):
Next:
```

Do not silently convert a missing test or screenshot into PASS.
