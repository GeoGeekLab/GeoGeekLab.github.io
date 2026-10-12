# GeoGeek Lab — Evidence-Gate Review A9

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A9 starts by correcting the review gate itself.

It does not treat a failing test as proof of a visual defect.

## A8 failure classification

The A8 full browser suite reported five failures.

The targeted Water V10.0–V10.2 regression stages, Pulse touch regression, build, static QA, and links had already passed.

The five full-suite failures were review-contract errors.

### Responsive host context

A5 intentionally hides secondary Observatory context below 700 px.

Two older tests still required that context to be visible on the mobile Playwright project.

The UI behavior is correct.

The tests now distinguish visible desktop/tablet orientation from intentionally hidden mobile orientation.

### Cross-instrument shell fixture

The A4 shell test was opening a synthetic dialog fixture without mounting a real Lab workspace.

The full-page runtime correctly reset that synthetic dialog to `data-lab-workspace="false"`.

The test now checks the shared shell grammar as DOM state instead of pretending the fixture is a mounted scientific instrument.

Real instrument visibility remains covered by Water, Pulse, and full-page lifecycle tests.

### Spectral probe line

The wavelength probe is an SVG `<line>`.

A vertical SVG line has zero CSS bounding-box width.

Playwright therefore classifies it as not visible even when it has a rendered stroke and nonzero vertical extent.

The test now verifies the actual visual contract: stroke, opacity, display state, and solved y extent.

## Review pipeline

Submission captures now run before the 600+ test full browser baseline.

They are uploaded immediately as a dedicated artifact.

This does not weaken the release gate.

The complete browser/accessibility suite and Lighthouse still must pass.

It makes art-direction evidence available early enough to inspect without waiting for unrelated browser suites.

## A9 next action

Once the six A8 frames are available, the remaining A9 work is image-based.

Only defects visible in the actual desktop, tablet, mobile, and Pulse comparison captures should trigger further visual changes.
