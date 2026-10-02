#!/usr/bin/env node
import { DATASETS, snapshotDatasets, verifyDatasetFiles } from './data-supply-lib.mjs';

const ids = new Set();
const modes = new Set(['snapshot','hybrid','query','tile']);
const requiredContractFields = [
  'provider', 'dataset', 'label', 'delivery', 'transport', 'format', 'scope',
  'upstream', 'fallback', 'timeSemantics', 'freshnessSemantics', 'resolution', 'limit'
];

for (const dataset of DATASETS) {
  if (!dataset.id || ids.has(dataset.id)) throw new Error(`Duplicate or missing data-supply id: ${dataset.id || '(empty)'}.`);
  ids.add(dataset.id);
  if (!modes.has(dataset.mode)) throw new Error(`${dataset.id} has unsupported mode ${dataset.mode}.`);

  const missing = requiredContractFields.filter(field => {
    const value = dataset[field];
    return typeof value !== 'string' || !value.trim();
  });
  if (missing.length) throw new Error(`${dataset.id} is missing data-supply contract field(s): ${missing.join(', ')}.`);

  if ((dataset.mode === 'snapshot' || dataset.mode === 'hybrid') && (!dataset.snapshot || !dataset.metadata)) {
    throw new Error(`${dataset.id} requires snapshot + metadata paths.`);
  }

  if (dataset.products) {
    if (!Array.isArray(dataset.products) || !dataset.products.length) throw new Error(`${dataset.id} products must be a non-empty array.`);
    const productIds = new Set();
    const providerLayers = new Set();
    const requiredProductFields = [
      'id', 'label', 'short', 'group', 'layer', 'format', 'renderMode', 'availabilityStart',
      'resolution', 'cadence', 'source', 'timeSemantics', 'freshnessSemantics', 'color', 'limit', 'note'
    ];

    for (const product of dataset.products) {
      const missingProduct = requiredProductFields.filter(field => {
        const value = product[field];
        return typeof value !== 'string' || !value.trim();
      });
      if (missingProduct.length) throw new Error(`${dataset.id}/${product.id || '(unknown product)'} is missing product contract field(s): ${missingProduct.join(', ')}.`);
      if (productIds.has(product.id)) throw new Error(`${dataset.id} has duplicate product id ${product.id}.`);
      productIds.add(product.id);
      if (providerLayers.has(product.layer)) throw new Error(`${dataset.id} has duplicate provider layer ${product.layer}.`);
      providerLayers.add(product.layer);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(product.availabilityStart) || !Number.isFinite(Date.parse(`${product.availabilityStart}T00:00:00Z`))) {
        throw new Error(`${dataset.id}/${product.id} has invalid availabilityStart ${product.availabilityStart}.`);
      }
      if (!Number.isInteger(product.conservativeLagDays) || product.conservativeLagDays < 0) {
        throw new Error(`${dataset.id}/${product.id} conservativeLagDays must be a non-negative integer.`);
      }
      if (!['base','overlay'].includes(product.renderMode)) throw new Error(`${dataset.id}/${product.id} has unsupported renderMode ${product.renderMode}.`);
      if (product.defaultOpacity != null && (!(product.defaultOpacity >= 0) || !(product.defaultOpacity <= 1))) {
        throw new Error(`${dataset.id}/${product.id} defaultOpacity must be between 0 and 1.`);
      }
    }
  }
}

for (const dataset of snapshotDatasets()) {
  const allowMissing = dataset.id !== 'orbit-active';
  const result = await verifyDatasetFiles(dataset, { allowMissing });
  if (result.missing) console.warn(`${dataset.id}: no seeded snapshot in this checkout; runtime/provider fallback remains available until deployment refresh.`);
  else console.log(`${dataset.id}: ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)} · ${result.meta.fetchedAt}`);
}
console.log(`Data supply registry verified: ${DATASETS.length} datasets · ${snapshotDatasets().length} snapshot-capable.`);
