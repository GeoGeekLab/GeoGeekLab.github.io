# ADR-0001 — V10.0 isolated science contract and compatibility

- Status: IMPLEMENTED — pending scientific and technical approval
- Date: 2026-10-08
- Requirements: F01, F02-R001/R002/R003/R007, F03, F12
- Scientific change type: A (scope/metadata), C (explicit optional slope variant), and E (schema export lineage)
- Decision: Keep the V9.1 forward baseline bytewise comparable at default parameters. Add custom CDOM/NAP slopes only inside the V10 application and label their scientific variant distinctly.
- Rationale: Retains reproducibility and isolates potential regression. It avoids claiming a new depth-angle radiative-transfer solver.
- Measurement contract: existing Rrs sr^-1; existing rho_TOA* dimensionless teaching quantity; added band OC4 uses nominal OLCI band Rrs. Band radiance calculation is a separate interface with no fabricated input.
- Domain: V9-compatible 400–700 nm. OLCI Oa11 is explicitly unsupported by the water model.
- Migration: V10 schema 7; strict legacy v3–v6 import with fixed slopes and matched model metadata. Dedicated localStorage key.
- Numerical tests: V9/V10 default identity, spectrum slope change isolation, out-of-domain, SRF constant integral, OC4 band metadata, old/new experiment compatibility.
- Rollback: host retains V9 script and explicit waterVersion=v9 compatibility switch.
- Follow-up decision: ADR-0002 will define a verified radiance-first observation path and official SRF source policy. RT solver selection deferred to ADR-0003.
- Scientific reviewer: PENDING
- Technical reviewer: PENDING
