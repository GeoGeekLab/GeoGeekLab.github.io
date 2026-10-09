# PLAY Desktop V2 — Design System

Status: baseline direction, pending final token implementation in STEP 03. Values below are design targets, not currently deployed styles.

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

## Provisional palette

| Token | Hex | Use |
| --- | --- | --- |
| `--play-bg` | `#0B100E` | Base surface |
| `--play-panel` | `#17211C` | Task and evidence rails |
| `--play-fg` | `#EDECE5` | Primary content |
| `--play-action` | `#D8794E` | Committed judgment and primary interactions |
| `--play-reference` | `#8FB5AC` | Reference, verified relation, before/after evidence |
| `--play-error` | `#C76055` | Invalid connection or error, with text explanation |

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

## Approval at STEP 03

Finalize tokens only after side-by-side samples of a map-dominant instrument (Project) and a multiscale scene (Light). Record any change to this document and the reasons in `STATUS.md`.
