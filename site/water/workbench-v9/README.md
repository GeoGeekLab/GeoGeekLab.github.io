# Water as Spectrum V9 — Uncertainty & Identifiability

**Scope:** local, conditional, assumption-driven information diagnostics using the existing GeoGeek first-order ocean-color forward model. This is **not** a satellite data inversion engine, an empirically calibrated uncertainty budget, or an instrument noise specification.

## New eighth workspace

**UNCERTAINTY** offers INFORMATION, JACOBIAN, CORRELATIONS. Select any subset of the five independently modeled water parameters:

- Chl-a (mg m⁻³)
- CDOM absorption at 440 nm, a_g (m⁻¹)
- NAP absorption at 443 nm, a_NAP (m⁻¹)
- Particulate backscatter at 443 nm, b_bp (m⁻¹)
- Particle-backscatter spectral exponent η (dimensionless)

Use the already selected sensor and SRF configuration from V8: nominal OLCI/OCI/MSI/OLI or **published measured** Sentinel-2A/B MSI and Landsat 8 OLI. Measured SRF source SHA and missing/partial status propagate to the diagnostics. The *only* admissible observation channels have complete SRF support and finite modeled Rrs.

## Mathematics and noise assumptions

For the selected water parameter subset p and simulated band-mean water-leaving Rrs observation vector y(p):

1. Evaluate the bounded two-sided finite difference J_ij ≈ [y_i(p + h_j) − y_i(p − h_j)]/[p_j(+) − p_j(−)]. At a physical bound this is an explicit one-sided derivative. The user chooses 1%, 5%, or 10% local steps. The finite-difference formula is in **physical parameter units**.
2. Transform each parameter to an explicit dimensionless-scaled analysis coordinate q_j = (p_j − p_j,0)/s_j using fixed physical scales s = (1 mg m⁻³, 0.1 m⁻¹, 0.1 m⁻¹, 0.01 m⁻¹, 1). The scaled Jacobian is Jq_ij = J_ij s_j. This prevents concentration/backscatter unit magnitudes from obscuring the matrix conditioning.
3. Assume all valid band-averaged Rrs observations have **independent, zero-mean Gaussian errors with the same user-selected σ**, chosen from {0.000005, 0.000020, 0.000100} sr⁻¹. This is a *hypothetical scenario*, **not** instrument SNR or measured atmospheric-correction noise. Real uncertainty is typically spectrally correlated.
4. Construct F = (Jq/σ)ᵀ(Jq/σ). Diagnose eigenvalues of the symmetric F using Jacobi rotations, rank threshold max(1e-12,1e-9 λ_max), normalized-Jacobian condition √(λ_max/λ_min), and the weakest spectral-information direction.
5. **Only when numerically full rank** compute Cq = F⁻¹ and physical parameter C_p,ij = s_i Cq,ij s_j, with formal 1σ = √C_p,ii and correlations C_p,ij/(σ_iσ_j). No pseudoinverse is passed off as finite parameter uncertainty. Rank-deficient cases show **RANK DEFICIENT / covariance null**. Full-rank but weakly conditioned cases remain marked as fragile.

This is a local Fisher/Cramér–Rao type *formal* covariance conditional on the model, selected parameter subset, noise assumptions and neglect of biases. It does not account for parameter bounds in probability space, model structural uncertainty, calibration drift, adjacency effects, correlated atmosphere-correction errors, scene variability or regularization. It does **not** certify inverse identifiability away from the current state.

## Output and reproducibility

- The **Jacobian view** lists every complete-coverage band and dRrs/dp in physical units, shaded by |(J·s)/σ|.
- **Information view** shows usable channels, numerical rank, condition, weakest singular/eigen mode and conditional standard deviations, with missing covariances left null.
- **Correlations view** shows the local parameter correlation matrix **only if full rank**.
- **Export Jacobian CSV** outputs one row per band, response coverage/status, derivatives, parameter subset, assumed σ, step, and source SHA. Unusable bands carry missing numerical entries.
- **Experiment JSON schema v6** stores session controls and a complete rank-aware covariance/diagnostic object when the UNCERTAINTY tab is active. Previous schema 3/4/5 files remain importable and default to the documented V9 assumptions. Session persistence migrates the previous V8 localStorage key.

## Test plan

\`\`\`sh
node --test site/water/workbench-v9/tests/uncertainty.test.mjs
node --test site/water/workbench-v9/tests/model-integration.test.mjs
\`\`\`

The second set cross-checks V9 optical forward spectra against V8 at 443, 560 and 665 nm, then tests actual OLCI and measured Sentinel-2 band behavior. Browser tests cover eight tabs, matrix views, hypothetical noise selection, rank deficiency, mobile viewport and CSV/JSON downloads. GitHub Quality and Pages gate on both numerical suites; Pages additionally verifies the deployed engine and Lab cache token.

## Architecture and provenance

The production bundle remains a single English-language HTML app with existing V8 code and measured SRFs. The new algorithm lives at \`analysis/uncertainty-engine.js\`, with workspace source \`workspaces/uncertainty.js\`; the same engine is loaded before the bundled app. Browser charts and their anti-stretch/multi-curve mouse-probe code are unchanged.

V8 SRF source and redistribution notice are carried forward under \`srf/\`: pinned published 1-nm S2A, S2B and Landsat 8 response tables, no fabricated OLCI/OCI SRF. The original agency version is still not independently established. Teaching forward physics uses packed Float32 coefficient tables, simplified first-order atmospheric transfer, 400–700 nm at 1 nm spacing.

## Rollback

Change the Water preference in \`site/core/modules.js\` to V8 and increment the Lab release token. V8 assets are retained as the module-import fallback. Runtime failure after iframe import requires explicit rollback; module-import fallback alone does not detect a later crashed iframe.
