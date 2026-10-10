# PLAY Desktop V2 — Status

Updated: 2026-10-10  
Working branch: `design/play-desktop-v2`  
Baseline source: `main@f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release marker: `20261009v102`

## Current state

**STEP 00 — DONE (documentation and visual-reference baseline).** No PLAY runtime, stylesheet or test implementation was modified. The provided six screenshots have been catalogued; repeatable browser captures and baseline test results are not yet available.

**STEP 01 — DONE.** The Project projection geometry correction passed its browser and numerical checks.

**STEP 02 — DONE.** Light's before/after spectra share a Y-axis domain and retain their numerical signal relationships.

**STEP 03 — DONE.** Shared visual tokens, representative Project/Light samples, and legacy Orient token injection passed the desktop design contract after the selected-hover correction.

**STEP 04 — DONE.** All six PLAY instruments occupy the desktop browser viewport without outer modal margins. The edge-to-edge shell, navigation, close/Escape behavior, and non-PLAY isolation passed regression.

**STEP 05 — DONE.** Project uses a desktop three-column task / map / evidence workbench. The area and route contracts passed desktop geometry, interaction and visual acceptance.

**STEP 06 — DONE.** Light uses separate task, conceptual light scene and spectral-evidence rails. Desktop pointer/keyboard and the existing scientific contracts passed full CI and screenshot acceptance.

**STEP 07 — DONE.** Bound uses separate task, square risk field, and numeric constraint/evidence rails. Geometry, drawing, observation-change, KEEP/REDRAW, desktop screenshots and full quality suite passed.

**STEP 08 — DONE.** Swath separates predictions/design controls, sensor geometry and quantitative evidence. All three one-variable experiments, original/current footprints, geometric sampling distinctions, free-design controls and full browser quality suite passed.

**STEP 09 — DONE.** Orient now uses independent desktop estimation, reference-centered globe, and conditions/residual rails; confidence-gated truth, Primer, pointer/keyboard, responsive fallback, five-relation Trace and full quality CI passed.

**STEP 10 — DONE.** Connect now has task, geographic network, and numerical evidence rails. The border→1,200 km rule shift keeps old/new routes and edge differences distinguishable, preserves invalid-edge feedback and exact optimal hop counts; three desktop viewports, responsive fallback and full CI passed. **STEP 11 — DONE.** Shared six-instrument lifecycle and real Light/Swath cross-instrument Spatial Trace evidence, persistence and storage boundaries passed the browser suite. All six reopened desktop captures were inspected; full Quality CI passed. **Next: STEP 12 — Release regression and visual sign-off.**

**STEP 12 — DONE (predeployment release regression and visual sign-off).** Final merged release candidate `4c4f9fa` passed the full GeoGeek Quality workflow [38050717187](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38050717187). Six PLAY Back/Forward flows, native 125% tab zoom, three-size 18-workspace geometry, 42 screenshots and scientific regression coverage were verified. The browser suite recorded 533 first-pass expected tests, 46 intentional skips, 1 Light viewport test that passed on retry, and 0 unrecovered failures. **Production merge/deployment/live smoke remain separate and NOT RUN.**

## Roadmap

| Step | Task | State |
| --- | --- | --- |
| 00 | Project audit and baseline | DONE |
| 01 | Project geometry correction | DONE |
| 02 | Light spectrum comparison correction | DONE |
| 03 | Desktop design tokens and components | DONE |
| 04 | Edge-to-edge PLAY workspace | DONE |
| 05 | Project visual redesign | DONE |
| 06 | Light visual redesign | DONE |
| 07 | Bound visual redesign | DONE |
| 08 | Swath visual redesign | DONE |
| 09 | Orient visual redesign | DONE |
| 10 | Connect visual redesign | DONE |
| 11 | Shared interaction and Spatial Trace | DONE |
| 12 | Release regression and visual sign-off | DONE |

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

## STEP 06 acceptance — 2026-10-10

### Decision: DONE

**Validated runtime/test commit:** `626c80b109bbca0d6e79e00e229b404b3a0e50ea`  
**Passing CI:** [GeoGeek Quality 38012588526](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38012588526) — COMPLETED / SUCCESS.  
**Artifact:** [quality-reports 11655492421](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38012588526/artifacts/11655492421).

### Implemented changes

- `site/play/light/light-view.js`: reuse the existing conceptual scene and chart nodes; place the path legend and spectral chart into the independent evidence rail at desktop widths. Restore the legacy placement below 1024 CSS px. Give path states explicit PRESENT/REMOVED text; detach the responsive listener on unmount.
- `site/play/light/light-desktop.css`: desktop-only three-column task / central scene / evidence composition; ensure no panel covers the scene. Set clear reading hierarchy for labels, chart, status and model limits.
- `site/play/light/light.js`, `site/play/play-runtime.js`, `site/lab.html`: register/version the Light presentation files and perform view cleanup.
- `tests/browser/light-desktop-redesign.spec.mjs`: three focused desktop cases for evidence separation, complete three-mechanism progression, keyboard/mouse controls, hover stability, and desktop/narrow breakpoint movement.
- First implementation commit `f9ad588aa0b2085657b88cc163a1a02beebaf9c2` exposed a compatibility regression in the existing Light selected-choice browser test at 1366×768: the BLACK button's hover translation destabilized Playwright mouse clicks. Corrected the Light-scoped desktop hover transform and added a repeatable mouse-hover/click assertion in `626c80b109bbca0d6e79e00e229b404b3a0e50ea`. No global or non-PLAY style was changed.

### Scientific and interaction boundaries

`light-physics.js`, `light-experiments.js`, `light-content.js`, the Water optical model, numerical spectral domain, fixed zero baseline, mechanism order, prediction-before-reveal, Trace and source declarations remain unchanged. Scene paths are illustrative; atmospheric and surface spectral curves are teaching signals. The water experiment retains model-derived Rrs with `sr⁻¹` units.

### Verification

- Final CI: **510 Playwright cases; 492 passed, 18 skipped, 0 failed**. The 18 skips are not passes; desktop-only cases are excluded from the mobile project and an existing Water skip remains.
- Dedicated Light redesign cases: **3/3 desktop PASS**; dedicated mobile counterparts skipped by design.
- Previous existing `play-design-system.spec.mjs` Light choice mouse-click regression: **PASS** on final CI. Keyboard selection, commit, reveal, next experiment, and replay also passed.
- Build, Static QA, internal links, Lighthouse, Water, Orient, Pulse and browser accessibility: **PASS** on the final CI.
- Screenshots: 1920×1080, 1440×900 and 1366×768; Light initial prediction, removed sky-scattering and removed water backscatter for each viewport; 1366×768 surface-reflection reveal. Captures inspected; task, scene and evidence zones remain mutually unobstructed, with the 550 nm readings and model limits visible in the 1366×768 result.
- GitHub `quality-reports` artifact 11655492421 contains the reproducible attachments. This documentation-only closure commit intentionally does not alter the validated runtime commit.

### Known deferrals and risk

- Actual **125% native browser zoom: NOT RUN**; a CSS viewport does not prove browser zoom. Keep for STEP 12.
- Browser history back/forward after PLAY activation: **NOT RUN as a dedicated STEP 06 case**; STEP 12.
- Pixel-identical comparison to STEP 00's different-resolution manual reference: **NOT RUN**.
- Past intermittent World dialog-close failure at `dad4c7d`: not reproduced in the successful final run. Do not claim it can never recur; cross-instrument reliability remains an explicit STEP 12 regression target.
- Other instruments' internal visual redesigns remain STEPS 07–10; no release/merge to `main` has occurred.

### STEP 07 handoff — Bound visual redesign

1. Read the five redesign documents and check the latest branch head and actual CI SHA.
2. Preserve Bound risk sampling, field source, polygon validation, target coverage/area constraints, KEEP/REDRAW semantics and Spatial Trace.
3. Give the risk field an unobstructed dominant center canvas, with a task/decision rail and a separate numerical evidence/constraints rail.
4. Verify full polygon and sampled field visibility before/after the 96×96 → 24×24 observation change; differentiate original/revised lines without relying on color alone.
5. Run targeted Node/browser tests, regression and 1920×1080 / 1440×900 / 1366×768 screenshot checks. Explicitly record unavailable tests.
6. Update ACCEPTANCE and STATUS after evidence verification; do not modify other PLAY scientific models.


## STEP 07 acceptance — 2026-10-10

### Decision: DONE

**Validated implementation commit:** `de24b1fc6f0ebfa77141d84cc9304fa4b6e42911`.  
**Final CI:** [GeoGeek Quality 38016447057](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057) — COMPLETED / SUCCESS.  
**Quality report and screenshots:** [artifact 11656803261](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057/artifacts/11656803261).  
**Browser suite:** 516 cases; **495 passed / 21 skipped / 0 failures**. The 21 skips are not passes.

### Delivered

- `site/play/bound/bound-desktop.css`: separate desktop task rail, dominant unobstructed square risk field, evidence/constraints rail and balanced KEEP/REDRAW buttons. Distinct orange solid active polygon and pale dashed original polygon; high-contrast labels for observation, threshold, metrics and model limits.
- `site/play/bound/bound.js`: presentation-only replication of current coverage/area measurements from the existing panel into the desktop evidence rail; responsive narrow display keeps the original measurements. No risk, population, polygon, boundary evaluation or Trace model changes. Stage annotations clarify that risk is synthetic/modelled and the keyboard/pointer affordances.
- `site/play/play-runtime.js` and `site/lab.html`: versioned Bound presentation resources.
- `tests/browser/bound-desktop-redesign.spec.mjs`: three dedicated desktop browser tests at 1920×1080, 1440×900, 1366×768, including no-overlap geometry, coverage/area constraints, 96×96 → 24×24 resampling, KEEP, REDRAW, old/new line styles, pointer polygon, guided keyboard region, arrow nudge and narrow-width recovery.

### CI history and visual correction

- Initial implementation [`19d6323`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/19d6323e3f1ea7fef85ffa67ed933efbcaacf307): [CI 38014889839](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38014889839), **491 passed / 21 skipped / 4 failed**. All three new Bound tests failed a real, narrowly missed top-clearance requirement (0.3–2.7 CSS px). Another failure was an unrelated Pulse Round 4 timeout. Screenshots also showed the compact evidence legend near the fold.
- Corrected in [`de24b1f`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/de24b1fc6f0ebfa77141d84cc9304fa4b6e42911): reduced the square field dimension to leave meaningful vertical clearance; condensed short-viewport evidence spacing. Did **not** relax the geometry tests or change the scientific semantics.
- Final CI [38016447057](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38016447057) passed all three Bound tests and the prior Pulse test; build, Static QA, internal links, Water, Orient, Pulse, accessibility and Lighthouse all passed. Total: 495 passed, 21 intentionally skipped, 0 failed.

### Screenshots and review

- CI evidence includes **13 Bound desktop PNGs**: initial drawing, guided polygon and observation-change decision × 1920×1080, 1440×900, 1366×768 (9); plus 1366×768 keep result, two-line redraw, redraw result, and actual mouse-drawn polygon (4).
- All 13 were extracted and visually checked, particularly the 1366×768 decision and two-line redraw states. The stage and full polygon do not overlap either rail; the right-hand coverage, target thresholds, changed-class readout and solid/dashed legend remain visible without downward scrolling at 1366×768. Drawing, KEEP and REDRAW controls remain readable and in the task rail.
- The tested code commit is `de24b1fc6f0ebfa77141d84cc9304fa4b6e42911`. A subsequent documentation-only closure commit does not replace that verified SHA or imply a new runtime CI.

### Explicitly deferred

- Native **125% browser zoom: NOT RUN**; CSS viewport resizing is not equivalent. STEP 12.
- Same-state identical-viewport pixel diff to the original 1920×869 manual reference: **NOT RUN**. The original image was taken before the full-workspace shell and has a different view/state.
- Dedicated history back/forward and final release-wide cross-instrument signoff: **NOT RUN**; STEP 12.
- Changes to `bound-field.js`, sampling, threshold, metrics, source-model claims, risk classification, polygon geometry and Spatial Trace: **NONE**.
- No merge to `main` or production release was made.

### STEP 08 handoff — Swath visual redesign

Read the five STEP 00 documents and current branch. Preserve swath geometry, sensor model, three one-variable experiment states, previous/current metrics, limits and Trace. Give the sensor geometry central priority with separate task and numeric comparison/legend rails. Distinguish swath coverage, ground sampling, detector samples and optical resolution; keep the Earth illustration explicitly not altitude-to-scale. Validate desktop 1920×1080, 1440×900, 1366×768 and mouse/keyboard interactions with screenshots and actual CI; update acceptance documents only after evidence review.

## STEP 08 acceptance — 2026-10-10

### Decision: DONE

**Validated runtime/test commit:** `fd3ee3cd41f7b76757336d1bf8613ce04004a6e5`.  
**Final GitHub Actions quality run:** [38020517684, attempt 2](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/attempts/2) — **COMPLETED / SUCCESS** on the same code SHA.  
**Reproducible final screenshot/test artifact:** [quality-reports 11660914376](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/artifacts/11660914376).  
**Full browser suite:** **522 total; 498 passed, 24 skipped, zero failures, zero flaky**. Skipped cases are not counted as passed.

### Scope and files changed

- `site/play/swath/swath-view.js`: added a desktop evidence summary sourced directly from the existing physics comparison, only after the user has committed and revealed the change. Current scalar measurements are moved as actual DOM nodes between the desktop evidence rail and narrow-screen original position. Added independent SVG-geometry captions and a comparison line-style key. Responsive listener is removed on unmount. No changes to sensor calculations or the three guided experiment state transitions.
- `site/play/swath/swath-desktop.css`: scoped three-column task, schematic sensor geometry and numerical evidence layout; stronger previous dashed vs current solid footprint, visible ground sample notations and the curvature-aware/not-to-scale model annotation. Small desktop sizes allow auxiliary rail scrolling rather than covering geometry.
- `site/play/swath/swath.js`, `site/play/play-runtime.js`, `site/lab.html`: Swath stylesheet registration, view listener cleanup and versioned lazy-loading URLs.
- `tests/browser/swath-desktop-redesign.spec.mjs`: three desktop-focused cases cover 1920×1080 / 1440×900 / 1366×768, baseline-first commitment, FOV/altitude/sample-count perturbations, previous/current geometry and quantitative comparisons, free-design keyboard focus/slider changes, reset/replay and 920px breakpoint restoration.

### Scientific and interaction preservation

- No changes to `swath-physics.js`, `swath-experiments.js`, `swath-content.js` or `play-trace.js`. The before/after swath and nadir GSD ratios come from `physics.compare()`; `physics.compute()` remains the source for the current four metrics.
- All three one-variable experiments retain their authored conditions; the third detector-only experiment shows unchanged swath width while nadir GSD decreases. Numeric future values stay concealed in question/committed states; previous/current comparison appears after reveal.
- The screen states that the Earth and sensor height are schematic/not altitude-to-scale, that displayed sample cells are illustrative, and that GSD is a geometric footprint rather than full optical resolution (MTF, SNR and revisit not modeled). No scoreboard or unsupported optical inference was added.

### CI history / regression disposition

1. [`c7fab34`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/c7fab348e2f044dbc85959599f035eec0e041dce) — [CI 38018960417](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38018960417): **496 passed / 24 skipped / 2 failed**. One failure was the new free-design test requesting detector slider `12000` even though its native `min=512, step=128` snaps to `12032`; one unrelated Pulse Round 4 axe scan timed out.
2. [`fd3ee3c`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/fd3ee3cd41f7b76757336d1bf8613ce04004a6e5) corrected the test to use the valid native slider increment and used screenshot evidence to add current-solid/previous-dashed labels directly in the central geometry. Short-height duplicate explanations in the evidence rail were condensed; physics and experiment logic were not changed.
3. [CI 38020517684, attempt 1](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/attempts/1): **497 passed / 24 skipped / 1 failed**. All Swath-focused and pre-existing Swath tests passed; the only failure was the same unmodified Pulse Round 4 accessibility scan timeout. Do not call this attempt a pass.
4. [CI 38020517684, attempt 2](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38020517684/attempts/2): **498 passed / 24 skipped / 0 failed**, GitHub job/workflow **SUCCESS**. The previously failing Pulse case passed without any Pulse code changes. Build, Static QA, link checks, independent Water/Orient/Pulse suites, desktop/mobile browser/accessibility and Lighthouse all passed.

### Desktop screenshot inspection

- Final attempt 2 artifact **11660914376** contains **11 Swath redesign PNG attachments**. Screenshot names are `swath-question-` and `swath-revealed-` at 1920, 1440 and 1366 (6), plus `swath-experiment-[1-3]-1366` (3), `swath-design-1366` and `swath-design-changed-1366` (2). All 11 image paths were checked in the final artifact; same-SHA first-attempt captures were extracted and inspected in a contact sheet and full-resolution 1366px reveal, detector-only and free-design states.
- Sensor cone, Earth surface and both footprints stay unobstructed by task/measurement rails at all three desktop viewports. The reveal state shows old dashed/new solid geometry and explicit `BEFORE / AFTER` measurements with units. The 1366px result shows the core swath/GSD deltas and central footprint key without scrolling; auxiliary rail explanations and free-design RESET/REPLAY may require their permitted rail scroll at reduced desktop heights.
- The narrow 920px view retains the original metric overlay; resizing back to desktop moves the *same DOM node* to the evidence rail and keeps measurements current. Mouse/pointer buttons, keyboard sliders, reset and replay passed automated assertions.
- Captures are responsive visual tests, not a pixel-identical baseline comparison. No true browser-zoom test was performed.

### Explicit remaining risks / unrun checks

- Native **125% browser zoom: NOT RUN**; required at STEP 12, not inferred from CSS viewport sizes.
- Dedicated browser history forward/back and six-instrument final visual signoff: **NOT RUN**; STEP 12.
- Same-state pixel-diff against the original 1920×869 Swath screenshot: **NOT RUN**, because the original size/state differs.
- An intermittent **Pulse Round 4 accessibility scan timeout** occurred during earlier runs but did not reproduce in passing final attempt 2; do not infer a permanent reliability fix. Continue observing this in STEP 12.
- Swath science models, instrument collection metadata, non-PLAY CSS and shared algorithms untouched. No merge to `main` or production release.

### STEP 09 handoff — Orient visual redesign

Read the five master redesign documents and this log; inspect current branch, Orient implementation and test contracts. Make the reference-centered globe dominant while separating estimation/commit controls and numerical conditions/residual evidence; preserve primer, confidence gating, pointer/keyboard bearing-distance estimates, skipped unfamiliar relations, session recovery, Spatial Trace and truth hidden before commitment. Verify 1920×1080, 1440×900, 1366×768 desktop geometry, interactions, readable reference/residual notation, full CI, and screenshots before closing STEP 09. Do not change the Orient geometry or scientific metric semantics merely for visual appearance.

## STEP 09 acceptance — 2026-10-10

### Decision: DONE

**Validated commit:** `fcc65925eeaa486eedbcb3f7f26fc9a45a16a4b4` (Orient runtime change first committed at `08f552f`; `d525301` updates exact asset-version gates; final `fcc6592` only updates the superseded presentation test).  
**Final full CI:** [GeoGeek Quality 38035318338](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38035318338) — **COMPLETED / SUCCESS** on `fcc65925eeaa486eedbcb3f7f26fc9a45a16a4b4`.  
**Final Playwright/Lighthouse evidence artifact:** [quality-reports 11664282541](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38035318338/artifacts/11664282541).  
**Browser suite:** **528 total, 501 passed, 27 skipped, 0 failed**; skips are not passes.

### Scope

- `site/play/orient/orient.js`: registers `orient-desktop.css`, adds a noninteractive header and phase-gated field legend. No estimation, geodesy, projection, residual, session-composer, storage or Trace logic changed.
- `site/play/orient/orient-desktop.css`: independent left estimation/confidence/actions rail; unobstructed, reference-centered azimuthal equidistant globe; right conditions and residual-evidence rail. Enhanced coast/rings, reference markers, labels and spatial error styling. Dashed radial residual, pale judgment vector and warm truth vector are distinguishable by both line style and text. Keyboard focus keeps a visible outline. The existing narrow view is preserved below 1024px; the five-relation Trace retains its separate full-map-plus-sidebar report.
- `site/play/play-runtime.js`, `site/lab.html`: versioned Orient lazy entry and runtime URL, with no shared algorithm changes.
- `.github/workflows/quality.yml` and `.github/workflows/pages.yml`: updated only the exact `orient.js` cache-version assertion to `20261010-step09a`; the remaining release-asset checks remain unchanged. Quality checked; an independent Pages deployment was **not run** on this design branch.
- `tests/browser/orient-desktop-redesign.spec.mjs`: three desktop-specific automated suites for initial/ready/revealed × 1920×1080, 1440×900, 1366×768, pointer and keyboard input, confidence gate, primer, five committed relations and Trace, and 920px responsive fallback.
- `tests/browser/play-v2-presentation.spec.mjs`: replaces the superseded full-shell/absolute-overlay demand with stricter unoccluded three-column geometry, hidden precommit truth and narrow-screen legacy behavior. No scientific tests were weakened.

### Verified behavior and visual evidence

- O01: the entire globe remains between the side rails at all three desktop viewports; reference point, graticule/rings where enabled and shoreline stay legible. The keyboard-focused SVG outline is intentional accessibility feedback, not an annotation on the map.
- O02: true pointer dragging, keyboard arrows, active fine controls and focus work without changing the underlying projection and bearing/distance computation.
- O03: COMMIT remains disabled until a spatial estimate is made **and** confidence LOW / MEDIUM / HIGH is selected.
- O04: before commit no target, truth line, feedback geometry or corresponding true/residual legend is exposed; after commit the real relation and estimated relation are distinguishable.
- O05: distance percentage and bearing degrees are distinct, with radial/angle residual geometry; confidence was already chosen before reveal; no score or unsupported precision was introduced.
- O06: Primer unrecorded input, unfamiliar-relation replacement, reloaded/saved session behavior and five-relation Spatial Trace remain covered by existing regression suites plus STEP 09 browser tests. Trace report stays readable and is explicitly not a leaderboard.
- The **final artifact 11664282541** includes **12 new Orient PNG captures**, extracted and checked: `orient-judge-1920`, `orient-ready-1920`, `orient-reveal-1920`, equivalent three states at 1440 and 1366 (9 total), `orient-primer-1366`, `orient-pointer-compare-1366`, `orient-trace-1366`. The final report also contains two `play-orient-workspace-` PNG attachments from other tests. All 12 new screenshots were inspected together in a contact sheet; the full-size 1366 judge/reveal images were examined for readable numerical and geographic annotation and nonoverlap.

### CI history / isolated failures

1. [`08f552f`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/08f552ff499287debf3862ae1a94afd713ea5fad), [Quality 38032838385](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38032838385): failed **before browser tests** because a workflow grep required the former Orient URL cache marker `20261003f`; the build itself completed.
2. [`d525301`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/d525301d40e6ad3a6d35332c3993779502f57e6f), [Quality 38033119551](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38033119551): **499 passed / 27 skipped / 2 failed**. All three new Orient tests passed. The old `play-v2-presentation.spec.mjs` required a now-invalid absolute console and a map at 90% of the shell, contrary to the accepted STEP 09 three-column geometry; the unrelated, pre-existing Pulse Round 4 accessibility scan also timed out.
3. [`fcc6592`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/fcc65925eeaa486eedbcb3f7f26fc9a45a16a4b4) updated the superseded layout test to assert separate rails, a fully contained sphere, no pre-commit truth, and mobile fallback. [Quality 38035318338](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38035318338): **501 passed / 27 skipped / 0 failed**. Old-and-new Orient tests and the previously flaky Pulse case passed without modifying Pulse; Lighthouse and all CI gates passed. A passing Pulse run is not proof that the intermittent timeout is permanently fixed.

### Explicitly NOT RUN / deferred

- Native **125% browser zoom** at desktop viewport sizes: **NOT RUN**, STEP 12 (CSS resizing is not equivalent).
- Dedicated back/forward browser history and final cross-instrument visual signoff: **NOT RUN**, STEP 12. Ordinary reload/session recovery **was tested**.
- Pixel-exact before/after match with original 1920×869 manual reference: **NOT RUN**, different app state and viewport.
- A standalone Pages workflow/deployment of the design branch: **NOT RUN**. Workflow version guard was updated, but production release is out of scope.
- Changes to `orient-geometry.js`, `orient-metrics.js`, `orient-state.js`, `orient-session.js`, `orient-storage.js`, `orient-content.js`, feedback semantics, Trace schema or geographical algorithms: **NONE**.
- No merge to `main`.

### STEP 10 handoff — Connect visual redesign

Read the five redesign docs and current branch. Separate geographic adjacency map from task and rule-specific numerical evidence. Preserve shared-border vs 1200 km rules, start/current/goal/neighbor/locked route states, invalid-edge explanations, adaptive scenarios, old/new route comparison, exact hop counts, optimal-hop assessment and Spatial Trace. Do not alter graph topology or routing algorithms for visual effect. Validate 1920×1080, 1440×900, 1366×768, pointer/keyboard controls, narrow fallback, full CI and screenshot evidence. Record unrun 125% native zoom and cross-instrument release checks for STEP 12.

## STEP 10 acceptance — 2026-10-10

### Decision: DONE

**Validated implementation/test commit:** `272a11a43531b2c84b78be57a15841fa2afee8ef`.  
**Final GitHub Actions run:** [GeoGeek Quality 38040281656](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38040281656) — **COMPLETED / SUCCESS** for the exact validated SHA.  
**Final quality and screenshot artifact:** [quality-reports 11666246118](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38040281656/artifacts/11666246118).  
**Playwright browser total:** **534 cases / 504 passed / 30 skipped / 0 failed**. Skipped cases are not counted as passed. Build, static/link QA, Water/Orient/Pulse/other module checks, browser accessibility and Lighthouse passed.

### Changed paths and ownership boundary

- `site/play/connect/connect-view.js`: adds noninteractive map heading, line-type legend and a right-side evidence rail derived solely from the existing Connect snapshot and graph API. The old locked path is visible as a dashed ghost throughout rule transformation, adaptation and final result; the new path is solid, with new edges distinguished from removed edges by line style. Displays original/current route codes, current rule explanation, old-route validity, exact network edge additions/removals, before→after hops and graph-derived optimal hops. The primary numerical conclusion appears near the top of the evidence rail. Invalid edges produce an explicit, accessible reason and explicitly state that the route is unchanged.
- `site/play/connect/connect-desktop.css`: scoped three-column workspace, geographic network and node-state styling, link/route legends, independently scrollable instruction and evidence rails. An explicit reduced-motion override prevents shared route-draw dash offsets from hiding actual route geometry.
- `site/play/connect/connect.js`: registers Connect-only desktop stylesheet and versioned asset; no changes to graph computation or game state.
- `site/play/play-runtime.js`, `site/lab.html`: versioned Connect view and runtime URLs to avoid stale client caching.
- `tests/browser/connect-desktop-redesign.spec.mjs`: three focused suites for desktop 1920×1080, 1440×900, 1366×768; valid route choice, 4-hop lock, rule shift, persistent dashed original, new graph connections, three-hop adaptation, exact minimum-hop result, invalid-edge state preservation, keyboard node selection, Undo/Replay and 920px responsive fallback. Added checks that reduced-motion users still see a painted current route and that the before/after result is visible at 1366×768.
- `site/play/connect/connect-content.js`, `connect-graph.js`, `connect-game.js`, `site/play/play-trace.js`: **unchanged**. The Portugal-to-Poland scenario and shortest path algorithms remain owned by these modules.

### Scientific meaning and observed values

- Shared-land-border graph vs great-circle distance **≤1,200 km** remain distinct. The map is a schematic geospatial network, not a claim about navigable travel routes.
- Original valid path `PT → ES → FR → DE → PL` has **4 hops**. After the distance rule, a route `PT → FR → DE → PL` has **3 hops**, and the existing breadth-first shortest-path evaluator independently reports **3 optimal hops**. Both paths are retained with solid/dashed coding after final commitment.
- In this authored Europe scenario, all original shared land-border edges remain allowed by the 1,200 km distance threshold, so **there are added links and zero removed links**. The UI reports the actual `+`/ `−` counts from the original and changed graph edge sets; it does not invent removed connections to satisfy a visual narrative.
- Source, destination, route member, current country and available next neighbors have differentiated shape/ring/fill/dash states; keyboard focus remains visible.
- An invalid `PT → DE` first step under the land-border rule yields an invalid dashed segment and accessible text explaining that the route remains unchanged. Hover, pointer and Enter/Space graph navigation preserve original route state semantics.
- Original `RULE` and `HOPS` HUD contracts are retained to avoid silently invalidating the pre-existing Connect spatial reasoning tests and users' numerical expectations.
- The final result shows 4→3 hops above the 1366px evidence-rail fold; supporting edge/route details can scroll independently, leaving the network unobstructed.

### Verification and screenshot inspection

- Browser run [38040281656](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38040281656) passed **all 504 non-skipped browser tests** and all other quality steps, including Lighthouse. All three new Connect desktop tests and the prior Connect spatial-reasoning/keyboard/pointer tests passed.
- Artifact **11666246118** was downloaded and unpacked. The nested Playwright report identifies **13 Connect PNG attachments** with verified binary paths: four states (`connect-initial`, `connect-ready`, `connect-rule-shift`, `connect-result`) at 1920×1080, 1440×900 and 1366×768 (**12 total**) plus `connect-invalid-1366`. All 13 were reviewed in a contact sheet, and the full-size 1366 result screenshot was inspected for readable primary comparison, unobstructed map, old ghost versus new route and nontrivial current rule network.
- The same final SHA includes automatic visible-color/line-style CSS assertions that the reduced-motion current path is painted and that before/after hop comparison is in the visible portion of the right rail at 1366×768.
- Responsive 920px fallback, keyboard focus, invalid input, Undo, route lock, adaptive route, replay and Trace integration remain covered. The 920px breakpoint was automatically checked, not given a new standalone screenshot.

### CI history and regression interpretation

1. [`db4c541`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/db4c54180e555850b4fa724e1cb9f266e2b76c73) introduced the desktop workbench; its preliminary CI was cancelled when the next commit superseded it.
2. [`896121a`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/896121aa59ca58535e887da530aedf987bd7d406) restored the original RULE/HOPS visible contract. [CI 38037510492](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38037510492) reported **500 passed / 30 skipped / 3 failed**, all three failures being *new* Connect tests using the no-longer-unique `.connect-v2-stat` locator. Existing Connect graph/pointer/keyboard tests passed.
3. [`9085647`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/9085647637bf501c189d0e021a3a8729cc45bbcb) corrected new test selectors to the specific HOPS item. [CI 38038546187](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38038546187) succeeded with **504 passed / 30 skipped / zero failed**.
4. [`272a11a`](https://github.com/GeoGeekLab/GeoGeekLab.github.io/commit/272a11a43531b2c84b78be57a15841fa2afee8ef) improved reduced-motion route paint and elevated the result's numerical evidence. It added strict visual checks instead of relaxing assertions. [CI 38040281656](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38040281656) again succeeded with **504 passed / 30 skipped / zero failed**; final screenshots were inspected from that exact code version.

### Explicit remaining risks and unrun checks

- Native browser **125% zoom: NOT RUN** (must be checked in STEP 12; CSS viewport scaling is not a substitute).
- Dedicated browser history navigation and integrated six-instrument signoff: **NOT RUN**, deferred to STEP 12.
- Pixel-for-pixel reference diff against STEP 00 screenshot 1920×869: **NOT RUN**; state and viewport differ. Geometry and information hierarchy were reviewed visually instead.
- Separate GitHub Pages design-branch deployment: **NOT RUN**. Branch remains isolated from `main`.
- Historical intermittent Pulse Round 4 timeout: final STEP 10 run passed, but the prior timeout is not proven permanently fixed.

### STEP 11 handoff — Shared interaction and Spatial Trace

Read the five redesign documents and updated acceptance record. Validate coherent progression across all six instruments, common escape/close/reopen behavior, deterministic state cleanup, keyboard/visible-focus accessibility, dark high-contrast numeric evidence, residual/trace semantics and the shared Spatial Trace schema. Maintain domain-layer numerical correctness and completed STEP 05–10 desktop layouts. Add targeted browser scenarios for release-level navigation and Trace aggregation, capture actual screenshots, run full CI and reserve native 125% zoom and final multi-instrument acceptance for STEP 12. Do not merge into `main` without explicit user direction.


## STEP 11 implementation — 2026-10-10

### Decision: DONE — CI and screenshot acceptance verified

**Runtime behavior:** no production code changed. The shared Trace store and six instrument state machines are preserved.

**Tests added:** `tests/browser/play-shared-lifecycle-trace.spec.mjs`.

- `98c3745e0c78d0bcd572516073b8fd036cb6ea49`: six desktop 1366×768 close/Escape/reopen contracts; screenshot attachment per reopened instrument; shared Trace API's ordering, per-play filtering and clear operation.
- `2c569f2418ff6bf7ed50ee2bcb8a04cc292eb0cd`: actual Light and Swath reveal flows across the same Lab page; no outcome record before changing the condition; distinct live evidence records after reveal; persistence across reload; recovery from corrupted storage; 120-record retention and filtering boundaries.

**Verified implementation/test SHA:** `2c569f2418ff6bf7ed50ee2bcb8a04cc292eb0cd`. **Final CI:** [GeoGeek Quality 38043443219](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38043443219) — COMPLETED / SUCCESS. The quality job completed every required build, static QA, internal links, specialist Water/Orient/Pulse, complete desktop/mobile browser, accessibility and Lighthouse step successfully. The embedded Playwright report records **552 total / 515 passed / 37 skipped / zero failed / zero flaky** (skips are not passes). Dedicated `play-shared-lifecycle-trace.spec.mjs`: **18 total / 11 passed / 7 intentionally skipped on mobile / zero failed**. The `test-results/.last-run.json` status is `passed`, with no failed tests.

**Visual evidence:** [quality-reports artifact 11666841773](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38043443219/artifacts/11666841773) was downloaded; its embedded report maps **six 1366×768 screenshots** to `step11-{orient,bound,connect,project,light,swath}-reopen-1366`. Their actual PNG binaries and dimensions were verified. A six-up contact sheet was inspected: all six reopened workspaces present separate task / spatial field / evidence regions where intended, readable major headings and controls, and no apparent persistent overlay obscuring the central field. The six images are specifically reopen states, not substitutes for final all-state visual sign-off.

**Risks and boundaries:**

- Browser history back/forward and native 125% zoom remain STEP 12. CSS viewport emulation is not equivalent to native zoom.
- The previous repeated Pulse Round 4 timeout is intermittent; a single passing run will not prove a permanent fix.
- A final six-instrument signoff and separate Pages deployment are not claimed. The design branch remains isolated from `main`.
- Current STEP 11 tests cover live Light/Swath evidence and shared lifetime across all six; full module-specific Trace values remain protected by prior dedicated regressions, not by this new cross-module test alone.


**STEP 11 handoff to STEP 12:** Validate native 125% desktop browser zoom, dedicated browser history back/forward behavior, the final cross-instrument state/visual matrix, and reconciliation of `main` with the design branch. Preserve main-side `site/lab.html` fixes and the published Origin Chinese narrative check in `.github/workflows/pages.yml`. No merge, deploy or production release was performed during STEP 11.

### STEP 12 read-only preflight risks discovered during STEP 11

- Remote compare: `main...design/play-desktop-v2` has **73 branch-only commits and 14 main-only commits** as checked on 2026-10-10. Merge base is `f453201c1fbae979b2f3369fedb01c4894653067`. These counts are point-in-time, not a merge approval.
- Both sides modified `site/lab.html` and `.github/workflows/pages.yml`. In particular, current `main` includes `app.js?v=20261009static1` and `lab-fullpage.js?v=20261009navfix1`, while the design branch includes earlier versions along with `play-runtime.js?v=20261010-step10c` and the PLAY workspace stylesheet. A release reconciliation must retain both newer base fixes and the PLAY additions.
- The current `main` Pages workflow adds a post-deploy Chinese Origin narrative verification block that is absent from the design branch. Preserve that block when reconciling the Pages workflow; do not replace production's workflow with the older branch file.
- `site/instruments.js` currently uses `history.replaceState` for card entry and close and has no dedicated `popstate` handler. Dedicated browser back/forward tests are still **NOT RUN**. Do not assume that browser Back returns from an instrument to the Lab collection.
- Native desktop 125% browser zoom has **NOT RUN**. A CSS-sized viewport proxy cannot close this acceptance gate.
- No merge, rebase, deployment, production asset change, or release tag was performed in this preflight.


## STEP 12 release candidate — 2026-10-10

### Decision: DONE — predeployment release QA and visual sign-off

**Candidate branch:** `release/play-desktop-v2-final` (integration predecessor: `release/play-desktop-v2-rc`). It is isolated from production `main`.  
**Candidate merge commit:** `a9e25a6ca242988cb2f7046ffcf80b1d84414526` (parents: design `d4acf196d3fb5af37e84373b75d080f0bc22d3f7` and main `c3e4f1e58707b759441a5a6f8319504755894663`).  
**Versioned navigation fix commits:** `98dd773` in `site/instruments.js`, `4c78790` in `site/core/modules.js`.  
**Browser history / desktop visual tests:** `tests/browser/play-release-regression.spec.mjs` (`d4acf19`): six Back/Forward flows plus all six instruments at 1920×1080, 1440×900, 1366×768, with screenshot attachments.  
**Native 125% page zoom test:** `tests/browser/play-native-zoom-release.spec.mjs` (RC branch): uses a temporary Chrome extension and `chrome.tabs.setZoom(1.25)` in a separate Chromium persistent context; requires an actual browser zoom measurement and verifies six workspaces × three physical desktop viewports. It does not substitute CSS zoom or a smaller CSS viewport.

### Main branch reconciliation

- Branch merge records both source parents; compare of `main...release/play-desktop-v2-rc` returned `behind_by=0` after integration.
- Included all 16 main-only changed source/test files without discarding PLAY branch changes.
- `site/lab.html`: preserved PLAY viewport stylesheet and versioned PLAY entry plus main `app.js?v=20261009static1` and `lab-fullpage.js?v=20261009navfix1` fixes.
- `.github/workflows/pages.yml`: preserved main's deployed Chinese Origin narrative verification together with the latest Orient asset-version guard.
- No `main` write, no release/deployment, no production mutation, no PR merge.

### Outstanding release gate

- **CI: IN REVIEW.** Run the full candidate build, static QA, link checks, specialist scientific regressions, browser/accessibility suite, native zoom assertions and Lighthouse on the final RC commit. Record exact run SHA and all failure/skipped cases.
- **Visual inspection: NOT RUN.** Download the final quality artifact and inspect six-instrument desktop/native zoom screenshots for legibility, overlap and geometry, especially at 1366×768.
- **Production deployment and post-deploy smoke: NOT RUN.** Require explicit authorization to merge to `main`; release acceptance must not be confused with a live deployment.
- **Historical same-state pixel diff: NOT RUN.** STEP 00 reference screenshots are 1920×869 early states with different conditions, so pixel-identical comparison is not an honest assertion.


### Final release-asset version pin — 2026-10-10

- Final predeployment candidate branch: `release/play-desktop-v2-final`.
- `site/lab.html`: release metadata and Lab navigation query bumped to `20261010v103play2`; external `core/modules.js` query pinned to this same release, so previously cached module loader files cannot silently mask the new `instruments.js?v=20261010-step12a` history fix.
- `.github/workflows/pages.yml`: all five pinned postdeploy `core/modules.js` checks updated to the same release; main's Chinese Origin live-HTML verification and latest Orient asset version remain intact.
- `scripts/verify-play-live-release.mjs` derives release metadata dynamically and accepts the new alphanumeric marker. Final CI on the exact final candidate is required before STEP 12 completion; do not claim Pages deployment without a successful actual deploy.


### STEP 12 RC measured browser/visual evidence

**Historical RC validation; RC failure was superseded by the final candidate CI. Production deployment remains separate.**

- **RC run:** [38047938164](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38047938164), commit `31bc4fe403000ea16ed9902bd7ee18743b665079`, **overall FAIL** only because the previously intermittent non-PLAY Pulse Round 4 AXE run timed out on `pulse-observation-lab.spec.mjs:270`. Browser report: **580 total, 533 passed, 46 skipped, 1 failed**. No new STEP 12 tests failed.
- **Release browser navigation:** all six real in-page Lab entry, browser Back, browser Forward restoration flows passed, confirming one shell, clean close and correct workspace identity.
- **Native 125% zoom:** the dedicated desktop test passed using Chromium `chrome.tabs.setZoom(1.25)`, checking the browser's reported tab zoom and actual CSS viewport contraction. **18 screenshot attachments** cover six instruments at physical 1920×1080, 1440×900 and 1366×768.
- **Layout matrix:** all six instrument workspace bounding-box checks across the three desktop viewport sizes passed; **18 entry screenshots**. Browser history tests attached **6 forward-restoration screenshots**. All **42 named STEP 12 PNGs** were verified in the RC Playwright report from [quality artifact 11668697555](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38047938164/artifacts/11668697555).
- **Visual inspection:** six-up contact sheets for the 1366, 1440, 1920 native-zoom states and the 1366 entry/history states were inspected. Full-size native 1366 Project and Connect screenshots were also inspected. No obvious canvas obstruction, duplicate shell, unexpected viewport margin, or body horizontal spill was observed. Aux/evidence rails intentionally scroll at reduced heights.
- **Release cache:** the separate `release/play-desktop-v2-final` branch sets Lab marker and `core/modules.js` URL to `20261010v103play2`. It preserves the PLAY workspace version and the main-side Origin Chinese deployment check. Two legacy Water V7 and V9 static tests initially rejected the new cache version; their exact-version contracts were extended via `ae072e3` and `3db0b0a`. Scientific code was unchanged.
- **Superseded final-candidate CI:** [38048956580](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38048956580) did not pass; subsequent fixes and exact-SHA passing evidence are recorded in the final sign-off below.
- **Not run:** production `main` merge, Pages deployment, and external live smoke. They remain separate gated actions. Historical STEP 00 early screenshots do not support a same-state pixel-exact diff.


### Final STEP 12 sign-off — validated 4c4f9fa

**Decision: DONE for predeployment release regression and visual sign-off.** Do **not** interpret this as production deployment approval or a claim that Pages already serves PLAY V2.

- **Source:** `release/play-desktop-v2-final`, validated code/test commit `4c4f9fa33b0211b1edcf40edafe12c3da94abdde`. The repository's `main` ancestor is `c3e4f1e58707b759441a5a6f8319504755894663`, with no `main` commits missing from this candidate at review time.
- **Full CI:** [GeoGeek Quality 38050717187](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38050717187), COMPLETED / **SUCCESS** on the exact source SHA. Build, ORIENT assets, static/Node scientific QA, link/assets, all specialist Water/Orient/Pulse phases, browser/accessibility suite and Lighthouse all ended successfully.
- **Complete browser report:** **580 total; 533 expected first-pass successes, 46 intentional skips, 1 flaky case that passed on retry, 0 unrecovered failures.** These are distinct categories and must not be conflated. The single flaky case is `LIGHT restores the legacy narrow composition when a viewport crosses the desktop threshold`: the first attempt observed `legendInEvidence=false` immediately after the viewport crossed 920→1366; the retry passed. This is a residual transition-timing risk, not evidence of a persistent render failure. Keep it on the post-release watchlist.
- **Final artifact:** [quality-reports 11669489494](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38050717187/artifacts/11669489494) downloaded and inspected. The embedded Playwright report matches the run: 42 named STEP 12 PNGs mapped to actual binaries, each `expected` on desktop Chromium. **18** native Chrome tab-zoom captures (`chrome.tabs.setZoom(1.25)`, browser-reported actual zoom), **18** initial desktop 1920/1440/1366 captures and **6** browser-Forward recovery captures. Intentional mobile-only skips are not counted as passes.
- **Visual inspection:** all six instruments reviewed in final native-zoom contact sheets for 1920×1080, 1440×900 and 1366×768; all six also reviewed in final entry-state sheets, with full-size 1366 Project and Connect examined. Task, primary map/field/light path and evidence regions remain distinct; no blocking floating dialog margin, duplicate shell, central overlay or body horizontal spill was seen. Tall evidence rails scroll independently in shorter physical viewports.
- **Navigation and science:** all six Lab card → browser Back → browser Forward cases passed with clean stage lifecycle and correct workspace identity. Existing per-instrument numerics, prediction/commit-before-reveal and shared Spatial Trace regressions also passed in the same full suite.
- **Assets and branch integration:** Lab release marker and `core/modules.js` version `20261010v103play2` align; PLAY runtime and workspace CSS remain versioned, main-side Lab app/navigation fixes are preserved, and the Pages workflow retains its Chinese Origin post-deploy verification. Legacy Water V7/V9 version guards were updated without modifying science modules.
- **Not included in predeployment DONE:** merging to `main`, triggering the Pages deployment, live six-module smoke, live Origin verification, and rollback decision. All remain **NOT RUN** and require a separate production go/no-go. STEP 00 source screenshots use different viewport/state and do not support a pixel-identical baseline comparison.


### Production publication — 2026-10-10

- The predeployment-approved release candidate was fast-forwarded to `main` at `ebf37f509701e937a31480611c43083ce5a6ab97` after confirming `main` was an ancestor, without force or history rewrite.
- **PUBLISHED / VERIFIED:** GitHub Pages workflow [38055123208](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38055123208) completed **SUCCESS** on source commit `3abae65c1bdfddf401c4d96dc2a64ef25cbe7016`. Build, deploy and online smoke jobs all passed. Live Lab release: `20261010v103play2` at https://geogeeklab.github.io/lab.html.
- Post-deploy logs explicitly verified live Chinese Origin content, World v12 (`Lab@20261010v103play2`), Water V8–V10.2, Observatory, ORIENT and **all six PLAY modules / 38 public files**. This is a deployed-resource and smoke validation, not a fresh post-deploy human playthrough on arbitrary browsers.
- The first production Pages run [38054869914](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/38054869914) failed its World v12 cache version guard because the script still expected `20261009v102`; fixed in `3abae65` without changing World scientific logic, after which the second run passed.
