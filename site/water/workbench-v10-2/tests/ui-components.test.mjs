import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const app=fs.readFileSync(path.join(root,'app/index.html'),'utf8');
function bundle(source){
 const a=source.indexOf('const __factories='),b=source.indexOf('</script>',a);
 assert.ok(a>=0&&b>a);
 return new Function(source.slice(a,b).replace("__require('main.js');","return __require;"))();
}
const req=bundle(app);
const {TABS}=req('core/config.js');
const {renderGroupedNavigation,renderScientificStatus,GROUPS}=req('components/workbench-shell.js');
const {validateSession}=req('core/session-store.js');
const {createParameterComponents}=req('components/parameter-controls.js');
test('UX-P3-01: grouped menu contains all nine workspace IDs once in prescribed physics/analysis/RT groups',()=>{
 const ids=GROUPS.flatMap(g=>g.ids);
 assert.equal(GROUPS.length,3);
 assert.equal(ids.length,9);
 assert.deepEqual(new Set(ids),new Set(TABS.map(x=>x.id)));
 const html=renderGroupedNavigation('rt',TABS);
 assert.equal((html.match(/role="tab"/g)||[]).length,9);
 assert.equal((html.match(/data-nav-group=/g)||[]).length,3);
 assert.match(html,/Physical model/);assert.match(html,/Analysis/);assert.match(html,/Numerical reference/);
 assert.match(html,/id="tab-rt" data-tab="rt" aria-selected="true"/);
 assert.match(html,/id="tab-rt"[^>]+tabindex="0"/);
 assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
});
test('UX-P3-02: switching to any group marks selection and roving tabindex correctly',()=>{
 for(const w of TABS){
  const html=renderGroupedNavigation(w.id,TABS);
  assert.match(html,new RegExp('id="tab-'+w.id+'" data-tab="'+w.id+'" aria-selected="true"'));
  assert.equal((html.match(/aria-selected="true"/g)||[]).length,1);
  assert.equal((html.match(/tabindex="0"/g)||[]).length,1);
 }
 assert.throws(()=>renderGroupedNavigation('rt',TABS.slice(0,-1)),/all workspaces exactly once/);
});
test('UX-P3-03: model status is conditional and never claims independent RT validation',()=>{
 const state=validateSession({tab:'rt'});
 const eng={status:'ready',matches:()=>false};
 const a=renderScientificStatus(state,eng);
 assert.match(a.uiModelStatus,/Scalar DOM/);
 assert.match(a.uiValidationStatus,/no external benchmark/);
 assert.match(a.uiReferenceStatus,/differs/);
 const b=renderScientificStatus(state,{...eng,matches:()=>true});
 assert.match(b.uiReferenceStatus,/matched/);
 const c=renderScientificStatus(state,{status:'error'});
 assert.match(c.uiReferenceStatus,/no inferred values/);
 const d=renderScientificStatus(validateSession({tab:'uncertainty'}));
 assert.match(d.uiReferenceStatus,/Assumed independent Gaussian noise/);
 assert.match(d.uiSessionStatus,/no cloud sync/);
});
test('UX-P3-04: parameter setup renderer provides reusable headings and machine-readable controls',()=>{
 const state=validateSession({tab:'iop'}),c=createParameterComponents({state});
 const html=c.panel(TABS.find(x=>x.id==='iop'),c.csection('Water absorption','2 variables',c.param('chl')+c.presets()));
 assert.match(html,/ui-setup-context/);assert.match(html,/Current selection/);
 assert.match(html,/ui-setup-fields/);assert.match(html,/aria-labelledby="ui-control-section-/);
 assert.match(html,/aria-describedby="ui-param-help-chl"/);
 assert.match(html,/role="group" aria-label="Choose an optical water reference state"/);
 const advanced=c.adv('<p>Example</p>');
 assert.match(advanced,/id="advancedDetails"/);
});
test('UX-P3-05: tools preserve historic import/export/inspector IDs but are progressively disclosed',()=>{
 for(const id of ['toolsMenu','globalActions','exportBtn','importBtn','inspectBtn','statusScopeBtn','uiStatusBar','panelBtn'])
  assert.match(app,new RegExp('id="'+id+'"'));
 assert.match(app,/class="ui-toolmenu-panel"/);
 assert.match(app,/aria-controls="sideRail" aria-expanded="true"/);
 assert.match(app,/ArrowRight','ArrowLeft','Home','End'/);
 const css=fs.readFileSync(path.join(root,'v102-components.css'),'utf8');
 assert.match(css,/\.ui-statusbar/);
 assert.match(css,/\.ui-toolmenu-panel/);
 assert.match(css,/\.ui-setup-context/);
});
