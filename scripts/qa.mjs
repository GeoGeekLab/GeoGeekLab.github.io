#!/usr/bin/env node
// Legacy QA is intentionally executed inside build.mjs before post-processing.
// These commands validate the final static-delivery, runtime-stability, browser-
// performance, first-view, Round 3 accessibility/render-path, Origin handoff,
// and site-wide visual-readiness invariants.
await import('./qa-static-delivery.mjs');
await import('./qa-runtime-stability.mjs');
await import('./qa-performance.mjs');
await import('./qa-first-view-state.mjs');
await import('./qa-round3.mjs');
await import('./qa-origin-handoff.mjs');
await import('./qa-visual-readiness.mjs');
