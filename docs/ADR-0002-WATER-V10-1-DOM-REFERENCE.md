# ADR-0002 — V10.1 water RT numeric reference and UI validity

- Date: 2026-10-08
- Status: Engineering implementation; external science sign-off pending
- Scope: F04, F05, F07 partial, F12; F06 atmospheric coupling deferred
- Decision: Provide discrete independently solved *educational numerical* RTE reference slices using 16-stream, azimuth-averaged scalar DOM, with no ocean surface boundary. Reference is NOT labelled HydroLight or community-validated.
- Why: Prevents presenting arbitrary Beer–Lambert attenuation or ray animations as a full RT simulation; creates a genuinely different numerical physics engine from V10.0's fitted IOP–AOP mapping without misleading claims of external precision.
- Water IOP closure: `b=bb/fb(g)`, HG `g=0.8` assumed; no particulate VSF measured and no depth variation.
- Comparison variable: `rrs=L_u(0−,near-nadir)/Ed(0−)` versus V10.0 computed `subsurfaceRrs`, **never** compare this directly with above-water `Rrs`.
- Domain: 3 prescribed water cases × 3 in-water sun angles × 5 spectral nodes × 10 depths × 8 upward directions.
- UI: No interpolation of unsupported IOPs or geometry; all plots disclose provenance and units. Case-sync action is explicit and reversible via prior saved sessions.
- Failure behavior: Missing or invalid reference must show no curve; never substitute the semi-analytical model as an RT reference.
- Reproducibility: Source solver and generated JSON both version controlled; CI verifies all 45 reference solves, numerical residual and optical state identity. Experiment schema v8 records ref provenance.
- Future validation: compare to a recognized published numerical ocean RT implementation under exactly matched phase function and boundary, with angular/vertical grid convergence and energy accounting.
- Scientific reviewer: Pending
- Technical reviewer: Pending
