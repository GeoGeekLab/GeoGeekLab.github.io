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


## Six-frame art-direction findings

The early A9 evidence pipeline produced all six submission frames successfully.

### Water Optics desktop

The optical hierarchy is working.

The 490 nm ruler, Rrs heading, chart probe and right-side Water Optical State read as one instrument.

The remaining issue was vertical density.

The introductory scope panel still behaved like a large rounded card and consumed space that should belong to the primary spectrum.

A9 removes its radius and tightens its spacing without hiding the model boundary, baseline-slope state, or assumptions disclosure.

### WATER RT desktop

The A7 open-reference-chamber structure is working.

Selection geometry, mismatch status, sampled quantities, and the numerical-reference rail form a coherent signature scene.

The title used four lines at 1600 px and displaced solved quantities unnecessarily.

A9 widens the editorial measure slightly.

It does not reduce type to solve the problem.

### Atmosphere desktop

The observation topology reads clearly and remains correctly labeled as a model topology rather than a measured signal path.

No structural change is required.

### WATER RT tablet

The tablet hierarchy is sound.

The largest visible defect is the partially clipped workspace label at the left edge of the horizontal navigation.

### Water Optics mobile

The mobile composition preserves the scientific scope and wavelength coordinate.

Two visible defects remained.

The horizontal workspace strip exposed fragments of neighboring labels.

The circular Lab exit showed both the mobile back arrow and the underlying ×.

A9 replaces the subtle edge fade with explicit continuation chevrons and forces the mobile exit text glyph off while retaining its accessible label and back-arrow pseudo-glyph.

### Pulse family comparison

Pulse confirms that the shared Observatory host does not erase domain identity.

No Water styling is transferred into the seismic field.

## A9 visual rule

Do not change a strong frame merely because another frame has a defect.

The six-frame review resulted in three narrow corrections:

1. make horizontal continuation explicit;
2. flatten and tighten the Water Optics opening;
3. remove the duplicated mobile exit glyph.

The RT title-measure adjustment is the only additional desktop composition change.
