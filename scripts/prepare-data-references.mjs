#!/usr/bin/env node
import { referenceDatasets, referencePathsFor, validatePayload, serializePayload, sha256, atomicWrite, exists, readJson } from './data-supply-lib.mjs';

for (const dataset of referenceDatasets()) {
  const { dataPath, metaPath } = referencePathsFor(dataset);
  const existingMeta = await readJson(metaPath);
  if (await exists(dataPath) && existingMeta?.sha256 && existingMeta?.version === dataset.version && existingMeta?.source === dataset.upstream) {
    const raw = await (await import('node:fs/promises')).readFile(dataPath, 'utf8');
    if (sha256(raw) === existingMeta.sha256) {
      const payload = JSON.parse(raw);
      const validation = validatePayload(dataset, payload, existingMeta);
      if (validation.recordCount === Number(existingMeta.recordCount)) {
        console.log(`${dataset.id}: using validated local/deployed reference ${dataset.version}.`);
        continue;
      }
    }
  }

  let response;
  try {
    response = await fetch(dataset.upstream, {
      headers:{ accept:'application/json', 'user-agent':'GeoGeekLab-Data-Supply/1.0 (+https://geogeeklab.github.io/)' },
      redirect:'follow',
    });
  } catch (error) {
    throw new Error(`${dataset.id} reference materialization failed: ${error?.message || error}`);
  }
  if (!response.ok) throw new Error(`${dataset.id} reference HTTP ${response.status}.`);

  let payload;
  try { payload = await response.json(); }
  catch (error) { throw new Error(`${dataset.id} reference JSON parse failed: ${error?.message || error}`); }
  const validation = validatePayload(dataset, payload, null);
  const raw = serializePayload(payload);
  const hash = sha256(raw);
  const meta = {
    schemaVersion:1,
    supplyId:dataset.id,
    dataset:dataset.id,
    provider:dataset.provider,
    format:'GeoJSON',
    source:dataset.upstream,
    delivery:'GeoGeek same-origin reference',
    version:dataset.version,
    recordCount:validation.recordCount,
    sha256:hash,
    timeSemantics:dataset.timeSemantics,
    resolution:dataset.resolution,
    limit:dataset.limit,
    scope:dataset.scope || null,
    freshness:'version-pinned',
    fallback:'unavailable',
    transform:'JSON normalized for static delivery; source geometries are otherwise unchanged.'
  };
  await atomicWrite(dataPath, raw);
  await atomicWrite(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`${dataset.id}: materialized reference ${dataset.version} · ${validation.recordCount.toLocaleString()} records · ${hash.slice(0,12)}.`);
}
