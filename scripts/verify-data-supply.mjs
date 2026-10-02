#!/usr/bin/env node
import { DATASETS, snapshotDatasets, referenceDatasets, verifyDatasetFiles, verifyReferenceFiles } from './data-supply-lib.mjs';

const ids = new Set();
const modes = new Set(['snapshot','hybrid','query','tile','reference']);
const requireReferences = process.env.DATA_SUPPLY_REQUIRE_REFERENCES === '1';
const requireLastKnownGood = process.env.DATA_SUPPLY_REQUIRE_LAST_KNOWN_GOOD === '1';
for (const dataset of DATASETS) {
  if (!dataset.id || ids.has(dataset.id)) throw new Error(`Duplicate or missing data-supply id: ${dataset.id || '(empty)'}.`);
  ids.add(dataset.id);
  if (!modes.has(dataset.mode)) throw new Error(`${dataset.id} has unsupported mode ${dataset.mode}.`);
  if (!dataset.provider || !dataset.upstream || !dataset.timeSemantics || !dataset.resolution || !dataset.limit) throw new Error(`${dataset.id} is missing provenance fields.`);
  if ((dataset.mode === 'snapshot' || dataset.mode === 'hybrid') && (!dataset.snapshot || !dataset.metadata)) throw new Error(`${dataset.id} requires snapshot + metadata paths.`);
  if (dataset.mode === 'reference' && (!dataset.reference || !dataset.metadata || !dataset.version)) throw new Error(`${dataset.id} requires reference + metadata + version.`);
}

for (const dataset of snapshotDatasets()) {
  const required = dataset.id === 'orbit-active' || (requireLastKnownGood && dataset.fallback === 'last-known-good');
  const result = await verifyDatasetFiles(dataset, { allowMissing:!required });
  if (result.missing) console.warn(`${dataset.id}: no seeded snapshot in this checkout; runtime remains unavailable until deployment publishes a validated snapshot.`);
  else console.log(`${dataset.id}: ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)} · ${result.meta.fetchedAt}`);
}

for (const dataset of referenceDatasets()) {
  const result = await verifyReferenceFiles(dataset, { allowMissing:!requireReferences });
  if (result.missing) console.warn(`${dataset.id}: version-pinned reference is not seeded in Git; production preparation must materialize it before deployment.`);
  else console.log(`${dataset.id}: reference ${result.meta.version} · ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)}`);
}

console.log(`Data supply registry verified: ${DATASETS.length} datasets · ${snapshotDatasets().length} snapshot-capable · ${referenceDatasets().length} reference.`);
