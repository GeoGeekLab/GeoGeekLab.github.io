# PLAY Desktop V2 — Status

Updated: 2026-10-09  
Working branch: `design/play-desktop-v2`  
Baseline source: `main@f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release marker: `20261009v102`

## Current state

**STEP 00 — DONE (documentation and visual-reference baseline).** No PLAY runtime, stylesheet or test implementation was modified. The provided six screenshots have been catalogued; repeatable browser captures and baseline test results are not yet available.

**Next:** STEP 01 — fix Project's world projection geometry. Do not proceed to general UI redesign before validating Project's map extent and projection interpolation.

## Roadmap

| Step | Task | State |
| --- | --- | --- |
| 00 | Project audit and baseline | DONE |
| 01 | Project geometry correction | PLANNED |
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
