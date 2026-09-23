import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root,'content','field-notes');
const failures=[];
const check=(c,m)=>{if(!c)failures.push(m)};

const gitignore = fs.readFileSync(path.join(root,'.gitignore'),'utf8');
check(gitignore.includes('site/archive-content.js'),'Generated local archive preview cache must be Git-ignored.');
check(gitignore.includes('site/assets/field-notes/'),'Generated local figure preview cache must be Git-ignored.');

const units=[];
for(const e of fs.readdirSync(content,{withFileTypes:true})) if(e.isDirectory()) units.push(e.name);
check(units.length===23,`Expected 23 field-note source units, found ${units.length}.`);

const refs=new Set(), slugs=new Set();
for(const id of units){
  const dir=path.join(content,id);
  const metaPath=path.join(dir,'record.json');
  check(fs.existsSync(metaPath),`${id}: record.json missing`);
  if(!fs.existsSync(metaPath)) continue;

  const r=JSON.parse(fs.readFileSync(metaPath,'utf8'));
  check(r.id===id,`${id}: id mismatch`);
  check(!refs.has(r.ref),`${id}: duplicate ref ${r.ref}`); refs.add(r.ref);
  check(!slugs.has(r.data?.slug),`${id}: duplicate slug ${r.data?.slug}`); slugs.add(r.data?.slug);
  check(Boolean(r.text?.en?.title),`${id}: missing English title`);
  check(!r.text?.zh,`${id}: Chinese text mapping remains`);
  check(!r.atlas?.text?.zh,`${id}: Chinese atlas mapping remains`);

  const enBody=path.join(dir,'body.en.html');
  const zhBody=path.join(dir,'body.zh.html');
  check(fs.existsSync(enBody),`${id}: body.en.html missing`);
  check(!fs.existsSync(zhBody),`${id}: body.zh.html must not exist`);

  if(fs.existsSync(enBody)){
    const html=fs.readFileSync(enBody,'utf8');
    check(!html.includes('assets/archive/'),`${id}: legacy slug-based archive asset path remains`);
    check(!/[A-Za-z]:\\\\/.test(html),`${id}: Windows absolute path leaked into English body`);
    for(const m of html.matchAll(/src="assets\/field-notes\/([^/]+)\/([^"]+)"/g)){
      check(m[1]===id,`${id}: figure path points at ${m[1]}`);
      check(fs.existsSync(path.join(dir,'figures',m[2])),`${id}: missing figure ${m[2]}`);
    }
    check(html.includes('archive-source-note'),`${id}: English edition provenance note missing`);
  }
}

for(const id of units){
  const r=JSON.parse(fs.readFileSync(path.join(content,id,'record.json'),'utf8'));
  for(const t of r.relations?.trace||[]) check(refs.has(t),`${id}: dangling trace ${t}`);
}

check(!fs.existsSync(path.join(root,'field-notes')), 'Generated field-notes directories must not live in repository source root.');
check(!fs.existsSync(path.join(root,'assets','archive')), 'Legacy generated archive assets must not live in repository source root.');
check(fs.existsSync(path.join(root,'site','assets','brand','wechat-qr.jpg')),'WeChat QR asset missing from source.');
check(fs.readFileSync(path.join(root,'site','field-notes.html'),'utf8').includes('wechat-archive-portal'),'Field Notes WeChat source channel panel missing.');
check(fs.readFileSync(path.join(root,'templates','field-note.html'),'utf8').includes('record-wechat-portal'),'Record WeChat source channel panel missing.');

const build=spawnSync(process.execPath,[path.join(root,'scripts','build.mjs')],{encoding:'utf8'});
check(build.status===0,`Build failed: ${build.stderr}`);
check(fs.existsSync(path.join(root,'site','archive-content.js')),'Local source preview archive cache was not generated.');
check(fs.existsSync(path.join(root,'site','assets','field-notes','n01')),'Local source preview figure cache was not generated.');

