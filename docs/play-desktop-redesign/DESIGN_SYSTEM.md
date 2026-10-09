# PLAY Desktop V2 — Design System

Status: shared tokens and representative Project / Light styles implemented in STEP 03. Full-viewport composition remains STEP 04; instrument-specific redesigns remain STEPS 05–10.

## Product character

Editorial cartography × scientific instrumentation × precise desktop interaction.

The interface should foreground spatial evidence. It should feel composed and deliberate, not like a generic game dashboard or a stack of glassmorphism cards. A large drawing area is useful only when the underlying geographic or physical representation is valid.

## Spatial composition

Use an edge-to-edge browser viewport, without outer margins or modal corner radii.

Desktop workspace reference:

```text
┌───────────────────────────────────────────────────────┐
│ LAB / PLAY / INSTRUMENT                STEP     EXIT   │
├────────────┬────────────────────────┬─────────────────┤
│ TASK       │                        │ EVIDENCE        │
│ question   │    SPATIAL CANVAS      │ conditions      │
│ controls   │    map / field / path  │ deltas / limits │
│ actions    │                        │ explanation     │
├────────────┴────────────────────────┴─────────────────┤
│ MODEL / LIMIT                     TRACE / STATUS      │
└───────────────────────────────────────────────────────┘
```

Reference dimensions, subject to verified content fit:
- Header: 68–76 px; footer: 36–40 px.
- Task rail: 320–380 px; evidence rail: 260–300 px.
- Center canvas receives remaining width and height; it must not be covered by persistent dialogs.
- At reduced desktop heights, prioritize canvas height and make auxiliary rail content scroll, never shrink interactive target areas below usable sizes.
- Use CSS grid/flex; avoid layout based on fixed image-space percentages alone.

## Implemented palette

| Token | Hex | Use |
| --- | --- | --- |
| `--play-bg` | `#0B100E` | Base surface |
| `--play-panel` | `#17211C` | Task and evidence rails |
| `--play-fg` | `#EDECE5` | Primary content |
| `--play-action` | `#D8794E` | Committed judgment and primary interactions |
| `--play-reference` | `#8FB5AC` | Reference, verified relation, before/after evidence |
| `--play-error` | `#C76055` | Invalid connection or error, with text explanation |
| `--play-focus` | `#E9C99A` | Visible focus ring |
| `--play-muted` | `#AEBBB2` | Supporting text |
| `--play-subtle` | `#87978B` | Secondary annotations |
| `--play-panel-raised` | `#202B24` | Raised panels |

Secondary text, grid lines and background tints must be adjusted against actual instrument artwork. Never encode state by color alone. Preserve distinguishable dash patterns or labels for judgment, baseline, reference and invalid states.

## Typography

- Editorial serif: page and instrument titles only.
- Neutral sans: task, controls, explanation, primary metrics.
- Monospace: numeric coordinates, scientific units, constraints and concise status.
- Task question: approximately 28–40 px, depending on rail width; avoid repeated 60+ px all-caps panels.
- Body: 14–16 px. Scientific annotations and functional labels: generally at least 11–12 px.
- Reserve all caps for short instrument labels and controlled status tokens. Use legible mixed case in sentences.
- Align numeric readings and preserve units and signs.

## Controls and interactions

- Primary action is unique per step; secondary actions must not look incorrectly recommended.
- `KEEP` and `REDRAW` decisions in Bound carry equal emphasis.
- Give visible keyboard focus and disabled state. Ensure pointer and keyboard flows remain equivalent.
- Avoid sudden full-panel swaps where a live readout can update in place.
- Put critical controls adjacent to the visual they affect, or connect them with clear correspondence.
- Use motion to express changes in state or relation; respect `prefers-reduced-motion`.
- Preserve pre-commit truth hiding, and explain invalid gestures without implying a hidden score.

## Scientific graphic rules

1. Use a shared scale for values compared quantitatively within one chart; annotate non-comparable units.
2. Separate observed or model-derived values from illustrative color and schematic geometry.
3. Show old and new states together where the causal inference depends on contrast.
4. State known model limits where they matter to interpretation.
5. Avoid false geographic precision: a screen projection and a real geodesic are not interchangeable.
6. Keep map graticules, contours and construction lines subordinate to the relation under study.

