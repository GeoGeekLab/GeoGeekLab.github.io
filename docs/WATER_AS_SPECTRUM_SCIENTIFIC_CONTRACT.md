# Water as Spectrum — Scientific Contract

Status: V1 scientific contract  
Target record: `lab:l13`  
Target instrument: `water`  
Target group: `observatory`  
Working title: **Water as Spectrum**  
Kicker: **WATER / LIGHT / SPECTRUM**

This document fixes the scientific boundary for the first implementation. UI code must not silently change these definitions, equations, units, parameter ranges, or validity statements.

## 1. Scientific question

The instrument answers one question:

> How do water constituents alter absorption and backscattering, and how do those inherent optical properties become remote-sensing reflectance?

V1 is a browser-native teaching instrument. It is not an atmospheric-correction processor, an operational water-quality product generator, or a replacement for Hydrolight, SeaDAS, ACOLITE, Sambuca, or other research software.

The primary causal chain is:

```text
water constituents
      ↓
spectral absorption a(λ)
spectral backscattering bb(λ)
      ↓
u(λ) = bb / (a + bb)
      ↓
subsurface rrs(λ)
      ↓
air-water interface approximation
      ↓
above-water Rrs(λ)
```

## 2. Critical scope correction

The original design requested a quantitative domain of 400–800 nm.

That range is too broad for one internally consistent V1 model if phytoplankton absorption is parameterized with the Bricaud et al. (1998) basis used by NASA GIOP. NASA's current GIOP-DC implementation is explicitly a visible-range model using 400–700 nm Rrs. Extending the Bricaud basis into 700–800 nm without a second validated phytoplankton model would create false precision.

Therefore V1 uses two spectral domains:

- **Quantitative forward-model domain:** 400–700 nm, sampled at 1 nm.
- **Context / future sensor domain:** 701–800 nm.

V1 may draw the 701–800 nm region as a contextual extension, but it must not present V1 modeled `aph`, `rrs`, or `Rrs` there as quantitatively validated output. V1.5 can extend the model after a separate NIR phytoplankton/particle review.

This is a deliberate scientific constraint, not a UI limitation.

## 3. Optical-depth boundary

V1 assumes **optically deep water**.

The bottom contributes no measurable signal to the modeled remote-sensing reflectance.

V1 therefore has no water-depth control and no benthic reflectance term.

Shallow-water radiative transfer belongs to a later instrument or later mode.

## 4. Canonical definitions

### 4.1 Wavelength

- Symbol: `λ`
- Unit: nm
- Quantitative V1 interval: 400–700 nm
- Sampling interval: 1 nm

### 4.2 Absorption coefficient

- Symbol: `a(λ)`
- Unit: m⁻¹
- Type: inherent optical property (IOP)

Absorption is additive:

```text
a(λ) = aw(λ) + aph(λ) + ag(λ) + aNAP(λ)
```

where:

- `aw`: water absorption.
- `aph`: phytoplankton absorption.
- `ag`: CDOM / gelbstoff absorption.
- `aNAP`: non-algal particle absorption.

### 4.3 Scattering and backscattering

- Total scattering: `b(λ)`, m⁻¹.
- Total backscattering: `bb(λ)`, m⁻¹.
- Particle backscattering: `bbp(λ)`, m⁻¹.
- Water backscattering: `bbw(λ)`, m⁻¹.
- Type: IOP.

V1 uses:

```text
bb(λ) = bbw(λ) + bbp(λ)
```

The instrument must not call `bb` “scattering”. Backscattering is only the backward-hemisphere contribution.

### 4.4 Subsurface remote-sensing reflectance

- Symbol: `rrs(λ)`
- Definition: `Lu(0−, λ) / Ed(0−, λ)`
- Unit: sr⁻¹
- Type: apparent optical property (AOP)

It depends on the light field as well as the IOPs.

### 4.5 Above-water remote-sensing reflectance

