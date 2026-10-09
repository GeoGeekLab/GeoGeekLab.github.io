# RFC-UX-0102 — Water as Spectrum V10.2 UI/UX scope change and engineering baseline

- **Date:** 2026-10-09
- **Status:** APPROVED FOR STAGED UI RELEASE — phases 1–4 only, under user release authorization on 2026-10-09; full V10.2 design completion remains open
- **Primary specification:** [V10.2 UI/UX master](WATER_AS_SPECTRUM_V10_2_UIUX_MASTER.md)
- **Existing functional source of truth:** [Water requirements master](WATER_AS_SPECTRUM_REQUIREMENTS_MASTER.md)
- **Reference baseline:** Water as Spectrum V10.1 (nine workspaces, semi-analytical IOP/AOP, 45 generated scalar DOM slices, export schema v8)
- **Proposed version change:** Re-purpose V10.2 as a dedicated UI/UX release; **do not** silently mark existing F06 atmospheric-error and F07 guided-experiment V10.2 deliveries as fulfilled. Their revised milestone requires explicit approval and a separate decision.

## Phase 1 — baseline locked for development

- Keep V9, V10.0 and V10.1 directories unchanged, with V10.1 preserved as a separate, explicit fallback entry.
- For UX work, use independent **`site/water/workbench-v10-2/`**. The default public water entry now targets V10.2 stages 1–4 after Pages release; `waterVersion=v101` explicitly selects V10.1.
- Pin the independent DOM reference to the existing **V10.1** `rt-reference-v1.json`, not a regenerated or changed dataset.
- Preserve the same semi-analytical inputs, numerical formulae, measured SRF sources, Fisher linearization, RT equations, 9 workspace IDs, and schema v8 semantics.
- Existing localStorage state is migrated for the V10.2 UI with a distinct `water_ui_geo_v102` key. V10.2 edits must never overwrite a V10.1 session.
- Promotion of phases 1–4 to the default entry is authorized by the user; merge remains conditioned on scientific zero-drift, browser tests and Pages smoke. Full V10.2 design acceptance and independent scientific validation remain separate work.

## Phase 2 — implemented layout foundation (no science work)

| Requirement | Implementation | Acceptance |
|---|---|---|
| UX-001 compact host | V10.2-only scoped host CSS via adapter `data-water-ui-version=v102` | host header <=76px @desktop; prior versions unchanged |
| UX-002 one vertical scroll owner | iframe document/body scroll; no nested vertical plot/results/parameter-region scrolling | CSS computed behavior + full-page browser scrolling on RT/U08 |
| UX-003 dense-workspace layout | auto-height result region and parameter rail; mobile stacks the rail under plots | 1440 / 1024 / 390 px tested |
| UX-004 plot visibility | reduced overhead, at least partially visible first scientific chart at common laptop heights | 1440×900 check |
| UX-005 readability baseline | readable controls with improved font and minimum target dimensions | focus/keyboard, no clipped controls |
| UX-006 provenance continuity | V10.1 science text/RT source retained exactly; preview tagged as **UI** not science upgrade | scientific numeric equality and metadata assertions |

## Implementation progress and remaining stages

**Delivered in the staged release:** grouped navigation and scientific status/tools/setup components (stage 3), plus WATER RT scientific charts, paired-case status and exact sample tables (stage 4). **Still pending:** UNCERTAINTY redesign (stage 5), seven other module-specific redesigns (stages 6–7), full responsive/accessibility review (stage 8), visual/performance/regression sign-off (stage 9) and final design closure (stage 10). See [remaining work list](WATER_V10_2_REMAINING_WORK.md).

The staged release does **not** claim that all nine workspaces meet the full V10.2 UI/UX specification; WATER RT and shared shell are complete, the remaining specialist views are explicitly scheduled.

## Test plan and release controls

```sh
node --test site/water/workbench-v10-2/tests/ui-foundation.test.mjs
npx playwright test -c playwright.config.mjs tests/browser/water-v102-foundation.spec.mjs --project=desktop-chromium --project=mobile-chromium
node scripts/verify-water-rt-reference.mjs
```

Also run the existing V9, V10.0 and V10.1 regression suites, Stage 3–4 UI tests and all-site CI. **Deployment is confirmed only after successful main-branch Pages publish and online asset smoke.**

### Reviewer decision log

- Product owner staged release authorization: **Granted by user for phases 1–4 on 2026-10-09**
- Science owner sign-off: **Pending**
- Full UX program closure: **Pending phases 5–10**
- Engineering staged release: **Phases 1–4 implemented; full CI and Pages verification required**
- Final V10.2 scope change / F06/F07 rescheduling: **Pending**

## Rollback and isolation

Upon successful release, default `/lab.html?instrument=water#l13` → V10.2 UI stages 1–4. Roll back explicitly with `/lab.html?instrument=water&waterVersion=v101#l13`; older `v10` and `v9` remain available. Revert only the default `core/modules.js` routing to V10.1 for emergency rollback, without touching scientific code or reference data.

## Phase 4 scientific UI implementation (staged release)

- **Depth:** downwelling/upwelling irradiance on labelled log10 horizontal scale, depth increasing downward; second profile shows finite-difference `K_d` in m⁻¹.
- **Upward radiance:** eight discrete `|μ|` directions with explicitly azimuth-averaged scalar `L_u/E_d0` in sr⁻¹. No artificial wavelength axis or fully directional radiance claim.
- **Matched comparisons:** five discrete paired `r_rs` values in sr⁻¹, a separate signed `Δr_rs=r_rs,semi−r_rs,RT` panel and displayed mean bias / RMSE. No external accuracy claim.
- **Reproducibility:** downloadable experiment schema v8 unchanged, expandable exact numeric data tables; self-generated numerical reference explicitly marked unvalidated. `v102-rt.css` scopes the visual layer to V10.2.
- **Tests:** `rt-ui.test.mjs`, `water-v102-rt.spec.mjs` and online V10.2 Pages smoke; prior V10.1 reference file and solver are untouched.

