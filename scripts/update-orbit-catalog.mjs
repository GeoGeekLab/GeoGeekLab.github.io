#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'site', 'orbital', 'data');
const dataPath = path.join(outDir, 'active.json');
const metaPath = path.join(outDir, 'active.meta.json');
const sourceUrl = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=active&FORMAT=JSON';
const minimumIntervalMs = 2 * 60 * 60 * 1000;
const staleFailureMs = 8 * 60 * 60 * 1000;
const minimumRecords = 5000;

const exists = file => fs.access(file).then(() => true).catch(() => false);
const asIso = value => {
  const ms = Date.parse(String(value || ''));
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
};

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return null; }
}

function summarizeEpochs(records) {
  const epochs = records
    .map(record => Date.parse(String(record.EPOCH || '')))
    .filter(Number.isFinite)
    .sort((a, b) => a - b);
  if (!epochs.length) return { oldest:null, median:null, newest:null };
  return {
    oldest: new Date(epochs[0]).toISOString(),
    median: new Date(epochs[Math.floor(epochs.length / 2)]).toISOString(),
    newest: new Date(epochs[epochs.length - 1]).toISOString(),
  };
}

function validateCatalog(records, previousCount = null) {
  if (!Array.isArray(records)) throw new Error('CelesTrak payload is not a JSON array.');
  if (records.length < minimumRecords) throw new Error(`Catalog too small: ${records.length} < ${minimumRecords}.`);
  if (previousCount && records.length < previousCount * 0.8) {
    throw new Error(`Catalog shrank unexpectedly: ${records.length} vs previous ${previousCount}.`);
  }

  const ids = new Set();
  let invalid = 0;
  for (const record of records) {
    const id = String(record?.NORAD_CAT_ID ?? '').trim();
    const epoch = Date.parse(String(record?.EPOCH ?? ''));
    const meanMotion = Number(record?.MEAN_MOTION);
    const eccentricity = Number(record?.ECCENTRICITY);
    const inclination = Number(record?.INCLINATION);
    const name = String(record?.OBJECT_NAME ?? '').trim();
    if (!/^\d{1,9}$/.test(id) || ids.has(id) || !name || !Number.isFinite(epoch)
      || !(meanMotion > 0) || !(eccentricity >= 0 && eccentricity < 1)
      || !(inclination >= 0 && inclination <= 180)) {
      invalid += 1;
      continue;
    }
    ids.add(id);
  }
  if (invalid) throw new Error(`Catalog validation rejected ${invalid} malformed or duplicate record(s).`);

  const epochs = summarizeEpochs(records);
  const newestMs = Date.parse(epochs.newest || '');
  if (!Number.isFinite(newestMs) || Date.now() - newestMs > 72 * 60 * 60 * 1000) {
    throw new Error(`Newest element epoch is unexpectedly old: ${epochs.newest || 'unknown'}.`);
  }
  return epochs;
}

async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, content);
  await fs.rename(temp, file);
}

async function main() {
  const previousMeta = await readJson(metaPath);
  const previousCount = Number(previousMeta?.recordCount || 0) || null;
  const previousFetchedAt = Date.parse(String(previousMeta?.fetchedAt || ''));
  if (!process.env.ORBIT_FORCE_REFRESH && Number.isFinite(previousFetchedAt)
    && Date.now() - previousFetchedAt < minimumIntervalMs) {
    console.log(`Orbit catalog refresh skipped: last successful fetch was ${previousMeta.fetchedAt}.`);
    return;
  }

  let response;
  try {
    response = await fetch(sourceUrl, {
      headers: {
        accept: 'application/json',
        'user-agent': 'GeoGeekLab-Orbit-Snapshot/1.0 (+https://geogeeklab.github.io/)',
      },
      redirect: 'follow',
    });
  } catch (error) {
    return handleFetchFailure(`network error: ${error?.message || error}`, previousMeta);
  }

  if (!response.ok) {
    const body = (await response.text().catch(() => '')).replace(/\s+/g, ' ').trim().slice(0, 240);
    return handleFetchFailure(`CelesTrak HTTP ${response.status}${body ? ` — ${body}` : ''}`, previousMeta);
  }

  let records;
  try { records = await response.json(); }
  catch (error) { throw new Error(`CelesTrak JSON parse failed: ${error?.message || error}`); }

  const epochs = validateCatalog(records, previousCount);
  const fetchedAt = new Date().toISOString();
  const compact = `${JSON.stringify(records)}\n`;
  const sha256 = createHash('sha256').update(compact).digest('hex');
  const lastModified = asIso(response.headers.get('last-modified'));
  const meta = {
    schemaVersion: 1,
    dataset: 'celestrak-active-gp',
    format: 'CCSDS OMM JSON',
    source: sourceUrl,
    delivery: 'GeoGeek same-origin snapshot',
    fetchedAt,
    sourceLastModified: lastModified,
    recordCount: records.length,
    sha256,
    epochs,
    refreshPolicy: {
      minimumHours: 2,
      officialRequestsPerRun: 1,
      retryOnHttpError: false,
      lastKnownGoodOnFailure: true,
    },
  };

  await atomicWrite(dataPath, compact);
  await atomicWrite(metaPath, `${JSON.stringify(meta, null, 2)}\n`);
  console.log(`Orbit catalog snapshot updated: ${records.length.toLocaleString()} records · ${sha256.slice(0, 12)} · ${fetchedAt}`);
}

async function handleFetchFailure(reason, previousMeta) {
  const hasSnapshot = await exists(dataPath) && previousMeta?.fetchedAt;
  if (!hasSnapshot) throw new Error(`Orbit catalog refresh failed with no last-known-good snapshot: ${reason}`);
  const age = Date.now() - Date.parse(String(previousMeta.fetchedAt));
  console.warn(`Orbit catalog refresh failed; keeping last-known-good snapshot from ${previousMeta.fetchedAt}. ${reason}`);
  if ((!Number.isFinite(age) || age >= staleFailureMs) && process.env.ORBIT_ALLOW_STALE !== '1') {
    throw new Error(`Last-known-good Orbit snapshot is stale (${Math.round(age / 3600000)} h). ${reason}`);
  }
}

await main();
