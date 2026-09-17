#!/usr/bin/env node
// GeoGeek static-delivery wrapper.
// Normal mode:
//   1) run legacy QA; its internal build call is redirected to build.legacy.mjs,
//   2) post-process the legacy artifact into the static-delivery form,
//   3) inject runtime stability guards and static fallbacks,
//   4) integrate standalone Lab instruments such as Gravity Trace.
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
  await import('./postbuild-static-delivery.mjs');
  await import('./postbuild-runtime-stability.mjs');
  await import('./postbuild-gravity-trace.mjs');
}
