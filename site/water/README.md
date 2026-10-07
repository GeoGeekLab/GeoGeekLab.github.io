# Water scientific engine

This directory implements Round 2 of `docs/WATER_AS_SPECTRUM_SCIENTIFIC_CONTRACT.md`.

It has no Lab UI. It is the deterministic water-optics engine that a later Water instrument or Light Play can consume.

## Runtime

Load `water-data.js` before `water-model.js`.

`GeoWaterModel.compute(state)` returns 301 samples from 400 to 700 nm for:

- absorption components: `aw`, `aph`, `ag`, `aNAP`, `a`;
- backscattering components: `bbw`, `bbp`, `bb`;
- `u = bb/(a+bb)`;
- subsurface `rrs`;
- above-water `Rrs`.

Units follow the scientific contract.

## Scientific boundary

The engine assumes optically deep homogeneous water.

It does not compute atmosphere, TOA radiance, glint, BRDF, bottom reflectance, fluorescence, Raman scattering, or sensor band convolution.

## Bricaud correction

The implementation uses the standard Bricaud form:

```text
a*ph(lambda) = A(lambda) * Chl^(-B(lambda))
aph(lambda)  = A(lambda) * Chl^(1-B(lambda))
```

The earlier contract sentence `aph = A * Chl^B` was ambiguous/wrong for the supplied Bricaud coefficient table. The contract is corrected on this branch.

## QA

Run:

```bash
npm run qa:water
```
