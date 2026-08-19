#!/usr/bin/env node
// Legacy QA is intentionally executed inside build.mjs before post-processing.
// This command validates the final static-delivery artifact.
await import('./qa-static-delivery.mjs');
