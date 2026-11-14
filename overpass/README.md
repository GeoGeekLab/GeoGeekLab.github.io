# GeoGeek OBSERVATORY / OVERPASS — Round 1

## Status: isolated upstream build baseline (not production-ready)

Watched is preserved **unaltered** at `overpass/upstream` as a Git submodule pinned to `a0e53b62573655a81d48b60a35cf661df314f2b7`.
This is a source-level import, not an iframe pointing at the Watched website. Submodule
checkout retrieves the complete upstream repository, including its original source,
data assets, test suite, imagery pipeline, replay system, and MIT license.

The canonical upstream Git commit is locked in `UPSTREAM.lock.json`. Do not track a
moving branch without a reviewed lock update. The application is still branded Watched
in this round; GeoGeek branding and UI integration are intentionally deferred to avoid
altering scientific logic before baseline tests pass.

## Clone and test

```bash
git clone --recurse-submodules https://github.com/GeoGeekLab/GeoGeekLab.github.io.git
cd GeoGeekLab.github.io
git checkout feature/overpass-r1-baseline
git submodule update --init --recursive
node overpass/scripts/assert-upstream.mjs
cd overpass/upstream
npm ci
npm run typecheck
npm test
npm run test:backend
npm run build
cd ../..
node overpass/scripts/smoke-dist.mjs
```

To develop upstream standalone, run `npm run dev` in `overpass/upstream`
and open `http://localhost:5173`. There is no requirement to run GeoGeek's
main site at the same time.

GitHub Actions runs upstream tests and builds on this feature branch. Build output
is uploaded as an artifact. **No workflow in this branch publishes to GitHub Pages.**

## Scope and unresolved integration work

- Watched's root-absolute URLs (`/textures/`, `/data/`, `/api/`, `/s/`)
  need a reviewed `/overpass/` path adapter before hosting on GeoGeek Pages.
  Do not assume Vite `base` alone rewrites paths created in source code.
- The share/OG endpoints and usage relay require a separate server runtime.
  The original standalone UI and client-side orbital/imagery calculations
  remain present, but the backend is **not** deployed in round 1.
- GeoGeek already has its own CelesTrak OMM snapshot. The catalog
  freshness and satellite-profile mapping require parity testing before reuse.
- The original Watched branding, wordmark and metadata are still present.
  Replace them without changing the established page geometry in round 2.
- Maintain `LICENSE` and `THIRD_PARTY_NOTICES.md` from upstream, and honor
  external imagery/texture attribution requirements.

## Round 1 exit criteria

1. The feature branch contains the pinned, check-outable upstream source.
2. CI verifies exact commit, types, tests, backend tests, and standalone build.
3. CI stores the full standalone built artifact; no production files change.
4. Remaining path, backend and branding tasks are recorded explicitly.

Successful build does not imply an integrated or deployed instrument.
