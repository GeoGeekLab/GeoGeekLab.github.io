#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'site', 'orbital', 'data');
const dataPath = path.join(outDir, 'active.json');
const metaPath = path.join(outDir, 'active.meta.json');
const liveBase = String(process.env.ORBIT_LIVE_BASE || 'https://geogeeklab.github.io/orbital/data/').replace(/\/?$/, '/');
const liveDataUrl = new URL('active.json', liveBase).href;
const liveMetaUrl = new URL('active.meta.json', liveBase).href;

async function readJson(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); }
  catch { return null; }
}

async function atomicWrite(file, content) {
  await fs.mkdir(path.dirname(file), { recursive:true });
  const temp = `${file}.tmp-${process.pid}`;
  await fs.writeFile(temp, content);
  await fs.rename(temp, file);
}

async function main() {
  const localMeta = await readJson(metaPath);
  let metaResponse;
  try {
    metaResponse = await fetch(liveMetaUrl, { cache:'no-store', headers:{ accept:'application/json' } });
  } catch (error) {
    console.warn(`Orbit live snapshot prime skipped: ${error?.message || error}`);
    return;
  }
  if (!metaResponse.ok) {
    console.warn(`Orbit live snapshot prime skipped: metadata HTTP ${metaResponse.status}`);
    return;
  }

  const liveMeta = await metaResponse.json().catch(() => null);
  const liveMs = Date.parse(String(liveMeta?.fetchedAt || ''));
  const localMs = Date.parse(String(localMeta?.fetchedAt || ''));
  if (!liveMeta || liveMeta.dataset !== 'celestrak-active-gp' || !Number.isFinite(liveMs) || !liveMeta.sha256 || !liveMeta.recordCount) {
    console.warn('Orbit live snapshot prime skipped: metadata is malformed.');
    return;
  }
  if (Number.isFinite(localMs) && liveMs <= localMs) {
    console.log(`Orbit live snapshot prime not needed: local ${localMeta.fetchedAt} >= live ${liveMeta.fetchedAt}.`);
    return;
  }

  let dataResponse;
  try {
    dataResponse = await fetch(liveDataUrl, { cache:'no-store', headers:{ accept:'application/json' } });
  } catch (error) {
    console.warn(`Orbit live snapshot prime skipped: ${error?.message || error}`);
    return;
  }
  if (!dataResponse.ok) {
    console.warn(`Orbit live snapshot prime skipped: catalog HTTP ${dataResponse.status}`);
    return;
  }

  const dataText = await dataResponse.text();
  const sha256 = createHash('sha256').update(dataText).digest('hex');
  if (sha256 !== liveMeta.sha256) {
    console.warn(`Orbit live snapshot prime skipped: checksum mismatch ${sha256} != ${liveMeta.sha256}.`);
    return;
  }
  let records;
  try { records = JSON.parse(dataText); }
  catch {
    console.warn('Orbit live snapshot prime skipped: catalog is not valid JSON.');
    return;
  }
  if (!Array.isArray(records) || records.length !== Number(liveMeta.recordCount) || records.length < 5000) {
    console.warn('Orbit live snapshot prime skipped: catalog shape/count is invalid.');
    return;
  }

  await atomicWrite(dataPath, dataText.endsWith('\n') ? dataText : `${dataText}\n`);
  await atomicWrite(metaPath, `${JSON.stringify(liveMeta, null, 2)}\n`);
  console.log(`Orbit build primed from live snapshot: ${records.length.toLocaleString()} records · ${liveMeta.fetchedAt}`);
}

await main();
