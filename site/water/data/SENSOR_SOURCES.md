# Water as Spectrum — Sensor Observation Layer provenance

The sensor layer samples the instrument's pedagogical continuous **rho_TOA*** produced by the first-order atmosphere layer. It does not sample surface Rrs directly.

## Response-model policy

V1.5 uses a simplified rectangular (top-hat) bandpass:

```text
rho_TOA*_band = (1 / Δλ) ∫ rho_TOA*(λ) dλ
```

over the nominal band support. This is pedagogical band integration, not a claim that a real instrument has a rectangular relative spectral response. The input rho_TOA* is itself a first-order teaching approximation, not calibrated satellite radiance.

A band is not numerically sampled when its full simplified support extends outside the quantitative 400–700 nm model domain.

## Sentinel-3 OLCI

Included nominal bands: Oa01–Oa10.

Centres (nm): 400, 412.5, 442.5, 490, 510, 560, 620, 665, 673.75, 681.25.

Widths (nm): 15, 10, 10, 10, 10, 10, 10, 10, 7.5, 7.5.

Sources:
- https://sentinels.copernicus.eu/documents/247904/0/OLCI_L2_ATBD_Pixel_Classification.pdf
- https://sentinels.copernicus.eu/documents/247904/2700436/S3MPC_OLCI_spectral_characterisation_SD_RP_EUM_SD_v1.1.pdf

Operational OLCI spectral characteristics are detector- and time-dependent. V1.5 uses nominal band geometry only.

## Sentinel-2A MSI

Included S2A visible/coastal bands:
- B01: 442.7 nm / 21 nm
- B02: 492.4 nm / 66 nm
- B03: 559.8 nm / 36 nm
- B04: 664.6 nm / 31 nm

Source:
- https://step.esa.int/main/wp-content/help/versions/12.0.0/snap-toolboxes/eu.esa.opt.opttbx.s2msi.reader/Sentinel2Overview.html

## Landsat 8/9 OLI

Included USGS wavelength ranges:
- B1: 430–450 nm
- B2: 450–510 nm
- B3: 530–590 nm
- B4: 640–670 nm

Source:
- https://www.usgs.gov/faqs/what-are-band-designations-landsat-satellites

## PACE OCI

NASA describes OCI as hyperspectral UV–VIS–NIR radiometry with about 5 nm bandwidth and finer spectral sampling in the actual instrument.

V1.5 uses a deliberately simplified nominal 5 nm teaching grid with centres from 402.5 to 697.5 nm at 5 nm spacing. It does not reproduce the flight RSR or OCI's finer 2.5 nm / selected 1.25 nm sampling.

Sources:
- https://pace.oceansciences.org/oci.htm
- https://pace.oceansciences.org/requirements.htm