- Symbol: `Rrs(λ)`
- Definition: `Lw(0+, λ) / Ed(0+, λ)`
- Unit: sr⁻¹
- Type: AOP

`Lw` is water-leaving radiance just above the interface. `Ed` is downwelling plane irradiance just above the interface.

V1 does not use `Rrs`, `ρw`, `Lw`, and normalized water-leaving radiance interchangeably.

If water-leaving reflectance `ρw` is introduced later, the convention must be declared. Under the common definition in NASA's ocean-color protocols, `ρw = π Rrs`.

### 4.6 IOP versus AOP contract

IOPs are properties of the medium and do not depend on the external illumination field.

V1 IOPs are:

- `aw`
- `aph`
- `ag`
- `aNAP`
- `a`
- `bbw`
- `bbp`
- `bb`

AOPs depend on the light field and geometry.

V1 AOPs are:

- `rrs`
- `Rrs`

The interface must never label `Rrs` as an IOP.

## 5. State variables

The model state must keep optical properties separate from constituent labels.

### 5.1 Temperature and salinity

V1 fixes:

- Temperature: **20 °C**
- Salinity: **35 PSU**

These values are used only to generate the pure-water/seawater baseline.

They are not exposed as primary controls in V1.

### 5.2 Chlorophyll-a

UI label: `CHLOROPHYLL`  
Model symbol: `Chl`  
Unit: mg m⁻³  
Default: **1.0 mg m⁻³**  
Interactive range: **0.02–25 mg m⁻³**  
Recommended control: logarithmic.

The range follows the concentration domain represented in Bricaud et al. (1998).

Chlorophyll is not itself an IOP. It parameterizes `aph(λ)` through an empirical bio-optical relationship.

In V1, changing `Chl` changes `aph` only. It does not automatically change `bbp`, `aNAP`, fluorescence, particle-size distribution, or any other covarying ecological property. The control is an isolated model intervention, not a complete bloom simulator.

### 5.3 CDOM amplitude

UI label: `CDOM`  
Model symbol: `ag440`  
Definition: `ag(440 nm)`  
Unit: m⁻¹  
Default: **0.05 m⁻¹**  
Interactive teaching envelope: **0–2.0 m⁻¹**.

The slider represents an absorption coefficient, not a CDOM mass concentration.

The chosen upper bound is an exploratory teaching envelope. It is not derived from the Babin et al. (2003) amplitude distribution and must not be presented as an empirical percentile, validity limit, or global natural maximum.

### 5.4 Non-algal particle absorption amplitude

UI label: `NON-ALGAL ABSORPTION`  
Model symbol: `aNAP443`  
Definition: `aNAP(443 nm)`  
Unit: m⁻¹  
Default: **0.02 m⁻¹**  
Interactive teaching envelope: **0–1.0 m⁻¹**.

This is an optical amplitude, not suspended-matter concentration.

### 5.5 Particle backscattering amplitude

UI label: `PARTICLE BACKSCATTER`  
Model symbol: `bbp443`  
Definition: `bbp(443 nm)`  
Unit: m⁻¹  
Default: **0.002 m⁻¹**  
Interactive teaching envelope: **0.0001–0.03 m⁻¹**  
Recommended control: logarithmic.

This state variable is independent of `aNAP443`.

This separation is mandatory. There is no universal relationship that converts a generic “particle concentration” into both non-algal absorption and particulate backscattering across all natural waters.

A simplified `PARTICLES` macro-control may exist in a beginner preset layer, but it must only move `aNAP443` and `bbp443` through a declared pedagogical coupling. Inspect mode must expose the two underlying optical variables separately.

### 5.6 Particle backscattering spectral slope

Model symbol: `eta`  
Unit: dimensionless  
V1 default: **1.0**

V1 keeps `eta` fixed in the primary UI.

Inspect mode may later expose an educational range of 0–2, but the model must label this as a spectral-shape assumption.

