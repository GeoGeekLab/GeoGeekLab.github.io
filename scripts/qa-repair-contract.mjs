import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { scriptBudget } from './resource-budget.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const dist=path.join(root,'dist');
const read=relative=>fs.readFile(path.join(dist,relative),'utf8');
const feed=JSON.parse(await read('feed.json'));
assert.equal(feed.items.length,23);
assert(feed.items.every(item=>Number.isFinite(Date.parse(item.date_published))), 'Every feed date must be valid');
assert(!/Invalid Date/.test(await read('feed.xml')), 'RSS dates must be valid');
const publicNotes=JSON.parse(await read('data/field-notes.json'));
const notes=Array.isArray(publicNotes)?publicNotes:publicNotes.records || publicNotes.items;
assert.equal(notes.length,23);
assert(new Set(notes.map(item=>item.series)).size>1,'Series must retain their source categories');
assert(notes.some(item=>item.tags?.length),'Source tags must reach the public metadata');
const sitemap=await read('sitemap.xml');
assert(!sitemap.includes('/records/elsewhere-book-002.html'));
assert(!/<loc>[^<]*\/record\.html<\/loc>/.test(sitemap));
assert(/noindex/.test(await read('records/elsewhere-book-002.html')));
assert(/noindex/.test(await read('water/workbench-v9/app/index.html')));
for(const directory of await fs.readdir(path.join(dist,'field-notes'))) {
  assert.equal(await fs.access(path.join(dist,'field-notes',directory,'figures')).then(()=>true,()=>false),false,'Only one public figure path');
  assert(await scriptBudget(path.join(dist,'field-notes',directory,'index.html'),dist)<=40960,'Every canonical article must meet the initial JS budget');
}
const home=await read('index.html');
assert(!/href\s*=\s*['"]\/?styles\.css(?:[?'"#])/.test(home),'Home must use split CSS');
assert(home.includes('__GEOGEEK_BOOT_WATCHDOG__'),'Cold entry recovery must live in the document');
const current=await read('water/workbench-v10-2/app/index.html');
assert(!/\.\.\/\.\.\/workbench-v(?:5|6|7|8|9|10|10-1)\//.test(current),'Current Water must use stable shared dependencies');
console.log('Repair contracts passed: valid feeds, published content, bounded article JS, single figure paths and stable Water dependencies.');
