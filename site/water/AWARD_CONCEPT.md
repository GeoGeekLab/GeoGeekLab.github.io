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

All award-concept JavaScript reads existing DOM state only. It does not write experiment values or invoke model calculations.

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

A4 should unify the Lab host shell primitives across Water, Pulse, Earth, Orbit, and Figure without flattening instrument identities.

A later motion pass can add additional state transitions only where the underlying model semantics justify them.

## Acceptance standard

The target is not “an Awwwards-looking dashboard.”

The target is a credible scientific instrument with enough authorship, interaction quality, typographic control, motion discipline, and technical polish to compete at Awwwards / Webby / FWA level while remaining usable for actual analysis.


## A2 implementation

A2 moves from surface styling to instrument hierarchy.

### Water Optics

- The 400–700 nm domain is now a visible coordinate.
- The active wavelength has a read-only spectral marker.
- The original wavelength probe remains the actual control.
- Above-water Rrs becomes the primary spectral panel.
- Absorption and backscatter remain supporting scientific panels.
- The three existing numerical readings remain visible as compact telemetry.
- Numeric closure and source tables remain available below the main field.

### WATER RT

- The header now includes a direct selection-geometry summary.
- The geometry reads the selected in-water solar zenith, wavelength, and depth.
- It is explicitly labeled `NOT A RADIANCE FIELD`.
- It does not calculate attenuation, photon paths, or angular radiance.
- Existing RT plots, tables, provenance, and mismatch state remain authoritative.

### Shared Lab consistency

A2 follows the new `docs/LAB_VISUAL_CONSTITUTION.md`.

Pulse remains the reference for compact rail density and separator logic.

Earth, World, and Orbit remain references for immersive scientific viewports.

Water combines the compact rail with an optical field specific to spectroscopy and radiative transfer.


## A3 implementation

A3 changes the architecture before adding more effects.

### Modular visual architecture

The original concept stylesheet is no longer a growing patch stack.

`award-concept.css` is now a manifest.

It imports:

- `site/core/lab-award-system.css` for shared Lab primitives;
- `award-foundation.css` for the frozen A2 Water shell, spectrum, and RT geometry;
- `award-journey.css` for the A3 observation-flow presentation.

JavaScript is also separated.

- `award-optical.js` owns ambient wavelength, spectral ruler, and RT selection geometry.
- `award-journey.js` owns the read-only observation topology.
- `award-concept.js` only marks the active concept version after both modules load.

### Observation topology

Atmosphere, Sensor, and Atmospheric Correction no longer imply one incorrect linear pipeline.

The A3 topology shows the actual conceptual branches:

```text
Water Rrs(λ) ───────┬──────────────→ Sensor weighting → band samples
       │            │
       ▼            │
Atmosphere → ρ*TOA ─┤
       │
       └───────────────────────────→ Correction → recovered Rrs
```

Sensor weighting can therefore use the selected Rrs or TOA source spectrum.

Atmospheric correction originates from the modeled TOA branch.

The topology is read-only and never changes workspace state.

### Atmosphere

The existing Rayleigh, aerosol, transmitted-water, and total values now read as one additive decomposition strip.

The existing geometry and atmosphere inputs become compact telemetry.

The original chart and numeric source table remain authoritative.

### Sensor

The existing source-spectrum, response-function, and band-integration explanation becomes a connected three-stage transform.

SRF provenance and incomplete-coverage behavior remain visible.

No unavailable band is converted to zero or visually implied as a valid sample.

### Atmospheric correction

The existing forward model, inverse hypothesis, conditional comparison, and missing independent validation become a single four-stage reasoning sequence.

The final stage remains explicitly marked as not performed.

Matched-model closure is not presented as empirical validation.

### Cross-Lab consistency

A3 introduces shared `gg-lab-*` primitives rather than Water-only copies.

They are loaded only by the Water concept branch today.

They are designed so a later A4 pass can reuse the same topology, telemetry, rail, and field grammar in sibling Lab instruments without forcing their domain-specific visuals to match Water.


## A4 host integration

A4 is a Lab-host pass, not a new Water science pass.

The Water internal award layer remains `award-a3`.

The shared Lab host is now `A4`.

This separation is intentional.

```text
GeoGeek Lab host      → A4
Water workbench shell → A3
Water science         → V10.2 quiet2
```

Water now shares the same Observatory masthead, orientation grammar, task ownership rule, and Lab Index exit geometry as Pulse, Earth, Orbit, Flow, Figure, and World.

Water keeps its own spectral accent and its own internal workspace navigation.

The host does not create a second Focus / Work / Inspect system for Water.

See `docs/LAB_AWARD_A4.md`.
