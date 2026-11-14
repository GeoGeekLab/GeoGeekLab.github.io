# OVERPASS / Round 2 — Landing

Source pin remains a0e53b62573655a81d48b60a35cf661df314f2b7.
The original Watched source remains intact in Git. R2 applies deterministic
temporary build overlays to its wordmark, loading mark, document metadata,
Vite base path, and internal home link. No scientific or rendering module is
replaced. A subpath adapter rewrites only known root-absolute public assets.
Full original source, tests, design and license remain available.

To reproduce, checkout the feature/overpass-r2-landing branch recursively,
install root and submodule dependencies, verify the pin, run the original
tests, then run scripts prepare-r2.mjs, npm run typecheck and npm run build
in the submodule. Run adapt-dist.mjs and smoke-r2.mjs from the root.
Build GeoGeek with npm run build, run assemble-preview.mjs, and run
Playwright with playwright.overpass.config.mjs.

The final static preview is dist/overpass/index.html and its associated
assets, not a production deployment. The original Watched layout, fonts,
globe scene, orbit engine, archive search, replay, and About remain intact.
R2 retains the source's informational descriptions, even those referring
to the original Watched brand, pending the About/credits review in R5.

Known gaps: dynamic API routes (/api/og, /api/pan, /api/e, /s/:id) are
not hosted by Pages. Supabase is not configured. GeoGeek Lab's instrument
registry is not yet modified (R6). A browser screenshot is an evidence
artifact, not a pixel-perfect visual approval by itself. License and
THIRD_PARTY_NOTICES.md must accompany later public distributions.

R2 CI correction: the GeoGeek full production build requires pre-captured
Lab instrument preview images (orbit.jpg and peers), which are unavailable
in the fresh checkout. This is an independent host-build prerequisite, not
an Overpass compile defect. R2 now validates GeoGeek's existing source/Lab
contracts, then serves the complete /overpass/ artifact from a separate
preview root. It does NOT claim a complete GeoGeek site build. Full host
integration and preview-capture prerequisites are an R6 acceptance gate.

R2 browser runner correction: ubuntu-latest resolved to Ubuntu 26.04,
which the currently locked Playwright version does not support for
Chromium installation. Pin OVERPASS browser CI to ubuntu-24.04.
