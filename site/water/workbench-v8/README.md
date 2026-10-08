# Water as Spectrum V8 — Measured Sensor Response

## Release scope

V8 adds a side-by-side **NOMINAL TOP-HAT / PUBLISHED MEASURED SRF** selector, a **MEASURED SRF PROFILE** view, and instrument-band reflectance integration using published relative spectral response values rather than a Gaussian reconstruction.

The existing first-order water optics, atmosphere, correction, 400–700 nm spectral grid, chart hover/probe, and seven task workspaces are unchanged. Measured response is used in both SENSOR and SENSOR BAND RESPONSE sensitivity where selected. Model values remain **teaching simulations, not independently validated satellite products**.

## Source and reproducibility

Response profiles are transformed *without spectral shape fitting* from the publicly distributed, 1 nm tab-separated tables in [jbferet/prosail](https://github.com/jbferet/prosail/tree/master/data-raw). The publisher refers to their values as satellite spectral-response data. Related agency references: [Copernicus Sentinel-2 SRF documentation](https://sentiwiki.copernicus.eu/web/s2-documents); [USGS Landsat Spectral Characteristics](https://landsat.usgs.gov/spectral-characteristics-viewer).

The exact originating official ESA/USGS version for each CSV in this secondary source has **not been independently established**, so the UI says *published measured SRF* and **does not** claim to contain the latest agency version, instrument detector-level SRFs, or on-orbit time-varying calibration.

| Platform | Source Git blob SHA | Supported complete measured visible bands |
|---|---|---|
| Sentinel-2A MSI | `be6c8291507aadfb75d9abcef6689be1600144dd` | B02, B03, B04 |
| Sentinel-2B MSI | `94753de9654d69ec3be6f19c4b27bf7aa4c8381b` | B02, B03, B04 |
| Landsat 8 OLI | `8092b059b8c9d46ca8dadfb159b5a0654554464d` | B1, B2, B3, B4 |

The published Sentinel-2A/B CSVs do **not** contain the B01 coastal response, which is therefore `UNAVAILABLE` in measured mode. OLCI and PACE OCI are deliberately restricted to nominal rectangular mode. Landsat 9 must not be inferred from the Landsat 8 measured profile. All response samples and their original full-domain areas are retained in `srf/measured-response-data.js` with per-platform Git SHA, band/column mapping, and support ranges.

## Numerical method and constraints

For a spectral signal `X(λ)`, the measured-band average uses

```
     sum_i 0.5 * [S_i * X_i + S_(i+1) * X_(i+1)] * Δλ
X̄ = ----------------------------------------------------
          sum_i 0.5 * [S_i + S_(i+1)] * Δλ
```

The **coverage fraction** is the response-function mass inside the simulated domain divided by its complete, published-domain response mass. `FULL` requires at least 0.999999 of that mass, otherwise `PARTIAL` with null output. A band absent from the source is `UNAVAILABLE` with null output. No extrapolation and no nominal/Gaussian substitution in measured mode. SRF is a dimensionless weighting function. Rrs outputs are in sr⁻¹; TOA approximate reflectance outputs are dimensionless.

A/B scenarios and continuous forward spectra are unchanged. Band finite-difference sensitivity convolves the reference, lower and upper simulated Rrs using **the same selected response table**, and excludes incomplete/unavailable bands from rank. The rank still does not represent sensor SNR, detection limit, identifiability or retrieval skill.

## UI workflow

1. Select **SENSOR**, choose **MSI** or **OLI**.
2. Choose **PUBLISHED MEASURED SRF**; for MSI, select **S2A** or **S2B**.
3. Switch between **TOA BANDS**, **Rrs BANDS**, **MEASURED SRF PROFILE**. Select individual band IDs to see the measured-vs-nominal shape.
4. Open **SENSITIVITY → SENSOR BAND RESPONSE** for equivalent matched-SRF derivative/elasticity results.
5. Export JSON (schema v5) or band sensitivity CSV to preserve response mode, platform and source SHA. Old experimental JSON schema v3/v4 remains importable, defaulting to nominal.

## Integration and rollback

The native GeoGeek instrument loader selects `site/water/workbench-v8/instrument.js` with V7, V6, V5 and legacy module-import fallbacks. The same-origin iframe loads the *versioned* pinned SRF dataset before the V8 application entry, and retains the V7.1 responsive chart fix.

**Important:** A missing SRF data script yields null/unavailable measured values rather than guessed results. A runtime iframe initialization failure after module import is not covered by the import fallback; rollback by restoring the prior Water entry in `site/core/modules.js` and refreshing Lab cache tokens. Older V7 assets are not overwritten.

## Tests

Run `node --test site/water/workbench-v8/tests/measured-srf.test.mjs` from the repository root; GitHub Quality and Pages must run this before acceptance. Native Lab browser regression must verify the measured/nominal toggle, missing SRF handling, sensor platform switch, source identity, probe interaction, mobile layout, and exports.

**Scientific status:** no independently validated ocean-color RT, no measured OCI/OLCI tables in this version, and no instrument SNR/noise model.
