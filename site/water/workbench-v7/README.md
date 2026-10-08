# Water as Spectrum V7 — Sensor-Aware Spectral Sensitivity

Release candidate. Adds **SENSOR BAND RESPONSE** as a fourth view in the seventh SENSITIVITY workspace. Does not modify water IOP, atmosphere, correction or spectral sampling models.

## What is computed

For each nominal rectangular sensor band (OLCI, PACE OCI, MSI or OLI), average the existing baseline, low-parameter and high-parameter Rrs spectra over exactly the same band support. Derivatives use (band Rrs_high - band Rrs_low)/(parameter_high - parameter_low). Delta is band Rrs_high - band Rrs_baseline. The dimensionless elasticity is (p / band Rrs) × ∂(band Rrs)/∂p for nonzero parameter and reflectance.

This means sensor-band derivatives are a *linear band integral of the same continuous finite differences*, not newly invented or independently calibrated sensor information. Incomplete spectral coverage (OLCI Oa01) results in status PARTIAL and null numerical values, and bands without elasticity are excluded from the magnitude ranking.

**Do not interpret rank as signal-to-noise ratio, retrieval accuracy, or parameter identifiability.** The band definitions are top-hat approximations, not measured time-dependent SRFs.

## Delivery

The app remains an isolated same-origin iframe under `GeoGeekInstrumentMounts.water`. Native GeoGeek Lab owns the dialog and deep link. The loader prefers V7, then V6, then V5, then the legacy Water module on **module import failure**, while all older assets remain available for rollback.

V7 retains the V6p1 responsive five-card PATH layout. The Lab release and cache token are `20261008v7`.

## Tests

- Independent modular project: 30 node tests, covering sensor integral consistency and parameter boundaries.
- Browser: 1440/920/390/320 px, seven workspaces, four sensor presets, CSV/JSON and zero console errors.
- Repository: V7 smoke test required in GitHub Quality and Pages workflows, plus native Lab browser tests.
- Production: GitHub Pages build, deploy and smoke must complete.

## Rollback

Change the Water loader preference back to `WATER_WORKBENCH_V6` in `site/core/modules.js`, then update the versioned Lab module script and release token. Existing V6p1 assets remain untouched. Later iframe runtime failures are not covered by the module-import fallback.

## Scientific scope

400–700 nm, 1 nm; equation-compatible first-order teaching model, Float32 source optical tables, optically deep water, simplified atmospheric scattering and rectangular sensor bandpasses. No independent scientific validation. No measured SRFs, spectral SNR, gas absorption, multiple scattering or adjacency correction.
