#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';
import { spawnSync } from 'node:child_process';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(__dirname,'..');
const dist=path.join(root,'dist');
const contentRoot=path.join(root,'content','field-notes');
const SITE='https://geogeeklab.github.io';
const read=p=>fs.readFile(p,'utf8');
const exists=p=>fs.access(p).then(()=>true).catch(()=>false);
const strip=s=>String(s||'').replace(/<script\b[\s\S]*?<\/script>/gi,' ').replace(/<style\b[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&\w+;/g,' ').replace(/\s+/g,' ').trim();
let failures=0,warnings=0;
function ok(cond,msg){if(cond) console.log(`✓ ${msg}`); else {console.error(`✗ ${msg}`); failures++;}}
function warn(cond,msg){if(!cond){console.warn(`! ${msg}`);warnings++;}}

function localized(r,lang,key){return r?.text?.[lang]?.[key]||r?.[lang]?.[key]||r?.[key]?.[lang]||(lang==='en'&&typeof r?.[key]==='string'?r[key]:'')||'';}
function slugify(s){return String(s||'').normalize('NFKD').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,90)||'record';}
function slug(r,d){return String(r?.data?.slug||r.slug||r.route||r.pathSlug||slugify(localized(r,'en','title')||r.ref||r.id||d)).replace(/^\/+|\/+$/g,'');}

async function loadRecords(){
  const dirs=(await fs.readdir(contentRoot,{withFileTypes:true})).filter(x=>x.isDirectory()).map(x=>x.name).sort();
  const out=[];
  for(const d of dirs){
    const rp=path.join(contentRoot,d,'record.json'); if(!(await exists(rp)))continue;
    const r=JSON.parse(await read(rp));
    const enp=path.join(contentRoot,d,'body.en.html'), zhp=path.join(contentRoot,d,'body.zh.html');
    out.push({d,r,slug:slug(r,d),en:await exists(enp)?await read(enp):'',zh:await exists(zhp)?await read(zhp):''});
  }
  return out;
}

