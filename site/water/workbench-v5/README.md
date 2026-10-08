# Water as Spectrum V5 — GeoGeek Lab integration

Status: **staging candidate, not yet production-validated**.

This integration registers the V5 English-language ocean-color workbench through
`GeoGeekInstrumentMounts.water`. The native GeoGeek Lab retains ownership of
`openByKind`, the Water deep link (`?instrument=water#l13`), its host dialog,
Escape/close actions, and the `AbortSignal` lifecycle.

## Files

- `app/index.html`: self-contained deployment build of the V5 English workbench.
- `instrument.js`: iframe mount, origin-checked handshake and lifecycle cleanup.
- `instrument.css`: Water-scoped host styling.
- `../../core/modules.js`: prefers V5 and falls back to the original Water module
  if V5 **module loading** fails.

The original `water/water-instrument.js` remains unchanged. This PR intentionally
deploys the consolidated HTML build to minimize asset-loader risk. The underlying
scientific implementation is equation-compatible with the previous V4 English
workbench; productionizing the modular source tree remains follow-up work.
A runtime failure **after V5 module import** requires reverting the loader change;
the import fallback does not cover a later iframe handshake failure.

## Staging acceptance

1. Deploy this branch to an independent GitHub Pages preview or other same-origin
   staging host. Do not merge to `main` before these checks pass.
2. Open `lab.html?instrument=water#l13` directly and reload.
3. Verify all six workspaces: PATH, IOP, ATM, SENSOR, AC, and A/B.
4. Change a parameter, save scenario A, close and reopen Water, and verify state.
5. Import/export JSON, export CSV, and open Model Scope.
6. Press Escape in Model Scope: only the nested dialog should close.
   Press Escape again: the native Lab dialog should close.
7. Verify Figure and Earth can still open and close.
8. Check desktop and 390/320 px mobile layouts and browser console errors.
9. Confirm OLCI Oa01 is treated as a partial-coverage band and that negative
   atmospherically corrected Rrs values are not silently clipped.

A successful local/offline test is **not** a substitute for staging browser
acceptance on the real GeoGeek shell.

## Quick static smoke test

```sh
node --test site/water/workbench-v5/smoke.test.mjs
```

## Rollback

Revert only the Water loader change in `site/core/modules.js`, restoring its
original `WATER_INSTRUMENT` import. The old `water/water-instrument.js` was
not modified. The new V5 directory can be retained temporarily or removed by
a subsequent clean-up commit.

## Scientific scope

The present model covers 400–700 nm at 1 nm spacing, optically deep water,
semi-analytical IOP to Rrs conversion, first-order Rayleigh/aerosol scattering,
manual atmospheric correction and nominal rectangular sensor bandpasses.
It excludes multiple scattering, molecular absorption, glint, atmospheric
adjacency and shallow-water effects. Offline Float32 optical coefficients are
not bit-identical to upstream decimal tables. It is **not an independently
validated operational radiative-transfer solver**.
