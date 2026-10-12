# GeoGeek Lab — Award Review A6

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A6 is a review pass.

It does not add another concept layer.

## Version stack

```text
Water science       10.2.0-quiet2
Water concept       award-a3
Water polish        award-a5
Observatory host    award-a4
Host polish         award-a5
A6                  review + accessibility corrections only
```

## Corrections

A6 raises host and Water microtype that fell below practical reading size.

The Observatory breadcrumb and context labels now use at least 10 px text on the desktop shell.

Water navigation-group labels, plot status, spectrum labels, and RT geometry labels receive the same minimum.

A6 also fixes a cascade conflict in A5.

The chart probe readout and selected spectral table row no longer fall back to raw display-spectrum RGB for text.

The physical hue remains on marks.

Text mixes the selected spectral hue toward the warm-white interface color.

## Tools portal

The A5 Tools panel must escape chart stacking contexts.

A6 keeps the viewport portal, but restores logical keyboard traversal.

Tab from the open Tools summary enters the first tool.

Shift+Tab from the first tool returns to the summary.

Escape closes the panel and restores focus.

Tab from the final tool closes the panel and continues to the active workspace tab.

The portal remains presentation and interaction plumbing only.

It does not change export, import, inspector, or model behavior.

## Focus and contrast

Primary host and Water controls receive a two-pixel visible focus treatment.

Forced-colors mode receives explicit Highlight focus and selection cues.

`prefers-contrast: more` strengthens separators and secondary text without changing scientific data colors.

Reduced-motion behavior remains unchanged.

## Automated review

A6 adds browser checks for:

- host microtype size;
- Water microtype size;
- explicit close-control focus appearance;
- keyboard traversal through the portaled Tools panel;
- the A3/A4/A5 version boundaries;
- critical WCAG / best-practice violations inside the Water iframe.

Automated accessibility testing is not a substitute for manual review.

Serious noncritical findings remain visible in the attached axe report for review.

## Release rule

A6 does not qualify the branch for release by itself.

The full Quality workflow must pass through Water V10.2 regression, Pulse regression, browser/accessibility baseline, and Lighthouse before the branch can be called release-ready.
