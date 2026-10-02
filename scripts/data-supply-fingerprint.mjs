#!/usr/bin/env node
import { snapshotDatasets, readJson, pathsFor } from './data-supply-lib.mjs';
const parts = [];
for (const dataset of snapshotDatasets()) {
  const meta = await readJson(pathsFor(dataset).metaPath);
  parts.push(`${dataset.id}:${meta?.sha256 || 'missing'}:${meta?.fetchedAt || 'missing'}`);
}
process.stdout.write(parts.sort().join('|'));
