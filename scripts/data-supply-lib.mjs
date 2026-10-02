import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DATA_SUPPLY_SCHEMA_VERSION, DATASETS, DATASET_BY_ID, snapshotDatasets } from '../site/data/supply-registry.js';

export const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export { DATASETS, DATASET_BY_ID, snapshotDatasets };

export const exists = file => fs.access(file).then(() => true).catch(() => false);
export const readJson = async file => { try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; } };
export const sha256 = content => createHash('sha256').update(content).digest('hex');
export const asIso = value => {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

export function pathsFor(dataset) {
  return {
    dataPath: path.join(root, 'site', dataset.snapshot),
    metaPath: path.join(root, 'site', dataset.metadata),
  };
}

export async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, content);
  await fs.rename(temp, file);
}

function summarizeEpochs(records) {
  const epochs = records.map(record => Date.parse(String(record?.EPOCH || ''))).filter(Number.isFinite).sort((a,b) => a-b);
  if (!epochs.length) return { oldest:null, median:null, newest:null };
  return {
    oldest:new Date(epochs[0]).toISOString(),
    median:new Date(epochs[Math.floor(epochs.length / 2)]).toISOString(),
    newest:new Date(epochs.at(-1)).toISOString(),
  };
}

export function sourceUrlFor(dataset, now = new Date()) {
  if (dataset.id !== 'emsc-events') return dataset.upstream;
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const end = new Date(start.getTime() + 86400000);
  const p = new URLSearchParams({
    format:'json', limit:'300', minmag:'3.5',
    starttime:`${start.toISOString().slice(0,10)}T00:00:00`,
    endtime:`${end.toISOString().slice(0,10)}T00:00:00`,
    orderby:'time-desc',
  });
  return `${dataset.upstream}?${p}`;
}

export function validatePayload(dataset, payload, previousMeta = null) {
  if (dataset.id === 'orbit-active') {
    if (!Array.isArray(payload)) throw new Error('Orbit payload is not a JSON array.');
    if (payload.length < 5000) throw new Error(`Orbit catalog too small: ${payload.length}.`);
    const previousCount = Number(previousMeta?.recordCount || 0);
    if (previousCount && payload.length < previousCount * 0.8) throw new Error(`Orbit catalog shrank unexpectedly: ${payload.length} vs ${previousCount}.`);
    const ids = new Set();
    for (const record of payload) {
      const id = String(record?.NORAD_CAT_ID ?? '').trim();
      const epoch = Date.parse(String(record?.EPOCH ?? ''));
      const meanMotion = Number(record?.MEAN_MOTION);
      const eccentricity = Number(record?.ECCENTRICITY);
      const inclination = Number(record?.INCLINATION);
      const name = String(record?.OBJECT_NAME ?? '').trim();
      if (!/^\d{1,9}$/.test(id) || ids.has(id) || !name || !Number.isFinite(epoch)
        || !(meanMotion > 0) || !(eccentricity >= 0 && eccentricity < 1)
        || !(inclination >= 0 && inclination <= 180)) throw new Error(`Orbit record validation failed near NORAD ${id || 'unknown'}.`);
      ids.add(id);
    }
    const epochs = summarizeEpochs(payload);
    const newestMs = Date.parse(epochs.newest || '');
    if (!Number.isFinite(newestMs) || Date.now() - newestMs > 72 * 3600000) throw new Error(`Newest orbit epoch is unexpectedly old: ${epochs.newest || 'unknown'}.`);
    return { recordCount:payload.length, epochs };
  }

  if (dataset.id === 'noaa-aurora') {
    const rows = payload?.coordinates;
    if (!Array.isArray(rows) || rows.length < 500) throw new Error(`NOAA OVATION grid is unexpectedly small: ${rows?.length || 0}.`);
    let valid = 0;
    for (const row of rows) {
      if (!Array.isArray(row) || row.length < 3) continue;
      const lon = Number(row[0]), lat = Number(row[1]), probability = Number(row[2]);
      if (Number.isFinite(lon) && lon >= -180 && lon <= 360 && Number.isFinite(lat) && lat >= -90 && lat <= 90 && Number.isFinite(probability) && probability >= 0 && probability <= 100) valid += 1;
    }
    if (valid < rows.length * 0.98) throw new Error(`NOAA OVATION validation accepted only ${valid}/${rows.length} rows.`);
    return { recordCount:rows.length, providerTime:asIso(payload?.['Forecast Time']) || asIso(payload?.['Observation Time']) };
  }

  if (dataset.id === 'smithsonian-volcanoes') {
    const features = payload?.features;
    if (payload?.type !== 'FeatureCollection' || !Array.isArray(features) || features.length < 500) throw new Error(`Smithsonian volcano payload is invalid or too small: ${features?.length || 0}.`);
    const valid = features.filter(feature => {
      const c = feature?.geometry?.coordinates;
      return feature?.geometry?.type === 'Point' && Array.isArray(c) && Number.isFinite(+c[0]) && Number.isFinite(+c[1]);
    }).length;
    if (valid < features.length * 0.95) throw new Error(`Smithsonian volcano geometry validation accepted only ${valid}/${features.length} features.`);
    return { recordCount:features.length };
  }

  if (dataset.id === 'emsc-events') {
    const features = payload?.features;
    if (payload?.type !== 'FeatureCollection' || !Array.isArray(features)) throw new Error('EMSC payload is not a FeatureCollection.');
    const invalid = features.filter(feature => {
      const c = feature?.geometry?.coordinates;
      return !Array.isArray(c) || !Number.isFinite(+c[0]) || !Number.isFinite(+c[1]);
    });
    if (invalid.length) throw new Error(`EMSC snapshot contains ${invalid.length} feature(s) without valid coordinates.`);
    return { recordCount:features.length };
  }

  throw new Error(`No validator registered for ${dataset.id}.`);
}