## 6. Component models

Each component is classified as a definition, published parameterization, or pedagogical assumption.

### 6.1 Pure water absorption — published parameterization

Use the Water Optical Properties Processor (WOPP) spectral absorption model at 20 °C and 35 PSU.

Because the generated browser baseline is evaluated at salinity 35 PSU, user-facing component labels should say `WATER / SEAWATER BASELINE` or `BASELINE`, not imply a zero-salinity pure-water spectrum.

Implementation strategy for V1:

1. Generate a static table outside the browser.
2. Store 1 nm values with source metadata.
3. Do not execute the full WOPP model in the browser.
4. Preserve the source temperature, salinity, wavelength range, and units next to the table.

The WOPP wrapper used by RrsTrans documents spectral absorption from 300–4000 nm and follows the WOPP technical report.

NASA GIOP independently documents its pure-water absorption spectral constants as based on Pope & Fry (1997) and Kou et al. (1993).

### 6.2 Pure seawater backscattering — published physical model

Use Zhang, Hu & He (2009) at 20 °C and 35 PSU.

WOPP implements this scattering model and notes that the total scattering coefficient is divided by two to obtain backscattering:

```text
bbw(λ) = bw(λ) / 2
```

V1 stores the generated `bbw` table rather than recomputing the seawater thermodynamic model in JavaScript.

### 6.3 Phytoplankton absorption — published empirical bio-optical model

For 400–700 nm V1 uses the original Bricaud et al. (1998) empirical total phytoplankton absorption relationship:

```text
aph(λ) = Aphi(λ) · Chl ^ Ephi(λ)
```

The published/source table contains both total-particle `Ap/Ep` and phytoplankton `Aphi/Ephi` coefficient pairs. V1 uses `Aphi/Ephi`.

This is distinct from chlorophyll-specific absorption:

```text
aph*(λ) = Aphi(λ) · Chl ^ [Ephi(λ) - 1]
```

and from NASA GIOP-DC's normalized phytoplankton spectral basis. V1 computes total `aph` directly because chlorophyll is an explicit teaching state variable rather than an inversion magnitude.

The Round 2 implementation vendors a verified coefficient table with provenance. The primary equation is Bricaud et al. (1998). The frozen coefficient table is cross-checked against the BSD-licensed `ocean-colour/ocpy` implementation and the NASA/OCSSW representation.

Do not use an arbitrary normalized phytoplankton spectrum in place of the Bricaud parameterization.

Do not extrapolate the Bricaud coefficients beyond 400–700 nm.

### 6.4 CDOM absorption — published spectral form

Use an exponential spectrum referenced to 440 nm:

```text
ag(λ) = ag440 · exp[-Sg · (λ - 440)]
```

V1 fixes:

```text
Sg = 0.0176 nm⁻¹
```

Babin et al. (2003) reported a mean CDOM spectral slope near 0.0176 nm⁻¹ with standard deviation about 0.0020 nm⁻¹ across diverse European coastal waters. The study also reported statistically significant regional differences, so the mean slope is not universal.

Future Inspect mode can expose `Sg`, but V1 keeps it fixed so users learn amplitude effects before spectral-shape uncertainty. Inspect mode must identify 0.0176 nm⁻¹ as a fixed mean, not a natural constant.

### 6.5 Non-algal particle absorption — published spectral form

Use:

```text
aNAP(λ) = aNAP443 · exp[-SNAP · (λ - 443)]
```

V1 fixes:

```text
SNAP = 0.0123 nm⁻¹
```

Babin et al. (2003) reported an average NAP spectral slope of about 0.0123 nm⁻¹ with standard deviation about 0.0013 nm⁻¹.

The exponential is a model form, not a universal particle law. Babin et al. documented regional variation and spectral departures, including mineral-associated structure and Baltic spectra that departed from the exponential fit at shorter wavelengths.

### 6.6 Particle backscattering — published spectral form with fixed pedagogical slope

