import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const site = path.join(root, 'site');
const output = path.join(site, 'assets', 'lab', 'previews');
fs.mkdirSync(output, { recursive: true });

const mime = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.endsWith('/')) pathname += 'index.html';
  const target = path.resolve(site, `.${pathname}`);
  if (!target.startsWith(site + path.sep) && target !== path.join(site, 'index.html')) {
    res.writeHead(403).end('Forbidden');
    return;
  }
  if (!fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404).end('Not found');
    return;
  }
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', mime[path.extname(target).toLowerCase()] || 'application/octet-stream');
  fs.createReadStream(target).pipe(res);
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(4173, '127.0.0.1', resolve);
});

const base = 'http://127.0.0.1:4173';
const instruments = ['orbit', 'earth', 'flow', 'pulse', 'figure', 'world', 'locate', 'zone', 'path'];
const browser = await chromium.launch({ headless: true, args: ['--disable-dev-shm-usage'] });

async function newPage(viewport = { width: 1600, height: 1000 }) {
  const page = await browser.newPage({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    let seed = 73421;
    Math.random = () => {
      seed = (seed * 48271) % 2147483647;
      return (seed - 1) / 2147483646;
    };
  });
  return page;
}

async function captureInstrument(kind) {
  const page = await newPage();
  const url = `${base}/lab.html?instrument=${encodeURIComponent(kind)}`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForFunction(() => document.getElementById('instrumentDialog')?.open === true, null, { timeout: 20000 });
    await page.waitForSelector('#instrumentStage > *', { state: 'visible', timeout: 20000 });

    if (kind === 'earth') {
      await page.waitForFunction(() => {
        const img = document.querySelector('#earthImage');
        return !!img && img.complete && img.naturalWidth > 0;
      }, null, { timeout: 25000 }).catch(() => {});
    }

    if (kind === 'flow') {
      await page.waitForFunction(() => {
        const lab = document.querySelector('#instrumentStage .flow-lab');
        return !!lab && !!window.GeoFlowLab && !!window.GeoFlowLabPolish && window.GeoGeekInstrumentMounts?.flow === window.GeoFlowLab.mount;
      }, null, { timeout: 25000 });
      const tabs = await page.locator('#instrumentStage .flow-tabs [data-mode]').count();
      if (tabs !== 4) throw new Error(`flow: expected four representation modes, found ${tabs}`);
    }

    const settle = kind === 'flow' || kind === 'orbit' ? 6500 : 2800;
    await page.waitForTimeout(settle);

    if (await page.locator('#instrumentStage .instrument-error').count()) {
      throw new Error(`${kind}: instrument rendered an error state`);
    }

    const stage = page.locator('#instrumentStage');
    const box = await stage.boundingBox();
    if (!box || box.width < 300 || box.height < 180) throw new Error(`${kind}: invalid stage bounds`);

    await stage.screenshot({
      path: path.join(output, `${kind}.jpg`),
      type: 'jpeg',
      quality: 86,
      animations: 'disabled'
    });
    console.log(`Captured Lab instrument: ${kind}`);
  } finally {
    await page.close();
  }
}

async function captureEarthObservatory() {
  const page = await newPage({ width: 1920, height: 900 });
  try {
    await page.goto(`${base}/earth/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForSelector('#map', { state: 'visible', timeout: 15000 });
    await page.waitForFunction(() => !!document.querySelector('#map canvas'), null, { timeout: 25000 }).catch(() => {});
    await page.waitForTimeout(7000);
    if (await page.locator('.earth-fatal').count()) throw new Error('Earth Observatory rendered its degraded/fatal state');
    const shell = page.locator('.app-shell');
    const box = await shell.boundingBox();
    if (!box || box.width < 800 || box.height < 500) throw new Error('Earth Observatory: invalid app bounds');
    await shell.screenshot({
      path: path.join(output, 'earth-observatory.jpg'),
      type: 'jpeg',
      quality: 86,
      animations: 'disabled'
    });
    console.log('Captured Earth Observatory');
  } finally {
    await page.close();
  }
}

const failures = [];
try {
  try { await captureEarthObservatory(); }
  catch (error) { failures.push(`earth-observatory: ${error.message}`); console.error(error); }

  for (const kind of instruments) {
    try { await captureInstrument(kind); }
    catch (error) { failures.push(`${kind}: ${error.message}`); console.error(error); }
  }
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}

const expected = ['earth-observatory', ...instruments].map(name => path.join(output, `${name}.jpg`));
const missing = expected.filter(file => !fs.existsSync(file) || fs.statSync(file).size < 8000);
if (failures.length || missing.length) {
  if (failures.length) console.error('Capture failures:', failures.join(' | '));
  if (missing.length) console.error('Missing/invalid Lab previews:', missing.map(file => path.basename(file)).join(', '));
  process.exit(1);
}

console.log(`Generated ${expected.length} real Lab preview images.`);
