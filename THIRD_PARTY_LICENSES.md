# Third-party notices — GeoGeek 1.6

## Satlas-derived orbital architecture

GeoGeek 1.6 selectively derives architectural ideas and portions of implementation structure from Satlas, specifically:

- browser-worker orbital propagation;
- large satellite fields rendered with `THREE.InstancedMesh`;
- object selection/highlight;
- orbital trace / ground relation as a selected-object interaction.

Upstream project: https://github.com/PremaanshVyas/satlas
Upstream snapshot reviewed: commit `2ca3174630bb45990d7f7ef1491d1ee3914acd9f` (main branch, accessed 2026-08-08).

Satlas is MIT licensed. Full notice: `THIRD_PARTY_LICENSES/SATLAS-MIT.txt`.

GeoGeek does **not** copy Satlas branding, page layout, chat UI, API service, cloud layer, or data pipeline, and does not call `api.satlas.app`.

## satellite.js 6.0.1

Used in the browser worker for SGP4/SDP4 propagation.
Full MIT notice: `THIRD_PARTY_LICENSES/satellite-js-MIT.txt`.

## three.js 0.180.0

Used for WebGL rendering and instancing.
Full MIT notice: `THIRD_PARTY_LICENSES/three-MIT.txt`.

## Data / geometry

- CelesTrak GP/OMM endpoints are used for live orbital elements when reachable.
- Natural Earth 1:110m country geometry is used for globe borders through a CC0 GeoJSON conversion.
- The live Orbital Threshold falls back to a clearly labelled synthetic demo field if the live orbital catalog is unavailable.

Third-party trademarks and data-specific rights remain with their respective owners. Software licenses do not automatically grant trademark, privacy, patent, or other independent rights.