Use a power law:

```text
bbp(λ) = bbp443 · (443 / λ) ^ eta
```

Power-law spectral shapes are standard in semi-analytical ocean-color models.

V1 sets `eta = 1.0` as an explicit pedagogical assumption.

The instrument must not imply that `eta = 1` is universal.

## 7. Total IOP model

For every quantitative wavelength:

```text
a(λ) =
  aw(λ)
  + aph(λ)
  + ag(λ)
  + aNAP(λ)
```

and:

```text
bb(λ) =
  bbw(λ)
  + bbp(λ)
```

All component budgets must remain available to the wavelength probe.

## 8. IOP-to-rrs forward model

V1 uses the quasi-single-scattering form used by NASA GIOP-DC and attributed to Gordon et al. (1988).

First:

```text
u(λ) = bb(λ) / [a(λ) + bb(λ)]
```

Then:

```text
rrs(λ) = g0 · u(λ) + g1 · u(λ)^2
```

with the NASA GIOP-DC default constants:

```text
g0 = 0.0949
g1 = 0.0794
```

Classification: published semi-analytical approximation.

These constants do not resolve full bidirectional geometry.

V1 must therefore describe the output as a simplified nadir-like teaching reflectance, not a full BRDF solution.

## 9. rrs-to-Rrs interface model

Use the Lee et al. (2002) interface approximation:

```text
Rrs(λ) = 0.52 · rrs(λ) / [1 - 1.7 · rrs(λ)]
```

The inverse relation is:

```text
rrs(λ) = Rrs(λ) / [0.52 + 1.7 · Rrs(λ)]
```

Classification: empirical interface-transfer approximation derived from radiative-transfer simulations.

This transformation is not a full angular correction.

RrsTrans includes several more geometry-aware transfer models. Those belong to a future advanced mode, not V1.

## 10. Atmosphere contract

V1 does **not** numerically simulate top-of-atmosphere radiance.

The conceptual light-path scene can show:

```text
solar input
→ atmospheric path
→ air-water interface
→ in-water field
→ water-leaving radiance
→ sensor
```

But numerical V1 begins at the water optical properties and produces idealized above-water `Rrs`.

The interface must not present a synthetic `L_TOA` curve as a physically solved radiative-transfer result.

V1.5 can introduce a separately validated atmospheric signal-decomposition model.

## 11. Geometry contract

V1 may display sun and sensor geometry for conceptual orientation.

A drawn surface-reflection or glint path must be labeled `EXCLUDED` or equivalent. It must not visually merge with the modeled water-leaving `Rrs` path.

Changing geometry must not alter the numerical Rrs unless a geometry-dependent radiative-transfer or interface model has been implemented and documented.

Therefore V1 geometry controls, if present, must be labeled conceptual.

## 12. Measured, derived, and modeled quantities

The record and Inspect mode must identify the epistemic status of every quantity.

### User/model inputs

- `Chl`
- `ag440`
- `aNAP443`
- `bbp443`
- fixed `eta`
- fixed temperature
- fixed salinity

### Derived IOPs

- `aw(λ)`
- `aph(λ)`
- `ag(λ)`
- `aNAP(λ)`
- `a(λ)`
- `bbw(λ)`
- `bbp(λ)`
- `bb(λ)`

### Derived AOPs

- `u(λ)`
- `rrs(λ)`
- `Rrs(λ)`

The UI must never imply that a satellite directly measures chlorophyll, CDOM concentration, `a`, or `bb`.

## 13. Wavelength probe contract

At a selected wavelength the probe must show at least:

```text
λ
aw
aph
ag
aNAP
a_total

bbw
bbp
bb_total

u
rrs
Rrs
```

Units must remain visible.

The absorption budget and backscattering budget must use the same computed arrays as the plotted spectra. The visualization cannot maintain a second approximate set of values.

## 14. Pedagogical reference states

