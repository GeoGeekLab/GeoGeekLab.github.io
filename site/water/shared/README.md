# Shared Water scientific assets

The supported Water UI uses this directory without depending on retired UI versions.
This migration changes file locations. It does not change numerical calculations or scientific status.

`provenance.json` records the archived source path, source commit, and SHA-256 digest for every copied asset.
`tests/water/shared-science.test.mjs` checks byte identity against these archived sources.

| Asset | Purpose | Original owner |
| --- | --- | --- |
| `srf/measured-response-data.js` | Published, source-pinned 1 nm spectral response tables | V9 SRF bundle; upstream jbferet/prosail |
| `srf/UPSTREAM-PROSAIL-GPL3.txt` | Preserved upstream GPL-3.0 license notice | V9 SRF bundle |
| `analysis/uncertainty-engine.js` | Local Fisher/Jacobian diagnostics | V9 scientific engine |
| `science-contract.js` | Scientific quantities, bounds and model identity | V10 scientific contract |
| `chart-fix.js` | Multi-series chart readouts and coordinate rendering | V9 presentation runtime |
| `reference/rt-reference-v1.json` | Fixed, internally generated RT reference | V10.1 reference dataset |
| `reference/dom-solver.mjs` | Independent scalar DOM reference solver | V10.1 reference solver |

The measured SRF data retain publisher URLs and upstream Git blob identifiers.
The copied license notice remains adjacent to the data.
Do not replace measured responses with analytic approximations under the measured label.

The RT dataset remains internally generated and externally unvalidated.
The migration does not add an air–water interface, directional azimuth physics, or field validation.
Run `node scripts/verify-water-rt-reference.mjs` to recompute all 45 fixed reference slices.
This check establishes numerical self-consistency, not external validation.
