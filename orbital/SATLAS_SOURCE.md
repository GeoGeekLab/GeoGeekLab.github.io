# Satlas source provenance

Upstream: https://github.com/PremaanshVyas/satlas

Reviewed snapshot: `2ca3174630bb45990d7f7ef1491d1ee3914acd9f`

Relevant upstream implementation areas:

- `apps/web/src/globe/SatelliteField.ts`
- `apps/web/src/workers/propagator.worker.ts`
- `apps/web/src/globe/Globe.ts`

The orbital field uses the same broad engineering pattern: worker-based propagation, transferable position buffers, instanced rendering, object selection, and selected-object trails. The site interface, data path, cartographic styling, and page structure are separate.

License: MIT. See `../THIRD_PARTY_LICENSES/SATLAS-MIT.txt`.
