# GeoGeek Lab — Release-Candidate Freeze A10

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A10 is a freeze and verification pass.

It adds no scientific feature and no new award runtime version.

## Final capture correction

The b074 A9 submission artifact confirmed that most of the composition was stable.

Two defects were still visible.

### Horizontal workspace overflow

The explicit chevron existed, but the mask shoulder was too narrow.

Fragments such as `ical model` and `OR` remained visible behind it.

A10 widens the noninteractive edge mask.

At a true scroll boundary the mask still disappears.

No tab, touch, keyboard, or scroll semantics change.

### Mobile Lab exit

The mobile capture still showed the inherited × together with the return arrow.

A10 makes the button's text color transparent at mobile width and gives the `::before` return arrow its own explicit color.

The accessible name remains `Return to Lab Index`.

The desktop × control is unchanged.

## Candidate gate

The final workflow now creates a release-candidate verdict only after:

1. build and static QA;
2. Water V10.0–V10.2 targeted regressions;
3. Pulse touch regression;
4. award-specific browser contracts;
5. six deterministic submission captures;
6. the complete browser/accessibility baseline;
7. the Water Lighthouse budget.

The verifier checks the frozen release, frozen baseline commit, science/concept/polish versions, six capture files, real-control capture policy, workflow SHA, and Lighthouse budget.

A passing verifier writes:

`release-readiness.json`

with status:

`submission-review-ready`

This is a technical state.

It is not a prediction of Awwwards, FWA, Webby, or any jury result.

## Freeze rule

After an A10 green run, no additional visual change should be made without a new visible defect, accessibility issue, performance regression, or scientific correctness issue.

Preference changes alone are not sufficient reason to keep iterating.


## Gate correction

The full A10 browser baseline exposed one stale assertion in the mobile-exit review test.

The rendered mobile capture already showed one visible return arrow and no visible ×.

The test incorrectly required the button's inherited font size to be zero.

Font size is not the visual contract.

The contract is:

- the underlying text glyph is visually transparent;
- the `::before` return arrow is visible;
- the accessible name remains `Return to Lab Index`.

A10 keeps the rendered UI unchanged and corrects only this test contract.


## Post-freeze defect exception — RT chart interaction

A user-visible consistency defect was found after the visual freeze: WATER RT plots were static SVGs while the other Water scientific plots supported direct inspection.

The fix does not change RT science or interpolate the archived grid.

Depth-profile interaction snaps to one of the ten reported depth nodes and activates the existing depth selector.

Compare-view spectral interaction snaps to one of the five archived wavelength nodes and activates the existing wavelength selector.

Angular-view interaction inspects one of the eight solved upward-direction nodes locally; it does not invent a new viewing direction or rerun the solver.

Pointer, tap and keyboard inspection share the same discrete-node contract.

This qualifies under the A10 freeze rule because it corrects a visible interaction defect rather than adding a new aesthetic feature.


## Post-freeze quality-gate correction — invisible boot cover

The RT interaction change passed the complete browser/accessibility baseline: 590 tests passed with no browser-suite failures.

The remaining candidate failure was Lighthouse LCP.

The Water report identified the site-wide readiness overlay status text as the LCP element even after the interface was already visible. The ready-state cover remained in the render tree at `opacity: 0`, allowing later text/font repaint work to become an LCP candidate.

The ready state now makes the cover `visibility: hidden` as well as transparent and non-interactive.

The leaving/frozen/restoring states still switch it synchronously back to visible and opaque, preserving the no-stale-frame navigation contract.

This is a site readiness/performance correction. It does not alter Water RT science or chart interaction.
