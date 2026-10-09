# PLAY Desktop V2 — Master Plan

Status: active  
Baseline date: 2026-10-09  
Working branch: `design/play-desktop-v2`  
Source branch: `main`  
Baseline source commit: `f453201c1fbae979b2f3369fedb01c4894653067`  
Lab release observed: `20261009v102`

## Purpose

Redesign the six PLAY / SPATIAL REASONING instruments as a coherent, desktop-first spatial reasoning workspace. Improve visual quality, spatial legibility, interaction clarity, and scientific comparison without changing the educational intent.

PLAY is a set of instruments, not a scoring layer. The underlying sequence is to observe, make a judgment, commit it, change one condition, and inspect the consequence.

## Fixed constraints

1. Use a full-browser-viewport workspace. Do not require the browser Fullscreen API.
2. Target desktop mouse and keyboard interaction. Do not build a separate mobile PLAY experience.
3. Accommodate 1920×1080, 1440×900, 1366×768, and desktop zoom at 125%. A desktop-only product must still fit smaller browser windows.
4. Preserve geographic and physical model semantics, source declarations, numerical units, model limits, experiment states, recorded evidence, Lab navigation, and non-PLAY instruments.
5. Do not reveal correct answers before users commit predictions.
6. Keep quantitative results distinct from illustrative scenes and conceptual teaching models.
7. Preserve the semantic information scale: it denotes information depth, not cartographic map scale.
8. Avoid scoreboards, trophies, artificial achievement systems, and effects that imply unsupported scientific precision.
9. Keep generated `dist/` and `site/archive-content.js` out of hand-written changes.
10. Make one controlled change set per step. No unrelated visual or runtime refactors.

## Execution order

| Step | Scope | Deliverable | Dependency |
| --- | --- | --- | --- |
| 00 | Repository and visual baseline | Audited inventory, design brief, acceptance matrix, progress log | None |
| 01 | Project projection geometry | Correct map extent, continuous morph, regression checks | 00 |
| 02 | Light spectral comparisons | Shared within-experiment Y scale; valid labels and units | 01 |
| 03 | PLAY design system | Tokens, typography, controls, motion, annotation rules | 02 |
| 04 | Full-viewport PLAY shell | Dedicated desktop chrome; safe Lab integration | 03 |
| 05 | Project visual redesign | Full-map area and route workspace | 04 |
| 06 | Light visual redesign | Light paths, scene and spectrum in separate zones | 05 |
| 07 | Bound visual redesign | Unobstructed decision field, clear constraint readouts | 06 |
| 08 | Swath visual redesign | Sensor geometry, coverage and sampling comparison | 07 |
| 09 | Orient visual redesign | Emphasized globe, estimation gesture and residuals | 08 |
| 10 | Connect visual redesign | Clear network, route, rule and edge-state notation | 09 |
| 11 | Shared behavior and Spatial Trace | Consistent progression, evidence and accessible states | 10 |
| 12 | Cross-instrument release checks | Screenshots, regression evidence, issue closeout | 11 |

## Completion gate for every step

1. Read `MASTER_PLAN.md`, `DESIGN_SYSTEM.md`, `BASELINE.md`, `ACCEPTANCE.md`, and `STATUS.md`.
2. Record the current branch head and the files about to be touched.
3. Change only the files required for the current step.
4. Run the relevant Node and browser checks. Label skipped or unavailable checks explicitly.
5. Compare the desktop workspace against the visual baseline and inspect the relevant interaction states.
6. Record the changed files, test results, screenshots, exceptions, and next action in `STATUS.md`.
7. Mark a step DONE only when its acceptance gate is met; otherwise mark BLOCKED or IN REVIEW.

## Source ownership and change boundaries

- Collection and entry: `site/lab.html`, `site/lab-copy-preinit.js`, `site/play/play-bootstrap.js`.
- Dialog and viewport: `site/lab-page.css`, `site/lab-fullpage.js`, `site/lab-fullpage.css`.
- Shared PLAY infrastructure: `site/play/play-runtime.js`, `site/play/play-shell.js`, `site/play/play.css`, `site/play/play-v2.css`, `site/play/play-feedback.css`, `site/play/play-signature.css`.
- Instrument source: `site/play/{orient,bound,connect,project,light,swath}/`.
- State and evidence: instrument state machines and `site/play/play-trace.js`.
- Test sources: `tests/{orient,bound,connect,light,swath}/`, `tests/browser/*play*.spec.mjs`, and shared Lab tests.
- Build/deploy: `scripts/build.mjs`, `.github/workflows/` (not to be modified without a documented release reason).

**Integration note:** `site/lab-fullpage.js` currently treats the Observatory kinds plus `water` as its full-page CORE set. PLAY kinds are not in that set. Reuse the stable viewport mechanism at Step 04 without changing existing Observatory behavior.

## Repository and release policy

The working branch is isolated from `main`. GitHub Pages is deployed from the `main` build workflow. Step 00 must not change live runtime code.

Before a production merge, verify release query parameters, built asset paths, deferred runtime loading, navigation history, keyboard focus, and the non-PLAY regression suite. Record the exact merge base and the release candidate commit in `STATUS.md`.

## Handoff

The next task is **STEP 01 — Project projection geometry**. Its implementation must be based on `site/play/project/project-morph.js`, the map views, and existing browser tests. The screenshot issue is reproducible visually, but the candidate numerical cause remains a hypothesis until validated in runtime.

See `BASELINE.md` for evidence and `ACCEPTANCE.md` for the test matrix.
