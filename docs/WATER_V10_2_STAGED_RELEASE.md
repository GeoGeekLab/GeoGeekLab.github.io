# Water as Spectrum V10.2 — staged release scope

**Release channel:** production candidate on GitHub Pages, contingent on the exact-commit Pages build, deploy and public smoke jobs.  
**Date:** 2026-10-09 · **Version:** Water UI V10.2 (staged scope: UX-051–073)

## What ships in this increment

- Previously delivered foundations (Stages 1–4) and unchanged historical V9, V10.0 and V10.1 fallback links.
- Stage 5, UX-051–054: conditional local Fisher uncertainty evidence, explicit assumptions, normalized Jacobian and numerical correlation diagnostics.
- Stage 6A, UX-061–062: Radiative Path schematic and water optical IOP/AOP presentation, labeled as pedagogic/simulated rather than independently validated RT.
- Stage 6B, UX-063–064: atmosphere and SRF explanations, modeled TOA decomposition and band-domain/provenance qualification.
- Stage 7, UX-071–073: atmospheric-correction self-consistency **versus unperformed independent validation**; saved/live A/B identity; bounded numerical sensitivity and meaningful physical units.
- Production startup-order fix #148: boot-critical presentation exports execute before the inline app entrypoint. V10.2 integrates all nine existing workspaces without modifying scientific model calculations.

**Unchanged:** 400–700nm / 301-point model grid, archived V10.1 numerical RT reference, all nine workspace identifiers and plot routes, instrument schema **v8**, historical independent version entry points. A green CI result is *not* external HydroLight/DISORT/field-matchup validation.

## Deliberately excluded from this production increment

The Stage 8 UI accessibility/chart-export prototype [#154](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/154) is **not shipped**. Its WCAG 2.2 axe audit exposed a serious SENSOR accessibility finding in [run 37890068780](https://github.com/GeoGeekLab/GeoGeekLab.github.io/actions/runs/37890068780). The unfinished parts of:
- Stage 8, UX-081–084: complete breakpoint/native 200% zoom, manual screen reader and contrast reviews, accessible chart-equivalents and current-view CSV/JSON rollout, terminology internationalization;
- Stage 9, UX-091–094: formal full cross-version, cross-browser, visual and performance signed acceptance;
- Stage 10, UX-101–103: final science/accessibility release governance, teaching note and externally audited rollback;

are now **V10.3 tasks** tracked at [issue #155](https://github.com/GeoGeekLab/GeoGeekLab.github.io/issues/155) (original Stage 8–10 issues #140–142 remain open). SCI-01–05 are **independent scientific evidence debt** and are not fixed by this UI launch.

## Release and rollback

Shared full-site Pulse mobile touch-target fix [PR #153](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/153) was merged to `main` as commit `81c36cd7f230ea51399ee6594f2438f52a7d1e23`; the V10.2 final integration CI and Pages deployment must run on top of this updated base, not the earlier Pulse-failing pre-merge base.

Candidate integration: [PR #151](https://github.com/GeoGeekLab/GeoGeekLab.github.io/pull/151). Site URL: https://geogeeklab.github.io/lab.html?instrument=water&waterVersion=v102#l13

V10.1 rollback entry: https://geogeeklab.github.io/lab.html?instrument=water&waterVersion=v101#l13

Full rollback requires a new reviewed revert of the exact merged V10.2 commit on `main`; never force reset public `main`. Public deployment **must** have a completed GitHub Pages workflow (build → deploy → smoke). Track the live workflow SHA rather than assuming a push equals publication.

### Qualification boundaries

This release has CI-based internal checks and publicly labeled science assumptions. It **does not claim full UX-081–103 acceptance, WCAG 2.2 AA certification, or independent external radiative-transfer/retrieval validity**; those are explicitly deferred to V10.3. Do not imply that same-model correction closure verifies atmospheric retrieval performance.
