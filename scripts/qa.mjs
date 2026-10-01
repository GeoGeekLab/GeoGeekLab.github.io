#!/usr/bin/env node
// Legacy QA is intentionally executed inside build.mjs before post-processing.
// These commands validate the final static-delivery, runtime-stability, and
// browser-performance invariants.
await import('./qa-static-delivery.mjs');
await import('./qa-runtime-stability.mjs');
await import('./qa-performance.mjs');
