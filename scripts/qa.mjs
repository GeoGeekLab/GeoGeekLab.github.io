import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root,'content','field-notes');
const failures=[]; const check=(c,m)=>{if(!c)failures.push(m)};
const plainText = html => html.replace(/<script[\s\S]*?<\/script>/gi,' ').replace(/<style[\s\S]*?<\/style>/gi,' ').replace(/<[^>]+>/g,' ').replace(/&nbsp;|&#160;/g,' ').replace(/&amp;/g,'&').replace(/\s+/g,' ').trim();

const gitignore = fs.readFileSync(path.join(root,'.gitignore'),'utf8');
check(gitignore.includes('site/archive-content.js'),'Generated local archive preview cache must be Git-ignored.');
check(gitignore.includes('site/assets/field-notes/'),'Generated local figure preview cache must be Git-ignored.');

const units=[];
for(const e of fs.readdirSync(content,{withFileTypes:true})) if(e.isDirectory()) units.push(e.name);
check(units.length===22,`Expected 22 field-note source units, found ${units.length}.`);
const refs=new Set(), slugs=new Set();
for(const id of units){
  const dir=path.join(content,id); const metaPath=path.join(dir,'record.json');
  check(fs.existsSync(metaPath),`${id}: record.json missing`); if(!fs.existsSync(metaPath)) continue;
  const r=JSON.parse(fs.readFileSync(metaPath,'utf8'));
  check(r.id===id,`${id}: id mismatch`); check(!refs.has(r.ref),`${id}: duplicate ref ${r.ref}`); refs.add(r.ref);
  check(!slugs.has(r.data?.slug),`${id}: duplicate slug ${r.data?.slug}`); slugs.add(r.data?.slug);
  for(const lang of ['en','zh']){
    check(r.text?.[lang]?.title,`${id}: missing ${lang} title`);
    const body=path.join(dir,`body.${lang}.html`); check(fs.existsSync(body),`${id}: body.${lang}.html missing`);
    if(fs.existsSync(body)){
      const html=fs.readFileSync(body,'utf8');
      check(!html.includes('assets/archive/'),`${id}: legacy slug-based archive asset path remains in ${lang}`);
      check(!/[A-Za-z]:\\/.test(html),`${id}: Windows absolute path leaked into ${lang}`);
      for(const m of html.matchAll(/src="assets\/field-notes\/([^/]+)\/([^"]+)"/g)){
        check(m[1]===id,`${id}: figure path points at ${m[1]}`);
        check(fs.existsSync(path.join(dir,'figures',m[2])),`${id}: missing figure ${m[2]}`);
      }
    }
  }
  const zhHtml=fs.readFileSync(path.join(dir,'body.zh.html'),'utf8');
  const enHtml=fs.readFileSync(path.join(dir,'body.en.html'),'utf8');
  const zhText=plainText(zhHtml), enText=plainText(enHtml);
  check(enText.length >= zhText.length * 1.35,`${id}: English web edition appears incomplete (${enText.length} vs ${zhText.length} text chars)`);
  check((enHtml.match(/<figure\b/g)||[]).length === (zhHtml.match(/<figure\b/g)||[]).length,`${id}: EN/ZH figure count mismatch`);
  check(enHtml.includes('archive-source-note'),`${id}: English edition provenance note missing`);
}
for(const id of units){ const r=JSON.parse(fs.readFileSync(path.join(content,id,'record.json'),'utf8')); for(const t of r.relations?.trace||[]) check(refs.has(t),`${id}: dangling trace ${t}`); }
check(!fs.existsSync(path.join(root,'field-notes')), 'Generated field-notes directories must not live in repository source root.');
check(!fs.existsSync(path.join(root,'assets','archive')), 'Legacy generated archive assets must not live in repository source root.');
check(fs.existsSync(path.join(root,'site','assets','brand','wechat-qr.jpg')),'WeChat QR asset missing from source.');
check(fs.readFileSync(path.join(root,'site','field-notes.html'),'utf8').includes('wechat-archive-portal'),'Field Notes WeChat source channel panel missing.');
check(fs.readFileSync(path.join(root,'templates','field-note.html'),'utf8').includes('record-wechat-portal'),'Record WeChat source channel panel missing.');
const build=spawnSync(process.execPath,[path.join(root,'scripts','build.mjs')],{encoding:'utf8'}); check(build.status===0,`Build failed: ${build.stderr}`);
check(fs.existsSync(path.join(root,'site','archive-content.js')),'Local source preview archive cache was not generated.');
check(fs.existsSync(path.join(root,'site','assets','field-notes','n01')),'Local source preview figure cache was not generated.');
try {
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(path.join(root,'site','content.js'),'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(root,'site','archive-content.js'),'utf8'), context);
  check(context.window.GEOGEEK_SOURCE_PREVIEW === true,'Source preview flag missing.');
  check(context.window.GEOGEEK_DATA?.en?.notes?.length === 22,'English source preview does not expose 22 field notes.');
  check(context.window.GEOGEEK_DATA?.zh?.notes?.length === 22,'Chinese source preview does not expose 22 field notes.');
  const zh = context.window.GEOGEEK_DATA?.zh?.ui || {};
  check(zh.filters?.observation === '观测之限','Chinese archive series label fell back to English.');
  check(zh.filters?.scale === '尺度与外推','Chinese scale series label fell back to English.');
  check(zh.filters?.causality === '归因与因果','Chinese causality series label fell back to English.');
  check(zh.filters?.representation === '地球表征','Chinese representation series label fell back to English.');
  check(zh.filters?.practice === '研究实践','Chinese practice series label fell back to English.');
  check(zh.archivePortal?.label === '原刊' && zh.archivePortal?.scan === '微信扫码','Chinese WeChat archive portal is incomplete.');
} catch (error) {
  check(false, `Source preview bootstrap failed: ${error.message}`);
}


const styles = fs.readFileSync(path.join(root,'site','styles.css'),'utf8');
const appSource = fs.readFileSync(path.join(root,'site','app.js'),'utf8');
check(styles.includes('.archive-figure.is-ultrawide'),'Archive figure aspect-ratio calibration styles missing.');
check(styles.includes('max-width: 720px'),'Long-form reading measure calibration missing.');
check(styles.includes('margin-bottom: 1.78em'),'Chinese paragraph spacing calibration missing.');
check(appSource.includes('calibrateArchiveReading'),'Archive figure/reading calibration runtime missing.');
check((appSource.match(/displayRecordTitle\(note\.title\)/g)||[]).length >= 2,'Localized archive titles must be consistent on home and collection views.');

const dist=path.join(root,'dist'); check(fs.existsSync(path.join(dist,'index.html')),'dist/index.html missing');
check(fs.readFileSync(path.join(dist,'archive-content.js'),'utf8').includes('window.GEOGEEK_SOURCE_PREVIEW = false'),'Production archive bootstrap must disable source-preview routing.');
check(fs.readFileSync(path.join(root,'site','core','site-model.js'),'utf8').includes('!window.GEOGEEK_SOURCE_PREVIEW'),'Record routing must distinguish source preview from production routes.');
for(const id of units){ const r=JSON.parse(fs.readFileSync(path.join(content,id,'record.json'),'utf8')); check(fs.existsSync(path.join(dist,'field-notes',r.data.slug,'index.html')),`${id}: generated page missing`); }
const jsFiles=[]; const walk=d=>{for(const e of fs.readdirSync(d,{withFileTypes:true})){const f=path.join(d,e.name);if(e.isDirectory())walk(f);else if(/\.(?:js|mjs)$/.test(e.name))jsFiles.push(f)}}; walk(path.join(root,'site')); walk(path.join(root,'scripts'));
for(const f of jsFiles){const r=spawnSync(process.execPath,['--check',f],{encoding:'utf8'});check(r.status===0,`JS syntax: ${path.relative(root,f)} ${r.stderr}`)}
if(failures.length){console.error(`GeoGeek source QA failed (${failures.length})`);failures.forEach((x,i)=>console.error(`${i+1}. ${x}`));process.exit(1)}
console.log(`GeoGeek source QA passed · ${units.length} full bilingual field-note units · clean source/build separation`);
