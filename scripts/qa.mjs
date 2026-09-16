#!/usr/bin/env node
// Legacy QA is intentionally executed inside build.mjs before post-processing.
// These commands validate the final static-delivery artifact and runtime-stability invariants.
await import('./qa-static-delivery.mjs');
await import('./qa-runtime-stability.mjs');
