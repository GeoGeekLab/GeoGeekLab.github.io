#!/usr/bin/env node
import { DATA_SUPPLY_SCHEMA_VERSION, DATASETS, snapshotDatasets, referenceDatasets, verifyDatasetFiles, verifyReferenceFiles } from './data-supply-lib.mjs';

const ids = new Set();
const modes = new Set(['snapshot','hybrid','query','tile','reference']);
const requireReferences = process.env.DATA_SUPPLY_REQUIRE_REFERENCES === '1';
const requireLastKnownGood = process.env.DATA_SUPPLY_REQUIRE_LAST_KNOWN_GOOD === '1';
const requiredContractFields = [
  'provider', 'dataset', 'label', 'delivery', 'transport', 'format', 'scope',
  'upstream', 'fallback', 'timeSemantics', 'freshnessSemantics', 'resolution', 'limit'
];

function verifyStableMetadata(dataset, meta) {
  const expected = {
    schemaVersion:DATA_SUPPLY_SCHEMA_VERSION,
    supplyId:dataset.id,
    datasetLabel:dataset.dataset,
    provider:dataset.provider,
    format:dataset.format,
    source:dataset.upstream,
    delivery:dataset.delivery,
    transport:dataset.transport,
    scope:dataset.scope,
    timeSemantics:dataset.timeSemantics,
    freshnessSemantics:dataset.freshnessSemantics,
    resolution:dataset.resolution,
    limit:dataset.limit,
  };
  for (const [field, value] of Object.entries(expected)) {
    if (meta?.[field] !== value) throw new Error(`${dataset.id} metadata ${field} mismatch.`);
  }
}

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
  if (dataset.mode === 'reference' && (!dataset.reference || !dataset.metadata || !dataset.version)) {
    throw new Error(`${dataset.id} requires reference + metadata + version.`);
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
  const required = dataset.id === 'orbit-active' || (requireLastKnownGood && dataset.fallback === 'last-known-good');
  const result = await verifyDatasetFiles(dataset, { allowMissing:!required });
  if (result.missing) {
    console.warn(`${dataset.id}: no seeded snapshot in this checkout; runtime remains unavailable until deployment publishes a validated snapshot.`);
    continue;
  }
  if (dataset.id === 'usgs-earthquakes-day') {
    verifyStableMetadata(dataset, result.meta);
    if (Number(result.meta.providerCount) !== result.validation.providerCount) throw new Error(`${dataset.id} metadata providerCount mismatch.`);
    if (result.meta.providerGeneratedAt !== result.validation.providerGeneratedAt) throw new Error(`${dataset.id} metadata providerGeneratedAt mismatch.`);
    if (JSON.stringify(result.meta.eventTimeRange) !== JSON.stringify(result.validation.eventTimeRange)) throw new Error(`${dataset.id} metadata eventTimeRange mismatch.`);
    if (JSON.stringify(result.meta.eventUpdatedRange) !== JSON.stringify(result.validation.eventUpdatedRange)) throw new Error(`${dataset.id} metadata eventUpdatedRange mismatch.`);
    if (JSON.stringify(result.meta.scopeDetail) !== JSON.stringify(result.validation.scopeDetail)) throw new Error(`${dataset.id} metadata scopeDetail mismatch.`);
  }
  console.log(`${dataset.id}: ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)} · ${result.meta.fetchedAt}`);
}

for (const dataset of referenceDatasets()) {
  const result = await verifyReferenceFiles(dataset, { allowMissing:!requireReferences });
  if (result.missing) {
    console.warn(`${dataset.id}: version-pinned reference is not seeded in Git; production preparation must materialize it before deployment.`);
    continue;
  }
  verifyStableMetadata(dataset, result.meta);
  if (result.meta.version !== dataset.version) throw new Error(`${dataset.id} metadata version mismatch.`);
  if (result.meta.freshness !== 'version-pinned') throw new Error(`${dataset.id} metadata freshness must be version-pinned.`);
  console.log(`${dataset.id}: reference ${result.meta.version} · ${result.validation.recordCount.toLocaleString()} records · ${result.hash.slice(0,12)}`);
}

console.log(`Data supply registry verified: ${DATASETS.length} datasets · ${snapshotDatasets().length} snapshot-capable · ${referenceDatasets().length} reference.`);
