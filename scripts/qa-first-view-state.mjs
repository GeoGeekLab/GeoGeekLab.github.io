#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

let failures = 0;
function check(ok, label) {
  if (ok) console.log(`✓ ${label}`);
  else { failures += 1; console.error(`✗ ${label}`); }
}

const home = await fs.readFile(path.join(dist, 'index.html'), 'utf8');
const lab = await fs.readFile(path.join(dist, 'lab.html'), 'utf8');

check(/<body[^>]*\bclass=(['"])[^'"]*ux-mobile-v5[^'"]*ux-page-home[^'"]*\1/i.test(home), 'VIEW-01 Home mobile layout state exists in first-response HTML');
check(!/<body[^>]*\bclass=(['"])[^'"]*ux-inner-page[^'"]*\1/i.test(home), 'VIEW-01 Home is not misclassified as an inner page');
check(/<body[^>]*\bclass=(['"])[^'"]*ux-inner-page[^'"]*ux-mobile-v5[^'"]*ux-page-lab[^'"]*\1/i.test(lab), 'VIEW-02 Lab mobile layout state exists in first-response HTML');

if (failures) {
  console.error(`\nFirst-view state QA failed: ${failures} invariant(s).`);
  process.exit(1);
}
console.log('\nFirst-view state QA passed.');
