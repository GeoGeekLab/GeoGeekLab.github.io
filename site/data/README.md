# GeoGeek Data Supply

The data-supply layer separates **where data originates** from **how an instrument receives it**.

Each registered dataset declares:

- `provider` and `upstream`: provenance;
- `mode`: `snapshot`, `hybrid`, `query`, or `tile`;
- `timeSemantics`: what “now” or a selected date actually means;
- `resolution`: the observation/support scale;
- `limit`: the interpretation boundary;
- snapshot paths, refresh cadence, stale threshold, and fallback policy when applicable.

## Delivery modes

**SNAPSHOT** — GeoGeek periodically validates an upstream payload and publishes a same-origin last-known-good copy with SHA-256 metadata. Orbit Active, NOAA OVATION, and Smithsonian GVP use this pattern.

**HYBRID** — a current view can use a validated snapshot while parameterized historical requests still go to the provider. EMSC current-day earthquakes use this pattern.

**QUERY** — requests depend on the current map viewport or other user parameters and remain provider queries. iNaturalist, GBIF, and USGS Water use this pattern.

**TILE** — large raster/reference pyramids remain direct provider tiles. NASA GIBS and OpenRailwayMap use this pattern.

A unified layer does **not** imply that heterogeneous datasets have the same freshness, spatial support, uncertainty, or legal status. The purpose of the registry is to make those differences explicit while centralizing transport, freshness, fallback, validation, and provenance behavior.
