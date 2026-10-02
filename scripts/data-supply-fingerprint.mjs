#!/usr/bin/env node
import { snapshotDatasets, referenceDatasets, readJson, pathsFor, referencePathsFor, sha256 } from './data-supply-lib.mjs';

function contractHash(meta) {
  if (!meta) return 'missing';
  const stable = {
    schemaVersion:meta.schemaVersion,
    supplyId:meta.supplyId,
    dataset:meta.dataset,
    datasetLabel:meta.datasetLabel,
    provider:meta.provider,
    format:meta.format,
    source:meta.source,
    delivery:meta.delivery,
    transport:meta.transport,
    scope:meta.scope,
    timeSemantics:meta.timeSemantics,
    freshnessSemantics:meta.freshnessSemantics,
    resolution:meta.resolution,
    limit:meta.limit,
    refreshPolicy:meta.refreshPolicy || null,
    version:meta.version || null,
    fallback:meta.fallback || null,
  };
  return sha256(JSON.stringify(stable));
}

const parts = [];
for (const dataset of snapshotDatasets()) {
  const meta = await readJson(pathsFor(dataset).metaPath);
  parts.push(`${dataset.id}:${meta?.sha256 || 'missing'}:${contractHash(meta)}`);
}
for (const dataset of referenceDatasets()) {
  const meta = await readJson(referencePathsFor(dataset).metaPath);
  parts.push(`${dataset.id}:${meta?.sha256 || 'missing'}:${contractHash(meta)}`);
}
process.stdout.write(parts.sort().join('|'));
