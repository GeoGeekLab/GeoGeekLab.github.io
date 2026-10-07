# Water as Spectrum — Atmospheric Correction / Retrieval provenance

Status: pedagogical inverse experiment.

This layer exists to demonstrate how uncertainty in an assumed atmosphere propagates into recovered water-leaving reflectance and then into an empirical chlorophyll diagnostic.

It is **not** an operational atmospheric-correction processor.

## Inverse used by the teaching experiment

The forward atmosphere is:

```text
rho_TOA* = rho_R + rho_A + T_down T_up · pi Rrs
```

The inverse uses an assumed atmosphere:

```text
Rrs_est =
  [rho_TOA* - rho_R(est) - rho_A(est)]
  ------------------------------------
          pi T_down(est) T_up(est)
```

Pressure and viewing geometry are treated as known ancillary inputs.

Only two aerosol properties are intentionally allowed to differ between the forward atmosphere and the correction assumption:

- aerosol optical depth at 550 nm;
- Ångström exponent.

When those assumptions match the forward atmosphere, the inverse should close to numerical precision.

When they differ, the recovered `Rrs_est` is allowed to become negative. Negative values are not clipped, because over-subtraction is itself an important atmospheric-correction failure mode.

## Why this is not SeaDAS / operational AC

Operational ocean-colour atmospheric correction estimates aerosol radiance using dedicated spectral bands, aerosol models, lookup tables, multiple scattering, gas correction, polarization handling where required, whitecap/glint treatment, and mission-specific calibration.

Historical SeaWiFS atmospheric correction also relied on near-infrared bands and a black-pixel assumption over clear ocean waters.

References:

- NASA SeaWiFS Postlaunch Technical Report Series, atmospheric correction:
  https://oceancolor.gsfc.nasa.gov/SeaWiFS/TECH_REPORTS/PLVol9.pdf
- NASA Ocean Color atmospheric correction discussion:
  https://oceancolor.gsfc.nasa.gov/files/data/reprocessing/r2000/seawifs/NIR.pdf

The GeoGeek teaching inverse deliberately does none of the above aerosol retrieval.

## OLCI OC4 diagnostic

The correction layer includes one empirical retrieval diagnostic to show how spectral correction error propagates into a downstream product.

It uses the OLCI OC4 coefficients listed in NASA OB.DAAC's Chlorophyll-a ATBD v1.1 for R2022 processing:

```text
blue numerator = max[Rrs(443), Rrs(490), Rrs(510)]
green denominator = Rrs(560)

x = log10(blue / green)

log10(chlor_a) =
  0.42540
  - 3.21679 x
  + 2.86907 x²
  - 0.62628 x³
  - 1.09333 x⁴
```

Source:

- NASA OB.DAAC Chlorophyll-a Algorithm Theoretical Basis Document v1.1:
  https://oceancolor.gsfc.nasa.gov/files/atbd/atbd-obdaac-chlorophyll-a.pdf

The UI compares:

- OC4 evaluated on the true modeled `Rrs`;
- OC4 evaluated on `Rrs_est`.

It does **not** compare OC4 directly against the instrument's `Chl` control.

That distinction is required because the Water as Spectrum forward model changes phytoplankton absorption with `Chl` while holding CDOM, NAP, and particle backscatter independently controllable. The model therefore does not enforce the empirical covariance structure used to calibrate global OC4.

## Deliberate exclusions

The correction experiment excludes:

- retrieval of aerosol optical depth from sensor bands;
- aerosol model selection;
- NIR/SWIR black-pixel or iterative coastal-water correction;
- multiple scattering;
- atmospheric gas correction;
- polarization;
- adjacency effects;
- foam / whitecaps;
- sun-glint correction;
- vicarious calibration;
- mission-specific measured SRFs;
- uncertainty propagation from sensor noise;
- NASA's CI/OCx hybrid blending.

The OC4 value is a sensitivity diagnostic, not a standard Level-2 chlor_a product.
