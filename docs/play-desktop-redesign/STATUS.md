# PLAY Desktop V2 — Status

Updated: 2026-10-09  
Working branch: `design/play-desktop-v2`  
Baseline source: `main@f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release marker: `20261009v102`

## Current state

**STEP 00 — DONE (documentation and visual-reference baseline).** No PLAY runtime, stylesheet or test implementation was modified. The provided six screenshots have been catalogued; repeatable browser captures and baseline test results are not yet available.

**STEP 01 — DONE.** The Project projection geometry correction passed its browser and numerical checks.

**STEP 02 — DONE.** Light's before/after spectra share a Y-axis domain and retain their numerical signal relationships.

**STEP 03 — DONE.** Shared visual tokens, representative Project/Light samples, and legacy Orient token injection passed the desktop design contract after the selected-hover correction.

**STEP 04 — DONE.** All six PLAY instruments occupy the desktop browser viewport without outer modal margins. The edge-to-edge shell, navigation, close/Escape behavior, and non-PLAY isolation passed regression.

**STEP 05 — DONE.** Project uses a desktop three-column task / map / evidence workbench. The area and route contracts passed desktop geometry, interaction and visual acceptance. **Next: STEP 06 — Light visual redesign.**

## Roadmap

| Step | Task | State |
| --- | --- | --- |
| 00 | Project audit and baseline | DONE |
| 01 | Project geometry correction | DONE |
| 02 | Light spectrum comparison correction | DONE |
| 03 | Desktop design tokens and components | DONE |
| 04 | Edge-to-edge PLAY workspace | DONE |
| 05 | Project visual redesign | DONE |
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


## STEP 02 acceptance — 2026-10-09

### Decision: DONE

**Validated implementation commit:** `118d5311cba93f08a25eaca196e753a47a523733`.  
**CI verification:** [GeoGeek Quality run 37904642575](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37904642575) — completed successfully.

### Paths changed

- `site/play/light/light-view.js` — shared chart domain; align curve's zero to SVG axis; sample nearest 550 nm; format units.
- `site/play/light/light.css` — compact sample/unit label in readout.
- `tests/light/light-spectrum.test.mjs` — shared-domain, fractional-signal, zero and invalid-input checks (four Node tests).
- `tests/browser/light-spectrum-comparison.spec.mjs` — all three mechanisms, zero baseline and unit labeling; screenshot attachments.
- `docs/play-desktop-redesign/ACCEPTANCE.md`, `STATUS.md` — acceptance and handoff only.

The Light physics formulas, water model, experiment machine, other PLAY instruments and shared layout scripts were not changed.

### Evidence

- `npm run build`, `npm run qa`, `npm run qa:links`, Lighthouse: **PASS** via GitHub Quality.
- New numerical tests: **4 PASS**, included in Static QA. Existing Light physics and state tests also pass.
- Complete Playwright report: **476 total; 475 expected passes; 1 skipped; 0 failed; 0 flaky**.
- Light Playwright tests: **8/8 PASS**, including existing and new cases across two browser projects.
- Post-fix desktop screenshots, inspected:
  - `light-sky-removed-1920` (1920×1080), `playwright-report/data/cd58582334e7bdd065ad7332520a9ae4e02687bf.png`.
  - `light-water-removed-1920` (1920×1080), `playwright-report/data/67f4bb46084c74111433ef45a01717a4915533e4.png`.
  - `light-surface-removed-1440` (1440×900), `playwright-report/data/4a6383e027e5b852be9b46c38f8114de84799de3.png`.
- These screenshots and the full Playwright report are bundled in GitHub Actions `quality-reports` artifact **11605031857**.
- P0 comparison issue closed: both curves use a common peak and nonzero attenuation remains accurately visible. Removed-path signals plot at the y=126 axis baseline rather than floating above it.
- The only skipped browser test is a pre-existing Water prototype narrow-screen case unrelated to Light.

### Remaining boundaries

L01–L04 and L06: **PASS**. L05 (panel occlusion, contrast, and layout refinement) stays **DEFERRED to STEP 06**. A 125% desktop zoom capture and global visual sign-off remain for STEP 12. STEP 02 does not assert that all scene composition issues are resolved.

The tested commit predates the documentation-only changes to `ACCEPTANCE.md` and `STATUS.md`. No additional Light runtime changes were made after the successful test run.

### STEP 03 handoff

1. Read the five project documents on `design/play-desktop-v2`.
2. Establish desktop tokens for typography, colors, spacing, scientific graphics, buttons and states without changing scientific calculations.
3. Prototype tokens using Project and Light layouts; evaluate at 1920×1080, 1440×900 and 1366×768.
4. Keep full-viewport shell changes for STEP 04, instrument-specific redesigns for STEPS 05–10, and global visual sign-off for STEP 12.
5. Record changed paths, tests, screenshots and remaining limitations here.

## STEP 03 implementation — 2026-10-09

### Scope

- `site/play/play-design-system.css` — one scoped token layer for all six PLAY shells, with Project and Light sample application.
- `site/play/play-shell.js` — register the stylesheet from legacy and V2 constructors, without modifying the viewport structure.
- `tests/browser/play-design-system.spec.mjs` — verify tokens, focus and states in Project/Light/Orient at desktop widths.
- `docs/play-desktop-redesign/DESIGN_SYSTEM.md`, `STATUS.md` and `ACCEPTANCE.md` — specification and evidence.

Runtime changes intentionally excluded: all six instrument algorithms, modal/fullpage integration, map geometry, and the other Lab sections.

### First browser report and correction

- [CI run 37907867826](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37907867826), tested commit `8030c9fbc556fd19fc40548f47e704c21c6bdabb`: browser suite **FAIL** (476 pass, 4 skip, 2 fail).
- PLAY regression: Light's selected choice border was overridden by its hovered primary-button border. The selected rule received a more specific selector in commit `5d5aef7bcdc115853e36233d15c0a6d1d05c2a54`. Retest required.
- Another failure occurred in an unchanged Pulse observation test, which exceeded the 30-second test timeout. It is recorded as a distinct suite failure; the source was not changed. A fresh run must confirm whether it recurs.
- Production build, static QA and preceding specialist browser suites completed successfully in that run.

### Accepted in completed CI

- [GeoGeek Quality run 37916400677](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37916400677) **COMPLETED / SUCCESS** for tested revision `88a87ca46dec063bac452169db9c4ebb42380321`.
- The `play-design-system.spec.mjs` desktop cases: **3/3 PASS**; three mobile cases intentionally skipped.
- Project and Light captures at 1920×1080, 1440×900 and 1366×768 were generated. Shared tokens and focus/selection states passed the computed-style assertions.
- The earlier Light selected-hover CSS specificity issue was fixed and was not reproduced. Pulse timing passed in the final full suite.
- Scope boundary: final instrument-specific contrast, annotations, overlays and task rail layout remain STEPS 05–10. **STEP 03 decision: DONE.**

### Handoff

STEP 04 will replace the outer modal presentation with a full-browser-viewport workspace. It must preserve the shared design token scope and existing Lab/Observatory behavior. Do not start until STEP 03 is accepted.


## STEP 04 acceptance — 2026-10-09

### Decision: DONE

**Validated runtime/test commit:** `88a87ca46dec063bac452169db9c4ebb42380321`.  
**Final CI:** [GeoGeek Quality run 37916400677](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37916400677), **COMPLETED / SUCCESS**.

### Changes within the step

- `site/lab-page.js` — mark the six PLAY instrument identities with `data-play-workspace="true"`; clear the attribute on exit, reusing the existing PLAY-kind declaration.
- `site/play/play-workspace.css` — desktop-only, scoped edge-to-edge Dialog, header, description/conditions, canvas and footer; maintain 0px outer radius and no outside margin.
- `site/lab.html` — load the scoped stylesheet without changing non-PLAY pages.
- `tests/browser/play-fullviewport-workspace.spec.mjs` — six instruments, four desktop viewport sizes, exit/keyboard, non-PLAY isolation, actual bounding boxes and applied stylesheet.
- `docs/play-desktop-redesign/ACCEPTANCE.md`, `STATUS.md` — actual evidence and handoff.

The Workbench uses the CSS viewport rather than the browser Fullscreen API. At desktop sizes, the native Lab Dialog remains the overlay mechanism; only its outside frame becomes edge-to-edge. The six internal science modules, source declarations and experiment state machines are untouched.

### Failure and correction history

1. First complete STEP 04 run [37913119305](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37913119305) **FAILED**. Six desktop PLAY fullscreen tests exposed Dialog width = 1600px against 1920px viewport. A separate Pulse test exceeded its timeout.
2. `site/play/play-workspace.css` received stronger, PLAY-scoped fixed viewport sizing to supersede legacy Dialog width limits (`06d1e58b294cb512b67ede7a5a092913efbf4ff8`).
3. The new browser test now checks the computed `max-width`/`max-height` and active stylesheet, in addition to geometry (`88a87ca46dec063bac452169db9c4ebb42380321`).
4. Final run 37916400677 passed the six viewport tests and the full browser suite, including Pulse. No Pulse code was changed.

### Verified evidence

- CI Build, Static QA, Links, specialist suites, full Browser/Accessibility suite and Lighthouse: **PASS**.
- Playwright report: **498 total; 486 passed; 12 skipped; 0 failed; 0 flaky**.
- `play-fullviewport-workspace.spec.mjs`: 8/8 desktop test cases passed, with six entry × four desktop viewport sizes (24 geometry checks), Close/Escape and World isolation; eight mobile cases intentionally skipped.
- `play-design-system.spec.mjs`: 3/3 desktop passed, three mobile intentionally skipped.
- `lab-fullpage-workspace.spec.mjs`: 14/14 passed across desktop/mobile, covering Observatory and Water.
- `quality-reports` artifact ID **11611212639** contains Playwright HTML and twelve full-workspace screenshot attachments:
  - `play-orient-workspace-1920`, `play-orient-workspace-1366`
  - `play-bound-workspace-1920`, `play-bound-workspace-1366`
  - `play-connect-workspace-1920`, `play-connect-workspace-1366`
  - `play-project-workspace-1920`, `play-project-workspace-1366`
  - `play-light-workspace-1920`, `play-light-workspace-1366`
  - `play-swath-workspace-1920`, `play-swath-workspace-1366`
- Desktop visual review confirms the outer floating frame no longer leaves margins. Project's corrected world map remains visible. Bound's internal decision panel still overlaps the field, and Orient's low-contrast details remain. These belong to STEP 07 and STEP 09.

The skipped cases are eleven intentionally desktop-only STEP 03–04 browser cases in the mobile project and one pre-existing Water case. This does not imply a new mobile experience was completed.

### Deferred or unverified

- Real browser zoom at 125%: **NOT RUN**; the 1536×864 CSS viewport proxy is not a substitute for verified zoom. Carry to STEP 12.
- Browser history back/forward after opening PLAY: **NOT RUN in the STEP 04 dedicated suite**; close and Escape tested. Carry explicitly into STEP 12.
- 1440×900: **PASS geometry assertions, no dedicated screenshot attachment**.
- Internal overlay occlusion, dedicated task/evidence rails and final visual polish: **DEFERRED to STEPS 05–10**.
- State-by-state identical-viewport visual regression against original STEP 00 references: **NOT RUN**, and STEP 12 remains the global sign-off.

### STEP 05 handoff — Project visual redesign

1. Read all five project documents and current branch head.
2. Preserve the verified STEP 01 map projection geometry and STEP 04 viewport bounds.
3. Reorganize Project's area/route task, controls, map and evidence without persistent overlap.
4. Verify desktop canvas geometry, prediction-before-reveal contract, geodesic rendering, keyboard/pointer behavior and scientific annotations.
5. Capture Project entry, commitment, projection, route and reveal at declared desktop viewports.
6. Update acceptance and this status with actual test evidence. Keep other five instruments unchanged unless a verified shared-shell issue requires an exception.


## STEP 05 acceptance — 2026-10-09

### Decision: DONE

**Validated implementation revision:** `e4e2165817df051c34a61463cea55eba5b5b21e9`  
**Passing CI:** [GeoGeek Quality 37925719679](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37925719679) — COMPLETED / SUCCESS.  
**Visual artifact:** `quality-reports`, artifact ID `11614926246`.

### Changes delivered

- `site/play/project/project-view.js`: area task and scientific evidence separated; true-area data introduced only after the reveal.
- `site/play/project/project-route-view.js`: route stages, legend and geodesic evidence in the independent rail.
- `site/play/project/project-v2.css`: edge-to-edge three-column Project workspace with legible mapping layers and responsive desktop rail sizing.
- `site/play/project/project.js`, `site/play/play-runtime.js`, `site/lab.html`: versioned Project-specific stylesheet/script resources; no changes to other instrument logic.
- `tests/browser/project-desktop-redesign.spec.mjs`: verifies rail boundaries, reveal progression, legend timing, keyboard input and viewport constraints.
- `docs/play-desktop-redesign/ACCEPTANCE.md`, `STATUS.md`: record final evidence and remaining release checks.

The STEP 01 projection geometry and scientific data model remain untouched. `project-morph.js`, spherical area, geodesic sampling, trace logic, and prediction state flow are unchanged.

### Test and screenshot acceptance

- Full CI at the validated revision: **504 Playwright cases; 489 passed, 15 skipped, 0 failed, 0 flaky**.
- Project desktop redesign test cases: **3/3 passed**. Dedicated mobile counterparts are intentionally skipped.
- Desktop sizes: **1920×1080, 1440×900, 1366×768**.
- Twelve screenshots verified: area prediction and revealed area, route drawing and route result, each at the three desktop sizes.
- Visual inspection: task rail, map canvas and evidence rail have no mutual overlap; the Mercator/Equal Earth and azimuthal/geodesic scenes remain legible.
- Small desktop height: India ≈3.29M km², Greenland ≈2.17M km² and the apparent-area comparison remain visible in the 1366×768 result without scrolling.
- Hover, keyboard focus, pointer drawing, slider progression and pre-commit truth hiding are covered by existing and new browser tests.
- `ACCEPTANCE.md` contains the per-contract evidence for P01–P06 and explicit deferrals.

### Post-acceptance CI note

A **later, documentation-only** branch commit `dad4c7d8a403ffbf435eba036c273b7a3da9eba5` triggered [run 37928388374](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37928388374), which reported **487 passed, 15 skipped, 1 failed**. The failure was in the pre-existing `play-fullviewport-workspace.spec.mjs` World isolation/close scenario: the World Dialog retained its `open` attribute after the close button click. No Project-specific test failed, and the branch comparison with the passing implementation showed only `ACCEPTANCE.md` changed. This suite failure is not represented as passing; review it during cross-instrument release regression at STEP 12, or earlier if it reproduces in other steps.

### Remaining release requirements

- True browser 125% zoom: **NOT RUN**. A smaller CSS viewport is not equivalent.
- Identical-state pixel-level comparison against STEP 00 source captures: **NOT RUN**.
- Other PLAY instrument visual redesigns: **DEFERRED to STEPS 06–10**.
- Non-PLAY close reliability regression: **OPEN**, as noted above.

### STEP 06 handoff — Light visual redesign

1. Read all five project documents and the current branch HEAD.
2. Preserve STEP 02 shared spectral Y scale, actual SVG zero baseline, the wavelength/units annotation and three mechanism states.
3. Organize Light scene, scientific path legend, before/after spectrum, task controls and measurement evidence as a desktop workspace without persistent overlap.
4. Keep Light visual changes scoped to the Light instrument. Do not alter Project's completed visual layout or other PLAY physics.
5. Verify guided progression, numerical scale, pointer/keyboard controls and model limitations at 1920×1080, 1440×900 and 1366×768.
6. Record screenshot evidence and test outcomes in `ACCEPTANCE.md` and `STATUS.md` before closing STEP 06.

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
