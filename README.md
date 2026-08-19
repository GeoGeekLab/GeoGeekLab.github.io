# GeoGeek

Personal website for field notes, maps, and geospatial experiments.

**Geo to see. Geek to build.**

https://geogeeklab.github.io/

## Local

```bash
npm run build
npm run preview
```

## Third-party

See [`site/THIRD_PARTY_LICENSES.md`](site/THIRD_PARTY_LICENSES.md).
## Static Delivery Architecture

The production build preserves the original build and QA as `scripts/build.legacy.mjs` and `scripts/qa.legacy.mjs`, then applies the static-delivery post-build pass. Field Notes are prerendered, archive payloads are metadata-only, EN/ZH routes are crawlable, and sitemap/feed/performance QA are generated automatically. See `STATIC_DELIVERY_ARCHITECTURE.md`.
