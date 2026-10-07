# Water as Spectrum — Round 5 Scientific Audit

Status: completed against V1 production model  
Instrument: `lab:l13 / water`  
Audit scope: numerical consistency, empirical-domain disclosure, terminology, and visualization semantics.

## Decision

No equation change was required.

The implemented V1 chain remains internally consistent:

```text
a = aw + aph + ag + aNAP
bb = bbw + bbp
u = bb / (a + bb)
rrs = 0.0949u + 0.0794u²
Rrs = 0.52rrs / (1 - 1.7rrs)
```

The Round 5 changes correct interpretation risks around those equations.

## Literature cross-check

### Bricaud phytoplankton parameterization

Bricaud et al. (1998) used observations spanning approximately 0.02–25 mg m⁻³ chlorophyll-a. V1 keeps that range as the chlorophyll control boundary.

The V1 intervention is deliberately narrower than a natural ecosystem response: changing `Chl` changes `aph` only.

### Babin CDOM and NAP slopes

Babin et al. (2003) reported:

- mean CDOM slope: 0.0176 nm⁻¹, SD 0.0020 nm⁻¹;
- mean NAP slope: 0.0123 nm⁻¹, SD 0.0013 nm⁻¹.

The paper reports regional variation and departures from a single exponential spectrum. Therefore V1 now labels these values as fixed study-wide means rather than universal constants.

### IOP-to-AOP relationship

The Gordon/GIOP form with coefficients 0.0949 and 0.0794 is retained.

The Lee et al. interface relationship between `rrs` and `Rrs` is retained.

Both remain explicitly classified as approximations. V1 is not a full angular radiative-transfer solver.

## Numerical envelope audit

A deterministic grid audit sampled 5 values for each accepted state variable:

```text
Chl      5 values
ag440    5 values
aNAP443  5 values
bbp443   5 values
eta      5 values

total states = 5^5 = 3125
wavelengths  = 301 per state
```

Observed audit extrema:

```text
max total a       = 5.9629989648 m⁻¹ at 400 nm
max total bb      = 0.0400925791 m⁻¹ at 400 nm
max Rrs           = 0.1072168586 sr⁻¹ at 400 nm
min 1 - 1.7*rrs  = 0.7404573633
```

These values describe the sampled teaching envelope. They are not claims about natural global maxima.

The interface denominator retained a substantial positive margin throughout the sampled accepted state space.

## Reference-state diagnostics

The four pedagogical states retain distinct expected behavior.

- CLEAR OCEAN remains blue-weighted.
- PHYTOPLANKTON-RICH increases phytoplankton absorption relative to CLEAR OCEAN.
- CDOM-RICH suppresses short-visible reflectance strongly enough that Rrs(443) < Rrs(560).
- PARTICLE-RICH has much larger particulate backscattering than CLEAR OCEAN and a stronger green reflectance response.

The internal object key remains `turbidParticleRich` for compatibility, but the UI no longer calls the state `TURBID`.

## Presentation corrections

### Automatic plot scaling

The three spectra use zero-based automatic y scaling.

This is useful for spectral shape, but silent rescaling can create a false magnitude comparison between states.

Each chart now exposes its current `AUTO Y · 0–max` range.

The wavelength probe remains the preferred exact magnitude comparison.

### Turbidity terminology

The preset label `TURBID` was removed.

The model controls `aNAP` and `bbp`; neither is a turbidity measurement. The user-facing state is now `PARTICLE-RICH`.

### Water baseline terminology

At 35 PSU, the generated baseline is not a zero-salinity pure-water case.

User-facing component budgets now use `baseline`, and the record describes a seawater baseline.

### Glint and sensor context

The dashed surface-reflection path is now labeled `GLINT PATH · EXCLUDED`.

Atmosphere and sensor labels now state `NOT MODELED`.

This prevents the PATH scene from implying that atmospheric correction, sunglint, or sensor band integration contributes to the numerical V1 `Rrs`.

## Automated acceptance checks

Round 5 adds tests for:

- the full 3125-state audit grid;
- finite and non-negative values;
- interface-domain margin;
- exact CDOM/NAP exponential identities;
- exact particle-backscatter power-law identity;
- reversible rrs/Rrs transformation through the modeled envelope;
- isolated intervention direction for CDOM, NAP, and particle backscatter;
- chlorophyll isolation from backscattering;
- reference-state diagnostic behavior;
- explicit `AUTO Y` browser labels;
- explicit fixed-mean / teaching-assumption disclosures;
- particle-rich terminology and glint exclusion.

## Remaining scientific limits

Round 5 does not validate V1 against an independent in-situ matchup dataset.

It verifies internal correctness and source consistency, not predictive accuracy for arbitrary natural waters.

A later validation round would require measured IOP/Rrs spectra with declared acquisition geometry and uncertainty.
