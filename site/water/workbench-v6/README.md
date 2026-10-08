# Water as Spectrum V6 — Local Spectral Sensitivity

Deployment candidate for GeoGeek Lab. Replaces V5 as the preferred Water instrument while retaining V5 and original Water imports as fallbacks on **module load failure**.

## Feature

Seven workspaces: PATH, IOP, ATM, SENSOR, AC, A/B and **SENSITIVITY**. The sensitivity tool computes finite differences of the existing 400–700 nm semi-analytical Rrs forward model for chlorophyll-a, CDOM absorption, non-algal particle absorption, particulate backscattering and the spectral backscattering exponent. Numerical perturbation choices are 1%, 5%, 10% and 20%.

Outputs: the local two-point Rrs derivative, an upper-perturbation delta Rrs, baseline/low/high spectral overlays, and wavelength-wise CSV/JSON containing 301 samples. Near parameter bounds the method is explicitly one-sided or asymmetric. These perturbations are *numerical differentiation steps*, not measurement uncertainty, parameter identifiability or validated inversion performance.

## Integration

- `app/index.html` is the standalone ES-module-bundled V6 application (self-contained).
- `instrument.js` mounts the application in an origin-validated, same-origin iframe using the GeoGeek `GeoGeekInstrumentMounts.water` contract.
- `instrument.css` scopes changes to Water only.
- `site/core/modules.js` prefers V6 and retains V5/legacy import fallbacks.
- Versioned Lab links and the HTML release marker are changed to `20261008v6` to invalidate previously cached loaders.
- Former V3-only Water browser assertions are migrated to iframe-aware V6 integration checks.

The iframe ready/escape postMessage contract continues using the V5 message names; these refer to the compatibility protocol, not to the app version. **Runtime iframe load failures after module import are not covered by the fallback** and should be rolled back by reverting the loader version in core/modules.js.

## Tests

The original modular source package is provided separately as `water_as_spectrum_v6_sensitivity_source.zip`. Local run: `node --test tests/*.test.mjs` from the unpacked `app/` folder (24 tests). The repo browser suite has updated Water tests to run against the real Lab shell.

Deployment validation must include the deep link `lab.html?instrument=water#l13`, the seven workspaces, export/import, close/reopen, narrow viewports, console errors and other instruments. GitHub Pages deployment success alone does not imply independent scientific validation.

## Scientific limitations

The forward physics is unchanged from V5 and includes simplified first-order atmospheric scattering, optically deep water, nominal rectangular sensor bands, Float32-packed optical coefficient tables and a 301-sample wavelength grid. It is **not** an independently validated operational ocean-color atmospheric-correction or radiative-transfer model.

## Rollback

To revert the V6 entry, restore the V5 loader preference in `site/core/modules.js` and bump the versioned `core/modules.js` reference / release meta in `site/lab.html`. No V5 assets or original legacy Water calculation files are overwritten.
