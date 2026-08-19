# GeoGeek Static Delivery Architecture

This patch implements the P0–P2 program without replacing the existing framework-free site or changing existing English Field Note URLs.

## Engineering contract

1. HTML carries meaning and primary content.
2. CSS carries presentation.
3. JavaScript enhances filtering, visualization, previews, tracking, and other interactions; it is not required to read a Field Note.
4. Build time carries content assembly, SEO metadata, bilingual routes, discovery files, image metadata/variants, and performance checks.
5. Existing GeoGeek interactions remain owned by the legacy build. The original build and QA are preserved verbatim as `scripts/build.legacy.mjs` and `scripts/qa.legacy.mjs`.

## P0 — content delivery and first-visit comprehension

- EN and ZH Field Note bodies are prerendered into route HTML.
- Existing English routes remain `/field-notes/<slug>/`.
- Chinese routes are added at `/zh/field-notes/<slug>/`.
- `archive-content.js` keeps its existing compatibility shape but every `bodyHtml` value is emptied after the legacy QA passes.
- `/data/field-notes.json` and `/data/site-index.json` contain metadata only.
- `field-notes.html` receives a complete static list. The old JS target remains hidden for compatibility.
- Homepage selected work is static. A compact plain-language orientation layer explains GIS / remote sensing / GeoAI / visualization and exposes READ / BUILD / EXPLORE routes.
- No-JavaScript reading is a QA invariant.

## P1 — SEO, discovery, distribution, and loading

Every article receives:

- canonical URL
- meta description
- Open Graph and Twitter metadata
- reciprocal `hreflang` (`en`, `zh-CN`, `x-default`)
- `BlogPosting` and `BreadcrumbList` JSON-LD
- a stable language link

The site also generates:

- `/sitemap.xml`
- `/robots.txt`
- `/feed.xml`
- `/zh/feed.xml`
- metadata-only public indexes

Non-critical legacy scripts (`previews.js`, Commons visit tracking) are converted to idle delivery; previews are omitted from article routes. Existing semantic-scale and visualization code is left intact unless it is already route-specific in the legacy templates.

## P2 — scale controls

- JSON Feed: `/feed.json` and `/zh/feed.json`.
- Related-record navigation uses explicit trace/relation metadata when present, with chronological neighbors as a deterministic fallback.
- Article images get intrinsic `width`/`height`, `loading`, and `decoding` attributes at build time.
- When ImageMagick (`magick` or `convert`) is available, large raster article figures receive 640w/1280w variants plus `srcset`/`sizes`. The site still builds without ImageMagick; final QA reports the missing optimization as a warning.
- `styles.css` is post-processed into `styles.base.css`, `styles-atlas.css`, and `styles-commons.css`. Only unambiguous top-level Atlas/Commons rules move out of the base stylesheet; nested media/support rules remain shared to avoid visual regression.
- Performance budgets are enforced in `scripts/performance-budget.json` for initial local JS, metadata, shared CSS, and article HTML.

## Build sequence

```text
scripts/build.mjs
  -> build.legacy.mjs
  -> qa.legacy.mjs          # validates the old artifact before transformation
  -> postbuild-static-delivery.mjs

scripts/qa.mjs
  -> qa-static-delivery.mjs # validates the final artifact
```

This sequence prevents the new metadata-only archive from invalidating historical QA assumptions while retaining all legacy checks.

## Install

From the repository root, copy this patch directory somewhere accessible and run:

```bash
node /path/to/geogeek-p0-p2-patch/apply.mjs --run
```

The installer is idempotent: on first run it preserves the current build/QA as the legacy pair; later runs update only the wrapper/post-build layer.

## Final invariants

A production build is considered valid only when:

- every source Field Note has EN and ZH route HTML;
- source body text exists in first-response HTML;
- metadata indexes do not contain `bodyHtml`;
- legacy archive payload has no non-empty article bodies;
- Field Notes collection contains every record without JavaScript;
- homepage selected work and orientation exist without JavaScript;
- each article has canonical, description, OG, hreflang, and JSON-LD;
- sitemap contains EN/ZH article URLs;
- RSS and JSON feeds are valid;
- robots.txt advertises the sitemap;
- article images reserve intrinsic dimensions;
- route CSS split files exist;
- configured gzip performance budgets pass.


### v2 compatibility note
The build wrapper is recursion-safe when legacy QA invokes `scripts/build.mjs`, and the post-build layer supports both top-level metadata and the repository's nested `record.data.*` fields.
