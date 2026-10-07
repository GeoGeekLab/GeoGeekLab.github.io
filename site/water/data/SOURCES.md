# Water as Spectrum — scientific data provenance

Generated assets in this directory support the V1 quantitative domain, 400–700 nm.

## Pure water / seawater baseline

Source snapshot: `source/wopp-purewater-absorption-v3-400-700.tsv`.

Upstream: `ocean-colour/ocpy@3aed28acbeaad1e699ede06f049edd73b3eb41e9`, file `ocpy/water/WOPP/purewater_abs_coefficients_v3.dat`.

The source table gives pure-water absorption at 20 °C and 0 PSU plus salinity and temperature coefficients. V1 evaluates a 35 PSU seawater baseline:

```text
aw(λ, 20 °C, 35 PSU) = a0(λ) + 35 · PsiS(λ)
```

The 2 nm source table is linearly interpolated to 1 nm.

Seawater backscattering is generated from the Zhang, Hu & He (2009) model as represented in WOPP, at 20 °C and 35 PSU. V1 uses `bbw = bw / 2`.

Primary reference: Zhang, X., Hu, L., & He, M.-X. (2009), *Optics Express* 17, 5698–5710. DOI 10.1364/OE.17.005698.

WOPP reference: Röttgers, R., Doerffer, R., McKee, D., & Schönfeld, W. (2016), *The Water Optical Properties Processor (WOPP)*.

## Phytoplankton absorption

Source snapshot: `source/bricaud-1998-aph-400-700.csv`.

Upstream: `ocean-colour/ocpy@3aed28acbeaad1e699ede06f049edd73b3eb41e9`, file `ocpy/data/phytoplankton/aph_bricaud_1998.txt`.

The source explicitly defines:

```text
aphi(λ) = Aphi(λ) · Chl ^ Ephi(λ)
```

V1 uses `Aphi/Ephi`, not total-particle `Ap/Ep` and not the chlorophyll-specific `aphi*` form.

The 2 nm coefficient table is linearly interpolated to 1 nm.

Primary reference: Bricaud, A. et al. (1998), *JGR Oceans* 103, 31033–31044. DOI 10.1029/98JC02712.

Associated measurements: PANGAEA DOI 10.1594/PANGAEA.739879, CC BY 3.0.

## CDOM and NAP

```text
ag(λ) = ag440 · exp[-0.0176 · (λ - 440)]
aNAP(λ) = aNAP443 · exp[-0.0123 · (λ - 443)]
```

Reference: Babin, M. et al. (2003), *JGR Oceans* 108, 3211. DOI 10.1029/2001JC000882.

The fixed slopes are the study-wide means, not universal constants: `SCDOM = 0.0176 ± 0.0020 nm⁻¹` and `SNAP = 0.0123 ± 0.0013 nm⁻¹` (mean ± SD). The paper reports regional variation and spectral departures, so V1 treats these as teaching defaults.

## Reflectance

```text
u = bb / (a + bb)
rrs = 0.0949 u + 0.0794 u²
Rrs = 0.52 rrs / (1 - 1.7 rrs)
```

The first relationship uses the NASA GIOP-DC default Gordon-style coefficients. The interface relationship follows Lee, Carder & Arnone (2002). These are semi-analytical/interface approximations, not a full angular radiative-transfer solution.

## Rebuild

```bash
node scripts/build-water-optics-data.mjs
```

The generator reads committed source snapshots only. It does not fetch mutable remote files.
