# RFC-UX-0102 — Water as Spectrum V10.2 UI/UX scope change and engineering baseline

- **Date:** 2026-10-09
- **Status:** PROPOSED — phase-1/2 engineering prototype authorized, scientific/product release approval still pending
- **Primary specification:** [V10.2 UI/UX master](WATER_AS_SPECTRUM_V10_2_UIUX_MASTER.md)
- **Existing functional source of truth:** [Water requirements master](WATER_AS_SPECTRUM_REQUIREMENTS_MASTER.md)
- **Reference baseline:** Water as Spectrum V10.1 (nine workspaces, semi-analytical IOP/AOP, 45 generated scalar DOM slices, export schema v8)
- **Proposed version change:** Re-purpose V10.2 as a dedicated UI/UX release; **do not** silently mark existing F06 atmospheric-error and F07 guided-experiment V10.2 deliveries as fulfilled. Their revised milestone requires explicit approval and a separate decision.

## Phase 1 — baseline locked for development

- Keep V9, V10.0 and V10.1 directories unchanged, with V10.1 remaining the default production entry.
- For UX work, use independent **`site/water/workbench-v10-2/`**. A preview is available only when `waterVersion=v102` is explicitly requested.
- Pin the independent DOM reference to the existing **V10.1** `rt-reference-v1.json`, not a regenerated or changed dataset.
- Preserve the same semi-analytical inputs, numerical formulae, measured SRF sources, Fisher linearization, RT equations, 9 workspace IDs, and schema v8 semantics.
- Existing localStorage state is migrated for preview with a distinct `water_ui_geo_v102` key. Preview edits must never overwrite a V10.1 session.
- Production merge of a future V10.2 default requires a separate release gate, scientific reviewer and UX/product approval.

## Phase 2 — implemented layout foundation (no science work)

| Requirement | Implementation | Acceptance |
|---|---|---|
| UX-001 compact host | V10.2-only scoped host CSS via adapter `data-water-ui-version=v102` | host header <=76px @desktop; prior versions unchanged |
| UX-002 one vertical scroll owner | iframe document/body scroll; no nested vertical plot/results/parameter-region scrolling | CSS computed behavior + full-page browser scrolling on RT/U08 |
| UX-003 dense-workspace layout | auto-height result region and parameter rail; mobile stacks the rail under plots | 1440 / 1024 / 390 px tested |
| UX-004 plot visibility | reduced overhead, at least partially visible first scientific chart at common laptop heights | 1440×900 check |
| UX-005 readability baseline | readable controls with improved font and minimum target dimensions | focus/keyboard, no clipped controls |
| UX-006 provenance continuity | V10.1 science text/RT source retained exactly; preview tagged as **UI** not science upgrade | scientific numeric equality and metadata assertions |

## Explicitly deferred to phases 3–10

Navigation information architecture/grouping, tool menu, plot-specific summarization and semantic interpretation, WATER RT/UNCERTAINTY domain-specific redesigns, all-seven-other-workspace migration, complete responsive WCAG audit, UX telemetry, and approval to ship V10.2 as the default.

The initial phase-2 CSS is intentionally a **layout foundation**, not a claim that all nine pages already meet the proposed V10.2 design specification.

## Test plan and release controls

```sh
node --test site/water/workbench-v10-2/tests/ui-foundation.test.mjs
npx playwright test -c playwright.config.mjs tests/browser/water-v102-foundation.spec.mjs --project=desktop-chromium --project=mobile-chromium
node scripts/verify-water-rt-reference.mjs
```

Also run the existing V9, V10.0 and V10.1 regression suites and all-site CI. A CI success of a preview PR is **not a production deployment**.

### Reviewer decision log

- Product owner sign-off: **Pending**
- Science owner sign-off: **Pending**
- UX owner sign-off: **Pending**
- Engineering preview ready: **In progress**
- Final V10.2 scope change / F06/F07 rescheduling: **Pending**

## Rollback and isolation

Default: `/lab.html?instrument=water#l13` → stable V10.1. Preview: `/lab.html?instrument=water&waterVersion=v102#l13`; existing `waterVersion=v10` and `waterVersion=v9` remain supported. Remove preview host routing and new assets to back out phase 1–2 without touching science or V10.1.
