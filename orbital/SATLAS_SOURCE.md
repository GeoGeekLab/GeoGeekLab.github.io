# Satlas source provenance for GeoGeek 1.6

Upstream: https://github.com/PremaanshVyas/satlas

Snapshot: `2ca3174630bb45990d7f7ef1491d1ee3914acd9f`

Reviewed upstream implementation areas:

- `apps/web/src/globe/SatelliteField.ts`
  - `THREE.InstancedMesh`
  - dynamic instance matrices
  - per-instance category / selection colors
- `apps/web/src/workers/propagator.worker.ts`
  - worker `init` / `tick` message architecture
  - SGP4 propagation outside the main UI thread
  - transferable `Float32Array` position buffer
- `apps/web/src/globe/Globe.ts` and project engineering notes
  - selected-object trails
  - hover / selection interaction
  - globe coordinate-system discipline

GeoGeek's implementation is not a copy of Satlas UI. It adapts the above engineering pattern to:

- a static multi-page portfolio;
- CelesTrak OMM data;
- Earth-fixed cartographic coordinates;
- an unnumbered homepage threshold;
- paired orbital and ground traces;
- GeoGeek's own visual, bilingual, and interaction system.

License: MIT. See `../THIRD_PARTY_LICENSES/SATLAS-MIT.txt`.
