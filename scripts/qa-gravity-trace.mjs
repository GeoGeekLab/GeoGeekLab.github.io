#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import zlib from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const must = (value, message) => { if (!value) throw new Error(`Gravity Trace QA: ${message}`); };
const read = file => fs.readFile(path.join(root, file), 'utf8');

const [sourceHtml, sourceJs, sourceCss, readme, license, builtHtml, builtLab] = await Promise.all([
  read('site/gravity-trace/index.html'),
  read('site/gravity-trace/game.js'),
  read('site/gravity-trace/style.css'),
  read('site/gravity-trace/README.md'),
  read('site/gravity-trace/LICENSE'),
  fs.readFile(path.join(dist, 'gravity-trace', 'index.html'), 'utf8'),
  fs.readFile(path.join(dist, 'lab.html'), 'utf8'),
]);

must(/<canvas[^>]+id="gameCanvas"/i.test(sourceHtml), 'game canvas missing');
must(/gravity-trace-card/.test(builtLab) && /href="gravity-trace\//.test(builtLab), 'Lab entry missing');
must(/\/gravity-trace\/lab-card\.css/.test(builtLab), 'Lab card stylesheet missing');
must(/SPDX-License-Identifier: MIT/.test(sourceJs), 'MIT SPDX header missing');
must(/^MIT License/m.test(license), 'MIT license file missing');
must(/Original, dependency-free code/i.test(sourceHtml), 'original implementation disclosure missing');
must(/prefers-reduced-motion/.test(sourceCss) && /prefers-reduced-motion/.test(sourceJs), 'reduced-motion support missing');
must(/pointerdown/.test(sourceJs) && /keydown/.test(sourceJs) && /Enter/.test(sourceJs), 'pointer and keyboard controls missing');
must(/visibilitychange/.test(sourceJs), 'hidden-document pause behavior missing');
must(/try \{ state\.highScore/.test(sourceJs) && /catch \{\}/.test(sourceJs), 'storage failure tolerance missing');
must(!/https?:\/\//.test(sourceJs), 'game runtime must not call external URLs');
must(!/<script[^>]+https?:\/\//i.test(sourceHtml), 'external runtime script found');
must(/MIT/.test(readme) && /softened, bounded inverse-square/i.test(readme), 'README model/license documentation missing');
must(/runtime-stability\.js/.test(builtHtml), 'global runtime stability guard not injected into built game');

const check = spawnSync(process.execPath, ['--check', path.join(root, 'site/gravity-trace/game.js')], { encoding: 'utf8' });
must(check.status === 0, `game.js syntax error: ${check.stderr || check.stdout}`);
const checkPost = spawnSync(process.execPath, ['--check', path.join(root, 'scripts/postbuild-gravity-trace.mjs')], { encoding: 'utf8' });
must(checkPost.status === 0, `postbuild script syntax error: ${checkPost.stderr || checkPost.stdout}`);

const jsGzip = zlib.gzipSync(Buffer.from(sourceJs)).length;
const cssGzip = zlib.gzipSync(Buffer.from(sourceCss)).length;
must(jsGzip <= 16 * 1024, `game.js gzip budget exceeded: ${jsGzip} bytes`);
must(cssGzip <= 8 * 1024, `style.css gzip budget exceeded: ${cssGzip} bytes`);

console.log(`Gravity Trace QA passed · JS ${jsGzip} B gzip · CSS ${cssGzip} B gzip.`);