Reference states are reproducible teaching scenarios. They are not canonical natural-water classes.

### CLEAR OCEAN

```text
Chl       = 0.10 mg m⁻³
ag440     = 0.02 m⁻¹
aNAP443   = 0.005 m⁻¹
bbp443    = 0.0007 m⁻¹
eta       = 1.0
```

Expected behavior: blue-green water-leaving spectrum, weak non-water absorption, low particulate backscatter.

### PHYTOPLANKTON-RICH

```text
Chl       = 10.0 mg m⁻³
ag440     = 0.05 m⁻¹
aNAP443   = 0.02 m⁻¹
bbp443    = 0.005 m⁻¹
eta       = 1.0
```

Expected behavior: stronger phytoplankton absorption structure, depressed blue/red regions relative to green, with reflectance magnitude also controlled by independent backscattering.

### CDOM-RICH

```text
Chl       = 1.0 mg m⁻³
ag440     = 0.80 m⁻¹
aNAP443   = 0.02 m⁻¹
bbp443    = 0.002 m⁻¹
eta       = 1.0
```

Expected behavior: strong suppression of short-visible Rrs.

### PARTICLE-RICH

```text
Chl       = 2.0 mg m⁻³
ag440     = 0.10 m⁻¹
aNAP443   = 0.50 m⁻¹
bbp443    = 0.020 m⁻¹
eta       = 1.0
```

Expected behavior: much stronger particulate optical influence; reflectance magnitude can remain high despite particle absorption because absorption and backscattering are independent variables.

The UI must not shorten this preset to `TURBID`. Turbidity is an observational quantity and is not equivalent to either `aNAP` or `bbp`.

The reference states must be validated numerically in Round 2 before they become UI presets.

## 15. Visual color contract

Any displayed water color / RGB swatch is **illustrative** unless a documented colorimetric conversion from a defined spectrum, illuminant, and observer function is implemented.

The instrument must not claim that a CSS color is the literal apparent color seen by a human observer.

## 15.1 Plot-scale contract

V1 spectral plots use zero-based linear y-axes with automatic per-state scaling.

Automatic scaling is allowed only when the current y-axis range is explicitly visible next to each plot. A curve becoming visually taller or shorter after an intervention must not be interpretable without its numeric scale.

The UI must label this behavior as `AUTO Y` or equivalent. Exact wavelength-probe values remain the preferred magnitude comparison across different states.

## 15.2 Sensor Observation Layer

V1.5 adds a pedagogical sensor-sampling layer after the continuous above-water `Rrs(λ)` calculation.

The causal boundary is:

```text
water state
  ↓
continuous Rrs(λ)
  ↓
sensor bandpass integration
  ↓
band-averaged Rrs
```

Changing the selected sensor must not change the water state, IOPs, `u`, `rrs`, or continuous `Rrs`.

V1.5 uses simplified rectangular bandpasses derived from official nominal centre wavelengths and bandwidths or published wavelength ranges. It does not claim to reproduce measured detector-specific relative spectral response functions.

A band is not numerically sampled when its full simplified support extends outside the quantitative 400–700 nm water-model domain.

Supported teaching definitions:

- Sentinel-3 OLCI nominal visible bands through Oa10.
- PACE OCI simplified nominal 5 nm teaching mode inside 400–700 nm.
- Sentinel-2A MSI B01–B04.
- Landsat 8/9 OLI B1–B4.

The output remains idealized above-water `Rrs`. It is not top-of-atmosphere radiance, calibrated sensor DN, or an atmospherically corrected satellite product.

## 16. V1 exclusions

V1 intentionally excludes:

