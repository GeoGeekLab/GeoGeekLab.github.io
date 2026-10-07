# Water as Spectrum — V1 scientific engine

Round 2 contains the scientific engine only. It intentionally does not contain the final Lab UI.

Quantitative scope: optically deep water, 400–700 nm, 1 nm sampling, 20 °C / 35 PSU pure-water baseline.

Main entry point:

```js
computeWaterOptics({ chl, ag440, aNap443, bbp443, eta })
```

Outputs include component absorption, total absorption, component backscattering, total backscattering, `u`, subsurface `rrs`, and above-water `Rrs`.

The model does not access the DOM.

Data provenance is documented in `data/SOURCES.md`.

Rebuild and test:

```bash
node scripts/build-water-optics-data.mjs
node --test tests/water/*.test.mjs
```
