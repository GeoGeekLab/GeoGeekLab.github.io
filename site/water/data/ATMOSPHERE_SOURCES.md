# Water as Spectrum — Atmosphere Forward Layer provenance

Status: first-order pedagogical forward atmosphere.

The atmosphere layer exists to teach the separation between water-leaving reflectance and the signal observed above the atmosphere.

It is **not** an operational atmospheric-correction processor.

## TOA decomposition

Operational ocean-colour atmospheric correction commonly writes top-of-atmosphere reflectance as a sum of molecular, aerosol / molecular-aerosol, surface, and transmitted water-leaving terms.

The teaching layer keeps only three terms:

```text
rho_TOA* = rho_R + rho_A + T_down T_up · pi Rrs
```

where:

- `rho_R` is a first-order Rayleigh path-reflectance term;
- `rho_A` is a first-order aerosol path-reflectance term;
- `T_down T_up · pi Rrs` is the directly attenuated water contribution.

The star in `rho_TOA*` is intentional. The quantity is not an operational TOA product.

Reference decomposition:

Wang, M. and Gordon, H. R. atmospheric-correction formulation as summarized in NASA SeaWiFS postlaunch technical reports.

- https://oceancolor.gsfc.nasa.gov/SeaWiFS/TECH_REPORTS/PLVol9.pdf
- https://oceancolor.gsfc.nasa.gov/SeaWiFS/TECH_REPORTS/PLVol22.pdf

## Rayleigh optical thickness

The standard-pressure Rayleigh optical thickness is:

```text
tau_R = 0.008569 lambda^-4
        · (1 + 0.0113 lambda^-2 + 0.00013 lambda^-4)
```

with wavelength in micrometres.

V1.6 scales this linearly by surface pressure / 1013.25 hPa.

The scalar Rayleigh phase function is:

```text
P_R(Theta) = 3/4 · (1 + cos^2 Theta)
```

Reference:

Hansen and Travis formulation as reproduced in NASA radiative-transfer documentation.

- https://ntrs.nasa.gov/api/citations/20020069116/downloads/20020069116.pdf

## Aerosol optical thickness

Aerosol optical depth is parameterized with the Ångström power law:

```text
tau_a(lambda) = tau_a(550) · (lambda / 550)^(-alpha)
```

NASA reference:

- https://earth.gsfc.nasa.gov/climate/data/deep-blue/science

The layer exposes `tau_a(550)` and `alpha` as teaching controls.

It does not infer aerosol type from those two variables.

## Aerosol phase function

The aerosol path term uses a scalar Henyey–Greenstein phase function with fixed asymmetry parameter:

```text
g = 0.70
```

and fixed single-scattering albedo:

```text
omega0 = 0.95
```

These are pedagogical assumptions, not retrieved aerosol microphysics and not a claim about a specific maritime, dust, smoke, or urban aerosol model.

## Single-scattering path reflectance

For each Rayleigh or aerosol optical-depth term, V1.6 evaluates the first-order plane-parallel single-scattering reflectance:

```text
rho_path =
  omega0 P(Theta)
  ---------------- · [1 - exp{-tau(1/mu0 + 1/muv)}]
    4(mu0 + muv)
```

where `mu0 = cos(theta_s)` and `muv = cos(theta_v)`.

This follows the formal single-scattering solution for a homogeneous plane-parallel atmosphere.

The two path terms are added independently. Rayleigh–aerosol interaction is not represented.

## Water transmission

The water contribution uses a direct two-way extinction approximation:

```text
T_down = exp[-(tau_R + tau_a) / mu0]
T_up   = exp[-(tau_R + tau_a) / muv]

rho_water_TOA* = T_down T_up · pi Rrs
```

This is not the operational diffuse transmittance used by production ocean-colour atmospheric correction.

## Deliberate exclusions

The first-order layer excludes:

- multiple scattering;
- Rayleigh–aerosol interaction;
- polarization;
- ozone, NO2, oxygen, and water-vapour absorption;
- foam / whitecaps;
- sun glint;
- adjacency effects;
- aerosol vertical structure;
- operational aerosol-model LUT selection;
- atmospheric inversion / correction;
- calibrated radiance and digital numbers.

The layer should be used for causal teaching only.
