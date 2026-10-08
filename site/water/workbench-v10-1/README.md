# Water as Spectrum V10.1 — WATER RT numerical reference workbench

**Release status:** engineering implementation, pending independent numerical-RT review. A green CI checks computational reproducibility, structural and browser behavior; it does **not** establish accuracy against HydroLight, DISORT or in situ radiometry.

## Implemented science and UI

A ninth **WATER RT** tab presents three coordinated, unit-aware views:

1. **DEPTH** — normalized downwelling and upwelling plane irradiance `Ed(z)/Ed_direct(0−)`, `Eu(z)/Ed_direct(0−)`, and local `Kd(z) = −d ln Ed / dz` (m⁻¹), sampled at 10 discrete depths between 0 and 20 m.
2. **UPWARD ANGLES** — eight Gauss–Legendre upward propagation zenith nodes, showing **azimuth-averaged** `Lu(z,μ)/Ed_direct(0−)` in sr⁻¹, *not* full `L(z,θ,φ)` and not a physical-ray animation.
3. **MATCHED rrs / RT** — five sampled subsurface, near-nadir `rrs` values from the independent numerical solver compared with V10.0's below-water Gordon/GIOP-style semi-analytical `rrs`, evaluated with the **same case IOPs**, including residual RMSE and mean bias. **Above-water** `Rrs` is not used here because the RT reference omits refraction and surface Fresnel transfer.

The visual treatment uses restrained scientific line charts, labelled units, explicitly fixed measurement domains, source-identity status and a persistent assumptions footer. No animation pretends to display numerical photon tracks.

Users select a water class (clear, phytoplankton-rich, CDOM-rich), prescribed solar zenith 0°/30°/60° **inside the water**, spectral samples 440/490/550/620/680 nm and a depth. It is a **discrete-grid selection**, not unrestricted RT forward-model inference or interpolated measurements. "Load matched water IOP & nominal sun state" copies the archived parameters to the current workbench. When current IOPs differ, the UI says that the comparison uses the fixed archived paired results; it never plots mismatched data as if they were a live paired model run.

## How the reference values are actually produced

The bundled `reference/rt-reference-v1.json` is **not copied from a published HydroLight database**. It contains 45 calculations independently produced for this software, from the version-pinned `reference/dom-solver.mjs` implementation:

- **Governing equation:** stationary monochromatic, horizontally homogeneous, scalar elastic radiative transfer with an azimuth-averaged source.
- **Numerics:** 16-stream Gauss–Legendre discrete ordinates, 32-angle azimuthal quadrature of a single-term Henyey–Greenstein (HG) phase function, source iteration to a relative maximum update below 2×10⁻⁶, and exponential short-characteristic sweeps.
- **Scattering closure:** user IOP `bb` is converted to total `b = bb/fb` using **an explicitly assumed** HG asymmetry factor `g=0.8`, whose numerical backscatter fraction is stored in the dataset. The angular kernel is discretely normalized.
- **Boundary:** normalized collimated direct downwelling plane irradiance `Ed_direct(0−)=1`, no top incident diffuse radiance, no bottom incoming radiance at an internal truncated boundary at least 12 attenuation optical depths below the surface.
- **Coverage:** three PSETS from *unmodified V10.0 water IOPs*, three fixed solar angles, five spectral nodes, 10 output depths, eight upward directional nodes.

All metadata, input IOPs, iteration residuals and solver ID travel with the reference file. Changing underlying parameters does **not** cause a claim that these original 45 solved cases apply outside their domain.

## Critical scientific limitations

1. **Not externally cross-validated.** No Hydrolight/DISORT/Monte Carlo agreement or numerical mesh-convergence table is claimed. Independent confirmation should precede a "research-grade reference" label. It is a *numerically independent RTE comparison* relative to the V10 semi-analytical model, not a community benchmark.
2. **No true sea surface:** the sun angle is set directly in water and neither Snell refraction nor Fresnel reflection/transmission is solved. Thus comparisons are to **subsurface** near-nadir `rrs`, never above-water `Rrs`.
3. **Not full angular field:** radiance is azimuth-averaged; sun-relative azimuthal structure, polarization, waves and wind are absent.
4. **Synthetic homogeneous ocean only:** no realistic particulate volume scattering function is inferred from measured `bb`, no bottom, atmosphere, Raman, fluorescence, or depth-varying constituents. Fixed `g=0.8` is an assumption, not a retrieval of particle shape.
5. **Near nadir only:** the smallest upward Gauss–Legendre `μ` is close to but not equal to −1. The semi-analytical mapping has its own viewing assumptions.
6. The finite-difference `Kd` is derived from solver output. The reference is NOT a measurement.

For a **separate published HydroLight numerical data source**, see Loisel et al., *Earth System Science Data*, 15, 3711–3731 (2023), https://doi.org/10.5194/essd-15-3711-2023 and the Dryad dataset https://doi.org/10.6076/D1630T. Those data were NOT downloaded or represented as the source of the V10.1 generated reference values. The older model-intercomparison paper is Mobley et al. (1993), https://doi.org/10.1364/AO.32.007484.

## Data, tests and versioning

- Static reference asset: `reference/rt-reference-v1.json`, offline dataset bundled with site.
- Solver: `reference/dom-solver.mjs`; numerical reproducibility check: `node scripts/verify-water-rt-reference.mjs`.
- Unit tests: `node --test site/water/workbench-v10-1/tests/rt-reference.test.mjs`.
- Browser: `npx playwright test tests/browser/water-v101.spec.mjs --project=desktop-chromium --project=mobile-chromium`.
- All V9 and V10.0 code remains at its old path, and V10.0 tests are pinned with `waterVersion=v10`. `waterVersion=v9` retains V9.
- Export uses **experiment JSON schema v8** and includes a source-identifiable `waterRT` reference selection; previous v3–v7 formats remain importable. A valid export with a failed reference fetch says `status:error` / `loading` rather than inventing numerical output.
- RT failure shows an explicit error with retry, and the numerical plots vanish. A failing V10.1 app mount falls back to explicitly labelled V10.0.

## Remaining research acceptance steps

External published-reference matchup for identical phase function and boundaries; convergence study across angular, vertical and azimuth resolution; and an error budget for applying natural-water volume scattering functions. These are **not silently implied** by CI success and should be scheduled as separate scientific validation work.

## Version release and rollback

The host defaults to `water/workbench-v10-1/instrument.js` after deployment. Optional query `waterVersion=v10` selects the unchanged V10.0 application; `waterVersion=v9` selects V9. Both retain separate storage keys. Roll back the production default via `site/core/modules.js`, increment release cache tags, and re-run Pages smoke tests.
