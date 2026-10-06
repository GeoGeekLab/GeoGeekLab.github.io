#!/usr/bin/env node
// GeoGeek static-delivery wrapper.
// Normal mode:
//   1) run legacy QA; its internal build call is redirected to build.legacy.mjs,
//   2) materialize the data-driven Elsewhere BOOK index from the generated manifest,
//   3) run shared static-delivery, stability, performance, accessibility, Origin and visual-readiness transforms,
//   4) re-materialize authored BOOK bodies so generic transforms cannot replace them,
//   5) normalize font delivery last across the final HTML/CSS output.
// Legacy-build-only mode is used only by qa.legacy.mjs to avoid recursion.
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

if (process.env.GEOGEEK_LEGACY_BUILD_ONLY === '1') {
  await import('./build.legacy.mjs');
} else {
  const qa = spawnSync(process.execPath, ['scripts/qa.legacy.mjs'], {
    cwd: root,
    stdio: 'inherit',
    env: { ...process.env, GEOGEEK_LEGACY_BUILD_ONLY: '1' },
  });
  if (qa.error) throw qa.error;
  if (qa.status !== 0) process.exit(qa.status ?? 1);
  await import('./materialize-elsewhere-book-index.mjs');
  await import('./postbuild-static-delivery.mjs');
  await import('./postbuild-runtime-stability.mjs');
  await import('./postbuild-performance.mjs');
  await import('./postbuild-first-view-state.mjs');
  await import('./postbuild-round3.mjs');
  await import('./postbuild-origin-handoff.mjs');
  await import('./postbuild-visual-readiness.mjs');
  await import('./materialize-elsewhere-book-records.mjs');
  await import('./postbuild-font-stability.mjs');
}
