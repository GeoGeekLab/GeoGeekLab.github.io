# SWATH Play

SWATH is a browser-native sensor-geometry Play.

It asks users to predict how three design changes affect an Earth-observing sensor:

1. widen field of view;
2. raise orbital altitude;
3. increase cross-track detector samples.

V1 uses spherical-Earth ray geometry and a circular-orbit period calculation. It reports swath width, geometric nadir GSD, geometric edge GSD, and orbital period.

It intentionally does not model revisit time, optical MTF, diffraction, motion blur, SNR, detector noise, pointing agility, atmospheric effects, or mission scheduling.

```text
coverage geometry != sampling density != optical resolution
```
