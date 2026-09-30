# GeoGeek Static Delivery Architecture

This patch implements the P0–P2 program without replacing the existing framework-free site or changing existing English Field Note URLs.

## Engineering contract

1. HTML carries meaning and primary content.
2. CSS carries presentation.
3. JavaScript enhances filtering, visualization, previews, tracking, and other interactions; it is not required to read a Field Note.
4. Build time carries content assembly, SEO metadata, English canonical routes, discovery files, image metadata/variants, and performance checks.
5. Existing GeoGeek interactions remain owned by the framework-free source build. `scripts/build.legacy.mjs` preserves the legacy build path; `scripts/qa.legacy.mjs` retains the relevant source/build checks while assertions tied to retired homepage IA are updated to the current structure.

## P0 — content delivery and first-visit comprehension

- English Field Note bodies are prerendered into route HTML.
- Existing English routes remain `/field-notes/<slug>/`.
- Legacy `/zh/field-notes/<slug>/` paths are noindex compatibility redirects to the English canonical route; they contain no article content.
- The site is English-only except for one intentionally preserved standalone Chinese page at `/origin/cn/`. `/origin/` is the English canonical Origin page, and the two Origin pages use static reciprocal hreflang links without any global locale runtime.
- `archive-content.js` keeps its existing compatibility shape but every `bodyHtml` value is emptied after the legacy QA passes.
- `/data/field-notes.json` and `/data/site-index.json` contain metadata only.
- `field-notes.html` receives a complete static list. The old JS target remains hidden for compatibility.
- Homepage IA is intentionally compact: Hero → Coordinates → Commons. The Hero carries the GeoGeek identity, “Geo to see. Geek to build.”, and the factual domain descriptor “GIS / GeoAI / Remote Sensing”; Field Notes / Lab / Atlas / Elsewhere remain primary navigation destinations rather than duplicated homepage shelves.
- Retired Selected Work, homepage Orbital, legacy project / atlas / elsewhere shelves, and the former Commons gateway are excluded from production homepage CSS and JavaScript.
- No-JavaScript reading is a QA invariant.

## P1 — SEO, discovery, distribution, and loading

Every article receives:

- canonical URL
- meta description
- Open Graph and Twitter metadata
- `BlogPosting` and `BreadcrumbList` JSON-LD

The site also generates:

- `/sitemap.xml`
- `/robots.txt`
- `/feed.xml`
- metadata-only public indexes

- Route-specific preview code is omitted from the homepage and article routes; `previews.js` remains on routes that actually render project previews. Commons visit tracking stays non-critical where applicable. Existing semantic-scale and active visualization code is retained.

## P2 — scale controls

- JSON Feed: `/feed.json`.
- Related-record navigation uses explicit trace/relation metadata when present, with chronological neighbors as a deterministic fallback.
- Article images get intrinsic `width`/`height`, `loading`, and `decoding` attributes at build time.
- When ImageMagick (`magick` or `convert`) is available, large raster article figures receive 640w/1280w variants plus `srcset`/`sizes`. The site still builds without ImageMagick; final QA reports the missing optimization as a warning.
- `styles.css` is post-processed into `styles.base.css`, `styles-atlas.css`, and `styles-commons.css`. Only unambiguous top-level Atlas/Commons rules move out of the base stylesheet; nested media/support rules remain shared to avoid visual regression.
- Performance budgets are enforced in `scripts/performance-budget.json` for initial local JS, metadata, shared CSS, and article HTML.

## Build sequence

```text
scripts/build.mjs
  -> build.legacy.mjs
  -> qa.legacy.mjs          # validates source/build invariants before transformation
  -> postbuild-static-delivery.mjs

scripts/qa.mjs
  -> qa-static-delivery.mjs # validates the final artifact
```

This sequence prevents the metadata-only production archive from invalidating source-preview assumptions while retaining the legacy checks that still apply to the current IA.

## Install

From the repository root, copy this patch directory somewhere accessible and run:

```bash
node /path/to/geogeek-p0-p2-patch/apply.mjs --run
```

The installer is idempotent: on first run it preserves the current build/QA as the legacy pair; later runs update only the wrapper/post-build layer.

## Final invariants

A production build is considered valid only when:

- every source Field Note has an English canonical route HTML;
- source body text exists in first-response HTML;
- metadata indexes do not contain `bodyHtml`;
- legacy archive payload has no non-empty article bodies;
- Field Notes collection contains every record without JavaScript;
- homepage Hero, domain descriptor, Coordinates, and Commons exist in first-response HTML, while retired homepage shelves are absent from production CSS and JavaScript;
- each article has canonical, description, OG, and English JSON-LD;
- sitemap contains English canonical article URLs and excludes legacy redirects;
- RSS and JSON feeds are valid;
- robots.txt advertises the sitemap;
- article images reserve intrinsic dimensions;
- route CSS split files exist;
- configured gzip performance budgets pass.


### v2 compatibility note
The build wrapper is recursion-safe when legacy QA invokes `scripts/build.mjs`, and the post-build layer supports both top-level metadata and the repository's nested `record.data.*` fields.