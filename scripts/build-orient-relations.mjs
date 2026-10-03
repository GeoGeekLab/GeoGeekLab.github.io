#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const placesPath = path.join(root, 'site', 'play', 'orient', 'data', 'places.v1.json');
const relationsPath = path.join(root, 'site', 'play', 'orient', 'data', 'relations.v1.json');

globalThis.window = globalThis;
globalThis.GeoPlay = {};
await import('../site/play/orient/orient-geometry.js');
await import('../site/play/orient/orient-content.js');

const model = globalThis.GeoPlay.orient.contentModel;

export function generateRelationArtifact() {
  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  return model.buildRelationArtifact(places);
}

export function serializeRelationArtifact(artifact = generateRelationArtifact()) {
  return `${JSON.stringify(artifact)}\n`;
}

export function writeRelationArtifact() {
  const artifact = generateRelationArtifact();
  fs.mkdirSync(path.dirname(relationsPath), { recursive: true });
  fs.writeFileSync(relationsPath, serializeRelationArtifact(artifact));
  console.log(`ORIENT content: ${artifact.sourcePlaceCount} places → ${artifact.normalRelationCount} normal directed relations.`);
  return artifact;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) writeRelationArtifact();
