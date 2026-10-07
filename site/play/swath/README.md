# SWATH Play

SWATH is a browser-native sensor-geometry Play with a guided prediction sequence.

The instrument separates three quantities that are often collapsed into the word “resolution”:

```text
coverage geometry != sampling density != optical resolution
```

## User path

The guided sequence asks the user to predict before changing a sensor:

1. widen field of view;
2. raise orbital altitude;
3. increase cross-track detector samples.

Each reveal preserves the previous footprint as a dashed reference and renders the new footprint as the active measurement.

After the three experiments, **Sensor Design** keeps the same interactive field and exposes continuous controls for altitude, FOV, and cross-track samples.

## Runtime model

V1 computes:

- ray / spherical-Earth intersection;
- ground swath width;
- geometric nadir GSD;
- geometric edge GSD;
- instantaneous angular sample width;
- circular-orbit period.

The display uses a curvature-aware schematic. Altitude is deliberately not drawn to Earth-radius scale because a physically scaled 350–1200 km range would make the interactive geometry difficult to read inside the instrument viewport.

## Scientific boundary

V1 assumes:

- Earth radius: 6371 km;
- circular orbit for period only;
- nadir-pointing sensor;
- symmetric cross-track field of view;
- one detector sample per angular cross-track partition.

V1 does **not** model:

- revisit time;
- orbital inclination or repeat cycle;
- Earth rotation in coverage;
- constellation scheduling;
- pointing agility;
- optical MTF or diffraction;
- motion blur;
- SNR or detector noise;
- atmosphere.

The UI therefore labels GSD as a geometric sample footprint, not optical resolving power.

## Files

```text
swath-content.js       experiment copy + declared model limits
swath-physics.js       deterministic geometry
swath-experiments.js   guided/free state machine
swath-view.js          Play visualization + controls
swath.js               GeoPlay mount + trace integration
swath.css              responsive visual system
```

## QA

Run the deterministic physics tests:

```bash
npm run qa:swath
```

Browser coverage lives in `tests/browser/swath-play.spec.mjs` and verifies the guided sequence, before/after footprint, sensor-design focus continuity, reset behavior, and Play collection placement.
