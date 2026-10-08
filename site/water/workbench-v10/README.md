# Water as Spectrum V10.0 — science-contract release

Status: **implementation candidate; pending CI, browser and scientific sign-off**.

## Scope and scientific classification
V10.0 is a version-isolated enhancement of the V9.1 **semi-analytical teaching model**. It is **not** a full angular/depth radiative-transfer solver, measured satellite inversion engine, or independently validated water-quality product.

Requirements: F01 (model identity and validity), F02 (V9 baseline and isolated CDOM/NAP slope variation), F03 (band validity and OC4 input traceability), F12 (versioned reproducible experiment export and legacy import). See project master PRD and `docs/WATER_AS_SPECTRUM_SCIENTIFIC_CONTRACT.md`.

## Main user changes

- Every workbench shows an expandable **MODEL / ASSUMPTIONS / VALIDITY** disclosure. The baseline remains a 400–700 nm, 1 nm semi-analytical `Rrs` calculation.
- WATER OPTICS advanced parameters permit bounded CDOM and NAP spectral-slope experiments. The default slopes `Sg=0.0176 nm^-1` and `SNAP=0.0123 nm^-1` retain V9 numerical output. A custom slope is explicitly labelled **V10_EXPLORATORY_CUSTOM_SLOPES**, not an empirically validated water state.
- OLCI Oa11 (708.75 nm) is shown only as a **sensor information/unsupported-band** example: the existing water forward model does **not** calculate that wavelength. It returns `out_of_model_domain` and no numerical value.
- ATM. CORRECTION retains the earlier **center-wavelength OC4** teaching diagnostic and additionally reports a **nominal OLCI band-integrated OC4** diagnostic. The two methods are not conflated. Neither is a NASA Level-2 product.
- JSON export uses **experiment schema v7**; the bounded import logic also accepts v3–v6 V9 teaching sessions with original fixed slopes and matching V9 scientific model IDs. V10 session persistence uses a distinct localStorage key and migrates the V9 state on first use.
- A scientific contract API supplies quantity definitions, valid domain checks, explicit band-quality states and a stand-alone **radiance-first** band-reflectance operation. The latter is not used to manufacture a `L_TOA` observation from `rho_TOA*`.

## Source and architecture

- `app/index.html`: derived from V9.1 with targeted V10 changes. V9 remains intact in `../workbench-v9/`.
- `science-contract.js`: explicit quantity/model/validity metadata and normalized SRF utility.
- `instrument.js`: V10 same-origin iframe adapter; startup failure falls back to V9 with a visible fallback notice.
- `../schemas/experiment-v7.schema.json`: export schema.
- Source-pinned measured SRF and Fisher engines are referenced from the retained V9 directory; these are not re-labelled as new measurements.
- The host uses V10 by default. Add `waterVersion=v9` to the Lab URL to intentionally open V9 for regression comparison.

## Known limits / deferred requirements

1. There is **no** independent underwater radiative-transfer reference solution in V10.0. Planned for F04/F05 and V10.1.
2. The atmosphere remains first-order and neglects multiple scattering, Rayleigh–aerosol coupling, polarization, gas absorption and sea-surface corrections.
3. No calibrated TOA spectral radiance or extraterrestrial solar irradiance is supplied; the operational radiance-first path is a validated interface only and is marked unavailable in the current UI.
4. OLCI/OCI are nominal rectangular-response teaching configurations; published measured S2A/S2B MSI and Landsat 8 OLI SRF tables retain their documented provenance and gaps.
5. V10 experimental slopes are not claimed to be a natural-water parameter-covariance model. They have teaching-domain bounds but are not new empirical accuracy limits.
6. V9 uncertainty diagnostics still assume independent, common-variance hypothetical band errors. No field uncertainty is inferred.
7. V10.0 does not add fluorescence, shallow-water bottom contribution, Monte Carlo, full inversion or measured-data matchup validation.
8. The schema describes new exports. Browser import additionally performs bound and model identity checks. Formal schema validation by a standalone third-party JSON Schema validator is deferred.

## Tests and reproducibility

```sh
node --test site/water/workbench-v10/tests/v10-scientific-contract.test.mjs
npx playwright test -c playwright.config.mjs tests/browser/water-v10.spec.mjs --project=desktop-chromium --project=mobile-chromium
```

The CI pipeline must also run the existing V9 numerical and browser regression suites. A full V10 release requires passing Quality and Pages, an accessible live public URL, and scientific-owner review for model descriptions and tests. A code commit or PR by itself is **not** a deployment.

## Rollback

1. Open `/lab.html?instrument=water&waterVersion=v9#l13` to compare with V9 without altering any stored state.
2. To roll back the production default, remove the V10 preferred import in `site/core/modules.js` or revert its V10 loader commit, then increment the Lab cache token.
3. Keep V9 assets and schema 3–6 importability. Never silently re-interpret a V10 custom slope experiment as a V9 fixed-slope experiment.
