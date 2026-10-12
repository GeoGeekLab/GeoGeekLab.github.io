# GeoGeek Lab — Final Composition Review A7

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A7 is the final art-direction pass on the existing architecture.

It introduces no A7 runtime version.

## Evidence

The pass is based on actual A6 CI captures rather than design speculation.

The captures exposed three visible problems.

1. The Water host exceeded the validated compact-header contract after A6 raised microtype.
2. WATER RT still read as one large dashboard card despite the A2/A3 hierarchy work.
3. Horizontal workspace overflow looked like accidental text clipping when WATER RT was selected.

## Host correction

Water keeps readable 10 px Observatory orientation.

Because Water already owns a dense internal workspace system, its host context removes the duplicated quantity row and seven-instrument axis.

The shared shell still communicates:

- Lab / Observatory;
- Water as Spectrum;
- Observatory index 07;
- Spectral Water;
- Internal Workspace;
- Lab Index exit.

This keeps the host within the existing 76 px Water contract without returning to 7–9 px labels.

## WATER RT composition

The RT workspace is no longer enclosed by one outer border.

It becomes an open reference chamber.

The hierarchy is:

```text
editorial RT opening + selection geometry
────────────────────────────────────────
comparison-input status
reference conditions
sampled optical quantities
────────────────────────────────────────
active scientific analysis
plots / data
method / provenance
```

The change removes framing only.

It does not hide mismatch status, reference conditions, numerical values, methods, or provenance.

## Navigation continuation

The nine Water workspaces remain visible in the same grouped horizontal navigation.

When the strip overflows, subtle noninteractive edge fades indicate continuation.

The fades disappear at the true start or end of the scroll range.

Forced-colors mode removes the fades.

No navigation semantics or keyboard behavior changes.

## Release criterion

A7 is complete only when the existing Water V10.2 compact-host regression, the A6 accessibility tests, all Water science regressions, Pulse regression, global browser/accessibility baseline, and Lighthouse pass together.

A visually improved branch with a red quality gate is not award-ready.
