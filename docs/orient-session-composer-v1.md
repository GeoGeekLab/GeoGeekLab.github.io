# ORIENT Session Composer v1

Status: implementation contract for `orient-session-1`.

## Session shape

A normal ORIENT field contains four committed relations:

1. **Orientation** — anchor-to-anchor, moderate relation, Coast ON, Rings ON.
2. **Baseline** — moderate reference relation, Coast ON, Rings OFF.
3. **Contrast** — matched to Baseline with the same FROM place, same distance band, distance difference <= 15%, bearing separation >= 60 degrees; Coast changes to OFF while Rings remains OFF.
4. **Challenge** — higher geometric demand with a non-extended FROM place and no near-antipodal edge case.

Session role and cue condition are separate dimensions. Contrast is descriptive; the changed cue does not justify a causal claim by itself.

## Determinism

`orientSeed` fully defines the composed session for a fixed content/session version. The PRNG is deterministic and does not depend on browser randomness after the seed is supplied.

Recent-history cooldown is implemented by deterministic reseeding until a fresh seed-only session is found. The accepted final seed is written to the URL. Therefore reloading or sharing that final seed reproduces the same four relations without requiring the original device history.

## Anti-repeat

Committed normal relations are stored locally under `geogeek.play.orient.history.v1`, capped at the most recent 32 unique relation IDs. A fresh session attempts to avoid those relations. Session-internal relation IDs are always unique.

## Trial difficulty

Static Relation difficulty remains cue-free. Trial-level demand adds:

- `+0.30` distance demand when distance rings are absent.
- `+0.20` bearing demand when coastline geometry is absent.

Values are clamped to `[0, 1]`. These are authored composition heuristics, not psychometric scores and are not shown as player grades.

## Failure behavior

If versioned Place/Relation content or Session Composer assets are unavailable, ORIENT falls back to the three released authored relations. World geometry failure remains a field-unavailable error because the judgment surface cannot function without projection geometry.

## Release gates

The implementation must satisfy:

- same seed -> same four-trial session;
- T2/T3 core matched constraints for every generated session;
- T2/T3 differ by Coast only;
- no relation duplicates within a normal session;
- cooldown can avoid the immediately preceding session while keeping the accepted seed independently reproducible;
- 10,000 deterministic seed simulations complete without invalid sessions;
- browser contract confirms a non-fallback four-slot session and seed-stable reload;
- Pages artifact contains versioned Place/Relation content and composer runtime;
- ORIENT remains no-score and preserves separate distance/bearing residuals.