- atmospheric correction;
- quantitative top-of-atmosphere radiance;
- aerosol retrieval;
- Rayleigh correction;
- adjacency effects;
- whitecaps;
- sunglint correction;
- polarization;
- Raman scattering;
- chlorophyll fluorescence;
- full BRDF / bidirectional correction;
- shallow-water / bottom reflectance;
- water depth;
- substrate type;
- vertical IOP profiles;
- multiple phytoplankton functional types;
- explicit particle-size distribution;
- full scattering phase functions;
- full measured detector-specific or time-dependent sensor SRF/RSR convolution;
- sensor bands outside the validated 400–700 nm water-model domain;
- OCx / OCI retrieval;
- QAA inversion;
- OWT classification.

These are not missing features. They are outside the V1 scientific contract.

## 17. Required numerical assertions for Round 2

The model-engine test suite must include all of the following.

### Identity and composition

- Every returned array has the configured wavelength count.
- All modeled IOP values are finite.
- All modeled IOP values are non-negative in the quantitative domain.
- `a = aw + aph + ag + aNAP` within numerical tolerance.
- `bb = bbw + bbp` within numerical tolerance.
- `0 <= u < 1`.

### Interface transformation

- `Rrs` is finite and non-negative.
- `1 - 1.7*rrs` remains positive for every accepted state.
- `Rrs -> rrs -> Rrs` round-trips within numerical tolerance.

### Causal behavior

Holding every other parameter fixed:

- increasing `ag440` must increase short-visible absorption more than long-visible absorption;
- increasing `aNAP443` must increase absorption with the declared exponential spectral slope;
- increasing `bbp443` must increase `bb` at all modeled wavelengths;
- changing `bbp443` must not change any absorption component;
- changing `aNAP443` must not change `bbp`;
- increasing `Chl` must change `aph` according to the Bricaud coefficient tables, not a generic multiplicative scaling.

Do not encode a simplistic test such as “more chlorophyll always makes Rrs greener.” That statement is not a universal numerical invariant.

### Reference-state regression

Store reference outputs for the four pedagogical states.

Each future model change must show whether those spectra changed and why.

## 18. Provenance and data packaging

Scientific tables must be versioned as repository assets.

Each asset must include metadata:

- source publication or source dataset;
- source URL / DOI;
- source version or commit when applicable;
- wavelength unit;
- optical-property unit;
- interpolation method;
- temperature/salinity assumptions;
- transformation applied before storage;
- generation date;
- generator script path.

Do not fetch scientific coefficient tables dynamically from GitHub at runtime.

Do not depend on another repository's `main` branch at runtime.

Round 2 should generate frozen assets through a reproducible script and commit both the source metadata and generated table.

## 19. Reference implementation policy

External repositories are references, not runtime dependencies.

Pinned reference commits reviewed during this contract:

- `lmschwenger/sambuca_core@9fcffb3619f01630568d433066f01dfbcf4a0d2f` — semi-analytical aquatic forward-model architecture and SIOP organization.
- `bishun945/RrsTrans@900a51bbf538d0cb2085caa1b190d9ea6310ec6a` — WOPP wrapper and rrs/Rrs interface models.
- `bishun945/pyOWT@fabe9cd0322b144c087ab39da1d6748734817fe0` — later OWT and sensor-response reference.
- `acolite/acolite@8e04b9753be412e248f01a17524a2e82f081d31c` — later atmospheric-correction boundary and terminology.
- `nasa/oceandata-notebooks@540390bb089a1d24cb9f44766cea33e681d3894b` — NASA processing-chain and educational terminology reference.

Scientific equations should be cited to primary literature or authoritative ATBDs, not merely to these implementations.

Do not copy code or data from a reference repository until its license and the upstream data license have been verified.

## 20. Authority hierarchy

When sources disagree, use this priority:

1. Current NASA / IOCCG technical documentation for terminology and operational definitions.
2. Primary peer-reviewed literature for equations and parameterizations.
3. Original technical reports for models such as WOPP.
4. Maintained scientific implementations as cross-checks.
5. Teaching notebooks and secondary explanations.

A convenient implementation is not allowed to override a higher-authority definition.

## 21. Core references

