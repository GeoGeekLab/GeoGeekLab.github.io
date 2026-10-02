#!/usr/bin/env node
import { snapshotDatasets, readJson, pathsFor, sourceUrlFor, validatePayload, serializePayload, sha256, metadataFor, atomicWrite, exists } from './data-supply-lib.mjs';

const only = new Set(String(process.env.DATA_SUPPLY_ONLY || '').split(',').map(s => s.trim()).filter(Boolean));
const force = process.env.DATA_SUPPLY_FORCE === '1';
const strict = process.env.DATA_SUPPLY_STRICT === '1';
const allowStale = process.env.DATA_SUPPLY_ALLOW_STALE === '1';
const datasets = snapshotDatasets().filter(dataset => !only.size || only.has(dataset.id));

async function handleFailure(dataset, reason, previousMeta) {
  const { dataPath } = pathsFor(dataset);
  const hasSnapshot = await exists(dataPath) && previousMeta?.fetchedAt;
  if (!hasSnapshot) {
    const message = `${dataset.id} refresh failed with no last-known-good snapshot: ${reason}`;
    if (strict || dataset.id === 'orbit-active') throw new Error(message);
    console.warn(`${message}. Runtime will use the declared provider fallback.`);
    return;
  }
  const age = Date.now() - Date.parse(String(previousMeta.fetchedAt));
  console.warn(`${dataset.id} refresh failed; keeping snapshot from ${previousMeta.fetchedAt}. ${reason}`);
  if ((!Number.isFinite(age) || age >= dataset.staleAfterMs) && !allowStale) throw new Error(`${dataset.id} last-known-good snapshot is stale (${Math.round(age / 3600000)} h). ${reason}`);
}

for (const dataset of datasets) {
  const { dataPath, metaPath } = pathsFor(dataset);
  const previousMeta = await readJson(metaPath);
  const previousFetchedAt = Date.parse(String(previousMeta?.fetchedAt || ''));
  if (!force && Number.isFinite(previousFetchedAt) && Date.now() - previousFetchedAt < dataset.refreshEveryMs) {
    console.log(`${dataset.id} refresh skipped: ${previousMeta.fetchedAt}.`);
    continue;
  }

  const sourceUrl = sourceUrlFor(dataset);
  let response;
  try {
    response = await fetch(sourceUrl, {
      headers:{ accept:'application/json', 'user-agent':'GeoGeekLab-Data-Supply/1.0 (+https://geogeeklab.github.io/)' },
      redirect:'follow',
    });
  } catch (error) {
    await handleFailure(dataset, `network error: ${error?.message || error}`, previousMeta);
    continue;
  }
  if (!response.ok) {
    const body = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 240);
    await handleFailure(dataset, `HTTP ${response.status}${body ? ` — ${body}` : ''}`, previousMeta);
    continue;
  }

  let payload;
  try { payload = await response.json(); }
  catch (error) { await handleFailure(dataset, `JSON parse failed: ${error?.message || error}`, previousMeta); continue; }

  let validation;
  try { validation = validatePayload(dataset, payload, previousMeta); }
  catch (error) { await handleFailure(dataset, `validation failed: ${error?.message || error}`, previousMeta); continue; }

  const content = serializePayload(payload);
  const contentHash = sha256(content);
  if (previousMeta?.sha256 === contentHash) {
    console.log(`${dataset.id} payload unchanged · ${validation.recordCount.toLocaleString()} records.`);
    continue;
  }
  const fetchedAt = new Date().toISOString();
  const meta = metadataFor(dataset, payload, response, validation, fetchedAt, contentHash, sourceUrl);
  await atomicWrite(dataPath, content);
  await atomicWrite(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`${dataset.id} updated · ${validation.recordCount.toLocaleString()} records · ${contentHash.slice(0,12)} · ${fetchedAt}`);
}
