# Third-party notices

## Satlas

Portions of the orbital-field implementation are derived from Satlas.

Copyright (c) 2026 Premaansh Vyas  
License: MIT  
Upstream: https://github.com/PremaanshVyas/satlas  
Full notice: `THIRD_PARTY_LICENSES/SATLAS-MIT.txt`

Source provenance is recorded in `orbital/SATLAS_SOURCE.md`.

## satellite.js 6.0.1

Used for SGP4/SDP4 propagation in the browser worker.  
License: MIT  
Full notice: `THIRD_PARTY_LICENSES/satellite-js-MIT.txt`

## three.js 0.180.0

Used for WebGL rendering and instancing.  
License: MIT  
Full notice: `THIRD_PARTY_LICENSES/three-MIT.txt`

## MapLibre GL JS 6.6.0

Used by Earth Observatory for the interactive web map and layer rendering.  
License: BSD-3-Clause  
Upstream: https://github.com/maplibre/maplibre-gl-js

## Earth Observatory data and basemap services

Earth Observatory identifies active data providers in the interface and preserves provider attribution where supported by the map renderer. The initial live adapters use NASA EOSDIS GIBS, EMSC/SeismicPortal, Smithsonian Global Volcanism Program, NOAA Space Weather Prediction Center, USGS Water Data, iNaturalist, GBIF, and OpenRailwayMap. The basemap style is delivered by OpenFreeMap and includes OpenStreetMap-derived data. Provider terms, attribution requirements, rate limits, access conditions, and third-party rights remain applicable.

## Data and geometry

Live orbital elements are requested from CelesTrak. Natural Earth geometry is used for geographic context. Other live instruments identify their data sources in the interface. Data-provider terms and third-party rights remain applicable.

## Other runtime libraries

The site also loads D3, TopoJSON Client, and world-atlas at runtime from jsDelivr. Their respective upstream license terms apply.

## Supabase JavaScript client

The optional GeoGeek Commons live backend loads `@supabase/supabase-js` at runtime when Commons is configured in live mode. It is licensed under the MIT License. See `THIRD_PARTY_LICENSES/supabase-js-MIT.txt`.