### Definitions and semi-analytical framework

- NASA Ocean Biology Processing Group. *Inherent Optical Properties*, Algorithm Theoretical Basis Document, v1.0, 10 April 2024. DOI: 10.5067/ZGBW3QECROJ2.
- NASA Ocean Color protocols / technical memorandum on normalized water-leaving radiance and remote-sensing reflectance.
- IOCCG (2006). *Remote Sensing of Inherent Optical Properties: Fundamentals, Tests of Algorithms, and Applications*. Report No. 5, Z.-P. Lee (ed.).
- Gordon, H. R., Brown, O. B., Evans, R. H., Brown, J. W., Smith, R. C., Baker, K. S., & Clark, D. K. (1988). A semianalytic radiance model of ocean color.
- Lee, Z.-P., Carder, K. L., & Arnone, R. A. (2002). Deriving inherent optical properties from water color: a multiband quasi-analytical algorithm for optically deep waters. *Applied Optics*, 41, 5755. DOI: 10.1364/AO.41.005755.

### Pure water

- Pope, R. M., & Fry, E. S. (1997). Absorption spectrum (380–700 nm) of pure water. *Applied Optics*, 36, 8710–8723. DOI: 10.1364/AO.36.008710.
- Zhang, X., Hu, L., & He, M.-X. (2009). Scattering by pure seawater: effect of salinity. *Optics Express*, 17, 5698–5710. DOI: 10.1364/OE.17.005698.
- Röttgers, R., Doerffer, R., McKee, D., & Schönfeld, W. (2016). *The Water Optical Properties Processor (WOPP): Pure Water Spectral Absorption, Scattering and Real Part of Refractive Index Model*. WOPP-ATBD/WRD6.

### Non-water absorption

- Bricaud, A., Morel, A., Babin, M., Allali, K., & Claustre, H. (1998). Variations of light absorption by suspended particles with chlorophyll-a concentration in oceanic waters. *JGR Oceans*, 103, 31033–31044. DOI: 10.1029/98JC02712.
- Babin, M., Stramski, D., Ferrari, G. M., Claustre, H., Bricaud, A., Obolensky, G., & Hoepffner, N. (2003). Variations in the light absorption coefficients of phytoplankton, nonalgal particles, and dissolved organic matter in coastal waters around Europe. *JGR Oceans*, 108, 3211. DOI: 10.1029/2001JC000882.

### Modern natural-water context

- Bi, S., Hieronymi, M., & Röttgers, R. (2023). Bio-geo-optical modelling of natural waters. *Frontiers in Marine Science*, 10, 1196352. DOI: 10.3389/fmars.2023.1196352.

## 22. Round 1 acceptance decision

Round 1 is complete when all of the following are true:

- `Rrs`, `rrs`, IOP, and AOP have unambiguous definitions.
- Every displayed quantitative variable has one unit.
- The V1 wavelength validity boundary is explicit.
- The water, phytoplankton, CDOM, NAP, and particle-backscatter models have named sources.
- The forward-model coefficients are fixed.
- The interface-transfer coefficients are fixed.
- Concentration variables are not confused with optical coefficients.
- Particle absorption and particle backscattering remain independent.
- Atmosphere and geometry are explicitly outside the quantitative V1 model.
- The limitations are part of the contract rather than deferred UI copy.

## 23. Round 2 implementation target

Round 2 builds the scientific engine only.

Expected files:

```text
site/water/
├── water-model.js
├── water-data.js
├── data/
│   ├── pure-water-20c-35psu.csv
│   ├── bricaud-1998-aph.csv
│   └── SOURCES.md
└── README.md

scripts/
└── build-water-optics-data.*

tests/
└── water-model.*
```

Round 2 must not implement the final Lab UI.

Its exit condition is a deterministic function that accepts the declared state and returns the complete component spectra, total IOPs, `u`, `rrs`, and `Rrs`, with the tests in Section 17 passing.
