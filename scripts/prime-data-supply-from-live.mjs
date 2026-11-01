#!/usr/bin/env node
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { snapshotDatasets, referenceDatasets, readJson, pathsFor, referencePathsFor, validatePayload, sha256, atomicWrite } from './data-supply-lib.mjs';

// A seed is an integrity-checked recovery input, not a claim of current data.
// The subsequent upstream refresh and release verification enforce freshness.
export function validatePrimeSnapshot(dataset, raw, meta) {
  if (sha256(raw) !== meta?.sha256) throw new Error(`${dataset.id}: live snapshot checksum does not match live metadata.`);
  if (meta.supplyId && meta.supplyId !== dataset.id) throw new Error(`${dataset.id}: live metadata supplyId mismatch.`);
  const validation = validatePayload(dataset, JSON.parse(raw), meta, { requireFreshness:false });
  if (validation.recordCount !== Number(meta.recordCount)) throw new Error(`${dataset.id}: live recordCount mismatch.`);
  return validation;
}

export async function primeFromLive({
  liveBase = process.env.DATA_SUPPLY_LIVE_BASE || 'https://geogeeklab.github.io/',
  only = new Set(String(process.env.DATA_SUPPLY_ONLY || '').split(',').map(s => s.trim()).filter(Boolean)),
  snapshots = snapshotDatasets(), references = referenceDatasets(),
  fetchImpl = fetch, readLocal = readJson, write = atomicWrite, logger = console,
} = {}) {
  const outcomes = [];
  const selected = [...snapshots.map(dataset => ({ dataset, reference:false })), ...references.map(dataset => ({ dataset, reference:true }))]
    .filter(({ dataset }) => !only.size || only.has(dataset.id));

  for (const { dataset, reference } of selected) {
    try {
      const response = await fetchImpl(new URL(dataset.metadata, liveBase).href, {
        cache:'no-store', headers:{ accept:'application/json' }, signal:AbortSignal.timeout(30000),
      });
      if (!response.ok) throw new Error(`live metadata HTTP ${response.status}`);
      const meta = await response.json();
      if (!meta?.sha256 || (!reference && !meta.fetchedAt)) throw new Error('live metadata incomplete');
      if (reference && (meta.version !== dataset.version || meta.source !== dataset.upstream)) {
        throw new Error('deployed reference does not match the registry pin');
      }
      const { dataPath, metaPath } = reference ? referencePathsFor(dataset) : pathsFor(dataset);
      const localMeta = await readLocal(metaPath);
      const localMs = Date.parse(String(localMeta?.fetchedAt || ''));
      const remoteMs = Date.parse(String(meta.fetchedAt || ''));
      const current = localMeta?.sha256 === meta.sha256 && (!reference || localMeta.version === dataset.version);
      if (current || (!reference && Number.isFinite(localMs) && Number.isFinite(remoteMs) && localMs >= remoteMs)) {
        logger.log(`${dataset.id}: checkout snapshot is current enough.`);
        outcomes.push({ id:dataset.id, status:'kept' });
        continue;
      }
      const dataResponse = await fetchImpl(new URL(reference ? dataset.reference : dataset.snapshot, liveBase).href, {
        cache:'no-store', headers:{ accept:'application/json' }, signal:AbortSignal.timeout(30000),
      });
      if (!dataResponse.ok) throw new Error(`live snapshot HTTP ${dataResponse.status}`);
      const raw = await dataResponse.text();
      const validation = validatePrimeSnapshot(dataset, raw, meta);
      // Preserve exact bytes: adding a newline would invalidate the stored hash.
      await write(dataPath, raw);
      await write(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
      logger.log(`${dataset.id}: recovery seed from live Pages · ${validation.recordCount.toLocaleString()} records · ${meta.fetchedAt || meta.version}`);
      outcomes.push({ id:dataset.id, status:'primed' });
    } catch (error) {
      // A bad or unavailable seed must not prevent a fresh upstream request.
      // Nothing unverified is written; final release validation still fails closed.
      logger.warn(`${dataset.id}: live seed unavailable (${error?.message || error}); keeping checkout data for the upstream refresh.`);
      outcomes.push({ id:dataset.id, status:'unavailable' });
    }
  }
  return outcomes;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await primeFromLive();
