# V10.2 Stage 3 — Navigation, scientific status, tools and experiment controls

**Implementation date:** 2026-10-09  
**Branch:** `feat/water-v10-2-ui-foundation` · Draft PR #134  
**Product status:** Preview implementation; not approved as production default  
**Science status:** Unchanged V10.1 calculations and reference assets; not externally cross-validated

## Delivered components

| ID | Element | Invariant and behavior |
|---|---|---|
| UX-007 | `components/workbench-shell.js::renderGroupedNavigation` | Nine existing workspace IDs appear exactly once: **Physical model** (01–05), **Analysis** (06–08), **Numerical reference** (09). All remain real tabs with one active item, roving tab focus, Left/Right/Home/End navigation and unchanged panel state. |
| UX-008 | `renderScientificStatus` | Status displays current formulation, local-browser-only session, scientific validation scope and provenance/parameter match. WATER RT uses archived-vs-current equality guard; absence of the dataset never yields inferred values. Status is explicitly unvalidated. |
| UX-009 | `#toolsMenu` | Native disclosure menu for CSV export, experiment import and full formulation inspector. Preserves original event IDs `#exportBtn`, `#importBtn`, `#inspectBtn` and file import `#importFile`. Dismissed by Escape/outside click. Model limitations also available via status bar action. |
| UX-010 | `#panelBtn` with `aria-controls`/`aria-expanded` | Primary show/hide setup action. Y-axis lock remains contextual and disabled for workspaces without applicable numeric graph. No global sensor changes. |
| UX-011 | `components/parameter-controls.js::panel/csection/param/adv/presets` | Reusable experiment summary, semantically titled sections, accessibly described sliders/numerical controls, one advanced disclosure and workspace-defined original parameter widgets. |
| UX-012 | `v102-components.css` | Responsive grouping and status layout; tools popover stays within 390px viewport; 38–40px primary touch targets; mobile parameter rail remains stacked. |

### Ground-truth science language

- **Physical model**: semi-analytical and simplified atmospheric/correction calculations; not externally field validated.
- **RT reference**: scalar DOM, internally generated discrete ocean radiative transfer reference, *not* HydroLight measurements; current-parameter match is based on the original V10.1 equality guard.
- **Uncertainty**: hypothetical independent Gaussian band-noise model and local Fisher/Jacobian; not real sensor noise, validated inversion accuracy or a field uncertainty product.
- **Session**: local browser; no implied cloud synchronization.

## Files edited in Stage 3

- `site/water/workbench-v10-2/app/index.html`: shared app HTML, bundled presentation component, event and render integration.
- `site/water/workbench-v10-2/v102-components.css`: independent UI-only responsive stylesheet.
- `site/water/workbench-v10-2/tests/ui-components.test.mjs`: group ID invariants, provenance scenarios, panel semantics, control IDs.
- `tests/browser/water-v102-components.spec.mjs`: keyboard navigation, model status, toolbar, setup, 390px fit.
- `.github/workflows/quality.yml`: CI gates Stage 3 in addition to Stage 1–2, scientific regressions and full site quality.
- `site/water/workbench-v10-2/tests/ui-foundation.test.mjs`: update the expected V10.2 UI-only badge.

### Deliberately unchanged

- All `site/water/workbench-v10-1/` files, including `rt-reference-v1.json`.
- V10.0 and V9 original code, historical session keys, V10.1 default public loader.
- Ocean-color numeric routines, atmospheric correction, noise model, sensor SRFs and export JSON schema v8.

## Manual and automated verification

Run:

```bash
node --test site/water/workbench-v10-2/tests/ui-foundation.test.mjs
node --test site/water/workbench-v10-2/tests/ui-components.test.mjs
npx playwright test tests/browser/water-v102-foundation.spec.mjs tests/browser/water-v102-components.spec.mjs --project=desktop-chromium --project=mobile-chromium --workers=2
node scripts/verify-water-rt-reference.mjs
```

Review UX manually at 1440×900, 1024×768, 390×844 and 320×700, including keyboard Tab/Shift+Tab, Arrow/Home/End, the hidden Tools menu, the no-panel chart and scientific formulation dialog. A green CI checks mechanics, not subjective aesthetic quality.

## Stage 4 dependency

Build the specialized WATER RT interpretation/status summary and scientific chart redesign **on top of the shared shell**; do not introduce another navigation bar or independent scrolling container. Stage 5 will then redesign UNCERTAINTY while retaining `Fisher` assumptions and error units.

## Outstanding approvals

UI/UX parent specification scope change (V10.2 vs original F06/F07 schedule), product acceptance, science reviewer provenance wording and eventual production release sign-off remain pending. Draft PR #134 must not be merged solely because Stage 3 tests pass.
