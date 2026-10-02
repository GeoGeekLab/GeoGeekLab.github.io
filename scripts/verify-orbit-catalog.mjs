#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(root, 'site', 'orbital', 'data', 'active.json');
const metaPath = path.join(root, 'site', 'orbital', 'data', 'active.meta.json');

function fail(message) {
  console.error(`✗ ${message}`);
  process.exitCode = 1;
}

const dataText = await fs.readFile(dataPath, 'utf8');
const meta = JSON.parse(await fs.readFile(metaPath, 'utf8'));
const records = JSON.parse(dataText);

if (!Array.isArray(records)) fail('Orbit snapshot payload is not an array');
if (records.length < 5000) fail(`Orbit snapshot has too few records: ${records.length}`);
if (meta?.schemaVersion !== 1) fail(`Unexpected Orbit snapshot schema version: ${meta?.schemaVersion}`);
if (meta?.dataset !== 'celestrak-active-gp') fail(`Unexpected Orbit dataset: ${meta?.dataset}`);
if (meta?.format !== 'CCSDS OMM JSON') fail(`Unexpected Orbit format: ${meta?.format}`);
if (Number(meta?.recordCount) !== records.length) fail(`Metadata count ${meta?.recordCount} does not match payload ${records.length}`);

const sha256 = createHash('sha256').update(dataText).digest('hex');
if (meta?.sha256 !== sha256) fail(`Orbit snapshot checksum mismatch: ${sha256} != ${meta?.sha256}`);

const ids = new Set();
let invalid = 0;
for (const record of records) {
  const id = String(record?.NORAD_CAT_ID ?? '').trim();
  const epoch = Date.parse(String(record?.EPOCH ?? ''));
  const meanMotion = Number(record?.MEAN_MOTION);
  const eccentricity = Number(record?.ECCENTRICITY);
  const inclination = Number(record?.INCLINATION);
  if (!/^\d{1,9}$/.test(id) || ids.has(id) || !Number.isFinite(epoch)
    || !(meanMotion > 0) || !(eccentricity >= 0 && eccentricity < 1)
    || !(inclination >= 0 && inclination <= 180)) invalid += 1;
  ids.add(id);
}
if (invalid) fail(`Orbit snapshot contains ${invalid} malformed or duplicate record(s)`);

const fetchedMs = Date.parse(String(meta?.fetchedAt || ''));
if (!Number.isFinite(fetchedMs)) fail('Orbit metadata fetchedAt is invalid');

if (!process.exitCode) {
  const ageHours = Math.max(0, (Date.now() - fetchedMs) / 3600000);
  console.log(`✓ Orbit snapshot integrity passed · ${records.length.toLocaleString()} records · ${ageHours.toFixed(1)} h old · ${sha256.slice(0, 12)}`);
}