try {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'site','content.js'),'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root,'site','archive-content.js'),'utf8'), context);
  check(context.window.GEOGEEK_SOURCE_PREVIEW === true,'Source preview flag missing.');
  check(context.window.GEOGEEK_DATA?.en?.notes?.length === 23,'English source preview does not expose 23 field notes.');
  check(!context.window.GEOGEEK_DATA?.zh,'Chinese runtime data must not be generated.');
  check(!context.window.GEOGEEK_ARCHIVE?.locales?.zh,'Chinese locale must not exist in source archive.');
} catch (error) {
  check(false, `Source preview bootstrap failed: ${error.message}`);
}

const styles = fs.readFileSync(path.join(root,'site','styles.css'),'utf8');
const appSource = fs.readFileSync(path.join(root,'site','app.js'),'utf8');
check(styles.includes('.archive-figure.is-ultrawide'),'Archive figure aspect-ratio calibration styles missing.');
check(styles.includes('max-width: 720px'),'Long-form reading measure calibration missing.');
check(appSource.includes('calibrateArchiveReading'),'Archive figure/reading calibration runtime missing.');
check((appSource.match(/displayRecordTitle\(note\.title\)/g)||[]).length >= 2,'Archive titles must be consistent on home and collection views.');
check(!appSource.includes('geogeek-language'),'Legacy language localStorage remains in app.js.');

const englishOnlyRuntimeFiles = [
  'site/app.js',
  'site/atlas/atlas.js',
  'site/commons/commons.js',
  'site/content.js',
  'site/core/site-model.js',
  'site/games.js',
  'site/instruments.js',
  'site/map/site-map.js',
  'site/orbital/orbital-engine.js',
  'site/orbital/orbital-threshold.js',
  'site/previews.js',
  'site/ux-preinit.js',
  'site/ux-refinements.js',
  'site/stories/geospatial-ai-limits/app.js',
  'site/stories/geospatial-ai-limits/index.html'
];
for (const rel of englishOnlyRuntimeFiles) {
  const source = fs.readFileSync(path.join(root, rel), 'utf8');
  check(!/geogeek-language|geoai-lang|zh-CN|locale\s*===?\s*['"]zh['"]|locale===['"]zh['"]|\bisZh\b|\bzh\s*:/i.test(source), `${rel}: Chinese locale/runtime residue remains`);
}

const storySource = fs.readFileSync(path.join(root,'site','stories','geospatial-ai-limits','index.html'),'utf8');
check(/<html\b[^>]*\blang=(['"])en\1/i.test(storySource),'GeoAI story must be statically English.');
check(!/data-lang=|class=(['"])lang\1/i.test(storySource),'GeoAI story must not expose a language switch.');
const originSource = fs.readFileSync(path.join(root,'site','origin','index.html'),'utf8');
check(/<html\b[^>]*\blang=(['"])en\1/i.test(originSource),'Origin must be statically English.');

const dist=path.join(root,'dist');
check(fs.existsSync(path.join(dist,'index.html')),'dist/index.html missing');
check(fs.readFileSync(path.join(dist,'archive-content.js'),'utf8').includes('window.GEOGEEK_SOURCE_PREVIEW = false'),'Production archive bootstrap must disable source-preview routing.');
check(fs.readFileSync(path.join(root,'site','core','site-model.js'),'utf8').includes('!window.GEOGEEK_SOURCE_PREVIEW'),'Record routing must distinguish source preview from production routes.');
for(const id of units){
  const r=JSON.parse(fs.readFileSync(path.join(content,id,'record.json'),'utf8'));
  check(fs.existsSync(path.join(dist,'field-notes',r.data.slug,'index.html')),`${id}: generated page missing`);
}

const jsFiles=[];
const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.(?:js|mjs)$/.test(e.name))jsFiles.push(f)}};
walk(path.join(root,'site'));
walk(path.join(root,'scripts'));
for(const f of jsFiles){
  const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});
  check(r.status===0,`JS syntax: ${path.relative(root,f)} ${r.stderr}`);
}

if(failures.length){
  console.error(`GeoGeek source QA failed (${failures.length})`);
  failures.forEach((x,i)=>console.error(`${i+1}. ${x}`));
  process.exit(1);
}
console.log(`GeoGeek source QA passed · ${units.length} English field-note units · clean source/build separation`);
