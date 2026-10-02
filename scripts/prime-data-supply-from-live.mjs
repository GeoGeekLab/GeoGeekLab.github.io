#!/usr/bin/env node
import { snapshotDatasets, readJson, pathsFor, validatePayload, sha256, atomicWrite } from './data-supply-lib.mjs';

const liveBase = process.env.DATA_SUPPLY_LIVE_BASE || 'https://geogeeklab.github.io/';
const only = new Set(String(process.env.DATA_SUPPLY_ONLY || '').split(',').map(s => s.trim()).filter(Boolean));
const datasets = snapshotDatasets().filter(dataset => !only.size || only.has(dataset.id));

for (const dataset of datasets) {
  const remoteMetaUrl = new URL(dataset.metadata, liveBase).href;
  let metaResponse;
  try { metaResponse = await fetch(remoteMetaUrl, { cache:'no-store', headers:{ accept:'application/json' } }); }
  catch (error) { console.warn(`${dataset.id}: live metadata unavailable (${error?.message || error}); keeping checkout snapshot.`); continue; }
  if (!metaResponse.ok) { console.warn(`${dataset.id}: live metadata HTTP ${metaResponse.status}; keeping checkout snapshot.`); continue; }
  let remoteMeta;
  try { remoteMeta = await metaResponse.json(); } catch { console.warn(`${dataset.id}: live metadata is not JSON; keeping checkout snapshot.`); continue; }
  if (!remoteMeta?.fetchedAt || !remoteMeta?.sha256) { console.warn(`${dataset.id}: live metadata incomplete; keeping checkout snapshot.`); continue; }

  const { dataPath, metaPath } = pathsFor(dataset);
  const localMeta = await readJson(metaPath);
  const remoteMs = Date.parse(String(remoteMeta.fetchedAt));
  const localMs = Date.parse(String(localMeta?.fetchedAt || ''));
  if (localMeta?.sha256 === remoteMeta.sha256 || (Number.isFinite(localMs) && Number.isFinite(remoteMs) && localMs >= remoteMs)) {
    console.log(`${dataset.id}: checkout snapshot is current enough.`);
    continue;
  }

  const dataResponse = await fetch(new URL(dataset.snapshot, liveBase).href, { cache:'no-store', headers:{ accept:'application/json' } });
  if (!dataResponse.ok) { console.warn(`${dataset.id}: live snapshot HTTP ${dataResponse.status}; keeping checkout snapshot.`); continue; }
  const raw = await dataResponse.text();
  if (sha256(raw) !== remoteMeta.sha256) throw new Error(`${dataset.id}: live snapshot checksum does not match live metadata.`);
  const payload = JSON.parse(raw);
  const validation = validatePayload(dataset, payload, remoteMeta);
  if (validation.recordCount !== Number(remoteMeta.recordCount)) throw new Error(`${dataset.id}: live recordCount mismatch.`);
  await atomicWrite(dataPath, raw.endsWith('\n') ? raw : `${raw}\n`);
  await atomicWrite(metaPath, `${JSON.stringify(remoteMeta, null, 2)}\n`);
  console.log(`${dataset.id}: primed from live Pages · ${validation.recordCount.toLocaleString()} records · ${remoteMeta.fetchedAt}`);
}