export function serializePayload(payload) {
  return `${JSON.stringify(payload)}\n`;
}

export function metadataFor(dataset, payload, response, validation, fetchedAt, contentHash, sourceUrl) {
  const common = {
    schemaVersion:DATA_SUPPLY_SCHEMA_VERSION,
    supplyId:dataset.id,
    dataset:dataset.metadataDataset || dataset.dataset || dataset.id,
    provider:dataset.provider,
    format:dataset.format,
    source:sourceUrl,
    delivery:dataset.delivery,
    transport:dataset.transport,
    scope:dataset.scope,
    fetchedAt,
    sourceLastModified:asIso(response?.headers?.get?.('last-modified')),
    recordCount:validation.recordCount,
    sha256:contentHash,
    timeSemantics:dataset.timeSemantics,
    freshnessSemantics:dataset.freshnessSemantics,
    resolution:dataset.resolution,
    limit:dataset.limit,
    refreshPolicy:{
      minimumMs:dataset.refreshEveryMs,
      staleAfterMs:dataset.staleAfterMs,
      retryOnHttpError:false,
      lastKnownGoodOnFailure:true,
    },
  };
  if (validation.epochs) common.epochs = validation.epochs;
  if (validation.providerTime) common.providerTime = validation.providerTime;
  if (dataset.id === 'emsc-events') {
    const u = new URL(sourceUrl);
    common.window = { start:u.searchParams.get('starttime'), end:u.searchParams.get('endtime') };
  }
  return common;
}

export async function verifyDatasetFiles(dataset, { allowMissing = false } = {}) {
  const { dataPath, metaPath } = pathsFor(dataset);
  const dataExists = await exists(dataPath), metaExists = await exists(metaPath);
  if (!dataExists && !metaExists && allowMissing) return { missing:true, dataset };
  if (!dataExists || !metaExists) throw new Error(`${dataset.id} snapshot pair is incomplete.`);
  const raw = await fs.readFile(dataPath, 'utf8');
  const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
  const hash = sha256(raw);
  if (hash !== meta.sha256) throw new Error(`${dataset.id} SHA-256 mismatch: ${hash} != ${meta.sha256}.`);
  if (meta.supplyId && meta.supplyId !== dataset.id) throw new Error(`${dataset.id} metadata supplyId mismatch: ${meta.supplyId}.`);
  if (dataset.metadataDataset && meta.dataset !== dataset.metadataDataset && meta.supplyId !== dataset.id) throw new Error(`${dataset.id} metadata dataset mismatch.`);
  const payload = JSON.parse(raw);
  const validation = validatePayload(dataset, payload, meta);
  if (Number(meta.recordCount) !== validation.recordCount) throw new Error(`${dataset.id} recordCount mismatch: ${meta.recordCount} != ${validation.recordCount}.`);
  return { missing:false, dataset, meta, validation, hash };
}