function gzipSize(text){return gzipSync(Buffer.from(text)).length;}
function localScriptSrcs(html){
  return [...html.matchAll(/<script\b[^>]*\ssrc=(['"])(.*?)\1[^>]*><\/script>/gi)].map(m=>m[2]).filter(src=>!/^https?:/i.test(src));
}
async function scriptBudget(htmlFile){
  const html=await read(htmlFile); let total=0;
  for(const src of localScriptSrcs(html)){
    const p=src.startsWith('/')?path.join(dist,src.replace(/^\/+/,'')):path.resolve(path.dirname(htmlFile),src);
    if(await exists(p)) total+=gzipSize(await fs.readFile(p));
  }
  return total;
}
function hasImageTool(){return ['magick','convert'].some(cmd=>{const r=spawnSync(cmd,['-version'],{stdio:'ignore'});return !r.error&&r.status===0;});}

const records=await loadRecords();
ok(records.length>0,'Field Notes content records found');

const indexPath=path.join(dist,'data','site-index.json');
ok(await exists(indexPath),'metadata-only site index exists');
if(await exists(indexPath)){
  const txt=await read(indexPath); ok(!/bodyHtml/i.test(txt),'site index never contains article bodies');
  try{const data=JSON.parse(txt);ok(data.collections?.fieldNotes?.length===records.length,'site index contains every Field Note');}catch{ok(false,'site index is valid JSON');}
}

for(const p of [path.join(dist,'archive-content.js'),path.join(dist,'content','archive-content.js')]) if(await exists(p)){
  const js=await read(p);
  ok(!/("bodyHtml"\s*:\s*)"(?:(?:\\.)|[^"\\])+"/.test(js),'legacy archive payload contains no non-empty bodyHtml values');
}

for(const item of records){
  for(const lang of ['en','zh']){
    const file=lang==='zh'?path.join(dist,'zh','field-notes',item.slug,'index.html'):path.join(dist,'field-notes',item.slug,'index.html');
    ok(await exists(file),`${lang.toUpperCase()} static route exists: ${item.slug}`);
    if(!(await exists(file)))continue;
    const html=await read(file); const source=strip(item[lang]||item.en); const fragment=source.slice(0,Math.min(48,source.length));
    ok(html.includes('data-static-body'),`${lang.toUpperCase()} article body is prerendered`);
    if(fragment.length>15) ok(strip(html).includes(fragment),`${lang.toUpperCase()} source body text exists in first-response HTML`);
    ok(/<meta\b[^>]*name=(['"])description\1/i.test(html),'article has meta description');
    ok(/<link\b[^>]*rel=(['"])canonical\1/i.test(html),'article has canonical');
    ok(/property=(['"])og:title\1/i.test(html),'article has Open Graph metadata');
    ok(/hreflang=(['"])en\1/i.test(html)&&/hreflang=(['"])zh-CN\1/i.test(html),'article has reciprocal language alternates');
    ok(/application\/ld\+json/i.test(html),'article has structured data');
    if(records.length>1) ok(/static-related/i.test(html),'article exposes related-record navigation');
    const imgs=[...html.matchAll(/<img\b[^>]*>/gi)].map(m=>m[0]);
    for(const tag of imgs){
      const src=/\bsrc=(['"])(.*?)\1/i.exec(tag)?.[2]||'(no src)';
      ok(/\bwidth=(['"])\d+\1/i.test(tag)&&/\bheight=(['"])\d+\1/i.test(tag),`article image reserves intrinsic dimensions${/\bwidth=(['"])\d+\1/i.test(tag)&&/\bheight=(['"])\d+\1/i.test(tag)?'':` [${src}]`}`);
      ok(/\bdecoding=(['"])async\1/i.test(tag),`article image uses async decoding${/\bdecoding=(['"])async\1/i.test(tag)?'':` [${src}]`}`);
      ok(/\bloading=(['"])lazy\1/i.test(tag)||/\bfetchpriority=/i.test(tag),`article image has explicit loading policy${/\bloading=(['"])lazy\1/i.test(tag)||/\bfetchpriority=/i.test(tag)?'':` [${src}]`}`);
    }
  }
}

const collection=path.join(dist,'field-notes.html');
ok(await exists(collection),'Field Notes collection exists');
if(await exists(collection)){
  const html=await read(collection); const rows=(html.match(/class=(['"])[^'"]*static-note-row[^'"]*\1/gi)||[]).length;
  ok(rows===records.length,`Field Notes collection statically renders all ${records.length} records`);
}
const home=path.join(dist,'index.html');
if(await exists(home)){
  const html=await read(home);
  ok(/static-orientation/i.test(html),'homepage has a plain-language orientation layer');
  ok(/static-selected-work/i.test(html),'homepage selected work is prerendered');
}

for(const f of ['sitemap.xml','robots.txt','feed.xml','feed.json','zh/feed.xml','zh/feed.json','styles.base.css','styles-atlas.css','styles-commons.css']) ok(await exists(path.join(dist,f)),`${f} exists`);

if(await exists(path.join(dist,'sitemap.xml'))){
  const sm=await read(path.join(dist,'sitemap.xml'));
  for(const item of records){ok(sm.includes(`${SITE}/field-notes/${item.slug}/`)&&sm.includes(`${SITE}/zh/field-notes/${item.slug}/`),`sitemap includes EN/ZH: ${item.slug}`);}
}
for(const f of ['feed.json','zh/feed.json']) if(await exists(path.join(dist,f))){
  try{const data=JSON.parse(await read(path.join(dist,f)));ok(Array.isArray(data.items)&&data.items.length>0,`${f} is valid JSON Feed`);}catch{ok(false,`${f} is valid JSON Feed`);}
}
if(await exists(path.join(dist,'robots.txt'))) ok((await read(path.join(dist,'robots.txt'))).includes(`${SITE}/sitemap.xml`),'robots.txt advertises sitemap');

const budgetPath=path.join(__dirname,'performance-budget.json');
const budget=JSON.parse(await read(budgetPath));
function kib(n){return (n/1024).toFixed(1);}
if(await exists(home)) { const n=await scriptBudget(home); ok(n<=budget.homeInitialJsGzip,`home initial local JS ${kib(n)} KiB gzip ≤ ${Math.round(budget.homeInitialJsGzip/1024)} KiB`); }
if(records[0]){
  const article=path.join(dist,'field-notes',records[0].slug,'index.html');
  if(await exists(article)){
    const js=await scriptBudget(article), htmlSize=gzipSize(await read(article));
    ok(js<=budget.articleInitialJsGzip,`article initial local JS ${kib(js)} KiB gzip ≤ ${Math.round(budget.articleInitialJsGzip/1024)} KiB`);
    ok(htmlSize<=budget.articleHtmlGzip,`article HTML ${kib(htmlSize)} KiB gzip ≤ ${Math.round(budget.articleHtmlGzip/1024)} KiB`);
  }
}
if(await exists(collection)) { const n=await scriptBudget(collection); ok(n<=budget.collectionInitialJsGzip,`collection initial local JS ${kib(n)} KiB gzip ≤ ${Math.round(budget.collectionInitialJsGzip/1024)} KiB`); }
if(await exists(indexPath)) { const n=gzipSize(await read(indexPath)); ok(n<=budget.metadataIndexGzip,`metadata index ${kib(n)} KiB gzip ≤ ${Math.round(budget.metadataIndexGzip/1024)} KiB`); }
const baseCss=path.join(dist,'styles.base.css'); if(await exists(baseCss)) { const n=gzipSize(await read(baseCss)); ok(n<=budget.sharedCssGzip,`shared CSS ${kib(n)} KiB gzip ≤ ${Math.round(budget.sharedCssGzip/1024)} KiB`); }

warn(hasImageTool(),'ImageMagick is unavailable: responsive variants cannot be generated on this machine (intrinsic dimensions still enforced).');

if(failures){console.error(`\nStatic-delivery QA failed: ${failures} invariant(s), ${warnings} warning(s).`);process.exit(1);} else console.log(`\nStatic-delivery QA passed (${records.length} records, ${warnings} warning(s)).`);
