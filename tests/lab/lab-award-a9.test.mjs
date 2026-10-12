import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(new URL('../../'+name,import.meta.url),'utf8');

test('A9 visual changes are capture-driven presentation only',()=>{
  const css=read('site/water/workbench-v10-2/award-polish.css');
  assert.match(css,/A9 capture-driven finish/);
  assert.match(css,/content:"‹"/);
  assert.match(css,/content:"›"/);
  assert.match(css,/p6-optics-intro/);
  assert.match(css,/border-radius:0!important/);
});

test('A9 does not create another Water science or concept version',()=>{
  const adapter=read('site/water/workbench-v10-2/instrument.js');
  assert.match(adapter,/version:\s*'10\.2\.0-quiet2'/);
  assert.match(adapter,/conceptVersion:\s*'award-a3'/);
  assert.match(adapter,/polishVersion:\s*'award-a5'/);
  assert.doesNotMatch(adapter,/award-a9/);
});

test('A9 mobile exit removes the duplicated × while retaining the Lab return glyph',()=>{
  const shell=read('site/lab-award-shell.css');
  assert.match(shell,/font-size:0!important/);
  const base=read('site/lab-fullpage.css');
  assert.match(base,/instrument-close::before\s*\{\s*content:\s*"←"/);
});
