# Water as Spectrum — Award-level visual concept

## Frozen baseline

This concept is intentionally based on one immutable release state.

- Public release token: `20261011v107watercache1`
- Baseline commit: `9718171862959c9232e1dd7b4f69d31c36b0bc75`
- Default Water UI: `workbench-v10-2`
- Water adapter version at baseline: `10.2.0-quiet2`
- Pulse comparison reference: the Pulse files from the same baseline commit.

Do not merge visual decisions from later Water, Pulse, Orbit, or site iterations into this concept without an explicit rebase review.

## Design position

The Lab remains one product family. Water gets an instrument-specific optical signature, not a separate site identity.

Shared Lab DNA remains:

- abyss green-black environment;
- warm off-white text;
- mono labels and scientific telemetry;
- thin dividers and mostly square geometry;
- semantic colour rather than decorative colour;
- visible provenance, limits, and model status;
- dense scientific interaction without dashboard-card chrome.

Water-specific signature adds:

- wavelength-reactive ambient light;
- depth as a spatial cue;
- mineral cyan/green spectral energy;
- warm solar reference;
- a stronger editorial/scientific title hierarchy.

Pulse remains the sibling reference for density, rail geometry, separator logic, and restraint.

## Scientific invariants

The concept layer must not:

1. change model equations or constants;
2. change the experiment schema or persisted state;
3. change reference data or RT calculations;
4. dispatch hidden model actions;
5. hide provenance or validation limits;
6. encode scientific values with colour only;
7. require motion to read a result.

The A1 JavaScript only reads existing DOM state and exposes CSS variables.

## A1 scope

A1 is a reversible presentation layer.

- It compresses visual chrome.
- It makes the chart/field the dominant surface.
- It aligns the right rail with Pulse.
- It gives WATER RT a stronger depth/direction hierarchy.
- It maps the selected wavelength to a subtle ambient field.
- It maps the selected RT depth to a subtle depth line.
- It respects `prefers-reduced-motion`.

## Next concept passes

A2 should redesign the main spectral chart as the primary optical instrument.

A3 should add physically meaningful transitions for solar zenith, absorption, scattering, sensor response, and atmospheric correction.

A4 should unify the Lab host shell across Water, Pulse, Earth, Orbit, and Figure without flattening instrument identities.

## Acceptance standard

The target is not “an Awwwards-looking dashboard.”

The target is a credible scientific instrument with enough authorship, interaction quality, typographic control, motion discipline, and technical polish to compete at Awwwards / Webby / FWA level while remaining usable for actual analysis.
