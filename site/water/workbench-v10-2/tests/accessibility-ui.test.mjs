import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import '../v102-accessibility-views.js';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const html=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
const legacy=fs.readFileSync(path.resolve(root,'../workbench-v10-1/app/index.html'),'utf8');
const view=globalThis.GeoGeekV102A11y;
function factory(s){const a=s.indexOf('const __factories='),b=s.indexOf('</script>',a);return new Function(s.slice(a,b).replace("__require('main.js');","return __require;"))();}
const req=factory(html),old=factory(legacy);
const meta=req('core/config.js');
const adapter=req('model/geogeek-adapter.js').geogeekAdapter;
const oldAdapter=old('model/geogeek-adapter.js').geogeekAdapter;
function chart(name='clear'){
 const p={...meta.initialParams,...meta.PSETS[name]},d=adapter.compute(p);
 const registry=[{mode:'rrs',unit:'sr⁻¹',series:[{label:'Above-water Rrs',values:d.rrs},{label:'Corrected Rrs',values:d.corrected}]}];
 return {p,d,registry,state:{tab:'iop',plot:'rrs',probe:443}};
}
test('UX-083 JSON has 301 original plotted values, explicit units and schema 8 provenance',()=>{
 for(const name of Object.keys(meta.PSETS)){
  const {p,d,registry,state}=chart(name);
  assert.deepEqual(d.rrs,oldAdapter.compute(p).rrs,name+' V10.1');
  const out=view.exportView(registry,state,'json',{modelVersion:'10.1'});
  const v=JSON.parse(out.content);
  assert.equal(v.kind,'water-v102-current-view');
  assert.equal(v.sourceExperimentSchema,8);
  assert.equal(v.wavelength_nm.length,301);
  assert.equal(v.wavelength_nm[0],400);
  assert.equal(v.wavelength_nm[300],700);
  assert.equal(v.charts[0].unit,'sr⁻¹');
  assert.deepEqual(v.charts[0].series[0].values,d.rrs);
  assert.deepEqual(v.charts[0].series[1].values,d.corrected);
  assert.match(out.filename,/iop_rrs_current_view\.json$/);
 }
});
test('UX-083 CSV has exact 1 nm values, signs, zero and explicitly missing NaN',()=>{
 const {d,registry,state}=chart('clear'),out=view.exportView(registry,state,'csv');
 const rows=out.content.split('\n');
 assert.equal(rows.filter(s=>/^"4\d\d"|"5\d\d"|"6\d\d"|"700"/.test(s)).length,301);
 const line=rows.find(s=>s.startsWith('"443",'));
 assert.equal(line,'"443","'+d.rrs[43]+'","'+d.corrected[43]+'"');
 assert.ok(out.content.includes('"Above-water Rrs (sr⁻¹)"'));
 assert.ok(out.content.includes('# source=GeoGeek first-order model simulation'));
 const mock=[{mode:'difference',unit:'sr⁻¹',series:[{label:'Signed B - A',values:Array.from({length:301},(_,i)=>i===10?Number.NaN:i===50?-.002:0)}]}];
 const caseView=view.exportView(mock,state,'csv');
 assert.ok(caseView.content.includes('"450","-0.002"'),'negative sign retained');
 assert.ok(caseView.content.includes('"410",""'),'NaN represented as missing');
 assert.ok(caseView.content.includes('"400","0"'),'zero remains zero');
 assert.equal(JSON.parse(view.exportView(mock,state,'json').content).charts[0].series[0].values[10],null);
});
test('UX-082 semantic table has keyboard-scroll, signed values and accessible headers',()=>{
 const {registry,state}=chart();
 const c=view.chartSeries(registry,state.tab,state.plot,state.probe)[0];
 const table=view.semanticTable(c,'test-numeric');
 assert.match(table,/<table><caption>/);
 assert.match(table,/<th scope="col">/);
 assert.match(table,/<th scope="row">443<\/th>/);
 assert.match(table,/tabindex="0"/);
 assert.equal((table.match(/<tr/g)||[]).length,15);
 assert.match(table,/All 301 plotted/);
});
test('UX-084 science glossary distinguishes Rrs, rrs, total b, bb and TOA',()=>{
 const g=view.glossary();
 assert.match(g,/Rrs\(λ\)/);
 assert.match(g,/rrs\(λ\)/);
 assert.match(g,/Total inherent scattering coefficient/);
 assert.match(g,/not total b/);
 assert.match(g,/dimensionless/);
 assert.match(g,/not calibrated radiance/);
 assert.match(g,/not independently cross-validated/);
 assert.equal(view.TERMS.length,10);
});
test('UX-081 production sync boot, workspace contract and accessible CSS',()=>{
 const k=html.indexOf('data-geogeek-sync-dependency="water-v102-accessibility"'),j=html.indexOf('const __factories=');
 assert.ok(k>0&&k<j);
 assert.equal(Object.keys(meta.plots).length,9);
 assert.match(html,/schemaVersion:8/);
 assert.match(html,/GeoGeekV102A11y\?\.enhance/);
 assert.match(html,/dataset\.exportView/);
 const css=fs.readFileSync(path.join(root,'v102-a11y.css'),'utf8');
 for(const phrase of ['max-width:420px','max-width:340px','min-height:44px',':focus-visible','overflow:auto','prefers-reduced-motion'])assert.ok(css.includes(phrase));
});
