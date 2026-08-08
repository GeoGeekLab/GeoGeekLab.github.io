# GeoGeek 1.6 — Orbital Threshold / 天行之际

GeoGeek 1.6 inserts one unnumbered spatial threshold between the Origin hero and Current Coordinates.

The sequence is now:

`ORIGIN → ORBITAL THRESHOLD → CURRENT COORDINATES → FIELD NOTES → LAB → ATLAS → ELSEWHERE`

The threshold is intentionally **not** a fifth content section. It is a transition from world-scale observation into situated personal observation.

## What the Orbital Threshold does

- warm map-paper Origin gives way to the site's single dark orbital field;
- a live CelesTrak GP/OMM catalog is sampled into a restrained home-page orbital field;
- orbital propagation runs in a browser Web Worker;
- satellite objects are rendered as one `THREE.InstancedMesh` field rather than one DOM/mesh object per satellite;
- hover exposes name, latitude/longitude, and altitude;
- click selects a satellite and reveals two different traces:
  - **Trace in orbit / 天之迹** — propagated orbital path;
  - **Trace on Earth / 地之迹** — the same path projected to the Earth surface;
- dragging rotates the field; wheel zoom changes the observational distance;
- the existing Sheet Index appears after Origin but no section is marked active while the unnumbered threshold is in view;
- global viewport datum is suppressed inside the orbital field because the globe supplies its own geographic datum.

English statement:

> Every orbit is a moving point of view.

Chinese statement:

> 天行有迹，观地有时。

## Satlas provenance

GeoGeek 1.6 selectively derives orbital-engine architecture from the MIT-licensed Satlas project by Premaansh Vyas.

Upstream: `https://github.com/PremaanshVyas/satlas`

Snapshot reviewed for this port:

`2ca3174630bb45990d7f7ef1491d1ee3914acd9f`

The relevant upstream concepts were Satlas' browser-worker propagation, `InstancedMesh` satellite field, selection/highlight, and trail architecture. GeoGeek reimplements these ideas for its own static-site architecture and cartographic visual language.

GeoGeek does **not** copy Satlas' React application shell, page layout, branding, chat interface, cloud layer, API service, or Space-Track/S3 catalog pipeline, and does not call `api.satlas.app`.

Full upstream license: `THIRD_PARTY_LICENSES/SATLAS-MIT.txt`.

## Orbital data

GeoGeek uses its own runtime data path:

`CelesTrak GP/OMM → GeoGeek propagation worker → positions buffer → InstancedMesh`

If the live catalog is unavailable, the threshold remains visually usable with a clearly labelled **DEMO FIELD**. The synthetic fallback is presentation geometry, not scientific evidence.

Natural Earth 1:110m country geometry is fetched only to draw restrained globe borders.

## Performance budget

The home threshold deliberately does not reproduce Satlas' full spectacle.

- desktop home field: up to ~1,200 sampled active objects;
- mobile home field: ~360 objects;
- Lab Orbital Commons: up to ~6,000 active objects on desktop, ~1,100 on mobile;
- propagation: worker tick about once per second while visible;
- page/tab not visible: rendering/ticks pause;
- WebGL pixel ratio is capped;
- `prefers-reduced-motion` disables automatic field rotation and lowers tick cadence.

The principle is: **copy the engine idea, not the spectacle.**

## Files added in 1.6

- `orbital/orbital-engine.js` — Three.js field, instancing, interaction, traces, Natural Earth borders.
- `orbital/propagation.worker.js` — SGP4/SDP4 browser-worker propagation.
- `orbital/orbital-threshold.js` — home-page lifecycle, bilingual copy, visibility and site-chrome transition.
- `orbital/SATLAS_SOURCE.md` — exact upstream snapshot and implementation areas reviewed.
- `THIRD_PARTY_LICENSES.md` — provenance and dependency notices.
- `THIRD_PARTY_LICENSES/SATLAS-MIT.txt`
- `THIRD_PARTY_LICENSES/satellite-js-MIT.txt`
- `THIRD_PARTY_LICENSES/three-MIT.txt`

## Existing Lab change

`Orbital Commons / 天行 · 星图` now uses the same GeoGeek orbital engine instead of the former Globe.GL implementation. This keeps the home threshold and the deeper Lab instrument in the same conceptual and technical system.

## Run locally

Because the orbital engine uses ES modules, a Web Worker, live remote data, and cross-origin module imports, serve the folder over HTTP/HTTPS rather than opening `index.html` through `file://`.

```bash
python -m http.server 8000
```

Then open:

`http://localhost:8000/`

## Core rule

**Geo to see. Geek to build.**

The orbital field is not decoration. It makes the transition explicit: before a place becomes a coordinate, it is already being seen from somewhere.
