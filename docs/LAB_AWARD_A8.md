# GeoGeek Lab — Submission-Grade Review A8

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A8 adds no visual concept layer.

It converts the existing A3/A4/A5/A7 work into reproducible review evidence and a performance gate.

## Version stack

```text
Water science       10.2.0-quiet2
Water concept       award-a3
Water polish        award-a5
Observatory host    award-a4
Host polish         award-a5
A6                  accessibility review
A7                  final composition review
A8                  submission capture + performance evidence
```

## Curated evidence

The A8 capture script creates six deterministic frames.

1. Water Optics desktop at 490 nm.
2. WATER RT desktop.
3. Atmosphere / observation-topology desktop.
4. WATER RT tablet.
5. Water Optics mobile.
6. Pulse desktop for cross-instrument family comparison.

All frames use the real Lab host.

All Water states use real interface controls.

No preview-only scientific values are written.

Motion is reduced during capture so a transient animation frame cannot become submission evidence.

The manifest records the release, frozen baseline, runtime versions, viewport, workspace, and state for every frame.

## Why Pulse is included

Award review must demonstrate that Water has authorship without becoming a detached microsite.

The Pulse frame is evidence of family resemblance.

The common elements are:

- Observatory masthead;
- scientific orientation;
- compact inspector grammar;
- thin separators;
- provenance-aware styling;
- stable Lab Index exit.

The scientific field and semantic colors remain instrument-specific.

## Lighthouse evidence

A8 adds the open Water instrument as a Lighthouse target.

The median Water run must meet these minimums:

- performance: 0.70;
- accessibility: 0.95;
- best practices: 0.90;
- LCP: at most 4000 ms;
- CLS: at most 0.10;
- TBT: at most 400 ms.

These are release-quality floors, not award guarantees.

A project can pass these budgets and still fail design review.

## Submission narrative

The preferred editorial sequence is:

```text
1  Water is a spectral medium.
2  Wavelength is the interaction coordinate.
3  Depth and direction define the numerical reference view.
4  Atmosphere and sensor effects remain explicit model stages.
5  Scientific limits and provenance stay visible.
6  The instrument belongs to one GeoGeek Observatory family.
```

Do not lead with a generic dashboard screenshot.

Lead with the primary optical field or WATER RT reference chamber.

## Release condition

A8 is complete only when:

- the entire GeoGeek Quality workflow passes;
- all six curated captures are generated;
- the Water Lighthouse budget passes;
- Water V10.2 numerical and UI regressions pass on desktop and mobile;
- Pulse regression remains green;
- A6 embedded-Water accessibility checks remain green.

Passing A8 means the concept is technically ready for a human submission review.

It does not guarantee Awwwards, FWA, Webby, or any other jury outcome.
