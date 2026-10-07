# Scientific data provenance

## Pure-water absorption

Generated for 20 °C and 35 PSU from the WOPP v3 absorption table:

```text
aw(T,S) = aw(20 °C, 0 PSU) + PsiT*(T-20) + PsiS*S
```

V1 fixes T=20 °C, so only the salinity correction is active.

Primary reference:

- Röttgers, R., Doerffer, R., McKee, D., & Schönfeld, W. Water Optical Properties Processor (WOPP).
- CEOS Cal/Val Portal WOPP distribution.

Generation input used on this branch:

- `eoplus/rho@527c59a51d52e522aa7c8c0c13044e7ebd10357e`
- `data-raw/purewater_abs_coefficients_v3.dat`
- The mirror identifies the table as WOPP v3.
- The mirror does not expose a repository-level license file in the pinned tree. Confirm WOPP table redistribution terms before merging this generated CSV to a public release.

No runtime dependency exists on that repository.

## Pure seawater backscattering

Generated from Zhang, Hu & He (2009) at 20 °C and 35 PSU.

```text
bbw = bw / 2
```

Primary reference:

- Zhang, X., Hu, L., & He, M.-X. (2009). Scattering by pure seawater: Effect of salinity. Optics Express 17, 5698–5710. DOI 10.1364/OE.17.005698.

Implementation cross-check:

- `RemoteSensingTools/OceanOptics.jl`, Apache-2.0, ZhangHu2009 implementation.

## Phytoplankton absorption

The 2 nm Bricaud A and B-specific tables were taken from the Ocean Optics Web Book bundle redistributed by `RemoteSensingTools/OceanOptics.jl` under CC-BY, then linearly interpolated to 1 nm.

Pinned content used during generation:

- `data/bricaud_1998_A.csv`
- `data/bricaud_1998_E.csv`

Primary reference:

- Bricaud, A., Morel, A., Babin, M., Allali, K., & Claustre, H. (1998). JGR Oceans 103, 31033–31044. DOI 10.1029/98JC02712.

The source table defines:

```text
a*ph = A * Chl^(-B_specific)
aph  = A * Chl^(1-B_specific)
```

## Other model terms

- CDOM: `ag(lambda)=ag440 exp[-0.0176(lambda-440)]`.
- NAP: `aNAP(lambda)=aNAP443 exp[-0.0123(lambda-443)]`.
- Particle backscatter: `bbp(lambda)=bbp443(443/lambda)^eta`, V1 eta=1 by default.
- Gordon coefficients: `g0=0.0949`, `g1=0.0794`.
- Lee et al. interface: `Rrs=0.52 rrs/(1-1.7 rrs)`.

See the scientific contract for primary references and validity statements.
