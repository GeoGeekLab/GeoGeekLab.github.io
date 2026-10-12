# GeoGeek Lab Visual Constitution

Baseline for this document: release `20261011v107watercache1`, commit `9718171862959c9232e1dd7b4f69d31c36b0bc75`.

This document defines family resemblance across Lab instruments. It does not require every instrument to share the same layout.

## 1. Product rule

Every Lab instrument must look like part of one scientific observatory.

Each instrument can have one domain-specific visual signature.

Shared structure must remain more stable than instrument-specific decoration.

## 2. Shared host DNA

Use these rules across Water, Pulse, Earth, World, Orbit, Flow, and Figure.

- Use a near-black green field as the main environment.
- Use warm off-white for primary text.
- Use muted mineral green-gray for secondary text.
- Use mono type for scientific labels, coordinates, units, status, and provenance.
- Use sans-serif type for controls and compact explanations.
- Use serif type only for editorial scientific titles or major interpretive headings.
- Use thin separators before decorative cards.
- Keep model limits, source state, and provenance visible or directly discoverable.
- Keep the main scientific field visually larger than the inspector rail.

Reference shared values:

- environment: approximately `#09100c` to `#0b120e`;
- panel: approximately `#101913`;
- secondary panel: approximately `#142019`;
- primary text: approximately `#f1efe7`;
- subtle separators: warm-white alpha around 0.10–0.16.

These values are a family range, not a requirement for byte-identical CSS.

## 3. Geometry

The host shell uses restrained geometry.

- Rails and data sections use square or near-square corners.
- Controls usually use 0–8 px radius.
- Large 16–24 px radius is reserved for a single immersive viewport.
- Do not wrap every result in a rounded card.
- Prefer one field plus one inspector over nested dashboard grids.

Pulse already demonstrates the compact square rail pattern.

Earth, World, and Orbit can retain rounded immersive canvases because the canvas represents one spatial viewport.

Water should use the compact rail pattern and a continuous optical field.

## 4. Semantic color ownership

A color must have one reason to exist.

Shared caution or attention can use warm amber or orange.

Instrument signatures:

| Instrument | Primary signature | Meaning |
| --- | --- | --- |
| Pulse | seismic orange | events, aggregation, active seismic signal |
| Water | spectral cyan/mineral wavelength color + warm solar | wavelength selection, optical signal, solar geometry |
| Earth Observation | cyan/blue/orange pairings | image comparison, temporal layers, reference states |
| World | orange + data-layer colors | projection selection, distortion, external event layers |
| Orbit | warm orange | active orbit/station/action state |

Do not use the instrument signature as a generic decoration color.

Do not encode a scientific result with color alone.

## 5. Information hierarchy

Every instrument must answer these questions without reading the whole page.

1. What instrument is open?
2. What task or workspace is active?
3. What data or model state is active?
4. What is the main scientific result?
5. What limits the interpretation?

The preferred order is:

```text
instrument / task
      │
      ▼
primary scientific field
      │
      ├── direct controls
      ├── compact telemetry
      └── interpretation / limits
```

## 6. Inspector rail

Use one compact inspector rail when a workspace has persistent parameters.

- Keep the rail between about 315 and 426 px on large screens.
- Use one vertical scroll owner in the rail.
- Put primary controls before advanced controls.
- Use native disclosure for secondary parameters.
- Never hide a control required to reproduce the visible result.
- Keep labels and values stable during pointer interaction.

Water A2 targets the Pulse rail density.

## 7. Motion

Motion must communicate state, geometry, or causality.

Allowed examples:

- wavelength marker movement;
- selected depth movement;
- solar-angle geometry rotation;
- image-comparison handle movement;
- orbit camera or selection transitions;
- map pan and zoom.

Avoid:

- floating cards;
- decorative parallax;
- cursor-following effects that imply measurement;
- looping particles that resemble physical simulation without a model basis.

All nonessential motion must stop under `prefers-reduced-motion`.

## 8. Scientific visualization rule

A visual can be one of three things.

### Computed result

The visual is generated from a model or dataset.

Label the quantity, unit, source, and relevant assumptions.

### Selection geometry

The visual summarizes an explicit control state.

Label it as geometry or selection state.

Do not make it resemble a computed field.

### Conceptual explanation

The visual explains a process.

Label it as schematic or conceptual.

Do not make it resemble measured or solved data.

Water A2 uses a selection-geometry panel for RT.

It explicitly says `NOT A RADIANCE FIELD`.

## 9. Typography

Use three roles.

```text
editorial scientific title  → serif
interface / explanation     → sans
measurement / label / unit  → mono
```

Do not use mono for long explanatory paragraphs.

Do not use serif for dense control labels.

## 10. Award-quality threshold

Visual polish alone is insufficient.

A candidate release must satisfy all of these conditions.

- The main interaction has a clear scientific purpose.
- The primary field has a recognizable visual identity.
- The instrument remains usable without animation.
- Keyboard and touch interaction remain complete.
- Reduced-motion mode remains coherent.
- Scientific limitations remain visible.
- Existing numerical regression tests pass.
- Mobile layouts remain readable without shrinking scientific text below practical size.
- Lighthouse and browser quality gates remain green.
- The instrument still looks like GeoGeek Lab beside its sibling instruments.

## 11. Change control

Any award concept must declare:

- the source release token;
- the source commit;
- the affected instrument version;
- whether model code changes;
- whether experiment schema changes;
- whether reference data changes.

A concept must not silently rebase onto a later release.

Rebasing requires a separate review of visual, scientific, and regression changes.
