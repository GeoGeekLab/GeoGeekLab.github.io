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


## Round 4 production integration

The production instrument is registered as:

- record: `lab:l13`
- group: `observatory`
- instrument: `water`
- title: `Water as Spectrum`
- route: `/lab.html?instrument=water#l13`
- record: `/records/lab-l13.html`

The production workspace uses `water-instrument.js` and `water-instrument.css`.
It reuses `water-model.js`; the prototype does not carry a separate scientific model.

Workspace behavior:

- Focus: visualization only.
- Work: visualization plus primary water-state controls.
- Inspect: primary controls plus the V1 model contract and subsurface readouts.

The production V1 still excludes atmospheric correction, sensor response functions, and inversion.


## Round 5 scientific audit

Round 5 did not add a new physical process. It audited the existing model and corrected presentation risks.

Corrections:

- automatic y-axis scaling is now explicit as `AUTO Y` on every spectrum;
- the particle-rich preset is no longer labeled `TURBID`;
- the 20 °C / 35 PSU water component is described as a seawater baseline in user-facing copy;
- the surface/glint path is labeled as excluded from the numerical `Rrs`;
- sensor and atmosphere labels explicitly state that they are not modeled;
- Babin CDOM/NAP slopes are identified as fixed study-wide means, not universal constants;
- the chlorophyll control explicitly changes `aph` only in V1;
- Inspect mode now exposes the fixed-slope and semi-analytical assumptions.

The numerical audit samples 3,125 accepted states over the declared parameter envelope and checks positivity, component identities, interface-domain margin, intervention monotonicity, spectral-form identities, and reference-state diagnostic behavior.

See `docs/WATER_AS_SPECTRUM_SCIENTIFIC_AUDIT.md`.


## Round 6 Sensor Observation Layer

Production mode now has three internal views:

- `PATH`: conceptual light path and explicit exclusions.
- `IOP`: constituent → IOP → AOP causal view.
- `SENSOR`: continuous idealized `Rrs(λ)` → simplified bandpass → band-averaged `Rrs`.

Sensor mode supports:

- Sentinel-3 OLCI nominal visible bands through Oa10.
- PACE OCI simplified nominal 5 nm teaching mode.
- Sentinel-2A MSI B01–B04.
- Landsat 8/9 OLI B1–B4.

The sensor layer never changes the underlying water model.

The current implementation uses rectangular bandpasses and labels them as simplified. Measured detector-specific or time-dependent SRF/RSR convolution remains outside this layer.

Layout changes in this round move the PATH explanation card to the left, reduce scene height in Work mode, compact the control rail on shorter desktop screens, and reserve the upper scene for the sensor-sampling explanation while SENSOR mode is active.

See `site/water/data/SENSOR_SOURCES.md`.
