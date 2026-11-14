# Light Play

Light is a GeoPlay mechanism-ablation instrument.

Its question is:

> Which light path makes a visible signal exist?

## V1 experiments

1. Remove atmospheric scattering.
2. Remove water backscatter.
3. Remove reflected-sky surface contribution.

Every experiment follows the same interaction:

```text
normal world
   ↓
predict
   ↓
commit
   ↓
remove one mechanism
   ↓
compare spectrum + path
   ↓
revise or retain the prediction
```

## Scientific boundary

The water path uses `site/water/water-model.js` directly.

That engine provides quantitative, idealized above-water `Rrs(λ)` from 400–700 nm at 1 nm resolution.

Light does not duplicate that model.

The Water model has been numerically tested, but Light does not claim that its rendered Rrs is an independently validated field observation.

The atmosphere path is deliberately limited to a normalized Rayleigh spectral shape:

```text
relative scattering ∝ λ^-4
```

It does not compute top-of-atmosphere radiance.

The surface path uses unpolarized Fresnel reflectance at a fixed 40° incidence angle with:

```text
n_air   = 1.00
n_water = 1.34
```

It does not model wind roughness, sunglint geometry, whitecaps, polarization, or BRDF.

When atmospheric scattering is removed, the reflected-sky contribution also becomes zero because its source field is absent. The surface reflection mechanism itself is not disabled.

The `waterBackscatter = off` state is a mechanism-ablation thought experiment. It forces the displayed water-leaving spectrum to zero. It does not create an accepted natural-water state inside the Water as Spectrum engine.

## Reveal and evidence behavior

- The after-perturbation trace and its numeric readout remain concealed until the user commits a prediction and removes the mechanism.
- Before and after traces use one unchanged, zero-aligned vertical scale. The chart shows its upper bound and distinguishes the two traces by line style as well as color.
- The prediction, intervention, and next-experiment controls preserve keyboard focus across panel re-renders.
- Short live status messages announce phase transitions; the conceptual scene also has a text description.
- In the surface experiment, surface reflection and modeled water-leaving radiance remain separate physical paths. The relative surface teaching signal cannot be numerically added to Rrs (sr⁻¹) without an explicit common radiometric model.

## L3 desktop interaction and device policy

Light is intentionally **desktop-only**. The three experiments retain the
existing desktop three-zone composition: question, conceptual optical field,
and numerical evidence.

The active mechanism is highlighted consistently in the optical path and its
legend. After ablation, that path remains as a faint dashed outline. The other
paths retain their own statuses. These changes visualize path presence, not
new radiative-transfer calculations.

On phone-width viewports (780 CSS px and below) and touch-first/coarse-pointer
devices, Light displays a short notice asking visitors to open the same URL in
a desktop browser. The interactive experiment, HUD and scene are hidden.
The notice provides a Return to Lab link. Resizing back to a supported desktop
view does not reset the current experiment state.

The mobile view is **not a feature target**. Do not build a parallel mobile
experiment interface without an explicit future product decision.

## Display color

Water display color is illustrative.

The view samples Rrs near 450, 550, and 650 nm and maps those samples to screen RGB for immediate visual feedback.

It is not a CIE colorimetric reconstruction and must not be described as literal human apparent color.

## Files

```text
light-content.js       questions, copy, limits
light-physics.js       path-level teaching physics
light-experiments.js   prediction/commit/reveal state
light-view.js          scene, spectrum, controls
light.js               GeoPlay mount and Water-engine bridge
light.css              visual system
```

## QA

```bash
npm run qa:light
npm run qa:browser -- light-play.spec.mjs
```

The production preview pipeline also captures `assets/lab/previews/light.jpg`.

## L4 desktop evidence refinement

- The evidence rail displays a signed `Δ = AFTER − BEFORE` at 550 nm only after the mechanism intervention is revealed.
- It uses the same unit as the active teaching curve (relative sky/surface; sr⁻¹ water) and never combines unrelated physical paths.
- The delta resets to hidden when the next experiment starts. The physics model and prediction state are unchanged.

## L5 compact desktop evidence readability

- The spectral range maximum sits at the top-right of the SVG instead of overlapping the high end of the curve.
- The right rail displays a native keyboard-accessible **MODEL SCOPE / VIEW LIMITS** disclosure. Its full model qualification is available without occupying the small 1366×768 default reading area.
- Removed-path labels stay legible; dashed swatches and explicit **REMOVED** / **NO SKY SOURCE** statuses carry the meaning without strike-through.
- The rail retains native vertical scrolling when the disclosure is open. The conceptual scene and task area keep their desktop dimensions.

## L6 · Six experiments in two acts

Act I retains the three original ablation experiments. After completing them, users can optionally begin Act II with three interactive propagation experiments. Act II reveals a continuous parameter slider only after a prediction and intervention.

| Act II question | Model | Controlled parameter | Important limitation |
|---|---|---|---|
| Sunset reddening | T(λ)=exp(−m·0.12·(550/λ)^4) | air mass m (1–8), 1.2→6 initially | Simplified Rayleigh-only **direct sunlight** transmission; not real-sky radiance or color |
| Red light disappearing underwater | T(λ,z)=exp(−a_total(λ)z) | absorption path z (0–8 m), 0→5 initially | Absorption-only homogeneous medium; not total diffuse underwater illumination or Kd |
| Grazing reflection | R_F(θ)=(R_s+R_p)/2 | angle from surface normal (0–85°), 40→75 initially | Smooth air–water surface, unpolarized, n_air=1.00 and n_water=1.34; no waves or glint |

The advanced charts use fractions, not satellite Rrs. The Fresnel plot is wavelength-flat because the model holds refractive index constant. Before and after spectra share the same Y range, and the range slider updates the scene without rebuilding the active control. `PLAY AGAIN` returns to the first three experiments.

### L6 visual design direction

The Watched.earth reference informs the precision of labeling, hairline geometry, tabular readouts, state feedback and restrained motion. GeoGeek's own green-black environment, warm off-white body text, Play typography and scientific color semantics remain authoritative. The central schematic and its optical paths stay conceptual; no ray tracing or numerical sky rendering is claimed. Light remains desktop-only.
