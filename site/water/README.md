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


## Round 3 prototype

The interaction prototype is available at \`/water/prototype.html\`.

It is intentionally not registered as \`lab:l13\` yet.

The prototype validates:

- one shared water state across PATH and IOP modes;
- synchronized \`a(λ)\`, \`bb(λ)\`, and \`Rrs(λ)\` plots;
- a shared 400–700 nm wavelength probe;
- absorption and backscattering component budgets;
- four pedagogical reference states;
- independent NAP absorption and particle backscattering controls;
- desktop and mobile workbench layout.

Atmospheric correction and sensor spectral sampling remain outside the quantitative prototype.
