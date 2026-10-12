# GeoGeek Lab — Award Polish A5

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A5 is a finish-quality pass.

It does not introduce a new Lab architecture.

It polishes the A4 host and the A3 Water experience.

## Version stack

```text
scientific baseline      Water V10.2 quiet2
Water experience         Award A3
Observatory host         Award A4
interaction / capture    Award A5
```

These versions stay separate.

A5 must not be described as a new Water science version.

## 1. Transition craft

A5 adds restrained host transitions when an Observatory instrument or task state changes.

The scientific viewport only changes opacity.

It does not scale.

It does not translate.

It does not morph one scientific quantity into another.

The masthead orientation line and context can move by a few pixels because those elements are navigation chrome.

Reduced-motion mode disables the transition layer.

## 2. Responsive orientation

A4 hid Observatory context below 1040 px.

That removed too much orientation on tablets.

A5 keeps a compact context row from 701 to 1040 px.

Only the instrument index and active task state remain.

The long field description and seven-instrument axis collapse.

Below 700 px the compact host remains unchanged.

## 3. Water wavelength identity

The selected wavelength is one coordinate across the Water interface.

A5 therefore uses one spectral state for:

- the spectrum ruler marker;
- chart probe line;
- chart active point;
- probe numeric readout;
- current-row emphasis in spectral tables;
- the physical wavelength scrubber.

The probe scrubber now shows the 400–700 nm visible-spectrum domain instead of a generic progress fill.

This is a semantic change in presentation only.

It does not change the probe value or model calculation.

## 4. Water workspace motion

Workspace changes receive one short optical reveal.

The chart data does not translate, scale, or interpolate between quantities.

Probe changes receive only a temporary emphasis on the existing wavelength marker.

The model state remains authoritative.

## 5. Production preview quality

The production preview capture now waits for the A4/A5 Observatory shell before taking a screenshot.

Water preview capture also waits for A3/A5 Water layers.

The Water collection preview is intentionally captured from the real Water Optics workspace at 490 nm.

The preview script operates the same workspace and range controls available to the user.

It does not inject preview-only model values.

Preview capture runs with reduced motion.

This prevents a transition frame from becoming a production card image.

## 6. Cross-Lab rule

A5 does not apply the Water spectral palette to sibling instruments.

Host motion remains common.

Instrument data color remains owned by the instrument.

The family relationship is carried by:

- masthead rhythm;
- orientation grammar;
- transition timing;
- responsive collapse;
- exit behavior;
- provenance treatment.

## 7. Quality gates

A5 adds tests for:

- read-only host transition coordination;
- no viewport scale/translate;
- reduced-motion behavior;
- tablet orientation;
- mobile compactness;
- Water spectral-coordinate consistency;
- A5 preview readiness;
- continued Water V10.2 version isolation.

## A6 direction

A6 should be a visual-review and accessibility pass, not another concept layer.

It should use captured desktop, tablet, and mobile states to correct spacing, contrast, line length, and density.

Any further motion must be justified by interaction semantics.
