import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { gzipSync } from 'node:zlib';
import { initialLocalScripts, scriptBudget } from '../../scripts/resource-budget.mjs';

test('initial resources respect base, queries, duplicate URLs and idle scripts', () => {
  const html = `<base href="../../"><script src="app.js?v=2"></script><script src="app.js?v=2"></script><script data-idle-src="heavy.js"></script><script src="//cdn.example.org/x.js"></script>`;
  assert.deepEqual(initialLocalScripts(html, 'https://geogeeklab.github.io/field-notes/example/').map(url=>url.href), ['https://geogeeklab.github.io/app.js?v=2']);
});

test('budget reads queried scripts from their pathname and rejects missing resources', async t => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'geogeek-budget-'));
  t.after(() => fs.rm(dist, { recursive:true, force:true }));
  await fs.mkdir(path.join(dist, 'notes', 'one'), { recursive:true });
  const page = path.join(dist, 'notes', 'one', 'index.html');
  const code = 'window.example = "a real script";';
  await fs.writeFile(path.join(dist, 'app.js'), code);
  await fs.writeFile(page, '<base href="../../"><script src="app.js?v=2"></script>');
  assert.equal(await scriptBudget(page, dist), gzipSync(code).length);
  await fs.writeFile(page, '<script src="/missing.js?v=3"></script>');
  await assert.rejects(scriptBudget(page, dist), /Missing initial script/);
});
