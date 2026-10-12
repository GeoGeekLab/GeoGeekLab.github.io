# GeoGeek Lab — Award Shell A4

Baseline: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

A4 moves the award work from a Water-only visual concept into the shared Observatory host.

It does not make the seven instruments visually identical.

## Scope

A4 changes the host shell only.

It does not change:

- Water equations, RT, schema, or reference data;
- Pulse event logic or task logic;
- Earth imagery logic;
- Orbit geometry;
- Flow computation;
- Figure abstraction logic;
- World projection computation.

The existing instrument viewports and inspector rails remain authoritative.

## Shared host grammar

Every Observatory instrument now receives the same orientation structure.

```text
LAB / OBSERVATORY
Instrument title        Instrument context        Task / mode       Exit
                       field
                       quantity
                       family axis
────────────────────────────────────────────────────────────────────────
                         scientific viewport
```

The host uses one family geometry.

- compact dark masthead;
- editorial scientific title;
- mono orientation labels;
- one stable 44 px circular Lab exit;
- one shared task-control grammar;
- one quiet provenance/status footer where the instrument already uses it.

## Instrument identity

A4 does not use one global accent for all instruments.

Each accent belongs to the domain identity.

| Instrument | Host identity |
| --- | --- |
| World | projection / relation |
| Figure | image → trace |
| Orbit | tracks / stations |
| Earth | layers / compare |
| Flow | vector / representation |
| Pulse | events / time |
| Water | 400–700 nm / radiative transfer |

The accent appears only in orientation and active-state chrome.

It does not recolor the scientific data visualization.

## Task ownership

A4 does not invent a second task system.

- Pulse continues to own Observe / Analyze.
- Orbit continues to use one continuous field.
- Water continues to own its workspace navigation inside the embedded workbench.
- World, Figure, Earth, and Flow continue to use the existing Focus / Work / Inspect host modes.

The A4 context only reads these states.

## Cross-Lab consistency rule

Family resemblance comes from host structure, typography roles, separators, task grammar, exit behavior, and provenance.

Instrument individuality comes from the scientific field, control semantics, data colors, and domain-specific motion.

This distinction prevents Water from becoming an isolated microsite and prevents Pulse, Earth, or Orbit from becoming Water skins.

## Motion rule

A4 adds no autonomous decorative motion.

Host transitions are limited to state emphasis.

Reduced-motion mode removes the remaining shell transitions.

## A5 direction

A5 should audit the seven primary scientific viewports as one exhibition sequence.

The next pass should focus on transition craft, responsive composition, and visual capture quality.

It should not add new scientific metaphors unless the underlying model supports them.