## Instrument distinctions

| Instrument | Primary visual | Priority |
| --- | --- | --- |
| Project | World map / geodesic | Correct projection, apparent versus actual area |
| Light | Scene, three paths, spectrum | Signal scale, separate mechanisms |
| Bound | Risk field and closed line | Explicit trade-offs under sampling change |
| Swath | Sensor cone and footprint | Coverage versus geometric sampling |
| Orient | Reference-centered globe | Estimation and residuals after commitment |
| Connect | Graph on geography | Adjacency and rule-dependent connectivity |

## Design exclusions

No decorative leaderboards, badges, gradient-heavy cards, gratuitous animated backgrounds, high-gloss reflections, or fabricated numeric precision. Avoid importing an unrelated visual component library.

## Implementation contract — STEP 03

Canonical tokens live in `site/play/play-design-system.css`. Both `create()` and `createV2()` in `site/play/play-shell.js` register this stylesheet through `GeoPlay.core.ensureStyle()` with the key `play-design-system`.

The stylesheet scopes all rules under `.play-shell` or `.play-v2-shell`. It does not modify `:root`, `body`, the Lab collection or Observatory. Do not extend these selectors to non-PLAY surfaces.

| Token group | Implemented names | Values / purpose |
| --- | --- | --- |
| Typography | `--play-font-display`, `--play-font-interface`, `--play-font-data` | Serif heading; sans UI; monospace scientific values |
| Type scale | `--play-font-body-size`, `--play-font-label-size` | 14px body; 11px instrument labels |
| Spacing | `--play-space-1` through `--play-space-6` | 4, 8, 12, 16, 24, 32px |
| Geometry | `--play-radius-control`, `--play-radius-panel` | 8px, 12px |
| Linework | `--play-line`, `--play-line-strong` | 18% / 32% ivory lines |
| Motion | `--play-motion-fast`, `--play-motion-standard`, `--play-ease` | 160ms, 280ms, ease curve |
| Semantics | `--play-action-hover`, `--play-reference-text`, `--play-action-text` | Readable state colors |

Existing V2 variables (`--play-v2-bg`, `--play-v2-fg`, `--play-v2-muted`, `--play-v2-line`, `--play-v2-action`, `--play-v2-reference`, `--play-v2-invalid`) are temporary aliases. The legacy shell uses `--play-signal` as an alias. New instrument styles should use canonical `--play-*` names.

## Component contracts

1. Primary actions use copper; hover increases emphasis without changing meaning.
2. Secondary actions stay neutral. Competing decisions must not imply a recommended answer.
3. Prediction choices use a teal selected state. Hover must never erase the selected state.
4. Disabled buttons keep their semantic `disabled` attribute, reduced emphasis and a blocked cursor.
5. Buttons, interactive SVG nodes and range inputs show a 2px warm-ivory `:focus-visible` ring with a 3px offset.
6. Numerical readouts retain explicit units. Never mix relative teaching paths with quantitative Rrs.
7. Graph states remain distinguishable by labels or line patterns, not color alone.

## Motion and contrast

PLAY respects `prefers-reduced-motion: reduce` without affecting other modules. Project and Light demonstrate the new text tiers and control states. Map/canvas drawing accuracy, fixed panel positions and legacy layout are unchanged in this step.

## Representative visual checks

The design contract is exercised in `tests/browser/play-design-system.spec.mjs`. Capture Project and Light at 1920×1080, 1440×900 and 1366×768. Check the original Orient shell receives the same base tokens. Review screenshots side by side before concluding that the sample styles are ready for the full-viewport shell.

Full-page chrome, rail geometry, task-panel relocation, map linework, Light scene composition and other instrument-specific changes are reserved for STEPS 04–10. Browser zoom at 125% and final full-suite accessibility sign-off remain STEP 12.

## Acceptance

Report actual pass/fail results, screenshot evidence and known remaining work in `ACCEPTANCE.md` and `STATUS.md`. Design tokens alone do not constitute full visual sign-off.
