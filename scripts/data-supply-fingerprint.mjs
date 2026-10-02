#!/usr/bin/env node
import { snapshotDatasets, referenceDatasets, readJson, pathsFor, referencePathsFor } from './data-supply-lib.mjs';

const parts = [];
for (const dataset of snapshotDatasets()) {
  const meta = await readJson(pathsFor(dataset).metaPath);
  parts.push(`${dataset.id}:${meta?.sha256 || 'missing'}`);
}
for (const dataset of referenceDatasets()) {
  const meta = await readJson(referencePathsFor(dataset).metaPath);
  parts.push(`${dataset.id}:${meta?.sha256 || 'missing'}:${meta?.version || 'missing'}`);
}
process.stdout.write(parts.sort().join('|'));
