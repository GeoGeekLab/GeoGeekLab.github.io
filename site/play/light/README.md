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
