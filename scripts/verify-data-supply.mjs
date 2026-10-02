#!/usr/bin/env node
import { DATASETS, snapshotDatasets, verifyDatasetFiles } from './data-supply-lib.mjs';

const ids = new Set();
const modes = new Set(['snapshot','hybrid','query','tile']);
for (const dataset of DATASETS) {
  if (!dataset.id || ids.has(dataset.id)) throw new Error(`Duplicate or missing data-supply id: ${dataset.id || '(empty)'}.`);
  ids.add(dataset.id);
  if (!modes.has(dataset.mode)) throw new Error(`${dataset.id} has unsupported mode ${dataset.mode}.`);
  if (!dataset.provider || !dataset.upstream || !dataset.timeSemantics || !dataset.resolution || !dataset.limit) throw new Error(`${dataset.id} is missing provenance fields.`);
  if ((dataset.mode === 'snapshot' || dataset.mode === 'hybrid') && (!dataset.snapshot || !dataset.metadata)) throw new Error(`${dataset.id} requires snapshot + metadata paths.`);
}

for (const dataset of snapshotDatasets()) {
  const allowMissing = dataset.id !== 'orbit-active';
  const result = await verifyDatasetFiles(dataset, { allowMissing });
  if (result.missing) console.warn(`${dataset.id}: no seeded snapshot in this checkout; runtime/provider fallback remains available until deployment refresh.`);
  else console.log(`${dataset.id}: ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)} · ${result.meta.fetchedAt}`);
}
console.log(`Data supply registry verified: ${DATASETS.length} datasets · ${snapshotDatasets().length} snapshot-capable.`);
